// Runda 29/30: otwarcie strony (plansza z hasłem i płynącymi słowami, film bez kartki, spinka na torze, spis scen) i hasło Spinki w stopce.
//   node testy/otwarcie-test.js <port strony z filmem> <port strony bez filmu>
const { chromium } = require('playwright');
const [, , P1, P2] = process.argv;
const A = 'http://127.0.0.1:' + P1; const B = 'http://127.0.0.1:' + P2;
const R = []; const ok = (co, w, sz) => { R.push({ co, ok: !!w }); console.log((w ? '✓ ' : '✗ ') + co + (sz !== undefined ? ' | ' + JSON.stringify(sz) : '')); };
(async () => {
  const b = await chromium.launch();
  { const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); await p.goto(A + '/'); await p.waitForTimeout(1200);
    const m = await p.evaluate(() => ({ heroArkusz: document.querySelectorAll('.hero .arkusz, .hero .klips').length, daneArkusz: document.querySelectorAll('#dane .arkusz').length, demoArkusz: document.querySelectorAll('#demonstracja .arkusz').length,
      glowa: (() => { const g = document.querySelector('.hero-tekst .pismo-glowa'); return { widoczna: getComputedStyle(g).display !== 'none' && g.getBoundingClientRect().height > 0, tekst: g.textContent.replace(/\s+/g, ' ').trim(), ile: document.querySelectorAll('.pismo-glowa').length }; })(),
      plansza: (() => { const pl = document.querySelector('.plansza'); const h1 = pl.querySelector('h1'); const cs = getComputedStyle(h1); const rzedy = [...pl.querySelectorAll('.rzad')];
        return { h1WPlanszy: !!h1, kolor: cs.color, krój: cs.fontFamily.split(',')[0].replace(/"/g, ''), waga: cs.fontWeight, wersaliki: cs.textTransform, tlo: getComputedStyle(pl).backgroundImage.slice(0, 40), rzedy: rzedy.length, ukryte: rzedy.every((r) => r.getAttribute('aria-hidden') === 'true'),
          slowa: [...rzedy[0].querySelector('.rzad-polowa').children].filter((x) => x.tagName === 'SPAN').slice(0, 4).map((x) => x.textContent).join(' · '),
          obrys: rzedy.map((d) => { const q = getComputedStyle(d.querySelector('.rzad-polowa')); return q.webkitTextStrokeWidth + ' ' + q.color; }) }; })() }));
    ok('1440: otwarcie i sekcja „Twoje dane” bez przypiętej kartki; przypięte ekrany tylko w „Demonstracji” (3)', m.heroArkusz === 0 && m.daneArkusz === 0 && m.demoArkusz === 3, m);
    ok('plansza jak w filmie v8: czerwone pole, białe hasło Archivo 900 wersalikami, dwa rzędy słów samym obrysem (PISMO · TERMIN · DECYZJA · SPOKÓJ), ukryte przed czytnikiem', m.plansza.h1WPlanszy && m.plansza.kolor === 'rgb(255, 255, 255)' && m.plansza.krój === 'Archivo Plansza' && m.plansza.waga === '900' && m.plansza.wersaliki === 'uppercase' && /linear-gradient/.test(m.plansza.tlo) && m.plansza.rzedy === 2 && m.plansza.ukryte && m.plansza.slowa === 'Pismo · Termin · Decyzja · Spokój' && m.plansza.obrys.every((x) => /px rgba\(0, 0, 0, 0\)$/.test(x)), m.plansza);
    ok('nagłówek pisma (data w prototypie, „W sprawie”) jeden, pod podpisem autora', m.glowa.widoczna && m.glowa.ile === 1 && /Data w prototypie\s*26 października 2026 r\.\s*W sprawie\s*asystenta spraw w koncepcji aplikacji mObywatel/.test(m.glowa.tekst), m.glowa);
    const app = await c.newPage(); await app.goto(A + '/aplikacja/'); const etykieta = await app.evaluate(() => window.APP.demo.label); await app.close();
    ok('data w nagłówku pisma = data pokazu w aplikacji', etykieta.endsWith(m.glowa.tekst.match(/(\d+ \S+ \d{4})/)[1]), etykieta);
    const wejscie = await p.evaluate(() => [...document.querySelectorAll('.plansza, .plansza .linia')].map((e) => { const a = e.getAnimations()[0]; const t = a ? a.effect.getComputedTiming() : null; return t ? { n: a.animationName, iter: t.iterations, koniec: Math.round(t.endTime) } : null; }));
    ok('wejście planszy: jednorazowe, kończy się przed 1,2 s', wejscie.length === 3 && wejscie.every((x) => x && x.iter === 1 && x.koniec <= 1200), wejscie);
    const rz = await p.evaluate(() => [...document.querySelectorAll('.rzad')].map((r) => { const t = r.querySelector('.rzad-tasma'); const a = t.getAnimations()[0]; const pol = [...t.children];
      return { n: a && a.animationName, iter: a && a.effect.getComputedTiming().iterations, czas: a && a.effect.getComputedTiming().duration, polowa: pol[0].getBoundingClientRect().width, rowne: pol.length === 2 && pol[0].innerHTML === pol[1].innerHTML && Math.abs(pol[0].getBoundingClientRect().width - pol[1].getBoundingClientRect().width) < 0.5, ekran: innerWidth }; }));
    ok('rzędy słów: pętla bez końca i bez skoku (dwie identyczne połowy szersze od ekranu), wolno: 20–40 px/s, w przeciwne strony', rz.length === 2 && rz.every((x) => x.iter === Infinity && x.rowne && x.polowa > x.ekran && x.polowa / (x.czas / 1000) >= 20 && x.polowa / (x.czas / 1000) <= 40) && rz[0].n !== rz[1].n, rz.map((x) => ({ n: x.n, pxs: +(x.polowa / (x.czas / 1000)).toFixed(1), polowa: Math.round(x.polowa), rowne: x.rowne })));
    const pauza = async () => p.evaluate(() => { const b = document.getElementById('plansza-pauza'); return { widoczny: !b.hidden && b.getBoundingClientRect().height >= 44, wcisniety: b.getAttribute('aria-pressed'), napis: b.textContent.trim(), stan: [...document.querySelectorAll('.rzad-tasma')].map((t) => t.getAnimations()[0].playState) }; });
    const p0 = await pauza(); await p.focus('#plansza-pauza'); await p.keyboard.press('Enter'); await p.waitForTimeout(200); const p1 = await pauza(); await p.click('#plansza-pauza'); await p.waitForTimeout(200); const p2 = await pauza();
    ok('przycisk „Zatrzymaj ruch”: widoczny (44 px), zatrzymuje oba rzędy z klawiatury, „Wznów ruch” wznawia', p0.widoczny && p0.stan.every((x) => x === 'running') && p1.wcisniety === 'true' && p1.napis === 'Wznów ruch' && p1.stan.every((x) => x === 'paused') && p2.wcisniety === 'false' && p2.stan.every((x) => x === 'running'), { p0, p1, p2 });
    const st = await p.evaluate(() => { const s = document.querySelector('.stopka-slogan'); const f = document.querySelector('.stopka'); return { slogan: s.textContent.replace(/\s+/g, ' ').trim(), obokZnaku: !!s.closest('.stopka-znak') && !!document.querySelector('.stopka-znak .stopka-nazwa svg'), hasloStrony: f.textContent.includes('Każda sprawa ma następny krok'), slogany: f.querySelectorAll('.stopka-slogan, .stopka-haslo').length }; });
    ok('stopka: jedno hasło „Spinka — spina sprawy, nie Ciebie.” przy znaku Spinki, bez drugiego hasła obok', st.slogan === 'Spinka — spina sprawy, nie Ciebie.' && st.obokZnaku && !st.hasloStrony && st.slogany === 1, st);
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
  for (const [w, h] of [[320, 568], [360, 780], [390, 844], [414, 896], [600, 900], [768, 1024], [959, 800], [960, 700], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]]) {
    const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); await p.goto(A + '/'); await p.waitForTimeout(1300);
    const m = await p.evaluate(() => { const h1 = document.querySelector('h1'); const pl = document.querySelector('.plansza').getBoundingClientRect();
      const prawe = [...h1.querySelectorAll('.linia')].flatMap((l) => { const g = document.createRange(); g.selectNodeContents(l); return [...g.getClientRects()].map((x) => x.right); });
      const rzedy = [...document.querySelectorAll('.rzad')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.getBoundingClientRect());
      return { wierszy: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)), font: Math.round(parseFloat(getComputedStyle(h1).fontSize)), prawa: Math.round(Math.max(...prawe)), ekran: innerWidth,
        rzedyWPlanszy: rzedy.every((r) => r.top >= pl.top - 0.5 && r.bottom <= pl.bottom + 0.5), rzedow: rzedy.length, bok: document.documentElement.scrollWidth - innerWidth }; });
    ok(w + ' px: hasło całe (' + (w >= 960 ? 2 : 3) + ' wiersze, ' + m.font + ' px), rzędy słów całe w pionie, bez przewijania w bok', m.wierszy === (w >= 960 ? 2 : 3) && m.prawa <= m.ekran - 12 && m.rzedyWPlanszy && m.rzedow >= 1 && m.bok === 0, m);
    await c.close(); }
  { const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await c.newPage(); await p.goto(A + '/'); await p.waitForTimeout(1200);
    const m = await p.evaluate(() => ({ glowaGora: 'none', glowaNizej: getComputedStyle(document.querySelector('.hero-tekst .pismo-glowa')).display,
      kolejnosc: ['#film', '#otworz-demo', '.skroty', 'main .autor', '.hero-opis', '.hero-tekst .pismo-glowa', '#sceny'].map((q) => Math.round(document.querySelector(q).getBoundingClientRect().top)), bok: document.documentElement.scrollWidth - innerWidth }));
    ok('390: tytuł, film, „Otwórz demo”, skróty, podpis, opis, nagłówek pisma, sceny — po kolei; nic nie wystaje w bok', m.glowaGora === 'none' && m.glowaNizej !== 'none' && m.kolejnosc.every((y, i, a) => !i || y > a[i - 1]) && m.bok === 0, m);
    await c.close(); }
  { const c = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await c.newPage(); await p.goto(A + '/'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ animacje: [...document.querySelectorAll('.plansza, .plansza .linia, .rzad-tasma')].reduce((n, e) => n + e.getAnimations().length, 0), klasa: document.documentElement.classList.contains('ruch'), klip: getComputedStyle(document.querySelector('.plansza')).clipPath,
      pauza: getComputedStyle(document.getElementById('plansza-pauza')).display }));
    ok('ograniczony ruch: plansza od razu w stanie końcowym, słowa w tle stoją, bez przycisku pauzy (nic się nie rusza)', r.animacje === 0 && !r.klasa && r.pauza === 'none', r);
    await c.close(); }
  { const c = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await c.newPage(); await p.goto(B + '/'); await p.waitForTimeout(1500);
    const m = await p.evaluate(() => ({ sceny: document.getElementById('sceny').hidden, film: document.getElementById('film-blok').hidden, koniec: !document.getElementById('koniec').hidden }));
    ok('bez filmu: sceny ukryte razem z filmem, zamiast nich komunikat i przejście do demonstracji', m.sceny && m.film && m.koniec, m);
    await c.close(); }
  await b.close();
  const zle = R.filter((x) => !x.ok).length; console.log('RAZEM ' + R.length + ' | nieudane ' + zle); process.exit(zle ? 1 : 0);
})();
