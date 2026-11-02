// Runda 29: animacja godła na ekranie startowym. Korona ma być związana z orłem w każdej klatce.
//   node godlo-test.js <port statyczny dist/>
// Sprawdza w każdej wyrenderowanej klatce (requestAnimationFrame w stronie), czy podstawa korony zachodzi na głowę orła,
// przy 390 px i 1280 px, przy procesorze zwolnionym 6x, z ograniczonym ruchem i po „Pomiń” / Escape w trakcie ruchu korony.
const { chromium } = require('playwright');
const PORT = process.argv[2] || '8650';
const URL = 'http://127.0.0.1:' + PORT + '/';
const R = []; const ok = (co, w, sz) => { R.push({ co, ok: !!w }); console.log((w ? '✓ ' : '✗ ') + co + (sz ? ' | ' + sz : '')); };

const RECORDER = () => {
  window.__klatki = [];
  const krok = () => {
    const sp = document.getElementById('splash');
    const L = sp ? Array.from(sp.querySelectorAll('#sp-emblem svg')) : [];
    if (L.length === 3) {
      const korona = getComputedStyle(L[1]).opacity === '1';
      const k = L[1].querySelector('use').getBoundingClientRect();
      const o = L[0].querySelector('use').getBoundingClientRect();
      window.__klatki.push({ t: performance.now(), korona, styk: k.bottom - o.top, kTop: k.top, oTop: o.top, ukryty: sp.hidden, widok: sp.getBoundingClientRect().height });
    }
    if (!sp || !sp.hidden) requestAnimationFrame(krok);
  };
  requestAnimationFrame(krok);
};

(async () => {
  const b = await chromium.launch();
  const sesja = async (opt) => {
    const c = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 } }, opt.ctx || {}));
    const p = await c.newPage();
    if (opt.cpu) { const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: opt.cpu }); }
    await p.addInitScript(RECORDER);
    return { c, p };
  };
  const czekajKoniec = (p) => p.waitForFunction(() => { const s = document.getElementById('splash'); return s && s.hidden; }, null, { timeout: 15000 });

  for (const [nazwa, opt] of [['390 px', {}], ['1280 px', { ctx: { viewport: { width: 1280, height: 800 } } }], ['390 px, procesor 6x wolniejszy', { cpu: 6 }], ['1280 px, procesor 6x wolniejszy', { cpu: 6, ctx: { viewport: { width: 1280, height: 800 } } }]]) {
    const { c, p } = await sesja(opt);
    await p.goto(URL); await czekajKoniec(p);
    const k = await p.evaluate(() => window.__klatki);
    const zKorona = k.filter((x) => x.korona && x.widok > 0);
    const min = Math.min(...zKorona.map((x) => x.styk)); const max = Math.max(...zKorona.map((x) => x.styk));
    const ruch = zKorona.length ? zKorona[0].oTop - zKorona[zKorona.length - 1].oTop : 0;
    ok(nazwa + ': korona zachodzi na głowę orła w każdej klatce (bez przerwy)', zKorona.length > 5 && min >= 0, zKorona.length + ' klatek z koroną, styk min ' + min.toFixed(1) + ' px, max ' + max.toFixed(1) + ' px, orzeł przebył ' + Math.round(ruch) + ' px');
    ok(nazwa + ': korona nigdy nad górną krawędzią ekranu (nie spada z góry)', zKorona.every((x) => x.kTop >= x.oTop - 60));
    const logo = await p.evaluate(() => { const m = document.querySelector('.gate:not([hidden]) .brand-mark, #topbar .brand-mark'); return m ? m.getBoundingClientRect().width : 0; });
    ok(nazwa + ': po animacji znak stoi w nagłówku', logo > 20, 'szer. ' + logo);
    await c.close();
  }

  { // ograniczony ruch: od razu złożony znak, warstwy orła i korony niewidoczne, bez transformacji
    const { c, p } = await sesja({ ctx: { reducedMotion: 'reduce' } });
    const t0 = Date.now(); await p.goto(URL); await czekajKoniec(p); const czas = Date.now() - t0;
    const k = await p.evaluate(() => window.__klatki);
    ok('ograniczony ruch: korona i orzeł nie poruszają się osobno (warstwa korony ukryta)', k.every((x) => !x.korona), k.length + ' klatek');
    ok('ograniczony ruch: ekran startowy kończy się szybko', czas < 4000, czas + ' ms');
    await c.close();
  }

  for (const [nazwa, akcja] of [['przycisk „Pomiń”', (p) => p.click('.sp-skip')], ['klawisz Escape', (p) => p.keyboard.press('Escape')]]) {
    const { c, p } = await sesja({});
    await p.goto(URL);
    await p.waitForFunction(() => (window.__klatki || []).some((x) => x.korona && x.styk < 3.5 && x.oTop < 400), null, { timeout: 8000 }); // w trakcie ruchu korony
    const t = Date.now(); await akcja(p); await czekajKoniec(p); const czas = Date.now() - t;
    const stan = await p.evaluate(() => ({ anim: document.getElementById('sp-emblem').getAnimations().length, logo: !!document.querySelector('.gate:not([hidden]) .brand-mark, #topbar .brand-mark') }));
    ok('pominięcie w trakcie ruchu korony (' + nazwa + '): animacja kończy się od razu, znak w nagłówku, nic nie zostaje w ruchu', czas < 1500 && stan.anim === 0 && stan.logo, czas + ' ms, animacje: ' + stan.anim);
    await c.close();
  }
  await b.close();
  const zle = R.filter((r) => !r.ok).length; console.log('RAZEM ' + R.length + ' | nieudane ' + zle); process.exit(zle ? 1 : 0);
})();
