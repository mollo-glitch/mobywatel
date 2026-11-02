/*
 * Funkcja serwerowa asystenta dla strony statycznej (np. GitHub Pages): Cloudflare Workers.
 * Domyślny dostawca: Cloudflare Workers AI przez powiązanie AI (bez klucza w kodzie, w repozytorium i w buildzie strony).
 * Ten sam rdzeń co lokalny serwer (rdzen.mjs), te same fikcyjne rekordy (dane-demo.mjs, generowane przez build.mjs).
 *
 * Wdrożenie (konto Cloudflare na planie Workers Free; bez karty i bez płatnego planu):
 *   1. cp server/wrangler.toml.example server/wrangler.toml   i wpisz DOZWOLONE_ZRODLA (adres strony, np. https://mollo-glitch.github.io)
 *   2. npx wrangler login                                         (logowanie do własnego konta w przeglądarce)
 *   3. cd server && npx wrangler deploy                           → adres funkcji, np. https://spinka-asystent.<konto>.workers.dev
 *   4. ASSISTANT_ENDPOINT=https://…workers.dev/api/assistant node build.mjs   (adres trafia do <meta> w dist/index.html)
 *
 * Ochrona przed nadużyciem:
 *   - tylko adresy z DOZWOLONE_ZRODLA (CORS + sprawdzenie nagłówka Origin; inne strony dostają 403),
 *   - limit na adres IP: powiązanie LIMIT_IP (Rate Limiting, licznik po stronie Cloudflare) + licznik w pamięci,
 *   - dzienny limit funkcji (AI_MAX_PER_DAY, liczony w pamięci instancji, więc przybliżony),
 *   - twardy limit dostawcy: na planie Workers Free po wyczerpaniu dziennej puli 10 000 neuronów Workers AI zwraca błąd
 *     (bez opłat) do 00:00 UTC; asystent pokazuje wtedy „AI niedostępne” zamiast gotowych odpowiedzi,
 *   - zapytanie do 4 KB, pytanie do 300 znaków, odpowiedź do 800 tokenów; model widzi tylko rekordy serwera.
 * Treść pytań nie jest logowana.
 *
 * Zmienne: DOZWOLONE_ZRODLA, AI_MODEL, AI_MAX_PER_MINUTE, AI_MAX_PER_DAY, AI_TIMEOUT_MS.
 * Opcjonalnie Gemini (AI_PROVIDER = "gemini" i sekret GEMINI_API_KEY): tylko z płatnym projektem, jeśli strona jest publiczna w EOG.
 */
import { answer as answerCore, AiError, LIMITY } from './rdzen.mjs';
import DANE from './dane-demo.mjs';

const API = '/api/assistant';
const int = (v, def, min, max) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const perIp = new Map();
let day = { date: '', count: 0 };
let pausedUntil = 0;
let pauseKind = '';

function cfgOf(env) {
  const gemini = env.AI_PROVIDER === 'gemini';
  const model = gemini
    ? (/^[\w.-]{1,64}$/.test(env.AI_MODEL || '') ? env.AI_MODEL : 'gemini-3.1-flash-lite')
    : (/^@(cf|hf)\/[\w.-]{1,40}\/[\w.-]{1,64}$/.test(env.AI_MODEL || '') ? env.AI_MODEL : '@cf/google/gemma-4-26b-a4b-it');
  return {
    provider: gemini ? 'gemini' : 'workers-ai',
    providerName: gemini ? 'Google Gemini' : 'Cloudflare Workers AI',
    ai: gemini ? null : env.AI,
    key: gemini ? String(env.GEMINI_API_KEY || '').trim() : '',
    base: 'https://generativelanguage.googleapis.com/v1beta',
    model: model,
    timeoutMs: int(env.AI_TIMEOUT_MS, 20000, 1000, 30000),
    name: 'Spinka',
    dane: DANE,
    plan: gemini ? (env.GEMINI_PLAN === 'paid' ? 'paid' : 'free') : 'free',
    perMinute: int(env.AI_MAX_PER_MINUTE, 6, 1, 60),
    perDay: int(env.AI_MAX_PER_DAY, 150, 1, 5000),
    origins: String(env.DOZWOLONE_ZRODLA || '').split(',').map((x) => x.trim()).filter((x) => /^https:\/\/[\w.-]+(:\d+)?$/.test(x))
  };
}
const ready = (cfg) => (cfg.provider === 'gemini' ? !!cfg.key : !!(cfg.ai && typeof cfg.ai.run === 'function'));

