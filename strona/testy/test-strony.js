// Testy strony projektu w Chromium (Playwright). Sprawdza stronę z filmem i stronę, na której film się nie wczytał.
//   node testy/test-strony.js <port strony z filmem> <port strony bez filmu> [plik axe.min.js]
// Strony serwuje podglad.mjs (obsługuje Range). Wynik: lista ✓/✗ i RAZEM.
const { chromium } = require('playwright'); const fs = require('fs'); const crypto = require('crypto');
const [, , P1, P2, AXE_PATH] = process.argv;
const A = 'http://127.0.0.1:' + P1; const B = 'http://127.0.0.1:' + P2;
const AXE = fs.readFileSync(AXE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const APLIKACJA_MD5 = 'aa05f84856717a12399b0bc075fa888e';
const R = []; const ok = (co, w, sz) => R.push({ co, ok: !!w, sz });
const H = { 320: 568, 390: 844, 1280: 800 };
const axe = async (p) => { await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await axe.run(document.querySelector('.ruch .odslona:not(.widoczne)') ? { exclude: [['.ruch .odslona:not(.widoczne)']] } : document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })).violations.map((v) => v.id + ' (' + v.nodes.length + ')')); };
const pasek = (p) => p.evaluate(() => { const m = /scaleX\(([\d.e-]+)\)/.exec(document.getElementById('postep-pasek').style.transform); const v = document.getElementById('film');
  return { pasek: m ? +m[1] : 0, czas: v.duration > 0 ? v.currentTime / v.duration : 0, paused: v.paused, ended: v.ended }; });
const czekaj = (p, fn, ms) => p.waitForFunction(fn, null, { timeout: ms || 20000 });

