#!/usr/bin/env node
/*
 * Serwer prototypu z opcjonalnym trybem AI: Gemini API (Google), bezpłatny poziom. Node.js 20.12+ (bez zależności).
 *
 * - Serwuje zbudowany prototyp z dist/ (najpierw: node build.mjs) i wstawia do index.html
 *   <meta name="assistant-endpoint" content="/api/assistant">. Plik dist/index.html otwarty bez tego serwera
 *   działa wyłącznie na regułach i nic nie wysyła.
 * - Klucz: tylko zmienna środowiskowa GEMINI_API_KEY albo lokalny plik .env (ignorowany przez Git, wzór w .env.example).
 *   Klucz idzie wyłącznie w nagłówku zapytania do Google. Nie trafia do przeglądarki, HTML, odpowiedzi API ani logów.
 * - GET  /api/assistant/status  → tryb („ai” albo „rules”) i powód, np. brak klucza. Nic nie wysyła do Google.
 *   POST /api/assistant/answer  → pytanie + fikcyjny kontekst demo → odpowiedź w częściach: krótko, wiem (ze źródłami),
 *   nie wiem, co dalej, ewentualne pytanie doprecyzowujące. Serwer sprawdza odpowiedź: źródła i akcje tylko z listy,
 *   liczby (kwoty, daty, raty) tylko takie, które są w kontekście lub pytaniu, bez udawania wykonanych spraw i bez linków.
 *   Gdy coś się nie zgadza, zwraca błąd, a aplikacja odpowiada regułami.
 * - Przed wysłaniem pytanie i kontekst są skracane, a numery wyglądające na PESEL, e-mail, telefon, rachunek, kartę,
 *   numer dokumentu, tablicę rejestracyjną lub numer polisy są usuwane. Treść rozmów nie jest zapisywana ani logowana;
 *   log zawiera tylko rodzaj zdarzenia (np. „limit dostawcy”).
 * - Błędy rozróżniane osobno: brak klucza, odrzucony klucz, niedostępny model lub region, limit (429), brak sieci,
 *   przekroczony czas, błąd dostawcy, odpowiedź niezgodna z danymi. Lokalne limity (domyślnie 8/min i 200/dzień)
 *   są celowo niższe niż limity bezpłatnego poziomu, które Google może zmienić w każdej chwili.
 *
 * Uruchomienie:  cp .env.example .env  (wpisz klucz)  →  node server/gemini-adapter.mjs  →  http://127.0.0.1:8080
 * Zmienne: GEMINI_API_KEY, GEMINI_MODEL, PORT, HOST, GEMINI_TIMEOUT_MS, AI_MAX_PER_MINUTE, AI_MAX_PER_DAY,
 *          GEMINI_API_BASE (tylko do testów z atrapą API).
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(PROJECT, 'dist');
// Lokalny .env: wartości ustawione już w środowisku mają pierwszeństwo. Treść pliku nigdy nie jest wypisywana.
const ENV_FILE = join(PROJECT, '.env');
if (existsSync(ENV_FILE) && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(ENV_FILE); } catch (e) { console.error('Nie udało się wczytać pliku .env (' + (e.code || 'błąd składni') + ').'); }
}

const int = (v, def, min, max) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const KEY = (process.env.GEMINI_API_KEY || '').trim();
const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const MODEL = /^[\w.-]{1,64}$/.test(process.env.GEMINI_MODEL || '') ? process.env.GEMINI_MODEL : DEFAULT_MODEL;
const BASE = (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
const PORT = int(process.env.PORT, 8080, 1, 65535);
const HOST = process.env.HOST || '127.0.0.1';
const TIMEOUT_MS = int(process.env.GEMINI_TIMEOUT_MS, 12000, 1000, 30000);
const PER_MINUTE = int(process.env.AI_MAX_PER_MINUTE, 8, 1, 60);
const PER_DAY = int(process.env.AI_MAX_PER_DAY, 200, 1, 5000);
const API = '/api/assistant';

const SCENARIOS = ['oc', 'pismo', 'nowyDowod', 'portfel', 'dane'];
const SOURCE_RE = /^(todo|doc|case):[\w-]{1,40}$/;
const KINDS = ['dokument', 'pismo', 'termin', 'sprawa', 'informacja'];
const KINDS_OUT = ['odpowiedz', 'dopytanie', 'poza_zakresem'];

// Stan trybu AI. Trwałe powody (brak klucza, odrzucony klucz, model, region) wyłączają tryb do restartu serwera.
const state = { reason: KEY ? null : 'no_key', pausedUntil: 0 };
const log = (what) => console.log(new Date().toISOString().slice(11, 19) + ' AI: ' + what); // bez treści pytań i bez klucza

// Usunięcie danych, które mogłyby być prawdziwe: PESEL, e-mail, rachunek, karta, telefon, numer dokumentu, tablica, polisa.
export function redact(text) {
  return String(text)
    .replace(/\b\d{11}\b/g, '[usunięty numer]')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[usunięty e-mail]')
    .replace(/\b[A-Z]{2}\d{2}(?:\s?\d{4}){4,7}\b/gi, '[usunięty rachunek]')
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[usunięty numer]')
    .replace(/(?:\+?48[ -]?)?\b\d{3}[ -]?\d{3}[ -]?\d{3}\b/g, '[usunięty telefon]')
    .replace(/\b[A-Z]{3}\s?\d{6}\b/gi, '[usunięty numer dokumentu]')
    .replace(/\b[A-Z]{2,4}\/\d{4}\/\d{3,}\b/g, '[usunięty numer polisy]')
    .replace(/\b[A-Z]{1,3}[\s ]?\d{4,5}[A-Z]?\b/g, '[usunięta tablica]');
}

const str = (v, max) => (typeof v === 'string' ? redact(v.replace(/\s+/g, ' ').trim()).slice(0, max) : '');

// Kontekst demo z przeglądarki: tylko znane pola, krótkie teksty, bez numerów osobistych. Wszystko inne jest odrzucane.
export function cleanContext(k) {
  if (!k || typeof k !== 'object') return null;
  const dzis = typeof k.dzis === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k.dzis) ? k.dzis : null;
  if (!dzis || !Array.isArray(k.zrodla)) return null;
  const zrodla = k.zrodla.slice(0, 16).map((z) => (z && typeof z === 'object' && typeof z.id === 'string' && SOURCE_RE.test(z.id) && KINDS.includes(z.rodzaj)
    ? { id: z.id, rodzaj: z.rodzaj, tytul: str(z.tytul, 80), fakty: (Array.isArray(z.fakty) ? z.fakty : []).slice(0, 8).map((f) => str(f, 220)).filter(Boolean) }
    : null)).filter((z) => z && z.tytul);
  return { dzis: dzis, dzis_slownie: str(k.dzis_slownie, 60), zrodla: zrodla };
}

// Liczby w tekście, rozbite na części: „04.11.2026” → 4, 11, 2026; „91 zł” → 91.
const numbers = (s) => (String(s).match(/\d+(?:[.,:]\d+)*/g) || []).flatMap((t) => t.split(/[.,:]/)).map((x) => String(Number.parseInt(x, 10)));
const DONE_CLAIM = /\b(złożył(?:e|a)m|wysłał(?:e|a)m|zgłosił(?:e|a)m|zastrzegł(?:e|a)m|opłacił(?:e|a)m|zapłacił(?:e|a)m|zarezerwował(?:e|a)m|umówił(?:e|a)m|anulował(?:e|a)m)\b/i;