function localLimit(cfg, ip) {
  const now = Date.now(); const today = new Date().toISOString().slice(0, 10);
  if (day.date !== today) day = { date: today, count: 0 };
  if (day.count >= cfg.perDay) return 3600;
  const list = (perIp.get(ip) || []).filter((t) => now - t < 60000);
  if (list.length >= cfg.perMinute) { perIp.set(ip, list); return Math.ceil((60000 - (now - list[0])) / 1000); }
  list.push(now); perIp.set(ip, list); day.count++;
  if (perIp.size > 5000) perIp.clear();
  return 0;
}

export default {
  async fetch(request, env) {
    const cfg = cfgOf(env);
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = cfg.origins.includes(origin);
    const cors = allowed ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' } : { 'Vary': 'Origin' };
    const json = (code, obj) => new Response(JSON.stringify(obj), { status: code, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, cors) });
    // Inne witryny nie mogą zużywać puli modelu: tylko adresy z DOZWOLONE_ZRODLA.
    if (!allowed) return json(403, { error: 'origin' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === API + '/status' && request.method === 'GET') {
      const wait = Math.max(0, Math.ceil((pausedUntil - Date.now()) / 1000));
      return json(200, { mode: ready(cfg) ? 'ai' : 'off', reason: ready(cfg) ? null : 'no_key', provider: cfg.providerName, model: cfg.model.replace(/^@(cf|hf)\/[\w.-]+\//, ''), plan: cfg.plan,
        limits: { perMinute: cfg.perMinute, perDay: cfg.perDay }, maxPytanie: LIMITY.pytanie, pausedFor: wait, pauseKind: wait ? pauseKind : '' });
    }
    if (url.pathname !== API + '/answer' || request.method !== 'POST') return json(404, { error: 'not_found' });
    if (!ready(cfg)) return json(503, { error: 'no_key' });
    if (!/^application\/json\b/.test(request.headers.get('Content-Type') || '')) return json(415, { error: 'format' });
    const text = await request.text();
    if (text.length > 4096) return json(413, { error: 'request' });
    let input; try { input = JSON.parse(text); } catch (e) { return json(400, { error: 'request' }); }
    if (!input || typeof input !== 'object') return json(400, { error: 'request' });
    const wait = Math.ceil((pausedUntil - Date.now()) / 1000);
    if (wait > 0) return json(429, { error: pauseKind || 'limit', retryAfter: wait });
    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (env.LIMIT_IP && typeof env.LIMIT_IP.limit === 'function') {
      const r = await env.LIMIT_IP.limit({ key: ip || 'brak' });
      if (!r.success) return json(429, { error: 'local_limit', retryAfter: 60 });
    }
    const local = localLimit(cfg, ip);
    if (local) return json(429, { error: 'local_limit', retryAfter: local });
    try {
      const out = await answerCore(cfg, input);
      return json(out.code, out.body);
    } catch (e) {
      const kind = e instanceof AiError ? e.kind : 'provider';
      if (kind === 'limit' || kind === 'limit_dzienny') { pausedUntil = Date.now() + e.retryAfter * 1000; pauseKind = kind; return json(429, { error: kind, retryAfter: e.retryAfter }); }
      if (kind === 'bad_key' || kind === 'model_unavailable' || kind === 'region' || kind === 'no_key') return json(503, { error: kind });
      return json(kind === 'timeout' ? 504 : 502, { error: kind });
    }
  }
};
