# mObywatel: „Co chcesz załatwić?” — prototyp na mObywatel Challenge

Klikalny prototyp koncepcyjny. Aplikacja zaczyna od pytania „Co chcesz załatwić?”, a nie od listy usług. Asystent tłumaczy sprawę prostym językiem, pokazuje możliwe działania i ich skutki, a każdą ważną decyzję zostawia człowiekowi.

> Nazwa mObywatel i wizerunek godła RP są użyte wyłącznie do prezentacji koncepcji na mObywatel Challenge. To nie jest oficjalna aplikacja mObywatel ani usługa administracji publicznej. Osoby, dokumenty, pisma i instytucje są fikcyjne. Prototyp nie łączy się z żadnym rejestrem, niczego nie wysyła i nie ma prawdziwego logowania.

## Spinka 2.0: centrum spraw obywatelskich (8.11.2026)

Zasada: **jeden problem → jedno miejsce → jasny proces → rozwiązanie**. Audyt i plan: `docs/spinka-2-plan.md`.
Stos bez zmian: HTML, CSS i JavaScript bez frameworka, składane przez `build.mjs` w jeden plik. Nowe moduły to osobne pliki
w `src/`, które rejestrują ekrany, akcje przycisków (`data-act`), powiadomienia, wyszukiwanie i głębokie linki w `A.ext`
(`src/ds.js`); rdzeń (`src/app.js`) pyta rejestr przy każdym renderze.

| Plik | Co robi |
|---|---|
| `src/ds.js` | rejestr modułów i komponenty: pigułka, znak „Symulacja”, pasek postępu (`role=progressbar`), kafelek, filtry (`aria-pressed`), pole z walidacją i podsumowaniem błędów, arkusz dolny z fokusem i `inert`, animacja sukcesu, wyszukiwanie |
| `src/stan.js` | stan modułów w `localStorage` (`spinka2-stan`): wersje robocze, sprawy z kreatorów, przypomnienia, płatności, skrzynka, sesje, uprawnienia, historia zgód; dane demonstracyjne (płatności, rodzina, sesje, historia dostępu); kolejność „Wymaga Twojej uwagi” i terminy kalendarza |
| `src/centrum.js` | Start jako Centrum spraw, „Więcej” z modułami, wyszukiwarka, płatności (symulacja) |
| `src/spinka-demo.js` | tryb demonstracyjny Spinki bez modelu AI i 9 nazwanych stanów |
| `src/uslugi.js` | „Załatw za mnie”: katalog z filtrami i silnik kreatora dla 10 spraw |
| `src/skrzynka.js` | skrzynka dokumentów: zdjęcie lub PDF, symulacja OCR na przykładowych pismach, analiza |
| `src/kalendarz.js` | kalendarz obywatela: miesiąc, filtry, nadchodzące, szczegóły, przypomnienia |
| `src/bezpieczenstwo.js` | centrum bezpieczeństwa i centrum aktualizacji |
| `src/rodzina.js` | tryb rodzinny: profile, dokumenty, zgody rodzica, uprawnienia |
| `src/portfel-eu.js` | koncepcja Europejskiego Portfela Tożsamości Cyfrowej (eIDAS 2.0) |
| `src/spinka2.css` | style modułów, tokeny ruchu, tryb uproszczony, wysoki kontrast |

**Centrum spraw (Start).** Pasek z datą w prototypie i wskaźnikiem bezpieczeństwa (tekst i ikona). „Wymaga Twojej uwagi”:
terminy, pisma, płatności, zgody, nieukończone sprawy, wersje robocze i ważne komunikaty w jednej liście, ułożone według
**skutku** (wysoki: kara, brak aktu, dostęp do konta; średni: odsetki, dopłata; niski: upomnienie, wygoda) i **terminu**
(wynik = pilność + 2 × skutek); przy każdej pozycji „Dlaczego tutaj?”. Szybkie działania (6), „Twoje sprawy” z instytucją,
statusem, terminem, paskiem postępu i następnym krokiem, „Twoje dokumenty” pogrupowane i powiązane ze sprawami.
Dzwonek to centrum powiadomień (koperty, odczyty danych i powiadomienia modułów; otwarcie oznacza jako przeczytane).

**Spinka.** Z modelem AI (serwer projektu) bez zmian. Bez serwera: tryb demonstracyjny rozpoznaje sprawę po słowach
kluczowych i odpowiada **wyłącznie z danych aplikacji i opisów spraw**: co wiadomo (ze źródłem), czego nie wiadomo,
ostrzeżenie o skutkach, proponowane kroki z przejściem do formularza. Pytanie spoza danych dostaje „nie wiem”, bez
zgadywania. Gdy serwer jest, ale wysyłanie jest wyłączone lub wstrzymane, Spinka mówi to wprost (jak dotąd).
Stany: Gotowa, Słucha, Analizuje, Odczytuje dane, Wyjaśnia, Ostrzega, Proponuje rozwiązanie, Czeka na Twoją decyzję,
Zakończono (pasek pod imieniem, `role=status`, znak zmienia postać).

**Załatw za mnie.** Zgłoszenie narodzin dziecka, świadczenie wychowawcze, zmiana danych kontaktowych, sprawy z dowodem
(prowadzą do rozpoczętych scenariuszy), paszport, jednoosobowa działalność, zaświadczenie o niezaleganiu, opłata
należności, zgłoszenie problemu w okolicy, wypowiedzenie OC (wzór). Każda: wyjaśnienie, dokumenty, autouzupełnianie
(oznaczone), formularz z walidacją, koszty, wersja robocza (także po odświeżeniu), podsumowanie z „Zmień”, potwierdzenie,
status symulacji, sprawa w „Sprawach”, termin szacunkowy w kalendarzu. Ekran końcowy nie udaje urzędowego potwierdzenia.

**Moduły.** Skrzynka (własny plik: tylko podgląd, treść nie jest odczytywana; przykładowe pisma: OCR z pewnością i
różnicami, warstwy „Z dokumentu / Wynik OCR / Dane z aplikacji / Interpretacja Spinki”, termin do kalendarza,
przypisanie do sprawy). Kalendarz (rodzaje: termin z danych, ważność, przypomnienie, szacunek niewiążący). Płatności
(symulacja, bez danych karty i banku). Centrum bezpieczeństwa (sesje, historia dostępu, zgody, porady, odzyskiwanie)
i aktualizacji (wersja i moduły prototypu; bez komunikatów o prawdziwych usługach i certyfikatach). Rodzina (rodzic
widzi sprawy dziecka; dorosły decyduje sam; dziecko nie widzi danych rodzica). Portfel EU (koncepcja: selektywne
udostępnianie, weryfikacja w symulacji, scenariusz wynajmu auta w Lizbonie, historia zgód).

**Dostępność.** W „Więcej → Wygoda i dostępność”: wysoki kontrast (czarne tło, biały tekst, żółty fokus) i tryb
uproszczony (na Starcie tylko najważniejsze). Pola mają etykiety, błędy pod polem i w podsumowaniu z linkami do pól.
Pole, na które trafia fokus, nie chowa się pod przyklejonym paskiem „Wstecz / Dalej” kreatora (WCAG 2.2, 2.4.11): `ds.js`
mierzy pasek po każdym przeniesieniu fokusu i dosuwa ekran, więc działa też przy największym tekście.

**Testy.** `testy/spinka-2/procesy-test.js <port dist/> <axe.min.js>`: 58 sprawdzeń (Centrum, kreatory z walidacją i
wersją roboczą, płatności, skrzynka, kalendarz, bezpieczeństwo, rodzina, portfel EU, 6 pytań do Spinki, wyszukiwarka,
wysoki kontrast, tryb uproszczony, axe na 14 ekranach i formularzu z błędami, przyciski bez działania, fokus
niezasłonięty przez pasek kreatora przy standardowym i największym tekście, 320 px).

## Ekran startowy (przy każdym wejściu)

Sekwencja, około 2,4 s animacji i chwila na odczyt; od czerwonego ekranu do wyboru osoby około 3,2 s:

1. Cały ekran wypełnia jednolita czerwień (widoczna od pierwszej klatki, bez mignięcia aplikacji).
2. Biały orzeł z koroną wznosi się z dołu ekranu i zatrzymuje na środku. Ruch dostaje cały element znaku, więc orzeł i korona mają w każdej klatce to samo przesunięcie (także przy wolnym renderowaniu).
3. Korona spada na głowę dopiero, gdy orzeł stanie (runda 34): przez cały lot orzeł niesie koronę ok. 16% wysokości znaku nad głową (prawie 2 wysokości korony, przechyloną o 4°). Orzeł staje po 0,82 s; 40 ms później korona zaczyna spadać z przyspieszeniem (ok. 55 px na ekranie przy 390 px), dotyka głowy po ok. 0,3 s, odbija się o ok. 2% wysokości znaku (ok. 7 px) i osiada nieruchomo na tym samym miejscu, bez zgniatania i bez wchodzenia w głowę. Chwila na złożony znak po osiadaniu skrócona ze 140 do 60 ms, więc ekran startowy jest dłuższy o ok. 0,2 s. Wcześniej: runda 30 – opad mały (4%) i razem z orłem; runda 31 – opad po zatrzymaniu, ale bez wyraźnego osiadania; runda 32 – opad już w czasie hamowania orła. Test `testy/runda-29/godlo-test.js` (390 i 1280 px, także przy procesorze 6x wolniejszym) sprawdza w każdej klatce wyśrodkowanie, kadr, brak migotania, start opadu dopiero po zatrzymaniu orła (najwyżej 0,25 s później), co najmniej 12% wysokości znaku spadku na ekranie, odbicie co najmniej 1,5% i spokój na końcu, a także ograniczony ruch i „Pomiń”. Zmiana aplikacji zmienia jej build: przypięta suma w `strona/build.mjs` to teraz `5a17aa7e25fe84d66fe424700b0b66ce` (build powtarzalny, sprawdzone dwukrotnym budowaniem).
4. Czerwień kurczy się do kwadratowej ikony aplikacji, tło wokół robi się białe.
5. Ikona przesuwa się w lewo, a po prawej odsłania się napis „mObywatel”.
6. Gotowy znak z nazwą stoi chwilę.
7. Znak i napis „osiadają” w nagłówku ekranu wejścia, dokładnie tam, gdzie logo stoi później w aplikacji (lewy górny róg), a białe tło znika. Treść wejścia pojawia się za przelatującym znakiem (dolne karty od połowy lotu, nagłówek na końcu), więc napis nie przelatuje nad innym tekstem. Ten krok zastąpił dawne wygaszanie (krótsza chwila w kroku 6), więc animacja nie jest dłuższa: 380 + 360 ms zamiast 520 + 220 ms. Czerwony kwadrat leci jako tło tego samego elementu co godło (sam transform), żeby warstwy się nie rozjeżdżały.

