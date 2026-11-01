// Testy strony projektu w Chromium (Playwright). Sprawdza stronę z filmem i stronę, na której film się nie wczytał.
//   node testy/test-strony.js <port strony z filmem> <port strony bez filmu> [plik axe.min.js]
// Strony serwuje podglad.mjs (obsługuje Range). Wynik: lista ✓/✗ i RAZEM.
const { chromium } = require('playwright'); const fs = require('fs'); const crypto = require('crypto');
const [, , P1, P2, AXE_PATH] = process.argv;
const A = 'http://127.0.0.1:' + P1; const B = 'http://127.0.0.1:' + P2;
const AXE = fs.readFileSync(AXE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const APLIKACJA_MD5 = '61c2912275be841d8bc7c7d7a0767f7f';
const R = []; const ok = (co, w, sz) => R.push({ co, ok: !!w, sz });
const H = { 320: 568, 390: 844, 1280: 800 };
const axe = async (p) => { await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })).violations.map((v) => v.id + ' (' + v.nodes.length + ')')); };
const pasek = (p) => p.evaluate(() => { const m = /scaleX\(([\d.e-]+)\)/.exec(document.getElementById('postep-pasek').style.transform); const v = document.getElementById('film');
  return { pasek: m ? +m[1] : 0, czas: v.duration > 0 ? v.currentTime / v.duration : 0, paused: v.paused, ended: v.ended }; });
const czekaj = (p, fn, ms) => p.waitForFunction(fn, null, { timeout: ms || 20000 });

