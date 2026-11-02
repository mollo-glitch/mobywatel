/* Fikcyjne dane prototypu. Wszystkie daty liczą się od jednego zegara pokazowego (niżej). */
window.APP = window.APP || {};
(function (A) {
  'use strict';

  /*
   * ZEGAR POKAZOWY — jedyne miejsce, w którym ustawia się „dzisiaj” w prototypie.
   * Wszystkie terminy, „za N dni”, daty w pismach, dokumentach, kopertach, sprawach i odpowiedziach asystenta
   * liczą się od tej daty, więc na każdym ekranie się zgadzają. Przed pokazem wpisz tu datę pokazu
   * (RRRR-MM-DD) i zbuduj projekt: node build.mjs. Data jest też widoczna w Profilu → „O prototypie”.
   */
  const DEMO_TODAY = '2026-10-26';

  const DAY = 864e5;
  const [dy, dm, dd] = DEMO_TODAY.split('-').map(Number);
  const today = new Date(dy, dm - 1, dd, 12, 0, 0, 0); // południe: zmiana czasu nie przesuwa liczby dni
  const plus = (d) => new Date(today.getTime() + d * DAY);
  const fmt = (d) => d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtLong = (d) => d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = (d) => d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  // „Przypomnę w środę, 4 listopada”: dzień tygodnia w bierniku, bo „Przypomnę środa” jest niegramatyczne.
  const NA = ['w niedzielę', 'w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę'];
  const fmtOn = (d) => NA[d.getDay()] + ', ' + fmtShort(d);
  const fmtDM = (d) => d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  const inDays = (d) => Math.round((d - today) / DAY);
  const dni = (n) => (n === 1 ? '1 dzień' : n + ' dni');

  A.time = { today, plus, fmt, fmtLong, fmtShort, fmtOn, fmtDM, inDays, dni };

  // Lata w treściach też wynikają z zegara: PIT za poprzedni rok, harmonogram na następny, polisa z zeszłego roku.
  const year = today.getFullYear();
  const taxYear = year - 1;
  const policyNo = 'OC/' + (year - 1) + '/000123';
  // Pismo z urzędu skarbowego: ulga 760 zł; jeśli urząd jej nie uzna, dopłata to 12% (około 91 zł) z odsetkami.
  const relief = 760;
  const extraTax = Math.round(relief * 0.12);
  A.demo = { today: today, label: fmtLong(today) + ' ' + year, year: year, taxYear: taxYear, policyNo: policyNo, relief: relief, extraTax: extraTax };

  const ocEnd = plus(9);
  const idEnd = plus(50);
  const letterGot = plus(-2);
  const letterDue = plus(12);
  const caseStarted = plus(-13);

  A.person = {
    first: 'Tomasz',
    vocative: 'Tomaszu',
    last: 'Kowalczyk',
    pesel: '85031412345',
    peselMasked: '850314•••••',
    born: '14.03.1985',
    initials: 'TK',
    city: 'Warszawa',
    address: 'ul. Przykładowa 12 m. 4, 00-001 Warszawa'
  };

  A.dates = { ocEnd, idEnd, letterGot, letterDue, caseStarted };

  A.docs = [
    {
      id: 'dowod', name: 'Dowód osobisty', eyebrow: 'Tożsamość', icon: 'id', tone: 'blue',
      key: 'Ważny do', value: fmt(idEnd),
      status: { tone: 'warn', text: 'Ważny jeszcze ' + dni(inDays(idEnd)), short: 'za ' + dni(inDays(idEnd)) },
      rows: [
        ['Imię i nazwisko', 'Tomasz Kowalczyk'],
        ['Numer dokumentu', 'ABC 123456', 'ABC •••••6'],
        ['PESEL', '85031412345', '850314•••••'],
        ['Data wydania', fmt(plus(inDays(idEnd) - 3652))],
        ['Ważny do', fmt(idEnd)],
        ['Wydał', 'Prezydent m.st. Warszawy']
      ],
      note: 'Dowód traci ważność za ' + dni(inDays(idEnd)) + '. Wniosek o nowy zacząłeś ' + fmtShort(caseStarted) + ' i nie został jeszcze dokończony.',
      actions: [
        { label: 'Dokończ wniosek o nowy dowód', run: 'nowyDowod', preset: { resume: true }, primary: true },
        { label: 'Zgubiłem dowód lub go skradziono', run: 'portfel', preset: { items: ['dowod'] } },
        { label: 'Kto ma dostęp do tych danych', go: 'access' }
      ]
    },
    {
      id: 'prawko', name: 'Prawo jazdy', eyebrow: 'Uprawnienia', icon: 'steering', tone: 'berry',
      key: 'Kategorie', value: 'B',
      status: { tone: 'ok', text: 'Ważne, 0 punktów karnych' },
      rows: [
        ['Imię i nazwisko', 'Tomasz Kowalczyk'],
        ['Numer prawa jazdy', '01234/04/1465', '•••••/04/1465'],
        ['Kategorie', 'B (od 12.06.2004)'],
        ['Punkty karne', '0'],
        ['Ważne do', fmt(plus(2900))]
      ],
      note: 'W Polsce nie musisz wozić prawa jazdy przy sobie. Policja sprawdza uprawnienia w systemie.',
      actions: [
        { label: 'Zgubiłem prawo jazdy', run: 'portfel', preset: { items: ['prawko'] } }
      ]
    },
    {
      id: 'pojazd', name: 'Toyota Yaris', eyebrow: 'Pojazd', icon: 'car', tone: 'amber',
      key: 'OC do', value: fmt(ocEnd),
      status: { tone: 'warn', text: 'OC kończy się za ' + dni(inDays(ocEnd)), short: 'OC: ' + dni(inDays(ocEnd)) },
      rows: [
        ['Numer rejestracyjny', 'WX\u00a012345'],
        ['Marka i model', 'Toyota Yaris 1.5, 2019'],
        ['Ubezpieczenie OC', 'TU Przykład S.A.'],
        ['Numer polisy', policyNo],
        ['OC ważne do', fmt(ocEnd)],
        ['Badanie techniczne do', fmt(plus(160))]
      ],
      note: 'Dane pojazdu i polisy są przykładowe.',
      actions: [
        { label: 'OC kończy się za ' + dni(inDays(ocEnd)) + '. Co zrobić?', run: 'oc', primary: true }
      ]
    },
    {
      id: 'kdr', name: 'Karta Dużej Rodziny', eyebrow: 'Ulgi', icon: 'family', tone: 'violet',
      key: 'Ważna do', value: fmt(plus(1800)),
      status: { tone: 'ok', text: 'Ważna' },
      rows: [
        ['Imię i nazwisko', 'Tomasz Kowalczyk'],
        ['Numer karty', 'KDR 0001234', 'KDR •••1234'],
        ['Ważna do', fmt(plus(1800))]
      ],
      note: 'Z kartą masz zniżki u partnerów programu, np. na przejazdy i bilety do muzeów.',
      actions: [
        { label: 'Zgubiłem plastikową kartę', run: 'portfel', preset: { items: ['kdr'] } }
      ]
    },
    {
      id: 'paszport', name: 'Paszport', eyebrow: 'Podróże', icon: 'passport', tone: 'burgundy',
      key: 'Ważny do', value: fmt(plus(1320)),
      status: { tone: 'info', text: 'Tylko podgląd danych' },
      rows: [
        ['Imię i nazwisko', 'Tomasz Kowalczyk'],
        ['Numer paszportu', 'EA 0000000', 'EA •••••00'],
        ['Ważny do', fmt(plus(1320))]
      ],
      note: 'Paszportu nie pokażesz z telefonu na granicy. Tutaj widzisz jego dane i datę ważności, a przypomnienie dostaniesz pół roku przed jej końcem.',
      actions: []
    },
    {
      id: 'ekuz', name: 'Karta EKUZ', eyebrow: 'Zdrowie w UE', icon: 'health', tone: 'teal',
      key: 'Ważna do', value: fmt(plus(480)),
      status: { tone: 'ok', text: 'Ważna' },
      rows: [
        ['Imię i nazwisko', 'Tomasz Kowalczyk'],
        ['Numer karty', '80616 00000 00000', '80616 ••••• •••••'],
        ['Ważna do', fmt(plus(480))]
      ],
      note: 'Z kartą EKUZ w innych krajach Unii leczysz się na takich samych zasadach jak ich mieszkańcy.',
      actions: []
    }
  ];

  A.letters = [
    {
      id: 'us',
      from: 'Urząd Skarbowy w Przykładowie',
      title: 'Wezwanie do złożenia wyjaśnień',
      got: letterGot, due: letterDue, unread: true,
      original: [
        'Naczelnik Urzędu Skarbowego w Przykładowie, działając w ramach czynności sprawdzających, o których mowa w art. 272 ustawy z dnia 29 sierpnia 1997 r. – Ordynacja podatkowa, wzywa Pana do złożenia pisemnych wyjaśnień dotyczących zeznania PIT-37 za rok ' + taxYear + ' w zakresie odliczenia od dochodu wydatków z tytułu użytkowania sieci Internet w kwocie ' + relief + ',00 zł.',
        'Wyjaśnienia wraz z dokumentami potwierdzającymi poniesienie wydatku (faktura) należy złożyć w terminie 14 dni od dnia doręczenia niniejszego wezwania.',
        'Jednocześnie poucza się, że w przypadku niezłożenia wyjaśnień organ podatkowy może wszcząć postępowanie podatkowe w celu określenia wysokości zobowiązania.'
      ],
      plain: {
        who: 'Urząd Skarbowy w Przykładowie',
        what: 'Urząd chce wiedzieć, za co zapłaciłeś ' + relief + ' zł za internet, bo w PIT za ' + taxYear + ' rok odliczyłeś ulgę na internet. Najprościej odpowiedzieć, wysyłając fakturę albo potwierdzenie przelewu.',
        due: 'Do ' + fmt(letterDue) + ' (za ' + dni(inDays(letterDue)) + '). Termin liczy się od dnia, w którym odebrałeś pismo.',
        ifNothing: 'Urząd może nie uznać ulgi. Wtedy dopłacisz około ' + extraTax + ' zł podatku (12% z ' + relief + ' zł) razem z odsetkami.',
        notThis: 'To nie jest kara ani kontrola podatkowa. Urząd tylko sprawdza, czy w zeznaniu wszystko się zgadza.'
      },
      glossary: [
        ['czynności sprawdzające', 'Urząd sprawdza, czy w zeznaniu wszystko się zgadza. To nie jest kontrola.'],
        ['wezwanie', 'Prośba urzędu, żebyś coś zrobił w wyznaczonym terminie.'],
        ['doręczenie', 'Dzień, w którym odebrałeś pismo. Od niego liczy się termin.'],
        ['postępowanie podatkowe', 'Formalna sprawa w urzędzie, która kończy się decyzją, np. o dopłacie podatku.']
      ],
      phone: '22 000 00 00'
    },
    {
      id: 'gmina',
      from: 'Urząd Gminy Przykładowo',
      title: 'Harmonogram odbioru odpadów na ' + (year + 1) + ' rok',
      got: plus(-9), due: null, unread: false,
      original: ['W załączeniu przekazujemy harmonogram odbioru odpadów komunalnych na rok ' + (year + 1) + ' dla nieruchomości przy ul. Przykładowej 12.'],
      plain: {
        who: 'Urząd Gminy Przykładowo',
        what: 'To tylko informacja: nowy kalendarz wywozu śmieci na ' + (year + 1) + ' rok.',
        due: 'Nie musisz nic robić.',
        ifNothing: 'Nic się nie stanie.',
        notThis: 'To nie jest rachunek.'
      },
      glossary: [],
      phone: null
    }
  ];

  A.consents = [
    {
      id: 'bank', who: 'Bank Przykładowy S.A.', icon: 'building',
      what: ['Imię i nazwisko', 'PESEL', 'Numer i ważność dowodu', 'Adres zameldowania'],
      why: 'Potwierdzanie tożsamości przy usługach w banku',
      since: plus(-226), last: plus(-2), kind: 'stały', active: true
    },
    {
      id: 'przychodnia', who: 'Przychodnia „Zdrowie” (przykład)', icon: 'health',
      what: ['Imię i nazwisko', 'PESEL', 'Adres zameldowania'],
      why: 'Rejestracja na wizyty',
      since: plus(-700), last: plus(-31), kind: 'stały', active: true
    },
    {
      id: 'wypozyczalnia', who: 'Wypożyczalnia Aut Fikcja', icon: 'car',
      what: ['Kategorie prawa jazdy', 'Ważność prawa jazdy'],
      why: 'Sprawdzenie uprawnień przy wynajmie auta',
      since: plus(-72), last: plus(-72), kind: 'jednorazowy', active: false
    }
  ];

  /*
   * „Do załatwienia”: rzeczy, z którymi przychodzi do Ciebie państwo (pisma, terminy, przypomnienia).
   * isNew = koperta jeszcze nieotwarta. group 'info' = tylko do wiadomości.
   * Fabryki zwracają świeże obiekty, żeby „Zacznij od nowa” przywracało stan początkowy.
   */
  A.todoSeed = () => [
    {
      id: 'pismo-us', group: 'todo', isNew: true, icon: 'letter', kind: 'Pismo',
      from: 'Urząd Skarbowy w Przykładowie', title: 'Wezwanie do złożenia wyjaśnień', due: letterDue, letter: 'us',
      what: 'Urząd prosi o wyjaśnienie ulgi na internet (' + relief + ' zł), którą odliczyłeś w PIT za ' + taxYear + ' rok.',
      dueNote: 'Termin liczy się od dnia, w którym odebrałeś pismo.',
      why: 'Jeśli nie odpowiesz, urząd może nie uznać ulgi. Dopłacisz wtedy około ' + extraTax + ' zł podatku z odsetkami. To nie jest kara ani kontrola.',
      // Możliwa kwota, jeśli urząd nie uzna ulgi; asystent pokazuje ją na karcie przy pytaniu o długi.
      amount: { text: 'około ' + extraTax + ' zł', when: 'tylko jeśli urząd nie uzna ulgi' },
      next: 'Wyślij fakturę za internet. Pomogę napisać krótką odpowiedź, a przed wysłaniem zobaczysz podsumowanie.',
      verb: 'Odpowiedz', actionLabel: 'Odpowiedz na pismo', action: { run: 'pismo', preset: { letter: true } },
      more: [{ label: 'Przeczytaj pismo: po ludzku i oryginał', go: 'letter', id: 'us' }, { label: 'Przypomnij 3 dni przed terminem', remind: 3 }]
    },
    {
      id: 'oc', group: 'todo', isNew: true, icon: 'car', kind: 'Termin',
      from: 'Toyota Yaris, WX\u00a012345', title: 'Kończy się OC: Toyota Yaris', due: ocEnd,
      what: 'Polisa OC Twojej Toyoty Yaris kończy się ' + fmt(ocEnd) + '.',
      dueNote: 'Jeśli chcesz zmienić ubezpieczyciela, wypowiedz umowę najpóźniej dzień wcześniej.',
      why: 'OC musisz mieć bez przerwy, dopóki auto jest zarejestrowane. Za przerwę Ubezpieczeniowy Fundusz Gwarancyjny nalicza karę, nawet kilka tysięcy złotych.',
      next: 'Zdecyduj, czy zostajesz u obecnego ubezpieczyciela, czy zmieniasz. Pokażę skutki obu wyborów.',
      verb: 'Sprawdź', actionLabel: 'Sprawdź, co zrobić', action: { run: 'oc' },
      // Karta pojazdu na Starcie: tablica z pola „from”, przycisk i podpis terminu (bez nowych danych).
      plate: 'WX\u00a012345', openLabel: 'Zobacz, co zrobić', dueLabel: 'Polisa OC kończy się',
      more: [{ label: 'Przypomnij 2 dni przed końcem polisy', remind: 2 }]
    },
    {
      id: 'gmina', group: 'info', isNew: false, icon: 'letter', kind: 'Pismo',
      from: 'Urząd Gminy Przykładowo', title: 'Harmonogram odbioru odpadów na ' + (year + 1) + ' rok', due: null, letter: 'gmina',
      what: 'Nowy kalendarz wywozu śmieci na ' + (year + 1) + ' rok.',
      why: 'To tylko informacja. Nie musisz nic robić.',
      next: 'Przeczytaj, jeśli chcesz sprawdzić terminy wywozu.',
      verb: 'Przeczytaj', actionLabel: 'Przeczytaj pismo', action: { go: 'letter', id: 'gmina' },
      more: []
    }
  ];

  // „W toku”: sprawy, które zaczął użytkownik. Termin ważności dowodu jest częścią sprawy o nowy dowód.
  A.casesSeed = () => [
    {
      id: 'nowy-dowod', title: 'Wniosek o nowy dowód osobisty', state: 'todo',
      statusText: 'Do dokończenia', step: 1, steps: 4, due: idEnd, dueWhat: 'obecny dowód ważny do',
      note: 'Zacząłeś ' + fmtShort(caseStarted) + '. Zostało: sprawdzenie danych, zdjęcie i termin wizyty.',
      next: 'Sprawdź dane, dodaj zdjęcie i wybierz termin wizyty.',
      run: 'nowyDowod', preset: { resume: true }, verb: 'Dokończ'
    },
    {
      id: 'adres', title: 'Zmiana adresu zameldowania', state: 'office', sent: plus(-6),
      statusText: 'Urząd rozpatruje', step: 3, steps: 4,
      note: 'Wysłane ' + fmtShort(plus(-6)) + '. Urząd ma czas do ' + fmtShort(plus(24)) + '. Dostaniesz powiadomienie.',
      verb: 'Sprawdź status',
      detail: {
        kind: 'Sprawa w toku', from: 'Urząd Dzielnicy Przykładowo (fikcyjny)',
        what: 'Zgłoszenie zmiany adresu zameldowania, wysłane ' + fmt(plus(-6)) + '.',
        due: plus(24), dueNote: 'Tyle czasu ma urząd na zakończenie sprawy.',
        why: 'Etap 3 z 4: urząd sprawdza zgłoszenie. Dopóki sprawa trwa, w rejestrze widnieje dotychczasowy adres.',
        next: 'Nic nie musisz robić. Dostaniesz powiadomienie, gdy urząd zakończy sprawę.'
      }
    }
  ];

  /*
   * Rekordy dla modelu AI: ograniczony, fikcyjny zestaw spraw, dokumentów i terminów z tej demonstracji.
   * Wszystkie daty i liczby dni są tu policzone kodem od zegara pokazowego (model ich nie liczy, tylko objaśnia).
   * build.mjs wywołuje tę funkcję na danych początkowych i zapisuje wynik w server/dane-demo.mjs: serwer odpowiada
   * tylko z tych rekordów, a z przeglądarki przyjmuje jedynie krótki, sprawdzalny stan demonstracji (server/kontekst.mjs).
   * Bez osoby, numerów dokumentów, tablic, numeru polisy i pełnej treści pism.
   */
  const SAFE_ROWS = ['Ważny do', 'Ważne do', 'Ważna do', 'Data wydania', 'Wydał', 'Kategorie', 'Punkty karne', 'Marka i model', 'Ubezpieczenie OC', 'OC ważne do', 'Badanie techniczne do'];
  const two = (n) => (n < 10 ? '0' : '') + n;
  const iso = (d) => d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
  const when = (d) => { const n = inDays(d); return fmt(d) + ' (' + fmtLong(d) + ', ' + (n >= 0 ? 'za ' + dni(n) : dni(-n) + ' temu') + ')'; };
  A.kontekstZDanych = (todo, cases, docs) => {
    const z = [];
    (todo || []).forEach((t) => {
      const f = [t.kind === 'Pismo' ? 'Od: ' + t.from : null, t.what, t.due ? (t.dueLabel || 'Termin') + ': ' + when(t.due) : null, t.dueNote,
        t.amount ? 'Możliwa kwota: ' + t.amount.text + ', ' + t.amount.when : null, t.why, t.next];
      z.push({ id: 'todo:' + t.id, rodzaj: t.group === 'info' ? 'informacja' : t.kind === 'Pismo' ? 'pismo' : 'termin', tytul: t.title, fakty: f.filter(Boolean), termin: t.due ? iso(t.due) : null });
    });
    (docs || []).forEach((d) => {
      const rows = (d.rows || []).filter((r) => SAFE_ROWS.indexOf(r[0]) >= 0).map((r) => r[0] + ': ' + r[1]);
      z.push({ id: 'doc:' + d.id, rodzaj: 'dokument', tytul: d.name, fakty: [d.status ? 'Status: ' + d.status.text : null].concat(rows, [d.note]).filter(Boolean) });
    });
    (cases || []).forEach((c) => {
      z.push({ id: 'case:' + c.id, rodzaj: 'sprawa', tytul: c.title, fakty: ['Status: ' + c.statusText, c.steps ? 'Etap ' + c.step + ' z ' + c.steps : null,
        c.due ? (c.dueWhat ? c.dueWhat.charAt(0).toUpperCase() + c.dueWhat.slice(1) : 'Termin') + ': ' + when(c.due) : null, c.note, c.next].filter(Boolean) });
    });
    return { dzis: iso(today), dzis_slownie: fmtLong(today) + ' ' + today.getFullYear(), zrodla: z };
  };

  A.suggestions = ['Zgubiłem portfel', 'Pismo z urzędu', 'Kończy się OC', 'Kto widzi moje dane?'];

  A.voiceSamples = [
    'Yyy, zgubiłem wczoraj portfel w tramwaju',
    'Dostałem jakiś list ze skarbówki i nie wiem, o co chodzi',
    'Chyba kończy mi się ubezpieczenie auta',
    'Kto ma dostęp do moich danych?'
  ];
})(window.APP);