- Przez cały czas widać „Prototyp demonstracyjny” i przycisk „Pomiń”. Pominąć można też kliknięciem, Enterem, spacją albo Escape.
- Animacja rusza dopiero, gdy ekran jest naprawdę widoczny (np. gdy panel z aplikacją jest otwarty). Działa także w ramce bez dostępu do pamięci przeglądarki.
- Jedyne prawdziwe ładowanie to czcionki: jeśli nie zdążą, pod znakiem pojawia się „Wczytuję czcionki…”. Nie ma udawanego paska postępu.
- Gdyby skrypt w ogóle nie zadziałał, czerwony ekran sam znika po 9 s (zabezpieczenie w CSS).
- Przy ograniczeniu ruchu od razu widać gotowy znak z nazwą (bez lotu i zmiany rozmiaru), a po chwili wybór osoby.
- Linki do scenariuszy (`#portfel` itd.) też zaczynają się od animacji, a po niej otwierają scenariusz.
- Wybór osoby nie ma żadnych pól: tylko fikcyjna osoba i informacja, że to nie jest logowanie do usług państwowych.

### Źródło godła

`src/assets/godlo-zrodlo.svg` to wizerunek godła RP z ikony w publicznym repozytorium prototypu mobywatel.ai (github.com/mkljczk/mobywatel-ai, plik `mockup/assets/icon-mobywatel.svg`). Strony urzędów i Wikimedia były zablokowane przez politykę sieci środowiska, w którym powstawał prototyp. `build.mjs` usuwa z pliku czerwone tło i leżący poza ikoną napis marki, a koronę (kształty 1 i 191–196) wydziela do osobnej warstwy. Aby użyć pliku z urzędu, podmień `src/assets/godlo-zrodlo.svg` i popraw w `build.mjs` numery kształtów korony.

## Spinka: asystent spraw („Zapytaj Spinkę”)

Asystent nazywa się **Spinka** i ma własny znak: dwie kartki sprawy spięte czerwoną spinką, która wystaje nad krawędź. Nazwa i znak mówią to samo: Spinka spina sprawy i porządkuje je krok po kroku. Hasło w aplikacji (raz, w powitaniu): „Spinam sprawy, nie Ciebie.” Pełne hasło do materiałów poza aplikacją: „Spinka — spina sprawy, nie Ciebie.” Zakładka w dolnym pasku nadal nazywa się „Asystent”, bo nazwa zakładki ma mówić, do czego służy.

- **Nazwa w jednym miejscu:** `src/marka.js` (`imie`, `biernik`, `zNarzednikiem`, `haslo`, `postac`). Kod bierze stąd „Zapytaj Spinkę”, „Rozmowa ze Spinką”, „Spinka pisze…”, „Spinka pyta model AI…”, etykietę pola na Starcie i powitanie. Klasy i funkcje znaku mają nazwy neutralne (`A.postac`, `.postac-*`).
- **Zmiana nazwy** (np. gdy weryfikacja znaku towarowego ujawni konflikt): popraw formy w `src/marka.js`, uruchom `node build.mjs` i testy. **Usunięcie znaku:** `postac: false`: w nagłówku, w polu na Starcie i na ekranie „Gotowe” wracają zwykłe ikony, układ się nie zmienia.
- **Gdzie jest znak:** tylko w kontekście asystenta: nagłówek rozmowy (44 px, zmienia stan), pole „Co chcesz załatwić?” na Starcie (34 px; poniżej 360 px szerokości ukryty, żeby zostało miejsce na tekst) i ekran „Gotowe (w demonstracji)” (58 px). Nie ma go na innych ekranach.
- **Znak bez twarzy:** spokojny, „urzędowy” charakter i żadnego podobieństwa do maskotek (w szczególności do spinacza z oczami znanego z pakietu biurowego). Spinka to pełny czerwony kształt ze szczeliną, inny niż liniowa ikona spinacza przy dodawaniu pliku.
- **Stany:** **słucha** (spinka lekko się uchyla, odznaka z falami, pulsują 3 razy), **wyjaśnia** (linie na kartce się wypisują, odznaka „i”), **ostrzega** (bursztynowa odznaka „!” z ciemnym obrysem), **następny krok** (przednia kartka przesuwa się w prawo, odznaka ze strzałką), **gotowe** (spinka się zatrzaskuje, zielona odznaka z ptaszkiem). Obrys kartek `--muted` 7:1 do bieli, spinka `--accent` 5,9:1, znaki na odznakach co najmniej 5,9:1. Ruch 200–300 ms; przy ograniczonym ruchu stan zmienia się od razu. Znak jest ozdobą ukrytą przed czytnikiem; znaczenie niesie tekst. Stan wynika z tego, co właśnie pojawiło się w rozmowie (`moodOf()` w `src/assistant.js`).
- **Ton:** spokojny i rzeczowy, w drugiej osobie, krótkie zdania, najpierw fakty, potem jeden następny krok; bez wykrzykników i zdrobnień. Hasło żartuje tylko raz, w powitaniu; w podsumowaniach, błędach i na ekranie „Gotowe” go nie ma.
- **Uczciwość:** pod imieniem zawsze widać stan modelu AI. Bez serwera: „Model AI niepodłączony”, pasek prototypu „dane fikcyjne · nic nie jest wysyłane”, a powitanie mówi, że na pytania własnymi słowami asystent nie odpowiada i nic nie wysyła. Z serwerem: przełącznik „Model AI” i „z danych aplikacji”. Szczegóły w sekcji „Asystent: pytania własnymi słowami (AI)”.
- **Nazwa nie jest zatwierdzona prawnie.** Wstępne rozeznanie z 29.10.2026 (wyszukiwarka internetowa, bez rejestrów UPRP, TMview i EUIPO, które były niedostępne ze środowiska pracy): `docs/nazwa-spinka.md`. Przed użyciem poza konkursem trzeba przeszukać rejestry i skonsultować wynik z rzecznikiem patentowym.

## Asystent: pytania własnymi słowami (AI)

Runda 28: gotowe reguły, które udawały rozmowę, zostały **usunięte**. Pytania własnymi słowami obsługuje wyłącznie model językowy przez serwer projektu. Scenariusze krok po kroku (pismo, OC, portfel, nowy dowód, dostęp do danych) zostają: to prowadzone ścieżki demonstracyjne uruchamiane przyciskami, nie rozmowa.

**Bez serwera** (plik statyczny, GitHub Pages bez funkcji serwerowej): nagłówek „Model AI niepodłączony”. Na wpisane pytanie asystent odpowiada jasnym stanem: „Nie odpowiem na to pytanie: model AI nie jest podłączony… Nie podaję gotowych odpowiedzi zamiast AI”, i daje przyciski do „Do załatwienia”, „Dokumenty” oraz do scenariusza, którego nazwa pasuje do wpisanych słów. Słowa kluczowe służą tylko do tej podpowiedzi. Nic nie jest wysyłane.

**Z serwerem** (`server/serwer-lokalny.mjs` lokalnie albo `server/funkcja-serwerowa.mjs` jako funkcja Cloudflare dla strony statycznej):

- **Rekordy są na serwerze (runda 29).** `build.mjs` buduje z `src/data.js` ograniczony zestaw fikcyjnych rekordów (`server/dane-demo.mjs`: 11 pozycji, tytuły, krótkie opisy, terminy z „za … dni” **policzonymi kodem** od daty pokazu). Przeglądarka wysyła tylko pytanie (do 300 znaków), po dopytaniu poprzednie pytanie, i krótki **stan demonstracji**: które pozycje „Do załatwienia” załatwiono, ustawione przypomnienia, statusy spraw z zamkniętej listy. Serwer sprawdza każde id, datę i status (`server/kontekst.mjs`) i składa z tego kontekst. Rekordy przysłane z przeglądarki są ignorowane, więc endpointu nie da się użyć jako ogólnego czatu z własnymi „danymi”. Ten sam kod i ta sama kopia rekordów są wklejane do aplikacji, więc podgląd w Profilu jest identyczny z tym, co dostaje model (test `asystent-workers-test.js`).
- **Zgoda przed pierwszym wysłaniem:** karta „Wysłać to pytanie do modelu AI?” z nazwą dostawcy, listą tego, co trafia i czego nie ma (imię, nazwisko, PESEL, adres, numery dokumentów, tablice, numer polisy, pełna treść pism; z rozmowy tylko bieżące pytanie, a po dopytaniu także poprzednie) i zdaniem o zasadach dostawcy. „Nie wysyłaj” wyłącza wysyłanie do zamknięcia karty. Zgodę można cofnąć w Profilu.
- **Odpowiedź w dwóch warstwach:** „Objaśnienie modelu AI” (tekst modelu, podpisany) oraz „Dane z aplikacji, na których oparto odpowiedź”: karty z rekordów aplikacji, których treść pochodzi z danych, nie z modelu. Punkty „Z danych aplikacji” mają źródło w nawiasie, „Tego w danych nie ma” mówi, czego brakuje.
- **Niejednoznaczne pytanie** („raty?”, „Jaki termin?”): model ma powiedzieć, czego nie wie, i dopytać (np. „Chodzi o raty kredytu czy o raty składki OC?”).
- **Sprawdzenie odpowiedzi** (`server/rdzen.mjs`, `check()`; drugi raz w przeglądarce): źródła i akcje tylko z listy; **każda liczba (data, kwota, liczba dni, rat) i nazwa miesiąca musi pochodzić z rekordu, na który punkt się powołuje**. Termin pisma podany jako koniec polisy OC, wymyślone raty, „Sprawdziłem w BIK”, „Wysłałem”, PESEL, linki: odpowiedź odrzucona i niezastąpiona gotowym tekstem.
- **Limity:** pytanie do 300 znaków (dłuższe nie jest wysyłane, asystent mówi, ile znaków ma pytanie), zapytanie do serwera do 4 KB, odpowiedź modelu do 800 tokenów, z rozmowy tylko jedno poprzednie pytanie.
- **Zmiany stanu tylko po potwierdzeniu:** model może zaproponować otwarcie rekordu albo scenariusz; scenariusz przed każdą zmianą pokazuje podsumowanie z „Potwierdź”.
- **Błędy = „AI niedostępne”, nigdy reguły:** brak dostępu do modelu, odrzucony token/klucz, model niedostępny w planie → stan „niepodłączony” z powodem. Wyczerpana dzienna pula Workers AI → „AI niedostępne: wyczerpała się dzienna bezpłatna pula modelu… Do HH:MM nie wysyłam pytań” (do 00:00 UTC, czyli 01:00 czasu polskiego zimą). Limit dostawcy albo serwera → „Do HH:MM nie wysyłam pytań”. Brak sieci, przekroczony czas, błąd dostawcy → komunikat i „Zapytaj jeszcze raz”; dwa takie błędy z rzędu wstrzymują AI na 2 minuty.

