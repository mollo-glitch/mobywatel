#!/usr/bin/env node
/*
 * Lokalny serwer projektu z asystentem AI. Node.js 20.12+ (bez zależności).
 *
 * - Serwuje zbudowaną aplikację z dist/ (najpierw: node build.mjs) i wstawia do index.html
 *   <meta name="assistant-endpoint" content="/api/assistant">. Bez tego serwera (plik statyczny albo GitHub Pages
 *   bez funkcji serwerowej) asystent mówi wprost, że model AI nie jest podłączony, i nic nie wysyła.
 * - Dostawca (AI_PROVIDER):
 *     workers-ai  Cloudflare Workers AI przez REST API: CF_ACCOUNT_ID + CF_API_TOKEN (token z uprawnieniem Workers AI).
 *                 Ten sam model co w funkcji serwerowej; do testu autora na prawdziwym modelu.
 *     gemini      Gemini API: GEMINI_API_KEY. Tylko lokalne testy autora (bezpłatny poziom nie do publicznego użycia w EOG).
 *   Bez AI_PROVIDER: workers-ai, jeśli są CF_ACCOUNT_ID i CF_API_TOKEN; inaczej gemini, jeśli jest GEMINI_API_KEY; inaczej AI wyłączone.
 * - Sekrety tylko w zmiennych środowiskowych albo w lokalnym pliku .env (ignorowany przez Git, wzór w .env.example).
 *   Nie trafiają do przeglądarki, HTML, odpowiedzi API ani logów.
 * - GET  /api/assistant/status  → „ai” albo „off” z powodem, dostawca, model, plan. Nic nie wysyła do dostawcy.
 *   POST /api/assistant/answer  → { pytanie (do 300 znaków), poprzednio?, stan? } → odpowiedź sprawdzona w rdzen.mjs.
 *   Rekordy dla modelu są na serwerze (dane-demo.mjs); kontekst przysłany z przeglądarki jest ignorowany.
 * - Treść rozmów nie jest zapisywana ani logowana; log zawiera tylko rodzaj zdarzenia (np. „limit dostawcy”).
 *
 * Uruchomienie:  cp .env.example .env  (uzupełnij)  →  node server/serwer-lokalny.mjs  →  http://127.0.0.1:8080
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { answer as answerCore, callGemini, AiError, redact, cleanContext, check, LIMITY } from './rdzen.mjs';
import DANE from './dane-demo.mjs';
export { redact, cleanContext, check };

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(PROJECT, 'dist');
// Lokalny .env: wartości ustawione już w środowisku mają pierwszeństwo. Treść pliku nigdy nie jest wypisywana.
const ENV_FILE = join(PROJECT, '.env');
if (existsSync(ENV_FILE) && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(ENV_FILE); } catch (e) { console.error('Nie udało się wczytać pliku .env (' + (e.code || 'błąd składni') + ').'); }
}

const int = (v, def, min, max) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();
const CF_ACCOUNT = (process.env.CF_ACCOUNT_ID || '').trim();
const CF_TOKEN = (process.env.CF_API_TOKEN || '').trim();
const PROVIDER = ['workers-ai', 'gemini'].includes(process.env.AI_PROVIDER) ? process.env.AI_PROVIDER : (CF_ACCOUNT && CF_TOKEN ? 'workers-ai' : GEMINI_KEY ? 'gemini' : process.env.AI_PROVIDER_DOMYSLNY === 'gemini' ? 'gemini' : 'workers-ai');
const WA = PROVIDER === 'workers-ai';
const KEY = WA ? (CF_ACCOUNT && CF_TOKEN ? 'ok' : '') : GEMINI_KEY;
const DEFAULT_MODEL = WA ? '@cf/google/gemma-4-26b-a4b-it' : 'gemini-3.1-flash-lite';
const MODEL_RE = WA ? /^@(cf|hf)\/[\w.-]{1,40}\/[\w.-]{1,64}$/ : /^[\w.-]{1,64}$/;
const MODEL = MODEL_RE.test(process.env.AI_MODEL || process.env.GEMINI_MODEL || '') ? (process.env.AI_MODEL || process.env.GEMINI_MODEL) : DEFAULT_MODEL;
const BASE = WA ? (process.env.WORKERS_AI_BASE || 'https://api.cloudflare.com/client/v4').replace(/\/$/, '') : (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
const PORT = int(process.env.PORT, 8080, 1, 65535);
const HOST = process.env.HOST || '127.0.0.1';
const TIMEOUT_MS = int(process.env.AI_TIMEOUT_MS || process.env.GEMINI_TIMEOUT_MS, 20000, 1000, 30000);
const PER_MINUTE = int(process.env.AI_MAX_PER_MINUTE, 6, 1, 60);
const PER_DAY = int(process.env.AI_MAX_PER_DAY, 150, 1, 5000);
const API = '/api/assistant';

// Plan: Workers AI na planie Workers Free = bezpłatna dzienna pula (po wyczerpaniu błąd, bez opłat); Gemini: free|paid.
const PLAN = WA ? 'free' : (process.env.GEMINI_PLAN === 'paid' ? 'paid' : 'free');
const PROVIDER_NAME = WA ? 'Cloudflare Workers AI' : 'Google Gemini';
const CFG = { provider: PROVIDER, providerName: PROVIDER_NAME, key: GEMINI_KEY, token: CF_TOKEN, accountId: CF_ACCOUNT, base: BASE, model: MODEL, timeoutMs: TIMEOUT_MS, name: 'Spinka', dane: DANE };

// Stan modelu AI. Trwałe powody (brak klucza, odrzucony klucz, model, region) wyłączają AI do restartu serwera.
const state = { reason: KEY ? null : 'no_key', pausedUntil: 0, pauseKind: '' };
if (!DANE || !Array.isArray(DANE.zrodla)) throw new Error('Brak server/dane-demo.mjs: zbuduj aplikację (node build.mjs).');
const log = (what) => console.log(new Date().toISOString().slice(11, 19) + ' AI: ' + what); // bez treści pytań i bez klucza

// Sprawdzenie przy starcie: czy model istnieje i klucz działa (zapytanie o opis modelu, bez treści rozmów).
async function verifyModel() {
  if (!KEY || WA) return; // Workers AI: sprawdzenie dopiero przy pierwszym pytaniu (osobne zapytanie zużywałoby pulę)
  try {
    const res = await callGemini(CFG, '/models/' + encodeURIComponent(MODEL), { method: 'GET' });
    if (res.status === 404) state.reason = 'model_unavailable';
    else if (res.status === 400 || res.status === 401 || res.status === 403) state.reason = 'bad_key';
    log(res.ok ? 'model ' + MODEL + ' dostępny' : 'sprawdzenie modelu: HTTP ' + res.status + (state.reason ? ' → AI wyłączone (' + state.reason + ')' : ''));
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
  mode: state.reason ? 'off' : 'ai', reason: state.reason, provider: PROVIDER_NAME, model: MODEL.replace(/^@(cf|hf)\/[\w.-]+\//, ''), plan: PLAN, maxPytanie: LIMITY.pytanie,
  limits: { perMinute: PER_MINUTE, perDay: PER_DAY }, pausedFor: Math.max(0, Math.ceil((state.pausedUntil - Date.now()) / 1000)), pauseKind: state.pausedUntil > Date.now() ? state.pauseKind : ''
});

async function handleAnswer(req, res) {
  if (state.reason) return sendJson(res, 503, { error: state.reason });
  // Tylko z tej samej strony: inne witryny nie mogą zużywać klucza.
  const origin = req.headers.origin;
  if (origin && origin !== 'http://' + req.headers.host && origin !== 'https://' + req.headers.host) return sendJson(res, 403, { error: 'origin' });
  if (!/^application\/json\b/.test(req.headers['content-type'] || '')) return sendJson(res, 415, { error: 'format' });
  let input;
  try { input = JSON.parse(await readBody(req, 4096)); } catch (e) { return sendJson(res, 400, { error: 'request' }); }
  if (!input || typeof input !== 'object') return sendJson(res, 400, { error: 'request' });
  const wait = Math.ceil((state.pausedUntil - Date.now()) / 1000);
  if (wait > 0) return sendJson(res, 429, { error: state.pauseKind || 'limit', retryAfter: wait });
  const local = localLimit(req.socket.remoteAddress || '');
  if (local) { log('lokalny limit serwera'); return sendJson(res, 429, { error: 'local_limit', retryAfter: local }); }
  try {
    const out = await answerCore(CFG, input);
    if (out.why) log('odpowiedź odrzucona: ' + out.why);
    return sendJson(res, out.code, out.body);
  } catch (e) {
    const kind = e instanceof AiError ? e.kind : 'provider';
    if (kind === 'limit' || kind === 'limit_dzienny') { state.pausedUntil = Date.now() + e.retryAfter * 1000; state.pauseKind = kind; log((kind === 'limit' ? 'limit dostawcy (429)' : 'wyczerpana dzienna pula dostawcy') + ', przerwa ' + e.retryAfter + ' s'); return sendJson(res, 429, { error: kind, retryAfter: e.retryAfter }); }
    if (kind === 'bad_key' || kind === 'model_unavailable' || kind === 'region' || kind === 'no_key') { state.reason = kind; log('AI wyłączone do restartu: ' + kind); return sendJson(res, 503, { error: kind }); }
    log(kind === 'timeout' ? 'przekroczony czas (' + TIMEOUT_MS + ' ms)' : kind === 'network' ? 'brak połączenia z dostawcą' : kind === 'invalid' ? 'odpowiedź nie jest JSON-em' : 'błąd dostawcy');
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

export function start() {
  server.listen(PORT, HOST, () => {
    console.log('Prototyp: http://' + HOST + ':' + PORT + '/');
    if (!KEY) console.log('Model AI: wyłączony (' + (WA ? 'brak CF_ACCOUNT_ID i CF_API_TOKEN' : 'brak GEMINI_API_KEY') + ' w środowisku ani w .env). Asystent mówi, że AI nie jest podłączone, i nic nie wysyła.');
    else console.log('Model AI: ' + PROVIDER_NAME + ', model ' + MODEL + ', plan ' + (PLAN === 'paid' ? 'płatny' : 'bezpłatny') + ', limity serwera ' + PER_MINUTE + '/min i ' + PER_DAY + '/dzień, czas ' + TIMEOUT_MS + ' ms, pytanie do ' + LIMITY.pytanie + ' znaków.');
    if (!WA && !/^(127\.|::1$|localhost$)/.test(HOST)) console.log('Uwaga: serwer słucha poza komputerem lokalnym. Warunki Gemini API pozwalają udostępniać aplikację użytkownikom w EOG, Szwajcarii i Wielkiej Brytanii tylko na usługach płatnych' + (PLAN === 'paid' ? '.' : ' (GEMINI_PLAN=paid i projekt z rozliczeniami).'));
    verifyModel();
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) start();
