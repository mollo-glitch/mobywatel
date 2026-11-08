/*
 * Spinka 2.0: „Załatw za mnie” — katalog spraw i jeden silnik kreatora dla wszystkich procesów.
 * Każdy proces ma te same kroki: 1 O sprawie, 2 Dokumenty, 3 Dane (autouzupełnianie i walidacja), 4 Koszty,
 * 5 Podsumowanie i decyzja, 6 Status (symulacja). Wersja robocza zapisuje się przy każdym „Dalej” i przyciskiem
 * „Zapisz wersję roboczą” (tylko w tej przeglądarce). Nic nie jest wysyłane: prototyp nie łączy się z urzędem,
 * a ekran końcowy nie udaje urzędowego potwierdzenia (brak numeru nadania, pieczęci i UPO).
 * Opisy procesów są ogólne i oznaczone; kwoty i terminy sprawdzisz w źródle (gov.pl) przed prawdziwą sprawą.
 */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = (s) => A.esc(s);
  const T = A.time;
  const U = A.ui;
  const P = A.person;
  const st = () => A.store.get();
  const OGOLNA = 'Informacja ogólna w prototypie, nie porada prawna. Przed prawdziwą sprawą sprawdź aktualne zasady na gov.pl.';
  const KROKI = ['O sprawie', 'Dokumenty', 'Dane', 'Koszty', 'Podsumowanie', 'Status'];

  const baby = () => A.s2.family.find((m) => m.newborn);
  const PL_LETTERS = /^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż' -]{1,39}$/;

  /* ---------- procesy ---------- */

  const PROC = [
    {
      id: 'narodziny', cat: 'rodzina', icon: 'baby', title: 'Zgłoszenie narodzin dziecka', inst: 'Urząd stanu cywilnego (symulacja)',
      lead: 'Zgłaszasz narodziny, żeby dziecko dostało akt urodzenia i numer PESEL.',
      explain: ['Szpital przekazał już kartę urodzenia do urzędu stanu cywilnego (w prototypie: ' + baby().karta.from + ').',
        'Wybierasz imiona dziecka i nazwisko. Dane rodziców i miejsce urodzenia uzupełniają się same.',
        'Po zgłoszeniu urząd sporządza akt urodzenia i nadaje numer PESEL. W prawdziwej usłudze odpis aktu przychodzi do skrzynki.'],
      rule: 'Termin: 21 dni od sporządzenia karty urodzenia. ' + OGOLNA,
      due: () => baby().karta.due,
      docs: [{ n: 'Karta urodzenia', have: true, d: 'Przekazana przez szpital ' + T.fmtShort(baby().karta.date) + ' (dane fikcyjne).' },
        { n: 'Dane rodziców', have: true, d: 'Z Twojego profilu i profilu Anny (udostępnione w Rodzinie).' },
        { n: 'Akt małżeństwa rodziców', have: true, d: 'Jest w rejestrze; nie trzeba go dołączać.' }],
      fields: [
        { id: 'imie', label: 'Imię dziecka', type: 'text', required: true, pattern: PL_LETTERS, msg: 'Wpisz imię literami (2–40 znaków), bez cyfr.', autocomplete: 'off' },
        { id: 'imie2', label: 'Drugie imię', type: 'text', pattern: PL_LETTERS, msg: 'Wpisz drugie imię literami albo zostaw puste.' },
        { id: 'nazwisko', label: 'Nazwisko dziecka', type: 'radio', required: true, value: 'Kowalczyk', auto: 'z danych rodziców',
          options: [{ v: 'Kowalczyk', l: 'Kowalczyk', d: 'Nazwisko obojga rodziców.' }] },
        { id: 'plec', label: 'Płeć z karty urodzenia', type: 'select', required: true, value: 'm', auto: 'z karty urodzenia', options: [{ v: 'm', l: 'chłopiec' }, { v: 'k', l: 'dziewczynka' }] },
        { id: 'meldunek', label: 'Zamelduj dziecko pod moim adresem (ul. Przykładowa 12)', type: 'checkbox', value: 'true', hint: 'Możesz to zrobić także później.' }
      ],
      cost: { amount: 0, text: 'Bezpłatnie', note: 'Zgłoszenie urodzenia i pierwszy odpis aktu nie wymagają opłaty (informacja ogólna).' },
      will: (v) => ['Zgłoszę narodziny dziecka: ' + v.imie + (v.imie2 ? ' ' + v.imie2 : '') + ' ' + v.nazwisko + '.', v.meldunek ? 'Zamelduję dziecko pod Twoim adresem.' : 'Nie zamelduję dziecka (możesz to zrobić później).', 'Dane rodziców wezmę z rejestru; niczego nie zmienię w Twoim profilu.'],
      done: { status: 'Zgłoszenie przyjęte (symulacja)', steps: 3, step: 2, days: 1, next: 'W prawdziwej usłudze: odpis aktu urodzenia trafi do skrzynki, a dziecko dostanie PESEL. Potem możesz złożyć wniosek o świadczenie wychowawcze.', then: { go: 'proces', id: 'swiadczenie', label: 'Złóż wniosek o świadczenie wychowawcze' } },
      keys: 'urodzenie urodzil urodzila narodziny dziecko noworodek akt urodzenia pesel usc'
    },
    {
      id: 'swiadczenie', cat: 'rodzina', icon: 'family', title: 'Wniosek o świadczenie wychowawcze na dziecko', inst: 'Instytucja wypłacająca świadczenie (symulacja)',
      lead: 'Składasz wniosek o comiesięczne świadczenie na dziecko.',
      explain: ['Wniosek dotyczy dziecka, które ma już numer PESEL.', 'Rachunek do wypłaty i dane rodziców uzupełniają się z profilu.', 'Instytucja rozpatruje wniosek i informuje o decyzji w aplikacji.'],
      rule: 'Kwota, terminy i zasady świadczenia zależą od aktualnych przepisów. ' + OGOLNA,
      docs: [{ n: 'PESEL dziecka', have: () => !baby() || st().submitted.some((x) => x.proc === 'narodziny'), d: 'Nadawany po zgłoszeniu narodzin.' },
        { n: 'Rachunek bankowy', have: true, d: 'Z profilu, numer zamaskowany: ••• 1234 (fikcyjny).' }],
      fields: [
        { id: 'dziecko', label: 'Dla którego dziecka?', type: 'radio', required: true, options: [
          { v: 'maluch', l: 'Najmłodsze dziecko', d: 'Urodzone ' + T.fmtShort(T.plus(-7)) + '.' },
          { v: 'antek', l: 'Antoni, 5 lat', d: 'Świadczenie jest już wypłacane (w prototypie).' }] },
        { id: 'rachunek', label: 'Rachunek do wypłaty', type: 'select', required: true, value: 'r1234', auto: 'z profilu', options: [{ v: 'r1234', l: 'Konto osobiste ••• 1234 (fikcyjne)' }] },
        { id: 'oswiadczenie', label: 'Potwierdzam, że dane we wniosku są zgodne z prawdą (w prototypie: dane fikcyjne)', type: 'checkbox', required: true }
      ],
      check: (v) => (v.dziecko === 'maluch' && !st().submitted.some((x) => x.proc === 'narodziny') ? { field: 'dziecko', msg: 'To dziecko nie ma jeszcze numeru PESEL. Najpierw zgłoś narodziny.' }
        : v.dziecko === 'antek' ? { field: 'dziecko', msg: 'Na Antoniego świadczenie jest już wypłacane. Wybierz inne dziecko.' } : null),
      cost: { amount: 0, text: 'Bezpłatnie', note: 'Złożenie wniosku nie wymaga opłaty.' },
      will: () => ['Złożę wniosek o świadczenie na najmłodsze dziecko.', 'Wypłata na konto ••• 1234 (fikcyjne).'],
      done: { status: 'Wniosek złożony (symulacja)', steps: 3, step: 2, days: 30, next: 'Instytucja rozpatruje wniosek. Przewidywany termin w kalendarzu jest szacunkiem i nie jest wiążący.' },
      keys: '800 plus 800+ swiadczenie wychowawcze dziecko pieniadze zus'
    },
    {
      id: 'kontakt', cat: 'tozsamosc', icon: 'user', title: 'Zmiana danych kontaktowych', inst: 'Rejestr danych kontaktowych (symulacja)',
      lead: 'Aktualizujesz telefon i e-mail, na które urzędy mogą wysyłać powiadomienia.',
      explain: ['Dane kontaktowe służą do powiadomień, np. o gotowym dowodzie albo terminie wizyty.', 'Zmiana nie dotyczy adresu zameldowania; ten zmieniasz osobno (masz już taką sprawę w toku).'],
      rule: OGOLNA,
      docs: [{ n: 'Dostęp do nowego telefonu lub skrzynki e-mail', have: true, d: 'W prawdziwej usłudze przyjdzie kod potwierdzający. W prototypie go nie ma.' }],
      fields: [
        { id: 'tel', label: 'Numer telefonu', type: 'tel', required: true, inputmode: 'tel', value: '600 000 000', auto: 'z profilu (fikcyjny)', pattern: /^(\+48\s?)?\d{3}[\s-]?\d{3}[\s-]?\d{3}$/, msg: 'Wpisz 9 cyfr, np. 600 000 000.' },
        { id: 'email', label: 'Adres e-mail', type: 'email', required: true, value: 'tomasz.kowalczyk@example.com', auto: 'z profilu (fikcyjny)', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, msg: 'Wpisz adres w formie nazwa@domena.pl.' },
        { id: 'zgoda', label: 'Chcę dostawać przypomnienia o terminach SMS-em', type: 'checkbox' }
      ],
      cost: { amount: 0, text: 'Bezpłatnie', note: 'Zmiana danych kontaktowych nie wymaga opłaty.' },
      will: (v) => ['Zapiszę telefon ' + v.tel + ' i e-mail ' + v.email + ' jako dane kontaktowe.', v.zgoda ? 'Włączę przypomnienia SMS.' : 'Nie włączę przypomnień SMS.'],
      done: { status: 'Zmienione (symulacja)', steps: 2, step: 2, days: 0, next: 'W prawdziwej usłudze potwierdzisz numer kodem. W prototypie nic nie zostało zapisane poza tą przeglądarką.' },
      keys: 'telefon email mail dane kontaktowe zmiana danych'
    },
    {
      id: 'dowod', cat: 'tozsamosc', icon: 'id', title: 'Sprawy z dowodem osobistym', inst: 'Urząd miasta lub gminy (symulacja)',
      lead: 'Wymiana, utrata albo zmiana danych w dowodzie. Wybierz, co się stało.',
      router: [
        { l: 'Kończy się ważność dowodu', d: 'Masz rozpoczęty wniosek: dokończysz go od miejsca, w którym przerwałeś.', attrs: 'data-run="nowyDowod" data-preset=\'{"resume":true}\'', icon: 'clock' },
        { l: 'Zgubiłem dowód albo go skradziono', d: 'Zgłoszenie utraty unieważnia dowód; pokażę też, co jeszcze zastrzec.', attrs: 'data-run="portfel" data-preset=\'{"items":["dowod"]}\'', icon: 'alert' },
        { l: 'Zmieniłem dane (np. nazwisko)', d: 'Wtedy też potrzebny jest nowy dowód. Zaczniesz od wniosku o nowy dowód.', attrs: 'data-run="nowyDowod" data-preset=\'{"resume":true}\'', icon: 'edit' }
      ],
      rule: 'Wydanie dowodu osobistego jest bezpłatne (informacja ogólna). ' + OGOLNA,
      keys: 'dowod osobisty wymiana utrata zgubilem dowod nowy dowod'
    },
    {
      id: 'paszport', cat: 'tozsamosc', icon: 'passport', title: 'Wniosek o paszport', inst: 'Punkt paszportowy (symulacja)',
      lead: 'Przygotowujesz wniosek i umawiasz wizytę. Wniosek składa się osobiście.',
      explain: ['Paszport Zosi traci ważność ' + T.fmtShort(T.plus(40)) + ' (dane fikcyjne). Na nowy paszport czeka się zwykle kilka tygodni.',
        'Aplikacja przygotuje dane i zarezerwuje termin wizyty. W punkcie paszportowym złożysz wniosek i zdjęcie.'],
      rule: 'Kwoty w prototypie są przykładowe. ' + OGOLNA,
      docs: [{ n: 'Aktualne zdjęcie', have: false, d: 'Zabierz na wizytę albo dodaj w prawdziwej usłudze.' }, { n: 'Dotychczasowy paszport', have: true, d: 'Zabierz na wizytę.' },
        { n: 'Obecność dziecka i rodzica', have: true, d: 'Przy paszporcie dziecka zwykle potrzebna jest zgoda obojga rodziców.' }],
      fields: [
        { id: 'dla', label: 'Dla kogo?', type: 'radio', required: true, value: 'zosia', options: [{ v: 'zosia', l: 'Zofia Kowalczyk (9 lat)', d: 'Paszport ważny jeszcze 40 dni.' }, { v: 'ja', l: 'Tomasz Kowalczyk', d: 'Twój paszport jest ważny do ' + T.fmt(T.plus(1320)) + '.' }] },
        { id: 'zgoda2', label: 'Drugi rodzic wie o wniosku i przyjdzie albo da pisemną zgodę', type: 'checkbox', required: true },
        { id: 'wizyta', label: 'Termin wizyty', type: 'date', required: true, min: 3, minMsg: 'Najbliższe wolne terminy są od ' + T.fmt(T.plus(3)) + ' (symulacja).', max: 60, maxMsg: 'Wybierz termin w ciągu 60 dni, żeby zdążyć przed wyjazdem.', hint: 'Wolne terminy w symulacji: od ' + T.fmt(T.plus(3)) + ' do ' + T.fmt(T.plus(60)) + '.' }
      ],
      cost: { amount: 30, text: '30 zł (przykładowa kwota za paszport dziecka)', note: 'Za paszport dorosłego w prototypie pokazujemy 140 zł. Aktualną wysokość opłat sprawdź przed wizytą.', byVal: (v) => (v.dla === 'ja' ? 140 : 30) },
      will: (v) => ['Przygotuję wniosek o paszport dla: ' + (v.dla === 'ja' ? 'Tomasz Kowalczyk' : 'Zofia Kowalczyk') + '.', 'Zarezerwuję wizytę ' + (U.parseIso(v.wizyta) ? T.fmtOn(U.parseIso(v.wizyta)) : '') + ' (symulacja).', 'Dodam termin wizyty do kalendarza.'],
      done: { status: 'Wizyta zarezerwowana (symulacja)', steps: 4, step: 2, days: 30, next: 'Złóż wniosek osobiście w dniu wizyty i zabierz zdjęcie.' },
      calendar: (v) => (U.parseIso(v.wizyta) ? { date: v.wizyta, title: 'Wizyta w punkcie paszportowym (symulacja)' } : null),
      keys: 'paszport wyjazd granica zosia wizyta'
    },
    {
      id: 'firma', cat: 'firma', icon: 'briefcase', title: 'Założenie jednoosobowej działalności gospodarczej', inst: 'Rejestr działalności gospodarczej (symulacja)',
      lead: 'Rejestrujesz firmę, wybierasz formę opodatkowania i składki.',
      explain: ['Jeden wniosek: wpis do rejestru, zgłoszenie do urzędu skarbowego i do ubezpieczeń.',
        'Nazwa firmy musi zawierać Twoje imię i nazwisko; resztę możesz dopisać.',
        'Formę opodatkowania i składki możesz wybrać teraz albo w terminach wynikających z przepisów.'],
      rule: 'Wpis do rejestru jest bezpłatny. Zasady podatków i składek zależą od aktualnych przepisów. ' + OGOLNA,
      docs: [{ n: 'Dane osobowe i adres', have: true, d: 'Z profilu (fikcyjne).' }, { n: 'Adres wykonywania działalności', have: true, d: 'Może być adres domowy.' }],
      fields: [
        { id: 'nazwa', label: 'Nazwa firmy', type: 'text', required: true, value: 'Tomasz Kowalczyk ', hint: 'Musi zawierać imię i nazwisko, np. „Tomasz Kowalczyk Projekty”.', pattern: /tomasz\s+kowalczyk/i, msg: 'Nazwa musi zawierać imię i nazwisko: Tomasz Kowalczyk.' },
        { id: 'rodzaj', label: 'Czym się zajmiesz?', type: 'select', required: true, hint: 'Kod PKD dobierzesz w prawdziwym wniosku; w prototypie wybierasz opis.', options: [{ v: 'it', l: 'Programowanie i usługi IT' }, { v: 'grafika', l: 'Projektowanie graficzne' }, { v: 'szkolenia', l: 'Szkolenia i kursy' }, { v: 'remonty', l: 'Remonty i wykończenia' }] },
        { id: 'start', label: 'Data rozpoczęcia', type: 'date', required: true, min: 0, minMsg: 'Działalności nie zarejestrujesz wstecz. Wybierz dziś albo późniejszą datę.', max: 365, maxMsg: 'Wybierz datę w ciągu roku.' },
        { id: 'podatek', label: 'Forma opodatkowania', type: 'radio', required: true, options: [{ v: 'skala', l: 'Zasady ogólne (skala)' }, { v: 'liniowy', l: 'Podatek liniowy' }, { v: 'ryczalt', l: 'Ryczałt od przychodów' }], hint: 'Nie wiesz? Spinka pokaże różnice, ale nie wybierze za Ciebie.' },
        { id: 'adresfirmy', label: 'Działalność pod adresem domowym (ul. Przykładowa 12)', type: 'checkbox', value: 'true' }
      ],
      cost: { amount: 0, text: 'Bezpłatnie', note: 'Wpis do rejestru działalności nie wymaga opłaty (informacja ogólna).' },
      will: (v) => ['Zarejestruję firmę „' + v.nazwa.trim() + '” od ' + (U.parseIso(v.start) ? T.fmtShort(U.parseIso(v.start)) : '') + '.', 'Forma opodatkowania: ' + ({ skala: 'zasady ogólne', liniowy: 'podatek liniowy', ryczalt: 'ryczałt' }[v.podatek] || '') + '.', 'Nie wybiorę za Ciebie ulg ani składek: te zostają do Twojej decyzji.'],
      done: { status: 'Wniosek złożony (symulacja)', steps: 3, step: 2, days: 1, next: 'W prawdziwej usłudze dostaniesz numery NIP i REGON oraz potwierdzenie wpisu.' },
      keys: 'dzialalnosc gospodarcza firma ceidg zalozyc firme jdg nip regon'
    },
    {
      id: 'zaswiadczenie', cat: 'firma', icon: 'letter', title: 'Zaświadczenie o niezaleganiu w podatkach', inst: 'Urząd Skarbowy w Przykładowie (fikcyjny)',
      lead: 'Zamawiasz zaświadczenie, np. do kredytu, przetargu albo dotacji.',
      explain: ['Zaświadczenie potwierdza, że nie masz zaległości podatkowych.', 'Wybierasz cel i formę. Elektroniczne przychodzi do skrzynki.'],
      rule: 'Za zaświadczenie płaci się opłatę skarbową; kwota w prototypie jest przykładowa. ' + OGOLNA,
      docs: [{ n: 'Dowód opłaty skarbowej', have: false, d: 'Opłacisz w kroku „Koszty” (symulacja).' }],
      fields: [
        { id: 'cel', label: 'Do czego potrzebujesz zaświadczenia?', type: 'select', required: true, options: [{ v: 'kredyt', l: 'Kredyt w banku' }, { v: 'dotacja', l: 'Dotacja' }, { v: 'przetarg', l: 'Przetarg' }, { v: 'inny', l: 'Inny cel' }] },
        { id: 'forma', label: 'Forma', type: 'radio', required: true, value: 'e', options: [{ v: 'e', l: 'Elektroniczna', d: 'Do skrzynki w aplikacji.' }, { v: 'papier', l: 'Papierowa', d: 'Pocztą na adres zameldowania.' }] }
      ],
      cost: { amount: 21, text: '21 zł opłaty skarbowej (przykładowa kwota)', note: 'Opłatę zapłacisz w kroku „Koszty” (symulacja).' },
      will: (v) => ['Złożę wniosek o zaświadczenie (cel: ' + ({ kredyt: 'kredyt', dotacja: 'dotacja', przetarg: 'przetarg', inny: 'inny' }[v.cel] || '') + ').', 'Opłatę skarbową zapłacę w symulacji.'],
      done: { status: 'Wniosek złożony (symulacja)', steps: 3, step: 2, days: 7, next: 'Urząd wydaje zaświadczenie zwykle w ciągu kilku dni. Przewidywany termin w kalendarzu nie jest wiążący.' },
      keys: 'zaswiadczenie niezalegania podatki urzad skarbowy kredyt'
    },
    {
      id: 'oplata', cat: 'platnosci', icon: 'coin', title: 'Opłać należność urzędową', inst: 'Zależnie od należności (symulacja)',
      lead: 'Wybierasz należność z listy i płacisz w symulacji.',
      explain: ['Kwota i odbiorca uzupełniają się z należności w aplikacji.', 'Prototyp nie pobiera pieniędzy i nie prosi o dane karty ani logowanie do banku.'],
      rule: OGOLNA,
      docs: [{ n: 'Lista należności', have: true, d: 'Z modułu Płatności (dane fikcyjne).' }],
      fields: [
        { id: 'naleznosc', label: 'Którą należność opłacasz?', type: 'radio', required: true, options: () => A.s2.payments.filter((p) => !st().paid[p.id]).map((p) => ({ v: p.id, l: p.title, d: U.money(p.amount) + ', do ' + T.fmtShort(p.due) })) },
        { id: 'metoda', label: 'Sposób płatności', type: 'radio', required: true, options: [{ v: 'BLIK', l: 'BLIK' }, { v: 'przelew', l: 'Przelew z banku' }] }
      ],
      cost: { amount: 0, text: 'Kwota należności', note: 'Bez dodatkowych opłat w prototypie.', byVal: (v) => { const p = A.s2.payments.find((x) => x.id === v.naleznosc); return p ? p.amount : 0; } },
      will: (v) => { const p = A.s2.payments.find((x) => x.id === v.naleznosc); return p ? ['Opłacę w symulacji: ' + p.title + ', ' + U.money(p.amount) + '.', 'Odbiorca: ' + p.inst + '.'] : []; },
      onDone: (v) => A.store.update((s) => { s.paid[v.naleznosc] = A.store.iso(T.today); s.payMethod = s.payMethod || {}; s.payMethod[v.naleznosc] = v.metoda + ' (symulacja)'; }),
      done: { status: 'Opłacone (symulacja)', steps: 2, step: 2, days: 0, next: 'Żadne pieniądze nie zostały pobrane. W prawdziwej usłudze potwierdzenie przelewu przyszłoby z banku.' },
      keys: 'oplata oplac zaplac platnosc podatek odpady naleznosc'
    },
    {
      id: 'zgloszenie', cat: 'zgloszenia', icon: 'flag', title: 'Zgłoś problem w okolicy', inst: 'Właściwa instytucja (dobiera Spinka, symulacja)',
      lead: 'Dziura w drodze, zepsuta latarnia, dzikie wysypisko. Opisujesz problem, a Spinka wskazuje, kto się tym zajmuje.',
      explain: ['Nie musisz wiedzieć, która instytucja odpowiada za problem: wybierasz rodzaj, a aplikacja kieruje zgłoszenie.', 'Możesz dodać zdjęcie. Dostaniesz powiadomienie o statusie (w prototypie: symulacja).'],
      rule: 'W sytuacji zagrożenia życia lub zdrowia dzwoń pod 112. ' + OGOLNA,
      docs: [{ n: 'Zdjęcie problemu', have: false, d: 'Opcjonalne, pomaga służbom.' }],
      fields: [
        { id: 'rodzaj', label: 'Czego dotyczy?', type: 'radio', required: true, options: [{ v: 'droga', l: 'Droga lub chodnik', d: 'Trafi do: Zarząd Dróg Miejskich (fikcyjny).' }, { v: 'swiatlo', l: 'Oświetlenie ulicy', d: 'Trafi do: Wydział Infrastruktury (fikcyjny).' }, { v: 'odpady', l: 'Odpady i wysypisko', d: 'Trafi do: Referat Gospodarki Odpadami (fikcyjny).' }, { v: 'halas', l: 'Hałas lub porządek', d: 'Trafi do: Straż Miejska (fikcyjna).' }] },
        { id: 'gdzie', label: 'Gdzie dokładnie?', type: 'text', required: true, hint: 'Ulica i numer albo charakterystyczne miejsce.', pattern: /\S{3,}/, msg: 'Opisz miejsce, np. „ul. Przykładowa 12, przy przystanku”.' },
        { id: 'opis', label: 'Opis problemu', type: 'textarea', required: true, max: 500, hint: 'Co najmniej 20 znaków.', pattern: /^[\s\S]{20,}$/, msg: 'Napisz co najmniej 20 znaków, żeby służby wiedziały, czego szukać.' },
        { id: 'kontakt', label: 'Chcę dostać odpowiedź w aplikacji', type: 'checkbox', value: 'true' }
      ],
      cost: { amount: 0, text: 'Bezpłatnie', note: 'Zgłoszenia nie wymagają opłaty.' },
      will: (v) => ['Przekażę zgłoszenie do: ' + ({ droga: 'Zarząd Dróg Miejskich', swiatlo: 'Wydział Infrastruktury', odpady: 'Referat Gospodarki Odpadami', halas: 'Straż Miejska' }[v.rodzaj] || '') + ' (fikcyjne, symulacja).', 'Miejsce: ' + v.gdzie + '.'],
      done: { status: 'Przekazane (symulacja)', steps: 3, step: 1, days: 14, next: 'Instytucja oceni zgłoszenie. Status zobaczysz w Sprawach (w prototypie się nie zmieni).' },
      keys: 'zglos problem dziura droga latarnia wysypisko halas zglosic'
    },
    {
      id: 'oc', cat: 'pojazd', icon: 'car', title: 'Wypowiedzenie umowy OC (wzór)', inst: 'Twój ubezpieczyciel: TU Przykład S.A. (fikcyjny)',
      lead: 'Przygotowujesz wypowiedzenie, jeśli zmieniasz ubezpieczyciela. Pismo wysyłasz do ubezpieczyciela sam.',
      explain: ['Polisa OC Toyoty Yaris kończy się ' + T.fmtLong(A.dates.ocEnd) + '.', 'Jeśli nic nie zrobisz, umowa zwykle przedłuży się sama na kolejny rok. Jeśli zmieniasz ubezpieczyciela, wypowiedz ją przed końcem.',
        'Aplikacja przygotuje treść wypowiedzenia z danych polisy. Nie jest to dokument urzędowy.'],
      rule: 'Wypowiedzenie złóż najpóźniej dzień przed końcem polisy (dane z Twojej polisy). ' + OGOLNA,
      due: () => T.plus(T.inDays(A.dates.ocEnd) - 1),
      docs: [{ n: 'Numer polisy', have: true, d: A.demo.policyNo + ' (fikcyjny).' }, { n: 'Nowa polisa', have: false, d: 'Kup ją przed wysłaniem wypowiedzenia, żeby nie mieć przerwy w OC.' }],
      fields: [
        { id: 'polisa', label: 'Numer polisy', type: 'text', required: true, value: A.demo.policyNo, auto: 'z danych pojazdu', pattern: /^OC\/\d{4}\/\d{6}$/, msg: 'Numer polisy ma format OC/RRRR/000000.' },
        { id: 'powod', label: 'Dlaczego wypowiadasz?', type: 'radio', required: true, options: [{ v: 'koniec', l: 'Z końcem okresu ubezpieczenia', d: 'Zmieniam ubezpieczyciela.' }, { v: 'podwojne', l: 'Mam już drugą polisę na to auto', d: 'Podwójne ubezpieczenie.' }] },
        { id: 'nowa', label: 'Mam już nową polisę od ' + T.fmt(A.dates.ocEnd), type: 'checkbox', required: true, hint: 'Bez nowej polisy nie wysyłaj wypowiedzenia: przerwa w OC grozi karą.' }
      ],
      cost: { amount: 0, text: 'Bezpłatnie', note: 'Wypowiedzenie nic nie kosztuje.' },
      will: (v) => ['Przygotuję treść wypowiedzenia umowy ' + v.polisa + ' (' + (v.powod === 'koniec' ? 'z końcem okresu' : 'podwójne ubezpieczenie') + ').', 'Nie wyślę jej za Ciebie: wzór zapiszę w Sprawach.'],
      done: { status: 'Wzór gotowy (symulacja)', steps: 3, step: 2, days: 0, next: 'Wyślij wypowiedzenie do ubezpieczyciela (e-mailem albo listem) najpóźniej ' + T.fmtShort(T.plus(T.inDays(A.dates.ocEnd) - 1)) + '.' },
      keys: 'oc polisa ubezpieczenie wypowiedzenie zmiana ubezpieczyciela auto samochod'
    }
  ];
  PROC.forEach((p) => { p.stepsN = p.router ? 1 : KROKI.length; });
  const CATS = [
    { id: 'all', label: 'Wszystkie' }, { id: 'rodzina', label: 'Rodzina', icon: 'family' }, { id: 'tozsamosc', label: 'Tożsamość', icon: 'id' },
    { id: 'firma', label: 'Firma i podatki', icon: 'briefcase' }, { id: 'pojazd', label: 'Pojazd', icon: 'car' }, { id: 'platnosci', label: 'Płatności', icon: 'coin' }, { id: 'zgloszenia', label: 'Zgłoszenia', icon: 'flag' }
  ];
  A.uslugi = { list: PROC, byId: (id) => PROC.find((p) => p.id === id) };

  /* ---------- katalog ---------- */

  let filtr = 'all';
  function catalog(p) {
    const list = PROC.filter((x) => filtr === 'all' || x.cat === filtr);
    const drafts = Object.keys(st().drafts);
    return A.screen('uslugi',
      '<div class="pad stack"><h1>Załatw za mnie</h1>' +
        '<p class="lead">Wybierz sprawę. Spinka przeprowadzi Cię krok po kroku: co jest potrzebne, co wypełni sama, ile to kosztuje i co się stanie. Każdą decyzję podejmujesz Ty.</p>' +
        '<div class="s2-banner">' + U.sim('Symulacja') + '<p>Kreatory działają na fikcyjnych danych. Nic nie jest wysyłane do urzędów, a ekran końcowy nie jest urzędowym potwierdzeniem.</p></div>' +
        (drafts.length ? '<section aria-labelledby="h-drafts"><h2 id="h-drafts">Wersje robocze</h2><ul class="group">' +
          drafts.map((id) => { const x = A.uslugi.byId(id); const d = st().drafts[id]; return x ? U.linkRow('data-go="proces" data-id="' + id + '"', 'edit', x.title, 'Krok ' + (d.step + 1) + ' z ' + KROKI.length + ' · zapisana ' + T.fmtShort(A.store.fromIso(d.saved) || T.today)) : ''; }).join('') + '</ul></section>' : '') +
        '<h2 class="sr-only">Wszystkie sprawy</h2>' +
        U.chips('uslugi-filtr', CATS.map((c) => Object.assign({ n: c.id === 'all' ? PROC.length : PROC.filter((x) => x.cat === c.id).length }, c)), filtr, 'Rodzaj sprawy') +
        '<ul class="s2-proc-list" aria-live="polite">' + list.map((x) =>
          '<li><button type="button" class="s2-proc" data-go="proces" data-id="' + x.id + '">' +
            '<span class="s2-proc-ic" aria-hidden="true">' + ic(x.icon, 24) + '</span>' +
            '<span class="s2-proc-t"><span class="s2-proc-n">' + esc(x.title) + '</span><span class="s2-proc-d">' + esc(x.lead) + '</span>' +
            '<span class="s2-proc-m">' + (x.cost ? U.pill(x.cost.amount ? 'Płatne' : 'Bezpłatnie', x.cost.amount ? 'warn' : 'ok') : U.pill('Prowadzi do rozpoczętej sprawy', 'info')) + (st().drafts[x.id] ? U.pill('Wersja robocza', 'info') : '') + '</span></span>' +
            '<span class="row-go" aria-hidden="true">' + ic('chevronRight', 20) + '</span></button></li>').join('') + '</ul>' +
        '<button type="button" class="btn secondary wide" data-tab="chat">' + ic('assistant', 20) + 'Nie ma Twojej sprawy? Zapytaj Spinkę</button>' +
      '</div>');
  }
  A.ext.screens.uslugi = catalog;
  A.ext.acts['uslugi-filtr'] = (t) => { filtr = t.dataset.v; A.render(); const b = document.querySelector('[data-act="uslugi-filtr"][data-v="' + filtr + '"]'); if (b) b.focus(); };

  /* ---------- kreator ---------- */

  let W = null; // { id, step, values }
  const fieldsOf = (P) => P.fields.map((f) => Object.assign({}, f, { options: typeof f.options === 'function' ? f.options() : f.options }));
  function initValues(P) {
    const v = {};
    P.fields.forEach((f) => { v[f.id] = f.value !== undefined ? f.value : ''; });
    if (P.id === 'firma') v.start = U.iso(T.plus(1));
    return v;
  }
  function saveDraft(silent) {
    if (!W || W.step < 1 || W.step >= 5) return;
    const P = A.uslugi.byId(W.id);
    A.store.update((s) => { s.drafts[W.id] = { step: W.step, values: W.values, saved: A.store.iso(T.today) }; });
    if (!silent) A.toast('Zapisano wersję roboczą: ' + P.title + '. Znajdziesz ją na Starcie i w „Załatw za mnie”.', 'ok');
  }
  function stepper(step) {
    return '<ol class="s2-stepper" aria-label="Kroki sprawy">' + KROKI.map((k, i) =>
      '<li class="' + (i < step ? 'done' : i === step ? 'now' : '') + '"' + (i === step ? ' aria-current="step"' : '') + '><span class="s2-step-n" aria-hidden="true">' + (i < step ? ic('check', 16) : i + 1) + '</span><span class="s2-step-l">' + k + '</span></li>').join('') + '</ol>' +
      U.progress(step + 1, KROKI.length, 'Postęp kreatora');
  }
  function costOf(P, v) { return P.cost && P.cost.byVal ? P.cost.byVal(v) : P.cost ? P.cost.amount : 0; }
  function summaryRows(P, v) {
    return fieldsOf(P).map((f) => {
      let val = v[f.id];
      if (f.type === 'radio' || f.type === 'select') { const o = (f.options || []).find((x) => x.v === val); val = o ? o.l : ''; }
      if (f.type === 'checkbox') val = val ? 'Tak' : 'Nie';
      if (f.type === 'date' && U.parseIso(val)) val = T.fmtLong(U.parseIso(val));
      return '<div><dt>' + esc(f.label) + '</dt><dd>' + esc(val || '—') + ' <button type="button" class="btn-text sm" data-act="w-goto" data-step="2" aria-label="Zmień: ' + esc(f.label) + '">Zmień</button></dd></div>';
    }).join('');
  }

  function proces(p) {
    const P = A.uslugi.byId(p.id) || PROC[0];
    // Wejście do kreatora: wersja robocza wraca na zapisany krok (z możliwością rozpoczęcia od nowa).
    if (!W || W.id !== P.id) {
      const d = st().drafts[P.id];
      W = { id: P.id, step: d ? d.step : 0, values: d ? Object.assign(initValues(P), d.values) : initValues(P), fromDraft: !!d, done: null };
    }
    const head = '<p class="eyebrow">' + ic(P.icon, 16) + ' Załatw za mnie · ' + esc(P.inst) + '</p><h1>' + esc(P.title) + '</h1>';
    if (P.router) {
      return A.screen('proces',
        '<div class="pad stack">' + head + '<p class="lead">' + esc(P.lead) + '</p>' +
          '<ul class="s2-router">' + P.router.map((r) => '<li><button type="button" class="s2-proc" ' + r.attrs + '><span class="s2-proc-ic" aria-hidden="true">' + ic(r.icon, 24) + '</span>' +
            '<span class="s2-proc-t"><span class="s2-proc-n">' + esc(r.l) + '</span><span class="s2-proc-d">' + esc(r.d) + '</span></span><span class="row-go" aria-hidden="true">' + ic('chevronRight', 20) + '</span></button></li>').join('') + '</ul>' +
          '<p class="s2-rule">' + ic('info', 16) + '<span>' + esc(P.rule) + '</span></p></div>');
    }
    const v = W.values; const step = W.step;
    let body = '';
    if (step === 0) {
      const due = P.due ? P.due() : null;
      body = (W.fromDraft ? '<div class="s2-banner info">' + ic('edit', 20) + '<p>Masz wersję roboczą tej sprawy. Kontynuujesz od kroku ' + (st().drafts[P.id] ? st().drafts[P.id].step + 1 : 1) + '. <button type="button" class="btn-text sm" data-act="w-restart">Zacznij od nowa</button></p></div>' : '') +
        '<p class="lead">' + esc(P.lead) + '</p>' +
        '<ol class="s2-explain">' + P.explain.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>' +
        (due ? '<p class="s2-due-box">' + ic('clock', 20) + '<span>Termin w tej sprawie: <b>' + esc(T.fmtLong(due)) + '</b> ' + U.pill(U.dueText(due), U.dueTone(due)) + '</span></p>' : '') +
        '<p class="s2-rule">' + ic('info', 16) + '<span>' + esc(P.rule) + '</span></p>' +
        '<dl class="s2-sum"><div><dt>Koszt</dt><dd>' + esc(P.cost.text) + '</dd></div><div><dt>Kto rozpatruje</dt><dd>' + esc(P.inst) + '</dd></div><div><dt>Kroki</dt><dd>' + KROKI.length + ', ok. 3–5 minut</dd></div></dl>';
    } else if (step === 1) {
      body = '<h2>Czego potrzebujesz</h2><ul class="s2-docs-need">' + P.docs.map((d) => {
        const have = typeof d.have === 'function' ? d.have() : d.have;
        return '<li class="' + (have ? 'ok' : 'miss') + '"><span class="s2-need-ic" aria-hidden="true">' + ic(have ? 'check' : 'alert', 20) + '</span><span><b>' + esc(d.n) + '</b> ' + U.pill(have ? 'Jest' : 'Brakuje', have ? 'ok' : 'warn') + '<span class="s2-need-d">' + esc(d.d) + '</span></span></li>';
      }).join('') + '</ul>' +
        (P.docs.some((d) => !(typeof d.have === 'function' ? d.have() : d.have)) ? '<p class="s2-note">' + ic('info', 16) + '<span>Brakujące rzeczy nie blokują kreatora. Przypomnę o nich w podsumowaniu.</span></p>' : '');
    } else if (step === 2) {
      body = '<h2>Dane</h2><p class="sub">Pola z oznaczeniem „Uzupełnione” wypełniła aplikacja z danych demonstracyjnych. Sprawdź je i popraw, jeśli trzeba.</p>' +
        '<form class="s2-form" id="w-form" novalidate>' + fieldsOf(P).map((f) => U.field(Object.assign({}, f, { value: v[f.id] }))).join('') + '</form>';
    } else if (step === 3) {
      const amt = costOf(P, v);
      body = '<h2>Koszty</h2><dl class="s2-sum s2-cost"><div><dt>Do zapłaty</dt><dd><b>' + (amt ? esc(U.money(amt)) : 'Bezpłatnie') + '</b></dd></div><div><dt>Za co</dt><dd>' + esc(P.cost.text) + '</dd></div></dl>' +
        '<p class="s2-note">' + ic('info', 16) + '<span>' + esc(P.cost.note) + '</span></p>' +
        (amt ? '<p class="s2-note">' + U.sim('Symulacja płatności') + '<span>Opłata zostanie „pobrana” w symulacji po potwierdzeniu. Nie podajesz danych karty ani banku.</span></p>' : '');
    } else if (step === 4) {
      const missing = P.docs.filter((d) => !(typeof d.have === 'function' ? d.have() : d.have));
      body = '<h2>Sprawdź, zanim potwierdzisz</h2>' +
        '<dl class="s2-sum s2-review">' + summaryRows(P, v) + '</dl>' +
        '<section class="panel"><h3>Co się stanie po „Potwierdź”</h3><ul class="will">' + P.will(v).filter(Boolean).map((x) => '<li><span class="li-ic">' + ic('check', 20) + '</span><span>' + esc(x) + '</span></li>').join('') + '</ul>' +
          '<p class="demo-note">' + ic('info', 20) + '<span><b>To prototyp.</b> Nic nie zostanie wysłane do urzędu. Zobaczysz, co zrobiłaby prawdziwa usługa.</span></p></section>' +
        (missing.length ? '<p class="s2-note warn">' + ic('alert', 16) + '<span>Pamiętaj: ' + esc(missing.map((d) => d.n.toLowerCase()).join(', ')) + '.</span></p>' : '') +
        '<form class="s2-form" id="w-decyzja" novalidate>' + U.field({ id: 'decyzja', label: 'Sprawdziłem dane i chcę złożyć tę sprawę (w symulacji)', type: 'checkbox', required: true }) + '</form>';
    } else {
      const done = W.done || {};
      body = U.success(P.done.status, P.title) +
        '<dl class="s2-sum"><div><dt>Status</dt><dd>' + U.pill(P.done.status, 'ok') + '</dd></div><div><dt>Kto rozpatruje</dt><dd>' + esc(P.inst) + '</dd></div>' +
          (done.expected ? '<div><dt>Przewidywane zakończenie</dt><dd>' + esc(T.fmtLong(A.store.fromIso(done.expected))) + ' ' + U.pill('szacunek, niewiążący', 'neutral') + '</dd></div>' : '') + '</dl>' +
        '<section class="panel"><h2>Co dalej</h2><p>' + esc(P.done.next) + '</p></section>' +
        '<section class="panel demo-box"><h2>Co naprawdę się stało</h2><p>Nic nie zostało wysłane. To symulacja na fikcyjnych danych; ten ekran nie jest urzędowym potwierdzeniem.</p></section>' +
        '<div class="actions">' + (P.done.then ? '<button type="button" class="btn primary wide" data-go="' + P.done.then.go + '" data-id="' + P.done.then.id + '">' + esc(P.done.then.label) + '</button>' : '') +
          '<button type="button" class="btn secondary wide" data-act="cases" data-which="progress">' + ic('cases', 20) + 'Zobacz w „Sprawach”</button>' +
          '<button type="button" class="btn ghost wide" data-tab="start">Wróć na start</button></div>';
    }
    const nav = step === 5 ? '' :
      '<div class="s2-wnav">' +
        (step > 0 ? '<button type="button" class="btn secondary" data-act="w-prev">' + ic('chevronLeft', 20) + 'Wstecz</button>' : '<span></span>') +
        (step >= 1 && step <= 4 ? '<button type="button" class="btn ghost" data-act="w-save">' + ic('edit', 20) + 'Zapisz wersję roboczą</button>' : '') +
        '<button type="button" class="btn primary" data-act="w-next">' + (step === 4 ? ic('shieldCheck', 20) + 'Potwierdź' : 'Dalej' + ic('chevronRight', 20)) + '</button>' +
      '</div>';
    const s = A.screen('proces',
      '<div class="pad stack">' + head + (step < 5 ? stepper(step) : '') + '<div class="s2-wbody">' + body + '</div>' + nav + '</div>');
    s._after = () => {
      // Zmiany w polach od razu trafiają do stanu kreatora (wersja robocza zapisuje się przy „Dalej” i przycisku).
      const f = s.querySelector('#w-form');
      if (f) f.addEventListener('input', () => Object.assign(W.values, U.values(f)));
      if (f) f.addEventListener('change', () => Object.assign(W.values, U.values(f)));
      const ok = s.querySelector('.s2-check');
      if (ok && !A.reducedMotion()) ok.classList.add('play');
    };
    return s;
  }
  A.ext.screens.proces = proces;

  function goStep(n) {
    W.step = n;
    W.fromDraft = false;
    A.render();
    const body = document.querySelector('.proces .s2-wbody');
    if (body) U.animate(body, [{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], 240);
    const h = document.querySelector('.proces .s2-wbody h2, .proces .s2-wbody h1, .proces h1');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: false }); }
  }
  A.ext.acts['w-prev'] = () => { if (W && W.step > 0) goStep(W.step - 1); };
  A.ext.acts['w-goto'] = (t) => goStep(Number(t.dataset.step));
  A.ext.acts['w-save'] = () => saveDraft(false);
  A.ext.acts['w-restart'] = () => {
    const P = A.uslugi.byId(W.id);
    A.store.update((s) => { delete s.drafts[W.id]; });
    W = { id: P.id, step: 0, values: initValues(P), fromDraft: false };
    A.render();
    A.toast('Zaczynasz od nowa. Wersja robocza została usunięta.');
  };
  A.ext.acts['w-next'] = () => {
    const P = A.uslugi.byId(W.id);
    if (W.step === 2) {
      const form = document.getElementById('w-form');
      const r = U.validate(form, fieldsOf(P));
      if (!r.ok) return;
      Object.assign(W.values, r.values);
      const extra = P.check && P.check(W.values);
      if (extra) {
        const box = form.querySelector('[data-field="' + extra.field + '"]');
        const e = box && box.querySelector('.s2-err');
        if (e) { e.hidden = false; e.textContent = extra.msg; box.classList.add('has-err'); (box.querySelector('input') || box).focus(); }
        A.announce(extra.msg);
        return;
      }
    }
    if (W.step === 4) {
      const r = U.validate(document.getElementById('w-decyzja'), [{ id: 'decyzja', label: 'Potwierdzenie', type: 'checkbox', required: true }]);
      if (!r.ok) return;
      A.confirm({
        title: P.title + ': potwierdzić w symulacji?',
        items: P.will(W.values).filter(Boolean).concat(['Nic nie zostanie wysłane do urzędu. To prototyp z danymi fikcyjnymi.']),
        ok: 'Potwierdź'
      }).then((yes) => { if (yes) finish(P); });
      return;
    }
    goStep(W.step + 1);
    saveDraft(true);
  };

  // Zakończenie: sprawa w „Sprawach” (z postępem i statusem symulacji), termin szacunkowy w kalendarzu, bez wersji roboczej.
  function finish(P) {
    const v = W.values;
    const expected = P.done.days ? A.store.iso(T.plus(P.done.days)) : null;
    const rec = { id: 'w-' + P.id, proc: P.id, title: P.title, at: A.store.iso(T.today), expected: expected };
    if (P.onDone) P.onDone(v);
    A.store.update((s) => {
      delete s.drafts[P.id];
      s.submitted = s.submitted.filter((x) => x.id !== rec.id).concat([rec]);
      const cal = P.calendar && P.calendar(v);
      if (cal) s.reminders = s.reminders.filter((r) => r.id !== 'w-' + P.id).concat([{ id: 'w-' + P.id, date: cal.date, title: cal.title }]);
    });
    upsert(rec);
    W.done = { expected: expected };
    goStep(5);
    A.announce(P.done.status + '. Nic nie zostało wysłane.');
  }
  function upsert(rec) {
    const P = A.uslugi.byId(rec.proc);
    if (!P) return;
    const done = P.done.step >= P.done.steps;
    A.upsertCase({
      id: rec.id, title: P.title, icon: P.icon, inst: P.inst, state: done ? 'demo' : 'office', statusText: P.done.status, step: P.done.step, steps: P.done.steps,
      note: 'Złożone ' + T.fmtShort(A.store.fromIso(rec.at) || T.today) + ' w symulacji. ' + P.done.next,
      verb: 'Zobacz status',
      detail: { kind: 'Sprawa z „Załatw za mnie”', from: P.inst, what: P.title + ': ' + P.done.status + '.', due: rec.expected ? A.store.fromIso(rec.expected) : null,
        dueNote: 'Przewidywany termin to szacunek prototypu, nie termin urzędowy.', why: 'Symulacja: nic nie zostało wysłane do urzędu.', next: P.done.next }
    });
  }
  // Sprawy z kreatorów zapisane wcześniej w tej przeglądarce wracają do listy spraw po odświeżeniu.
  (st().submitted || []).forEach(upsert);
  A.store.on(() => { if (!st().submitted.length) A.cases = A.cases.filter((c) => !/^w-/.test(c.id)); });

  A.ext.search.push(() => PROC.map((x) => ({ group: 'Załatw za mnie', title: x.title, sub: x.lead, icon: x.icon, attrs: 'data-go="proces" data-id="' + x.id + '"', keys: x.keys })));
  A.ext.deep.uslugi = () => A.nav('uslugi');
  PROC.forEach((x) => { A.ext.deep['proces-' + x.id] = () => A.nav('proces', { id: x.id }); });
  // Wyjście z kreatora ze zmienionymi danymi zapisuje wersję roboczą bez pytania (można ją usunąć przyciskiem „Zacznij od nowa”).
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-act="back"], .tabbar .tab');
    if (b && W && document.querySelector('#main > .screen.proces') && W.step >= 1 && W.step <= 4) saveDraft(true);
  }, true);
})(window.APP);