export const actionsFor = (ctx) => ctx.zrodla.map((z) => 'otworz:' + z.id).concat(SCENARIOS.map((s) => 'scenariusz:' + s), ['brak']);

// Sprawdzenie odpowiedzi modelu względem kontekstu. Zwraca { ok, a } albo { ok: false, why } (why trafia tylko do logu).
export function check(r, ctx, extraText) {
  if (!r || typeof r !== 'object' || !KINDS_OUT.includes(r.rodzaj)) return { ok: false, why: 'rodzaj' };
  const ids = ctx.zrodla.map((z) => z.id);
  const acts = actionsFor(ctx);
  const s = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '').slice(0, max);
  const list = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
  const a = {
    rodzaj: r.rodzaj,
    krotko: s(r.krotko, 320),
    wiem: list(r.wiem, 4).map((w) => ({ tekst: s(w && w.tekst, 240), zrodla: list(w && w.zrodla, 3).filter((x) => typeof x === 'string') })).filter((w) => w.tekst),
    nie_wiem: list(r.nie_wiem, 4).map((x) => s(x, 240)).filter(Boolean),
    dalej: list(r.dalej, 3).map((d) => ({ tekst: s(d && d.tekst, 240), akcja: d && typeof d.akcja === 'string' ? d.akcja : 'brak' })).filter((d) => d.tekst),
    pytanie: s(r.pytanie, 220),
    opcje: list(r.opcje, 3).map((x) => s(x, 48)).filter(Boolean)
  };
  if (!a.krotko) return { ok: false, why: 'pusta odpowiedź' };
  if (a.rodzaj === 'dopytanie' && !a.pytanie) return { ok: false, why: 'dopytanie bez pytania' };
  if (a.wiem.some((w) => !w.zrodla.length || w.zrodla.some((x) => !ids.includes(x)))) return { ok: false, why: 'źródło spoza kontekstu' };
  if (a.dalej.some((d) => !acts.includes(d.akcja))) return { ok: false, why: 'akcja spoza listy' };
  const texts = [a.krotko, a.pytanie].concat(a.wiem.map((w) => w.tekst), a.nie_wiem, a.dalej.map((d) => d.tekst), a.opcje);
  const allowed = new Set(numbers([ctx.dzis, ctx.dzis_slownie, extraText].concat(ctx.zrodla.flatMap((z) => [z.tytul].concat(z.fakty))).join(' ')));
  if (texts.some((t) => numbers(t).some((n) => !allowed.has(n)))) return { ok: false, why: 'liczba spoza danych demo' };
  if (texts.some((t) => DONE_CLAIM.test(t))) return { ok: false, why: 'udawanie wykonanej sprawy' };
  if (texts.some((t) => /https?:\/\/|www\.|@/.test(t) || t !== redact(t))) return { ok: false, why: 'link lub dane osobowe' };
  return { ok: true, a: a };
}

