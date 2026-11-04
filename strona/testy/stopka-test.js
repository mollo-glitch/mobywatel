// Runda 33: orzeł z kropek w stopce.
//   node stopka-test.js <port strony>
// Sprawdza: wejście raz przy pierwszym wejściu stopki w widok (rozwarstwienie i powrót do znaku w ok. 1,4 s), brak
// powtórki po przewinięciu w górę i ponownym wejściu, reakcję na kursor tylko z myszą (do 4 px, powrót po wyjściu),
// telefon i wąski ekran, ograniczony ruch (statyczny znak z CSS, bez płótna), brak przesunięć układu, klikalne odnośniki
// i przewijanie w trakcie wejścia oraz kontrast tekstów stopki liczony z pikseli tła (z kropkami) w szczycie ruchu i po nim.
const { chromium } = require('playwright');
const PORT = process.argv[2] || '8470';
const A = 'http://127.0.0.1:' + PORT;
const R = []; const ok = (co, w, sz) => { R.push({ co, ok: !!w }); console.log((w ? '✓ ' : '✗ ') + co + (sz !== undefined ? ' | ' + (typeof sz === 'string' ? sz : JSON.stringify(sz)) : '')); };

const stan = (p) => p.evaluate(() => { const k = document.querySelector('.stopka-orzel-ruch'); return { stan: k.dataset.stan || null, r: k.dataset.rozwarstwienie || null, zagrano: k.dataset.zagrano || null, kursor: k.dataset.kursor || null }; });
const doStopki = (p) => p.evaluate(() => document.querySelector('.stopka').scrollIntoView({ block: 'start' }));

// Kontrast z pikseli: zrzut stopki z ukrytym tekstem (przezroczysty kolor), potem dla każdego tekstu najjaśniejsze tło w jego polu.
async function kontrast(p) {
  const pola = await p.evaluate(() => [...document.querySelectorAll('.stopka-pytanie, .stopka-slogan, .stopka .autor-stopka, .stopka-linki a, .stopka-noty p')].map((e) => {
    // pole samego tekstu (wiersze z Range), nie całego bloku: blok akapitu sięga do prawej krawędzi, gdzie stoi orzeł
    const rg = document.createRange(); rg.selectNodeContents(e); const rs = [...rg.getClientRects()].filter((q) => q.width > 1 && q.height > 1);
    const x0 = Math.min(...rs.map((q) => q.left)), y0 = Math.min(...rs.map((q) => q.top)), x1 = Math.max(...rs.map((q) => q.right)), y1 = Math.max(...rs.map((q) => q.bottom));
    const c = getComputedStyle(e).color.match(/\d+/g).slice(0, 3).map(Number);
    return { co: (e.className || e.tagName) + ': ' + e.textContent.trim().slice(0, 18), x: x0, y: y0, w: x1 - x0, h: y1 - y0, kolor: c };
  }));
  await p.addStyleTag({ content: '.stopka .kontener, .stopka .kontener * { color: transparent !important; text-decoration-color: transparent !important; } .stopka .kontener svg { visibility: hidden !important; }' });
  const png = await p.screenshot({ fullPage: false });
  await p.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (/color: transparent !important/.test(s.textContent)) s.remove(); }));
  return { png, pola };
}
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
async function najgorszyKontrast(p, b, png, pola) {
  // dekodowanie PNG w przeglądarce (bez dodatkowych bibliotek)
  const strona = await b.newPage();
  const wynik = await strona.evaluate(async ({ dane, pola }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + dane; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    return pola.map((q) => { const d = x.getImageData(Math.max(0, Math.floor(q.x)), Math.max(0, Math.floor(q.y)), Math.max(1, Math.ceil(q.w)), Math.max(1, Math.ceil(q.h))).data;
      let max = [0, 0, 0], ml = -1; for (let i = 0; i < d.length; i += 4) { const s = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; if (s > ml) { ml = s; max = [d[i], d[i + 1], d[i + 2]]; } }
      return { co: q.co, kolor: q.kolor, tlo: max }; });
  }, { dane: png.toString('base64'), pola });
  await strona.close();
  return wynik.map((q) => { const a = lum(q.kolor), t = lum(q.tlo); return { co: q.co, stosunek: +((Math.max(a, t) + 0.05) / (Math.min(a, t) + 0.05)).toFixed(2), tlo: q.tlo }; }).sort((a, b) => a.stosunek - b.stosunek);
}

