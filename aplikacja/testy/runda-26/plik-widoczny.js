// Regresja 5b: komunikat o złym pliku i podgląd dobrego pliku są widoczne nad polem rozmowy (320 i 390 px).
const L = require('./lib.js'); L.BASE = 'http://127.0.0.1:' + (process.argv[2] || '8200');
(async () => { for (const W of [320, 390]) { const { b, p } = await L.open({ w: W }); await p.goto(L.BASE + '/index.html#dowod'); await p.waitForTimeout(5500);
  await p.click('button:has-text("Dane są poprawne")'); await p.waitForTimeout(1500);
  const seen = (sel) => p.evaluate((sel) => { const e = Array.from(document.querySelectorAll(sel)).pop(); if (!e) return 'brak'; const r = e.getBoundingClientRect(); const box = document.querySelector('.chat-scroll').getBoundingClientRect(); return r.top >= box.top - 1 && r.bottom <= box.bottom + 1 ? 'widoczny' : 'poza widokiem (' + Math.round(r.bottom) + ' > ' + Math.round(box.bottom) + ')'; }, sel);
  await p.setInputFiles('.chat-log input[type=file]', 'nie-obraz.txt'); await p.waitForTimeout(900); const e = await seen('.file-err');
  await p.screenshot({ path: 'r25-5b-blad-widoczny-' + W + '.png' });
  await p.setInputFiles('.chat-log input[type=file]', 'zdjecie-testowe.jpg'); await p.waitForTimeout(900); const ok = await seen('.file-preview [data-ok]');
  console.log(W + ' px | komunikat o złym pliku: ' + e + ' | przycisk „Użyj tego pliku”: ' + ok); await b.close(); } })();