const RULES = [
  'Jesteś Polą, przewodnikiem po PROTOTYPIE polskiej aplikacji urzędowej. Wszystkie dane są fikcyjne (demonstracyjne).',
  'Odpowiadasz WYŁĄCZNIE na podstawie pola „kontekst” z wiadomości użytkownika. Nie korzystasz z wiedzy o prawdziwej osobie.',
  'Zasady:',
  '1. Nie zgaduj. Kwoty, raty, liczby, terminy i statusy podawaj tylko wtedy, gdy są w faktach źródła; wtedy wpisz id tego źródła w „zrodla”.',
  '2. Czego nie ma w kontekście, wpisz do „nie_wiem”. Brak danych nie oznacza, że czegoś nie ma. Prototyp nie łączy się z bankami, BIK, rejestrami długów ani firmami leasingowymi, więc nie zna kredytów, leasingów, rat ani sald.',
  '3. Rozróżniaj podobne rzeczy: polisa OC to ubezpieczenie, a nie kredyt ani leasing; raty składki OC to nie raty kredytu; pismo z urzędu to nie rachunek.',
  '4. Gdy pytanie jest niejednoznaczne i od wyjaśnienia zależy odpowiedź, ustaw rodzaj „dopytanie”, zadaj jedno krótkie pytanie i podaj do 3 krótkich opcji. Nie dopasowuj pytania na siłę do najbliższej sprawy.',
  '5. Nie udawaj, że coś załatwiasz, wysyłasz, zgłaszasz albo płacisz. W prototypie nic nie jest wysyłane do urzędów. Możesz zaproponować akcję z listy „akcje”.',
  '6. Pisz po polsku, w drugiej osobie, zwięźle i praktycznie: „krotko” 1–2 zdania; „wiem”, „nie_wiem”, „dalej” po najwyżej 3 krótkie punkty.',
  '7. Pytania spoza spraw urzędowych i tego prototypu: rodzaj „poza_zakresem” i jedno zdanie, w czym możesz pomóc.',
  '8. Nie podawaj linków, adresów e-mail, numerów telefonów ani danych osobowych.'
].join('\n');

function schemaFor(ctx) {
  const ids = ctx.zrodla.map((z) => z.id);
  return {
    type: 'object',
    properties: {
      rodzaj: { type: 'string', enum: KINDS_OUT },
      krotko: { type: 'string' },
      wiem: { type: 'array', items: { type: 'object', properties: { tekst: { type: 'string' }, zrodla: { type: 'array', items: ids.length ? { type: 'string', enum: ids } : { type: 'string' } } }, required: ['tekst', 'zrodla'] } },
      nie_wiem: { type: 'array', items: { type: 'string' } },
      dalej: { type: 'array', items: { type: 'object', properties: { tekst: { type: 'string' }, akcja: { type: 'string', enum: actionsFor(ctx) } }, required: ['tekst', 'akcja'] } },
      pytanie: { type: 'string' },
      opcje: { type: 'array', items: { type: 'string' } }
    },
    required: ['rodzaj', 'krotko', 'wiem', 'nie_wiem', 'dalej', 'pytanie', 'opcje']
  };
}

