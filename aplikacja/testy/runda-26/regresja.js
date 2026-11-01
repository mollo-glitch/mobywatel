// Runda 25: testy regresyjne do poprawek 1–10 z audytu. argv: [2] port (domyślnie 8200). Wynik: lista { nr, co, ok, szczegoly }.
const L = require('./lib.js'); const fs = require('fs');
L.BASE = 'http://127.0.0.1:' + (process.argv[2] || '8200');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const R = []; const ok = (nr, co, w, sz) => R.push({ nr, co, ok: !!w, szczegoly: sz });
const PREV = 'data:text/html,<title>poprzednia</title><h1>Poprzednia strona</h1>';
const inApp = (p) => p.url().startsWith(L.BASE);
const scr = (p) => p.evaluate(() => { const v = document.querySelector('#main > .screen'); return v ? v.className.replace('screen ', '') : null; }).catch(() => null);
const vis = (p, id) => p.evaluate((id) => { const e = document.getElementById(id); return !!e && !e.hidden; }, id).catch(() => null);
const back = async (p) => { await p.goBack({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(900); };
const sec = async (nr, label, fn) => { try { await fn(); } catch (e) { ok(nr, label + ': PRZERWANE (' + e.message.split('\n')[0].slice(0, 120) + ')', false); } finally { for (const br of open) await br.close().catch(() => {}); open.length = 0; } };
const open = []; const L0 = L.open; L.open = async (o) => { const r = await L0(o); open.push(r.b); return r; };
(async () => {
  // ---------- 1. Systemowy „wstecz” ----------
  await sec(1, 'wstecz', async () => {
  for (const W of [390, 320]) {
    const { b, p, log } = await L.open({ w: W });
    await p.goto(PREV); await L.enter(p);
    await p.click('.tabbar [data-tab=docs]'); await p.waitForTimeout(500);
    await p.evaluate(() => { const r = document.querySelector('#main .doc-list .row[data-id=pojazd]'); r.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300);
    const s0 = await p.evaluate(() => Math.round(document.querySelector('#main > .screen').scrollTop));
    await p.click('#main .doc-list .row[data-id=pojazd]'); await p.waitForTimeout(800);
    await back(p);
    const a = { app: inApp(p), ekran: await scr(p), przew: await p.evaluate(() => Math.round(document.querySelector('#main > .screen').scrollTop)), fokus: await p.evaluate(() => document.activeElement.dataset.id || document.activeElement.className) };
    ok(1, W + ' px: dokument → wstecz → lista Dokumentów, to samo przewinięcie, fokus na wierszu', a.app && a.ekran === 'docs' && Math.abs(a.przew - s0) <= 1 && a.fokus === 'pojazd', { ...a, przewPrzed: s0 });
    await back(p); ok(1, W + ' px: na liście (korzeń) wstecz opuszcza prototyp jednym naciśnięciem', !inApp(p), p.url().slice(0, 30));
    // Dokument → „Kto ma dostęp” (głębokość 3) → wstecz ×2 → lista → wstecz → poza.
    await p.goForward().catch(() => {}); await p.waitForTimeout(1500);
    if (!inApp(p)) { await L.enter(p); }
    await p.click('.tabbar [data-tab=docs]'); await p.waitForTimeout(500); await p.click('#main .doc-list .row[data-id=dowod]'); await p.waitForTimeout(800);
    await p.click('#main [data-go=access]'); await p.waitForTimeout(700);
    await back(p); const d1 = await scr(p); await back(p); const d2 = await scr(p); await back(p);
    ok(1, W + ' px: dostęp do danych → wstecz → dokument → wstecz → lista → wstecz → poza', d1 === 'doc' && d2 === 'docs' && !inApp(p), { d1, d2, url: p.url().slice(0, 20) });
    ok(1, W + ' px: bez błędów strony', !log.strona.length && !log.konsola.length, log);
    await b.close();
  }
  { const { b, p, log } = await L.open({ w: 390 });
    await p.goto(PREV); await L.enter(p);
    // Okno sprawy, potwierdzenie w oknie, arkusz głosowy, panel wiadomości.
    await p.click('.ec-slide.on button'); await p.waitForTimeout(1000); await p.click('#envd [data-act=envd-more]'); await p.waitForTimeout(600);
    await back(p); const c1 = { potwierdzenie: await vis(p, 'confirm'), okno: await vis(p, 'envd'), app: inApp(p) };
    await back(p); const c2 = { okno: await vis(p, 'envd'), ekran: await scr(p), app: inApp(p) };
    ok(1, 'potwierdzenie w oknie sprawy: wstecz zamyka potwierdzenie, drugie wstecz zamyka okno', !c1.potwierdzenie && c1.okno && c1.app && !c2.okno && c2.ekran === 'start' && c2.app, { c1, c2 });
    await p.click('[data-act=voice][data-voice=home]'); await p.waitForTimeout(800); await back(p);
    ok(1, 'arkusz głosowy: wstecz zamyka arkusz', !(await vis(p, 'voice')) && inApp(p), p.url().slice(0, 30));
    await p.click('#env-btn'); await p.waitForTimeout(500); await back(p);
    ok(1, 'panel wiadomości: wstecz zamyka panel', !(await vis(p, 'msgs')) && inApp(p), p.url().slice(0, 30));
    await back(p); ok(1, 'Start bez okien: wstecz opuszcza prototyp', !inApp(p), p.url().slice(0, 30));
    // „Wróć” w aplikacji, potem systemowy wstecz: bez „pustego” naciśnięcia.
    await p.goForward().catch(() => {}); await p.waitForTimeout(1500); if (!inApp(p)) await L.enter(p);
    await p.click('.tabbar [data-tab=docs]'); await p.waitForTimeout(500); await p.click('#main .doc-list .row[data-id=kdr]'); await p.waitForTimeout(800);
    await p.click('#topbar [data-act=back]'); await p.waitForTimeout(900); await back(p);
    ok(1, '„Wróć” w aplikacji, potem systemowy wstecz: od razu poza (bez pustego naciśnięcia)', !inApp(p), p.url().slice(0, 30));
    // Zakładka zamiast „Wróć”.
    await p.goForward().catch(() => {}); await p.waitForTimeout(1500); if (!inApp(p)) await L.enter(p);
    await p.click('.tabbar [data-tab=docs]'); await p.waitForTimeout(500); await p.click('#main .doc-list .row[data-id=kdr]'); await p.waitForTimeout(800);
    await p.click('.tabbar [data-tab=start]'); await p.waitForTimeout(900); await back(p);
    ok(1, 'zmiana zakładki ze szczegółów, potem wstecz: poza (bez pustego naciśnięcia)', !inApp(p), p.url().slice(0, 30));
    // Szybko: „Wróć” i od razu inny dokument, potem wstecz.
    await p.goForward().catch(() => {}); await p.waitForTimeout(1500); if (!inApp(p)) await L.enter(p);
    await p.click('.tabbar [data-tab=docs]'); await p.waitForTimeout(500); await p.click('#main .doc-list .row[data-id=kdr]'); await p.waitForTimeout(800);
    await p.click('#topbar [data-act=back]'); await p.click('#main .doc-list .row[data-id=ekuz]'); await p.waitForTimeout(1200);
    const q0 = await p.evaluate(() => document.querySelector('#main h1').textContent); await back(p);
    ok(1, 'szybko „Wróć” i inny dokument, potem wstecz: wraca na listę', q0 === 'Karta EKUZ' && (await scr(p)) === 'docs' && inApp(p), { q0, ekran: await scr(p) });
    // „Dalej” przeglądarki po wstecz.
    await p.click('#main .doc-list .row[data-id=paszport]'); await p.waitForTimeout(800); await back(p);
    await p.goForward().catch(() => {}); await p.waitForTimeout(900); const f1 = { app: inApp(p), ekran: await scr(p) }; await back(p);
    ok(1, '„dalej” po wstecz: aplikacja zostaje na liście, następne wstecz wychodzi', f1.app && f1.ekran === 'docs' && !inApp(p), { f1, url: p.url().slice(0, 20) });
    ok(1, 'bez błędów strony (okna)', !log.strona.length && !log.konsola.length, log); await b.close();
  }
    });
// ---------- 2. Okna modalne trzymają fokus (arkusz głosowy; także okno sprawy i potwierdzenie przy 1280 px) ----------
  await sec(2, 'fokus w oknach', async () => {
  for (const W of [390, 1280]) {
    const { b, p } = await L.open({ w: W, touch: false }); await L.enter(p);
    const cycle = async (inside, n, shift) => { const out = []; for (let k = 0; k < n; k++) { await p.keyboard.press(shift ? 'Shift+Tab' : 'Tab'); await p.waitForTimeout(60); out.push(await p.evaluate((s) => !!document.activeElement.closest(s) || document.activeElement === document.body, inside)); } return out.every(Boolean); };
    await p.evaluate(() => document.querySelector('[data-act=voice][data-voice=home]').focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
    const v = (await cycle('#voice', 25)) && (await cycle('#voice', 12, true));
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    const back1 = await p.evaluate(() => document.activeElement.matches('[data-act=voice][data-voice=home]'));
    await p.keyboard.press('Tab'); const free = await p.evaluate(() => !document.querySelector('#main').closest('[inert]') && !document.querySelector('#main').inert && !document.querySelector('.tabbar').inert);
    ok(2, W + ' px: arkusz głosowy: 25× Tab i 12× Shift+Tab zostają w arkuszu; Escape wraca na mikrofon; tło znów aktywne', v && back1 && free, { v, back1, free });
    await p.click('.ec-slide.on button'); await p.waitForTimeout(1000);
    const e = await cycle('#envd', 20); await p.click('#envd [data-act=envd-more]'); await p.waitForTimeout(600); const c = await cycle('#confirm', 10);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    ok(2, W + ' px: okno sprawy i potwierdzenie też trzymają fokus (także przewodnik obok telefonu wyłączony)', e && c, { e, c, przewodnikAktywnyPoZamknieciu: await p.evaluate(() => { const g = document.querySelector('.guide'); return !g || !g.inert; }) });
    await b.close();
  }
    });
// ---------- 3. Długie ciągi bez spacji ----------
  await sec(3, 'długie ciągi', async () => {
  for (const W of [320, 390]) {
    const { b, p } = await L.open({ w: W }); await L.enter(p); await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(700);
    const res = [];
    for (const s of ['PL61109010140000071219812874', 'https://www.podatki.gov.pl/pit/wyjasnienia/wezwanieodliczenieinternet2025.pdf', 'tomasz.kowalczyk.przykladowy.adres@poczta-przykladowa.example.com', 'USWPrzykladowie/2026/PIT37/0001234567/OD', 'A'.repeat(600)]) {
      await p.fill('#chat-input', s); await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
      res.push(await p.evaluate((s) => { const sc = document.querySelector('.chat-scroll'); const bs = Array.from(sc.querySelectorAll('.msg.me .bubble')).filter((x) => x.textContent.includes(s.slice(0, 20))); const r = bs.length ? bs[bs.length - 1].getBoundingClientRect() : null; return { wBok: sc.scrollWidth - sc.clientWidth, prawa: r && Math.round(r.right), ekran: innerWidth }; }, s));
    }
    ok(3, W + ' px: 5 długich ciągów (konto, link, e-mail, sygnatura, 600 znaków): rozmowa nie przewija się w bok, dymek w ekranie', res.every((r) => r.wBok === 0 && r.prawa !== null && r.prawa <= r.ekran), res);
    await b.close();
  }
    });
// ---------- 4. Ustawione przypomnienie ----------
  await sec(4, 'przypomnienie', async () => {
  { const { b, p } = await L.open({ w: 390 }); await L.enter(p);
    await p.click('.ec-slide.on button'); await p.waitForTimeout(1000);
    const before = await p.evaluate(() => Array.from(document.querySelectorAll('#envd [data-act=envd-more]')).map((x) => x.innerText.trim()));
    await p.click('#envd [data-act=envd-more]'); await p.waitForTimeout(500); await p.click('#confirm-yes'); await p.waitForTimeout(800);
    const after = await p.evaluate(() => ({ przyciski: document.querySelectorAll('#envd [data-act=envd-more]').length, stan: (document.querySelector('#envd .envd-set') || {}).textContent, gora: (document.querySelector('#envd .envd-rem') || {}).textContent }));
    await p.evaluate(() => { const s = document.querySelector('#envd .envd-set'); if (s) s.click(); }); await p.waitForTimeout(500);
    const conf = await vis(p, 'confirm');
    await p.screenshot({ path: 'r25-4-przypomnienie.png' });
    await p.keyboard.press('Escape'); await p.waitForTimeout(700); await p.click('.ec-slide.on button'); await p.waitForTimeout(1000);
    const reopen = await p.evaluate(() => ({ przyciski: document.querySelectorAll('#envd [data-act=envd-more]').length, stan: (document.querySelector('#envd .envd-set') || {}).textContent }));
    ok(4, 'koperta OC: przed ustawieniem przycisk; po ustawieniu stan „ustawione”, bez przycisku i bez ponownego pytania; tak samo po ponownym otwarciu', before.length === 1 && after.przyciski === 0 && /ustawione na poniedziałek, 2 listopada/.test(after.stan) && !conf && reopen.przyciski === 0 && /ustawione/.test(reopen.stan), { before, after, ponownePytanie: conf, reopen });
    await b.close(); }
  { const { b, p } = await L.open({ w: 390 }); await p.goto(L.BASE + '/index.html#oc'); await p.waitForTimeout(5500);
    for (const t of ['Co mogę zrobić?', 'Zostaję w obecnym', 'Tak, przypomnij']) { await p.click('.chat-log button:has-text("' + t + '")'); await p.waitForTimeout(1800); }
    await p.click('.chat-log button:has-text("Otwórz tę sprawę")'); await p.waitForTimeout(1200);
    const st = await p.evaluate(() => ({ przyciski: document.querySelectorAll('#envd [data-act=envd-more]').length, stan: (document.querySelector('#envd .envd-set') || {}).textContent }));
    ok(4, 'przypomnienie ustawione w rozmowie (scenariusz OC): okno sprawy pokazuje stan „ustawione”', st.przyciski === 0 && /ustawione/.test(st.stan || ''), st);
    await b.close(); }
    });
// ---------- 5. Plik do wniosku ----------
  await sec(5, 'plik', async () => {
  { const { b, p } = await L.open({ w: 390 }); await p.goto(L.BASE + '/index.html#dowod'); await p.waitForTimeout(5500);
    await p.click('button:has-text("Dane są poprawne")'); await p.waitForTimeout(1500);
    const sel = '.chat-log .qcard:last-of-type input[type=file]';
    await p.setInputFiles('.chat-log input[type=file]', 'nie-obraz.txt'); await p.waitForTimeout(600);
    const t1 = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.chat-log .qcard')).pop(); const e = c.querySelector('.file-err'); return { blad: e && e.textContent, rola: e && e.getAttribute('role'), uzyj: !!c.querySelector('[data-ok]'), dodano: document.querySelector('.chat-log').innerText.includes('Dodałem plik: nie-obraz.txt') }; });
    await p.screenshot({ path: 'r25-5-plik-txt.png' });
    await p.setInputFiles('.chat-log input[type=file]', { name: 'dokument.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }); await p.waitForTimeout(500);
    const t2 = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.chat-log .qcard')).pop(); return { blad: !!c.querySelector('.file-err'), uzyj: !!c.querySelector('[data-ok]') }; });
    await p.setInputFiles('.chat-log input[type=file]', { name: 'zdjecie.heic', mimeType: '', buffer: Buffer.from('x') }); await p.waitForTimeout(500);
    const t3 = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.chat-log .qcard')).pop(); return { blad: !!c.querySelector('.file-err'), uzyj: !!c.querySelector('[data-ok]') }; });
    await p.setInputFiles('.chat-log input[type=file]', 'zdjecie-testowe.jpg'); await p.waitForTimeout(500);
    const t4 = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.chat-log .qcard')).pop(); return { blad: !!c.querySelector('.file-err'), uzyj: !!c.querySelector('[data-ok]') }; });
    ok(5, 'zdjęcie do dowodu: .txt odrzucony z komunikatem (role=alert), .pdf odrzucony, .heic bez typu przyjęty, .jpg przyjęty', t1.blad && t1.rola === 'alert' && !t1.uzyj && !t1.dodano && t2.blad && !t2.uzyj && !t3.blad && t3.uzyj && !t4.blad && t4.uzyj, { t1, t2, t3, t4 });
    await b.close(); }
  { const { b, p } = await L.open({ w: 390 }); await p.goto(L.BASE + '/index.html#pismo'); await p.waitForTimeout(5500);
    for (const t of ['Tak, to pismo', 'Co mogę z tym zrobić?', 'Odpowiem i dołączę fakturę']) { await p.click('.chat-log button:has-text("' + t + '")'); await p.waitForTimeout(1800); }
    await p.setInputFiles('.chat-log input[type=file]', 'nie-obraz.txt'); await p.waitForTimeout(500);
    const a1 = await p.evaluate(() => !!Array.from(document.querySelectorAll('.chat-log .qcard')).pop().querySelector('.file-err'));
    await p.setInputFiles('.chat-log input[type=file]', { name: 'faktura.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') }); await p.waitForTimeout(500);
    const a2 = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.chat-log .qcard')).pop(); return !c.querySelector('.file-err') && !!c.querySelector('[data-ok]'); });
    ok(5, 'faktura do pisma (zdjęcie albo PDF): .txt odrzucony, .pdf przyjęty', a1 && a2, { a1, a2 }); await b.close(); }
    });
// ---------- 6. Powitanie ----------
  await sec(6, 'powitanie', async () => {
  for (const W of [320, 360, 390]) for (const big of [false, true]) {
    const { b, p } = await L.open({ w: W }); await L.enter(p, big);
    const r = await p.evaluate(() => { const n = document.querySelector('.hello-name'); return { tekst: n.textContent, potrzebne: n.scrollWidth, widoczne: n.clientWidth, przyciski: Array.from(document.querySelectorAll('#topbar .tb-btn, #topbar .tb-avatar')).map((x) => Math.round(Math.min(x.getBoundingClientRect().width, x.getBoundingClientRect().height))) }; });
    ok(6, W + ' px' + (big ? ', większy tekst' : '') + ': „' + r.tekst + '” mieści się w powitaniu; przyciski nagłówka ≥ 44 px', r.potrzebne <= r.widoczne && r.przyciski.every((x) => x >= 44), r);
    if (W === 320 && big) await p.screenshot({ path: 'r25-6-powitanie-320-duzy.png', clip: { x: 0, y: 0, width: 320, height: 120 } });
    await b.close();
  }
    });
// ---------- 7. Jedyne identyfikatory ----------
  await sec(7, 'identyfikatory', async () => {
  for (const W of [390, 1280]) {
    const { b, p } = await L.open({ w: W }); await L.enter(p); const dups = {};
    const chk = async (label) => { const d = await p.evaluate(() => { const ids = {}; document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; }); return Object.keys(ids).filter((k) => ids[k] > 1); }); if (d.length) dups[label] = d; };
    await chk('Start'); for (const t of ['docs', 'cases', 'chat', 'more']) { await p.click('.tabbar [data-tab=' + t + ']'); await p.waitForTimeout(500); await chk(t); }
    await p.click('[data-go=about]'); await p.waitForTimeout(500); await chk('O prototypie'); const dd = await p.evaluate(() => Array.from(document.querySelectorAll('#main .guide-fine, .guide .guide-fine')).map((x) => x.textContent.includes('26 października 2026')));
    await p.click('#topbar [data-act=back]'); await p.waitForTimeout(400); await p.click('[data-go=access]'); await p.waitForTimeout(500); await chk('Dostęp');
    ok(7, W + ' px: żaden identyfikator się nie powtarza (Start, 4 zakładki, O prototypie, dostęp); data pokazu nadal widoczna', !Object.keys(dups).length && dd.length >= 1 && dd.every(Boolean), { dups, dataWidoczna: dd });
    await b.close();
  }
    });
// ---------- 8. Karuzela Dokumentów dla czytnika ----------
  await sec(8, 'karuzela', async () => {
  { const { b, p, ctx } = await L.open({ w: 390 }); await L.enter(p); await p.click('.tabbar [data-tab=docs]'); await p.waitForTimeout(600);
    const cdp = await ctx.newCDPSession(p);
    const axNode = async () => { const { result } = await cdp.send('Runtime.evaluate', { expression: 'document.querySelector(".car-stage")' }); const { node } = await cdp.send('DOM.describeNode', { objectId: result.objectId }); const t = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: node.backendNodeId, fetchRelatives: false }); const n = t.nodes[0]; return { rola: n.role.value, nazwa: n.name && n.name.value }; };
    const n1 = await axNode(); await p.click('.car-bar [data-car=next]'); await p.waitForTimeout(900); const n2 = await axNode();
    await p.addScriptTag({ content: AXE }); const ax = await p.evaluate(async () => { const r = await axe.run('.car', { resultTypes: ['violations', 'incomplete'] }); return r.violations.concat(r.incomplete).filter((v) => /aria/.test(v.id)).map((v) => v.id + ' ' + v.nodes.map((n) => n.target.join(' ')).join(',')); });
    ok(8, 'karuzela Dokumentów: rola group z nazwą wybranego dokumentu; axe bez uwag ARIA', n1.rola === 'group' && n1.nazwa === 'Wybrany dokument: Dowód osobisty, 1 z 6' && n2.nazwa === 'Wybrany dokument: Prawo jazdy, 2 z 6' && !ax.length, { n1, n2, ax });
    await b.close(); }
    });
// ---------- 9. Główny punkt orientacyjny na ekranach wejścia ----------
  await sec(9, 'punkt orientacyjny', async () => {
  for (const W of [390, 1280]) {
    const { b, p, ctx } = await L.open({ w: W }); const cdp = await ctx.newCDPSession(p);
    const mains = async () => { const { nodes } = await cdp.send('Accessibility.getFullAXTree'); return nodes.filter((n) => !n.ignored && n.role && n.role.value === 'main').map((n) => n.name ? n.name.value : '(bez nazwy)'); };
    const axeRun = async () => { await p.addScriptTag({ content: AXE }); return p.evaluate(async () => { const r = await axe.run(document, { runOnly: ['landmark-one-main', 'landmark-no-duplicate-main', 'landmark-main-is-top-level', 'region'], resultTypes: ['violations'] }); return r.violations.map((v) => v.id); }); };
    await p.goto(L.BASE + '/index.html'); await p.waitForSelector('#entry:not([hidden])'); const m1 = await mains(); const a1 = await axeRun();
    await p.click('[data-act=entry-demo]'); await p.waitForTimeout(500); const m2 = await mains(); const a2 = await axeRun();
    await p.click('[data-act=enter]'); await p.waitForTimeout(1200); const m3 = await mains(); const a3 = await axeRun();
    ok(9, W + ' px: dokładnie jeden obszar główny na wejściu, wyborze osoby i w aplikacji; axe bez uwag o punktach orientacyjnych', m1.length === 1 && m2.length === 1 && m3.length === 1 && !a1.length && !a2.length && !a3.length, { wejscie: [m1, a1], wybor: [m2, a2], aplikacja: [m3, a3] });
    await b.close();
  }
    });
// ---------- 10. Wymuszone kolory ----------
  await sec(10, 'wymuszone kolory', async () => {
  { const { b, p } = await L.open({ w: 390, forced: true }); await L.enter(p);
    await p.click('.tabbar [data-tab=docs]'); await p.waitForTimeout(500); await p.click('#main .doc-list .row[data-id=pojazd]'); await p.waitForTimeout(900);
    const d = await p.evaluate(() => { const st = (e) => { const c = getComputedStyle(e); return { obrys: c.borderTopStyle + ' ' + c.borderTopWidth, zaznaczenie: c.outlineStyle + ' ' + c.outlineWidth, tlo: c.backgroundColor }; };
      const cur = document.querySelector('.doc-hero .on > .dcard'); const nb = document.querySelector('.doc-hero .on').nextElementSibling.firstElementChild; const dots = Array.from(document.querySelectorAll('.doc-hero .car-dots i'));
      const nr = nb.getBoundingClientRect();
      return { karta: st(cur), sasiad: { ...st(nb), widocznyNaEkranie: nr.left < innerWidth && nr.right > 0 }, kropka: st(dots[0]), kropkaWybrana: st(dots.find((x) => x.classList.contains('on'))) }; });
    await p.screenshot({ path: 'r25-10-wymuszone-kolory.png' });
    ok(10, 'wymuszone kolory: karta i sąsiad z obrysem, wybrana karta z zaznaczeniem, kropki widoczne i różne', /solid 2px/.test(d.karta.obrys) && /solid 2px/.test(d.sasiad.obrys) && d.sasiad.widocznyNaEkranie && /solid 3px/.test(d.karta.zaznaczenie) && d.kropka.tlo !== 'rgba(0, 0, 0, 0)' && d.kropkaWybrana.tlo !== d.kropka.tlo, d);
    await p.click('.tabbar [data-tab=docs]'); await p.waitForTimeout(500);
    const c = await p.evaluate(() => { const f = document.querySelector('.car-stage .dcard.is-front'); const cs = getComputedStyle(f); return cs.outlineStyle + ' ' + cs.outlineWidth + ' / ' + cs.borderTopStyle; });
    ok(10, 'wymuszone kolory: karta z przodu karuzeli Dokumentów ma obrys i zaznaczenie', /solid 3px/.test(c) && / solid$/.test(c), c);
    await b.close(); }
  });
  fs.writeFileSync('regresja-wynik.json', JSON.stringify(R, null, 1));
  const bad = R.filter((r) => !r.ok);
  R.forEach((r) => console.log((r.ok ? '✓' : '✗') + ' [' + r.nr + '] ' + r.co + (r.ok ? '' : '\n      ' + JSON.stringify(r.szczegoly).slice(0, 600))));
  console.log('\nRAZEM', R.length, '| nieudane', bad.length);
})();