## Model AI: dostawca, konfiguracja, koszty i warunki

**Wybór (runda 29): Cloudflare Workers AI, model `@cf/google/gemma-4-26b-a4b-it`, plan Workers Free.** Źródło: dokumentacja Cloudflare (strony `workers-ai/platform/pricing`, `platform/limits`, `platform/data-usage`, strona modelu i `workers/platform/limits`, czytane 2.11.2026 przez indeks dokumentacji Context7, bo `developers.cloudflare.com` i `ai.google.dev` są zablokowane w środowisku pracy). Przed wdrożeniem sprawdź je u źródła.

- **Bezpłatnie:** 10 000 neuronów dziennie na konto, reset o 00:00 UTC. Na planie Workers Free nie ma dopłat: po wyczerpaniu puli zapytania kończą się błędem, a asystent pokazuje „AI niedostępne”. Powyżej puli płaci się tylko na Workers Paid (0,011 USD za 1000 neuronów); nie włączaj go bez decyzji o kosztach.
- **Model:** Gemma 4 26B A4B (licencja Gemma 4), 256 tys. tokenów kontekstu, cena 9091 neuronów za 1 mln tokenów wejścia i 27 273 za 1 mln wyjścia. Nie ma go na liście modeli wymagających planu płatnego (Kimi K2.6/K2.7, GLM 5.x, DeepSeek V4). Jedno pytanie to ok. 2,5 tys. tokenów wejścia (7,3 KB) i do 800 wyjścia, czyli ok. 25–45 neuronów: **ok. 200–400 pytań dziennie za darmo**. Wydajność modelu po polsku nie była sprawdzona na prawdziwym modelu (patrz niżej).
- **Limity:** Workers AI: 300 zapytań/min dla modeli tekstowych; Workers Free: 100 000 zapytań dziennie do funkcji, 10 ms CPU na zapytanie (czekanie na model się nie liczy). Funkcja projektu: 6 pytań/min z adresu IP (powiązanie Rate Limiting po stronie Cloudflare i licznik w pamięci), 150 dziennie na instancję (przybliżone), tylko adresy z `DOZWOLONE_ZRODLA`.
- **Dane:** według zasad Workers AI Cloudflare nie udostępnia treści innym klientom i nie używa ich do trenowania modeli ani ulepszania usług bez wyraźnej zgody; treść nie jest przechowywana, jeśli nie użyje się osobnego magazynu (projekt nie używa). Do modelu trafiają tylko fikcyjne rekordy demonstracji i pytanie.
- **Gemini (zostaje tylko do lokalnych testów autora):** strona cennika Gemini API mówi wprost, że na bezpłatnym poziomie treści są używane do ulepszania produktów Google. Zasady dla EOG (aplikacje udostępniane użytkownikom w EOG, Szwajcarii i Wielkiej Brytanii tylko na usługach płatnych) zna projekt z rundy 28 z wyszukiwarki; w tej rundzie indeks dokumentacji nie zwrócił tego akapitu, a strona warunków była zablokowana. Gemini nie jest więc wybrany dla publicznej strony.

**Wdrożenie funkcji Cloudflare (bez klucza w kodzie):**

```bash
node build.mjs                                   # także server/dane-demo.mjs
cd server && cp wrangler.toml.example wrangler.toml   # wpisz DOZWOLONE_ZRODLA = adres strony
npx wrangler login                               # logowanie do Twojego konta (plan Workers Free)
npx wrangler deploy                              # → https://spinka-asystent.<konto>.workers.dev
cd .. && ASSISTANT_ENDPOINT=https://spinka-asystent.<konto>.workers.dev/api/assistant node build.mjs
node testy/runda-29/prawdziwy-model-test.mjs https://spinka-asystent.<konto>.workers.dev/api/assistant --origin https://mollo-glitch.github.io
```

Model działa przez powiązanie `AI` konta, więc nie ma klucza do ukrycia. `wrangler.toml` jest w `.gitignore`.

**Lokalnie (test autora na prawdziwym modelu):** `cp .env.example .env`, wpisz `CF_ACCOUNT_ID` i `CF_API_TOKEN` (token z szablonu „Workers AI”), `node build.mjs`, `node server/serwer-lokalny.mjs` → http://127.0.0.1:8080, potem `node testy/runda-29/prawdziwy-model-test.mjs`. Token jest tylko w `.env` (w `.gitignore`), idzie wyłącznie w nagłówku do api.cloudflare.com. `server/gemini-adapter.mjs` zostaje dla zgodności: ten sam serwer, domyślnie z Gemini.

## Profil (runda 28)

Trzy części ze spisem na górze (przyciski przewijają do części i przenoszą fokus na jej nagłówek):

1. **O prototypie:** czym jest Spinka (nieoficjalna koncepcja na mObywatel Challenge, nie usługa administracji), „Co robi” i „Czego nie robi” (nie łączy się z urzędem, bankiem ani BIK, niczego nie wysyła do instytucji, nie zna danych spoza aplikacji), data w prototypie, przewodnik, zmiana osoby, „Koncepcja i projekt aplikacji: Igor M.”.
2. **Twoje dane:** dane osobowe (fikcyjne, PESEL zakryty), adres i stan zmiany; **„Gdzie są dane”** (sprawdzone w kodzie: sprawy i zmiany tylko w pamięci karty, ustawienia wygody w `localStorage` `proto-sprawy-ustawienia`, wybór i zgoda dla AI w `sessionStorage`, rozmowa tylko na ekranie); **„Asystent AI”**: stan (niepodłączony z powodem albo dostawca, model i stan wysyłania), przełącznik „Wysyłaj pytania do modelu AI” tylko wtedy, gdy model jest podłączony (bez atrap), „Cofnij zgodę”, rozwijany **podgląd danych, które trafiłyby do modelu** (ta sama funkcja, którą asystent wysyła); „Kto ma dostęp do moich danych”, „Wyczyść rozmowę ze Spinką”, „Zacznij demonstrację od nowa” (z potwierdzeniem).
3. **Wygoda i dostępność:** rozmiar tekstu w trzech stopniach (standardowy, większy 1,18×, największy 1,32×; grupa radiowa ze strzałkami; przycisk „A A” w nagłówku przełącza standardowy ↔ większy), „Ogranicz animacje” (z ustawieniem systemu oznaczonym jako włączone w telefonie), „Wyraźniejsze kontury i opisy” (ciemniejsze linie podziału i tekst pomocniczy). Ustawienia działają od razu w całej aplikacji.

Dolny pasek bez zmian (Start, Dokumenty, Asystent, Sprawy, Profil).

## Wariant z postacią Spinki (do oceny)

`node build.mjs --wariant-postaci` tworzy dodatkowo `dist/wariant-postaci.html`: w miejscu znaku z odznakami stanu jest postać (kartka ze spinką, bez twarzy; `src/wariant-postaci.js`). Pozy wynikają z tych samych stanów co znak (`moodOf()`): słucha (pisanie), wyjaśnia (odpowiedź), ostrzega (podsumowanie przed zmianą, brak danych, AI niepodłączone), następny krok (wybór w scenariuszu), gotowe (wykonane w demonstracji). Główny `dist/index.html` ma nadal znak.

## Demonstracyjne wejście

Pierwszy widok po animacji startowej, przed wyborem osoby. Ma wyglądać jak początek tej aplikacji, a nie jak instrukcja; niczego nie sprawdza i o nic nie prosi.

