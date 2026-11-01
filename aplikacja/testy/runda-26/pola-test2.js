// Pola (runda 26): gdzie występuje, stany, sylwetka (zakładka zawsze widoczna, jedna odznaka stanu), skończone animacje,
// ograniczony ruch, kontrast obrysu, ujawnienie w pliku statycznym. argv: [2] port aplikacji (tryb AI testuje ai-test.js)
const L = require('./lib.js'); L.BASE = 'http://127.0.0.1:' + (process.argv[2] || '8200');
const R = []; const ok = (co, w, sz) => R.push({ co, ok: !!w, sz });
(async () => {
  { const { b, p, log } = await L.open({ w: 390 }); await L.enter(p);
    const where = async () => p.evaluate(() => Array.from(document.querySelectorAll('svg.pola')).filter((s) => s.getBoundingClientRect().width > 0).map((s) => s.closest('.ask-one') ? 'pole Start' : s.closest('.chat-head') ? 'nagłówek rozmowy' : s.closest('.done-ic') ? 'Gotowe' : 'INNE: ' + (s.parentElement.className || '')));
    const seen = {}; seen.start = await where();
    for (const t of ['docs', 'cases', 'more']) { await p.click('.tabbar [data-tab=' + t + ']'); await p.waitForTimeout(500); seen[t] = await where(); }
    await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(900); seen.chat = await where();
    ok('Pola tylko w polu na Starcie i w nagłówku rozmowy (Dokumenty, Sprawy, Profil bez postaci)', JSON.stringify(seen.start) === '["pole Start"]' && !seen.docs.length && !seen.cases.length && !seen.more.length && JSON.stringify(seen.chat) === '["nagłówek rozmowy"]', seen);
    const st = () => p.evaluate(() => document.querySelector('.chat-head svg.pola').getAttribute('data-state'));
    const sub = await p.evaluate(() => { const bar = document.querySelector('.proto-bar'); const r = bar.getBoundingClientRect(); return { h1: document.querySelector('#chat-h').textContent, sub: document.querySelector('#chat-sub').textContent, wNaglowku: !!document.querySelector('.chat-head #chat-sub'), opis: document.querySelector('.screen.chat').getAttribute('aria-describedby'), pasek: bar.textContent.trim(), pasekWidoczny: r.height > 0 && r.top >= 0 && r.bottom <= innerHeight, intro: document.querySelector('#chat-log').innerText }; });
    ok('ekran rozmowy: pod imieniem „Gotowe reguły prototypu, nie AI”, pasek nad ekranem „dane fikcyjne · nic nie jest wysyłane”, powitanie mówi oba fakty pełnymi zdaniami', sub.h1 === 'Zapytaj Polę' && /nie AI/.test(sub.sub) && sub.wNaglowku && sub.opis === 'chat-sub' && sub.pasekWidoczny && /dane fikcyjne/.test(sub.pasek) && /nic nie jest wysyłane/.test(sub.pasek) && /Nie jestem działającą sztuczną inteligencją/.test(sub.intro) && /Dane są fikcyjne i nic nie jest wysyłane/.test(sub.intro), sub);
    const s0 = await st(); await p.fill('#chat-input', 'Kiedy kończy się mój paszport?'); const s1 = await st(); await p.keyboard.press('Enter'); await p.waitForTimeout(2200); const s2 = await st();
    await p.fill('#chat-input', 'Kończy mi się OC'); await p.keyboard.press('Enter'); await p.waitForTimeout(2200); const s3 = await st();
    for (const t of ['Co mogę zrobić?', 'Zostaję w obecnym', 'Tak, przypomnij']) { await p.click('.chat-log button:has-text("' + t + '")'); await p.waitForTimeout(1800); }
    const s4 = await p.evaluate(() => { const last = Array.from(document.querySelectorAll('#chat-log .st-ok')).pop(); return { stan: document.querySelector('.chat-head svg.pola').getAttribute('data-state'), ustawione: last && last.textContent.trim().slice(0, 60) }; });
    ok('stany w rozmowie: słucha (wejście, pisanie) → wyjaśnia (odpowiedź) → następny krok (pytanie) → gotowe (przypomnienie ustawione)', s0 === 'slucha' && s1 === 'slucha' && s2 === 'wyjasnia' && s3 === 'krok' && s4.stan === 'gotowe', { s0, s1, s2, s3, s4 });
    const anim = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = APP.pola(40, 'slucha'); document.body.appendChild(d); const w = getComputedStyle(d.querySelector('.pola-b-slucha path')); const e = getComputedStyle(d.querySelector('.pola-eyes')); const r = { fale: w.animationIterationCount, nazwa: w.animationName, mrugniecie: e.animationIterationCount, mrugNazwa: e.animationName }; d.remove(); return r; });
    ok('fale „słucha” pulsują 3 razy, oczy mrugają raz: nic nie miga bez końca', (anim.fale === '3' && anim.mrugniecie === '1') || anim.nazwa === 'none', anim);
    const shape = await p.evaluate(async () => { const S = ['slucha', 'wyjasnia', 'ostrzega', 'krok', 'gotowe']; const d = document.createElement('div'); d.innerHTML = S.map((s) => APP.pola(44, s)).join(''); document.body.appendChild(d);
      await new Promise((r) => setTimeout(r, 450)); const svgs = [...d.querySelectorAll('svg')];
      const r = svgs.map((sv, i) => ({ stan: S[i], zakladka: getComputedStyle(sv.querySelector('.pola-tab')).opacity, odznaki: [...sv.querySelectorAll('.pola-b')].filter((g) => +getComputedStyle(g).opacity > 0.9).map((g) => g.getAttribute('class').replace('pola-b pola-b-', '')), obrys: getComputedStyle(sv.querySelector('.pola-sheet')).stroke }));
      d.remove(); return r; });
    ok('każdy stan: czerwona zakładka widoczna, dokładnie jedna odznaka i to ta właściwa; obrys kartki --muted (7:1 do bieli)', shape.every((x) => x.zakladka === '1' && x.odznaki.length === 1 && x.odznaki[0] === x.stan && x.obrys === 'rgb(79, 88, 108)'), shape);
    ok('postać ukryta przed czytnikiem (aria-hidden), bez błędów strony', await p.evaluate(() => Array.from(document.querySelectorAll('svg.pola')).every((s) => s.getAttribute('aria-hidden') === 'true')) && !log.strona.length && !log.konsola.length, log);
    await b.close(); }
  { const { b, p } = await L.open({ w: 390, rm: true }); await L.enter(p); await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const g = (s) => getComputedStyle(document.querySelector('.chat-head svg.pola ' + s)); return { przejscie: g('.pola-tab').transitionDuration, fale: g('.pola-b-slucha path').animationName, oczy: g('.pola-eyes').animationName }; });
    ok('ograniczony ruch: stany bez przejść, bez pulsowania i bez mrugania', /^0s/.test(r.przejscie) && r.fale === 'none' && r.oczy === 'none', r); await b.close(); }
  { const { b, p } = await L.open({ w: 390 }); await p.goto(L.BASE + '/index.html#dane'); await p.waitForTimeout(5500);
    for (const t of ['Bank Przykładowy', 'Cofnij dostęp']) { await p.click('.chat-log button:has-text("' + t + '")'); await p.waitForTimeout(1800); }
    const s = await p.evaluate(() => document.querySelector('.chat-head svg.pola').getAttribute('data-state'));
    await p.evaluate(() => { const b = Array.from(document.querySelectorAll('.chat-log button')).filter((x) => /Potwierdź/.test(x.textContent)).pop(); b.click(); }); await p.waitForTimeout(2000);
    const done = await p.evaluate(() => { const s = document.querySelector('.done-ic svg.pola'); return { ekran: document.querySelector('#main > .screen').className, stan: s && s.getAttribute('data-state') }; });
    ok('podsumowanie przed potwierdzeniem: ostrzega; ekran „Gotowe”: Pola z ptaszkiem', s === 'ostrzega' && /done/.test(done.ekran) && done.stan === 'gotowe', { s, done }); await b.close(); }
  { const { chromium } = require('playwright'); const b = await chromium.launch(); const h = {};
    for (const [w, ht] of [[320, 568], [360, 640], [390, 844]]) { const p = await b.newPage({ viewport: { width: w, height: ht } }); await p.goto(L.BASE + '/index.html'); await p.waitForSelector('#entry:not([hidden])'); await p.click('[data-act=entry-demo]'); await p.click('[data-act=enter]'); await p.waitForTimeout(1000); await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(700);
      h[w] = await p.evaluate(() => Math.round(document.querySelector('#chat-scroll').getBoundingClientRect().height)); await p.close(); }
    ok('wysokość rozmowy co najmniej taka jak w rundzie 24 (320×568: 268, 360×640: 340, 390×844: 544)', h[320] >= 268 && h[360] >= 340 && h[390] >= 544, h); await b.close(); }
  R.forEach((r) => console.log((r.ok ? '✓ ' : '✗ ') + r.co + (r.ok ? '' : '\n    ' + JSON.stringify(r.sz).slice(0, 500))));
  console.log('RAZEM', R.length, '| nieudane', R.filter((r) => !r.ok).length);
})();