(async () => {
  const b = await chromium.launch();
  // 1. Komputer, mysz
  { const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await c.newPage(); const bledy = []; p.on('pageerror', (e) => bledy.push(e.message));
    await p.goto(A + '/'); await p.waitForTimeout(900);
    const g = await p.evaluate(() => { const k = document.querySelector('.stopka-orzel-ruch'), d = document.querySelector('.stopka-orzel'); const a = k.getBoundingClientRect(), z = d.getBoundingClientRect();
      return { zywy: document.querySelector('.stopka').classList.contains('orzel-zywy'), statycznyUkryty: getComputedStyle(d).visibility === 'hidden', ten_sam_obszar: ['left', 'top', 'width', 'height'].every((q) => Math.abs(a[q] - z[q]) < 0.5),
        pod_trescia: +getComputedStyle(k).zIndex < +getComputedStyle(document.querySelector('.stopka > .kontener')).zIndex, klikniecia: getComputedStyle(k).pointerEvents, krycie: getComputedStyle(k).opacity, stan: k.dataset.stan }; });
    ok('komputer: płótno zastępuje znak z CSS w tym samym miejscu, pod treścią, bez przechwytywania kliknięć; przed wejściem czeka', g.zywy && g.statycznyUkryty && g.ten_sam_obszar && g.pod_trescia && g.klikniecia === 'none' && g.krycie === '0.3' && g.stan === 'czeka', g);
    // przesunięcia układu i przebieg wejścia
    await p.evaluate(() => { window.__cls = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: false }); });
    const t0 = Date.now(); await doStopki(p); const przebieg = []; let szczyt = null;
    while (Date.now() - t0 < 2600) { const s = await stan(p); przebieg.push([Date.now() - t0, s.stan, s.r]); if (!szczyt && s.r && +s.r >= 0.95) szczyt = await kontrast(p); if (s.stan === 'stoi' && Date.now() - t0 > 400) break; await p.waitForTimeout(40); }
    const gra = przebieg.filter((x) => x[1] === 'gra'); const maxR = Math.max(...przebieg.map((x) => +x[2] || 0)); const koniec = przebieg.find((x) => x[1] === 'stoi');
    ok('komputer: przy pierwszym wejściu stopki kropki rozwarstwiają się (szczyt ≥ 0,95) i w ok. 1,4 s składają w nieruchomy znak', gra.length > 2 && maxR >= 0.95 && koniec && koniec[0] - gra[0][0] >= 1100 && koniec[0] - gra[0][0] <= 2000 && (await stan(p)).r === '0', { maxR, czas: koniec && gra.length ? koniec[0] - gra[0][0] : null, kroki: przebieg.length });
    const cls = await p.evaluate(() => window.__cls);
    ok('komputer: wejście nie przesuwa układu strony (CLS = 0)', cls === 0, cls);
    // klikalność i przewijanie w trakcie (osobna próba przy ponownym ładowaniu niżej)
    // ponowne wejście: brak powtórki
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(700); await doStopki(p); const ponownie = [];
    for (let i = 0; i < 12; i++) { ponownie.push(await stan(p)); await p.waitForTimeout(100); }
    ok('komputer: po przewinięciu w górę i ponownym wejściu w stopkę znak już się nie rusza (wejście jednorazowe)', ponownie.every((s) => s.stan === 'stoi' && s.r === '0' && s.zagrano === '1'), ponownie.slice(0, 2));
    // kursor
    const box = await (await p.$('.stopka-orzel-ruch')).boundingBox();
    await p.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3); await p.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.8, { steps: 8 }); await p.waitForTimeout(700);
    const k1 = await stan(p);
    await p.mouse.move(5, 5); await p.waitForTimeout(100); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(100); await doStopki(p);
    await p.dispatchEvent('.stopka', 'pointerleave'); await p.waitForTimeout(1000); const k2 = await stan(p);
    ok('komputer: kursor nad stopką minimalnie przesuwa plany (najwyżej 4 px), po wyjściu kursora znak wraca do spoczynku', k1.stan === 'kursor' && +k1.kursor > 0.5 && +k1.kursor <= 4 && k2.stan === 'stoi' && k2.kursor === '0.00', { k1, k2 });
    // kontrast w szczycie i po wejściu
    const poK = await kontrast(p);
    const sz = szczyt ? await najgorszyKontrast(p, b, szczyt.png, szczyt.pola) : null; const po = await najgorszyKontrast(p, b, poK.png, poK.pola);
    ok('komputer: kontrast każdego tekstu stopki z najjaśniejszym pikselem tła (z kropkami) co najmniej 4,5:1, w szczycie ruchu i po nim', sz && sz[0].stosunek >= 4.5 && po[0].stosunek >= 4.5, { szczyt: sz && sz.slice(0, 2), po: po.slice(0, 2) });
    ok('komputer: bez błędów strony', bledy.length === 0, bledy);
    await c.close(); }
  // 2. Klikalność i przewijanie w trakcie wejścia
  { const c = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await c.newPage(); await p.goto(A + '/'); await p.waitForTimeout(800);
    await doStopki(p); await p.waitForTimeout(250);
    const s = await stan(p);
    const traf = await p.evaluate(() => [...document.querySelectorAll('.stopka-linki a')].map((a) => { const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e === a || a.contains(e); }));
    const y0 = await p.evaluate(() => scrollY); await p.mouse.wheel(0, -300); await p.waitForTimeout(300); const y1 = await p.evaluate(() => scrollY);
    ok('w trakcie wejścia odnośniki stopki są pod kursorem (płótno ich nie zasłania), a kółko myszy przewija stronę', s.stan === 'gra' && traf.every(Boolean) && y1 < y0, { stan: s.stan, traf, y0, y1 });
    await c.close(); }
  // 3. Telefon i wąski ekran
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }); const p = await c.newPage(); await p.goto(A + '/'); await p.waitForTimeout(900);
    const przed = await stan(p); await doStopki(p); let maxR = 0, s = null; const t0 = Date.now();
    while (Date.now() - t0 < 2600) { s = await stan(p); maxR = Math.max(maxR, +s.r || 0); if (s.stan === 'stoi' && Date.now() - t0 > 400) break; await p.waitForTimeout(40); }
    await p.tap('.stopka-slogan').catch(() => {}); await p.waitForTimeout(400); const poDotyku = await stan(p);
    const g = await p.evaluate(() => { const k = document.querySelector('.stopka-orzel-ruch').getBoundingClientRect(); const f = document.querySelector('.stopka').getBoundingClientRect(); return { bok: document.documentElement.scrollWidth - innerWidth, wStopce: k.top >= f.top - 1, szer: Math.round(k.width) }; });
    ok(w + ' px (dotyk): wejście raz po wejściu w stopkę, kończy się nieruchomym znakiem; dotyk nie włącza ruchu za kursorem; bez przewijania w bok', przed.stan === 'czeka' && maxR >= 0.9 && s.stan === 'stoi' && poDotyku.stan === 'stoi' && g.bok === 0 && g.wStopce, { maxR, poDotyku: poDotyku.stan, ...g });
    const poK = await kontrast(p); const po = await najgorszyKontrast(p, b, poK.png, poK.pola);
    ok(w + ' px: kontrast tekstów stopki z tłem z kropkami co najmniej 4,5:1', po[0].stosunek >= 4.5, po.slice(0, 2));
    await c.close(); }
  // 4. Ograniczony ruch
  { const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p = await c.newPage(); await p.goto(A + '/'); await p.waitForTimeout(600); await doStopki(p); await p.waitForTimeout(1200);
    const g = await p.evaluate(() => { const k = document.querySelector('.stopka-orzel-ruch'), d = document.querySelector('.stopka-orzel');
      return { zywy: document.querySelector('.stopka').classList.contains('orzel-zywy'), plotno: getComputedStyle(k).display, statyczny: getComputedStyle(d).display + '/' + getComputedStyle(d).visibility, stan: k.dataset.stan || null }; });
    ok('ograniczony ruch: statyczny znak z CSS, płótno wyłączone, nic się nie rusza', !g.zywy && g.plotno === 'none' && g.statyczny === 'block/visible' && g.stan === null, g);
    await c.close(); }
  await b.close();
  const zle = R.filter((r) => !r.ok).length; console.log('RAZEM ' + R.length + ' | nieudane ' + zle); process.exit(zle ? 1 : 0);
})();