- **Scena powitalna (własny pomysł):** otwarta koperta z czerwoną pieczęcią z godłem, taka jak sprawy w „Do załatwienia”. Wysuwają się z niej karta „Dowód osobisty” (niebieska: dokumenty) i karteczka „Do załatwienia · Kończy się OC · za 9 dni” (bursztynowa: termin, z falą zabezpieczającą). Na kopercie jest przerywany stempel „Prototyp · dane fikcyjne” w kolorze oznaczeń prototypu. Scena jest ozdobna (`aria-hidden`); to samo mówią tytuł i opis pod nią. Liczba dni pochodzi z istniejącej sprawy OC.
- **Ruch:** po splashu znak osiada w nagłówku, a karta i karteczka raz wysuwają się z koperty (560 ms, druga 90 ms później). Bez pętli. Przy ograniczeniu ruchu scena od razu jest w stanie końcowym.
- **Tekst widoczny od razu:** tytuł „Twoje sprawy w jednym miejscu”, jedno zdanie („To demonstracja: wchodzisz jako osoba fikcyjna. Niczego nie wpisujesz i nic nie jest wysyłane.”) i dwa etapy prawdziwego logowania po jednej linijce: „Pierwszy raz potwierdzasz tożsamość”, „Potem hasło, odcisk palca lub twarz” (poniżej 380 px w jednej kolumnie).
- **Jedna akcja:** „Wejdź do demonstracji” w stałej stopce poza przewijaną treścią, więc przy 390, 360 i 320 px nigdy nie zasłania tekstu. Prowadzi do wyboru fikcyjnej osoby. Nie ma żadnych pól: ani PESEL-u, ani hasła, PIN-u, numeru CAN czy kodu QR.
- Rozwijane „Jak wygląda prawdziwe logowanie?”: bankowość elektroniczna, e-dowód i Profil Zaufany (pierwsze potwierdzenie) oraz potwierdzenie w aplikacji lub kodem QR (gdy aplikacja jest już aktywna). Opis uproszczony; prototyp nie łączy się z żadnym z tych sposobów.
- Nagłówek jak górny pasek aplikacji, pasek „Prototyp · dane fikcyjne · nic nie jest wysyłane” i stopka mówiąca, że to nie jest oficjalna aplikacja mObywatel.

## Ekran główny (Start)

Pionowe przewijanie zostaje, ale każda sekcja ma inną, czytelną formę:

1. **Nagłówek:** znak, „Dzień dobry, Tomaszu”, większy tekst, koperta z licznikiem nowych wiadomości (otwiera listę wiadomości, niżej) i inicjały TK, które otwierają szybki podgląd profilu (niżej).
2. **Do załatwienia — pas kopert:** poziomy pas, w którym pierwsza jest najpilniejsza sprawa (OC Toyoty Yaris: rysunek auta, tablica WX 12345, bursztynowa strefa terminu „Polisa OC kończy się · data · za 9 dni”, „Zobacz, co zrobić”). Następna koperta wystaje 26 px zza krawędzi, pod pasem są kropki, licznik „1 z 2” i strzałki. Na telefonie przesuwa się palcem (pionowy gest dalej przewija stronę), myszą strzałkami albo kliknięciem w wystającą kopertę, która wtedy wjeżdża zamiast się otwierać. Każda sprawa jest też w „Wszystkie”. Po zamknięciu koperty i po powrocie na Start pas stoi na tej samej sprawie. Krótka reakcja po zmianie: karta na wierzchu ma pełny rozmiar, wystająca 96%, licznik lekko podskakuje. Raz na wejście do aplikacji pas lekko odjeżdża w lewo i wraca (podpowiedź gestu); przerywa ją dotyk, kółko lub strzałka, a dotknięta koperta i tak się otwiera. Przy ograniczonym ruchu nic z tego się nie rusza.
3. **Jeden skrót do asystenta:** pole „Co chcesz załatwić?” w jednym wierszu z mikrofonem i wysłaniem. Przykłady są w rozmowie.
4. **W toku — dwa kafelki:** pierścień etapów (zielone odcinki = zaliczone, „1/4”) z podpisem „Etap 1 z 4”, tytuł, status, następny krok jednym zdaniem („Dalej: Sprawdź dane, dodaj zdjęcie i wybierz termin wizyty.”) i jedno działanie („Dokończ”, „Sprawdź status”). Poniżej 360 px kafelki stoją jeden pod drugim.
5. **Dokumenty — portfel:** ciemny, neutralny grafitowy portfel, wyraźnie inny niż białe karty spraw; kolor niosą same karty dokumentów. Karty stoją w nim wachlarzem i chowają się za jaśniejszą kieszenią z „Otwórz dokument”. Na wierzchu dokument, który wymaga uwagi (dowód: „Ważny jeszcze 50 dni”), za nim Toyota Yaris i prawo jazdy. Dotknięcie karty otwiera ten dokument, który dotknięto (także wystającą kartę z tyłu); napis, kieszeń „Otwórz dokument”, klawiatura i czytnik ekranu otwierają dokument z wierzchu, opisany w przycisku. „Wszystkie (6)” celowo otwiera całą zakładkę Dokumenty, a nie dokument.

Sekcje pod pierwszym ekranem raz „wjeżdżają” przy pierwszym przewinięciu (320 ms, od 40% krycia, więc w spoczynku nic nie jest ukryte). Bez dodatkowych statystyk i nowych danych.

## Profil: podgląd i pełny profil

Piąta pozycja dolnego paska (ikona osoby). Układ zakładki opisuje sekcja „Profil (runda 28)”.

**Szybki podgląd pod inicjałami TK (Start):** mała karta z falą zabezpieczającą (niebieska: tożsamość): imię i nazwisko, miasto i „osoba fikcyjna”, zamaskowany PESEL (bez możliwości odsłonięcia) i stan zmiany adresu (status, etapy, termin urzędu), a na dole „Zobacz cały profil”. Tylko dane, które już są w prototypie.

**Pełny profil z podglądu:** „Zobacz cały profil” otwiera profil jako szczegóły Startu (ten sam ekran co zakładka Profil, ale z „Wróć” w nagłówku; dolny pasek zostaje na Starcie). Karta podglądu przechodzi w kartę profilu, a „Wróć” zwija profil z powrotem do inicjałów: Start jest w tym samym miejscu, fokus wraca na inicjały. Zakładka Profil w dolnym pasku działa jak dotąd.

- Na niskim ekranie (np. 320 px z większym tekstem) karta kończy się nad dolnym paskiem i przewija się w środku, więc nie zasłania zakładek, a „Zobacz cały profil” zawsze da się osiągnąć palcem, kółkiem i klawiaturą.
- Telefon: dotknięcie TK otwiera, ponowne dotknięcie zamyka. Dotknięcie poza kartą zamyka podgląd i nie uruchamia przy okazji tego, co leży pod spodem.
- Mysz: najechanie otwiera, zjechanie zamyka; kliknięcie „przypina” kartę, drugie kliknięcie zamyka.
- Klawiatura: fokus z Tab otwiera, kolejny Tab wchodzi do karty, wyjście z karty ją zamyka; Escape zamyka i wraca na TK. Przycisk ma `aria-expanded`.
- Ruch: karta pojawia się z 6 px i lekkiego pomniejszenia w 180 ms; przy ograniczonym ruchu od razu.

- Na górze osobista karta: inicjały, imię i nazwisko jako główny nagłówek ekranu, oznaczenie „Dane fikcyjne”. Imię i nazwisko nie powtarzają się niżej.
- **Dane osobowe:** PESEL, domyślnie zakryty do pierwszych sześciu cyfr; „Pokaż PESEL” odsłania numer, „Ukryj PESEL” zakrywa go ponownie. Opis sekcji podpowiada, by odsłaniać go tylko wtedy, gdy nikt nie patrzy.
- **Adres i meldunek:** adres zameldowania i podsumowanie zmiany adresu: nazwa statusu („Urząd rozpatruje”), cztery odcinki etapów (3 z 4), termin urzędu słowami i przycisk „Sprawdź status”.
- Fikcyjny PESEL ma celowo błędną cyfrę kontrolną, więc nie może należeć do prawdziwej osoby.
- Oznaczenie „Dane fikcyjne” i zdanie, że prototyp niczego nie wysyła i nie łączy się z rejestrem.
- Ustawienia, dane dla asystenta AI i opis prototypu: sekcja „Profil (runda 28)”.

## Pismo

Dwie role, nie więcej:

- **Atkinson Hyperlegible Next** (400–800): cały tekst, tytuły kart, dane, daty, PESEL i cyfry (tabelaryczne). Przekreślone zero odróżnia 0 od O, co ma znaczenie przy PESEL-u i numerach.
- **IBM Plex Sans** (600–700): tylko główne nagłówki — tytuły ekranów, nagłówki sekcji, „Co chcesz załatwić?”, nazwa w profilu, tytuł otwartej koperty i znak „mObywatel”. Ma polskie znaki; nie występuje w danych ani w cyfrach.

Hierarchia: nagłówek sekcji Plex 700, 19 px · tytuł karty Atkinson 700, 17 px · opis 13–15 px, szary · status w pigułce 13 px, 700 · termin: data 17 px 700 i liczba dni w kolorze terminu, cyfry tabelaryczne. Porównanie całych ekranów obu krojów: `zrzuty/czcionki-atkinson-vs-plex.png`.

## Kolory i ikony

Kolor ma znaczenie, nie jest ozdobą; karty nie dostają osobnych kolorów.

| Kolor | Znaczy | Gdzie |
|---|---|---|
| czerwony | marka i najważniejsze działania | znak, „Nowa”, główne przyciski, „Zobacz, co zrobić”, górny pasek „Prototyp · dane fikcyjne · nic nie jest wysyłane” (`--accent`, biały tekst `--accent-ink`, kontrast 5,9:1) |
| bursztyn | termin, który się zbliża (do 14 dni) | pasek pod kartą OC, stempel „do”, „za 9 dni”, znacznik sekcji „Do załatwienia” |
| niebieski | dane tożsamości i status „urząd rozpatruje” | kafelki w Profilu, oznaczenia prototypu, karta źródła w asystencie. W Dokumentach niebieskie są tylko grafiki dokumentów (np. dowód) i ich kafelki na liście; elementy interfejsu mają tam neutralne tła (grafitowy portfel, szara notatka) i czerwony akcent (znacznik sekcji) |
| zielony | zaliczone kroki i potwierdzony postęp | odcinki paska kroków, sprawy zakończone, znacznik sekcji „W toku” |
| jasne szarości | tło i warstwa neutralna | tło, odległe terminy (ponad 14 dni nie są już niebieskie) |

Ikony: jeden zestaw liniowy, kreska 1,85 px niezależnie od rozmiaru, cztery rozmiary: 20 w tekście i przyciskach, 24 w kafelkach kart (także „W toku” na Starcie), 26 w dolnym pasku, 32 wyróżnione. Rysunek auta w karcie OC jest narysowany tą samą kreską. W dolnym pasku wybrana zakładka ma tło, kolor, pogrubiony podpis i lekko wypełnioną ikonę, więc widać ją bez animacji.

