/*
 * Rdzeń asystenta po stronie serwera, wspólny dla lokalnego serwera (serwer-lokalny.mjs) i funkcji serwerowej
 * Cloudflare (funkcja-serwerowa.mjs). Bez dostępu do plików i bez zmiennych środowiskowych: dostęp do modelu,
 * rekordy i ustawienia przychodzą jako parametry (cfg).
 *
 * - Kontekst dla modelu powstaje WYŁĄCZNIE z rekordów serwera (dane-demo.mjs, fikcyjne, z datami policzonymi kodem)
 *   i oczyszczonego stanu demonstracji (kontekst.mjs). Z przeglądarki do modelu trafia tylko pytanie (do 300 znaków)
 *   i, po dopytaniu, poprzednie pytanie. Rekordy wysłane przez przeglądarkę są ignorowane.
 * - check: odpowiedź modelu jest przyjmowana tylko wtedy, gdy źródła i akcje są z listy, a każda liczba (data, kwota,
 *   liczba dni, rat) i nazwa miesiąca pochodzi z rekordu, na który odpowiedź się powołuje. Dzięki temu termin pisma
 *   nie „przejdzie” jako koniec polisy OC, a model nie wymyśli rat, kwot ani statusów.
 * - Dostawcy: Cloudflare Workers AI (powiązanie AI w funkcji serwerowej albo REST API z tokenem przy teście lokalnym)
 *   oraz Gemini API (tylko lokalne testy autora; warunki Google dla bezpłatnego poziomu wykluczają publiczne użycie w EOG).
 */
import { zastosujStan } from './kontekst.mjs';

export const LIMITY = { pytanie: 300, dopytanie: 220, odpowiedzZnakow: 2400, maxTokens: 800 };

export const SCENARIOS = ['oc', 'pismo', 'nowyDowod', 'portfel', 'dane'];
const SOURCE_RE = /^(todo|doc|case):[\w-]{1,40}$/;
const KINDS = ['dokument', 'pismo', 'termin', 'sprawa', 'informacja'];
export const KINDS_OUT = ['odpowiedz', 'dopytanie', 'poza_zakresem'];

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
    .replace(/\b[A-Z]{1,3}[\s ]?\d{4,5}[A-Z]?\b/g, '[usunięta tablica]');
}

export const str = (v, max) => (typeof v === 'string' ? redact(v.replace(/\s+/g, ' ').trim()).slice(0, max) : '');

export function cleanContext(k) {
  if (!k || typeof k !== 'object') return null;
  const dzis = typeof k.dzis === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k.dzis) ? k.dzis : null;
  if (!dzis || !Array.isArray(k.zrodla)) return null;
  const zrodla = k.zrodla.slice(0, 16).map((z) => (z && typeof z === 'object' && typeof z.id === 'string' && SOURCE_RE.test(z.id) && KINDS.includes(z.rodzaj)
    ? { id: z.id, rodzaj: z.rodzaj, tytul: str(z.tytul, 80), fakty: (Array.isArray(z.fakty) ? z.fakty : []).slice(0, 8).map((f) => str(f, 220)).filter(Boolean) }
    : null)).filter((z) => z && z.tytul);
  return { dzis: dzis, dzis_slownie: str(k.dzis_slownie, 60), zrodla: zrodla };
}

// Liczby rozbite na części („04.11.2026” → 4, 11, 2026) i rdzenie nazw miesięcy („listopada” → „list”).
export const numbers = (s) => (String(s).match(/\d+(?:[.,:]\d+)*/g) || []).flatMap((t) => t.split(/[.,:]/)).map((x) => String(Number.parseInt(x, 10)));
const MIES = /stycz\w*|lut\w*|mar(?:ca|zec)|kwie\w*|maj\w*|czerw\w*|lip\w*|sierp\w*|wrze\w*|paździer\w*|listopad\w*|grud\w*/gi;
export const months = (s) => (String(s).match(MIES) || []).map((x) => x.toLowerCase().slice(0, 4));
const DONE_CLAIM = /\b(złożył(?:e|a)m|wysłał(?:e|a)m|zgłosił(?:e|a)m|zastrzegł(?:e|a)m|opłacił(?:e|a)m|zapłacił(?:e|a)m|zarezerwował(?:e|a)m|umówił(?:e|a)m|anulował(?:e|a)m|ustawił(?:e|a)m)\b/i;
const CONNECTED_CLAIM = /\b(sprawdził(?:e|a)m w|połączył(?:e|a)m się z|w (bik|rejestrze|systemie banku|systemie urzędu))\b/i;

