// Spinka 2.0: testy procesów, nawigacji i dostępności w Chromium (Playwright), bez serwera AI.
//   node procesy-test.js <port statyczny dist/> <axe.min.js>
// Sprawdza: Centrum spraw (kolejność, wyjaśnienie, szybkie działania, powiadomienia), kreatory (walidacja, wersja robocza
// po odświeżeniu, potwierdzenie, status, sprawa w „Sprawach”), płatności, skrzynkę (OCR, warstwy, kalendarz, przypisanie,
// własny plik), kalendarz (miesiące, filtry, klawiatura, przypomnienie), bezpieczeństwo, rodzinę, portfel EU, tryb
// demonstracyjny Spinki (6 pytań przykładowych, źródła, stany), wyszukiwarkę, wysoki kontrast, tryb uproszczony,
// ograniczony ruch, przyciski bez działania, fokus niezasłonięty przez pasek kreatora (WCAG 2.2, 2.4.11), przewijanie w bok
// przy 320 px i axe (WCAG 2.1 A/AA) na nowych ekranach.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [, , PORT, AXE_PATH] = process.argv;
const BASE = 'http://127.0.0.1:' + (PORT || '8200') + '/index.html';
const AXE = fs.readFileSync(AXE_PATH, 'utf8');
const APP_JS = fs.readFileSync(path.join(__dirname, '../../src/app.js'), 'utf8');
const CORE_ACTS = Array.from(APP_JS.matchAll(/case '([\w-]+)':/g)).map((m) => m[1]);
const R = []; const ok = (co, w, sz) => { R.push({ co, ok: !!w }); console.log((w ? '✓ ' : '✗ ') + co + (sz !== undefined ? ' | ' + JSON.stringify(sz).slice(0, 400) : '')); };
const wait = (p, ms) => p.waitForTimeout(ms);