class AiError extends Error {
  constructor(kind, retryAfter) { super(kind); this.kind = kind; this.retryAfter = retryAfter || 0; }
}

// Czas z odpowiedzi 429: nagłówek Retry-After albo RetryInfo w treści błędu („37s”). Domyślnie minuta.
const retryAfterOf = (res, body) => {
  const h = Number.parseInt(res.headers.get('retry-after') || '', 10);
  if (h > 0) return h;
  const d = body && body.error && Array.isArray(body.error.details) ? body.error.details.find((x) => x && x.retryDelay) : null;
  const s = d ? Number.parseFloat(String(d.retryDelay)) : NaN;
  return s > 0 ? Math.ceil(s) : 60;
};

async function callGemini(path, init) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(BASE + path, Object.assign({ signal: ctl.signal }, init, { headers: Object.assign({ 'x-goog-api-key': KEY }, init && init.headers) }));
  } catch (e) {
    throw new AiError(ctl.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}

// Jedno wywołanie generateContent. Jedyne miejsce, które zna format Gemini API.
async function askGemini(question, ctx, earlier) {
  const res = await callGemini('/models/' + encodeURIComponent(MODEL) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: RULES + '\nAkcje: otworz:<id źródła> otwiera tę pozycję w prototypie; scenariusz:oc (koniec polisy OC), scenariusz:pismo (odpowiedź na pismo z urzędu), scenariusz:nowyDowod (wniosek o nowy dowód), scenariusz:portfel (zgubione dokumenty), scenariusz:dane (kto ma dostęp do danych); brak.' }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify({ pytanie: question, poprzednio: earlier, kontekst: ctx }) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json', responseJsonSchema: schemaFor(ctx) }
    })
  });
  let body = null;
  try { body = await res.json(); } catch (e) { body = null; }
  if (res.status === 429) throw new AiError('limit', retryAfterOf(res, body));
  if (res.status === 401 || res.status === 403) throw new AiError('bad_key');
  if (res.status === 404) throw new AiError('model_unavailable');
  if (res.status === 400) {
    const msg = String(body && body.error && body.error.message || '');
    if (/api key/i.test(msg)) throw new AiError('bad_key');
    if (/location is not supported/i.test(msg)) throw new AiError('region');
    throw new AiError('provider');
  }
  if (!res.ok) throw new AiError('provider');
  const parts = (body && body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts) || [];
  try { return JSON.parse(parts.map((p) => p.text || '').join('')); } catch (e) { throw new AiError('invalid'); }
}

// Sprawdzenie przy starcie: czy model istnieje i klucz działa (zapytanie o opis modelu, bez treści rozmów).
async function verifyModel() {
  if (!KEY) return;
  try {
    const res = await callGemini('/models/' + encodeURIComponent(MODEL), { method: 'GET' });
    if (res.status === 404) state.reason = 'model_unavailable';
    else if (res.status === 400 || res.status === 401 || res.status === 403) state.reason = 'bad_key';
    log(res.ok ? 'model ' + MODEL + ' dostępny' : 'sprawdzenie modelu: HTTP ' + res.status + (state.reason ? ' → tryb regułowy (' + state.reason + ')' : ''));
  } catch (e) {
    log('nie udało się sprawdzić modelu (' + e.kind + '); spróbuję przy pierwszym pytaniu');
  }
}

// Limity serwera prototypu: na minutę z jednego adresu i na dzień łącznie (od północy czasu serwera).
const perIp = new Map();
let day = { date: new Date().toDateString(), count: 0 };
function localLimit(ip) {
  const now = Date.now();
  if (day.date !== new Date().toDateString()) day = { date: new Date().toDateString(), count: 0 };
  if (day.count >= PER_DAY) { const m = new Date(); m.setHours(24, 0, 0, 0); return Math.ceil((m - now) / 1000); }
  const list = (perIp.get(ip) || []).filter((t) => now - t < 60000);
  if (list.length >= PER_MINUTE) { perIp.set(ip, list); return Math.ceil((60000 - (now - list[0])) / 1000); }
  list.push(now); perIp.set(ip, list); day.count++;
  return 0;
}

const sendJson = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(obj));
};

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const status = () => ({
  mode: state.reason ? 'rules' : 'ai', reason: state.reason, provider: 'Google Gemini API', model: MODEL,
  limits: { perMinute: PER_MINUTE, perDay: PER_DAY }, pausedFor: Math.max(0, Math.ceil((state.pausedUntil - Date.now()) / 1000))
});