export const actionsFor = (ctx) => ctx.zrodla.map((z) => 'otworz:' + z.id).concat(SCENARIOS.map((s) => 'scenariusz:' + s), ['brak']);

export function check(r, ctx, extraText) {
  if (!r || typeof r !== 'object' || !KINDS_OUT.includes(r.rodzaj)) return { ok: false, why: 'rodzaj' };
  const byId = new Map(ctx.zrodla.map((z) => [z.id, z.tytul + ' ' + z.fakty.join(' ')]));
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
  if (a.wiem.some((w) => !w.zrodla.length || w.zrodla.some((x) => !byId.has(x)))) return { ok: false, why: 'źródło spoza kontekstu' };
  if (a.dalej.some((d) => !acts.includes(d.akcja))) return { ok: false, why: 'akcja spoza listy' };
  const baseText = [ctx.dzis, ctx.dzis_slownie, extraText].join(' ');
  const fits = (t, ids) => {
    const pool = baseText + ' ' + ids.map((x) => byId.get(x) || '').join(' ');
    const okN = new Set(numbers(pool)); const okM = new Set(months(pool));
    return numbers(t).every((n) => okN.has(n)) && months(t).every((m) => okM.has(m));
  };
  if (a.wiem.some((w) => !fits(w.tekst, w.zrodla))) return { ok: false, why: 'liczba lub data spoza źródła punktu' };
  const cited = [...new Set(a.wiem.flatMap((w) => w.zrodla).concat(a.dalej.filter((d) => d.akcja.startsWith('otworz:')).map((d) => d.akcja.slice(7))))];
  const texts = [a.krotko, a.pytanie].concat(a.wiem.map((w) => w.tekst), a.nie_wiem, a.dalej.map((d) => d.tekst), a.opcje);
  if ([a.krotko, a.pytanie].concat(a.nie_wiem, a.dalej.map((d) => d.tekst), a.opcje).some((t) => !fits(t, cited))) return { ok: false, why: 'liczba lub data bez źródła' };
  if (texts.some((t) => DONE_CLAIM.test(t))) return { ok: false, why: 'udawanie wykonanej sprawy' };
  if (texts.some((t) => CONNECTED_CLAIM.test(t))) return { ok: false, why: 'udawanie połączenia z instytucją' };
  if (texts.some((t) => /https?:\/\/|www\.|@/.test(t) || t !== redact(t))) return { ok: false, why: 'link lub dane osobowe' };
  return { ok: true, a: a };
}

