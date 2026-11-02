/*
 * Funkcja serwerowa asystenta dla strony statycznej (np. GitHub Pages): Cloudflare Workers (standardowe API fetch).
 * Ten sam rdzeń co lokalny serwer (rdzen.mjs). Klucz jest sekretem funkcji, nigdy w repozytorium ani w buildzie strony.
 *
 * Wdrożenie (wymaga konta Cloudflare; darmowy plan Workers nie wymaga karty):
 *   1. cp server/wrangler.toml.example server/wrangler.toml   i wpisz DOZWOLONE_ZRODLA (adres strony, np. https://mollo-glitch.github.io)
 *   2. npx wrangler secret put GEMINI_API_KEY                   (klucz wkleja się w terminalu; nie trafia do plików)
 *   3. npx wrangler deploy                                        → adres funkcji, np. https://spinka-asystent.<konto>.workers.dev
 *   4. ASSISTANT_ENDPOINT=https://…workers.dev/api/assistant node build.mjs   (adres trafia do <meta> w dist/index.html)
 *
 * Zmienne: GEMINI_API_KEY (sekret), DOZWOLONE_ZRODLA (lista adresów stron rozdzielona przecinkami), GEMINI_MODEL,
 *          GEMINI_PLAN (free|paid), AI_MAX_PER_MINUTE, AI_MAX_PER_DAY, GEMINI_TIMEOUT_MS.
 * Limity w pamięci funkcji są tylko pomocnicze (każda instancja liczy osobno); docelowo ustaw też regułę limitu
 * zapytań w panelu Cloudflare. Treść pytań nie jest logowana.
 */
import { answer as answerCore, AiError } from './rdzen.mjs';

const API = '/api/assistant';
const int = (v, def, min, max) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const perIp = new Map();
let day = { date: '', count: 0 };
let pausedUntil = 0;

function cfgOf(env) {
  return {
    key: String(env.GEMINI_API_KEY || '').trim(),
    base: 'https://generativelanguage.googleapis.com/v1beta',
    model: /^[\w.-]{1,64}$/.test(env.GEMINI_MODEL || '') ? env.GEMINI_MODEL : 'gemini-3.1-flash-lite',
    timeoutMs: int(env.GEMINI_TIMEOUT_MS, 12000, 1000, 30000),
    name: 'Spinka',
    plan: env.GEMINI_PLAN === 'paid' ? 'paid' : 'free',
    perMinute: int(env.AI_MAX_PER_MINUTE, 8, 1, 60),
    perDay: int(env.AI_MAX_PER_DAY, 200, 1, 5000),
    origins: String(env.DOZWOLONE_ZRODLA || '').split(',').map((x) => x.trim()).filter((x) => /^https:\/\/[\w.-]+(:\d+)?$/.test(x))
  };
}

function limit(cfg, ip) {
  const now = Date.now(); const today = new Date().toISOString().slice(0, 10);
  if (day.date !== today) day = { date: today, count: 0 };
  if (day.count >= cfg.perDay) return 3600;
  const list = (perIp.get(ip) || []).filter((t) => now - t < 60000);
  if (list.length >= cfg.perMinute) { perIp.set(ip, list); return Math.ceil((60000 - (now - list[0])) / 1000); }
  list.push(now); perIp.set(ip, list); day.count++;
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
    // Inne witryny nie mogą zużywać klucza: tylko adresy z DOZWOLONE_ZRODLA.
    if (!allowed) return json(403, { error: 'origin' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === API + '/status' && request.method === 'GET') {
      return json(200, { mode: cfg.key ? 'ai' : 'off', reason: cfg.key ? null : 'no_key', provider: 'Google Gemini', model: cfg.model, plan: cfg.plan,
        limits: { perMinute: cfg.perMinute, perDay: cfg.perDay }, pausedFor: Math.max(0, Math.ceil((pausedUntil - Date.now()) / 1000)) });
    }
    if (url.pathname !== API + '/answer' || request.method !== 'POST') return json(404, { error: 'not_found' });
    if (!cfg.key) return json(503, { error: 'no_key' });
    if (!/^application\/json\b/.test(request.headers.get('Content-Type') || '')) return json(415, { error: 'format' });
    const text = await request.text();
    if (text.length > 16384) return json(413, { error: 'request' });
    let input; try { input = JSON.parse(text); } catch (e) { return json(400, { error: 'request' }); }
    const wait = Math.ceil((pausedUntil - Date.now()) / 1000);
    if (wait > 0) return json(429, { error: 'limit', retryAfter: wait });
    const local = limit(cfg, request.headers.get('CF-Connecting-IP') || '');
    if (local) return json(429, { error: 'local_limit', retryAfter: local });
    try {
      const out = await answerCore(cfg, input);
      return json(out.code, out.body);
    } catch (e) {
      const kind = e instanceof AiError ? e.kind : 'provider';
      if (kind === 'limit') { pausedUntil = Date.now() + e.retryAfter * 1000; return json(429, { error: 'limit', retryAfter: e.retryAfter }); }
      if (kind === 'bad_key' || kind === 'model_unavailable' || kind === 'region') return json(503, { error: kind });
      return json(kind === 'timeout' ? 504 : 502, { error: kind });
    }
  }
};
