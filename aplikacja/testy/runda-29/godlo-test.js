// Rundy 29–34: animacja godła na ekranie startowym. Korona jest związana z orłem: orzeł niesie ją wysoko nad głową
// (nie dalej niż 18% wysokości znaku). Korona zaczyna spadać dopiero, gdy orzeł stoi (najwyżej 0,25 s później), na ekranie
// spada wyraźnie (co najmniej 12% wysokości znaku w dół), dotyka głowy, odbija się lekko (co najmniej 1,5% wysokości znaku)
// i osiada nieruchomo na tym samym miejscu.
// W każdej klatce korona jest wyśrodkowana nad orłem, nie wychodzi poza ekran, a znak nie miga przy podmianie warstw.
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
      window.__klatki.push({ t: performance.now(), korona, pelne: getComputedStyle(L[2]).opacity === '1', styk: k.bottom - o.top, kTop: k.top, oTop: o.top, kCx: k.left + k.width / 2, oCx: o.left + o.width / 2, E: L[0].getBoundingClientRect().height, ukryty: sp.hidden, widok: sp.getBoundingClientRect().height });
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
    const E = zKorona.length ? zKorona[zKorona.length - 1].E : 1;
    const min = Math.min(...zKorona.map((x) => x.styk)); const max = Math.max(...zKorona.map((x) => x.styk));
    const ostatnie = zKorona.slice(-3).map((x) => x.styk);
    const ruch = zKorona.length ? zKorona[0].oTop - zKorona[zKorona.length - 1].oTop : 0;
    ok(nazwa + ': korona nad głową najdalej o 18% wysokości znaku (nie odlatuje)', zKorona.length > 5 && min >= -0.18 * E, zKorona.length + ' klatek, styk od ' + min.toFixed(1) + ' do ' + max.toFixed(1) + ' px, znak ' + Math.round(E) + ' px, orzeł przebył ' + Math.round(ruch) + ' px');
    ok(nazwa + ': ruch korony względem orła wyraźny (co najmniej 12% wysokości znaku), na końcu siedzi na głowie', max - min >= 0.12 * E && ostatnie.every((x) => x >= 1), 'zakres ' + (max - min).toFixed(1) + ' px, koniec ' + ostatnie.map((x) => x.toFixed(1)).join('/'));
    ok(nazwa + ': korona nigdy nad górną krawędzią ekranu (nie spada z góry)', zKorona.every((x) => x.kTop >= 0 && x.kTop >= x.oTop - 0.26 * E));
    const krzywo = Math.max(...zKorona.map((x) => Math.abs(x.kCx - x.oCx)));
    ok(nazwa + ': korona w każdej klatce wyśrodkowana nad orłem (najwyżej 2% wysokości znaku w bok)', krzywo <= 0.02 * E, 'najwięcej ' + krzywo.toFixed(1) + ' px');
    // Kolejność: najpierw orzeł staje (oTop w 0,5 px od końcowego), potem korona zaczyna spadać (najwyżej 250 ms później;
    // orzeł hamuje miękko, więc w 0,5 px od celu jest ok. 0,18 s przed końcem swojego ruchu),
    // dotyka głowy (styk ≥ 1 px), odbija się lekko i osiada; na ekranie spada w dół co najmniej o 12% wysokości znaku.
    const kon = zKorona[zKorona.length - 1].oTop;
    const iStop = zKorona.findIndex((x) => Math.abs(x.oTop - kon) < 0.5);
    const i0 = zKorona.findIndex((x) => x.styk > min + 2);
    const iStyk = zKorona.findIndex((x, i) => i >= i0 && x.styk >= 1);
    const startPoStopie = iStop >= 0 && i0 >= 0 ? Math.round(zKorona[i0].t - zKorona[iStop].t) : null;
    const drogaPrzyStarcie = i0 >= 0 ? zKorona[i0].oTop - kon : -1;
    ok(nazwa + ': korona zaczyna spadać dopiero, gdy orzeł stoi (najwyżej 0,25 s później)', i0 > 0 && iStop >= 0 && drogaPrzyStarcie < 0.5 && startPoStopie !== null && startPoStopie >= 0 && startPoStopie <= 250,
      'orzeł miał jeszcze ' + drogaPrzyStarcie.toFixed(1) + ' px drogi, korona ruszyła ' + startPoStopie + ' ms po jego zatrzymaniu');
    const poStyku = iStyk >= 0 ? zKorona.slice(iStyk) : []; const odbicie = poStyku.length ? zKorona[zKorona.length - 1].styk - Math.min(...poStyku.map((x) => x.styk)) : 0; // ile korona uniosła się nad głowę po dotknięciu
    const spokoj = ostatnie.length === 3 && Math.max(...ostatnie) - Math.min(...ostatnie) < 0.5;
    ok(nazwa + ': po dotknięciu głowy korona wyraźnie osiada: lekkie odbicie (co najmniej 1,5% wysokości znaku) i spokój na tym samym miejscu', odbicie >= 0.015 * E && spokoj && Math.abs(zKorona[zKorona.length - 1].styk - zKorona[iStyk].styk) < 1,
      'odbicie ' + odbicie.toFixed(1) + ' px, koniec ' + ostatnie.map((x) => x.toFixed(1)).join('/') + ', styk przy dotknięciu ' + (iStyk >= 0 ? zKorona[iStyk].styk.toFixed(1) : '?'));
    const najwyzej = Math.min(...zKorona.filter((x) => x.oTop - kon < 0.1 * E).map((x) => x.kTop));
    const spadekNaEkranie = zKorona[zKorona.length - 1].kTop - najwyzej;
    ok(nazwa + ': na ekranie korona wyraźnie spada w dół (co najmniej 12% wysokości znaku)', spadekNaEkranie >= 0.12 * E, spadekNaEkranie.toFixed(1) + ' px przy znaku ' + Math.round(E) + ' px');
    const od = k.findIndex((x) => x.korona); const doK = k.findIndex((x, i) => i > od && x.ukryty);
    const dziury = k.slice(od, doK < 0 ? k.length : doK).filter((x) => x.widok > 0 && !x.korona && !x.pelne).length;
    ok(nazwa + ': bez migotania (w każdej klatce widać koronę albo całe godło)', od >= 0 && dziury === 0, dziury + ' klatek bez korony');
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
    await p.waitForFunction(() => { const k = window.__klatki || []; const m = Math.min(...k.filter((x) => x.korona).map((x) => x.styk)); return k.some((x) => x.korona && x.styk > m + 4 && x.styk < 0); }, null, { timeout: 8000 }); // w trakcie opadania korony
    const t = Date.now(); await akcja(p); await czekajKoniec(p); const czas = Date.now() - t;
    const stan = await p.evaluate(() => ({ anim: document.getElementById('sp-emblem').getAnimations().length, logo: !!document.querySelector('.gate:not([hidden]) .brand-mark, #topbar .brand-mark') }));
    ok('pominięcie w trakcie ruchu korony (' + nazwa + '): animacja kończy się od razu, znak w nagłówku, nic nie zostaje w ruchu', czas < 1500 && stan.anim === 0 && stan.logo, czas + ' ms, animacje: ' + stan.anim);
    await c.close();
  }
  await b.close();
  const zle = R.filter((r) => !r.ok).length; console.log('RAZEM ' + R.length + ' | nieudane ' + zle); process.exit(zle ? 1 : 0);
})();