export function rules(name) {
  return [
    'Jesteś ' + name + ', asystentem spraw w PROTOTYPIE koncepcji polskiej aplikacji publicznej. To nieoficjalny prototyp konkursowy; wszystkie dane są fikcyjne.',
    'Odpowiadasz WYŁĄCZNIE na podstawie pola „kontekst” z wiadomości. Nie masz dostępu do banków, BIK, rejestrów, urzędów ani firm i nie udajesz, że go masz.',
    'Zasady:',
    '1. Nie zgaduj. Daty, terminy, kwoty, raty, liczby i statusy podawaj tylko wtedy, gdy są w faktach źródła; wpisz je do „wiem” razem z nazwą dokumentu lub sprawy („Polisa OC Toyoty Yaris kończy się …”) i z id tego źródła w „zrodla”.',
    '2. W „krotko” piszesz własne objaśnienie (1–2 zdania). Jeśli podajesz w nim datę lub kwotę, musi to być ta sama wartość co w punkcie „wiem” z tym samym źródłem.',
    '2a. Daty i liczby dni są już policzone w faktach („za 9 dni”, „dzisiaj” w polu dzis). Przepisuj je dokładnie; sam nic nie licz i nie przeliczaj dat.',
    '3. Czego nie ma w kontekście, wpisz do „nie_wiem”. Brak danych nie oznacza, że czegoś nie ma. Prototyp nie zna kredytów, leasingów, rat, sald ani długów spoza kontekstu.',
    '4. Rozróżniaj podobne rzeczy: polisa OC to ubezpieczenie, a nie kredyt ani leasing; raty składki OC to nie raty kredytu; termin odpowiedzi na pismo to nie koniec polisy; pismo z urzędu to nie rachunek.',
    '5. Gdy pytanie jest niejednoznaczne (np. „raty” bez wskazania czego, „termin” bez wskazania sprawy) i od wyjaśnienia zależy odpowiedź, ustaw rodzaj „dopytanie”, napisz krótko, czego nie wiesz, zadaj jedno pytanie i podaj do 3 krótkich opcji.',
    '6. Nie podejmuj decyzji za użytkownika i nie udawaj, że coś załatwiasz, wysyłasz, ustawiasz, zgłaszasz albo płacisz. Możesz zaproponować akcję z listy „akcje”; każdą zmianę użytkownik potwierdza sam w aplikacji.',
    '7. Pisz po polsku, w drugiej osobie, zwięźle i spokojnie; „wiem”, „nie_wiem”, „dalej” po najwyżej 3 krótkie punkty.',
    '8. Pytania spoza spraw z tej aplikacji: rodzaj „poza_zakresem” i jedno zdanie, w czym możesz pomóc.',
    '9. Nie podawaj linków, adresów e-mail, numerów telefonów ani danych osobowych.',
    'Akcje: otworz:<id źródła> otwiera tę pozycję w aplikacji; scenariusz:oc (koniec polisy OC), scenariusz:pismo (odpowiedź na pismo z urzędu), scenariusz:nowyDowod (wniosek o nowy dowód), scenariusz:portfel (zgubione dokumenty), scenariusz:dane (kto ma dostęp do danych); brak.'
  ].join('\n');
}