**Znak asystenta** (`assistant` w `src/icons.js`): dymek rozmowy ze strzałką w środku, czyli rozmowa, która prowadzi do załatwienia sprawy. Zastąpił ogólną „iskrę”, kojarzoną z gotowymi asystentami AI. Ta sama kreska i te same rozmiary co reszta zestawu; w dolnym pasku wybrana zakładka dostaje lekkie wypełnienie dymku jak inne ikony. Znak jest ozdobny (`aria-hidden`), nazwę niesie podpis „Asystent” lub nagłówek.

## Sygnatura: fala zabezpieczająca

Trzy splecione, cienkie fale, jak w druku zabezpieczającym dokumentów i we wnętrzu kopert bezpiecznych. Jeden detal, zawsze w kolorze znaczenia miejsca, w którym stoi:

- górna krawędź karty etapów na ekranie wejścia i karty Profilu (niebieska: tożsamość; zastąpiła różowy gradient w Profilu),
- górna krawędź strefy terminu najpilniejszej sprawy (bursztynowa: termin),
- linia nad „Wzór demonstracyjny” na kartach dokumentów (biała).

Łączy dokumenty i koperty. Godła nie powielam: zostaje jednym znakiem marki (ikona, pieczęć koperty), żeby prototyp nie wyglądał bardziej oficjalnie, niż jest.

## „Do załatwienia” i „W toku”

- **Karta sprawy w „W toku”:** Status (nazwa, krok i odcinki) i Termin (słowami, liczba dni jako pigułka w kolorze terminu, np. „Obecny dowód ważny do 15 grudnia [za 50 dni]”), a niżej osobne pole „Następny krok” z jedynym przyciskiem sprawy („Dokończ”, „Sprawdź status”). Podpisy pól są wersalikami jak „Polisa OC kończy się” na Starcie. Szczegóły sprawy pokazują na górze status i etap.
- **Otwarte sprawy w „Do załatwienia”** mają dopisany następny krok jednym zdaniem.

- **Do załatwienia:** rzeczy, z którymi przychodzi państwo. Są tu pismo z urzędu skarbowego („Odpowiedz”) i koniec OC („Sprawdź”). Harmonogram odpadów jest osobno, w części „Tylko do wiadomości” („Przeczytaj”).
- **W toku:** sprawy rozpoczęte przez użytkownika: wniosek o nowy dowód („Dokończ”, z dołączonym terminem ważności obecnego dowodu) i zmiana adresu („Sprawdź status”). Zakończone demonstracje są niżej, z przyciskiem „Zobacz podsumowanie”.
- **Koperty:** nowa, nieotwarta sprawa to zamknięta koperta z pieczęcią i stemplem z terminem. Na ekranie głównym są najwyżej 3 najpilniejsze. Po dotknięciu klapka unosi się na tej samej karcie, a potem ta karta przechodzi w okno sprawy (od razu z treścią) z czterema polami: czego dotyczy, do kiedy, dlaczego to ważne, najprostszy następny krok (jeden główny przycisk). Otwarta koperta staje się zwykłą pozycją na liście.
- **Wiadomości (koperta w górnym pasku):** koperta otwiera listę wiadomości pod nagłówkiem, tak jak inicjały otwierają podgląd profilu. Są w niej tylko fakty, które już są w prototypie, każdy ze swoją datą: pisma i termin z „Do załatwienia”, wysłane zgłoszenie zmiany adresu z „W toku” i odczyty danych z „Kto ma dostęp”; przypomnienie o terminie OC ma datę dnia pokazu. Najnowsze są na górze. Do trzech wiadomości widać wszystkie; przy większej liczbie (w danych pokazu 7) widać trzy najnowsze i „Zobacz wszystkie (7)”, który rozwija resztę na miejscu (nowe wiersze pojawiają się od 40% krycia, fokus przechodzi na pierwszą z nich, przycisk znika). Lista przewija się w środku panelu, a „Zobacz wszystkie” i „Przejdź do spraw do załatwienia” są zawsze widoczne na dole, także przy 320 px i większym tekście. Wiadomość otwiera to samo co na innych ekranach (kopertę, status sprawy, „Kto ma dostęp”). Escape i dotknięcie poza panelem zamykają go (dotknięcie nie uruchamia tego, co leży pod spodem).
- **Licznik** na kopercie w górnym pasku pokazuje nowe, nieotwarte wiadomości; w liście są oznaczone słowem „nowa”.
- **Podsumowanie przed zmianą:** zanim prototyp cokolwiek ustawi lub zmieni poza rozmową, pokazuje arkusz „Sprawdź, zanim potwierdzisz”: co się stanie (np. „Przypomnę środa, 4 listopada o sprawie…”, termin sprawy, „Nic nie zostanie wysłane”), stałą notkę „Prototyp: dane są fikcyjne i nic nie jest wysyłane”, przycisk potwierdzenia i „Anuluj”. Dotyczy przypomnień z koperty i „Zacznij od nowa” w Profilu. Po ustawieniu przypomnienia (w kopercie albo w rozmowie) przycisk „Przypomnij…” zastępuje zielony stan „Przypomnienie ustawione na poniedziałek, 2 listopada”, który niczego ponownie nie pyta. Escape i tło zamykają bez zmian, a fokus wraca na przycisk, który otworzył arkusz. W rozmowie „Przypomnij mi później” przy piśmie pokazuje tę samą treść w karcie podsumowania („Ustaw przypomnienie”, „Zmień wybór”, „Anuluj, nic nie rób”); przypomnienie przy OC asystent ustawia dopiero po pytaniu z datą („Tak, przypomnij 2 listopada” / „Nie trzeba”). Wysyłki w ścieżkach (portfel, pismo, OC, dostęp do danych, dowód) miały już własne podsumowania.
- **Bez duplikatów:** termin ważności dowodu jest częścią sprawy o nowy dowód. Rozmowa trwająca lub przerwana pokazuje się przy swojej sprawie („Wróć do rozmowy”, „Przerwana na kroku 2 z 4”), a nie jako osobna pozycja. Przypomnienie dopina się do tej samej sprawy.

## Uruchomienie

```bash
node build.mjs          # składa dist/index.html (jeden plik, bez zależności)
npx serve dist          # albo dowolny serwer plików; można też otworzyć dist/index.html wprost
```

Nie ma kroku instalacji. `build.mjs` używa wyłącznie biblioteki standardowej Node.js. `dist/index.html` nadaje się do GitHub Pages. `dist/artifact.html` to ta sama strona bez szkieletu dokumentu, do publikacji jako artefakt claude.ai.

**Główny podgląd:** prywatny artefakt https://claude.ai/artifact/Epc2D8fEYguPVdjYogQvnc (wersja 9) jest publikowany z `dist/artifact.html`. Zmiany z rund „data pokazu, karta źródła, znak asystenta, podsumowania” i „tylko jasny wygląd” są tylko w tym katalogu; podgląd nadal pokazuje wersję 9 (z ciemnym motywem przy ciemnym ustawieniu). Po każdej zmianie trzeba zbudować projekt i opublikować ten plik pod tym samym linkiem; sam `dist/index.html` nie zmienia podglądu.

**Data pokazu:** prototyp nie używa zegara urządzenia. Jedna stała `DEMO_TODAY` na początku `src/data.js` (teraz `2026-10-26`) ustala „dziś”. Z niej liczą się wszystkie terminy i każde „za … dni”: koperty na Starcie, szczegóły spraw, dokumenty, Profil, karta w odpowiedzi asystenta, przypomnienia, a także lata (PIT za poprzedni rok, numer polisy, harmonogram na kolejny rok). Przed pokazem zmień tę jedną datę i zbuduj projekt. Ustawiona data jest widoczna w Profilu (O prototypie) i w przewodniku obok telefonu.

Linki do scenariuszy: `#portfel`, `#pismo`, `#oc`, `#dane`, `#dowod`, `#dokumenty` (np. `dist/index.html#portfel`). Te linki pomijają ekran startowy i wybór osoby.

## Co można przeklikać

| Scenariusz | Przebieg |
|---|---|
| **Zgubiłem portfel** (pełna ścieżka) | Co było w portfelu → czy mógł zostać skradziony → wybór: zastrzeżenie PESEL („możesz cofnąć”) i/lub zgłoszenie utraty dowodu („nie da się cofnąć”) → lista rzeczy, których aplikacja nie zrobi (karty, bank, policja) → podsumowanie z pozycjami „co się stanie / czego nie zrobię” → przy kroku nieodwracalnym obowiązkowe „Rozumiem” → Potwierdź → ekran „Gotowe (w demonstracji)” |
| **Pismo z urzędu** | Pismo „po ludzku” (kto, czego chce, do kiedy, co jeśli nic nie zrobisz, czego to nie oznacza), słowniczek trudnych słów, odpowiedź z załącznikiem do edycji, podsumowanie, koniec |
| **Kończy się OC** | Skutki w praktyce (automatyczne przedłużenie, kara za przerwę) → zostaję / zmieniam ubezpieczyciela / sprzedałem auto → wypowiedzenie z podsumowaniem i „Rozumiem” |
| **Kto ma dostęp do moich danych** | Lista dostępów z celem i datą ostatniego odczytu → cofnięcie z wyjaśnieniem, czego to nie zmieni |
| **Dokończ rozpoczętą sprawę** | Wniosek o nowy dowód zaczęty wcześniej: dane z rejestru, zdjęcie (plik zostaje w przeglądarce), urząd i termin wizyty. Prototyp mówi wprost, że po dowód trzeba pójść osobiście (odciski palców) |
| **Głos** | Prawdziwe rozpoznawanie mowy (Web Speech API, pl-PL) tam, gdzie przeglądarka je udostępnia. Wszędzie indziej jawnie oznaczona symulacja z przykładowymi wypowiedziami. Przed wysłaniem zawsze „Zrozumiałem: …” do sprawdzenia |