(async () => {
  const b = await chromium.launch();
  const nowa = async (w, o) => { const ctx = await b.newContext({ viewport: { width: w, height: H[w] || 800 }, ...(o || {}) }); const p = await ctx.newPage();
    const log = { bledy: [], zadania: [] }; p.on('pageerror', (e) => log.bledy.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') log.bledy.push(m.text()); });
    p.on('request', (r) => log.zadania.push(r.url())); return { ctx, p, log }; };

  // 1. Pierwszy ekran przy 320, 390, 1280: nazwa, tytuł, film i „Pomiń film” bez przewijania; nic nie wystaje w bok; axe.
  for (const w of [320, 390, 1280]) {
    const { ctx, p, log } = await nowa(w); await p.goto(A + '/'); await p.waitForTimeout(1200);
    const m = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect();
      const nazwaWidoczna = [document.querySelector('h1'), document.querySelector('.logo')].some((e) => { const q = e.getBoundingClientRect(); return q.width > 2 && q.height > 2 && /Spinka/.test(e.textContent) && q.bottom <= innerHeight; });
      const h1 = document.querySelector('h1'); const lh = parseFloat(getComputedStyle(h1).lineHeight);
      return { h1: h1.textContent.replace(/\s+/g, ' ').trim(), liniiTytulu: Math.round(h1.getBoundingClientRect().height / lh), nazwaWidoczna, otworz: r('#otworz-demo').bottom, pismo: r('a[href="aplikacja/#pismo"]').bottom, oc: r('a[href="aplikacja/#oc"]').bottom,
        film: r('#film').bottom, pomin: r('.pomin').bottom, okno: innerHeight, bok: document.documentElement.scrollWidth - innerWidth,
        male: [...document.querySelectorAll('.naglowek a, .hero a, .hero button, .hero summary')].filter((e) => e.getClientRects().length && !e.closest('video')).map((e) => [e.textContent.trim().slice(0, 24), Math.round(e.getBoundingClientRect().height)]).filter((x) => x[1] < 44) }; });
    ok(w + ' px: na pierwszym ekranie nazwa, tytuł w 2 liniach, „Otwórz demo”, skróty „Pismo z urzędu” i „Kończy się OC”, film i „Pomiń film”; bez przewijania w bok',
      m.h1 === 'Spinka. Każda sprawa ma następny krok.' && m.liniiTytulu === 2 && m.nazwaWidoczna && [m.otworz, m.pismo, m.oc, m.film, m.pomin].every((y) => y <= m.okno) && m.bok === 0, m);
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
    const pk = await p.evaluate(() => ({ krok: getComputedStyle(document.querySelector('#koniec .postac--krok')).display, ostrzega: getComputedStyle(document.querySelector('#koniec .postac--ostrzega')).display, ukryta: document.querySelector('.koniec-postac').getAttribute('aria-hidden') }));
    ok('koniec: postać Spinki w stanie „następny krok” (poza „ostrzega” ukryta), ukryta przed czytnikiem', pk.krok === 'block' && pk.ostrzega === 'none' && pk.ukryta === 'true', pk);
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

  // 3b. Ruch strony: wejście pierwszego ekranu, odsłanianie sekcji przy przewijaniu, reakcja na najechanie; podpis autora.
  { const { ctx, p, log } = await nowa(1280); await p.goto(A + '/'); await p.waitForTimeout(150);
    const start = await p.evaluate(() => ({ ruch: document.documentElement.classList.contains('ruch'), animacje: [...document.querySelectorAll('.wejscie')].map((e) => getComputedStyle(e).animationName),
      ukryteNizej: [...document.querySelectorAll('.odslona')].filter((e) => e.getBoundingClientRect().top > innerHeight && !e.classList.contains('widoczne') && +getComputedStyle(e).opacity < 1).length,
      najnizszeKrycie: Math.min(...[...document.querySelectorAll('.wejscie, .odslona')].map((e) => +getComputedStyle(e).opacity)) }));
    ok('ruch: elementy pierwszego ekranu wchodzą animacją (pojawienie), sekcje poniżej czekają na przewinięcie; nic nie jest całkiem niewidoczne (krycie ≥ 0,3)', start.ruch && start.animacje.length >= 6 && start.animacje.every((n) => n === 'pojawienie') && start.ukryteNizej > 0 && start.najnizszeKrycie >= 0.3, start);
    await p.waitForTimeout(900);
    const pierwszy = await p.evaluate(() => [...document.querySelectorAll('.wejscie')].map((e) => +getComputedStyle(e).opacity));
    // Do samego dołu strony (runda 29: strona jest dłuższa niż 4000 px).
    for (let i = 0; i < 40 && await p.evaluate(() => scrollY + innerHeight < document.documentElement.scrollHeight - 2); i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(120); }
    await p.waitForTimeout(900);
    const po = await p.evaluate(() => ({ niewidoczne: [...document.querySelectorAll('.odslona')].filter((e) => +getComputedStyle(e).opacity < 1 || !e.classList.contains('widoczne')).map((e) => e.textContent.trim().slice(0, 30)) }));
    ok('ruch: po wejściu pierwszy ekran w pełni widoczny, po przewinięciu cała treść odsłonięta', pierwszy.every((o) => o === 1) && po.niewidoczne.length === 0, { pierwszy, ...po });
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
    await p.hover('#otworz-demo'); await p.waitForTimeout(400);
    const hover = await p.evaluate(() => ({ btn: getComputedStyle(document.getElementById('otworz-demo')).transform, logo: getComputedStyle(document.querySelector('.logo svg > g:nth-of-type(2)')).transform }));
    await p.hover('.logo'); await p.waitForTimeout(400);
    hover.logoPoNajechaniu = await p.evaluate(() => getComputedStyle(document.querySelector('.logo svg > g:nth-of-type(2)')).transform);
    ok('ruch: najechanie unosi przycisk o 2 px, spinka w logo uchyla się (-8°)', /matrix\(1, 0, 0, 1, 0, -2\)/.test(hover.btn) && hover.logo === 'none' && /^matrix\(0\.99/.test(hover.logoPoNajechaniu), hover);
    const autor = await p.evaluate(() => { const a = document.querySelector('main .autor'); const f = document.querySelector('.stopka'); const r = a.getBoundingClientRect();
      return { glowna: a.textContent.trim(), wOknie: r.bottom <= innerHeight, stopka: f.textContent.includes('Koncepcja i projekt aplikacji: Igor M.') }; });
    ok('podpis „Koncepcja i projekt aplikacji: Igor M.” widoczny na pierwszym ekranie (1280) i w stopce', autor.glowna === 'Koncepcja i projekt aplikacji: Igor M.' && autor.wOknie && autor.stopka, autor);
    ok('ruch bez błędów strony', log.bledy.length === 0, log.bledy); await ctx.close(); }
  { const { ctx, p } = await nowa(390, { hasTouch: true, isMobile: true }); await p.goto(A + '/'); await p.waitForTimeout(1200);
    const a = await p.evaluate(() => { const r = document.querySelector('main .autor').getBoundingClientRect(); return r.bottom <= innerHeight; });
    ok('podpis autora widoczny na pierwszym ekranie przy 390 px', a); await ctx.close(); }
  for (const w of [320, 1280]) {
    const { ctx, p } = await nowa(w, { reducedMotion: 'reduce' }); await p.goto(A + '/'); await p.waitForTimeout(100);
    const r = await p.evaluate(() => ({ ruch: document.documentElement.classList.contains('ruch'), animacje: [...document.querySelectorAll('.wejscie')].map((e) => getComputedStyle(e).animationName).filter((n) => n !== 'none'),
      niewidoczne: [...document.querySelectorAll('.wejscie, .odslona')].filter((e) => +getComputedStyle(e).opacity < 1 || getComputedStyle(e).transform !== 'none').length }));
    ok(w + ' px, ograniczony ruch: od razu cała treść widoczna, bez animacji wejścia i odsłaniania', !r.ruch && r.animacje.length === 0 && r.niewidoczne === 0, r); await ctx.close(); }

  // 4. Klawiatura: link „Przejdź do treści” na początku, widoczny fokus, „Pomiń film” osiągalny Tabem.
  { const { ctx, p } = await nowa(1280); await p.goto(A + '/'); await p.waitForTimeout(500);
    const kroki = [];
    for (let i = 0; i < 20; i++) { await p.keyboard.press('Tab'); kroki.push(await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
      return { el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : ''), tekst: (e.textContent || '').trim().slice(0, 30), obwodka: cs.outlineStyle + ' ' + cs.outlineWidth, widoczny: r.top >= 0 && r.bottom <= innerHeight && r.width > 0 }; })); }
    const linki = kroki.filter((k) => k.el.startsWith('a'));
    ok('klawiatura: pierwszy Tab to „Przejdź do treści”, widoczny', kroki[0].tekst === 'Przejdź do treści' && kroki[0].widoczny, kroki[0]);
    ok('klawiatura: każdy link ma widoczną obwódkę fokusu 3 px', linki.every((k) => k.obwodka === 'solid 3px'), linki);
    const i = (f) => kroki.findIndex(f);
    const kol = [i((k) => k.el.startsWith('a.btn') && k.tekst === 'Otwórz demo'), i((k) => /Pomiń film/.test(k.tekst)), i((k) => k.el.startsWith('video')), i((k) => k.el.startsWith('a#otworz-demo')), i((k) => k.tekst === 'Pismo z urzędu'), i((k) => k.tekst === 'Kończy się OC')];
    ok('klawiatura: Tab dochodzi kolejno do „Otwórz demo” w nagłówku, „Pomiń film”, filmu, „Otwórz demo” w otwarciu i obu skrótów (jak na ekranie telefonu)', kol.every((x, n) => x >= 0 && (n === 0 || x > kol[n - 1])), kroki.map((k) => k.el + ' ' + k.tekst));
    await ctx.close(); }

  // 5. „Pomiń film” prowadzi do prawdziwej demonstracji (sprawdzony build aplikacji, bajt w bajt); bezpośredni adres na telefonie i komputerze.
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
    ok('/aplikacja/ to sprawdzony build aplikacji bajt w bajt (MD5 ' + APLIKACJA_MD5.slice(0, 8) + ')', crypto.createHash('md5').update(Buffer.from(html)).digest('hex') === APLIKACJA_MD5); }
  for (const w of [390, 1280]) {
    const { ctx, p, log } = await nowa(w, w === 390 ? { hasTouch: true, isMobile: true } : {});
    await p.goto(A + '/aplikacja/'); await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 });
    await p.click('[data-act=entry-demo]'); await p.waitForTimeout(300); await p.click('[data-act=enter]'); await p.waitForTimeout(1200);
    const s = await p.evaluate(() => ({ h1: (document.querySelector('#main h1') || {}).textContent, przewodnik: getComputedStyle(document.querySelector('.guide')).display }));
    await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(900);
    const c = await p.evaluate(() => document.querySelector('#chat-h').textContent);
    ok(w + ' px: bezpośredni adres /aplikacja/: wejście, Start, rozmowa „Zapytaj Spinkę”' + (w === 1280 ? ', przewodnik obok telefonu' : ''), s.h1 === 'Start' && c === 'Zapytaj Spinkę' && (w === 390 || s.przewodnik === 'block') && log.bledy.length === 0, { ...s, c, bledy: log.bledy });
    await ctx.close(); }

  // 5b. Demonstracja: prawdziwe ekrany aplikacji; na dużym ekranie wskazanie kroku (mysz, Tab) wysuwa jego ekran na wierzch.
  { const { ctx, p, log } = await nowa(1280); await p.goto(A + '/#demonstracja'); await p.waitForTimeout(1200);
    const poz = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.ekran')].map((e) => [e.dataset.ekran, e.dataset.poz])));
    const obrazy = await p.evaluate(() => [...document.querySelectorAll('.ekran img')].map((i) => ({ src: i.getAttribute('src'), w: i.naturalWidth, alt: i.alt.length })));
    ok('demonstracja: trzy zrzuty prawdziwych ekranów aplikacji wczytane, każdy z opisem (alt)', obrazy.length === 3 && obrazy.every((o) => /^obrazy\/.+\.webp$/.test(o.src) && o.w > 0 && o.alt > 20), obrazy);
    const p0 = await poz(); await p.hover('.krok[data-ekran=wybor]'); await p.waitForTimeout(650); const p1 = await poz();
    await p.focus('.krok[data-ekran=przypomnienie] a'); await p.waitForTimeout(650); const p2 = await poz();
    const aktywny = await p.evaluate(() => [...document.querySelectorAll('.krok.aktywny')].map((k) => k.dataset.ekran));
    ok('demonstracja (1280): na starcie z przodu „Pismo”, najechanie na krok i fokus z klawiatury wysuwają jego ekran; aktywny krok oznaczony',
      p0.pismo === 'srodek' && p1.wybor === 'srodek' && p2.przypomnienie === 'srodek' && aktywny.join() === 'przypomnienie', { p0, p1, p2, aktywny });
    const linki = await p.evaluate(() => ({ kroki: [...document.querySelectorAll('.krok a')].map((a) => a.getAttribute('href')), demo: document.querySelector('.demo-akcje .btn').getAttribute('href') }));
    ok('demonstracja: linki kroków prowadzą do #pismo, #oc i wejścia demo; przycisk do /aplikacja/', linki.kroki.join() === 'aplikacja/#pismo,aplikacja/#oc,aplikacja/' && linki.demo === 'aplikacja/', linki);
    await p.click('.demo-akcje .btn'); await p.waitForURL(A + '/aplikacja/'); await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 });
    ok('demonstracja: „Otwórz demonstrację” otwiera aplikację, bez błędów', (await p.title()) === 'Co chcesz załatwić?' && log.bledy.length === 0, log.bledy); await ctx.close(); }
  { const { ctx, p } = await nowa(390, { hasTouch: true, isMobile: true }); await p.goto(A + '/#demonstracja'); await p.waitForTimeout(1000);
    const r = await p.evaluate(() => { const e = document.getElementById('ekrany'); return { przewijany: e.scrollWidth > e.clientWidth + 50, stos: e.classList.contains('stos') && getComputedStyle(e).display === 'block', bok: document.documentElement.scrollWidth - innerWidth,
      podpisy: [...e.querySelectorAll('figcaption')].filter((f) => f.getClientRects().length).length }; });
    ok('demonstracja (390): ekrany w poziomym rzędzie do przesuwania kciukiem, z podpisami; strona nie przewija się w bok', r.przewijany && !r.stos && r.podpisy === 3 && r.bok === 0, r); await ctx.close(); }
  { const { ctx, p } = await nowa(1280, { reducedMotion: 'reduce' }); await p.goto(A + '/#demonstracja'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => [...document.querySelectorAll('.ekran, .krok')].map((e) => getComputedStyle(e).transitionDuration).filter((d) => d !== '0s'));
    ok('demonstracja, ograniczony ruch: ekrany i kroki zmieniają się bez przejść', r.length === 0, r); await ctx.close(); }

  // 5c. Nagłówki w najwyżej 2 liniach, tekst co najmniej 15 px, autor w sekcji „O projekcie” i stopce; axe po odsłonięciu całej strony.
  for (const w of [320, 390, 768, 960, 1024, 1440]) {
    const { ctx, p } = await nowa(w, w < 600 ? { hasTouch: true, isMobile: true } : {}); await p.goto(A + '/'); await p.waitForTimeout(400);
    const H2 = await p.evaluate(() => document.body.scrollHeight); for (let y = 0; y < H2; y += 400) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(60); } await p.waitForTimeout(900);
    const m = await p.evaluate(() => {
      const linie = (e) => { const r = document.createRange(); r.selectNodeContents(e); const tops = new Set([...r.getClientRects()].filter((q) => q.width > 1).map((q) => Math.round(q.top))); return tops.size; };
      const naglowki = [...document.querySelectorAll('h1 .linia, h2, .krok h3')].map((e) => [e.textContent.trim().slice(0, 30), linie(e)]).filter((x) => x[1] > 2);
      const male = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() && e.getClientRects().length && !e.closest('[aria-hidden=true], .sr-only, video'))
        .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 15).map((e) => e.textContent.trim().slice(0, 20));
      return { zaDlugie: naglowki, male, autorProjekt: (document.querySelector('#o-projekcie .podpis') || {}).textContent.replace(/\s+/g, ' ').trim(), bok: document.documentElement.scrollWidth - innerWidth }; });
    ok(w + ' px: tytuł i nagłówki sekcji w najwyżej 2 liniach, brak tekstu poniżej 15 px, bez przewijania w bok', m.zaDlugie.length === 0 && m.male.length === 0 && m.bok === 0, m);
    if (w === 390 || w === 1440) { ok(w + ' px: autor w sekcji „O projekcie”', /Koncepcja i projekt aplikacji\s*Igor M\./.test(m.autorProjekt), m.autorProjekt);
      const v = await axe(p); ok(w + ' px: axe bez naruszeń (cała strona po odsłonięciu sekcji)', v.length === 0, v); }
    await ctx.close(); }

  // 5c'. Treści o asystencie zgodne z buildem aplikacji (tu: bez serwera z modelem), sekcja z prawdziwymi ekranami Profilu, film v9.
  { const { ctx, p } = await nowa(1440); await p.goto(A + '/'); await p.waitForTimeout(400);
    const t = await p.evaluate(() => ({ pasek: document.querySelector('.pasek-proto').textContent, fakty: [...document.querySelectorAll('.fakt dt')].map((d) => d.textContent), faktAI: [...document.querySelectorAll('.fakt')].find((f) => /AI tylko z danych/.test(f.textContent)).textContent,
      stopka: document.querySelector('.stopka-noty').textContent, regul: /gotowych reguł|gotowe reguły/i.test(document.body.innerText), sekcja: (document.querySelector('#dane-h') || {}).textContent,
      ekrany: [...document.querySelectorAll('#dane img')].map((i) => i.getAttribute('src')), film: document.querySelector('#film source').getAttribute('src'), plakat: document.querySelector('#film').getAttribute('poster'), napisy: document.querySelector('#film track').getAttribute('src') }));
    ok('treści o asystencie zgodne z wersją bez serwera: pasek „nic nie jest wysyłane”, fakt „AI tylko z danych aplikacji” mówi, że model nie jest podłączony; nigdzie „gotowe reguły”',
      /nic nie jest wysyłane/.test(t.pasek) && t.fakty.includes('AI tylko z danych aplikacji') && t.fakty.includes('Bez zgody nic nie wychodzi') && /model nie jest podłączony/.test(t.faktAI) && /nie ma serwera z modelem AI/.test(t.stopka) && !t.regul, t);
    ok('sekcja „Asystent mówi, skąd wie” z dwoma prawdziwymi ekranami Profilu', t.sekcja === 'Asystent mówi, skąd wie' && t.ekrany.join() === 'obrazy/profil-o-prototypie.webp,obrazy/profil-dane-dla-ai.webp', t);
    ok('strona używa filmu v9 (plakat, napisy); v8 zostaje w źródłach do porównania', /spinka-film-v9\.mp4$/.test(t.film) && /v9-plakat/.test(t.plakat) && /v9\.pl\.vtt$/.test(t.napisy), t);
    await ctx.close(); }

  // 5d. Typografia i postać: antykwa w nagłówkach bez ciężkich pogrubień, pięć stanów postaci, ruch postaci tylko bez „ograniczaj animacje”.
  { const { ctx, p, log } = await nowa(1440); await p.goto(A + '/'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    const t = await p.evaluate(() => ({ fonty: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')),
      // Runda 29: wyjątek na prośbę autora: hasło na czerwonej planszy otwarcia (i puste rzędy w tle) w Archivo 900, jak plansze filmu v8.
      naglowki: [...document.querySelectorAll('h1, h2, h3, dt, .logo')].filter((e) => !e.closest('.plansza')).map((e) => [e.tagName, getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g, ''), +getComputedStyle(e).fontWeight]),
      plansza: [...document.querySelectorAll('.plansza h1, .plansza .duch')].map((e) => [getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g, ''), +getComputedStyle(e).fontWeight]),
      tekst: getComputedStyle(document.querySelector('.krok p')).fontFamily.split(',')[0].replace(/"/g, ''), pogrubione: [...document.querySelectorAll('main *, header *, footer *')].filter((e) => !e.closest('.plansza') && e.childElementCount === 0 && e.textContent.trim() && +getComputedStyle(e).fontWeight >= 700).map((e) => e.textContent.trim().slice(0, 20)) }));
    ok('typografia: nagłówki w Poltawski Nowy (waga najwyżej 500), tekst w Atkinson Hyperlegible Next, nic w wadze 700+ poza planszą otwarcia (Archivo 900, jak w filmie); fonty z własnego adresu',
      t.fonty.includes('Poltawski Nowy') && t.fonty.includes('Archivo Plansza') && t.plansza.length === 3 && t.plansza.every((x) => x[0] === 'Archivo Plansza' && x[1] === 900) && t.naglowki.every((n) => n[1] === 'Poltawski Nowy' && n[2] <= 500) && t.tekst === 'Atkinson Hyperlegible Next' && t.pogrubione.length === 0 && !log.zadania.some((u) => /plex/i.test(u)), t);
    const st = await p.evaluate(() => [...document.querySelectorAll('.postac-stany li')].map((li) => [li.querySelector('svg').getAttribute('class').replace('postac postac--', ''), li.textContent.trim(), li.querySelector('svg').getAttribute('aria-hidden')]));
    ok('postać: te same pięć stanów co w aplikacji (słucha, wyjaśnia, ostrzega, następny krok, gotowe) z podpisami; rysunki ukryte przed czytnikiem',
      st.map((x) => x[0]).join() === 'slucha,wyjasnia,ostrzega,krok,gotowe' && st.every((x) => x[1].length > 10 && x[2] === 'true'), st);
    await p.evaluate(() => document.querySelector('.postac-blok').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    const ruch = await p.evaluate(() => [...document.querySelectorAll('.postac-stany .postac-cialo, .postac-stany .postac-klips, .postac-stany .postac-strzalka, .postac-stany .postac-ptaszek, .postac-stany .postac-linia')].map((e) => getComputedStyle(e).animationName).filter((n) => n !== 'none'));
    await p.waitForTimeout(1800);
    const poRuchu = await p.evaluate(() => [...document.querySelectorAll('.postac-stany .postac-cialo, .postac-stany .postac-klips')].map((e) => e.getAnimations().filter((a) => a.playState === 'running').length).reduce((a, b) => a + b, 0));
    ok('postać: przy wejściu w widok każdy stan gra swój ruch raz, po ok. 1,5 s wszystko stoi (bez pętli)', ruch.length >= 5 && poRuchu === 0, { ruch, poRuchu }); await ctx.close(); }
  { const { ctx, p } = await nowa(1440, { reducedMotion: 'reduce' }); await p.goto(A + '/'); await p.evaluate(() => document.querySelector('.postac-blok').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ animacje: [...document.querySelectorAll('.postac *')].map((e) => getComputedStyle(e).animationName).filter((n) => n !== 'none'),
      strzalka: getComputedStyle(document.querySelector('.postac-stany .postac--krok .postac-strzalka')).display, ptaszek: getComputedStyle(document.querySelector('.postac-stany .postac--gotowe .postac-ptaszek')).display }));
    ok('postać, ograniczony ruch: od razu pozy końcowe (strzałka, ptaszek), bez żadnej animacji', r.animacje.length === 0 && r.strzalka !== 'none' && r.ptaszek !== 'none', r); await ctx.close(); }

  { const bok = {}; for (const w of [320, 360, 390, 480, 600, 719, 720, 768, 959, 960, 1024, 1100, 1280, 1440, 1920, 2560]) {
      const { ctx, p } = await nowa(w); await p.goto(A + '/'); await p.waitForTimeout(300); bok[w] = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); await ctx.close(); }
    ok('16 szerokości od 320 do 2560 px: strona nigdzie nie przewija się w bok', Object.values(bok).every((x) => x === 0), bok); }

  // 6. Film się nie wczytał (strona zbudowana bez filmu): komunikat i przejście do demonstracji, bez kradzieży fokusu i przewijania.
  for (const w of [320, 1280]) {
    const { ctx, p } = await nowa(w); await p.goto(B + '/'); await p.waitForTimeout(1200);
    const e = await p.evaluate(() => ({ film: document.getElementById('film-blok').hidden, panel: !document.getElementById('koniec').hidden, tekst: document.getElementById('koniec-tekst').textContent,
      powtorka: document.getElementById('jeszcze-raz').hidden, fokus: document.activeElement === document.body, scroll: scrollY, cta: document.getElementById('do-demo').getBoundingClientRect().bottom <= innerHeight }));
    e.postac = await p.evaluate(() => [...document.querySelectorAll('#koniec .postac')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.getAttribute('class')).join());
    ok(w + ' px bez filmu: zamiast odtwarzacza komunikat i „Przejdź do demonstracji” na pierwszym ekranie, postać w stanie „ostrzega”; fokus i przewinięcie bez zmian', /postac--ostrzega/.test(e.postac) && !/postac--krok/.test(e.postac) && e.film && e.panel && /niedostępny/.test(e.tekst) && e.powtorka && e.fokus && e.scroll === 0 && e.cta, e);
    const v = await axe(p); ok(w + ' px bez filmu: axe bez naruszeń', v.length === 0, v); await ctx.close(); }

  await b.close();
  for (const r of R) console.log((r.ok ? '✓ ' : '✗ ') + r.co + (r.ok ? '' : '\n    ' + JSON.stringify(r.sz).slice(0, 600)));
  console.log('RAZEM ' + R.length + ' | nieudane ' + R.filter((r) => !r.ok).length);
})();
