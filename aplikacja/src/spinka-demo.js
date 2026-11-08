/*
 * Spinka 2.0: tryb demonstracyjny asystenta (bez modelu AI) i dziewięć nazwanych stanów.
 * Gdy model AI nie jest podłączony, Spinka rozpoznaje sprawę po słowach kluczowych i odpowiada WYŁĄCZNIE z danych tej
 * aplikacji (sprawy, dokumenty, terminy, płatności, rodzina) i z opisów procesów w „Załatw za mnie”. Każda odpowiedź ma:
 * co wiadomo (ze źródłem), czego nie wiadomo, ostrzeżenie (gdy są skutki) i proponowane kroki. Terminy i kwoty liczy
 * aplikacja z danych; Spinka niczego nie zgaduje i mówi „nie wiem”, gdy pytanie wychodzi poza dane.
 * Z modelem AI (serwer projektu) działa dotychczasowa ścieżka z assistant.js.
 */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = (s) => A.esc(s);
  const T = A.time;
  const U = A.ui;
  const S = A.s2;
  const st = () => A.store.get();
  const wait = (ms) => new Promise((r) => setTimeout(r, A.reducedMotion() ? 0 : ms));

  /* ---------- stany ---------- */

  const STANY = {
    gotowa: { l: 'Gotowa', mood: 'spokoj', d: 'Czekam na pytanie.' },
    slucha: { l: 'Słucha', mood: 'slucha', d: 'Piszesz albo mówisz.' },
    analizuje: { l: 'Analizuje', mood: 'slucha', d: 'Rozpoznaję, o jaką sprawę chodzi.' },
    odczytuje: { l: 'Odczytuje dane', mood: 'wyjasnia', d: 'Sprawdzam sprawy, dokumenty i terminy w aplikacji.' },
    wyjasnia: { l: 'Wyjaśnia', mood: 'wyjasnia', d: 'Tłumaczę, co wynika z danych.' },
    ostrzega: { l: 'Ostrzega', mood: 'ostrzega', d: 'Pokazuję skutki, które mogą Cię dotyczyć.' },
    proponuje: { l: 'Proponuje rozwiązanie', mood: 'krok', d: 'Pokazuję możliwe kroki.' },
    czeka: { l: 'Czeka na Twoją decyzję', mood: 'krok', d: 'Nic nie zrobię bez Twojego wyboru.' },
    zakonczono: { l: 'Zakończono', mood: 'gotowe', d: 'Sprawa przeszła do końca w demonstracji.' }
  };
  A.spinkaStany = STANY;
  let stan = 'gotowa';
  function setStan(k) {
    if (!STANY[k]) return;
    stan = k;
    const box = document.getElementById('s2-stan');
    if (box) {
      box.dataset.stan = k;
      box.querySelector('.s2-stan-l').textContent = STANY[k].l;
      box.title = STANY[k].d;
    }
    if (A.chat && A.chat.mood) A.chat.mood(STANY[k].mood);
  }
  A.spinkaStan = setStan;

  // Pasek stanu pod imieniem asystenta: krótka nazwa stanu i animowany wskaźnik (przy ograniczonym ruchu nieruchomy).
  const build0 = A.chat.build;
  A.chat.build = function () {
    const r = build0.apply(this, arguments);
    const scr = A.chat.screen || (A.chat.api && A.chat.api.el.screen);
    const name = scr && scr.querySelector('.chat-name');
    if (name && !scr.querySelector('#s2-stan')) {
      name.insertAdjacentHTML('beforeend', '<p class="s2-stan" id="s2-stan" data-stan="gotowa" role="status"><span class="s2-stan-i" aria-hidden="true"><i></i><i></i><i></i></span><span class="sr-only">Stan asystenta: </span><span class="s2-stan-l">Gotowa</span></p>');
      const input = scr.querySelector('#chat-input');
      if (input) {
        input.addEventListener('input', () => { if (stan !== 'analizuje' && stan !== 'odczytuje') setStan(input.value.trim() ? 'slucha' : 'gotowa'); });
        input.addEventListener('blur', () => { if (stan === 'slucha' && !input.value.trim()) setStan('gotowa'); });
      }
      // Scenariusze: pytanie z wyborem albo podsumowanie przed potwierdzeniem = czeka na decyzję; „gotowe” = zakończono.
      const log = scr.querySelector('#chat-log');
      if (log && 'MutationObserver' in window) new MutationObserver(() => {
        if (stan === 'analizuje' || stan === 'odczytuje') return;
        const last = log.lastElementChild;
        if (log.querySelector('.qcard:not(.answered)')) setStan('czeka');
        else if (last && last.matches('.st-ok')) setStan('zakonczono');
      }).observe(log, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    return r;
  };
  // Okno głosu: słucha.
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-act="voice"]')) setStan('slucha'); }, true);

  /* ---------- karty źródeł ---------- */

  const procCard = (id) => {
    const P = A.uslugi && A.uslugi.byId(id);
    if (!P) return '';
    return '<article class="src-card src-proc"><p class="src-k">' + ic('cases', 20) + '<span>Opis sprawy: Załatw za mnie</span><span class="src-demo">Informacja ogólna</span></p>' +
      '<h2 class="src-title">' + esc(P.title) + '</h2><p class="src-from">' + esc(P.lead) + '</p>' +
      (P.cost ? '<dl class="src-facts"><div><dt>Koszt</dt><dd>' + esc(P.cost.text) + '</dd></div></dl>' : '') +
      '<button type="button" class="btn secondary wide split src-go" data-go="proces" data-id="' + id + '"><span>Otwórz kreator</span>' + ic('chevronRight', 20) + '</button></article>';
  };
  const dataCard = (k, title, facts, go, label) =>
    '<article class="src-card"><p class="src-k">' + ic('cases', 20) + '<span>Dane z aplikacji: ' + esc(k) + '</span><span class="src-demo">Dane fikcyjne</span></p>' +
      '<h2 class="src-title">' + esc(title) + '</h2><dl class="src-facts">' + facts.map((f) => '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>').join('') + '</dl>' +
      (go ? '<button type="button" class="btn secondary wide split src-go" ' + go + '><span>' + esc(label || 'Otwórz') + '</span>' + ic('chevronRight', 20) + '</button>' : '') + '</article>';
  const todoById = (id) => (A.todo || []).find((t) => t.id === id);
  const docById = (id) => (A.docs || []).find((d) => d.id === id);
  const kiedy = (d) => T.fmtLong(d) + ' (' + U.dueText(d) + ')';

  /* ---------- intencje ---------- */

  // Kolejność ma znaczenie: bardziej szczegółowe wzorce wcześniej.
  const INTENTS = [
    { id: 'niezalatwione', re: /niezalatw|do zalatwienia|co mam (teraz )?(do )?zrobic|czy mam jakies|co na mnie czeka|co czeka|zaleg|moje sprawy|co pilne/ },
    { id: 'swiadczenie', re: /800|swiadczeni|wychowawcz/ },
    { id: 'narodziny', re: /urodz|narodzin|noworod|akt urodzenia|dzidzi|niemowl/ },
    { id: 'firma', re: /dzialalnos|firm|ceidg|jdg|samozatrud|zalozyc biznes/ },
    { id: 'zgloszenie', re: /dziur|latarn|wysypisk|zglos\w* problem|halas|chodnik/ },
    { id: 'paszport', re: /paszport/ },
    { id: 'portfel', re: /portfel|zgubi|zgubl|ukradl|ukradzi|skradzi|zastrz|kradziez|zginal|zginel/ },
    { id: 'oc', re: /\boc\b|polis|ubezpiecz/ },
    { id: 'pismo', re: /pism|list\w* z urzedu|wezwani|skarbow|urzad\w* (przyslal|napisal)|dostalem list/ },
    { id: 'dowod', re: /dowod/ },
    { id: 'platnosci', re: /zaplac|platnos|oplat|podat|ile (mam|musze)|naleznos|rachun/ },
    { id: 'terminy', re: /termin|kalendarz|kiedy|do kiedy/ },
    { id: 'dane', re: /kto widzi|kto ma dostep|dostep do|moje dane|zgod|udostep/ },
    { id: 'bezpieczenstwo', re: /bezpiecz|logowan|sesj|hasl|certyfikat|aktualiz|wlam/ },
    { id: 'rodzina', re: /rodzin|dzieci|zgoda (na|rodzica)|wycieczk|corka|syn/ },
    { id: 'eu', re: /unii|europej|eidas|za granic|hiszpan|portugal|lizbon|portfel eu/ }
  ];
  A.spinkaRozpoznaj = (q) => { const t = U.norm(q); const hit = INTENTS.find((x) => x.re.test(t)); return hit ? hit.id : null; };

  // Każda odpowiedź: { title, have, miss, next, warn, rule, sources:[html], actions:[{label, attrs}] }.
  const ANS = {
    niezalatwione() {
      const list = S.attention();
      if (!list.length) return { title: 'Nic nie czeka na Ciebie', have: 'W danych aplikacji nie ma teraz spraw z terminem, płatności ani wersji roboczych.', miss: 'Nie widzę spraw spoza tej demonstracji.', next: 'Gdy pojawi się nowa sprawa, zobaczysz ją na Starcie.', sources: [], actions: [{ label: 'Przejdź na Start', attrs: 'data-tab="start"' }] };
      const top = list.slice(0, 3);
      return {
        title: 'Masz ' + A.plural(list.length, 'sprawę', 'sprawy', 'spraw') + ' wymagające uwagi',
        have: '<ol class="s2-list">' + top.map((o) => '<li><b>' + esc(o.title) + '</b>' + (o.due ? ', ' + esc(kiedy(o.due)) : ', bez terminu') + '. Skutek: ' + esc(o.consText) + '.</li>').join('') + '</ol>' +
          (list.length > 3 ? '<p>Oraz ' + A.plural(list.length - 3, 'inna sprawa', 'inne sprawy', 'innych spraw') + ' na Starcie.</p>' : ''),
        miss: 'Kolejność liczy aplikacja: najpierw skutki, potem termin. Nie znam Twoich planów, więc ostateczną kolejność ustalasz Ty.',
        next: 'Zacznij od pierwszej sprawy albo zobacz wszystkie na Starcie.',
        warn: top[0] && top[0].cons === 3 ? top[0].title + ': ' + top[0].why : null,
        sources: [dataCard('Wymaga Twojej uwagi', 'Lista na Starcie', top.map((o) => [o.kind, o.title]), 'data-tab="start"', 'Przejdź na Start')],
        actions: [{ label: top[0].verb + ': ' + top[0].title, attrs: top[0].attrs }, { label: 'Zobacz wszystkie na Starcie', attrs: 'data-tab="start"' }, { label: 'Kalendarz terminów', attrs: 'data-go="kalendarz"' }]
      };
    },
    narodziny() {
      const b = S.family.find((m) => m.newborn);
      const done = st().submitted.some((x) => x.proc === 'narodziny');
      if (done) return { title: 'Narodziny są już zgłoszone (w symulacji)', have: 'Zgłoszenie zapisane w Sprawach.', miss: 'Nie wiem, kiedy przyjdzie odpis aktu: prototyp nie łączy się z urzędem.', next: 'Możesz złożyć wniosek o świadczenie wychowawcze.', sources: [procCard('swiadczenie')], actions: [{ label: 'Wniosek o świadczenie', attrs: 'data-go="proces" data-id="swiadczenie"' }] };
      return {
        title: 'Zgłoszenie narodzin dziecka',
        have: 'Szpital przekazał kartę urodzenia ' + esc(T.fmtLong(b.karta.date)) + ' (' + esc(b.karta.from) + '). Według danych termin zgłoszenia mija <b>' + esc(kiedy(b.karta.due)) + '</b>. Dane rodziców i miejsce urodzenia uzupełnią się w formularzu same.',
        rule: 'Termin 21 dni od sporządzenia karty urodzenia to informacja ogólna; sprawdź aktualne zasady na gov.pl.',
        warn: 'Dopóki narodzin nie zgłosisz, dziecko nie ma aktu urodzenia ani numeru PESEL, a bez nich nie złożysz wniosków o świadczenia.',
        miss: 'Nie wiem, jakie imię wybierzecie. Nie sprawdzę też niczego w urzędzie: prototyp się z nim nie łączy.',
        next: 'Otwórz formularz. Zajmie około 5 minut, a przed wysłaniem zobaczysz podsumowanie.',
        sources: [procCard('narodziny'), dataCard('Rodzina', 'Karta urodzenia', [['Od', b.karta.from], ['Przekazana', T.fmt(b.karta.date)], ['Termin zgłoszenia', T.fmt(b.karta.due)]], 'data-go="rodzina"', 'Zobacz Rodzinę')],
        actions: [{ label: 'Otwórz formularz zgłoszenia', attrs: 'data-go="proces" data-id="narodziny"' }, { label: 'Zobacz termin w kalendarzu', attrs: 'data-go="kalendarz"' }]
      };
    },
    swiadczenie() {
      const reg = st().submitted.some((x) => x.proc === 'narodziny');
      return {
        title: 'Świadczenie wychowawcze na dziecko',
        have: reg ? 'Narodziny najmłodszego dziecka są zgłoszone (w symulacji), więc możesz złożyć wniosek.' : 'Najmłodsze dziecko nie ma jeszcze numeru PESEL: narodziny nie są zgłoszone.',
        warn: reg ? null : 'Wniosek o świadczenie złożysz dopiero po zgłoszeniu narodzin.',
        miss: 'Nie podaję kwot ani terminów wypłat: zależą od aktualnych przepisów, a tych prototyp nie sprawdza.',
        next: reg ? 'Otwórz wniosek; rachunek uzupełni się z profilu.' : 'Najpierw zgłoś narodziny.',
        sources: [procCard(reg ? 'swiadczenie' : 'narodziny')],
        actions: [reg ? { label: 'Otwórz wniosek', attrs: 'data-go="proces" data-id="swiadczenie"' } : { label: 'Zgłoś narodziny', attrs: 'data-go="proces" data-id="narodziny"' }]
      };
    },
    firma() {
      return {
        title: 'Założenie jednoosobowej działalności',
        have: 'W „Załatw za mnie” jest kreator: wpis do rejestru, data rozpoczęcia, forma opodatkowania i adres. Imię, nazwisko i adres uzupełnią się z profilu (dane fikcyjne).',
        rule: 'Wpis do rejestru jest bezpłatny (informacja ogólna). Zasady podatków i składek sprawdź na gov.pl.',
        miss: 'Nie wiem, czym chcesz się zajmować ani jakiej formy opodatkowania potrzebujesz. Nie doradzam podatkowo: pokażę różnice, a wybór zostawię Tobie.',
        next: 'Otwórz kreator albo najpierw przeczytaj opis sprawy.',
        sources: [procCard('firma')],
        actions: [{ label: 'Otwórz kreator działalności', attrs: 'data-go="proces" data-id="firma"' }, { label: 'Zaświadczenie o niezaleganiu', attrs: 'data-go="proces" data-id="zaswiadczenie"' }]
      };
    },
    zgloszenie() {
      return { title: 'Zgłoszenie problemu w okolicy', have: 'Wybierasz rodzaj problemu, a aplikacja wskazuje, która instytucja się nim zajmuje (w prototypie instytucje są fikcyjne).',
        rule: 'W sytuacji zagrożenia życia lub zdrowia dzwoń pod 112.', miss: 'Nie wiem, gdzie dokładnie jest problem: wpiszesz to w formularzu.', next: 'Otwórz formularz zgłoszenia.',
        sources: [procCard('zgloszenie')], actions: [{ label: 'Zgłoś problem', attrs: 'data-go="proces" data-id="zgloszenie"' }] };
    },
    paszport() {
      const z = S.family.find((m) => m.id === 'zosia');
      const pz = z.docs.find((d) => d.name === 'Paszport');
      return {
        title: 'Paszporty w Twojej rodzinie',
        have: 'Paszport Zosi jest ważny do <b>' + esc(kiedy(pz.valid)) + '</b>. Twój paszport jest ważny do ' + esc(T.fmt(T.plus(1320))) + '.',
        warn: 'Na nowy paszport czeka się zwykle kilka tygodni, a wniosek składa się osobiście.',
        miss: 'Nie wiem, kiedy planujecie wyjazd, i nie widzę wolnych terminów w prawdziwych punktach paszportowych.',
        next: 'Przygotuj wniosek dla Zosi i zarezerwuj wizytę (symulacja).',
        sources: [procCard('paszport'), dataCard('Rodzina', 'Paszport: Zofia Kowalczyk', [['Ważny do', T.fmt(pz.valid)]], 'data-go="osoba" data-id="zosia"', 'Profil Zosi')],
        actions: [{ label: 'Wniosek o paszport', attrs: 'data-go="proces" data-id="paszport"' }]
      };
    },
    portfel() {
      const ids = ['dowod', 'prawko', 'kdr', 'ekuz'].map(docById).filter(Boolean);
      return {
        title: 'Zgubiony portfel: co zastrzec',
        have: 'W aplikacji masz dokumenty, które zwykle nosi się w portfelu: ' + esc(ids.map((d) => d.name.toLowerCase()).join(', ')) + '.',
        warn: 'Dowód osobisty zastrzeż od razu. Zgłoszenie utraty unieważnia go na stałe; tego nie da się cofnąć.',
        miss: 'Nie wiem, czy w portfelu były karty płatnicze: tych w aplikacji nie ma. Kartę zastrzegasz w swoim banku.',
        next: 'Przejdź scenariusz: zaznaczysz, co zginęło, a przed każdą zmianą zobaczysz podsumowanie.',
        sources: ids.slice(0, 2).map((d) => A.chat.api.docCard(d)),
        actions: [{ label: 'Zacznij: zgubiony portfel', attrs: 'data-run="portfel"' }]
      };
    },
    oc() {
      const t = todoById('oc');
      if (!t) return { title: 'OC jest już załatwione', have: 'W „Do załatwienia” nie ma już sprawy OC (załatwiona w demonstracji).', miss: 'Nie widzę nowej polisy: prototyp nie łączy się z ubezpieczycielem.', next: 'Sprawdź dokument pojazdu.', sources: [A.chat.api.docCard(docById('pojazd'))], actions: [{ label: 'Dokument pojazdu', attrs: 'data-go="doc" data-id="pojazd"' }] };
      return {
        title: 'Kończy się OC: Toyota Yaris',
        have: 'Polisa kończy się <b>' + esc(kiedy(t.due)) + '</b>. Masz dwie drogi: zostać u obecnego ubezpieczyciela (umowa zwykle przedłuży się sama) albo zmienić go i wypowiedzieć umowę najpóźniej dzień wcześniej.',
        warn: t.why,
        miss: 'Nie znam ofert innych ubezpieczycieli ani wysokości nowej składki: prototyp się z nimi nie łączy.',
        next: 'Zobacz skutki obu wyborów albo przygotuj wzór wypowiedzenia.',
        sources: [A.chat.api.sourceCard(t)],
        actions: [{ label: 'Zobacz możliwości (scenariusz)', attrs: 'data-run="oc"' }, { label: 'Wzór wypowiedzenia OC', attrs: 'data-go="proces" data-id="oc"' }]
      };
    },
    pismo() {
      const t = todoById('pismo-us');
      const L = A.letters[0];
      if (!t) return { title: 'Nie ma pisma z terminem', have: 'W „Do załatwienia” nie ma teraz pisma, na które trzeba odpowiedzieć.', miss: 'Nie widzę pism spoza aplikacji. Jeśli masz pismo na papierze, dodaj zdjęcie do skrzynki.', next: 'Zrób zdjęcie pisma: pokażę, czego dotyczy i do kiedy odpowiedzieć.', sources: [], actions: [{ label: 'Wyjaśnij pismo ze zdjęcia', attrs: 'data-go="skrzynka"' }] };
      return {
        title: 'Pismo: ' + L.title,
        have: '<b>Kto pisze:</b> ' + esc(L.plain.who) + '.<br><b>Czego chce:</b> ' + esc(L.plain.what) + '<br><b>Do kiedy:</b> ' + esc(kiedy(t.due)) + '.',
        warn: L.plain.ifNothing,
        miss: 'Jeśli chodzi Ci o inne pismo, nie ma go w aplikacji. Dodaj je do skrzynki, a pokażę, co w nim jest.',
        next: 'Odpowiedz z załączoną fakturą; przed wysłaniem zobaczysz podsumowanie.',
        rule: L.plain.notThis,
        sources: [A.chat.api.sourceCard(t)],
        actions: [{ label: 'Odpowiedz na pismo (scenariusz)', attrs: 'data-run="pismo" data-preset=\'{"letter":true}\'' }, { label: 'Przeczytaj pismo po ludzku', attrs: 'data-go="letter" data-id="us"' }, { label: 'Wyjaśnij inne pismo', attrs: 'data-go="skrzynka"' }]
      };
    },
    dowod() {
      const c = (A.cases || []).find((x) => x.id === 'nowy-dowod' && x.state !== 'demo');
      const d = docById('dowod');
      return {
        title: 'Dowód osobisty',
        have: 'Twój dowód jest ważny do <b>' + esc(kiedy(A.dates.idEnd)) + '</b>.' + (c ? ' Wniosek o nowy dowód zacząłeś ' + esc(T.fmtShort(A.dates.caseStarted)) + ' (etap ' + c.step + ' z ' + c.steps + ').' : ''),
        warn: c ? 'Na nowy dowód czeka się zwykle kilka tygodni, a obecny traci ważność za ' + T.dni(T.inDays(A.dates.idEnd)) + '.' : null,
        miss: 'Nie wiem, w którym urzędzie wolisz odebrać dowód: wybierzesz to we wniosku.',
        next: c ? 'Dokończ rozpoczęty wniosek.' : 'Wybierz, co się stało z dowodem.',
        sources: [A.chat.api.docCard(d)],
        actions: [c ? { label: 'Dokończ wniosek o nowy dowód', attrs: 'data-run="nowyDowod" data-preset=\'{"resume":true}\'' } : { label: 'Sprawy z dowodem', attrs: 'data-go="proces" data-id="dowod"' }, { label: 'Zgubiłem dowód', attrs: 'data-run="portfel" data-preset=\'{"items":["dowod"]}\'' }]
      };
    },
    platnosci() {
      const un = S.payments.filter((p) => !st().paid[p.id]);
      const sum = un.reduce((a, p) => a + p.amount, 0);
      return {
        title: un.length ? 'Do zapłaty: ' + U.money(sum) : 'Wszystko opłacone',
        have: un.length ? '<ul class="s2-list">' + un.map((p) => '<li><b>' + esc(p.title) + '</b>: ' + esc(U.money(p.amount)) + ', ' + esc(kiedy(p.due)) + '</li>').join('') + '</ul>' : 'Nie masz nieopłaconych należności w tej demonstracji.',
        warn: un.length ? 'Po terminie urzędy naliczają odsetki albo koszty upomnienia.' : null,
        miss: 'Nie widzę Twojego konta w banku ani należności spoza aplikacji.',
        next: un.length ? 'Opłać w symulacji albo ustaw przypomnienie.' : 'Historię zobaczysz w Płatnościach.',
        sources: [dataCard('Płatności', 'Należności z urzędów', S.payments.map((p) => [p.title, U.money(p.amount) + (st().paid[p.id] ? ', opłacona (symulacja)' : ', do ' + T.fmt(p.due))]), 'data-go="platnosci"', 'Płatności')],
        actions: [{ label: 'Przejdź do Płatności', attrs: 'data-go="platnosci"' }]
      };
    },
    terminy() {
      const ev = S.events().filter((e) => T.inDays(e.date) >= 0 && !e.done).slice(0, 5);
      return {
        title: 'Najbliższe terminy',
        have: '<ul class="s2-list">' + ev.map((e) => '<li><b>' + esc(T.fmtShort(e.date)) + '</b>: ' + esc(e.title) + (e.kind === 'szacunek' ? ' (szacunek, niewiążący)' : '') + '</li>').join('') + '</ul>',
        miss: 'Terminy przewidywane (np. zakończenie sprawy w urzędzie) są szacunkiem prototypu i nie są wiążące.',
        next: 'W kalendarzu zobaczysz miesiąc, filtry i szczegóły każdego terminu.',
        sources: [dataCard('Kalendarz', 'Terminy z aplikacji', ev.slice(0, 3).map((e) => [T.fmt(e.date), e.title]), 'data-go="kalendarz"', 'Otwórz kalendarz')],
        actions: [{ label: 'Otwórz kalendarz', attrs: 'data-go="kalendarz"' }]
      };
    },
    dane() {
      const act = (A.consents || []).filter((c) => c.active);
      return {
        title: 'Kto ma dostęp do Twoich danych',
        have: 'Aktywne dostępy: ' + esc(act.map((c) => c.who).join(', ')) + '. Ostatni odczyt: ' + esc(T.fmtShort(act.map((c) => c.last).sort((a, b) => b - a)[0])) + '.',
        miss: 'Widzę tylko dostępy zapisane w tej demonstracji.',
        next: 'Możesz cofnąć dostęp; przed tym zobaczysz, co się zmieni.',
        sources: [dataCard('Zgody', 'Dostępy do danych', act.map((c) => [c.who, c.why]), 'data-go="access"', 'Zobacz dostępy')],
        actions: [{ label: 'Zarządzaj dostępem (scenariusz)', attrs: 'data-run="dane"' }, { label: 'Centrum bezpieczeństwa', attrs: 'data-go="bezpieczenstwo"' }]
      };
    },
    bezpieczenstwo() {
      const tab = !st().ended.tablet;
      return {
        title: 'Bezpieczeństwo konta',
        have: tab ? 'W symulacji widać nowe logowanie z tabletu w Krakowie, dziś.' : 'Wszystkie sesje w symulacji są rozpoznane.',
        warn: tab ? 'Jeśli to nie Ty, zakończ tę sesję. Nikt z urzędu nie poprosi Cię o hasło ani kod SMS.' : null,
        miss: 'Nie sprawdzam stanu prawdziwych usług ani certyfikatów: pokazuję tylko symulację w prototypie.',
        next: 'Sprawdź sesje i zgody w Centrum bezpieczeństwa.',
        sources: [dataCard('Bezpieczeństwo (symulacja)', 'Sesje', S.sessions.filter((x) => !st().ended[x.id]).map((x) => [x.device, x.where + (x.current ? ', to urządzenie' : '')]), 'data-go="bezpieczenstwo"', 'Centrum bezpieczeństwa')],
        actions: [{ label: 'Centrum bezpieczeństwa', attrs: 'data-go="bezpieczenstwo"' }]
      };
    },
    rodzina() {
      return {
        title: 'Sprawy rodziny',
        have: 'W profilu rodziny są: Anna, Zosia (9 lat), Antek (5 lat) i najmłodsze dziecko. Zosia czeka na zgodę na wycieczkę (do ' + esc(T.fmtShort(T.plus(6))) + '), a narodziny najmłodszego dziecka trzeba zgłosić.',
        miss: 'Widzę tylko to, co członkowie rodziny udostępnili w demonstracji.',
        next: 'Otwórz Rodzinę: dokumenty, zgody i uprawnienia.',
        sources: [dataCard('Rodzina', 'Profile', S.family.map((m) => [m.rel, m.short]), 'data-go="rodzina"', 'Rodzina')],
        actions: [{ label: 'Otwórz Rodzinę', attrs: 'data-go="rodzina"' }, { label: 'Zgoda na wycieczkę Zosi', attrs: 'data-go="osoba" data-id="zosia"' }]
      };
    },
    eu() {
      return {
        title: 'Dokumenty za granicą (koncepcja portfela EU)',
        have: 'W koncepcji Europejskiego Portfela Tożsamości Cyfrowej pokazujesz za granicą tylko wybrane informacje, np. kategorie prawa jazdy bez daty urodzenia.',
        miss: 'To koncepcja demonstracyjna: nie działa jako prawdziwy portfel i nie jest uznawana przez żadną instytucję.',
        next: 'Przejdź scenariusz wynajmu auta w Lizbonie (fikcyjny).',
        sources: [dataCard('Portfel EU (koncepcja)', 'Poświadczenia', [['Dane osobowe (PID)', 'koncepcja'], ['Prawo jazdy (mDL)', 'koncepcja']], 'data-go="portfeleu"', 'Portfel EU')],
        actions: [{ label: 'Otwórz Portfel EU', attrs: 'data-go="portfeleu"' }]
      };
    }
  };

  /* ---------- odpowiedź ---------- */

  let pierwszy = true;
  async function demoAnswer(q, api) {
    const my = ++seq;
    setStan('analizuje');
    const typing = api.append(A.node('<div class="msg bot typing s2-typing" aria-hidden="true"><div class="bubble"><span class="dots"><i></i><i></i><i></i></span></div></div>'));
    await wait(420);
    if (my !== seq) { typing.remove(); return; }
    const id = A.spinkaRozpoznaj(q);
    setStan('odczytuje');
    await wait(380);
    typing.remove();
    if (my !== seq) return;
    if (pierwszy) {
      pierwszy = false;
      api.botNow('<span class="s2-mode">' + ic('info', 16) + 'Tryb demonstracyjny bez modelu AI</span> Odpowiadam tylko z danych tej aplikacji i opisów spraw, zawsze ze źródłem.');
    }
    if (!id) return unknown(q, api);
    const a = ANS[id]();
    setStan('wyjasnia');
    api.botNow('<b>' + esc(a.title) + '</b>');
    if (a.warn) {
      setStan('ostrzega');
      api.append(A.node('<div class="msg bot s2-warn"><div class="bubble"><span class="st-ic" aria-hidden="true">' + ic('alert', 20) + '</span><span><b>Uwaga:</b> ' + esc(a.warn) + '</span></div></div>'));
      await wait(260);
    }
    api.knowCard({ have: a.have + (a.rule ? '<span class="s2-rule-in">' + ic('info', 16) + esc(a.rule) + '</span>' : ''), miss: esc(a.miss), next: esc(a.next) });
    if (a.sources && a.sources.length) api.showSources(a.sources);
    await wait(200);
    if (my !== seq) return;
    setStan('proponuje');
    api.append(A.node('<div class="quick s2-next" role="group" aria-label="Proponowane kroki">' +
      a.actions.map((x) => '<button type="button" class="chip chip-go" ' + x.attrs + '>' + esc(x.label) + ic('chevronRight', 16) + '</button>').join('') + '</div>'));
    setTimeout(() => { if (my === seq && stan === 'proponuje') setStan('czeka'); }, A.reducedMotion() ? 0 : 900);
  }
  let seq = 0;
  function unknown(q, api) {
    setStan('wyjasnia');
    api.knowCard({
      have: 'Nie znalazłam tego w danych aplikacji ani w opisach spraw w „Załatw za mnie”.',
      miss: 'Nie zgaduję odpowiedzi: bez danych mogłabym wprowadzić Cię w błąd. Model AI nie jest podłączony w tej wersji.',
      next: 'Wybierz sprawę z katalogu, zapytaj inaczej albo skorzystaj z wyszukiwarki.'
    });
    setStan('proponuje');
    api.append(A.node('<div class="quick s2-next" role="group" aria-label="Proponowane kroki">' +
      '<button type="button" class="chip chip-go" data-go="uslugi">Katalog spraw' + ic('chevronRight', 16) + '</button>' +
      '<button type="button" class="chip chip-go" data-go="szukaj">Szukaj w aplikacji' + ic('chevronRight', 16) + '</button></div>'));
    api.freeChips(A.suggestions.slice(0, 4));
    setTimeout(() => setStan('gotowa'), A.reducedMotion() ? 0 : 900);
  }
  A.ext.demoAnswer = (q, api) => { demoAnswer(q, api).catch((e) => { console.error(e); setStan('gotowa'); }); };
  A.ext.demoIntro = (api, available) => {
    api.botNow('W tej wersji model AI ' + (available ? 'jest wyłączony' : 'nie jest podłączony') + ', więc działam w <b>trybie demonstracyjnym</b>: rozpoznaję sprawę i odpowiadam wyłącznie z danych tej aplikacji i opisów spraw, zawsze ze źródłem. Czego tam nie ma, tego nie wiem i tak powiem. Nic nie wysyłam.');
  };
  // Reset rozmowy wraca do stanu „Gotowa”.
  const reset0 = A.chat.reset;
  A.chat.reset = function () { seq++; pierwszy = true; const r = reset0.apply(this, arguments); setStan('gotowa'); return r; };
})(window.APP);