Asystent nie zgaduje: gdy tekst pasuje do kilku spraw, pyta „O którą sprawę chodzi?”. Gdy nie rozumie, mówi to wprost. Gdy sprawa nie jest w prototypie (np. 800+), mówi, że jej jeszcze nie pokazuje. Przerwana rozmowa trafia do „Twoich spraw” z informacją, na którym kroku się zatrzymała.

## Dokumenty na okręgu

Karty leżą na okręgu o promieniu R, którego środek jest pod wybraną kartą: `x = R·sin(o·α)`, `y = R·(1 − cos(o·α))`, obrót styczny do okręgu, ale mocno spłaszczony (30% na telefonie, 50% na komputerze), a sąsiednie karty są przyciemnione najwyżej o 10%: karty leżą na łagodnym łuku, a nie jak rozłożona talia.

**Wygląd kart dokumentów:** kolor rodzaju dokumentu zostaje (dowód niebieski, prawo jazdy malinowe, pojazd bursztynowy, KDR fioletowa, paszport bordowy, EKUZ morski), ale gradient jest spokojniejszy (górny kolor przesunięty o ok. 30% w stronę dolnego), zamiast trzech błyszczących kręgów jest jeden słaby łuk w rogu, a cień jest niski i miękki, w kolorze tekstu (`--ink`), zamiast ciężkiego granatowego. Ramka wybranej karty w karuzeli ma 2 px (wcześniej 3 px). Etykiety i wartości na karcie mają krycie 92% (wcześniej 85–88%). Statusy („Ważny jeszcze 50 dni”, „OC: 9 dni”, „ważny”, „podgląd”) się nie zmieniły. Miniatura w wierszu listy ma ten sam gradient co karta, bo to ona rośnie w kartę przy otwarciu.

- Obsługa: przeciąganie palcem i myszą, kółko i gładzik, strzałki, Home/End, Enter, przyciski poprzedni/następny, „Otwórz: [nazwa]”. Bez gestów działa zwykła lista „Wszystkie dokumenty” pod karuzelą (jedna lista, bez osobnego trybu).
- Wybrany dokument: ramka, nazwa i licznik „2 z 6” pod kartą, kropki postępu, komunikat dla czytnika ekranu.
- Dół karty to stopka „Wzór demonstracyjny” (linia i podpis pod danymi), która nie zasłania nazwy ani danych; czytnik ekranu też słyszy „wzór demonstracyjny”.
- Pokazuje tylko tylu sąsiadów, ilu mieści się w całości (na telefonie po jednym z każdej strony). Napis na prawej karcie płynnie przesuwa się w jej widoczną część, żeby nazwa nie chowała się pod wybraną kartą.
- Ruch zawsze kończy się na jednej karcie. Szybkie machnięcie przesuwa o jedną kartę (albo o tyle, ile palec naprawdę przeciągnął), licząc od karty, do której karuzela już jedzie: trzy szybkie machnięcia to trzy karty, także przy 320 px. Przeciągnięcie idzie za palcem.
- Dojazd do karty działa jak tłumiona sprężyna: przejmuje prędkość puszczonego palca, łagodnie wyhamowuje i osiada o kilka pikseli. Im bliżej celu karta jest w chwili puszczenia, tym mniej prędkości sprężyna przejmuje, a gdy palec przeciągnął kartę już za środek, nie dokłada odbicia. Pomiar na bieżącym kodzie: 2–3 px po przycisku; po machnięciu 4 px przy 390, 5 px przy 360, a przy 320 px tylko 1 px ponad to, o ile palec sam przeciągnął kartę za środek; ruch kończy się przed 500 ms. Sąsiednie karty nie znikają i nic nie obraca się samo.
- Przy ograniczeniu animacji w systemie (albo w ustawieniach prototypu) karta zmienia się od razu, z krótkim rozjaśnieniem.

## Szczegóły dokumentu: karuzela

Ekran szczegółów pokazuje jeden dokument, ale nad opisem jest karuzela wszystkich sześciu (w kolejności listy „Wszystkie dokumenty”), więc między dokumentami przechodzi się bez wracania do listy.

- **Co się zmienia razem z kartą:** tytuł ekranu, licznik „N z 6”, kropki, opis (notatka), „Co możesz zrobić”, „Dane z dokumentu” (pełne numery znów ukryte) i ważność dla czytnika ekranu. Grafika karty pokazuje nazwę, ważność i status.
- **Obsługa:** strzałki pod kartą, gest poziomy palcem, rysikiem lub myszą, gładzik w poziomie, dotknięcie wystającej karty sąsiada, klawiatura na karcie (strzałki w lewo i w prawo, Home, End). Gest pionowy na karcie przewija stronę; powiększanie dwoma palcami działa.
- **Jeden dokument na gest:** po puszczeniu karta jedzie do najbliższej, najwyżej o jedną od tej, od której gest się zaczął; szybkie machnięcie krótsze niż pół karty i tak przechodzi dalej, wolne krótkie przesunięcie wraca. Gest obsługuje `app.js`, bo natywne przyciąganie Chromium przy ograniczonym ruchu przeskakiwało po machnięciu o dwa dokumenty.
- **Brzegi:** na pierwszym dokumencie strzałka „wstecz” jest wyłączona, na ostatnim „dalej” (`aria-disabled`, przycisk zostaje w kolejności fokusu, więc fokus nie ginie). Nic nie zawija się z ostatniego na pierwszy.
- **Sąsiednie karty** wystają po bokach, są o 10% mniejsze i ciemniejsze, a ich napisy gasną (widać kolor karty, bez uciętych słów); karta, która wjeżdża na środek, płynnie nabiera treści.
- **Wybór zostaje:** trasa pamięta oglądany dokument; karuzela zakładki Dokumenty staje na nim, a „Wróć” prowadzi karta do jego miejsca.

| Element | Co otwiera |
|---|---|
| Start: karta w portfelu (z wierzchu lub wystająca z tyłu) | ten dokument, który dotknięto |
| Start: napis i „Otwórz dokument” w portfelu, Enter na portfelu | dokument z wierzchu (dowód), tak jak mówi etykieta przycisku |
| Start: „Wszystkie (6)” | zakładkę Dokumenty (celowo: przegląd wszystkich) |
| Dokumenty: karta na środku karuzeli, Enter na karuzeli, „Otwórz: [nazwa]” | ten dokument |
| Dokumenty: karta z boku karuzeli | pierwsze dotknięcie obraca ją na środek, drugie otwiera |
| Dokumenty: wiersz listy | ten dokument |
| Asystent: „Otwórz dokument” w karcie źródła | ten dokument |

**Powrót („Wróć”):** poprzedni ekran ma to samo przewinięcie, a karta leci do miejsca dokumentu oglądanego na końcu: wiersza listy, karty karuzeli (która już na nim stoi) albo portfela; fokus trafia na ten wiersz, kartę albo portfel. Gdy po drodze wybrano dokument, którego wiersz leży całkiem poza ekranem, lista przesuwa się tylko o tyle, żeby go było widać (fokus nigdy nie trafia w niewidoczny element). Gdy poprzedni ekran nie pokazuje dokumentu (portfel ma trzy karty, karta asystenta jeden dokument), nic nie leci do cudzego miejsca: ekran wraca zwykłym wsunięciem.

**Systemowy „wstecz”** (gest albo przycisk na Androidzie, przycisk przeglądarki) działa jak „Wróć” i Escape: zamyka potwierdzenie, panel wiadomości, okno sprawy albo arkusz głosowy, a na ekranie szczegółów wraca o ekran (z tym samym przewinięciem i fokusem). Dopóki w aplikacji jest dokąd wrócić, nad bieżącym wpisem historii leży jeden wpis „wstecz” (History API); na ekranie głównym zakładki bez otwartych okien go nie ma, więc „wstecz” jednym naciśnięciem opuszcza prototyp, także po „Wróć” w aplikacji albo po zmianie zakładki. Podgląd profilu (otwierany też najechaniem myszą) wpisu nie dostaje. Gdy History API jest niedostępne (np. ramka z ograniczeniami), zostaje dawne zachowanie. Odświeżenie strony nadal wraca na Start.

## Ruch w interfejsie

Ruch pokazuje tylko, co się zmieniło, gdzie jesteś i co możesz zrobić. Nic nie jest zapętlone na stałe. Pulsujący mikrofon i kółko wczytywania czcionek ruszają się tylko, dopóki trwa to, na co czekasz.

