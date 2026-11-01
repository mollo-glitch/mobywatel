// Zmiana nazwy i usunięcie znaku tylko w src/marka.js. uruchom-testy.sh buduje kopię projektu z nazwą „Kartka”,
// bez hasła i z postac: false, serwuje ją na podanym porcie i uruchamia ten test.
// argv: [2] port kopii
const L = require('./lib.js'); L.BASE = 'http://127.0.0.1:' + (process.argv[2] || '8628');
const R = []; const ok = (co, w, sz) => R.push({ co, ok: !!w, sz });
const bezZnaku = () => document.querySelectorAll('svg.postac').length === 0;
(async () => {
  const { b, p, log } = await L.open({ w: 390 }); await L.enter(p);
  const start = await p.evaluate(() => ({ etykieta: document.querySelector('.ask-one').getAttribute('aria-label'), ikona: !!document.querySelector('.ask-one-ic svg') }));
  ok('Start: etykieta pola z nową nazwą', start.etykieta === 'Zapytaj Kartkę: co chcesz załatwić?', start.etykieta);
  ok('Start: zamiast znaku zwykła ikona', start.ikona && await p.evaluate(bezZnaku));
  await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(1000);
  const chat = await p.evaluate(() => ({ h1: document.querySelector('#chat-h').textContent, log: document.querySelector('#chat-log').getAttribute('aria-label'), powitanie: document.querySelector('#chat-log .msg.bot').textContent, ikona: !!document.querySelector('.chat-head svg') }));
  ok('Rozmowa: nagłówek „Zapytaj Kartkę”', chat.h1 === 'Zapytaj Kartkę', chat.h1);
  ok('Rozmowa: etykieta dziennika „Rozmowa z Kartką”', chat.log === 'Rozmowa z Kartką', chat.log);
  ok('Rozmowa: powitanie z nową nazwą i bez hasła', /tu Kartka, przewodnik/.test(chat.powitanie) && !/Spinam/.test(chat.powitanie), chat.powitanie.slice(0, 90));
  ok('Rozmowa: zamiast znaku zwykła ikona', chat.ikona && await p.evaluate(bezZnaku));
  const guide = await p.evaluate(() => { const g = document.querySelector('#guide-content'); return g ? (g.textContent.replace(/\s+/g, ' ').match(/Kartka/g) || []).length : -1; });
  ok('Opis koncepcji: nazwa z src/marka.js (3 miejsca)', guide === 3, guide);
  await p.evaluate(() => APP.nav('letter', { id: 'us' })); await p.waitForTimeout(800);
  const pismo = await p.evaluate(() => { const x = [...document.querySelectorAll('button')].find((e) => /Odpowiedz z pomocą/.test(e.textContent)); return x ? x.textContent.trim() : 'brak przycisku'; });
  ok('Pismo: „Odpowiedz z pomocą Kartki”', pismo === 'Odpowiedz z pomocą Kartki', pismo);
  // Treść i atrybuty poza <script>: komentarze w src/marka.js podają formy odmiany z przykładami i przy prawdziwej
  // zmianie nazwy poprawia się je razem z wartościami; ta kopia zmienia tylko wartości.
  const html = await p.evaluate(() => { const d = document.documentElement.cloneNode(true); d.querySelectorAll('script').forEach((s) => s.remove()); return d.outerHTML; });
  ok('Poza skryptami nigdzie w dokumencie nie ma „Spink”', !/Spink/.test(html));
  await b.close();
  const o2 = await L.open({ w: 390 }); const p2 = o2.p; await p2.goto(L.BASE + '/index.html#dane'); await p2.waitForTimeout(5500);
  for (const t of ['Bank Przykładowy', 'Cofnij dostęp']) { await p2.click('.chat-log button:has-text("' + t + '")'); await p2.waitForTimeout(1500); }
  await p2.evaluate(() => { const x = [...document.querySelectorAll('.chat-log button')].filter((e) => /Potwierdź/.test(e.textContent)).pop(); x.click(); }); await p2.waitForTimeout(1800);
  const done = await p2.evaluate(() => ({ gotowe: !!document.querySelector('#main .done-ic'), ikona: !!document.querySelector('.done-ic svg') }));
  ok('Gotowe: zamiast znaku ptaszek', done.gotowe && done.ikona && await p2.evaluate(bezZnaku), done);
  const bledy = log.strona.concat(log.konsola, o2.log.strona, o2.log.konsola);
  ok('Brak błędów strony i konsoli', bledy.length === 0, bledy);
  await o2.b.close();
  for (const r of R) console.log((r.ok ? '✓ ' : '✗ ') + r.co + (r.ok ? '' : '  ' + JSON.stringify(r.sz)));
  console.log('RAZEM ' + R.length + ' | nieudane ' + R.filter((r) => !r.ok).length);
})();