(async () => {
  const b = await chromium.launch();
  const nowa = async (w, o) => { const ctx = await b.newContext({ viewport: { width: w, height: H[w] || 800 }, ...(o || {}) }); const p = await ctx.newPage();
    const log = { bledy: [], zadania: [] }; p.on('pageerror', (e) => log.bledy.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') log.bledy.push(m.text()); });
    p.on('request', (r) => log.zadania.push(r.url())); return { ctx, p, log }; };

  // 1. Pierwszy ekran przy 320, 390, 1280: nazwa, hasło, film i „Pomiń film” bez przewijania; nic nie wystaje w bok; axe.
  for (const w of [320, 390, 1280]) {
    const { ctx, p, log } = await nowa(w); await p.goto(A + '/'); await p.waitForTimeout(800);
    const m = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect();
      const nazwaWidoczna = [document.querySelector('h1'), document.querySelector('.logo')].some((e) => { const q = e.getBoundingClientRect(); return q.width > 2 && q.height > 2 && /Spinka/.test(e.textContent) && q.bottom <= innerHeight; });
      return { h1: document.querySelector('h1').textContent, nazwaWidoczna, haslo: document.querySelector('.haslo').textContent, otworz: r('#otworz-demo').bottom, pismo: r('a[href="aplikacja/#pismo"]').bottom, oc: r('a[href="aplikacja/#oc"]').bottom,
        film: r('#film').bottom, pomin: r('.pomin').bottom, okno: innerHeight, bok: document.documentElement.scrollWidth - innerWidth,
        male: [...document.querySelectorAll('.top a, .hero a, .hero button')].filter((e) => e.getClientRects().length && !e.closest('video')).map((e) => [e.textContent.trim().slice(0, 24), Math.round(e.getBoundingClientRect().height)]).filter((x) => x[1] < 44) }; });
    ok(w + ' px: na pierwszym ekranie nazwa, hasło, „Otwórz demo”, skróty „Pismo z urzędu” i „Kończy się OC”, film i „Pomiń film”; bez przewijania w bok',
      m.h1 === 'Spinka' && m.nazwaWidoczna && m.haslo === 'Każda sprawa ma następny krok.' && [m.otworz, m.pismo, m.oc, m.film, m.pomin].every((y) => y <= m.okno) && m.bok === 0, m);
    ok(w + ' px: cele dotyku w nagłówku i na pierwszym ekranie mają co najmniej 44 px wysokości', m.male.length === 0, m.male);
    const v = await axe(p); ok(w + ' px: axe bez naruszeń (start)', v.length === 0, v);
    const obce = log.zadania.filter((u) => !u.startsWith(A + '/'));
    ok(w + ' px: strona pobiera tylko własne pliki (bez analityki i zewnętrznych zasobów), bez błędów', obce.length === 0 && log.bledy.length === 0, { obce, bledy: log.bledy });
    ok(w + ' px: brak plików cookie', (await ctx.cookies()).length === 0);
    await ctx.close();
  }

  // 2. Odtwarzacz: sterowanie, plakat, napisy, pasek = czas filmu, pauza, przewinięcie, koniec.
  { const { ctx, p, log } = await nowa(390); await p.goto(A + '/'); await czekaj(p, () => document.getElementById('film').readyState >= 1);
    const at = await p.evaluate(() => { const v = document.getElementById('film'); const t = v.querySelector('track');
      return { controls: v.controls, poster: v.getAttribute('poster'), preload: v.preload, track: t && [t.kind, t.srclang, t.default], tryb: v.textTracks[0] && v.textTracks[0].mode, info: document.getElementById('film-info').textContent }; });
    ok('odtwarzacz: widoczne sterowanie, plakat, preload=metadata, napisy PL domyślnie włączone', at.controls && /plakat/.test(at.poster || '') && at.preload === 'metadata' && at.track && at.track.join() === 'captions,pl,true' && at.tryb === 'showing', at);
    ok('przed odtworzeniem pasek stoi na zerze (nic nie udaje ładowania)', (await pasek(p)).pasek === 0, await pasek(p));
    await p.evaluate(() => { const v = document.getElementById('film'); v.muted = true; v.play(); });
    await czekaj(p, () => document.getElementById('film').currentTime > 2.2);
    const graj = await pasek(p); ok('w trakcie odtwarzania pasek = currentTime / duration (±3%)', Math.abs(graj.pasek - graj.czas) < 0.03 && graj.pasek > 0, graj);
    await p.evaluate(() => document.getElementById('film').pause()); const p1 = await pasek(p); await p.waitForTimeout(1200); const p2 = await pasek(p);
    ok('pauza: pasek stoi w miejscu i zgadza się z czasem; nie pojawia się panel końca', p1.paused && p1.pasek === p2.pasek && Math.abs(p2.pasek - p2.czas) < 0.005 && await p.locator('#koniec').isHidden(), { p1, p2 });
    // Napisy: w środku pierwszego napisu jest on aktywny; opis pod filmem podaje czas filmu i napisy.
    const nap = await p.evaluate(async () => { const v = document.getElementById('film'); const c = v.textTracks[0].cues[0]; v.currentTime = (c.startTime + c.endTime) / 2;
      await new Promise((r) => setTimeout(r, 500)); const a = v.textTracks[0].activeCues; const s = Math.floor(v.duration / 60) + ':' + String(Math.floor(v.duration % 60)).padStart(2, '0');
      return { oczekiwany: c.text, aktywny: a && a[0] ? a[0].text : null, info: document.getElementById('film-info').textContent, oczekiwaneInfo: 'Film, ' + s + ', z napisami' }; });
    ok('napisy się wyświetlają (aktywny napis) i opis pod filmem podaje czas i napisy', nap.aktywny === nap.oczekiwany && nap.info === nap.oczekiwaneInfo, nap);
    const tf = await p.evaluate(() => { const d = document.querySelector('.tekst-filmu'); return d ? { pozycji: d.querySelectorAll('li').length, summary: d.querySelector('summary').textContent } : null; });
    ok('pod filmem jest rozwijany „Tekst z filmu” (plansze po kolei)', tf && tf.pozycji > 0 && tf.summary === 'Tekst z filmu', tf);
    await p.evaluate(() => { const v = document.getElementById('film'); v.currentTime = v.duration / 2; }); await p.waitForTimeout(500); const p3 = await pasek(p);
    ok('przewinięcie do połowy: pasek na połowie', Math.abs(p3.pasek - 0.5) < 0.01, p3);
    ok('przed końcem widać „Pomiń film” prowadzące do /aplikacja/', await p.locator('.pomin').isVisible() && await p.evaluate(() => document.querySelector('.pomin').href) === A + '/aplikacja/');
    await p.evaluate(() => { document.activeElement.blur(); const v = document.getElementById('film'); v.currentTime = v.duration - 1.2; v.play(); });
    await czekaj(p, () => document.getElementById('film').ended);
    await p.waitForTimeout(700);
    const k = await p.evaluate(() => { const d = document.getElementById('do-demo'); const r = d.getBoundingClientRect();
      return { widoczny: !document.getElementById('koniec').hidden, wOknie: r.top >= 0 && r.bottom <= innerHeight, href: d.href, tekst: d.textContent, fokus: document.activeElement.id, pomin: document.getElementById('film-pod').hidden, ogl: document.getElementById('ogloszenie').textContent }; });
    ok('koniec: wyraźny przycisk „Przejdź do demonstracji” w oknie, prowadzi do /aplikacja/; „Pomiń film” znika', k.widoczny && k.wOknie && k.href === A + '/aplikacja/' && k.tekst === 'Przejdź do demonstracji' && k.pomin, k);
    ok('koniec: pasek pełny, komunikat dla czytnika, fokus na przycisku (gdy nie był na innym elemencie)', (await pasek(p)).pasek === 1 && /skończył/.test(k.ogl) && k.fokus === 'do-demo', { ...k, pasek: await pasek(p) });
    await p.click('#jeszcze-raz'); await p.waitForTimeout(900);
    const j = await p.evaluate(() => { const v = document.getElementById('film'); return { czas: v.currentTime, gra: !v.paused, panel: !document.getElementById('koniec').hidden, fokus: document.activeElement.id }; });
    ok('„Obejrzyj jeszcze raz”: film od początku, panel zostaje, fokus się nie gubi', j.czas < 2 && j.gra && j.panel && j.fokus === 'jeszcze-raz', j);
    const v = await axe(p); ok('390 px: axe bez naruszeń (po końcu filmu)', v.length === 0, v);
    ok('odtwarzanie bez błędów strony i konsoli', log.bledy.length === 0, log.bledy);
    await ctx.close(); }

  // 3. Ograniczony ruch: panel końca bez animacji, przewijanie bez płynnego ruchu.
  { const { ctx, p } = await nowa(390, { reducedMotion: 'reduce' }); await p.goto(A + '/'); await czekaj(p, () => document.getElementById('film').readyState >= 1);
    await p.evaluate(() => { const v = document.getElementById('film'); v.muted = true; v.currentTime = v.duration - 0.8; v.play(); }); await czekaj(p, () => document.getElementById('film').ended); await p.waitForTimeout(300);
    const an = await p.evaluate(() => getComputedStyle(document.getElementById('koniec')).animationName);
    ok('ograniczony ruch: panel końca pojawia się bez animacji', an === 'none', an); await ctx.close(); }

  // 4. Klawiatura: link „Przejdź do treści” na początku, widoczny fokus, „Pomiń film” osiągalny Tabem.
  { const { ctx, p } = await nowa(1280); await p.goto(A + '/'); await p.waitForTimeout(500);
    const kroki = [];
    for (let i = 0; i < 16; i++) { await p.keyboard.press('Tab'); kroki.push(await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
      return { el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : ''), tekst: (e.textContent || '').trim().slice(0, 30), obwodka: cs.outlineStyle + ' ' + cs.outlineWidth, widoczny: r.top >= 0 && r.bottom <= innerHeight && r.width > 0 }; })); }
    const linki = kroki.filter((k) => k.el.startsWith('a'));
    ok('klawiatura: pierwszy Tab to „Przejdź do treści”, widoczny', kroki[0].tekst === 'Przejdź do treści' && kroki[0].widoczny, kroki[0]);
    ok('klawiatura: każdy link ma widoczną obwódkę fokusu 3 px', linki.every((k) => k.obwodka === 'solid 3px'), linki);
    ok('klawiatura: Tab dochodzi kolejno do „Otwórz demo”, obu skrótów, filmu i „Pomiń film”', ['Otwórz demo', 'Pismo z urzędu', 'Kończy się OC'].every((t) => kroki.some((k) => k.tekst === t)) && kroki.some((k) => k.el.startsWith('video')) && kroki.some((k) => /Pomiń film/.test(k.tekst))
      && kroki.findIndex((k) => k.tekst === 'Otwórz demo') < kroki.findIndex((k) => k.el.startsWith('video')), kroki.map((k) => k.el + ' ' + k.tekst));
    await ctx.close(); }

  // 5. „Pomiń film” prowadzi do prawdziwej demonstracji (build 27 bez zmian); bezpośredni adres na telefonie i komputerze.
  { const { ctx, p } = await nowa(390, { hasTouch: true, isMobile: true }); await p.goto(A + '/'); await p.waitForTimeout(500);
    await p.tap('.pomin'); await p.waitForURL(A + '/aplikacja/'); await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 });
    ok('telefon: dotknięcie „Pomiń film” otwiera demonstrację (ekran wejścia aplikacji)', (await p.title()) === 'Co chcesz załatwić?'); await ctx.close(); }
  // Skróty ze strony prowadzą prosto do scenariuszy (kotwice #pismo i #oc w aplikacji), bez ekranów wejścia; „Otwórz demo” do wejścia demo.
  for (const [w, h] of [[320, 568], [390, 844]]) {
    for (const [etykieta, kotwica, tytul] of [['Pismo z urzędu', '#pismo', 'Pismo z urzędu'], ['Kończy się OC', '#oc', 'Koniec polisy OC']]) {
      const { ctx, p, log } = await nowa(w, { hasTouch: true, isMobile: true }); await p.setViewportSize({ width: w, height: h }); await p.goto(A + '/'); await p.waitForTimeout(500);
      await p.tap('.skrot >> text=' + etykieta); await p.waitForURL(A + '/aplikacja/' + kotwica);
      await p.waitForFunction((t) => document.querySelector('.screen.chat') && document.querySelector('#chat-log .msg.bot') && document.body.innerText.includes(t), tytul, { timeout: 20000 }).catch(() => {});
      await p.waitForTimeout(800);
      const s = await p.evaluate(() => ({ ekran: (document.querySelector('#main > .screen') || {}).className, h1: (document.querySelector('#chat-h') || {}).textContent, brama: !document.querySelector('#entry').hidden || !document.querySelector('#login').hidden,
        pasek: document.querySelector('.proto-bar').innerText.replace(/\s+/g, ' '), tekst: document.querySelector('#main').innerText.replace(/\s+/g, ' ').slice(0, 400) }));
      ok(w + ' px: skrót „' + etykieta + '” otwiera scenariusz „' + tytul + '” w rozmowie ze Spinką, bez ekranów wejścia, z paskiem „dane fikcyjne”',
        /chat/.test(s.ekran) && s.h1 === 'Zapytaj Spinkę' && !s.brama && s.tekst.includes(tytul) && /dane fikcyjne/.test(s.pasek) && log.bledy.length === 0, { ...s, bledy: log.bledy });
      await ctx.close(); } }
  { const { ctx, p } = await nowa(320, { hasTouch: true, isMobile: true }); await p.setViewportSize({ width: 320, height: 568 }); await p.goto(A + '/'); await p.waitForTimeout(500);
    await p.tap('#otworz-demo'); await p.waitForURL(A + '/aplikacja/'); await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 });
    ok('320 px: „Otwórz demo” otwiera demonstrację od ekranu wejścia', (await p.title()) === 'Co chcesz załatwić?'); await ctx.close(); }
  { const html = await (await fetch(A + '/aplikacja/')).arrayBuffer();
    ok('/aplikacja/ to build 27 bajt w bajt (MD5 ' + APLIKACJA_MD5.slice(0, 8) + ')', crypto.createHash('md5').update(Buffer.from(html)).digest('hex') === APLIKACJA_MD5); }
  for (const w of [390, 1280]) {
    const { ctx, p, log } = await nowa(w, w === 390 ? { hasTouch: true, isMobile: true } : {});
    await p.goto(A + '/aplikacja/'); await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 });
    await p.click('[data-act=entry-demo]'); await p.waitForTimeout(300); await p.click('[data-act=enter]'); await p.waitForTimeout(1200);
    const s = await p.evaluate(() => ({ h1: (document.querySelector('#main h1') || {}).textContent, przewodnik: getComputedStyle(document.querySelector('.guide')).display }));
    await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(900);
    const c = await p.evaluate(() => document.querySelector('#chat-h').textContent);
    ok(w + ' px: bezpośredni adres /aplikacja/: wejście, Start, rozmowa „Zapytaj Spinkę”' + (w === 1280 ? ', przewodnik obok telefonu' : ''), s.h1 === 'Start' && c === 'Zapytaj Spinkę' && (w === 390 || s.przewodnik === 'block') && log.bledy.length === 0, { ...s, c, bledy: log.bledy });
    await ctx.close(); }

  // 6. Film się nie wczytał (strona zbudowana bez filmu): komunikat i przejście do demonstracji, bez kradzieży fokusu i przewijania.
  for (const w of [320, 1280]) {
    const { ctx, p } = await nowa(w); await p.goto(B + '/'); await p.waitForTimeout(1200);
    const e = await p.evaluate(() => ({ film: document.getElementById('film-blok').hidden, panel: !document.getElementById('koniec').hidden, tekst: document.getElementById('koniec-tekst').textContent,
      powtorka: document.getElementById('jeszcze-raz').hidden, fokus: document.activeElement === document.body, scroll: scrollY, cta: document.getElementById('do-demo').getBoundingClientRect().bottom <= innerHeight }));
    ok(w + ' px bez filmu: zamiast odtwarzacza komunikat i „Przejdź do demonstracji” na pierwszym ekranie; fokus i przewinięcie bez zmian', e.film && e.panel && /niedostępny/.test(e.tekst) && e.powtorka && e.fokus && e.scroll === 0 && e.cta, e);
    const v = await axe(p); ok(w + ' px bez filmu: axe bez naruszeń', v.length === 0, v); await ctx.close(); }

  await b.close();
  for (const r of R) console.log((r.ok ? '✓ ' : '✗ ') + r.co + (r.ok ? '' : '\n    ' + JSON.stringify(r.sz).slice(0, 600)));
  console.log('RAZEM ' + R.length + ' | nieudane ' + R.filter((r) => !r.ok).length);
})();