| Gdzie | Ruch | Czas |
|---|---|---|
| Wciśnięcie przycisku, chipu, koperty, karty, zakładki dolnej | lekkie zmniejszenie (97–98,5%), ciemniejsza ramka albo przyciemnienie, płytszy cień | 120 ms wciśnięcie, 160 ms powrót |
| Koniec animacji startowej | znak i napis lecą do logo w nagłówku ekranu wejścia, tło znika, treść pojawia się za znakiem | 360 ms |
| Scena na ekranie wejścia | karta dokumentu i karteczka terminu raz wysuwają się z koperty | 560 ms (druga 90 ms później) |
| Podgląd profilu (TK) i lista wiadomości (koperta) | karta rozwija się w dół spod przycisku w nagłówku; widoczna część jest od razu nieprzezroczysta, więc nic nie prześwituje przez treść pod spodem | 200 ms |
| „Zobacz wszystkie (N)” w wiadomościach | pozostałe wiadomości pojawiają się pod trzema pierwszymi: wjazd 6 px od 40% krycia, co 40 ms kolejna | 180 ms |
| Pełny profil z podglądu i „Wróć” | wspólny element: karta podglądu przechodzi w kartę profilu; powrót zwija ją do inicjałów | 260 ms |
| Dotknięcie terminu najpilniejszej sprawy | karta rozwija szczegóły (pełna data, co oznacza termin, przypomnienie), wskazówka zegara robi jeden obrót, strzałka się odwraca | 200 ms szczegóły, 420 ms wskazówka |
| Wybrana zakładka dolnego paska | jeden wskaźnik przesuwa się pod wybraną ikonę (ten sam element, bez odbicia); ikona dostaje lekkie wypełnienie od razu | 260 ms |
| Pasek kroków w rozmowie | nowo zaliczony odcinek wypełnia się od lewej, tylko gdy krok naprawdę się zmienia | 220 ms |
| Nowe koperty na Starcie | wjazd 10 px z góry, raz na wejście do aplikacji (nie przy każdym powrocie na Start) | 260 ms, co 70 ms kolejna |
| Otwarcie nowej koperty | klapka unosi się i pieczęć znika na dotkniętej karcie, potem ta karta przechodzi w okno sprawy jako wspólny element (okno od początku ma treść, bez pustej planszy); zamknięcie wraca do tego samego slajdu na Starcie, już jako otwarta karta | 140 ms + 260 ms; całość ok. 400 ms |
| Otwarcie sprawy z listy, karty asystenta, kafelka „W toku” lub profilu | wspólny element: dotknięta karta przechodzi w okno sprawy (okno nieprzezroczyste od pierwszej klatki, rośnie z miejsca karty z zachowaniem proporcji); tło łagodnie się przyciemnia | 260 ms |
| Zamknięcie okna sprawy | odwrotnie: okno maleje do swojej karty na liście jako kontener; jego treść gaśnie na początku lotu, treść karty pojawia się dopiero, gdy kontener ma jej kształt (bez przenikania miniatury); lista zostaje w tym samym miejscu, fokus wraca na tę kartę | 260 ms |
| Wejście w dokument z karuzeli lub listy Dokumentów | wspólny element: z karuzeli rośnie naciśnięta karta, z listy miniatura karty w wierszu (nie cały wiersz), bez białego kontenera: duża karta pojawia się nad małą w 50 ms, więc kolor nie blednie. Strona szczegółów stoi w miejscu od pierwszej klatki (tytuł, opis i przyciski od razu na swoich miejscach), a karta jest jedynym ruchem i ląduje w swoim miejscu pod tytułem. W nagłówku zmienia się tylko lewa część (znak → „Wróć”), „Aa” i koperta stoją | 260 ms |
| Wejście w szczegóły z portfela na Starcie | dotknięta karta portfela (z wierzchu albo z tyłu) wysuwa się z kieszeni i rośnie w kartę na ekranie szczegółów, tak samo jak karta z karuzeli (bez białego kontenera) | 260 ms |
| Wejście w szczegóły z karty asystenta | wspólny element: karta przechodzi w kartę dokumentu na ekranie szczegółów; reszta ekranu wsuwa się 16 px z prawej (nowy ekran nieprzezroczysty, kładzie się na starym) | 260 ms / 200 ms |
| Zmiana dokumentu w szczegółach | pasek kart jedzie do następnej karty (przewijanie przeglądarki), sąsiednie karty maleją, ciemnieją i gasną płynnie razem z przesunięciem; przy ograniczonym ruchu karta zmienia się od razu, z krótkim rozjaśnieniem | płynne przewijanie przeglądarki: zmierzone 236–281 ms (Chromium) |
| Powrót „Wróć” do Dokumentów | odwrotnie: karta oglądanego na końcu dokumentu maleje do jego karty w karuzeli albo do miniatury w jego wierszu i jest nieprzezroczysta przez cały lot; miejsce docelowe pojawia się dopiero, gdy karta ma już jego rozmiar. Karuzela stoi na tym dokumencie, lista w tym samym miejscu, fokus wraca na tę kartę lub wiersz. Bez View Transition API leci kopia samej karty (bez białego kontenera), z tą samą kolejnością; wejście bez tego API to kopia karty rosnąca nad ekranem (pasek karuzeli przycina to, co z niego wystaje) | 260 ms (bez View Transition API 300 ms) |
| Powrót „Wróć” do portfela | do karty z wierzchu karta leci wprost; do karty z tyłu leci w cały wachlarz kart (warstwa przejścia leży nad wszystkim, więc lot do samej karty kończyłby się nad dowodem); dokument, którego nie ma w portfelu: zwykłe wsunięcie ekranu, bez lotu | 260 ms / 200 ms |
| Powrót „Wróć” z innych szczegółów | karta maleje do swojego miejsca jako kontener (jak przy zamknięciu okna), przewinięcie zachowane, fokus wraca na to miejsce; reszta ekranu z lewej | 260 ms / 200 ms |
| Szczegóły bez karty startowej | widok wsuwa się 20 px z kierunku (głębiej z prawej, powrót z lewej), czytelny od pierwszej klatki | 200 ms |
| Zmiana zakładki w dolnym pasku | stary widok znika od razu (dwa ekrany nigdy nie są widoczne naraz), nowy wsuwa się o 20 px z kierunku zakładki i od pierwszej klatki jest czytelny (krycie od 70%) | 200 ms |
| Zakładki „Do załatwienia” / „W toku” i „Po ludzku” / „Oryginał” | wskaźnik przesuwa się pod wybraną zakładkę, treść pojawia się z 4 px | 220 ms wskaźnik, 180 ms treść |
| Nowa wiadomość w rozmowie | wjazd 6 px; odpowiedź startuje od 40% krycia, więc tekst jest czytelny od razu; kilka dymków jednej odpowiedzi co 60 ms | 180 ms |
| Karuzela dokumentów | sprężyna z jednym małym osiadaniem (ok. 3% kroku po przycisku, najwyżej ok. 5% po machnięciu). Nic nie ginie: kolejne strzałki, przyciski i machnięcia liczą się od celu, do którego karuzela już jedzie; każdy skok kółka myszy to krok, gest gładzika to jeden krok (nowy po 160 ms ciszy); ruch palca rysowany raz na klatkę, prędkość machnięcia z ostatnich 100 ms; gest pionowy przewija stronę | ok. 380 ms |
| Rozmowa: wynik podsumowania | po „Potwierdź” albo „Anuluj” wynik zostaje na karcie („Potwierdzone. W demonstracji nic nie zostało wysłane.”), znacznik rysuje się raz | 280 ms |
| Rozmowa: stany | dymek z ikoną w kółku i krótkim tekstem: zrobione (zielony znacznik, „Ustawione…”, „Sprawę zapisałem…”), błąd (czerwone ostrzeżenie, „Nie udało mi się…”, „Zewnętrzny model nie odpowiedział…”), anulowane (szary krzyżyk, „Anulowane…”); oczekiwanie: kropki i opis, na co czekamy, po 300 ms | 280 ms znacznik |
| Komunikat na dole ekranu | wchodzi 8 px z dołu, znika przez wygaszenie; potwierdzenie ma znacznik zamiast ikony informacji | 180 ms / 160 ms |

- Każda zakładka pamięta przewinięcie (Sprawy także wybór „W toku”), więc po powrocie jesteś w tym samym miejscu. Ponowne dotknięcie aktywnej zakładki przewija ją na początek. Zamknięcie koperty nie przewija Startu na górę.
- Prototyp nie pobiera danych z sieci, więc nie ma szkieletów ładowania. Prawdziwe czekanie to wczytywanie czcionek na ekranie startowym oraz (tylko w trybie AI z serwerem prototypu) pytanie wysłane do modelu: wtedy po 300 ms pojawia się „Spinka pyta model AI…”.
- Przejścia wspólnego elementu robi View Transition API (Chrome, Edge, Safari 18+); w przeglądarce bez niego ten sam efekt daje ruch FLIP w JavaScripcie. Przejście jest przejściem przez kontener: nieprzezroczysta biała karta z cieniem zmienia miejsce i kształt, a stara i nowa treść pojawiają się w niej po kolei (najpierw gaśnie jedna, potem pojawia się druga), więc tekst dwóch stanów nigdy nie leży na sobie i spod kontenera nic nie prześwituje. Bez View Transition API powrót i zamknięcie robi lecący kontener (kopia karty w białej karcie), który ląduje na widocznej części celu; cel jest ukryty tylko na czas lotu, więc nie ma klatki z pustym miejscem, do którego nic nie leci. Gdy dotknięta karta jest częściowo schowana w przewijanej liście lub rozmowie (np. przy 320 px karta źródła w asystencie jest wyższa niż widok rozmowy), ruch idzie od jej widocznej części i do niej wraca (FLIP zamiast View Transition, które zawsze bierze pełny prostokąt), więc okno nie przechodzi przez nagłówek ani pole wpisywania. Przy wejściu w szczegóły i powrocie pasek prototypu, nagłówek i dolna nawigacja mają w przejściu własne warstwy, więc nie jadą razem z ekranem; przy oknie sprawy zostają w tle, które tylko się przyciemnia (osobna warstwa nagłówka leżałaby nad oknem, a przy 320 px okno zachodzi na nagłówek). Wzorce sprawdzone w katalogu PanelUI (React Native, tylko jako katalog, bez instalacji): jeden przesuwany wskaźnik zakładek, karuzela z poprzedni/następny/kropkami, brak przesuwania zakładek gestem tam, gdzie jest karuzela.
- Przy ograniczeniu ruchu (system albo przełącznik w prototypie) znikają przesunięcia, skalowanie i przejścia wspólnego elementu (zmiana jest natychmiastowa); przejścia CSS mają wtedy 0 s, a nie 0,01 ms, żeby zmiany nie spóźniały się o klatkę. Wciśnięcie widać po kolorze i ramce, wskaźnik zakładki przeskakuje od razu, a wybrany element pozostaje wyraźnie zaznaczony.
- Na iOS stan wciśnięcia działa przy dotyku, a nie tylko po najechaniu myszą. Wygląd po najechaniu działa tylko na urządzeniach z myszą (`@media (hover: hover) and (pointer: fine)`), więc na telefonie przycisk po stuknięciu wraca do zwykłego wyglądu.
- Tło ma nieruchome, ledwie widoczne światło u góry ekranu (ciepłe po prawej, chłodne po lewej), a pod treścią pozostaje jednolite.
- Zrzuty przed i po, klatki każdej ścieżki i krótkie zapisy ekranu (`pulpit-ruch.mp4`, `przejscie-start-dokumenty-sprawy.mp4`, `splash-do-wejscia.mp4`, `podglad-profilu-tk.mp4`) są w `zrzuty/`.