export function schemaFor(ctx) {
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

export class AiError extends Error {
  constructor(kind, retryAfter) { super(kind); this.kind = kind; this.retryAfter = retryAfter || 0; }
}

// Czas z odpowiedzi 429: nagłówek Retry-After albo RetryInfo w treści błędu („37s”). Domyślnie minuta.
const retryAfterOf = (res, body) => {
  const h = Number.parseInt(res.headers.get('retry-after') || '', 10);
  if (h > 0) return h;
  const d = body && body.error && Array.isArray(body.error.details) ? body.error.details.find((x) => x && x.retryDelay) : null;
  const sec = d ? Number.parseFloat(String(d.retryDelay)) : NaN;
  return sec > 0 ? Math.ceil(sec) : 60;
};

// cfg: { key, base, model, timeoutMs, name }
export async function callGemini(cfg, path, init) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs);
  try {
    return await fetch(cfg.base + path, Object.assign({ signal: ctl.signal }, init, { headers: Object.assign({ 'x-goog-api-key': cfg.key }, init && init.headers) }));
  } catch (e) {
    throw new AiError(ctl.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}

export async function askGemini(cfg, question, ctx, earlier) {
  const res = await callGemini(cfg, '/models/' + encodeURIComponent(cfg.model) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: rules(cfg.name || 'Spinka') }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify({ pytanie: question, poprzednio: earlier, kontekst: ctx }) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: LIMITY.maxTokens, responseMimeType: 'application/json', responseJsonSchema: schemaFor(ctx) }
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

// Wspólna obsługa POST /answer: dane wejściowe → odpowiedź { code, body } (bez I/O, bez logów treści).
// cfg.dane: rekordy serwera (dane-demo.mjs). input: { pytanie, poprzednio?: { pytanie, dopytanie }, stan? }.
export async function answer(cfg, input) {
  const raw = input && typeof input.pytanie === 'string' ? input.pytanie.trim() : '';
  if (raw.length > LIMITY.pytanie) return { code: 413, body: { error: 'too_long', max: LIMITY.pytanie } };
  const question = str(raw, LIMITY.pytanie);
  if (!question || !cfg.dane) return { code: 400, body: { error: 'request' } };
  const ctx = zastosujStan(cfg.dane, input.stan);
  const p = input.poprzednio;
  const earlier = p && typeof p === 'object' ? { pytanie: str(p.pytanie, LIMITY.pytanie), dopytanie: str(p.dopytanie, LIMITY.dopytanie) } : null;
  const before = earlier && earlier.pytanie ? earlier : null;
  const v = check(await askModel(cfg, question, ctx, before), ctx, question + ' ' + (before ? before.pytanie + ' ' + before.dopytanie : ''));
  if (!v.ok) return { code: 502, body: { error: 'invalid' }, why: v.why };
  return { code: 200, body: { odpowiedz: v.a, model: cfg.model, dostawca: cfg.providerName } };
}

export function askModel(cfg, question, ctx, earlier) {
  return cfg.provider === 'workers-ai' ? askWorkersAi(cfg, question, ctx, earlier) : askGemini(cfg, question, ctx, earlier);
}

/*
 * Cloudflare Workers AI. W funkcji serwerowej: powiązanie cfg.ai (env.AI), bez klucza w kodzie.
 * Lokalnie (test autora): REST API z tokenem cfg.token i identyfikatorem konta cfg.accountId.
 * JSON Mode (response_format json_schema); Workers AI nie gwarantuje zgodności ze schematem, więc i tak sprawdzamy.
 */
const SEKUNDY_DO_PÓŁNOCY_UTC = () => { const t = new Date(); return Math.max(60, Math.ceil((Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1) - t.getTime()) / 1000)); };
function klasyfikujBlad(status, text) {
  const t = String(text || '');
  if (/4006|daily free allocation|neurons/i.test(t)) return new AiError('limit_dzienny', SEKUNDY_DO_PÓŁNOCY_UTC());
  if (/JSON Mode couldn.?t be met/i.test(t)) return new AiError('invalid');
  // Model tylko dla Workers Paid: sprawdzane przed 401/403, bo dostawca może zwrócić ten komunikat z kodem 403.
  if (/paid plan|requires.*workers paid|not available.*free|paid access required/i.test(t)) return new AiError('model_unavailable');
  if (status === 401 || status === 403 || /authentication|unauthorized|10000\b/i.test(t)) return new AiError('bad_key');
  if (status === 404 || /5007|no such model|model not found/i.test(t)) return new AiError('model_unavailable');
  if (status === 429 || /3040|capacity|rate limit|too many requests/i.test(t)) return new AiError('limit', 60);
  return new AiError('provider');
}
export function wyjmijJson(out) {
  let v = out && typeof out === 'object' && 'result' in out && out.result && typeof out.result === 'object' ? out.result : out;
  if (v && typeof v === 'object' && Array.isArray(v.choices) && v.choices[0] && v.choices[0].message) v = v.choices[0].message.content;
  else if (v && typeof v === 'object' && 'response' in v) v = v.response;
  if (v && typeof v === 'object') return v;
  if (typeof v !== 'string') throw new AiError('invalid');
  let t = v.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '').trim();
  const a = t.indexOf('{'); const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new AiError('invalid');
  try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { throw new AiError('invalid'); }
}
export async function askWorkersAi(cfg, question, ctx, earlier) {
  const payload = {
    messages: [
      { role: 'system', content: rules(cfg.name || 'Spinka') },
      { role: 'user', content: JSON.stringify({ pytanie: question, poprzednio: earlier, kontekst: ctx }) }
    ],
    response_format: { type: 'json_schema', json_schema: schemaFor(ctx) },
    max_tokens: LIMITY.maxTokens,
    temperature: 0.2
  };
  const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new AiError('timeout')), ms));
  if (cfg.ai && typeof cfg.ai.run === 'function') {
    let out;
    try { out = await Promise.race([cfg.ai.run(cfg.model, payload), timeout(cfg.timeoutMs)]); } catch (e) { throw e instanceof AiError ? e : klasyfikujBlad(0, e && e.message); }
    return wyjmijJson(out);
  }
  if (!cfg.token || !cfg.accountId) throw new AiError('no_key');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs);
  let res;
  try {
    res = await fetch(cfg.base + '/accounts/' + encodeURIComponent(cfg.accountId) + '/ai/run/' + cfg.model, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Authorization': 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    throw new AiError(ctl.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
  let body = null; let text = '';
  try { text = await res.text(); body = JSON.parse(text); } catch (e) { body = null; }
  if (!res.ok || (body && body.success === false)) {
    const msg = body && Array.isArray(body.errors) ? body.errors.map((x) => (x.code || '') + ' ' + (x.message || '')).join('; ') : text.slice(0, 300);
    throw klasyfikujBlad(res.status, msg);
  }
  return wyjmijJson(body);
}
