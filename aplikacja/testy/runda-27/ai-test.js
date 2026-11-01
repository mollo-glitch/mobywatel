// Tryb AI end-to-end: serwer prototypu (z kluczem, bez klucza, zły klucz, brak modelu, brak sieci) + atrapa Gemini API.
// Sprawdza przeglądarkę (informacja przed wysłaniem, tryb w nagłówku i pasku, odpowiedź o raty, dopytanie, błędy i
// powrót do reguł, przełącznik), treść wysłaną do „Google” (bez danych osobowych), brak klucza w odpowiedziach i logach.
// argv: [2] katalog projektu (z server/ i dist/), [3] port statycznej kopii dist (bez serwera AI).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2]; const STATIC = process.argv[3] || '8600';
const KEY = 'test-klucz-atrapa-0000'; const MOCK = 'http://127.0.0.1:8599';
const R = []; const ok = (co, warunek, sz) => R.push({ co, ok: !!warunek, sz });
const procs = []; const logs = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function server(port, env) {
  logs[port] = '';
  const p = spawn('node', ['server/gemini-adapter.mjs'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(port), GEMINI_API_KEY: '' }, env) });
  p.stdout.on('data', (d) => { logs[port] += d; }); p.stderr.on('data', (d) => { logs[port] += d; });
  procs.push(p); return p;
}
const mockLast = async () => (await fetch(MOCK + '/__last')).json();
const mockReset = () => fetch(MOCK + '/__reset', { method: 'POST' });

