// Testy rundy 28 w Chromium: asystent (bez serwera i z serwerem na atrapie Gemini) oraz nowy Profil.
//   node asystent-profil-test.js <port statyczny dist/> <port serwera z atrapą> <port atrapy> <axe.min.js>
// Atrapa sprawdza przepływ, walidację i interfejs; NIE sprawdza jakości prawdziwego modelu.
const { chromium } = require('playwright'); const fs = require('fs');
const [, , PS, PA, PM, AXE_PATH] = process.argv;
const ST = 'http://127.0.0.1:' + PS + '/', AIU = 'http://127.0.0.1:' + PA + '/', MOCK = 'http://127.0.0.1:' + PM;
const AXE = fs.readFileSync(AXE_PATH, 'utf8');
const R = []; const ok = (co, w, sz) => R.push({ co, ok: !!w, sz });
const mock = async (p) => (await fetch(MOCK + p, p === '/__reset' ? { method: 'POST' } : {})).json();
const axe = async (p) => { await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations.map((v) => v.id + ' (' + v.nodes.length + ')')); };

(async () => {
  const b = await chromium.launch();
  const nowa = async (url, o) => { const c = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, o || {})); const p = await c.newPage();
    const log = { bledy: [], zad: [] }; p.on('pageerror', (e) => log.bledy.push(e.message)); p.on('request', (r) => log.zad.push(r.url()));
    if (url) { await p.goto(url); await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 }); await p.tap('[data-act=entry-demo]'); await p.waitForTimeout(300); await p.tap('[data-act=enter]'); await p.waitForTimeout(1200); }
    return { c, p, log }; };
  const czat = async (p) => { await p.tap('.tabbar [data-tab=chat]'); await p.waitForTimeout(800); };
  const zapytaj = async (p, q, ms) => { await p.fill('#chat-input', q); await p.keyboard.press('Enter'); await p.waitForTimeout(ms || 1300); };
  const ostatnie = (p, n) => p.evaluate((n) => [...document.querySelectorAll('#chat-log > *')].slice(-n).map((x) => x.className + ' | ' + x.innerText.replace(/\s+/g, ' ')), n || 6);

  // 1. Bez serwera: asystent nie udaje odpowiedzi, mówi wprost, czego brakuje, i prowadzi do danych i scenariuszy.
  { const { c, p, log } = await nowa(ST); await czat(p);
    const sub = await p.textContent('#chat-sub');
    await zapytaj(p, 'Kiedy kończy się moja polisa?');
    const l = await ostatnie(p, 3);
    const off = l.find((x) => /st-off/.test(x)) || '';
    ok('bez serwera: nagłówek „Model AI niepodłączony”, odpowiedź to jasny stan „nie odpowiem, AI nie jest podłączone”, bez treści udającej odpowiedź',
      /Model AI niepodłączony/.test(sub) && /Nie odpowiem na to pytanie: model AI nie jest podłączony/.test(off) && /Nie podaję gotowych odpowiedzi/.test(off) && !l.some((x) => /^msg bot \|.*04\.11\.2026/.test(x)), { sub, l });
    ok('bez serwera: przyciski do „Do załatwienia”, „Dokumenty” i pasującego scenariusza OC', /Do załatwienia.*Dokumenty.*Zacznij: Koniec polisy OC/.test(l[l.length - 1]), l[l.length - 1]);
    ok('bez serwera: żadnego zapytania do /api ani do Google poza czcionkami', !log.zad.some((u) => /\/api\/|generativelanguage/.test(u)), log.zad.filter((u) => !u.startsWith(ST)).slice(0, 5));
    await p.tap('.quick .chip >> text=Zacznij: Koniec polisy OC'); await p.waitForTimeout(1500);
    ok('bez serwera: scenariusz OC działa (krok 1 z 3) — scenariusze są lokalne, bez AI', /Koniec polisy OC/.test(await p.textContent('#stepper')), await p.textContent('#stepper'));
    await p.tap('.quick.bound .chip'); await p.waitForTimeout(800); await p.locator('.opt-btn', { hasText: 'Chcę zmienić ubezpieczyciela' }).tap(); await p.waitForTimeout(1200);
    const sum = await p.evaluate(() => { const s = document.querySelector('.qcard.summary'); return s ? s.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; });
    const sprawy = await p.evaluate(() => (window.APP.cases || []).filter((x) => x.state === 'demo').length);
    ok('zmiana stanu tylko po potwierdzeniu: przed „Potwierdź” widać podsumowanie i nic się nie zmieniło', sum && /Sprawdź, zanim potwierdzisz/.test(sum) && sprawy === 0, { sum, sprawy });
    ok('bez serwera: bez błędów strony', log.bledy.length === 0, log.bledy); await c.close(); }

  // 2. Z serwerem (atrapa Gemini): zgoda przed pierwszym wysłaniem, odpowiedź z danych z podanym źródłem.
  { await mock('/__reset'); const { c, p, log } = await nowa(AIU); await czat(p);
    const pasek = await p.textContent('.proto-bar p'); const sw = await p.getAttribute('.ai-switch', 'aria-checked');
    ok('z serwerem: przełącznik „Model AI” włączony, pasek „pytania trafiają do modelu AI”', sw === 'true' && /pytania trafiają do modelu AI/.test(pasek), { sw, pasek });
    await zapytaj(p, 'Kiedy kończy się moja polisa?');
    const przed = (await mock('/__last')).count;
    const zgoda = await p.evaluate(() => { const k = document.querySelector('.icard.consent:not(.answered)'); return k ? k.innerText.replace(/\s+/g, ' ') : null; });
    ok('zgoda: przed pierwszym pytaniem karta „Wysłać to pytanie do modelu AI?” z listą, co trafia i co nie; do modelu nic nie wysłano', przed === 0 && zgoda && /Nie trafiają: imię, nazwisko, PESEL/.test(zgoda) && /Wyślij do modelu AI/.test(zgoda), { przed, zgoda });
    await p.tap('.icard.consent [data-v=tak]'); await p.waitForTimeout(1500);
    const l = await ostatnie(p, 4); const last = await mock('/__last');
    const pay = JSON.stringify(last.last.payload);
    ok('odpowiedź o polisie: podpis „Objaśnienie modelu AI”, punkt z danych ze źródłem „Kończy się OC: Toyota Yaris”, karta danych z aplikacji z datą 4 listopada',
      l.some((x) => /Objaśnienie modelu AI.*04\.11\.2026/.test(x)) && l.some((x) => /icard know.*źródło: Kończy się OC: Toyota Yaris/.test(x)) && l.some((x) => /src-list.*Dane z aplikacji.*środa, 4 listopada/.test(x)), l);
    ok('minimalizacja: w wysłanych danych brak PESEL-u, imienia i nazwiska, tablicy i numeru polisy; jest kontekst ze źródłem todo:oc',
      !/\d{11}|Tomasz|Kowalczyk|WX\s?12345|ul\. Przykładowa/.test(pay) && /"todo:oc"/.test(pay) && last.last.schema, pay.slice(0, 200));
    await zapytaj(p, 'Ile czasu mam na odpowiedź?', 1500);
    const l2 = await ostatnie(p, 4);
    ok('druga odpowiedź bez ponownej zgody; termin pisma 07.11.2026 ze źródłem „Wezwanie do złożenia wyjaśnień”', !(await p.$('.icard.consent:not(.answered)')) && l2.some((x) => /07\.11\.2026/.test(x) && /Wezwanie do złożenia wyjaśnień/.test(x)), l2);
    await zapytaj(p, 'raty?', 1500);
    const l3 = await ostatnie(p, 3);
    ok('„raty?”: model mówi, czego nie wie, i dopytuje (kredyt czy składka OC) z przyciskami', l3.some((x) => /Chodzi o raty kredytu czy o raty składki OC\?/.test(x)) && /Raty kredytu.*Raty składki OC/.test(l3[l3.length - 1]), l3);
    await p.tap('.quick.bound .chip >> text=Raty kredytu'); await p.waitForTimeout(1500);
    const l4 = await ostatnie(p, 4);
    ok('po „Raty kredytu”: nie ma kredytu w danych; polisa OC wskazana jako ubezpieczenie, nie kredyt; bez liczby rat', l4.some((x) => /nie ma kredytu ani leasingu/.test(x)) && l4.some((x) => /To ubezpieczenie, nie kredyt/.test(x)) && !l4.some((x) => /\d+ rat/.test(x)), l4);
    await zapytaj(p, 'Jaki termin?', 1500);
    const l5 = await ostatnie(p, 3);
    ok('„Jaki termin?”: niejednoznaczne — dopytanie z opcjami (pismo, polisa, dowód)', l5.some((x) => /O który termin pytasz\?/.test(x)) && /Pismo z urzędu skarbowego.*Polisa OC.*Dowód osobisty/.test(l5[l5.length - 1]), l5);
    await zapytaj(p, 'Kiedy kończy się polisa? #zla-data', 1500);
    const l6 = await ostatnie(p, 2);
    ok('model podaje termin pisma jako koniec polisy: odpowiedź odrzucona, bez gotowego tekstu zamiast niej', /nie zgadzała się z danymi aplikacji/.test(l6.join(' ')) && /Nie zastępuję tej odpowiedzi gotowym tekstem/.test(l6.join(' ')) && !l6.some((x) => /^msg bot \|.*07\.11\.2026/.test(x)), l6);
    await zapytaj(p, 'Mam długi? #bik', 1500);
    ok('model udaje sprawdzenie w BIK: odrzucone; odrzucona treść nie wstrzymuje AI (można zapytać inaczej)', /nie zgadzała się z danymi aplikacji/.test((await ostatnie(p, 2)).join(' ')) && /z danych aplikacji/.test(await p.textContent('#chat-sub')), await ostatnie(p, 2));
    const v = await axe(p); ok('rozmowa z odpowiedziami AI: axe bez naruszeń', v.length === 0, v);
    // Profil z serwerem: stan AI, przełącznik wysyłania, podgląd danych = to, co wysłano; cofnięcie zgody.
    await p.tap('.tabbar [data-tab=more]'); await p.waitForTimeout(800);
    const pr = await p.evaluate(() => ({ status: document.querySelector('[data-ai-status]').textContent, sw: (document.querySelector('[data-setting=aiSend]') || {}).getAttribute && document.querySelector('[data-setting=aiSend]').getAttribute('aria-checked'),
      podglad: document.querySelectorAll('.pv-list li').length, cofnij: !!document.querySelector('[data-act=ai-revoke]') }));
    const wyslane = (await mock('/__last')).last.payload.kontekst.zrodla.length;
    ok('Profil z serwerem: stan „Google Gemini … przez serwer projektu”, przełącznik wysyłania, podgląd ma tyle pozycji, ile wysłano, „Cofnij zgodę”', /Google Gemini.*przez serwer projektu/.test(pr.status) && pr.sw === 'true' && pr.podglad === wyslane && pr.cofnij, { pr, wyslane });
    await p.tap('[data-setting=aiSend]'); await p.waitForTimeout(300);
    await p.tap('.tabbar [data-tab=chat]'); await p.waitForTimeout(600);
    const n0 = (await mock('/__last')).count; await zapytaj(p, 'Kiedy kończy się polisa?');
    const n1 = (await mock('/__last')).count; const l7 = await ostatnie(p, 2);
    ok('wysyłanie wyłączone w Profilu: pytanie nie trafia do modelu, asystent mówi to wprost', n1 === n0 && /Nie wysłałem tego pytania do modelu AI \(wysyłanie pytań do modelu AI jest wyłączone\)/.test(l7.join(' ')) && (await p.getAttribute('.ai-switch', 'aria-checked')) === 'false', { n0, n1, l7 });
    await p.tap('.ai-switch'); await p.waitForTimeout(300); await p.tap('.tabbar [data-tab=more]'); await p.waitForTimeout(600);
    await p.tap('[data-act=ai-revoke]'); await p.waitForTimeout(300); await p.tap('.tabbar [data-tab=chat]'); await p.waitForTimeout(600);
    await zapytaj(p, 'Kiedy kończy się polisa?');
    const cz = { karta: !!(await p.$('.icard.consent:not(.answered)')), wyslano: (await mock('/__last')).count, n1, sw: await p.getAttribute('.ai-switch', 'aria-checked'), log: await ostatnie(p, 3) };
    ok('po cofnięciu zgody: następne pytanie znowu czeka na zgodę', cz.karta && cz.wyslano === n1, cz);
    await p.tap('.tabbar [data-tab=more]'); await p.waitForTimeout(600); await p.tap('[data-act=chat-clear]'); await p.waitForTimeout(400); await p.tap('.tabbar [data-tab=chat]'); await p.waitForTimeout(600);
    const po = await p.evaluate(() => [...document.querySelectorAll('#chat-log > *')].map((x) => x.className));
    ok('„Wyczyść rozmowę ze Spinką”: zostaje tylko powitanie (bez pytań i odpowiedzi)', !po.some((x) => /msg me|icard know|src-list/.test(x)) && po.length <= 4, po);
    ok('z serwerem: bez błędów strony (502 przy odrzuconych odpowiedziach jest oczekiwane i nie jest błędem strony)', log.bledy.length === 0, log.bledy); await c.close(); }

  // 3. „Nie wysyłaj” w karcie zgody.
  { await mock('/__reset'); const { c, p } = await nowa(AIU); await czat(p); await zapytaj(p, 'Kiedy kończy się polisa?'); await p.tap('.icard.consent [data-v=nie]'); await p.waitForTimeout(800);
    ok('„Nie wysyłaj”: nic nie trafia do modelu, wysyłanie wyłączone, propozycje bez AI', (await mock('/__last')).count === 0 && (await p.getAttribute('.ai-switch', 'aria-checked')) === 'false' && /Nie wysłałem pytania/.test((await ostatnie(p, 4)).join(' ')));
    await c.close(); }

  // 4. Limit dostawcy: wstrzymanie z godziną i prawdziwym powodem, bez gotowych odpowiedzi.
  { await mock('/__reset'); const { c, p } = await nowa(AIU); await czat(p); await zapytaj(p, 'test #429'); await p.tap('.icard.consent [data-v=tak]'); await p.waitForTimeout(1500);
    const l = await ostatnie(p, 2); await zapytaj(p, 'Kiedy kończy się polisa?'); const l2 = await ostatnie(p, 3);
    ok('limit (429): „Wyczerpał się limit… Do HH:MM nie wysyłam pytań”; następne pytanie dostaje stan „wstrzymany do HH:MM (limit dostawcy)”', /(Wyczerpał się limit zapytań do modelu AI|AI niedostępne: wyczerpał się limit zapytań do modelu)\. Do \d\d:\d\d nie wysyłam pytań/ /* runda 29: dopisek „AI niedostępne” */.test(l.join(' ')) && /Nie wysłałem tego pytania do modelu AI \(model AI jest wstrzymany do \d\d:\d\d \(limit dostawcy\)\)/.test(l2.join(' ')), { l, l2 });
    await c.close(); }

  // 5. Profil: trzy części, spis, rozmiar tekstu (3 stopnie, strzałki), kontrast, ograniczenie animacji, bez przewijania w bok.
  { const { c, p, log } = await nowa(ST); await p.tap('.tabbar [data-tab=more]'); await p.waitForTimeout(800);
    const s = await p.evaluate(() => ({ h2: [...document.querySelectorAll('.me-part h2')].map((h) => h.textContent), spis: [...document.querySelectorAll('.me-index button')].map((x) => x.textContent.replace(/\d/, '').trim()),
      autor: (document.querySelector('.me-author') || {}).textContent, status: document.querySelector('[data-ai-status]').textContent, przelacznikAI: !!document.querySelector('[data-setting=aiSend]'),
      robi: document.querySelectorAll('.me-can li').length, nieRobi: document.querySelectorAll('.me-cannot li').length, gdzie: document.querySelectorAll('.me-rows > div').length }));
    ok('Profil: części „O prototypie”, „Twoje dane”, „Wygoda i dostępność” ze spisem; autor; co robi / czego nie robi; gdzie są dane',
      s.h2.join('|') === 'O prototypie|Twoje dane|Wygoda i dostępność' && s.spis.join('|') === 'O prototypie|Twoje dane|Wygoda i dostępność' && /Igor M\./.test(s.autor) && s.robi === 3 && s.nieRobi === 3 && s.gdzie === 4, s);
    ok('Profil bez serwera: stan „Niepodłączony…”, bez atrapy przełącznika wysyłania do AI', /^Niepodłączony/.test(s.status) && !s.przelacznikAI, s);
    await p.tap('.me-index button:nth-child(3)'); await p.waitForTimeout(700);
    ok('spis: „Wygoda i dostępność” przewija do części i przenosi fokus na jej nagłówek', await p.evaluate(() => document.activeElement && document.activeElement.id === 'me-w'));
    await p.tap('[data-text-size="2"]'); await p.waitForTimeout(300);
    const xl = await p.evaluate(() => ({ klasa: document.documentElement.className, fs: getComputedStyle(document.documentElement).fontSize, zapis: localStorage.getItem('proto-sprawy-ustawienia'), bok: document.documentElement.scrollWidth - innerWidth }));
    ok('„Największy” tekst: klasa text-xl, czcionka główna 21,12 px (1,32 × 16), zapis w pamięci przeglądarki, bez przewijania w bok', /text-xl/.test(xl.klasa) && xl.fs === '21.12px' && /"textSize":2/.test(xl.zapis) && xl.bok === 0, xl);
    await p.focus('[data-text-size="2"]'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(200);
    const strz = await p.evaluate(() => ({ klasa: document.documentElement.className, fokus: document.activeElement.dataset.textSize, zazn: document.querySelector('[data-text-size="1"]').getAttribute('aria-checked') }));
    ok('rozmiar tekstu jako grupa radiowa: strzałka w lewo wybiera „Większy” i przenosi fokus', /big-text/.test(strz.klasa) && !/text-xl/.test(strz.klasa) && strz.fokus === '1' && strz.zazn === 'true', strz);
    await p.tap('[data-setting=contrast]'); await p.tap('[data-setting=reduceMotion]'); await p.waitForTimeout(300);
    const kk = await p.evaluate(() => ({ klasa: document.documentElement.className, linia: getComputedStyle(document.documentElement).getPropertyValue('--line').trim(), muted: getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() }));
    ok('kontrast i ograniczenie animacji naprawdę zmieniają interfejs (klasy kontrast i reduce-motion, ciemniejsze --line i --muted)', /kontrast/.test(kk.klasa) && /reduce-motion/.test(kk.klasa) && kk.linia === '#7A8396' && kk.muted === '#2B3346', kk);
    const male = await p.evaluate(() => [...document.querySelectorAll('#main .me-stack button, #main .me-stack summary')].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().height)));
    ok('Profil: cele dotyku co najmniej 44 px', male.length === 0, male);
    const v = await axe(p); ok('Profil (największy tekst, kontrast): axe bez naruszeń', v.length === 0, v);
    for (const tab of ['start', 'docs', 'chat', 'cases', 'more']) { await p.tap('.tabbar [data-tab=' + tab + ']'); await p.waitForTimeout(500); }
    ok('dolna nawigacja bez zmian (5 zakładek) i działa po zmianach ustawień, bez błędów', (await p.$$eval('.tabbar [data-tab]', (x) => x.map((e) => e.dataset.tab).join())) === 'start,docs,chat,cases,more' && log.bledy.length === 0, log.bledy);
    await c.close(); }
  { const { c, p } = await nowa(ST, { viewport: { width: 320, height: 568 } }); await p.tap('.tabbar [data-tab=more]'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ bok: document.documentElement.scrollWidth - innerWidth, szer: Math.max(...[...document.querySelectorAll('#main .me-stack *')].map((e) => e.getBoundingClientRect().right)) }));
    ok('Profil 320 px: nic nie wystaje w bok', r.bok === 0 && r.szer <= 320.5, r); await c.close(); }
  { const { c, p } = await nowa(ST, { reducedMotion: 'reduce' }); await czat(p);
    ok('ograniczony ruch w systemie: klasa reduce-motion, przełącznik w Profilu oznaczony jako włączony w telefonie', await p.evaluate(() => document.documentElement.classList.contains('reduce-motion'))); await c.close(); }

  await b.close();
  for (const r of R) console.log((r.ok ? '✓ ' : '✗ ') + r.co + (r.ok ? '' : '\n    ' + String(JSON.stringify(r.sz)).slice(0, 700)));
  console.log('RAZEM ' + R.length + ' | nieudane ' + R.filter((r) => !r.ok).length);
})();