async function handleAnswer(req, res) {
  if (state.reason) return sendJson(res, 503, { error: state.reason });
  // Tylko z tej samej strony: inne witryny nie mogą zużywać klucza.
  const origin = req.headers.origin;
  if (origin && origin !== 'http://' + req.headers.host && origin !== 'https://' + req.headers.host) return sendJson(res, 403, { error: 'origin' });
  if (!/^application\/json\b/.test(req.headers['content-type'] || '')) return sendJson(res, 415, { error: 'format' });
  let input;
  try { input = JSON.parse(await readBody(req, 16384)); } catch (e) { return sendJson(res, 400, { error: 'request' }); }
  const question = str(input && input.pytanie, 400);
  const ctx = cleanContext(input && input.kontekst);
  if (!question || !ctx) return sendJson(res, 400, { error: 'request' });
  const p = input.poprzednio;
  const earlier = p && typeof p === 'object' ? { pytanie: str(p.pytanie, 400), dopytanie: str(p.dopytanie, 220) } : null;
  const wait = Math.ceil((state.pausedUntil - Date.now()) / 1000);
  if (wait > 0) return sendJson(res, 429, { error: 'limit', retryAfter: wait });
  const local = localLimit(req.socket.remoteAddress || '');
  if (local) { log('lokalny limit serwera'); return sendJson(res, 429, { error: 'local_limit', retryAfter: local }); }
  try {
    const v = check(await askGemini(question, ctx, earlier && earlier.pytanie ? earlier : null), ctx, question + ' ' + (earlier ? earlier.pytanie + ' ' + earlier.dopytanie : ''));
    if (!v.ok) { log('odpowiedź odrzucona: ' + v.why); return sendJson(res, 502, { error: 'invalid' }); }
    return sendJson(res, 200, { odpowiedz: v.a, model: MODEL });
  } catch (e) {
    const kind = e instanceof AiError ? e.kind : 'provider';
    if (kind === 'limit') { state.pausedUntil = Date.now() + e.retryAfter * 1000; log('limit dostawcy (429), przerwa ' + e.retryAfter + ' s'); return sendJson(res, 429, { error: 'limit', retryAfter: e.retryAfter }); }
    if (kind === 'bad_key' || kind === 'model_unavailable' || kind === 'region') { state.reason = kind; log('tryb regułowy do restartu: ' + kind); return sendJson(res, 503, { error: kind }); }
    log(kind === 'timeout' ? 'przekroczony czas (' + TIMEOUT_MS + ' ms)' : kind === 'network' ? 'brak połączenia z Google' : kind === 'invalid' ? 'odpowiedź nie jest JSON-em' : 'błąd dostawcy');
    return sendJson(res, kind === 'timeout' ? 504 : 502, { error: kind });
  }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
// Skrypty strony mogą łączyć się tylko z tym serwerem (connect-src 'self'). Wyjątek to czcionki z Google Fonts,
// które strona ładuje od zawsze (bez treści rozmów); bez nich wygląd byłby inny niż w pliku statycznym.
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

async function handleStatic(req, res) {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (path === '/') path = '/index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
  try {
    let data = await readFile(file);
    if (file === join(ROOT, 'index.html')) {
      data = Buffer.from(String(data).replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="assistant-endpoint" content="' + API + '">'));
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-cache', 'Content-Security-Policy': CSP });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end();
  }
}

const server = http.createServer((req, res) => {
  const path = req.url.split('?')[0];
  if (path === API + '/status') {
    if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); return res.end(); }
    return sendJson(res, 200, status());
  }
  if (path === API + '/answer') {
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }); return res.end(); }
    handleAnswer(req, res).catch(() => sendJson(res, 500, { error: 'server' }));
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  handleStatic(req, res);
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  server.listen(PORT, HOST, () => {
    console.log('Prototyp: http://' + HOST + ':' + PORT + '/');
    if (!KEY) console.log('Tryb AI: wyłączony (brak GEMINI_API_KEY w środowisku ani w .env). Asystent odpowiada regułami i nic nie wysyła.');
    else console.log('Tryb AI: klucz ustawiony, model ' + MODEL + ', limity serwera ' + PER_MINUTE + '/min i ' + PER_DAY + '/dzień, czas ' + TIMEOUT_MS + ' ms.');
    if (!/^(127\.|::1$|localhost$)/.test(HOST)) console.log('Uwaga: serwer słucha poza komputerem lokalnym. Warunki Gemini API dla bezpłatnego poziomu mogą nie pozwalać na udostępnianie aplikacji użytkownikom w EOG; sprawdź je przed pokazem publicznym.');
    verifyModel();
  });
}