(async () => {
  server(8611, { GEMINI_API_KEY: KEY, GEMINI_API_BASE: MOCK + '/v1beta', GEMINI_TIMEOUT_MS: '2000' });
  server(8612, { GEMINI_API_KEY: KEY, GEMINI_API_BASE: MOCK + '/v1beta' });
  server(8613, {});
  server(8614, { GEMINI_API_KEY: 'zly-klucz-testowy', GEMINI_API_BASE: MOCK + '/v1beta' });
  server(8615, { GEMINI_API_KEY: KEY, GEMINI_API_BASE: MOCK + '/v1beta', GEMINI_MODEL: 'gemini-nie-istnieje' });
  server(8616, { GEMINI_API_KEY: KEY, GEMINI_API_BASE: 'http://127.0.0.1:9/v1beta' });
  await sleep(1800);
  const status = async (port) => (await fetch('http://127.0.0.1:' + port + '/api/assistant/status')).json();
  const S = {}; for (const port of [8611, 8613, 8614, 8615, 8616]) S[port] = await status(port);
  ok('status: z kluczem → ai; bez klucza → rules/no_key; zły klucz → bad_key; brak modelu → model_unavailable; bez sieci → ai (sprawdzenie odłożone)',
    S[8611].mode === 'ai' && S[8613].reason === 'no_key' && S[8614].reason === 'bad_key' && S[8615].reason === 'model_unavailable' && S[8616].mode === 'ai', S);

  const b = await chromium.launch();
  const seen = []; // wszystkie odpowiedzi serwera widziane przez przeglądarkę (do szukania klucza)
  async function open(port, opts) {
    opts = opts || {};
    const p = await b.newPage({ viewport: { width: opts.w || 390, height: 844 }, reducedMotion: 'reduce' });
    const errs = []; const api = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource: the server responded with a status of (4|5)\d\d/.test(m.text())) errs.push(m.text()); }); // kody 4xx/5xx z /api są zamierzone (np. 502 przy odrzuconej odpowiedzi)
    p.on('request', (r) => { if (!/^https?:\/\/127\.0\.0\.1/.test(r.url()) && !/fonts\.(googleapis|gstatic)\.com/.test(r.url()) && !r.url().startsWith('data:')) api.push('OBCY: ' + r.url()); if (r.url().includes('/api/')) api.push(r.method() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '')); });
    p.on('response', async (r) => { try { if (r.url().startsWith('http://127.0.0.1')) seen.push(await r.text()); } catch (e) { /* treść niedostępna */ } });
    await p.goto('http://127.0.0.1:' + port + '/index.html'); await p.waitForSelector('#entry:not([hidden])', { timeout: 15000 });
    await p.click('[data-act=entry-demo]'); await p.click('[data-act=enter]'); await p.waitForTimeout(700);
    await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(900);
    return { p, errs, api };
  }
  const ask = async (p, q, wait) => { await p.fill('#chat-input', q); await p.press('#chat-input', 'Enter'); await p.waitForTimeout(wait || 1500); };
  const lastTurn = (p) => p.evaluate(() => { const all = [...document.querySelectorAll('#chat-log > *')]; const me = all.filter((x) => x.matches('.msg.me')).pop(); const after = all.slice(all.indexOf(me) + 1);
    const t = (e) => e.textContent.replace(/\s+/g, ' ').trim(); return { ja: t(me), boty: after.filter((x) => x.matches('.msg')).map(t), karta: after.filter((x) => x.matches('.icard')).map(t).join(' '), zrodla: after.flatMap((x) => [...x.querySelectorAll('.src-title')]).map(t), chipy: after.flatMap((x) => [...x.querySelectorAll('.chip')]).map(t), bledy: after.filter((x) => x.matches('.st-err')).map(t) }; });
  const head = (p) => p.evaluate(() => ({ pasek: document.querySelector('.proto-bar').textContent.trim(), sub: document.querySelector('#chat-sub').textContent.replace(/\s+/g, ' ').trim(), przelacznik: (document.querySelector('.ai-switch') || {}).getAttribute ? document.querySelector('.ai-switch').getAttribute('aria-checked') : null, pola: document.querySelector('.chat-head svg.postac').getAttribute('data-state') }));

  // 1. Tryb AI aktywny: informacja przed pierwszym wysłaniem, tryb w nagłówku i pasku, brak „nic nie jest wysyłane”.
  await mockReset();
  { const { p, errs, api } = await open(8611);
    const h = await head(p); const intro = await p.$$eval('#chat-log .msg.bot', (m) => m.map((x) => x.textContent).join(' | '));
    ok('AI: przed pierwszym pytaniem widać informację, że treść trafia do Google; pasek i nagłówek mówią „tryb AI”; nigdzie „nic nie jest wysyłane”',
      /trafia przez serwer prototypu do Google/.test(intro) && /pytania trafiają do Google/.test(h.pasek) && /Tryb AI · pytania trafiają do Google/.test(h.sub) && h.przelacznik === 'true' && !/nic nie jest wysyłane/.test(intro + h.pasek + h.sub), { h, intro: intro.slice(0, 300) });
    // 2. Pytanie o raty: model rozróżnia OC i kredyt, nie zgaduje liczby rat.
    await ask(p, 'Ile rat zostało mi na auto?', 1800);
    const t = await lastTurn(p); const L = await mockLast();
    ok('raty na auto: odpowiedź modelu mówi, że nie ma kredytu ani liczby rat, i pokazuje polisę OC Toyoty z datą ze źródła; karta źródła i scenariusz OC z danych aplikacji',
      /nie ma żadnego kredytu/.test(t.boty.join(' ')) && /04\.11\.2026/.test(t.boty.join(' ')) && /Tego nie wiem/.test(t.karta) && t.zrodla.includes('Toyota Yaris') && t.chipy.includes('Zacznij: Koniec polisy OC') && /wysłane do modelu AI/.test(t.ja) && /Odpowiedź modelu AI/.test(t.boty.join(' ')), t);
    const sent = JSON.stringify(L.last && L.last.payload);
    const banned = ['85031412345', '850314', 'Kowalczyk', 'Tomasz', 'ABC 123456', 'ABC123456', 'WX', '12345', '000123', 'Przykładowa 12', '01234/04/1465', 'EA 0000000', 'KDR 0001234', '80616', '00-001', 'Wezwanie do złożenia wyjaśnień, działając'];
    ok('do „Google” trafiło tylko pytanie i kontekst demo: bez imienia, nazwiska, PESEL-u, adresu, numerów dokumentów, tablicy i polisy; schemat JSON w zapytaniu',
      L.last && L.last.payload.pytanie === 'Ile rat zostało mi na auto?' && L.last.payload.kontekst.zrodla.length >= 8 && banned.every((x) => !sent.includes(x)) && L.last.schema && L.last.mime === 'application/json' && !L.last.payload.poprzednio,
      { zakazane_znalezione: banned.filter((x) => sent.includes(x)), rozmiar: sent.length, zrodla: L.last && L.last.payload.kontekst.zrodla.map((z) => z.id) });
    ok('stan znaku po odpowiedzi AI: wyjaśnia albo następny krok', ['wyjasnia', 'krok'].includes((await head(p)).pola), await head(p));
    // 3. Niejednoznaczne „raty?”: dopytanie z opcjami; odpowiedź na opcję wysyła poprzednie pytanie (tylko wtedy).
    await ask(p, 'raty?', 1500);
    const d = await lastTurn(p);
    ok('„raty?”: model dopytuje (kredyt czy składka OC) zamiast zgadywać; opcje jako przyciski', /raty kredytu czy o raty składki OC/.test(d.boty.join(' ')) && d.chipy.includes('Raty kredytu'), d);
    await p.click('.chat-log .quick.bound .chip:has-text("Raty kredytu")'); await p.waitForTimeout(1800);
    const d2 = await lastTurn(p); const L2 = await mockLast();
    ok('po wyborze „Raty kredytu”: wysłane poprzednie pytanie i dopytanie (potrzebne do zrozumienia), odpowiedź bez zgadywania rat',
      L2.last.payload.poprzednio && L2.last.payload.poprzednio.pytanie === 'raty?' && /nie ma żadnego kredytu/.test(d2.boty.join(' ')), { poprzednio: L2.last.payload.poprzednio, boty: d2.boty });
    await ask(p, 'Co z moim dowodem?', 1500); const L3 = await mockLast();
    ok('następne pytanie po dopytaniu już bez poprzedniego (rozmowa nie jest wysyłana ponownie)', !L3.last.payload.poprzednio, L3.last.payload.poprzednio || null);
    // 4. Odpowiedź z liczbą spoza danych → odrzucona, odpowiedź z reguł i jasny komunikat.
    await ask(p, 'zmyśl coś o ratach', 1800); const z = await lastTurn(p);
    ok('model „zmyśla” liczbę rat (14 rat po 650 zł) → odrzucone, komunikat i odpowiedź z reguł bez tej liczby', /nie zgadzała się z danymi demo/.test(z.bledy.join(' ')) && !/14 rat|650/.test(z.boty.join(' ')) && z.boty.length >= 2, z);
    ok('AI: żadnych zapytań z przeglądarki poza własny serwer (i czcionki), bez błędów strony i CSP', !api.some((x) => x.startsWith('OBCY')) && !errs.length, { api: api.slice(0, 12), errs });
    // 5. Przełącznik: tryb regułowy → nic nie idzie do modelu; ponowne włączenie → znowu informacja.
    const before = (await mockLast()).count;
    await p.click('.ai-switch'); await p.waitForTimeout(400); const h2 = await head(p);
    await ask(p, 'Ile rat zostało mi na auto?', 1200); const r2 = await lastTurn(p); const after = (await mockLast()).count;
    ok('przełącznik „Tryb AI” wyłączony: pasek „nic nie jest wysyłane”, odpowiedź z reguł, nic nie trafia do modelu', h2.przelacznik === 'false' && /nic nie jest wysyłane/.test(h2.pasek) && !/pytania trafiają/.test(h2.pasek) && after === before && !/wysłane do modelu/.test(r2.ja) && /Nie wiem, ile rat Ci zostało/.test(r2.boty.join(' ')), { h2, r2, before, after });
    await p.click('.ai-switch'); await p.waitForTimeout(400); const h3 = await head(p);
    const focus = await p.evaluate(() => document.activeElement.className); const last3 = await p.$$eval('#chat-log .msg.bot', (m) => m.pop().textContent);
    ok('przełącznik z powrotem: tryb AI i znowu informacja o wysyłaniu; fokus zostaje na przełączniku', h3.przelacznik === 'true' && /trafia przez serwer prototypu do Google/.test(last3) && /ai-switch/.test(focus), { h3, focus });
    await p.screenshot({ path: 'ai-1-tryb-ai.png' });
    await p.close(); }

  // 6. Przekroczony czas, błąd dostawcy, blokada odpowiedzi; dwa błędy z rzędu wstrzymują AI na 2 minuty.
  { const { p } = await open(8611);
    await ask(p, 'wolno myślący model', 3200); const a = await lastTurn(p);
    ok('timeout (atrapa milczy 10 s, serwer czeka 2 s): komunikat o czasie i odpowiedź z reguł', /nie odpowiedział w wyznaczonym czasie/.test(a.bledy.join(' ')) && a.boty.length >= 2, a);
    await ask(p, '#500 test', 1500); const c = await lastTurn(p); const h = await head(p);
    ok('błąd dostawcy (500) drugi raz z rzędu: komunikat, odpowiedź z reguł, AI wstrzymane (pasek: nic nie jest wysyłane)', /zwrócił błąd, drugi raz z rzędu/.test(c.bledy.join(' ')) && /nic nie jest wysyłane/.test(h.pasek) && /wstrzymany do/.test(h.sub), { c, h });
    await p.close(); }
  { const { p } = await open(8611);
    await ask(p, '#blokada', 1500); const a = await lastTurn(p);
    ok('odpowiedź zablokowana przez dostawcę (bez treści): komunikat i reguły', a.bledy.length === 1 && a.boty.length >= 2, a);
    await p.close(); }

  // 7. Limit 429 od dostawcy: przerwa wg RetryInfo, w tym czasie zapytania nie idą do Google.
  { const { p } = await open(8612);
    await ask(p, '#429 limit', 1500); const a = await lastTurn(p); const h = await head(p); const n1 = (await mockLast()).count;
    await ask(p, 'Ile rat zostało mi na auto?', 1200); const n2 = (await mockLast()).count; const b2 = await lastTurn(p);
    ok('429: komunikat o limicie bezpłatnych zapytań, AI wstrzymane do podanej godziny, następne pytanie bez wysyłania (reguły)', /limit bezpłatnych zapytań/.test(a.bledy.join(' ')) && /wstrzymany do/.test(h.sub) && /nic nie jest wysyłane/.test(h.pasek) && n1 === n2 && !/wysłane do modelu/.test(b2.ja), { a, h, n1, n2 });
    const st = await status(8612);
    ok('429: serwer też pamięta przerwę (status pausedFor ≈ 42 s)', st.pausedFor > 30 && st.pausedFor <= 42, st);
    await p.close(); }

  // 8. Brak sieci po stronie serwera (Google nieosiągalne) i brak połączenia z serwerem po stronie przeglądarki.
  { const { p } = await open(8616);
    await ask(p, 'Ile rat zostało mi na auto?', 1800); const a = await lastTurn(p);
    ok('brak sieci (serwer nie łączy się z Google): komunikat i odpowiedź z reguł', /nie połączył się z modelem AI \(brak sieci\)/.test(a.bledy.join(' ')) && /Nie wiem, ile rat Ci zostało/.test(a.boty.join(' ')), a);
    await p.close(); }
  { const { p } = await open(8611);
    await p.route('**/api/assistant/answer', (r) => r.abort('internetdisconnected'));
    await ask(p, 'Ile rat zostało mi na auto?', 1500); const a = await lastTurn(p);
    ok('przeglądarka bez połączenia z serwerem: komunikat i odpowiedź z reguł', /Brak połączenia z serwerem prototypu/.test(a.bledy.join(' ')) && /Nie wiem, ile rat Ci zostało/.test(a.boty.join(' ')), a);
    await p.close(); }

  // 9. Bez klucza / zły klucz / brak modelu: tryb regułowy od początku, jasny powód, żadnego zapytania o odpowiedź.
  for (const [port, why] of [[8613, 'serwer nie ma klucza API'], [8614, 'serwer odrzucił klucz API'], [8615, 'model jest niedostępny']]) {
    const { p, api, errs } = await open(port); const h = await head(p); const intro = await p.$$eval('#chat-log .msg.bot', (m) => m.map((x) => x.textContent).join(' | '));
    await ask(p, 'Ile rat zostało mi na auto?', 1000); const a = await lastTurn(p);
    ok(port + ': tryb regułowy, nagłówek „AI niedostępne: ' + why + '”, pasek „nic nie jest wysyłane”, odpowiedź z reguł, bez POST /answer',
      new RegExp('AI niedostępne: ' + why).test(h.sub) && /nic nie jest wysyłane/.test(h.pasek) && !/pytania trafiają/.test(h.pasek) && new RegExp('Tryb AI jest niedostępny: ' + why).test(intro) && !api.some((x) => x.startsWith('POST')) && /Nie wiem, ile rat Ci zostało/.test(a.boty.join(' ')) && !errs.length, { h, api, errs });
    await p.close(); }

  // 10. Region niedostępny (400 FAILED_PRECONDITION): tryb AI wyłącza się z jasnym powodem.
  { const { p } = await open(8612);
    await p.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} });
    const st = await status(8612);
    if (st.pausedFor > 0) await sleep(st.pausedFor * 1000 + 500);
    await p.reload(); await p.waitForSelector('#entry:not([hidden])'); await p.click('[data-act=entry-demo]'); await p.click('[data-act=enter]'); await p.waitForTimeout(600); await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(800);
    await ask(p, '#region', 1500); const a = await lastTurn(p); const h = await head(p);
    ok('region niedostępny: komunikat „niedostępny w tym regionie”, reguły, status serwera rules/region', /niedostępny w tym regionie/.test(a.bledy.join(' ')) && /AI niedostępne: model jest niedostępny w tym regionie/.test(h.sub) && (await status(8612)).reason === 'region', { a, h });
    await p.close(); }

  // 11. Plik statyczny (bez serwera AI): żadnych zapytań /api, „Gotowe reguły prototypu, nie AI”.
  { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const api = []; p.on('request', (r) => { if (r.url().includes('/api/')) api.push(r.url()); });
    await p.goto('http://127.0.0.1:' + STATIC + '/index.html'); await p.waitForSelector('#entry:not([hidden])'); await p.click('[data-act=entry-demo]'); await p.click('[data-act=enter]'); await p.waitForTimeout(600); await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(700);
    await ask(p, 'Ile rat zostało mi na auto?', 1000); const h = await head(p);
    ok('plik statyczny: tryb regułowy bez przełącznika, żadnych zapytań /api, pasek „nic nie jest wysyłane”', h.sub === 'Gotowe reguły prototypu, nie AI' && h.przelacznik === null && !api.length && /nic nie jest wysyłane/.test(h.pasek), { h, api });
    await p.close(); }
  await b.close();

  // 12. Klucz nigdzie poza nagłówkiem do „Google”: HTML, odpowiedzi API, logi serwera, pliki projektu.
  const files = []; const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const f = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|\.git$|zrzuty|nagrania|shots|testy/.test(f)) walk(f); /* testy zawierają celowo fałszywy klucz atrapy */ } else if (/\.(js|mjs|html|css|md|json|txt|example)$|\.env/.test(e.name)) files.push(f); });
  walk(ROOT);
  const inFiles = files.filter((f) => fs.readFileSync(f, 'utf8').includes(KEY));
  const inLogs = Object.keys(logs).filter((k) => logs[k].includes(KEY) || logs[k].includes('zly-klucz-testowy'));
  const inResponses = seen.filter((t) => t.includes(KEY)).length;
  const m = await mockLast();
  ok('klucz testowy: ani w plikach projektu (' + files.length + '), ani w logach serwera, ani w ' + seen.length + ' odpowiedziach widzianych przez przeglądarkę; atrapa dostała go w nagłówku', !inFiles.length && !inLogs.length && !inResponses && m.keySeen > 0, { inFiles, inLogs, inResponses, keySeen: m.keySeen });
  ok('logi serwera bez treści pytań', !Object.values(logs).some((l) => /Ile rat|raty\?|zmyśl/.test(l)), Object.fromEntries(Object.entries(logs).map(([k, v]) => [k, v.split('\n').slice(0, 6).join(' / ')])));

  procs.forEach((p) => p.kill());
  R.forEach((r) => console.log((r.ok ? '✓ ' : '✗ ') + r.co + (r.ok ? '' : '\n    ' + JSON.stringify(r.sz).slice(0, 900))));
  console.log('RAZEM', R.length, '| nieudane', R.filter((r) => !r.ok).length);
})().catch((e) => { console.error(e); procs.forEach((p) => p.kill()); process.exit(1); });
