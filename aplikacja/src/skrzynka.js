/*
 * Spinka 2.0: inteligentna skrzynka dokumentów (demonstracja).
 * Przykładowe pisma (fikcyjne) przechodzą przez symulowany OCR: rozpoznany tekst z pewnością, typ pisma, nadawca, daty,
 * kwota i wymagane działania. Analiza rozdziela cztery warstwy: oryginał dokumentu, wynik OCR (może mieć błędy),
 * dane z aplikacji i interpretację Spinki. Własny plik (zdjęcie lub PDF) zostaje w tej karcie przeglądarki: prototyp
 * NIE odczytuje jego treści i mówi to wprost; zapisuje tylko nazwę, typ i rozmiar, żeby plik był na liście.
 */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = (s) => A.esc(s);
  const T = A.time;
  const U = A.ui;
  const st = () => A.store.get();
  const Y = A.demo.year;

  const SAMPLES = [
    {
      id: 'podatek', kind: 'Decyzja administracyjna', icon: 'building', title: 'Decyzja: podatek od nieruchomości na ' + Y + ' rok',
      from: 'Wójt Gminy Przykładowo (fikcyjny)', date: T.plus(-250), due: T.plus(20), amount: 728, cons: 2, conf: 97,
      original: ['WÓJT GMINY PRZYKŁADOWO', 'DECYZJA w sprawie wymiaru podatku od nieruchomości na rok ' + Y, 'Na podstawie przepisów o podatkach i opłatach lokalnych ustalam Panu Tomaszowi Kowalczykowi wysokość podatku od nieruchomości na rok ' + Y + ' w kwocie 728,00 zł.',
        'Podatek płatny w czterech ratach: do 15 marca, 15 maja, 15 września i 15 listopada ' + Y + ' r., po 182,00 zł.', 'Od decyzji przysługuje odwołanie w terminie 14 dni od dnia jej doręczenia.'],
      ocr: ['WÓJT GMINY PRZYKŁADOWO', 'DECYZJA w sprawie wymiaru podatku od nieruchomośc i na rok ' + Y, '… ustalam Panu Tomaszowi Kowalczykowi wysokość podatku od nieruchomości na rok ' + Y + ' w kwocie 728,00 zł.',
        'Podatek płatny w czterech ratach: do 15 marca, 15 maja, 15 września i 15 listopada ' + Y + ' r., po 182,00 zł.', 'Od decyzji przysługuje odwołanie w terminie 14 dni od dnia jej doręczenia.'],
      what: 'Gmina ustaliła, ile zapłacisz w tym roku podatku od mieszkania: 728 zł w czterech ratach po 182 zł.',
      key: 'Została ostatnia rata: 182 zł do 15 listopada.',
      ifNothing: 'Po terminie gmina nalicza odsetki za zwłokę, a potem może wysłać upomnienie.',
      todo: 'Zapłać IV ratę albo ustaw przypomnienie.',
      how: 'Opłać w Płatnościach (symulacja). Na odwołanie od decyzji jest za późno: termin 14 dni minął.',
      actions: [{ l: 'Opłać IV ratę (symulacja)', attrs: 'data-go="platnosci" data-id="podatek"' }],
      link: { label: 'Płatności: podatek od nieruchomości', kind: 'platnosc' }
    },
    {
      id: 'parking', kind: 'Wezwanie do zapłaty', icon: 'car', title: 'Wezwanie do uiszczenia opłaty dodatkowej za parkowanie',
      from: 'Zarząd Dróg Miejskich w Przykładowie (fikcyjny)', date: T.plus(-1), due: T.plus(6), amount: 50, cons: 1, conf: 91,
      original: ['ZARZĄD DRÓG MIEJSKICH W PRZYKŁADOWIE', 'Wezwanie do uiszczenia opłaty dodatkowej', 'Pojazd o numerze rejestracyjnym WX 12345 był ' + T.fmt(T.plus(-3)) + ' zaparkowany w strefie płatnego parkowania bez wniesienia opłaty.',
        'Wzywamy do uiszczenia opłaty dodatkowej w kwocie 50,00 zł w terminie 7 dni od doręczenia wezwania.', 'Jeśli opłata za parkowanie została wniesiona, można złożyć reklamację z dowodem zapłaty.'],
      ocr: ['ZARZĄD DRÓG MIEJSKICH W PRZYKŁADOWIE', 'Wezwanie do uiszczenia opłaty dodatkowej', 'Pojazd o numerze rejestracyjnym WX 1Z345 był ' + T.fmt(T.plus(-3)) + ' zaparkowany w strefie płatnego parkowania bez wniesienia opłaty.',
        'Wzywamy do uiszczenia opłaty dodatkowej w kwocie 50,00 zł w terminie 7 dni od doręczenia wezwania.', 'Jeśli opłata za parkowanie została wniesiona, można złożyć reklamację z dowodem zapłaty.'],
      ocrNote: 'OCR odczytał numer rejestracyjny jako „WX 1Z345”. W danych pojazdu jest „WX 12345”: to prawdopodobnie ten sam numer, sprawdź w oryginale.',
      what: 'Miasto twierdzi, że ' + T.fmtShort(T.plus(-3)) + ' Twoje auto stało w strefie płatnego parkowania bez opłaty.',
      key: 'Zapłać 50 zł albo złóż reklamację, jeśli parkowanie było opłacone.',
      ifNothing: 'Sprawa może trafić do egzekucji, a koszty wzrosną.',
      todo: 'Sprawdź, czy płaciłeś za parkowanie tego dnia. Jeśli nie, zapłać; jeśli tak, złóż reklamację z potwierdzeniem.',
      how: 'Opłata i reklamacja są w prawdziwej usłudze miasta. W prototypie możesz dodać termin do kalendarza.',
      actions: [{ l: 'Zgłoś problem / reklamację (kreator)', attrs: 'data-go="proces" data-id="zgloszenie"' }],
      link: { label: 'Pojazd: Toyota Yaris', kind: 'pojazd' }
    },
    {
      id: 'szkola', kind: 'Pismo ze szkoły', icon: 'family', title: 'Prośba o zgodę na wycieczkę szkolną',
      from: 'Szkoła Podstawowa nr 1 w Przykładowie (fikcyjna)', date: T.plus(-2), due: T.plus(6), amount: 0, cons: 1, conf: 99,
      original: ['Szkoła Podstawowa nr 1 w Przykładowie', 'Szanowni Rodzice,', 'Klasa 3b wyjeżdża na trzydniową wycieczkę do Krakowa. Prosimy o zgodę na udział Zofii Kowalczyk do ' + T.fmt(T.plus(6)) + '.', 'Opiekę sprawuje dwoje nauczycieli.'],
      ocr: ['Szkoła Podstawowa nr 1 w Przykładowie', 'Szanowni Rodzice,', 'Klasa 3b wyjeżdża na trzydniową wycieczkę do Krakowa. Prosimy o zgodę na udział Zofii Kowalczyk do ' + T.fmt(T.plus(6)) + '.', 'Opiekę sprawuje dwoje nauczycieli.'],
      what: 'Szkoła prosi o zgodę na wyjazd Zosi do Krakowa.',
      key: 'Zgoda jest potrzebna do ' + T.fmtShort(T.plus(6)) + '.',
      ifNothing: 'Bez zgody Zosia nie pojedzie na wycieczkę.',
      todo: 'Przeczytaj szczegóły i zdecyduj w profilu Zosi.',
      how: 'Zgodę dasz w Rodzinie (symulacja podpisu).',
      actions: [{ l: 'Zdecyduj w profilu Zosi', attrs: 'data-go="osoba" data-id="zosia"' }],
      link: { label: 'Rodzina: Zosia', kind: 'rodzina' }
    }
  ];
  A.skrzynka = { sample: (id) => SAMPLES.find((s) => s.id === id), samples: SAMPLES };
  const pliki = {}; // podglądy własnych zdjęć: tylko w pamięci tej karty, nigdy w localStorage

  /* ---------- skrzynka ---------- */

  function rowFor(d) {
    const s = d.sample && A.skrzynka.sample(d.sample);
    const t = s ? s.title : d.name;
    const sub = s ? s.from + ' · dodane ' + T.fmtShort(A.store.fromIso(d.added) || T.today) : (d.type === 'application/pdf' ? 'PDF' : 'Zdjęcie') + ', ' + Math.max(1, Math.round(d.size / 1024)) + ' KB · treść nie jest odczytywana';
    return U.linkRow('data-go="analiza" data-id="' + d.id + '"', s ? s.icon : (d.type === 'application/pdf' ? 'docs' : 'photo'), t, sub,
      d.handled ? U.pill('Załatwione', 'ok') : d.caseLabel ? U.pill(d.caseLabel, 'info') : '');
  }
  A.ext.screens.skrzynka = (p) => {
    const items = (st().inbox || []).slice().reverse();
    const s = A.screen('skrzynka',
      '<div class="pad stack"><h1>Skrzynka dokumentów</h1>' +
        '<p class="lead">Dodaj pismo jako zdjęcie albo PDF. Spinka pokaże, czego dotyczy, do kiedy trzeba zareagować i co zrobić.</p>' +
        '<section class="s2-import' + (p.id === 'dodaj' ? ' s2-flash' : '') + '" aria-labelledby="h-imp"><h2 id="h-imp">Dodaj dokument</h2>' +
          '<div class="s2-import-btns">' +
            '<button type="button" class="btn primary" data-act="inbox-pick" data-kind="image">' + ic('photo', 20) + 'Zdjęcie pisma</button>' +
            '<button type="button" class="btn secondary" data-act="inbox-pick" data-kind="pdf">' + ic('upload', 20) + 'Plik PDF</button>' +
          '</div>' +
          '<input type="file" id="inbox-file-image" accept="image/*" capture="environment" hidden>' +
          '<input type="file" id="inbox-file-pdf" accept="application/pdf" hidden>' +
          '<p class="s2-note">' + ic('lock', 16) + '<span>Plik zostaje w tej karcie przeglądarki i nie jest nigdzie wysyłany. Prototyp nie odczytuje treści Twoich plików: rozpoznawanie tekstu (OCR) pokazujemy na przykładowych pismach.</span></p>' +
        '</section>' +
        '<section aria-labelledby="h-smp"><h2 id="h-smp">Wypróbuj na przykładowym piśmie</h2><p class="sub">Pisma są fikcyjne. Zobaczysz, jak wygląda rozpoznanie tekstu i analiza.</p><ul class="group">' +
          SAMPLES.map((x) => '<li><button type="button" class="row" data-act="inbox-sample" data-id="' + x.id + '"><span class="row-ic tone-neutral">' + ic(x.icon, 24) + '</span><span class="row-main"><span class="row-title">' + esc(x.title) + '</span><span class="row-meta">' + esc(x.kind + ' · ' + x.from) + '</span></span>' + U.sim('OCR') + '</button></li>').join('') +
        '</ul></section>' +
        '<section aria-labelledby="h-inb"><h2 id="h-inb">W skrzynce</h2>' +
          '<ul class="group">' + A.letters.map((L) => U.linkRow('data-go="letter" data-id="' + L.id + '"', 'letter', L.title, L.from + ' · ' + T.fmtShort(L.got), L.unread ? U.pill('Nowe', 'accent') : '')).join('') + items.map(rowFor).join('') + '</ul>' +
        '</section>' +
      '</div>');
    s._after = () => {
      ['image', 'pdf'].forEach((k) => {
        const inp = s.querySelector('#inbox-file-' + k);
        inp.addEventListener('change', () => { if (inp.files && inp.files[0]) addFile(inp.files[0]); inp.value = ''; });
      });
      if (p.id === 'dodaj') { const b = s.querySelector('[data-act="inbox-pick"]'); if (b) setTimeout(() => b.focus(), 80); }
    };
    return s;
  };
  A.ext.acts['inbox-pick'] = (t) => { const i = document.getElementById('inbox-file-' + t.dataset.kind); if (i) i.click(); };
  function addFile(f) {
    const okType = /^image\//.test(f.type) || f.type === 'application/pdf';
    if (!okType) { A.toast('Ten plik nie jest zdjęciem ani PDF. Wybierz zdjęcie pisma albo plik PDF.'); return; }
    if (f.size > 15 * 1024 * 1024) { A.toast('Plik jest większy niż 15 MB. Zmniejsz zdjęcie albo wybierz mniejszy PDF.'); return; }
    const id = 'f' + Date.now().toString(36);
    if (/^image\//.test(f.type)) pliki[id] = URL.createObjectURL(f);
    A.store.update((s) => { s.inbox.push({ id: id, name: f.name.slice(0, 80), type: f.type, size: f.size, added: A.store.iso(T.today), sample: null }); });
    A.nav('analiza', { id: id, fresh: true });
  }
  A.ext.acts['inbox-sample'] = (t) => {
    const sid = t.dataset.id;
    let rec = (st().inbox || []).find((d) => d.sample === sid);
    if (!rec) { rec = { id: 's-' + sid, sample: sid, added: A.store.iso(T.today) }; A.store.update((s) => { s.inbox.push(rec); }); }
    A.nav('analiza', { id: rec.id, fresh: true });
  };

  /* ---------- analiza ---------- */

  const layer = (k) => ({
    doc: '<span class="s2-layer l-doc">' + ic('docs', 16) + 'Z dokumentu</span>',
    ocr: '<span class="s2-layer l-ocr">' + ic('scan', 16) + 'Wynik OCR</span>',
    data: '<span class="s2-layer l-data">' + ic('check', 16) + 'Dane z aplikacji</span>',
    ai: '<span class="s2-layer l-ai">' + ic('assistant', 16) + 'Interpretacja Spinki</span>'
  }[k]);

  A.ext.screens.analiza = (p) => {
    const rec = (st().inbox || []).find((d) => d.id === p.id);
    if (!rec) return A.screen('analiza', '<div class="pad stack"><h1>Nie ma tego dokumentu</h1>' + U.empty('docs', 'Dokument został usunięty', 'Wróć do skrzynki.', '<button type="button" class="btn secondary" data-go="skrzynka">Skrzynka</button>') + '</div>');
    const x = rec.sample && A.skrzynka.sample(rec.sample);
    if (!x) return ownFile(rec, p);
    const seg = p.seg || 'sum';
    const tab = (id, label) => '<button type="button" role="tab" id="tab-' + id + '" aria-controls="pane-' + id + '" aria-selected="' + (seg === id) + '" data-seg="' + id + '"' + (seg === id ? '' : ' tabindex="-1"') + '>' + label + '</button>';
    const qa = (q, a, l) => '<div class="s2-qa"><dt>' + esc(q) + '</dt><dd>' + a + '<span class="s2-qa-l">' + layer(l) + '</span></dd></div>';
    const n = T.inDays(x.due);
    const s = A.screen('analiza',
      '<div class="pad stack">' +
        '<p class="eyebrow">' + ic(x.icon, 16) + ' ' + esc(x.kind) + ' · ' + esc(x.from) + '</p><h1>' + esc(x.title) + '</h1>' +
        '<div class="s2-scan" id="s2-scan"' + (p.fresh && !A.reducedMotion() ? '' : ' hidden') + ' role="status"><span class="s2-scan-l">Rozpoznaję tekst (symulacja OCR)…</span>' + U.progress(0, 4, 'Postęp analizy') + '</div>' +
        '<div class="seg seg3" role="tablist" aria-label="Warstwy dokumentu" style="--sel:' + ['sum', 'ocr', 'orig'].indexOf(seg) + '">' + tab('sum', 'Najważniejsze') + tab('ocr', 'Wynik OCR') + tab('orig', 'Oryginał') + '</div>' +
        '<div id="pane-sum" role="tabpanel" aria-labelledby="tab-sum" class="stack"' + (seg === 'sum' ? '' : ' hidden') + '>' +
          '<dl class="s2-qas">' +
            qa('Czego dotyczy?', esc(x.what), 'ai') +
            qa('Co jest najważniejsze?', esc(x.key), 'ai') +
            qa('Do kiedy trzeba zareagować?', '<b>' + esc(T.fmtLong(x.due)) + '</b> ' + U.pill(U.dueText(x.due), U.dueTone(x.due)) + (x.id === 'parking' ? '<span class="s2-qa-n">7 dni od doręczenia; aplikacja przyjęła doręczenie ' + esc(T.fmtShort(x.date)) + '.</span>' : ''), 'doc') +
            qa('Jakie są konsekwencje?', esc(x.ifNothing), 'ai') +
            qa('Co powinienem zrobić?', esc(x.todo), 'ai') +
            qa('Jak mogę załatwić tę sprawę?', esc(x.how), 'ai') +
          '</dl>' +
          '<h2>Rozpoznane dane</h2><dl class="s2-sum">' +
            '<div><dt>Typ pisma</dt><dd>' + esc(x.kind) + ' ' + layer('ocr') + '</dd></div>' +
            '<div><dt>Nadawca</dt><dd>' + esc(x.from) + ' ' + layer('ocr') + '</dd></div>' +
            '<div><dt>Data pisma</dt><dd>' + esc(T.fmt(x.date)) + ' ' + layer('ocr') + '</dd></div>' +
            '<div><dt>Termin</dt><dd>' + esc(T.fmt(x.due)) + ' ' + layer('doc') + '</dd></div>' +
            (x.amount ? '<div><dt>Kwota</dt><dd>' + esc(U.money(x.amount)) + ' ' + layer('ocr') + '</dd></div>' : '') +
            '<div><dt>Pewność OCR</dt><dd>' + x.conf + '% ' + U.pill(x.conf >= 95 ? 'wysoka' : 'sprawdź w oryginale', x.conf >= 95 ? 'ok' : 'warn') + '</dd></div>' +
            (x.id === 'parking' ? '<div><dt>Pojazd</dt><dd>WX 12345 ' + layer('data') + '</dd></div>' : '') +
          '</dl>' +
          (x.ocrNote ? '<p class="s2-note warn">' + ic('alert', 16) + '<span>' + esc(x.ocrNote) + '</span></p>' : '') +
          '<details class="gloss"><summary>Co znaczą oznaczenia?</summary><ul class="s2-legend">' +
            '<li>' + layer('doc') + 'to, co jest napisane w piśmie (po sprawdzeniu w oryginale);</li>' +
            '<li>' + layer('ocr') + 'tekst rozpoznany ze zdjęcia; może mieć błędy, np. „1Z345” zamiast „12345”;</li>' +
            '<li>' + layer('data') + 'informacje z aplikacji (np. numer rejestracyjny Twojego auta);</li>' +
            '<li>' + layer('ai') + 'wyjaśnienie Spinki prostym językiem; w tej wersji przygotowane dla przykładowego pisma, bez modelu AI.</li></ul></details>' +
          '<h2>Co dalej</h2>' +
          '<div class="actions">' + x.actions.map((a) => '<button type="button" class="btn primary wide" ' + a.attrs + '>' + esc(a.l) + '</button>').join('') +
            '<button type="button" class="btn secondary wide" data-act="inbox-cal" data-id="' + rec.id + '">' + ic('calendar', 20) + 'Dodaj termin do kalendarza</button>' +
            '<button type="button" class="btn secondary wide" data-act="inbox-assign" data-id="' + rec.id + '">' + ic('paperclip', 20) + (rec.caseLabel ? 'Przypisane: ' + esc(rec.caseLabel) : 'Przypisz do sprawy') + '</button>' +
            '<button type="button" class="btn ghost wide" data-act="inbox-done" data-id="' + rec.id + '"' + (rec.handled ? ' aria-pressed="true"' : '') + '>' + ic('check', 20) + (rec.handled ? 'Załatwione' : 'Oznacz jako załatwione') + '</button>' +
          '</div>' +
        '</div>' +
        '<div id="pane-ocr" role="tabpanel" aria-labelledby="tab-ocr" class="stack"' + (seg === 'ocr' ? '' : ' hidden') + '>' +
          '<p class="sub">' + U.sim('Symulacja OCR') + ' Tekst rozpoznany ze zdjęcia przykładowego pisma. Pewność: ' + x.conf + '%. Różnice względem oryginału są zaznaczone.</p>' +
          '<div class="s2-ocr">' + x.ocr.map((l, i) => '<p' + (l !== x.original[i] && !l.startsWith('…') ? ' class="diff"' : '') + '>' + esc(l) + '</p>').join('') + '</div>' +
        '</div>' +
        '<div id="pane-orig" role="tabpanel" aria-labelledby="tab-orig" class="stack"' + (seg === 'orig' ? '' : ' hidden') + '>' +
          '<p class="sub">Treść przykładowego pisma (fikcyjnego), tak jak jest w dokumencie.</p>' +
          '<div class="orig">' + x.original.map((l) => '<p>' + esc(l) + '</p>').join('') + '</div>' +
        '</div>' +
        '<p class="foot-note">Pismo, nadawca i kwoty są fikcyjne. Interpretacja Spinki nie jest poradą prawną.</p>' +
      '</div>');
    if (p.fresh && !A.reducedMotion()) s._after = () => scan(s, p);
    return s;
  };
  // Animacja rozpoznawania: 4 etapy po ~300 ms (pasek rośnie transformacją), potem pasek znika; treść jest już w drzewie.
  function scan(s, p) {
    const box = s.querySelector('#s2-scan');
    if (!box) return;
    const fill = box.querySelector('.pbar-fill');
    const bar = box.querySelector('.pbar');
    const lbl = box.querySelector('.s2-scan-l');
    const etapy = ['Wczytuję obraz…', 'Rozpoznaję tekst (symulacja OCR)…', 'Szukam dat, kwot i nadawcy…', 'Gotowe'];
    let i = 0;
    const tick = () => {
      if (!box.isConnected) return;
      lbl.textContent = etapy[i];
      fill.style.setProperty('--p', (i + 1) / 4);
      bar.setAttribute('aria-valuenow', i + 1);
      i++;
      if (i < etapy.length) setTimeout(tick, 320);
      else setTimeout(() => { if (box.isConnected) { box.hidden = true; p.fresh = false; } }, 500);
    };
    tick();
  }

  function ownFile(rec, p) {
    const url = pliki[rec.id];
    return A.screen('analiza',
      '<div class="pad stack"><p class="eyebrow">' + ic(rec.type === 'application/pdf' ? 'docs' : 'photo', 16) + ' Twój plik</p><h1>' + esc(rec.name) + '</h1>' +
        (url ? '<img class="s2-preview" src="' + url + '" alt="Podgląd dodanego zdjęcia">' : '<div class="s2-preview none">' + ic(rec.type === 'application/pdf' ? 'docs' : 'photo', 32) + '<span>' + (rec.type === 'application/pdf' ? 'PDF' : 'Podgląd zdjęcia był dostępny tylko przed odświeżeniem strony.') + '</span></div>') +
        '<dl class="s2-sum"><div><dt>Typ</dt><dd>' + (rec.type === 'application/pdf' ? 'PDF' : 'Zdjęcie') + '</dd></div><div><dt>Rozmiar</dt><dd>' + Math.max(1, Math.round(rec.size / 1024)) + ' KB</dd></div><div><dt>Dodany</dt><dd>' + esc(T.fmtShort(A.store.fromIso(rec.added) || T.today)) + '</dd></div></dl>' +
        '<div class="s2-banner info">' + ic('info', 20) + '<p><b>Nie odczytuję treści Twojego pliku.</b> Rozpoznawanie tekstu działa w prototypie tylko na przykładowych pismach. Plik nie opuścił tej przeglądarki; zapisałem tylko jego nazwę, typ i rozmiar.</p></div>' +
        '<div class="actions">' +
          '<button type="button" class="btn secondary wide" data-act="inbox-assign" data-id="' + rec.id + '">' + ic('paperclip', 20) + (rec.caseLabel ? 'Przypisane: ' + esc(rec.caseLabel) : 'Przypisz do sprawy') + '</button>' +
          '<button type="button" class="btn secondary wide" data-act="inbox-sample" data-id="podatek">' + ic('scan', 20) + 'Zobacz analizę przykładowego pisma</button>' +
          '<button type="button" class="btn ghost wide" data-act="inbox-remove" data-id="' + rec.id + '">' + ic('trash', 20) + 'Usuń z listy</button>' +
        '</div></div>');
  }

  /* ---------- działania na dokumencie ---------- */

  const recOf = (id) => (st().inbox || []).find((d) => d.id === id);
  A.ext.acts['inbox-cal'] = (t) => {
    const rec = recOf(t.dataset.id); const x = rec && A.skrzynka.sample(rec.sample);
    if (!x) return;
    A.store.update((s) => { s.reminders = s.reminders.filter((r) => r.id !== 'in-' + rec.id).concat([{ id: 'in-' + rec.id, date: A.store.iso(x.due), title: 'Termin z pisma: ' + x.title, note: x.from }]); });
    A.toast('Dodano do kalendarza: ' + T.fmtOn(x.due) + '. To termin z pisma (fikcyjnego).', 'ok');
  };
  A.ext.acts['inbox-assign'] = (t) => {
    const rec = recOf(t.dataset.id);
    if (!rec) return;
    const x = rec.sample && A.skrzynka.sample(rec.sample);
    const opts = [];
    if (x && x.link) opts.push({ v: x.link.label, l: x.link.label, d: 'Proponuje Spinka na podstawie treści pisma.' });
    A.progressItems().forEach((c) => opts.push({ v: c.title, l: 'Sprawa: ' + c.title, d: c.statusText }));
    opts.push({ v: 'Nowa sprawa: ' + (x ? x.title : rec.name), l: 'Nowa sprawa', d: 'Utworzy osobną pozycję w Sprawach (symulacja).' });
    U.sheet.open({
      title: 'Przypisz do sprawy', opener: t,
      html: '<form class="s2-form" id="assign-form" novalidate>' + U.field({ id: 'sprawa', label: 'Do której sprawy dołączyć dokument?', type: 'radio', required: true, value: rec.caseLabel || (x && x.link ? x.link.label : ''), options: opts }) +
        '<div class="q-actions"><button type="button" class="btn primary" data-act="inbox-assign-ok" data-id="' + rec.id + '">Przypisz</button><button type="button" class="btn ghost" data-act="s2sheet-close">Anuluj</button></div></form>'
    });
  };
  A.ext.acts['inbox-assign-ok'] = (t) => {
    const r = U.validate(document.getElementById('assign-form'), [{ id: 'sprawa', label: 'Sprawa', type: 'radio', required: true }]);
    if (!r.ok) return;
    const id = t.dataset.id;
    A.store.update((s) => { const d = s.inbox.find((x) => x.id === id); if (d) d.caseLabel = r.values.sprawa.replace(/^Nowa sprawa: /, ''); });
    if (/^Nowa sprawa: /.test(r.values.sprawa)) A.upsertCase({ id: 'in-' + id, title: r.values.sprawa.replace(/^Nowa sprawa: /, ''), state: 'todo', statusText: 'Do przejrzenia', note: 'Utworzona ze skrzynki dokumentów (symulacja).', icon: 'scan', verb: 'Otwórz dokument', tab: undefined, detail: { kind: 'Dokument ze skrzynki', from: 'Skrzynka dokumentów', what: r.values.sprawa, why: 'Symulacja: sprawa istnieje tylko w tej przeglądarce.', next: 'Przejrzyj analizę dokumentu.' } });
    U.sheet.close(true);
    A.toast('Dokument przypisany: ' + r.values.sprawa.replace(/^Nowa sprawa: /, '') + '.', 'ok');
    A.render();
  };
  A.ext.acts['inbox-done'] = (t) => {
    const id = t.dataset.id;
    A.store.update((s) => { const d = s.inbox.find((x) => x.id === id); if (d) d.handled = !d.handled; });
    A.render();
    A.toast(recOf(id).handled ? 'Oznaczone jako załatwione. Zniknie z „Wymaga Twojej uwagi”.' : 'Przywrócone do załatwienia.', 'ok');
  };
  A.ext.acts['inbox-remove'] = (t) => {
    const id = t.dataset.id;
    A.confirm({ title: 'Usunąć plik z listy?', items: ['Plik zniknie z listy w skrzynce.', 'Na Twoim urządzeniu nic się nie zmieni.'], ok: 'Usuń', opener: t }).then((yes) => {
      if (!yes) return;
      if (pliki[id]) { URL.revokeObjectURL(pliki[id]); delete pliki[id]; }
      A.store.update((s) => { s.inbox = s.inbox.filter((x) => x.id !== id); });
      A.nav('skrzynka');
      A.toast('Usunięto z listy.', 'ok');
    });
  };

  A.ext.search.push(() => SAMPLES.map((x) => ({ group: 'Skrzynka (przykładowe pisma)', title: x.title, sub: x.from, icon: 'scan', attrs: 'data-act="inbox-sample" data-id="' + x.id + '"', keys: x.kind })));
  A.ext.deep.skrzynka = () => A.nav('skrzynka');
})(window.APP);