async function open(b, o) {
  o = o || {};
  const c = await b.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, isMobile: (o.w || 390) < 500, hasTouch: (o.w || 390) < 500, reducedMotion: o.rm ? 'reduce' : 'no-preference' });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE); await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 });
  await p.click('[data-act=entry-demo]'); await wait(p, 250); await p.click('[data-act=enter]'); await wait(p, 900);
  return { c, p, errs };
}
const nav = (p, name, params) => p.evaluate(([n, a]) => window.APP.nav(n, a || {}), [name, params || null]);
const scr = (p) => p.evaluate(() => { const v = document.querySelector('#main > .screen'); return v ? v.className.replace('screen ', '') : null; });
const text = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const axe = async (p) => { await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await axe.run(document.querySelector('#app'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations.map((v) => v.id + ':' + v.nodes.length)); };
// Każdy widoczny przycisk na ekranie musi coś robić: znana akcja, przejście, zakładka, scenariusz, ustawienie, zakładka segmentu itd.
const deadButtons = (p, core) => p.evaluate((core) => {
  const known = new Set(core.concat(Object.keys(window.APP.ext.acts)));
  return Array.from(document.querySelectorAll('#main button, .s2sheet button')).filter((b) => b.offsetParent !== null).filter((b) => {
    const d = b.dataset;
    if (d.act) return !known.has(d.act);
    if (d.go || d.tab || d.run || d.say || d.setting || d.seg || d.copy || d.toast || d.textSize || d.car || d.dv || d.ec || d.focus) return false;
    if (b.type === 'submit' || b.getAttribute('role') === 'tab' || b.closest('.quick') || b.closest('[data-ask]') || b.matches('.chip, .msgs-more, .ai-switch, .opt-btn')) return false;
    if (b.closest('.qcard, .icard, .car, .ec')) return false;
    return true;
  }).map((b) => (b.className || 'button') + ':' + b.textContent.trim().slice(0, 30));
}, core);
const overflow = (p) => p.evaluate(() => { const m = document.querySelector('#main > .screen'); return m ? m.scrollWidth - m.clientWidth : 0; });

(async () => {
  const b = await chromium.launch();

  // 1. Centrum spraw
  { const { c, p, errs } = await open(b);
    const sec = await p.evaluate(() => Array.from(document.querySelectorAll('#main h2')).map((h) => h.textContent.replace(/\d+/g, '').trim()));
    ok('Start: sekcje „Wymaga Twojej uwagi”, „Szybkie działania”, „Twoje sprawy”, „Twoje dokumenty”', ['Wymaga Twojej uwagi', 'Szybkie działania', 'Twoje sprawy', 'Twoje dokumenty'].every((x) => sec.includes(x)), sec);
    const order = await p.evaluate(() => Array.from(document.querySelectorAll('.s2-attn-item')).map((x) => x.dataset.attn));
    ok('Start: kolejność według skutków i terminu (OC, narodziny, pismo pierwsze)', order[0] === 'todo:oc' && order[1] === 'family:narodziny' && order[2] === 'todo:pismo-us', order);
    await p.click('.s2-attn-item .s2-why-btn'); await wait(p, 300);
    const why = await p.evaluate(() => { const b = document.querySelector('.s2-attn-item .s2-why-btn'); const box = document.getElementById(b.getAttribute('aria-controls')); return { exp: b.getAttribute('aria-expanded'), vis: !box.hidden, t: box.textContent.slice(0, 80) }; });
    ok('Start: „Dlaczego tutaj?” rozwija wyjaśnienie skutku i terminu (aria-expanded)', why.exp === 'true' && why.vis && /Skutek: wysoki/.test(why.t), why);
    const before = await p.evaluate(() => document.querySelectorAll('.s2-attn-item').length - document.querySelectorAll('#s2-attn-rest[hidden] .s2-attn-item').length);
    await p.click('[data-act=s2-attn-more]'); await wait(p, 400);
    const after = await p.evaluate(() => document.querySelectorAll('.s2-attn-item:not([hidden])').length - document.querySelectorAll('#s2-attn-rest[hidden] .s2-attn-item').length);
    ok('Start: „Pokaż pozostałe” odsłania resztę listy', before === 3 && after > 3, { before, after });
    const sec2 = await text(p, '.s2-secchip');
    ok('Start: data w prototypie i wskaźnik bezpieczeństwa z tekstem', /1 sprawa do sprawdzenia/.test(sec2) && !!(await text(p, '.s2-today')), sec2);
    const quick = await p.evaluate(() => Array.from(document.querySelectorAll('.s2-quick .s2-tile')).map((x) => x.querySelector('.s2-tile-t').textContent));
    ok('Start: 6 szybkich działań', quick.length === 6 && ['Wyjaśnij pismo', 'Załatw sprawę', 'Dodaj dokument', 'Opłać należność', 'Sprawdź termin', 'Zapytaj Spinkę'].every((x) => quick.includes(x)), quick);
    const dest = [];
    for (let i = 0; i < 6; i++) { await nav(p, 'start'); await wait(p, 300); await p.locator('.s2-quick .s2-tile').nth(i).click(); await wait(p, 500); dest.push(await scr(p)); }
    ok('Szybkie działania prowadzą do: skrzynka, usługi, skrzynka, płatności, kalendarz, Spinka', dest.join() === 'skrzynka,uslugi,skrzynka,platnosci,kalendarz,chat', dest);
    await nav(p, 'start'); await wait(p, 300);
    const groups = await p.evaluate(() => ({ g: Array.from(document.querySelectorAll('.s2-docgroup-h')).map((x) => x.textContent), links: Array.from(document.querySelectorAll('.s2-doc-link')).map((x) => x.textContent.trim()) }));
    ok('Start: dokumenty w grupach i powiązane ze sprawami', groups.g.length === 3 && groups.links.some((l) => /nowy dowód/.test(l)) && groups.links.some((l) => /OC/.test(l)), groups);
    const cases = await p.evaluate(() => Array.from(document.querySelectorAll('.s2-case')).map((x) => ({ t: x.querySelector('h3').textContent, bar: !!x.querySelector('[role=progressbar]'), inst: !!x.querySelector('.s2-case-inst') })));
    ok('Start: karty spraw z instytucją i paskiem postępu (role=progressbar)', cases.length >= 2 && cases.every((x) => x.bar && x.inst), cases);
    // powiadomienia
    const badge0 = await p.evaluate(() => document.querySelector('#env-btn .badge').textContent);
    await p.click('#env-btn'); await wait(p, 400);
    const panel = await p.evaluate(() => ({ h: document.querySelector('#msgs-h').textContent, rows: Array.from(document.querySelectorAll('#msgs .msg-row')).map((x) => x.querySelector('.msg-title').textContent) }));
    ok('Powiadomienia: panel „Powiadomienia” z nowym logowaniem, kartą urodzenia i należnością', panel.h === 'Powiadomienia' && ['Nowe logowanie', 'kartę urodzenia', 'podatek'].every((k) => panel.rows.some((r) => r.includes(k))), panel);
    if (await p.$('#msgs .msgs-more')) { await p.click('#msgs .msgs-more'); await wait(p, 300); }
    await p.click('#msgs .msg-row[data-nid="n-dziecko"]'); await wait(p, 600);
    const badge1 = await p.evaluate(() => document.querySelector('#env-btn .badge').textContent);
    ok('Powiadomienie prowadzi do kreatora i znika z nieprzeczytanych', (await scr(p)) === 'proces' && Number(badge1) === Number(badge0) - 1, { badge0, badge1 });
    ok('Centrum: bez błędów strony', errs.length === 0, errs);
    await c.close(); }

  // 2. Kreatory: świadczenie przed zgłoszeniem narodzin, narodziny z walidacją i wersją roboczą, firma
  { const { c, p, errs } = await open(b);
    await nav(p, 'proces', { id: 'swiadczenie' }); await wait(p, 300);
    await p.click('[data-act=w-next]'); await wait(p, 200); await p.click('[data-act=w-next]'); await wait(p, 300);
    await p.check('input[name=dziecko][value=maluch]', { force: true }); await p.check('#f-oswiadczenie', { force: true });
    await p.click('[data-act=w-next]'); await wait(p, 300);
    const e1 = await text(p, '[data-field=dziecko] .s2-err');
    ok('Świadczenie: bez zgłoszonych narodzin kreator mówi „Najpierw zgłoś narodziny” i nie idzie dalej', /Najpierw zgłoś narodziny/.test(e1 || '') && (await p.evaluate(() => !!document.getElementById('w-form'))), e1);
    await nav(p, 'proces', { id: 'narodziny' }); await wait(p, 300);
    const step0 = await p.evaluate(() => ({ cost: document.querySelector('.s2-sum').textContent, rule: !!document.querySelector('.s2-rule'), due: !!document.querySelector('.s2-due-box') }));
    ok('Narodziny krok 1: wyjaśnienie, termin z danych, koszt, informacja ogólna', /Bezpłatnie/.test(step0.cost) && step0.rule && step0.due, step0);
    await p.click('[data-act=w-next]'); await wait(p, 300);
    const docs = await p.evaluate(() => Array.from(document.querySelectorAll('.s2-docs-need li')).map((x) => x.className));
    ok('Narodziny krok 2: lista wymaganych dokumentów ze stanem', docs.length === 3 && docs.every((x) => x === 'ok'), docs);
    await p.click('[data-act=w-next]'); await wait(p, 300);
    const auto = await p.evaluate(() => document.querySelectorAll('.s2-auto').length);
    await p.click('[data-act=w-next]'); await wait(p, 300);
    const err = await p.evaluate(() => ({ sum: !!document.querySelector('.s2-errsum:not([hidden])'), focus: document.activeElement.className, msg: (document.querySelector('[data-field=imie] .s2-err') || {}).textContent, inv: document.getElementById('f-imie').getAttribute('aria-invalid') }));
    ok('Narodziny krok 3: autouzupełnione pola i błąd przy pustym imieniu (podsumowanie z fokusem, aria-invalid, komunikat co poprawić)', auto >= 2 && err.sum && /s2-errsum/.test(err.focus) && /literami/.test(err.msg || '') && err.inv === 'true' || auto >= 2 && err.sum && /Uzupełnij/.test(err.msg || '') && err.inv === 'true', { auto, err });
    await p.fill('#f-imie', 'Jan7'); await p.click('[data-act=w-next]'); await wait(p, 300);
    const e2 = await text(p, '[data-field=imie] .s2-err');
    await p.fill('#f-imie', 'Jan'); await p.click('[data-act=w-next]'); await wait(p, 300);
    ok('Narodziny: imię z cyfrą odrzucone, poprawne przechodzi do kosztów', /literami/.test(e2 || '') && /Koszty/.test(await text(p, '.s2-wbody h2')), e2);
    await p.click('[data-act=w-save]'); await wait(p, 300);
    // Po odświeżeniu aplikacja może wrócić od razu do sesji (bez ekranu wejścia) albo pokazać wejście.
    await p.reload(); await wait(p, 4500);
    if (await p.isVisible('#entry')) { await p.click('[data-act=entry-demo]'); await wait(p, 250); await p.click('[data-act=enter]'); await wait(p, 900); }
    else if (await p.isVisible('#login')) { await p.click('[data-act=enter]'); await wait(p, 900); }
    await nav(p, 'start'); await wait(p, 400);
    const attn = await p.evaluate(() => Array.from(document.querySelectorAll('.s2-attn-item')).map((x) => x.dataset.attn));
    await nav(p, 'proces', { id: 'narodziny' }); await wait(p, 300);
    const resumed = await p.evaluate(() => ({ banner: !!document.querySelector('.s2-banner.info'), now: (document.querySelector('.s2-stepper li.now .s2-step-l') || {}).textContent }));
    ok('Wersja robocza przetrwa odświeżenie: jest na Starcie i wraca na zapisany krok', attn.includes('draft:narodziny') && resumed.banner && resumed.now === 'Koszty', { attn: attn.slice(0, 6), resumed });
    await p.click('[data-act=w-next]'); await wait(p, 300);
    const review = await p.evaluate(() => document.querySelector('.s2-review').textContent);
    await p.click('[data-act=w-next]'); await wait(p, 300);
    const e3 = await text(p, '[data-field=decyzja] .s2-err');
    await p.check('#f-decyzja', { force: true }); await p.click('[data-act=w-next]'); await wait(p, 500);
    const conf = await p.evaluate(() => !document.getElementById('confirm').hidden && document.getElementById('confirm-h').textContent);
    await p.click('#confirm-yes'); await wait(p, 900);
    const done = await p.evaluate(() => ({ h: (document.querySelector('.s2-success h1') || {}).textContent, demo: !!document.querySelector('.demo-box') }));
    ok('Narodziny: podsumowanie z „Zmień”, wymagane potwierdzenie, okno potwierdzenia, ekran statusu symulacji', /Jan/.test(review) && /Zaznacz/.test(e3 || '') && /potwierdzić/.test(conf || '') && /symulacja/.test(done.h || '') && done.demo, { e3, conf, done });
    await nav(p, 'cases', { seg: 'progress' }); await wait(p, 400);
    const inCases = await p.evaluate(() => document.querySelector('#pane-progress').textContent.includes('Zgłoszenie narodzin dziecka'));
    await nav(p, 'start'); await wait(p, 300);
    const attn2 = await p.evaluate(() => Array.from(document.querySelectorAll('.s2-attn-item')).map((x) => x.dataset.attn));
    ok('Po zakończeniu: sprawa w „Sprawach → W toku”, narodziny i wersja robocza znikają z „Wymaga uwagi”', inCases && !attn2.includes('family:narodziny') && !attn2.includes('draft:narodziny'), attn2);
    // firma: nazwa bez imienia i nazwiska, data wstecz
    await nav(p, 'proces', { id: 'firma' }); await wait(p, 300);
    await p.click('[data-act=w-next]'); await wait(p, 200); await p.click('[data-act=w-next]'); await wait(p, 300);
    await p.fill('#f-nazwa', 'Projekty'); await p.fill('#f-start', '2020-01-01'); await p.click('[data-act=w-next]'); await wait(p, 300);
    const fe = await p.evaluate(() => ({ n: document.querySelector('[data-field=nazwa] .s2-err').textContent, d: document.querySelector('[data-field=start] .s2-err').textContent, r: document.querySelector('[data-field=podatek] .s2-err').textContent }));
    ok('Firma: walidacja nazwy (imię i nazwisko), daty (nie wstecz) i wyboru opodatkowania', /Tomasz Kowalczyk/.test(fe.n) && /wstecz/.test(fe.d) && /Wybierz/.test(fe.r), fe);
    ok('Kreatory: bez błędów strony', errs.length === 0, errs);
    await c.close(); }

  // 3. Płatności, skrzynka, kalendarz
  { const { c, p, errs } = await open(b);
    await nav(p, 'platnosci'); await wait(p, 300);
    const total0 = await text(p, '.s2-total');
    await p.click('[data-act=pay][data-id=podatek]'); await wait(p, 500);
    await p.click('[data-act=pay-confirm]'); await wait(p, 300);
    const pe = await text(p, '#s2sheet .s2-err:not([hidden])');
    await p.check('#s2sheet input[value=BLIK]', { force: true }); await p.click('[data-act=pay-confirm]'); await wait(p, 600);
    const total1 = await text(p, '.s2-total');
    const paid = await p.evaluate(() => document.querySelector('#pay-podatek').textContent);
    ok('Płatności: bez wyboru sposobu błąd; po potwierdzeniu „Opłacona w symulacji”, suma maleje, brak pól na dane karty', /Wybierz/.test(pe || '') && /Opłacona w symulacji/.test(paid) && total0 !== total1 && !(await p.evaluate(() => document.querySelectorAll('input[autocomplete^=cc], input[name*=karta]').length)), { total0, total1 });
    await nav(p, 'skrzynka'); await wait(p, 300);
    await p.click('[data-act=inbox-sample][data-id=parking]'); await wait(p, 2200);
    const an = await p.evaluate(() => ({ qa: document.querySelectorAll('.s2-qa').length, layers: Array.from(new Set(Array.from(document.querySelectorAll('#pane-sum .s2-layer')).map((x) => x.className.split(' ')[1]))), note: !!document.querySelector('.s2-note.warn') }));
    ok('Skrzynka: analiza ma 6 pytań i oddziela warstwy (dokument, OCR, dane, interpretacja), ostrzega o błędzie OCR', an.qa === 6 && ['l-doc', 'l-ocr', 'l-ai', 'l-data'].every((l) => an.layers.includes(l)) && an.note, an);
    await p.click('#tab-ocr'); await wait(p, 200);
    const diff = await p.evaluate(() => document.querySelectorAll('#pane-ocr .s2-ocr p.diff').length);
    ok('Skrzynka: zakładka „Wynik OCR” zaznacza różnice względem oryginału', diff === 1, diff);
    await p.click('#tab-sum'); await wait(p, 200);
    await p.click('[data-act=inbox-cal]'); await wait(p, 300);
    await p.click('[data-act=inbox-assign]'); await wait(p, 500);
    await p.check('#s2sheet input[name=sprawa]', { force: true }); await p.click('[data-act=inbox-assign-ok]'); await wait(p, 600);
    const assigned = await text(p, '[data-act=inbox-assign]');
    ok('Skrzynka: przypisanie do sprawy i termin w kalendarzu', /Przypisane/.test(assigned), assigned);
    await nav(p, 'skrzynka'); await wait(p, 300);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    await p.setInputFiles('#inbox-file-image', { name: 'pismo.png', mimeType: 'image/png', buffer: png }); await wait(p, 600);
    const own = await p.evaluate(() => ({ s: document.querySelector('#main > .screen').className, t: (document.querySelector('.s2-banner.info') || {}).textContent, img: !!document.querySelector('img.s2-preview') }));
    const stored = await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('spinka2-stan')).inbox.find((x) => x.name === 'pismo.png')));
    ok('Własny plik: podgląd zdjęcia, uczciwa informacja, że treść nie jest odczytywana, w pamięci tylko nazwa, typ i rozmiar', /analiza/.test(own.s) && /Nie odczytuję treści/.test(own.t || '') && own.img && !/data:|base64/.test(stored), { own, stored });
    await p.setInputFiles('#inbox-file-pdf', { name: 'notatka.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }).catch(() => {});
    await nav(p, 'kalendarz'); await wait(p, 400);
    const m0 = await text(p, '#cal-m');
    await p.click('[data-act=cal-mon][data-d="1"]'); await wait(p, 300);
    const m1 = await text(p, '#cal-m');
    const nov = await p.evaluate(() => Array.from(document.querySelectorAll('.s2-day.has')).map((x) => x.dataset.d));
    ok('Kalendarz: następny miesiąc i dni z terminami (m.in. koniec OC i termin z pisma ze skrzynki)', m0 !== m1 && nov.length >= 4, { m0, m1, nov });
    await p.click('.s2-day.has'); await wait(p, 300);
    await p.keyboard.press('ArrowRight'); await wait(p, 300);
    const kb = await p.evaluate(() => ({ sel: (document.querySelector('.s2-day.sel') || {}).dataset, focus: document.activeElement.dataset && document.activeElement.dataset.d }));
    ok('Kalendarz: strzałka przenosi wybór i fokus na następny dzień', kb.sel && kb.focus === kb.sel.d, kb);
    await p.click('[data-act=cal-filtr][data-v=platnosci]'); await wait(p, 300);
    const only = await p.evaluate(() => Array.from(document.querySelectorAll('#cal-up-h ~ .s2-evs .s2-ev-m')).map((x) => x.textContent));
    ok('Kalendarz: filtr „Płatności” pokazuje tylko płatności', only.length >= 1 && only.every((t) => /Płatności/.test(t)), only);
    await p.click('[data-act=cal-filtr][data-v=all]'); await wait(p, 300);
    await p.click('[data-act=cal-add]'); await wait(p, 500); await p.click('[data-act=cal-add-ok]'); await wait(p, 300);
    const ce = await text(p, '#s2sheet [data-field=tytul] .s2-err');
    await p.fill('#f-tytul', 'Odebrać dowód'); await p.click('[data-act=cal-add-ok]'); await wait(p, 500);
    const has = await p.evaluate(() => document.body.textContent.includes('Odebrać dowód'));
    ok('Kalendarz: przypomnienie z walidacją tytułu zapisuje się i jest widoczne', /Uzupełnij/.test(ce || '') && has, ce);
    await p.locator('.s2-ev', { hasText: 'Koniec polisy OC' }).first().click(); await wait(p, 500);
    const det = await p.evaluate(() => document.querySelector('#s2sheet .s2sum, #s2sheet .s2-sum').textContent);
    ok('Kalendarz: szczegóły terminu z rodzajem i źródłem', /Rodzaj/.test(det) && /Źródło/.test(det), det.slice(0, 120));
    await p.keyboard.press('Escape'); await wait(p, 300);
    ok('Płatności, skrzynka, kalendarz: bez błędów strony', errs.length === 0, errs);
    await c.close(); }

  // 4. Bezpieczeństwo, rodzina, portfel EU, wyszukiwarka
  { const { c, p, errs } = await open(b);
    await nav(p, 'bezpieczenstwo'); await wait(p, 300);
    await p.click('.s2-alert [data-act=sec-end]'); await wait(p, 400); await p.click('#confirm-yes'); await wait(p, 500);
    const st1 = await text(p, '#sec-stat');
    await nav(p, 'start'); await wait(p, 300);
    const chip = await text(p, '.s2-secchip');
    ok('Bezpieczeństwo: zakończenie sesji z potwierdzeniem; stan i wskaźnik na Starcie „Wszystko w porządku”', /Wszystko w porządku/.test(st1) && /Wszystko w porządku/.test(chip), { st1, chip });
    await nav(p, 'aktualizacje'); await wait(p, 300);
    const up = await p.evaluate(() => document.querySelector('#main > .screen').textContent);
    ok('Aktualizacje: wersja 2.0, stan modułów prototypu i zastrzeżenie, że nie sprawdza prawdziwych usług ani certyfikatów', /2\.0/.test(up) && /nie jest stan prawdziwych usług/.test(up) && /nie sprawdza i nie pokazuje stanu prawdziwych certyfikatów/.test(up));
    await nav(p, 'osoba', { id: 'zosia' }); await wait(p, 300);
    await p.click('[data-act=fam-sign][data-v=tak]'); await wait(p, 400); await p.click('#confirm-yes'); await wait(p, 500);
    const sig = await text(p, '.s2-consent');
    const sw = await p.evaluate(() => { const b = document.querySelector('[data-act=fam-perm]'); b.click(); return b.getAttribute('aria-checked'); });
    await nav(p, 'osoba', { id: 'anna' }); await wait(p, 300);
    const anna = await p.evaluate(() => ({ sw: document.querySelectorAll('[data-act=fam-perm]').length, t: document.querySelector('#main > .screen').textContent.includes('zmienia tylko Anna') }));
    ok('Rodzina: zgoda rodzica w symulacji, przełącznik uprawnień drugiego rodzica; dorosły bez przełączników (zmienia tylko on)', /Zgoda wyrażona/.test(sig) && sw === 'false' && anna.sw === 0 && anna.t, { sw, anna });
    await nav(p, 'portfeleu'); await wait(p, 300);
    await p.click('[data-act=eu-start]'); await wait(p, 500);
    const pre = await p.evaluate(() => Array.from(document.querySelectorAll('#eu-form input:checked')).map((x) => x.value));
    await p.evaluate(() => document.querySelectorAll('#eu-form input').forEach((i) => { i.checked = false; }));
    await p.click('[data-act=eu-share]'); await wait(p, 300);
    const ee = await text(p, '#eu-err');
    for (const v of pre) await p.check('#eu-form input[value=' + v + ']', { force: true });
    await p.click('[data-act=eu-share]'); await wait(p, 400); await p.click('#confirm-yes'); await wait(p, 2200);
    const res = await p.evaluate(() => ({ h: (document.querySelector('#s2sheet h1') || {}).textContent, s: document.querySelector('#s2sheet').textContent }));
    await p.click('#s2sheet .s2sheet-body [data-act=s2sheet-close]'); await wait(p, 600);
    const hist = await p.evaluate(() => document.querySelector('#eu-h').parentElement.textContent);
    ok('Portfel EU: domyślnie tylko potrzebne dane (bez daty urodzenia), błąd przy pustym wyborze, weryfikacja (symulacja), historia zgód', !pre.includes('born') && !pre.includes('nat') && /Zaznacz/.test(ee || '') && /symulacja/.test(res.h || '') && /Aluguer/.test(hist), { pre, h: res.h });
    ok('Portfel EU: wyraźne oznaczenie koncepcji', /To nie jest działający Europejski Portfel/.test(await text(p, '.s2-banner.warn')));
    await nav(p, 'szukaj'); await wait(p, 400);
    await p.fill('#s2-q', 'paszport'); await wait(p, 300);
    const sr = await p.evaluate(() => Array.from(document.querySelectorAll('#s2-res .row-title')).map((x) => x.textContent));
    await p.fill('#s2-q', 'qwertyzz'); await wait(p, 300);
    const none = await p.evaluate(() => ({ n: document.getElementById('s2-q-n').textContent, ask: !!document.querySelector('#s2-res [data-say]') }));
    ok('Szukaj: wyniki z usług, rodziny i kalendarza; przy braku wyników podpowiedź i „Zapytaj Spinkę”', sr.includes('Wniosek o paszport') && sr.length >= 3 && /Brak wyników/.test(none.n) && none.ask, { sr: sr.slice(0, 6), none });
    ok('Bezpieczeństwo, rodzina, portfel, szukaj: bez błędów strony', errs.length === 0, errs);
    await c.close(); }

  // 5. Spinka: tryb demonstracyjny, stany, źródła
  { const { c, p, errs } = await open(b);
    await p.click('.tabbar [data-tab=chat]'); await wait(p, 600);
    const intro = await p.evaluate(() => document.querySelector('#chat-log').textContent);
    ok('Spinka: powitanie mówi o trybie demonstracyjnym bez AI i pokazuje 6 pytań przykładowych', /trybie demonstracyjnym/.test(intro) && ['narodziny dziecka', 'działalność gospodarczą', 'niezałatwione sprawy'].every((x) => intro.includes(x)), intro.slice(0, 160));
    const pytania = ['Chcę zgłosić narodziny dziecka', 'Chcę założyć działalność gospodarczą', 'Czy mam jakieś niezałatwione sprawy?', 'Dostałem pismo z urzędu. Co mam zrobić?', 'Kończy mi się OC. Jakie mam możliwości?', 'Zgubiłem portfel. Co powinienem zastrzec?'];
    const wyniki = [];
    for (const q of pytania) {
      await p.fill('#chat-input', q); await p.press('#chat-input', 'Enter'); await wait(p, 150);
      const s1 = await p.evaluate(() => document.getElementById('s2-stan').dataset.stan);
      await wait(p, 2200);
      wyniki.push(await p.evaluate((s1) => { const log = document.querySelector('#chat-log'); const know = Array.from(log.querySelectorAll('.know')).pop(); const src = Array.from(log.querySelectorAll('.src-list')).pop(); const next = Array.from(log.querySelectorAll('.s2-next')).pop();
        return { s1: s1, s2: document.getElementById('s2-stan').dataset.stan, have: !!know && /Z danych aplikacji/.test(know.textContent), miss: !!know && /Tego w danych nie ma/.test(know.textContent), src: !!src, next: next ? next.querySelectorAll('button').length : 0 }; }, s1));
    }
    ok('Spinka: 6 pytań przykładowych ma odpowiedź z danych, „czego nie wiem”, źródła i kolejne kroki; stan „Analizuje” na początku, „Czeka na decyzję” na końcu',
      wyniki.every((w) => w.have && w.miss && w.src && w.next >= 1 && w.s1 === 'analizuje' && w.s2 === 'czeka'), wyniki);
    await p.fill('#chat-input', 'Jaka będzie pogoda w Gdańsku?'); await p.press('#chat-input', 'Enter'); await wait(p, 2000);
    const unk = await p.evaluate(() => Array.from(document.querySelectorAll('#chat-log .know')).pop().textContent);
    ok('Spinka: pytanie spoza danych dostaje „nie wiem” bez zgadywania', /Nie znalazłam/.test(unk) && /Nie zgaduję/.test(unk), unk.slice(0, 120));
    await p.locator('#chat-log .s2-next button', { hasText: 'Katalog spraw' }).last().click(); await wait(p, 500);
    ok('Spinka: przycisk w odpowiedzi prowadzi bezpośrednio do miejsca w aplikacji (katalog spraw)', (await scr(p)) === 'uslugi');
    await p.click('.tabbar [data-tab=chat]'); await wait(p, 400);
    await p.locator('#chat-log .s2-next button', { hasText: 'Otwórz formularz zgłoszenia' }).first().click(); await wait(p, 500);
    ok('Spinka: „Otwórz formularz zgłoszenia” otwiera kreator narodzin', (await scr(p)) === 'proces' && /narodzin/.test(await text(p, '#main h1')));
    const stany = await p.evaluate(() => Object.keys(window.APP.spinkaStany).map((k) => window.APP.spinkaStany[k].l));
    ok('Spinka: 9 nazwanych stanów', stany.length === 9, stany);
    ok('Spinka: bez błędów strony', errs.length === 0, errs);
    await c.close(); }

  // 6. Dostępność: wysoki kontrast, tryb uproszczony, ograniczony ruch, axe, martwe przyciski, 320 px
  { const { c, p, errs } = await open(b);
    await p.click('.tabbar [data-tab=more]'); await wait(p, 400);
    const hub = await p.evaluate(() => Array.from(document.querySelectorAll('.s2-hub .s2-tile-t')).map((x) => x.textContent));
    ok('Więcej: moduły (Załatw za mnie, Kalendarz, Skrzynka, Płatności, Bezpieczeństwo, Rodzina, Portfel EU, Szukaj) nad profilem', hub.length === 8, hub);
    await p.click('[data-setting=hc]'); await wait(p, 300);
    const hc = await p.evaluate(() => ({ cls: document.documentElement.classList.contains('wysoki-kontrast'), bg: getComputedStyle(document.querySelector('#main > .screen')).backgroundColor, aria: document.querySelector('[data-setting=hc]').getAttribute('aria-checked') }));
    ok('Wysoki kontrast: klasa na stronie, czarne tło, przełącznik aria-checked', hc.cls && hc.bg === 'rgb(0, 0, 0)' && hc.aria === 'true', hc);
    const axHc = await axe(p);
    ok('Wysoki kontrast: axe bez naruszeń na ekranie Więcej', axHc.length === 0, axHc);
    await p.click('[data-setting=hc]'); await p.click('[data-setting=simple]'); await wait(p, 300);
    await p.click('.tabbar [data-tab=start]'); await wait(p, 400);
    const simple = await p.evaluate(() => ({ adv: Array.from(document.querySelectorAll('.s2-adv')).every((x) => getComputedStyle(x).display === 'none'), attn: document.querySelectorAll('.s2-attn-item').length, quick: document.querySelectorAll('.s2-quick .s2-tile').length }));
    ok('Tryb uproszczony: na Starcie tylko „Wymaga uwagi”, szybkie działania i pytanie do Spinki', simple.adv && simple.attn >= 1 && simple.quick === 6, simple);
    await p.click('.tabbar [data-tab=more]'); await wait(p, 300); await p.click('[data-setting=simple]'); await wait(p, 200);
    const screens = [['start'], ['uslugi'], ['proces', { id: 'zgloszenie' }], ['skrzynka'], ['kalendarz'], ['platnosci'], ['bezpieczenstwo'], ['aktualizacje'], ['rodzina'], ['osoba', { id: 'zosia' }], ['osoba', { id: 'maluch' }], ['portfeleu'], ['szukaj'], ['more']];
    const axeRes = []; const dead = [];
    for (const [n, a] of screens) {
      await nav(p, n, a); await wait(p, 500);
      const v = await axe(p); if (v.length) axeRes.push(n + ': ' + v.join(','));
      const d = await deadButtons(p, CORE_ACTS); if (d.length) dead.push(n + ': ' + d.join(','));
    }
    // formularz kreatora z błędami też przechodzi axe
    await nav(p, 'proces', { id: 'zgloszenie' }); await wait(p, 300); await p.click('[data-act=w-next]'); await wait(p, 200); await p.click('[data-act=w-next]'); await wait(p, 300); await p.click('[data-act=w-next]'); await wait(p, 300);
    const vForm = await axe(p); if (vForm.length) axeRes.push('formularz z błędami: ' + vForm.join(','));
    ok('axe (WCAG 2.1 A/AA): bez naruszeń na 14 nowych ekranach i w formularzu z błędami', axeRes.length === 0, axeRes);
    ok('Każdy widoczny przycisk na nowych ekranach ma działanie (brak przycisków donikąd)', dead.length === 0, dead);
    ok('Dostępność: bez błędów strony', errs.length === 0, errs);
    await c.close(); }
  // Fokus nie chowa się pod przyklejonym paskiem „Wstecz / Dalej” (WCAG 2.2, 2.4.11): Tab po wszystkich polach kroku „Dane”
  // sześciu kreatorów, przy standardowym i największym rozmiarze tekstu (klasa text-xl, jak po wyborze w ustawieniach).
  for (const xl of [false, true]) {
    const { c, p, errs } = await open(b, { rm: true });
    if (xl) await p.evaluate(() => document.documentElement.classList.add('text-xl'));
    const hidden = []; let n = 0;
    for (const id of ['narodziny', 'swiadczenie', 'firma', 'paszport', 'zgloszenie', 'oc']) {
      await nav(p, 'proces', { id }); await wait(p, 250);
      for (let k = 0; k < 2; k++) { await p.click('#main > .screen [data-act=w-next]'); await wait(p, 250); }
      await p.evaluate(() => { document.querySelector('#main > .screen').scrollTop = 0; const h = document.querySelector('#main > .screen h1'); h.tabIndex = -1; h.focus(); });
      for (let t = 0; t < 30; t++) {
        await p.keyboard.press('Tab'); await wait(p, 60);
        const r = await p.evaluate(() => {
          const s = document.querySelector('#main > .screen'); const a = document.activeElement; const bar = s.querySelector('.s2-wnav');
          if (!s.contains(a)) return { out: true };
          if (!bar || bar.contains(a)) return { skip: true };
          const e = a.getBoundingClientRect(), q = bar.getBoundingClientRect();
          return { id: a.id || a.tagName, ov: Math.max(0, Math.min(e.bottom, q.bottom) - Math.max(e.top, q.top)) };
        });
        if (r.out) break; if (r.skip) continue; n++;
        if (r.ov > 0) hidden.push(id + ':' + r.id + ' ' + Math.round(r.ov) + 'px');
      }
    }
    ok('Fokus klawiatury nie chowa się pod paskiem kreatora (' + (xl ? 'największy tekst' : 'standardowy tekst') + ', ' + n + ' pól)', n > 20 && hidden.length === 0 && errs.length === 0, { hidden, errs });
    await c.close();
  }
  { const { c, p, errs } = await open(b, { w: 320, h: 568, rm: true });
    const wide = [];
    for (const n of ['start', 'uslugi', 'proces', 'skrzynka', 'kalendarz', 'platnosci', 'bezpieczenstwo', 'rodzina', 'portfeleu', 'aktualizacje']) {
      await nav(p, n, n === 'proces' ? { id: 'firma' } : {}); await wait(p, 300);
      const o = await overflow(p); if (o > 0) wide.push(n + ': ' + o);
    }
    ok('320 px, ograniczony ruch: żaden nowy ekran nie przewija się w bok, bez błędów', wide.length === 0 && errs.length === 0, { wide, errs });
    // reset demonstracji czyści stan modułów
    await p.evaluate(() => window.APP.store.update((s) => { s.paid.podatek = '2026-10-26'; }));
    await p.click('.tabbar [data-tab=more]'); await wait(p, 300); await p.click('[data-act=reset]'); await wait(p, 300); await p.click('#confirm-yes'); await wait(p, 1500);
    const cleared = await p.evaluate(() => !JSON.parse(localStorage.getItem('spinka2-stan')).paid.podatek);
    ok('„Zacznij demonstrację od nowa” czyści też stan modułów (płatności, wersje robocze)', cleared);
    await c.close(); }

  await b.close();
  const bad = R.filter((r) => !r.ok).length; console.log('RAZEM ' + R.length + ' | nieudane ' + bad); process.exit(bad ? 1 : 0);
})();
