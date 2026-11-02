// Runda 29: asystent w przeglądarce z serwerem lokalnym ustawionym na Cloudflare Workers AI, ale z ATRAPĄ modelu
// (runda-29/atrapa-modelu.mjs). Sprawdza interfejs, zgodę, dane wysyłane z przeglądarki, podgląd w Profilu,
// komunikaty o długości pytania i o wyczerpanej puli. To NIE jest test prawdziwego modelu.
//   node asystent-workers-test.js <port serwera z Workers AI (atrapa)> <port atrapy>
const { chromium } = require('playwright');
const [, , PA, PM] = process.argv;
const R = []; const ok = (co, w, sz) => { R.push({ co, ok: !!w }); console.log((w ? '✓ ' : '✗ ') + co + (sz ? ' | ' + (typeof sz === 'string' ? sz : JSON.stringify(sz)) : '')); };
const MOCK = 'http://127.0.0.1:' + PM;
(async () => {
  await fetch(MOCK + '/__reset', { method: 'POST' });
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  const sent = [];
  p.on('request', (r) => { if (/\/api\/assistant\/answer$/.test(r.url())) sent.push(r.postData() || ''); });
  await p.goto('http://127.0.0.1:' + PA + '/');
  await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 });
  await p.click('[data-act=entry-demo]'); await p.waitForTimeout(300); await p.click('[data-act=enter]'); await p.waitForTimeout(1000);
  await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(800);
  const sub = await p.textContent('#chat-sub');
  ok('nagłówek rozmowy: przełącznik „Model AI · z danych aplikacji”', /Model AI\s*· z danych aplikacji/.test(sub), sub);
  const zapytaj = async (q, ms) => { await p.fill('#chat-input', q); await p.keyboard.press('Enter'); await p.waitForTimeout(ms || 1600); };
  const log = async () => p.$$eval('#chat-log > *', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));

  await zapytaj('Kiedy kończy się moja polisa OC?', 600);
  const zg = await p.textContent('.icard.consent');
  ok('zgoda przed pierwszym wysłaniem: nazwa dostawcy, limit 300 znaków, zdanie o danych Cloudflare, czego nie wysyłamy', /Cloudflare Workers AI/.test(zg) && /300 znaków/.test(zg) && /nie używa tych treści do trenowania/.test(zg) && /PESEL/.test(zg), zg.slice(0, 160));
  ok('przed zgodą nic nie poszło do serwera', sent.length === 0);
  await p.click('.icard.consent [data-v=tak]'); await p.waitForTimeout(1800);
  let l = (await log()).join(' ');
  ok('odpowiedź: objaśnienie modelu + dane z aplikacji z datą 04.11.2026 i źródłem', /Objaśnienie modelu AI/.test(l) && /04\.11\.2026/.test(l) && /źródło: Kończy się OC/.test(l));
  const body = JSON.parse(sent[0] || '{}');
  ok('przeglądarka wysłała tylko pytanie i stan demonstracji (bez rekordów, bez osoby)', Object.keys(body).sort().join(',') === 'pytanie,stan' && !/Kowalczyk|85031412345|WX.?12345|zrodla|fakty/.test(sent[0]), sent[0].length + ' B: ' + sent[0].slice(0, 140));
  const last = (await (await fetch(MOCK + '/__last')).json()).last;
  const pv = await p.evaluate(() => window.APP.chat.ai.context());
  ok('podgląd w Profilu = kontekst, który serwer wysłał do modelu (te same id i fakty)', JSON.stringify(pv) === JSON.stringify(last.payload.kontekst), pv.zrodla.length + ' pozycji');

  await zapytaj('Ile mam czasu na odpowiedź?', 1800);
  l = (await log()).join(' ');
  ok('„Ile mam czasu na odpowiedź?” → 07.11.2026 ze źródłem pisma', /07\.11\.2026/.test(l) && /Wezwanie do złożenia wyjaśnień/.test(l));

  const ile = (await (await fetch(MOCK + '/__last')).json()).count;
  const dlugie = 'Czy możesz mi wyjaśnić '.padEnd(301, 'a');
  await zapytaj(dlugie, 900);
  l = await log();
  const ile2 = (await (await fetch(MOCK + '/__last')).json()).count;
  ok('pytanie dłuższe niż 300 znaków: jasny komunikat, nic nie wysłane do modelu', /ma 301 znaków, a model przyjmuje najwyżej 300/.test(l.join(' ')) && ile2 === ile, l[l.length - 1]);

  await p.click('.tabbar [data-tab=more]'); await p.waitForTimeout(800);
  const st = await p.textContent('[data-ai-status]');
  const prof = await p.textContent('.me-preview');
  ok('Profil: status „Cloudflare Workers AI, model gemma-4-26b-a4b-it”; podgląd mówi, że listę składa serwer', /Cloudflare Workers AI, model gemma-4-26b-a4b-it/.test(st) && /składa serwer projektu/.test(prof) && /300 znaków/.test(prof), st);
  await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(600);

  // Na końcu, bo serwer wstrzymuje AI do 00:00 UTC.
  await zapytaj('Kiedy kończy się polisa? #limit-dzienny', 1800);
  l = await log();
  ok('wyczerpana dzienna pula: „AI niedostępne… Do HH:MM nie wysyłam pytań”, bez gotowej odpowiedzi', /AI niedostępne: wyczerpała się dzienna bezpłatna pula modelu \(Cloudflare Workers AI\)\. Do \d\d:\d\d nie wysyłam pytań\. Nie zastępuję tej odpowiedzi gotowym tekstem/.test(l.join(' ')), l.slice(-2));
  const przed = (await (await fetch(MOCK + '/__last')).json()).count;
  await zapytaj('Kiedy kończy się moja polisa OC?', 1200);
  l = await log();
  ok('następne pytanie w przerwie: „Nie wysłałem tego pytania” i scenariusz bez AI; model nie dostał pytania', /Nie wysłałem tego pytania do modelu AI \(model AI jest wstrzymany do \d\d:\d\d \(wyczerpana dzienna pula modelu\)\)/.test(l.join(' ')) && (await (await fetch(MOCK + '/__last')).json()).count === przed, l.slice(-2));
  const sub2 = await p.textContent('#chat-sub');
  ok('nagłówek w przerwie: „wstrzymany do HH:MM”', /wstrzymany do \d\d:\d\d/.test(sub2), sub2);
  await p.screenshot({ path: process.env.ZRZUT || '/dev/null' }).catch(() => {});
  await b.close();
  const zle = R.filter((x) => !x.ok).length; console.log('RAZEM ' + R.length + ' | nieudane ' + zle); process.exit(zle ? 1 : 0);
})();
