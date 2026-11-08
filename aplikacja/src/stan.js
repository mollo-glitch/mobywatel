/*
 * Spinka 2.0: stan modułów i dane demonstracyjne (fikcyjne).
 * Stan (wersje robocze, sprawy z kreatorów, przypomnienia, opłacone w symulacji, dokumenty ze skrzynki, zakończone sesje,
 * uprawnienia w rodzinie, historia zgód portfela EU) jest w pamięci tej przeglądarki (localStorage, klucz „spinka2-stan”)
 * i wraca do stanu przykładowego po „Zacznij demonstrację od nowa”. Treści dodanych plików NIE są zapisywane.
 * Wszystkie daty liczą się od zegara pokazowego (src/data.js), więc każdy ekran pokazuje te same dni.
 */
window.APP = window.APP || {};
(function (A) {
  'use strict';
  const T = A.time;
  const KEY = 'spinka2-stan';
  const VER = 1;
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const fromIso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; };

  function seed() {
    return { v: VER, drafts: {}, submitted: [], read: {}, reminders: [], paid: {}, inbox: [], ended: {}, ack: {}, perms: {}, signed: {}, wallet: [] };
  }
  let st = null;
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { st = null; }
  if (!st || st.v !== VER) st = seed();
  const listeners = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* brak pamięci przeglądarki: stan tylko do odświeżenia */ } };
  A.store = {
    get: () => st,
    update(fn) { fn(st); save(); listeners.forEach((l) => l()); },
    reset() { st = seed(); save(); listeners.forEach((l) => l()); },
    on(fn) { listeners.push(fn); },
    iso: iso,
    fromIso: fromIso
  };

  /* ---------- dane demonstracyjne modułów ---------- */

  const S = (A.s2 = {});
  const FIKCJA = ' (fikcyjny)';

  // Należności: kwoty i instytucje fikcyjne; termin raty podatku od nieruchomości wypada 15 listopada, jak w przepisach.
  S.payments = [
    { id: 'podatek', title: 'Podatek od nieruchomości: IV rata', inst: 'Urząd Gminy Przykładowo' + FIKCJA, amount: 182, due: T.plus(20), icon: 'building', cat: 'podatki',
      what: 'Czwarta rata podatku od mieszkania przy ul. Przykładowej 12. Kwota wynika z decyzji wymiarowej (dane fikcyjne).',
      ifLate: 'Po terminie urząd nalicza odsetki za zwłokę od zaległej kwoty.', ref: 'Decyzja wymiarowa na ' + A.demo.year + ' r.' },
    { id: 'odpady', title: 'Opłata za odbiór odpadów: listopad', inst: 'Urząd Gminy Przykładowo' + FIKCJA, amount: 46, due: T.plus(15), icon: 'home', cat: 'oplaty',
      what: 'Miesięczna opłata za gospodarowanie odpadami dla gospodarstwa domowego (stawka fikcyjna).',
      ifLate: 'Po terminie gmina może wysłać upomnienie, a za nie pobrać koszty upomnienia.', ref: 'Deklaracja o wysokości opłaty' }
  ];

  // Rodzina (fikcyjna). Uprawnienia zależą od roli: rodzic widzi dokumenty i sprawy dziecka; dorosły decyduje sam,
  // co udostępnia. Dziecko nie widzi danych rodziców.
  const born = T.plus(-7);
  const kartaUrodzenia = T.plus(-7);
  S.family = [
    { id: 'anna', name: 'Anna Kowalczyk', short: 'Anna', rel: 'Żona', age: 36, initials: 'AK', adult: true,
      note: 'Ma własne konto. Widzisz tylko to, co Ci udostępniła.',
      docs: [{ name: 'Karta Dużej Rodziny', valid: T.plus(1800), shared: true }],
      shares: [{ id: 'kdr', label: 'Karta Dużej Rodziny', on: true }, { id: 'terminy', label: 'Wspólne przypomnienia o terminach dzieci', on: true }] },
    { id: 'zosia', name: 'Zofia Kowalczyk', short: 'Zosia', rel: 'Córka', age: 9, initials: 'ZK',
      docs: [{ name: 'Legitymacja szkolna', valid: T.plus(310) }, { name: 'Paszport', valid: T.plus(40), warn: 'Traci ważność przed planowanym wyjazdem.' }],
      consents: [{ id: 'wycieczka', title: 'Zgoda na wycieczkę szkolną do Krakowa', due: T.plus(6), from: 'Szkoła Podstawowa nr 1 w Przykładowie' + FIKCJA,
        detail: 'Wyjazd 3-dniowy, opiekunowie: dwoje nauczycieli. Szkoła prosi o zgodę obojga rodziców albo jednego z informacją, że drugi wie o wyjeździe.' }] },
    { id: 'antek', name: 'Antoni Kowalczyk', short: 'Antek', rel: 'Syn', age: 5, initials: 'AK',
      docs: [{ name: 'Karta Dużej Rodziny (dziecko)', valid: T.plus(1800) }], consents: [] },
    { id: 'maluch', name: 'Dziecko urodzone ' + T.fmtShort(born), short: 'Najmłodsze dziecko', rel: 'Syn (noworodek)', age: 0, initials: '♡', newborn: true,
      docs: [], consents: [],
      karta: { from: 'Szpital Przykładowy' + FIKCJA, date: kartaUrodzenia, due: T.plus(14) } }
  ];

  // Sesje (symulacja): urządzenia, na których „zalogowano się” do prototypu. Nietypowe: inne miasto.
  S.sessions = [
    { id: 'tel', device: 'Ten telefon', os: 'Android', where: 'Warszawa', last: T.today, current: true },
    { id: 'pc', device: 'Przeglądarka na komputerze', os: 'Windows', where: 'Warszawa', last: T.plus(-1) },
    { id: 'tablet', device: 'Tablet', os: 'Android', where: 'Kraków', last: T.today, unusual: true }
  ];

  // Historia dostępu do danych (oprócz zgód z „Kto ma dostęp”): odczyty przez urzędy i usługi, fikcyjne.
  S.accessLog = [
    { who: 'Bank Przykładowy S.A.' + FIKCJA, what: 'Imię i nazwisko, PESEL, numer dowodu', when: T.plus(-2), why: 'Potwierdzenie tożsamości przy otwieraniu lokaty' },
    { who: 'Urząd Dzielnicy Przykładowo' + FIKCJA, what: 'Adres zameldowania', when: T.plus(-6), why: 'Sprawa zmiany adresu (Twój wniosek)' },
    { who: 'Przychodnia „Zdrowie”' + FIKCJA, what: 'Imię i nazwisko, PESEL', when: T.plus(-31), why: 'Rejestracja na wizytę' },
    { who: 'Wypożyczalnia Aut Fikcja', what: 'Kategorie i ważność prawa jazdy', when: T.plus(-72), why: 'Wynajem auta (zgoda jednorazowa)' }
  ];

  // Powiadomienia startowe. Przeczytanie zapisuje się w stanie; „go” mówi, dokąd prowadzi powiadomienie.
  S.notices = () => [
    { id: 'n-sesja', when: T.today, title: 'Nowe logowanie: tablet w Krakowie', from: 'Centrum bezpieczeństwa (symulacja)', icon: 'shield', attrs: 'data-go="bezpieczenstwo"', kind: 'security' },
    { id: 'n-dziecko', when: T.plus(-6), title: 'Szpital przekazał kartę urodzenia dziecka', from: 'Zgłoś narodziny, żeby dziecko dostało akt urodzenia i PESEL', icon: 'baby', attrs: 'data-go="proces" data-id="narodziny"' },
    { id: 'n-podatek', when: T.plus(-3), title: 'Nowa należność: podatek od nieruchomości', from: 'IV rata, ' + A.ui.money(182) + ', do ' + T.fmtShort(T.plus(20)), icon: 'coin', attrs: 'data-go="platnosci"' },
    { id: 'n-wersja', when: T.plus(-4), title: 'Prototyp w wersji 2.0', from: 'Centrum spraw, Załatw za mnie, kalendarz, skrzynka i więcej', icon: 'sparkle', attrs: 'data-go="aktualizacje"' }
  ];
  A.ext.notifications = () => S.notices().filter((n) => !(n.kind === 'security' && st.ended.tablet))
    .map((n) => Object.assign({}, n, { unread: !st.read[n.id], attrs: n.attrs + ' data-nid="' + n.id + '"' }));
  A.ext.unreadCount = () => A.ext.notifications().filter((n) => n.unread).length;
  // Otwarcie powiadomienia oznacza je jako przeczytane (wiersz ma data-nid).
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('#msgs .msg-row[data-nid]');
    if (b && !st.read[b.dataset.nid]) A.store.update((s) => { s.read[b.dataset.nid] = true; });
  }, true);

  /* ---------- „Wymaga Twojej uwagi”: priorytet według pilności i skutków ---------- */

  // Skutek: 3 wysoki (kara, utrata uprawnień, brak aktu), 2 średni (odsetki, dopłata), 1 niski (upomnienie, wygoda).
  // Pilność z liczby dni do terminu. Wynik = pilność + 2 × skutek (skutek waży więcej niż bliskość terminu, więc zgoda na
  // wycieczkę za 6 dni nie wyprzedza OC za 9 dni); przy równym wyniku wcześniejszy termin.
  const urgency = (n) => (n === null ? 0 : n <= 3 ? 4 : n <= 7 ? 3 : n <= 14 ? 2 : n <= 30 ? 1 : 0);
  const CONS = { 3: 'wysoki', 2: 'średni', 1: 'niski' };
  S.attention = () => {
    const out = [];
    const add = (o) => { const n = o.due ? T.inDays(o.due) : null; o.days = n; o.score = urgency(n) + 2 * o.cons; o.consText = CONS[o.cons]; out.push(o); };
    (A.todo || []).filter((t) => t.group === 'todo' && t.due).forEach((t) => add({
      id: 'todo:' + t.id, kind: t.kind === 'Pismo' ? 'Pismo' : 'Termin', icon: t.icon, title: t.title, from: t.from, due: t.due,
      cons: t.id === 'oc' ? 3 : 2, why: t.why, next: t.next, attrs: 'data-act="item" data-id="' + t.id + '"', verb: t.verb || 'Otwórz'
    }));
    const baby = S.family.find((m) => m.newborn);
    if (baby && !(st.submitted || []).some((x) => x.proc === 'narodziny')) add({
      id: 'family:narodziny', kind: 'Rodzina', icon: 'baby', title: 'Zgłoś narodziny dziecka', from: baby.karta.from + ' przekazał kartę urodzenia', due: baby.karta.due, cons: 3,
      why: 'Dopóki narodzin nie zgłosisz, dziecko nie ma aktu urodzenia ani numeru PESEL, a bez nich nie złożysz wniosków o świadczenia na dziecko.',
      next: 'Formularz uzupełni się danymi z karty urodzenia. Zajmie około 5 minut.', attrs: 'data-go="proces" data-id="narodziny"', verb: 'Zgłoś',
      rule: 'Termin ustawowy: 21 dni od sporządzenia karty urodzenia (informacja ogólna, sprawdź na gov.pl).'
    });
    S.payments.filter((p) => !st.paid[p.id]).forEach((p) => add({
      id: 'pay:' + p.id, kind: 'Płatność', icon: 'coin', title: p.title, from: p.inst, due: p.due, cons: p.id === 'podatek' ? 2 : 1, amount: p.amount,
      why: p.ifLate, next: 'Opłać w symulacji albo ustaw przypomnienie.', attrs: 'data-go="platnosci" data-id="' + p.id + '"', verb: 'Opłać'
    }));
    const zosia = S.family.find((m) => m.id === 'zosia');
    const cons = zosia.consents.find((c) => c.id === 'wycieczka');
    if (cons && !st.signed[cons.id]) add({
      id: 'consent:' + cons.id, kind: 'Zgoda rodzica', icon: 'family', title: cons.title, from: cons.from, due: cons.due, cons: 1,
      why: 'Bez zgody szkoła nie zabierze Zosi na wyjazd.', next: 'Przeczytaj szczegóły i zdecyduj.', attrs: 'data-go="osoba" data-id="zosia"', verb: 'Zdecyduj'
    });
    const dowod = (A.cases || []).find((c) => c.id === 'nowy-dowod' && c.state !== 'demo');
    if (dowod) add({
      id: 'case:nowy-dowod', kind: 'Nieukończona sprawa', icon: 'id', title: dowod.title, from: 'Zaczęte ' + T.fmtShort(A.dates.caseStarted) + ', etap ' + dowod.step + ' z ' + dowod.steps,
      due: dowod.due, cons: 2, why: 'Obecny dowód traci ważność. Na nowy dowód czeka się zwykle kilka tygodni.', next: dowod.next,
      attrs: 'data-run="nowyDowod" data-preset=\'{"resume":true}\'', verb: 'Dokończ'
    });
    Object.keys(st.drafts || {}).forEach((pid) => {
      const d = st.drafts[pid]; const P = A.uslugi && A.uslugi.byId(pid);
      if (!P) return;
      add({ id: 'draft:' + pid, kind: 'Wersja robocza', icon: 'edit', title: P.title, from: 'Zapisana ' + T.fmtShort(fromIso(d.saved) || T.today) + ', krok ' + (d.step + 1) + ' z ' + P.stepsN,
        due: null, cons: 1, why: 'Wersja robocza czeka tylko w tej przeglądarce. Nic nie zostało wysłane.', next: 'Dokończ od miejsca, w którym przerwałeś.',
        attrs: 'data-go="proces" data-id="' + pid + '"', verb: 'Dokończ' });
    });
    (st.inbox || []).filter((d) => !d.handled).forEach((d) => {
      const smp = A.skrzynka && A.skrzynka.sample(d.sample);
      if (!smp || !smp.due) return;
      add({ id: 'inbox:' + d.id, kind: 'Dokument ze skrzynki', icon: 'scan', title: smp.title, from: smp.from, due: smp.due, cons: smp.cons || 1,
        why: smp.ifNothing, next: 'Zobacz analizę i zdecyduj, co dalej.', attrs: 'data-go="analiza" data-id="' + d.id + '"', verb: 'Zobacz' });
    });
    if (!st.ack.tablet && !st.ended.tablet) add({
      id: 'sec:tablet', kind: 'Bezpieczeństwo', icon: 'shield', title: 'Nowe logowanie: tablet w Krakowie', from: 'Symulacja w prototypie', due: null, cons: 3,
      why: 'Jeśli to nie Ty, ktoś może mieć dostęp do Twojego konta.', next: 'Sprawdź sesję i zakończ ją, jeśli jej nie rozpoznajesz.', attrs: 'data-go="bezpieczenstwo"', verb: 'Sprawdź'
    });
    return out.sort((a, b) => (b.score - a.score) || ((a.days === null ? 1e4 : a.days) - (b.days === null ? 1e4 : b.days)));
  };

  /* ---------- kalendarz obywatela: wszystkie terminy z jednego miejsca ---------- */

  /*
   * Rodzaje: termin (wynika z pisma, decyzji lub przepisu; „wiążący” tylko w sensie danych demonstracyjnych),
   * waznosc (data ważności dokumentu), przypomnienie (ustawione przez Ciebie), szacunek (przewidywany, NIEWIĄŻĄCY).
   */
  S.CATS = [
    { id: 'urzedowe', label: 'Urzędowe', icon: 'building' },
    { id: 'dokumenty', label: 'Ważność dokumentów', icon: 'id' },
    { id: 'oc', label: 'Pojazd i OC', icon: 'car' },
    { id: 'platnosci', label: 'Płatności', icon: 'coin' },
    { id: 'rodzina', label: 'Rodzina', icon: 'family' },
    { id: 'przypomnienia', label: 'Przypomnienia', icon: 'bell' }
  ];
  S.events = () => {
    const ev = [];
    const push = (o) => ev.push(Object.assign({ kind: 'termin' }, o));
    (A.todo || []).forEach((t) => {
      if (t.due && t.group === 'todo') push({ id: 'todo:' + t.id, date: t.due, title: t.id === 'oc' ? 'Koniec polisy OC: Toyota Yaris' : 'Termin odpowiedzi: ' + t.title, cat: t.id === 'oc' ? 'oc' : 'urzedowe',
        source: t.id === 'oc' ? 'Polisa w danych pojazdu (fikcyjna)' : 'Pismo: ' + t.from + ' (fikcyjne)', detail: t.dueNote || '', attrs: 'data-act="item" data-id="' + t.id + '"' });
      if (t.reminder) push({ id: 'rem:' + t.id, date: t.reminder, kind: 'przypomnienie', title: 'Przypomnienie: ' + t.title, cat: 'przypomnienia', source: 'Ustawione przez Ciebie', attrs: 'data-act="item" data-id="' + t.id + '"' });
    });
    (A.docs || []).forEach((d) => {
      const row = (d.rows || []).find((r) => /^Ważn[ya] do$|^Ważne do$/.test(r[0]));
      const date = row && parseDmy(row[1]);
      if (date && T.inDays(date) <= 400) push({ id: 'doc:' + d.id, date: date, kind: 'waznosc', title: 'Ważność: ' + d.name, cat: 'dokumenty', source: 'Dokument w aplikacji (fikcyjny)', attrs: 'data-go="doc" data-id="' + d.id + '"' });
      const tech = (d.rows || []).find((r) => r[0] === 'Badanie techniczne do');
      if (tech) push({ id: 'tech:' + d.id, date: parseDmy(tech[1]), kind: 'waznosc', title: 'Badanie techniczne: Toyota Yaris', cat: 'oc', source: 'Dane pojazdu (fikcyjne)', attrs: 'data-go="doc" data-id="' + d.id + '"' });
    });
    S.payments.forEach((p) => push({ id: 'pay:' + p.id, date: p.due, title: p.title + ' (' + A.ui.money(p.amount) + ')', cat: 'platnosci', source: p.ref + ' (fikcyjna)', done: !!st.paid[p.id], attrs: 'data-go="platnosci" data-id="' + p.id + '"' }));
    S.family.forEach((m) => {
      (m.docs || []).forEach((d) => { if (d.valid && T.inDays(d.valid) <= 400) push({ id: 'fdoc:' + m.id + d.name, date: d.valid, kind: 'waznosc', title: d.name + ': ' + m.short, cat: 'rodzina', source: 'Dokument członka rodziny (fikcyjny)', attrs: 'data-go="osoba" data-id="' + m.id + '"' }); });
      (m.consents || []).forEach((c) => push({ id: 'fcons:' + c.id, date: c.due, title: c.title, cat: 'rodzina', source: c.from, done: !!st.signed[c.id], attrs: 'data-go="osoba" data-id="' + m.id + '"' }));
      if (m.karta) push({ id: 'narodziny', date: m.karta.due, title: 'Zgłoszenie narodzin dziecka', cat: 'rodzina', source: 'Karta urodzenia: ' + m.karta.from + '; termin ustawowy 21 dni (informacja ogólna)', done: (st.submitted || []).some((x) => x.proc === 'narodziny'), attrs: 'data-go="proces" data-id="narodziny"' });
    });
    (A.cases || []).forEach((c) => { if (c.detail && c.detail.due) push({ id: 'case:' + c.id, date: c.detail.due, title: 'Urząd ma czas na: ' + c.title.toLowerCase(), cat: 'urzedowe', source: c.detail.from, attrs: 'data-act="case-detail" data-id="' + c.id + '"' }); });
    (st.submitted || []).forEach((x) => { if (x.expected) push({ id: 'sub:' + x.id, date: fromIso(x.expected), kind: 'szacunek', title: 'Przewidywane zakończenie: ' + x.title, cat: 'urzedowe', source: 'Szacunek prototypu, niewiążący', attrs: 'data-act="case-detail" data-id="' + x.id + '"' }); });
    (st.reminders || []).forEach((r) => push({ id: 'my:' + r.id, date: fromIso(r.date), kind: 'przypomnienie', title: r.title, cat: 'przypomnienia', source: 'Ustawione przez Ciebie', note: r.note, mine: r.id }));
    return ev.filter((e) => e.date).sort((a, b) => a.date - b.date);
  };
  function parseDmy(s) { const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s || ''); return m ? new Date(+m[3], +m[2] - 1, +m[1], 12) : null; }
  S.parseDmy = parseDmy;
})(window.APP);
