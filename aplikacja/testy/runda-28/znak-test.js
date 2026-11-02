// Runda 28 (kopia testu znaku z rundy 27 po zmianie asystenta: bez reguł udających rozmowę). Znak i nazwa asystenta („Spinka”): gdzie jest znak, nazwa w interfejsie (z src/marka.js), hasło tylko w powitaniu,
// stany, spinka widoczna w każdym stanie i jedna odznaka, skończone animacje, ograniczony ruch, kontrast, brak „Pola”.
// argv: [2] port aplikacji (tryb AI testuje ai-test.js)
const L = require('../runda-27/lib.js'); L.BASE = 'http://127.0.0.1:' + (process.argv[2] || '8200');
const R = []; const ok = (co, w, sz) => R.push({ co, ok: !!w, sz });
(async () => {
  { const { b, p, log } = await L.open({ w: 390 }); await L.enter(p);
    const where = async () => p.evaluate(() => Array.from(document.querySelectorAll('svg.postac')).filter((s) => s.getBoundingClientRect().width > 0).map((s) => s.closest('.ask-one') ? 'pole Start' : s.closest('.chat-head') ? 'nagłówek rozmowy' : s.closest('.done-ic') ? 'Gotowe' : 'INNE: ' + (s.parentElement.className || '')));
    const seen = {}; seen.start = await where();
    const etykietaStartu = await p.evaluate(() => { const a = document.querySelector('.ask-one'); return a ? a.getAttribute('aria-label') : null; });
    for (const t of ['docs', 'cases', 'more']) { await p.click('.tabbar [data-tab=' + t + ']'); await p.waitForTimeout(500); seen[t] = await where(); }
    await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(900); seen.chat = await where();
    ok('znak tylko w polu na Starcie i w nagłówku rozmowy (Dokumenty, Sprawy, Profil bez znaku)', JSON.stringify(seen.start) === '["pole Start"]' && !seen.docs.length && !seen.cases.length && !seen.more.length && JSON.stringify(seen.chat) === '["nagłówek rozmowy"]', seen);
    const st = () => p.evaluate(() => document.querySelector('.chat-head svg.postac').getAttribute('data-state'));
    const sub = await p.evaluate(() => { const bar = document.querySelector('.proto-bar'); const r = bar.getBoundingClientRect(); return { h1: document.querySelector('#chat-h').textContent, sub: document.querySelector('#chat-sub').textContent, wNaglowku: !!document.querySelector('.chat-head #chat-sub'), opis: document.querySelector('.screen.chat').getAttribute('aria-describedby'), pasek: bar.textContent.trim(), pasekWidoczny: r.height > 0 && r.top >= 0 && r.bottom <= innerHeight, intro: document.querySelector('#chat-log').innerText }; });
    ok('ekran rozmowy bez serwera: pod imieniem „Model AI niepodłączony · scenariusze demonstracyjne”, pasek „dane fikcyjne · nic nie jest wysyłane”, powitanie mówi, że dane są fikcyjne, AI nie jest podłączone i nic nie jest wysyłane', sub.h1 === 'Zapytaj ' + (await p.evaluate(() => APP.marka.biernik)) && /Model AI niepodłączony/.test(sub.sub) && sub.wNaglowku && sub.opis === 'chat-sub' && sub.pasekWidoczny && /dane fikcyjne/.test(sub.pasek) && /nic nie jest wysyłane/.test(sub.pasek) && /model AI nie jest podłączony/.test(sub.intro) && /Dane są fikcyjne/.test(sub.intro) && /nic nie wysyłam/.test(sub.intro), sub);
    const s0 = await st(); await p.fill('#chat-input', 'Kiedy kończy się mój paszport?'); const s1 = await st(); await p.keyboard.press('Enter'); await p.waitForTimeout(2200); const s2 = await st();
    await p.fill('#chat-input', 'Kończy mi się OC'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    await p.click('.chat-log .quick .chip:has-text("Zacznij: Koniec polisy OC")'); await p.waitForTimeout(2200); const s3 = await st();
    for (const t of ['Co mogę zrobić?', 'Zostaję w obecnym', 'Tak, przypomnij']) { await p.click('.chat-log button:has-text("' + t + '")'); await p.waitForTimeout(1800); }
    const s4 = await p.evaluate(() => { const last = Array.from(document.querySelectorAll('#chat-log .st-ok')).pop(); return { stan: document.querySelector('.chat-head svg.postac').getAttribute('data-state'), ustawione: last && last.textContent.trim().slice(0, 60) }; });
    ok('stany w rozmowie: słucha (wejście, pisanie) → ostrzega (AI niepodłączone) → następny krok (pytanie w scenariuszu) → gotowe (przypomnienie ustawione)', s0 === 'slucha' && s1 === 'slucha' && s2 === 'ostrzega' && s3 === 'krok' && s4.stan === 'gotowe', { s0, s1, s2, s3, s4 });
    const anim = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = APP.postac(40, 'slucha') + APP.postac(40, 'gotowe') + APP.postac(40, 'wyjasnia'); document.body.appendChild(d); const v = d.querySelectorAll('svg');
      const g = (i, s) => getComputedStyle(v[i].querySelector(s)); const r = { fale: g(0, '.postac-b-slucha path').animationIterationCount, zatrzask: g(1, '.postac-spinka').animationIterationCount, linie: g(2, '.postac-linie').animationIterationCount, nazwa: g(0, '.postac-b-slucha path').animationName }; d.remove(); return r; });
    ok('fale „słucha” pulsują 3 razy, zatrzask „gotowe” i wypisanie linii „wyjaśnia” raz: nic nie miga bez końca', (anim.fale === '3' && anim.zatrzask === '1' && anim.linie === '1') || anim.nazwa === 'none', anim);
    const shape = await p.evaluate(async () => { const S = ['slucha', 'wyjasnia', 'ostrzega', 'krok', 'gotowe']; const d = document.createElement('div'); d.innerHTML = S.map((s) => APP.postac(44, s)).join(''); document.body.appendChild(d);
      await new Promise((r) => setTimeout(r, 450)); const svgs = [...d.querySelectorAll('svg')];
      const r = svgs.map((sv, i) => ({ stan: S[i], spinka: getComputedStyle(sv.querySelector('.postac-spinka')).opacity, kolorSpinki: getComputedStyle(sv.querySelector('.postac-spinka-ksztalt')).fill, odznaki: [...sv.querySelectorAll('.postac-b')].filter((g) => +getComputedStyle(g).opacity > 0.9).map((g) => g.getAttribute('class').replace('postac-b postac-b-', '')), obrys: getComputedStyle(sv.querySelector('.postac-kartka')).stroke, twarz: !!sv.querySelector('ellipse, [class*="oczy"], [class*="eyes"]') }));
      d.remove(); return r; });
    ok('każdy stan: czerwona spinka widoczna, dokładnie jedna odznaka i to właściwa; obrys kartki --muted (7:1); bez twarzy', shape.every((x) => x.spinka === '1' && x.kolorSpinki === 'rgb(200, 16, 46)' && x.odznaki.length === 1 && x.odznaki[0] === x.stan && x.obrys === 'rgb(79, 88, 108)' && !x.twarz), shape);
    // Nazwa: wszystkie miejsca z src/marka.js, hasło tylko w powitaniu, żadnej „Poli” w interfejsie.
    const nazwa = Object.assign({ etykietaStart: etykietaStartu }, await p.evaluate(() => { const M = APP.marka; const ask = document.querySelector('.ask-one'); const bots = [...document.querySelectorAll('#chat-log .msg.bot')].map((m) => m.textContent);
      return { M: M.imie, log: document.querySelector('#chat-log').getAttribute('aria-label'), powitanie: bots[0], hasloWPowitaniu: bots[0].includes(M.haslo), hasloIle: bots.filter((t) => t.includes(M.haslo)).length,
        przewodnik: (document.querySelector('#guide-content') || document.body).textContent.includes(M.imie + ', asystent spraw'),
        pola: /\bPol[aęąi]\b|Polę|Polą/.test(document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ')) }; }));
    ok('nazwa w interfejsie z src/marka.js: pole na Starcie, nagłówek, rozmowa, powitanie z hasłem (raz), opis koncepcji; nigdzie „Pola”',
      nazwa.M === 'Spinka' && nazwa.etykietaStart === 'Zapytaj Spinkę: co chcesz załatwić?' && nazwa.log === 'Rozmowa ze Spinką' && /^Dzień dobry, tu Spinka\. Spinam sprawy, nie Ciebie\./.test(nazwa.powitanie) && nazwa.hasloIle === 1 && nazwa.przewodnik && !nazwa.pola, nazwa);
    ok('znak ukryty przed czytnikiem (aria-hidden), bez błędów strony', await p.evaluate(() => Array.from(document.querySelectorAll('svg.postac')).every((s) => s.getAttribute('aria-hidden') === 'true')) && !log.strona.length && !log.konsola.length, log);
    await b.close(); }
  { const { b, p } = await L.open({ w: 390, rm: true }); await L.enter(p); await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const g = (s) => getComputedStyle(document.querySelector('.chat-head svg.postac ' + s)); return { przejscie: g('.postac-spinka').transitionDuration, fale: g('.postac-b-slucha path').animationName, spinka: g('.postac-spinka').animationName }; });
    ok('ograniczony ruch: stany bez przejść, bez pulsowania i bez zatrzasku', /^0s/.test(r.przejscie) && r.fale === 'none' && r.spinka === 'none', r); await b.close(); }
  { const { b, p } = await L.open({ w: 390 }); await p.goto(L.BASE + '/index.html#dane'); await p.waitForTimeout(5500);
    for (const t of ['Bank Przykładowy', 'Cofnij dostęp']) { await p.click('.chat-log button:has-text("' + t + '")'); await p.waitForTimeout(1800); }
    const s = await p.evaluate(() => document.querySelector('.chat-head svg.postac').getAttribute('data-state'));
    await p.evaluate(() => { const b = Array.from(document.querySelectorAll('.chat-log button')).filter((x) => /Potwierdź/.test(x.textContent)).pop(); b.click(); }); await p.waitForTimeout(2000);
    const done = await p.evaluate(() => { const s = document.querySelector('.done-ic svg.postac'); return { ekran: document.querySelector('#main > .screen').className, stan: s && s.getAttribute('data-state'), haslo: document.querySelector('#main').textContent.includes(APP.marka.haslo) }; });
    ok('podsumowanie przed potwierdzeniem: ostrzega; ekran „Gotowe”: znak z ptaszkiem, bez hasła', s === 'ostrzega' && /done/.test(done.ekran) && done.stan === 'gotowe' && !done.haslo, { s, done }); await b.close(); }
  { const { chromium } = require('playwright'); const b = await chromium.launch(); const h = {};
    for (const [w, ht] of [[320, 568], [360, 640], [390, 844]]) { const p = await b.newPage({ viewport: { width: w, height: ht } }); await p.goto(L.BASE + '/index.html'); await p.waitForSelector('#entry:not([hidden])'); await p.click('[data-act=entry-demo]'); await p.click('[data-act=enter]'); await p.waitForTimeout(1000); await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(700);
      h[w] = await p.evaluate(() => Math.round(document.querySelector('#chat-scroll').getBoundingClientRect().height)); await p.close(); }
    ok('wysokość rozmowy co najmniej taka jak w rundzie 24 (320×568: 268, 360×640: 340, 390×844: 544)', h[320] >= 268 && h[360] >= 340 && h[390] >= 544, h); await b.close(); }
  R.forEach((r) => console.log((r.ok ? '✓ ' : '✗ ') + r.co + (r.ok ? '' : '\n    ' + JSON.stringify(r.sz).slice(0, 500))));
  console.log('RAZEM', R.length, '| nieudane', R.filter((r) => !r.ok).length);
})();
