// Runda 29: nowe otwarcie strony (nagłówek pisma, film bez kartki, spinka na torze, spis scen).
//   node testy/otwarcie-test.js <port strony z filmem> <port strony bez filmu>
const { chromium } = require('playwright');
const [, , P1, P2] = process.argv;
const A = 'http://127.0.0.1:' + P1; const B = 'http://127.0.0.1:' + P2;
const R = []; const ok = (co, w, sz) => { R.push({ co, ok: !!w }); console.log((w ? '✓ ' : '✗ ') + co + (sz !== undefined ? ' | ' + JSON.stringify(sz) : '')); };
(async () => {
  const b = await chromium.launch();
  { const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); await p.goto(A + '/'); await p.waitForTimeout(1200);
    const m = await p.evaluate(() => ({ heroArkusz: document.querySelectorAll('.hero .arkusz, .hero .klips').length, daneArkusz: document.querySelectorAll('#dane .arkusz').length, demoArkusz: document.querySelectorAll('#demonstracja .arkusz').length,
      glowa: (() => { const g = document.querySelector('.hero-glowa .pismo-glowa'); const r = g.getBoundingClientRect(); return { widoczna: getComputedStyle(g).display !== 'none' && r.bottom <= innerHeight, tekst: g.textContent.replace(/\s+/g, ' ').trim() }; })(),
      wTekscie: getComputedStyle(document.querySelector('.hero-tekst .pismo-glowa')).display }));
    ok('1440: otwarcie i sekcja „Twoje dane” bez przypiętej kartki; przypięte ekrany tylko w „Demonstracji” (3)', m.heroArkusz === 0 && m.daneArkusz === 0 && m.demoArkusz === 3, m);
    ok('1440: nagłówek pisma obok tytułu (data w prototypie, „W sprawie”), drugi egzemplarz ukryty', m.glowa.widoczna && /Data w prototypie\s*26 października 2026 r\.\s*W sprawie\s*asystenta spraw w koncepcji aplikacji mObywatel/.test(m.glowa.tekst) && m.wTekscie === 'none', m);
    const app = await c.newPage(); await app.goto(A + '/aplikacja/'); const etykieta = await app.evaluate(() => window.APP.demo.label); await app.close();
    ok('data w nagłówku pisma = data pokazu w aplikacji', etykieta.endsWith(m.glowa.tekst.match(/(\d+ \S+ \d{4})/)[1]), etykieta);
    await p.waitForFunction(() => document.getElementById('film').readyState >= 1);
    await p.click('.scena[data-t="19.3"]'); await p.waitForTimeout(900);
    let s = await p.evaluate(() => { const v = document.getElementById('film'); const sp = document.getElementById('postep-spinka'); const tor = sp.parentElement.getBoundingClientRect(); const r = sp.getBoundingClientRect();
      return { czas: v.currentTime, gra: !v.paused, biezaca: document.querySelector('.scena[aria-current="true"]') ? document.querySelector('.scena[aria-current="true"]').dataset.t : null, spinka: (r.left + r.width / 2 - tor.left) / tor.width, postep: v.currentTime / v.duration }; });
    ok('scena „Zapytaj Spinkę” (0:19): film przewinięty i gra, scena oznaczona jako bieżąca', s.czas >= 19.3 && s.czas < 21.5 && s.gra && s.biezaca === '19.3', s);
    ok('spinka na torze stoi tam, gdzie film (±2%)', Math.abs(s.spinka - s.postep) < 0.02, s);
    await p.evaluate(() => document.getElementById('film').pause());
    await p.focus('.scena[data-t="24.2"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
    s = await p.evaluate(() => { const v = document.getElementById('film'); const f = document.activeElement; return { czas: v.currentTime, fokus: f.dataset.t, obrys: getComputedStyle(f).outlineStyle + ' ' + getComputedStyle(f).outlineWidth, biezaca: document.querySelector('.scena[aria-current="true"]').dataset.t }; });
    ok('klawiatura: Enter na scenie „Decyzja jest Twoja” przewija film, fokus zostaje na przycisku z widocznym obrysem', s.czas >= 24.2 && s.czas < 26.5 && s.fokus === '24.2' && /solid 3px/.test(s.obrys) && s.biezaca === '24.2', s);
    const male = await p.evaluate(() => [...document.querySelectorAll('.scena')].map((x) => Math.round(x.getBoundingClientRect().height)).filter((h) => h < 44));
    ok('sceny: cele dotyku co najmniej 44 px', male.length === 0, male);
    await c.close(); }
  { const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await c.newPage(); await p.goto(A + '/'); await p.waitForTimeout(1200);
    const m = await p.evaluate(() => ({ glowaGora: getComputedStyle(document.querySelector('.hero-glowa .pismo-glowa')).display, glowaNizej: getComputedStyle(document.querySelector('.hero-tekst .pismo-glowa')).display,
      kolejnosc: ['#film', '#otworz-demo', '.skroty', 'main .autor', '.hero-opis', '.hero-tekst .pismo-glowa', '#sceny'].map((q) => Math.round(document.querySelector(q).getBoundingClientRect().top)), bok: document.documentElement.scrollWidth - innerWidth }));
    ok('390: tytuł, film, „Otwórz demo”, skróty, podpis, opis, nagłówek pisma, sceny — po kolei; nic nie wystaje w bok', m.glowaGora === 'none' && m.glowaNizej !== 'none' && m.kolejnosc.every((y, i, a) => !i || y > a[i - 1]) && m.bok === 0, m);
    await c.close(); }
  { const c = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await c.newPage(); await p.goto(B + '/'); await p.waitForTimeout(1500);
    const m = await p.evaluate(() => ({ sceny: document.getElementById('sceny').hidden, film: document.getElementById('film-blok').hidden, koniec: !document.getElementById('koniec').hidden }));
    ok('bez filmu: sceny ukryte razem z filmem, zamiast nich komunikat i przejście do demonstracji', m.sceny && m.film && m.koniec, m);
    await c.close(); }
  await b.close();
  const zle = R.filter((x) => !x.ok).length; console.log('RAZEM ' + R.length + ' | nieudane ' + zle); process.exit(zle ? 1 : 0);
})();