## Tylko jasny wygląd

Prototyp ma jeden, jasny wygląd na wszystkich ekranach. Nie zależy od ustawienia systemu ani przeglądarki, od atrybutu `data-theme`, który może ustawić podgląd artefaktu, ani od żadnej zapisanej preferencji; przełącznika motywu nie ma. `src/styles.css` deklaruje `color-scheme: only light`, a `src/page.html` to samo w `<meta name="color-scheme">`. Dzięki temu jasne zostają też pola tekstowe, paski przewijania i inne kontrolki przeglądarki, a Chrome na Androidzie z „przyciemnianiem stron” nie przyciemnia prototypu. Sprawdzone porównaniem zrzutów piksel po pikselu przy jasnym i ciemnym ustawieniu systemu: 16 widoków, 320/360/390 px, zwykły i większy tekst, z animacjami i bez — 0 różnic.

## Dostępność

- Audyt axe-core: 0 naruszeń na 27 ekranach, przy jasnym i ciemnym ustawieniu systemu (54 sprawdzenia; w obu prototyp jest jasny) (karta źródła w odpowiedzi „Mam długi?”, podsumowanie przed ustawieniem przypomnienia, ekran startowy, wejście demonstracyjne, podgląd profilu, pełny profil otwarty z podglądu, lista wiadomości i lista rozwinięta, opis logowania, wybór osoby, start z kopertami, otwarta koperta, „Do załatwienia”, „W toku”, status sprawy, dokumenty, szczegóły dokumentu, rozmowa z podsumowaniem, koniec, więcej, dostęp do danych, pismo, głos i inne).
- Cała ścieżka „Zgubiłem portfel” i obie karuzele działają z samej klawiatury. Fokus trafia na każde nowe pytanie. W karuzeli szczegółów: Tab prowadzi z karty na strzałkę „wstecz” i „dalej”; strzałki mówią, dokąd prowadzą („Następny dokument: Toyota Yaris”), a po zatrzymaniu czytnik słyszy „Toyota Yaris, 3 z 6”.
- Cele dotyku co najmniej 44 px (sprawdzane automatycznie przy 390, 360 i 320 px, także z większym tekstem), tekst i dane w Atkinson Hyperlegible Next (projektowanej dla osób słabowidzących), przełącznik „Większy tekst” w górnym pasku, czytanie pisma na głos. Tryb wysokiego kontrastu systemu (Windows, forced colors) nie jest wyłączony: przeglądarka podmienia kolory na systemowe.
- Pełne numery dokumentów są domyślnie ukryte („Pokaż pełne dane”).
- Okna modalne (okno sprawy, „Sprawdź, zanim potwierdzisz”, arkusz głosowy) wyłączają resztę strony (`inert`), także przewodnik obok telefonu przy 1280 px: Tab i czytnik zostają w oknie, Escape zamyka i oddaje fokus na przycisk, który okno otworzył.
- Ekrany wejścia i wyboru osoby są głównym obszarem strony (`role="main"`), gdy aplikacja pod nimi jest wyłączona; zawsze dokładnie jeden obszar główny. Karuzela Dokumentów ma rolę grupy z nazwą wybranego dokumentu („Wybrany dokument: Prawo jazdy, 2 z 6”). Identyfikatory na stronie są jedyne (ekran „O prototypie” kopiuje treść przewodnika bez jego `id`).
- Tryb wysokiego kontrastu (wymuszone kolory): karty dokumentów mają obrys, wybrana karta dodatkowy obrys w kolorze zaznaczenia, kropki karuzel kolory systemowe.
- Długie ciągi bez spacji (link, e-mail, numer konta, sygnatura) zawijają się w dymkach rozmowy i w arkuszu głosowym; rozmowa nigdy nie przewija się w bok. Poniżej 360 px szerokości przyciski górnego paska mają 44 px, więc imię w powitaniu mieści się także z większym tekstem.
- Pole pliku w scenariuszach sprawdza typ (z rozszerzeniem jako zapasem, gdy telefon nie podaje typu): do dowodu tylko zdjęcie (JPG, PNG, HEIC…), do odpowiedzi na pismo zdjęcie albo PDF. Inny plik daje komunikat (`role="alert"`) i krok czeka na właściwy plik; komunikat i podgląd przewijają się do widoku.

## Struktura

```
src/page.html     szkielet: telefon, ekran startowy, wybór osoby, okno koperty, arkusz głosowy, przewodnik
src/styles.css    tokeny kolorów (tylko jasne), układ, komponenty
src/data.js       data pokazu (DEMO_TODAY), fikcyjne dane, pozycje „Do załatwienia” i sprawy „W toku”; wszystkie daty liczone od daty pokazu
src/marka.js      nazwa asystenta (formy odmiany), hasło i przełącznik znaku: jedyne miejsce do zmiany nazwy
src/icons.js      ikony liniowe, znak asystenta (A.postac) i wstawianie godła (symbole: całe godło, orzeł, korona)
src/assets/godlo-zrodlo.svg  plik źródłowy godła (patrz „Źródło godła”)
nagrania/         film i klatki animacji startowej, odpowiedź asystenta na „Mam długi?”
zrzuty/           ruch w interfejsie: przed i po, klatki ścieżek (także przy ograniczonym ruchu)
zrzuty/tylko-jasny/  przejście ścieżek przy ciemnym ustawieniu systemu (prototyp zostaje jasny) i podgląd profilu na niskim ekranie
zrzuty/data-pokazu/  przejście ścieżek przy 390/360/320 px (też przy ograniczonym ruchu) i karta „Mam długi?”
zrzuty/audyt-animacji/  przejścia rundy animacji: paski klatek i nagrania mp4 (390/320/1280 px, bez View Transition, ograniczony ruch)
zrzuty/runda-22/  profil, wiadomości i Dokumenty przed/po; paski klatek i nagrania mp4 profilu, wiadomości, dokumentu i koperty (390/320/1280 px, bez View Transition, ograniczony ruch)
zrzuty/runda-23/  Dokumenty przed/po (320/390/1280 px, duży tekst) i paski klatek otwarcia i powrotu z karuzeli i z listy (z View Transition i bez, ograniczony ruch) oraz nagrania mp4
zrzuty/runda-24/  wejścia do dokumentów (portfel, karuzela, lista) przed/po, karuzela w szczegółach przy 320/390/1280 px, przełączanie dokumentów, brzegi, powrót i paski klatek
zrzuty/runda-25/  poprawki z audytu przed/po (systemowy „wstecz”, arkusz głosowy, długie ciągi, przypomnienie, plik, powitanie 320, wymuszone kolory)
zrzuty/runda-26/  poprzednia postać „Pola” przed/po (arkusz stanów 34/44/58 px), Pola w interfejsie (390, 320 z większym tekstem, 1280, wymuszone kolory), tryb AI na atrapie Gemini (informacja, raty, dopytanie, przełącznik, limit 429, brak klucza)
zrzuty/runda-27/  Spinka: znak i nazwa przed/po (stany, kontekst asystenta, hasło), najważniejsze ekrany przed/po
src/carousel.js   karuzela po okręgu
src/assistant.js  rozmowa: model AI przez serwer albo jasny stan „niepodłączony”, zgoda, karty danych, scenariusze, podsumowania
src/wariant-postaci.js  postać Spinki zamiast znaku, tylko w dist/wariant-postaci.html (node build.mjs --wariant-postaci)
src/app.js        ekrany, nawigacja, koperty, ekran startowy, głos, ustawienia
server/rdzen.mjs           rdzeń asystenta: instrukcja dla modelu, schemat, sprawdzenie odpowiedzi, wywołanie Workers AI i Gemini, limity
server/kontekst.mjs        kontekst dla modelu z rekordów serwera i sprawdzonego stanu demonstracji (wklejany też do aplikacji)
server/dane-demo.mjs       fikcyjne rekordy dla modelu, generowane przez build.mjs z src/data.js (nie edytuj ręcznie)
server/serwer-lokalny.mjs  lokalny serwer projektu z modelem AI (Workers AI przez REST albo Gemini); gemini-adapter.mjs: zgodność
server/funkcja-serwerowa.mjs, server/wrangler.toml.example  funkcja serwerowa Cloudflare (Workers AI, limit zapytań) dla strony statycznej
.env.example               wzór ustawień serwera bez sekretu (kopiuj do .env, który jest w .gitignore)
.gitignore                 ignoruje .env i pliki lokalne
build.mjs         składa wszystko w dist/index.html i dist/artifact.html
testy/runda-29/   testy rundy 29: godło (godlo-test.js), serwer z atrapą (serwer-test.mjs), asystent z atrapą Workers AI (asystent-workers-test.js), test na prawdziwym modelu (prawdziwy-model-test.mjs, wymaga konta); atrapa: atrapa-modelu.mjs
testy/runda-28/   testy rundy 28: rdzeń asystenta (rdzen-test.mjs), asystent bez serwera i z atrapą Gemini, Profil (asystent-profil-test.js), znak (znak-test.js); atrapa: atrapa-gemini.mjs
testy/runda-27/   testy rundy 27; regresja poprawek rundy 25 przechodzi na buildzie rundy 28, testy trybu AI i znaku zakładają odpowiedzi z reguł (usunięte w rundzie 28)
testy/runda-26/   testy buildu rundy 26 (b54aa1f8, „Pola”); na bieżącym buildzie sprawdzenia postaci nie przejdą, bo szukają „Poli”
testy/logi/       logi pełnych regresji rund 25–27
docs/             raporty rund 26 i 27, wstępne rozeznanie nazw (nazwy-asystenta/, nazwa-spinka.md)
docs/znak-spinki/ znak Spinki w SVG (5 stanów i wariant bez odznaki, wyeksportowane z A.postac), geometria, kolory i ruch
zrzuty/runda-27/sciezki/  klatki ścieżek Start → koperta OC → Spinka → przypomnienie oraz przypomnienia prosto z koperty
```
