# Przeniesienie projektu: runda 27 (build 83d237e0, z poprawką animacji godła)

Rozpakuj do **nowego, pustego katalogu**. Nie nadpisuj rundy 26 (`b54aa1f8…`) ani lokalnej wersji v10: to osobne wersje.

## Wersja

| Plik | MD5 | SHA-256 |
|---|---|---|
| `dist/index.html` | `83d237e0c6d0e28ec90a01296f5ca5c8` | `c2226372986e086d1c46bfd3bbd19995c28540a9e04a7234ef165d0e2217d673` |
| `dist/artifact.html` | `baeaf5d9a6f600b2d2cfcfc814172b4e` | `554c8c693bf478cdbff9b7b4e5dc3223be6cc4238e2f14de755fd685dcd6d7ec` |

Zmiana względem buildu `61c29122…` (runda 27): tylko animacja wejścia. Przy przesunięciu ikony w lewo czerwony kwadrat
jest tłem samego znaku, a godło jest przycięte do kwadratu (`asIcon` w `src/app.js`), więc orzeł nie wystaje już na chwilę
poza ramkę. Treść, scenariusze i pozostałe ekrany bez zmian; pakiet `testy/runda-27/` przechodzi w całości.

`node build.mjs` uruchomiony na źródłach z tej paczki daje bajt w bajt te same pliki (sprawdzone po rozpakowaniu w czystym katalogu).
Sumy SHA-256 wszystkich plików są w `SHA256SUMS.txt`. Asystent nazywa się „Spinka” („Zapytaj Spinkę”); nazwa nie jest zatwierdzona prawnie.

## Znak Spinki

- **Gotowe pliki:** `docs/znak-spinki/` (5 stanów i wariant bez odznaki, SVG; podgląd; geometria, kolory i ruch w `README.md`).
  Pliki są wyeksportowane z kodu i piksel w piksel zgodne ze znakiem w aplikacji.
- **Źródło kształtu:** `src/icons.js` (`A.postac`) i `src/styles.css` (reguły `.postac*`). `src/marka.js` ma tylko nazwę, formy odmiany,
  hasło i przełącznik znaku, bez kształtu.

## Zawartość

| Ścieżka | Co to jest |
|---|---|
| `src/`, `build.mjs` | źródła i skrypt budujący (`dist/index.html` samodzielny, `dist/artifact.html` bez szkieletu strony) |
| `dist/` | zbudowany prototyp |
| `server/gemini-adapter.mjs` | serwer prototypu z opcjonalnym trybem AI (Gemini); bez zależności |
| `.env.example`, `.gitignore` | wzór ustawień bez sekretu; `.env` jest ignorowany przez Git |
| `README.md` | pełny opis projektu |
| `docs/raport-runda-27.md`, `docs/raport-runda-26.md` | raporty rund |
| `docs/znak-spinki/` | znak w SVG i jego opis |
| `docs/nazwa-spinka.md`, `docs/nazwy-asystenta/` | wstępne rozeznanie nazw (bez rejestrów; to nie jest opinia prawna) |
| `testy/runda-27/` | testy bieżącego buildu, `uruchom-testy.sh` |
| `testy/runda-26/` | testy buildu rundy 26 („Pola”); test postaci nie przejdzie na tym buildzie |
| `testy/logi/` | logi pełnych regresji rund 25–27 i pakietu rundy 27 |
| `zrzuty/runda-25/`, `runda-26/`, `runda-27/` | materiały rund; w `runda-27/sciezki/` sprawdzone klatki ścieżek do filmu (niżej) |

**Poza paczką:** `.env` i jakiekolwiek klucze (w projekcie nie ma pliku `.env`), `node_modules`, katalogi robocze, media wcześniejszych rund.
Pliki `testy/runda-2*/mock-gemini2.mjs` i testy trybu AI zawierają celowo fałszywy klucz dla atrapy API (zaczyna się od „test-klucz-”).
To nie jest klucz Google.

## Sprawdzenie sum

- Linux: `sha256sum -c SHA256SUMS.txt`
- macOS: `shasum -a 256 -c SHA256SUMS.txt`
- Windows (PowerShell), pojedynczy plik: `Get-FileHash -Algorithm SHA256 dist\index.html`

## Odtworzenie buildu

```bash
cp -r dist dist-z-paczki        # zachowaj przekazany build do porównania
node build.mjs                  # Node.js 18+; nadpisuje dist/
cmp dist/index.html dist-z-paczki/index.html && cmp dist/artifact.html dist-z-paczki/artifact.html && echo zgodne
```

Windows (PowerShell): `node build.mjs`, potem `(Get-FileHash dist\index.html -Algorithm MD5).Hash` powinno dać `61C2912275BE841D8BC7C7D7A0767F7F`.

## Uruchomienie

**Wersja statyczna (tylko reguły, nic nie wysyła poza czcionkami Google Fonts):**

```bash
cd dist && python3 -m http.server 8200 --bind 127.0.0.1    # http://127.0.0.1:8200/
```

Można też otworzyć `dist/index.html` bezpośrednio w przeglądarce.

**Serwer prototypu z trybem AI (Node.js 20.12+):** `node server/gemini-adapter.mjs` (http://127.0.0.1:8080/). Bez klucza działa
w trybie regułowym. Klucz tylko w `.env` po stronie serwera; szczegóły w `README.md`, sekcja „Tryb AI”. Połączenia z prawdziwym
modelem nie sprawdzono (brak klucza w środowisku pracy).

## Do filmu: ekrany i ścieżki

**Strona z przewijanym przewodnikiem:** okno co najmniej **980 × 600 px** (np. 1280 × 800 albo 1920 × 1080). Po lewej telefon
z aplikacją, po prawej przewodnik „Zacznij od pytania «Co chcesz załatwić?»”, który przewija się niezależnie od telefonu, z listą
„Przeklikaj” (każda pozycja uruchamia scenariusz w telefonie). Od 600 do 979 px widać sam telefon w ramce, poniżej 600 px
aplikację na całą szerokość. Na wejściu: „Wejdź do demonstracji”, potem „Wybierz osobę demonstracyjną” → Tomasz Kowalczyk, „Wejdź”
(tam też przełączniki „Większy tekst” i „Ogranicz animacje”).

**Start → sprawa → pomoc Spinki → decyzja i przypomnienie** (sprawdzone na tym buildzie, klatki w `zrzuty/runda-27/sciezki/`, 390 × 844):

| Krok | Co kliknąć | Co widać |
|---|---|---|
| A1 | „Wejdź do demonstracji” → „Wejdź” | Start, koperta „Kończy się OC: Toyota Yaris” |
| A2 | „Zobacz, co zrobić” na kopercie | okno sprawy: czego dotyczy, do kiedy, dlaczego ważne, następny krok |
| A3 | „Sprawdź, co zrobić” | rozmowa „Zapytaj Spinkę” ze sprawą OC, znak w stanie „następny krok” |
| A4 | „Co mogę zrobić?” | dwie opcje: zostaję w obecnym towarzystwie / zmieniam ubezpieczyciela, ze skutkami |
| A5 | „Zostaję w obecnym towarzystwie” | pytanie o przypomnienie: „Tak, przypomnij 2 listopada” / „Nie trzeba” |
| A6 | „Tak, przypomnij 2 listopada” | **koniec:** „Ustawione. Przypomnę w poniedziałek, 2 listopada. Sprawa zostaje w «Do załatwienia». Do ubezpieczyciela nic nie zostało wysłane.”; znak w stanie „gotowe” (zielony ptaszek), pasek „Zakończone w demonstracji” |

Krótsza droga (B): na kopercie „Przypomnij 2 dni przed końcem polisy” → okno „Ustawić przypomnienie?” → „Ustaw przypomnienie” →
w kopercie „Przypomnienie ustawione na poniedziałek, 2 listopada”, komunikat na dole ekranu, a na Starcie karta OC
z „Przypomnę 02.11 (demo)”. Ta droga nie przechodzi przez Spinkę.

**Jak kończą się pozostałe scenariusze** (linki `dist/index.html#…` pomijają ekran startowy; sprawdzone przy 390 px):

| Link | Przebieg | Ostatni krok |
|---|---|---|
| `#portfel` | co było w portfelu → zgubiony czy skradziony → co z dowodem → podsumowanie → „Potwierdź” | ekran „Gotowe (w demonstracji)”, znak „gotowe” |
| `#pismo` | to pismo? → co mogę zrobić → odpowiem i dołączę fakturę → plik → odpowiedź do przeczytania → podsumowanie → „Potwierdź” | ekran „Gotowe (w demonstracji)” |
| `#dane` | kto ma dostęp → bank → „Cofnij dostęp” → podsumowanie → „Potwierdź” | ekran „Gotowe (w demonstracji)” |
| `#dowod` | dane poprawne → zdjęcie → urząd → termin wizyty → podsumowanie → „Potwierdź” | ekran „Gotowe (w demonstracji)” |
| `#oc` | jak ścieżka A od kroku A3 | przypomnienie ustawione w rozmowie, bez osobnego ekranu „Gotowe” |

Przed każdym „Potwierdź” Spinka pokazuje podsumowanie (znak w stanie „ostrzega”). Nic nie jest wysyłane: wszystkie dane, osoby,
numery i instytucje są fikcyjne. Data pokazu jest stała (`DEMO_TODAY` w `src/data.js`, teraz 26.10.2026), więc terminy w filmie
się nie przesuną.

## Testy

`testy/runda-27/README-testy.md`: `npm install`, `npx playwright install chromium`, `./uruchom-testy.sh` (około 6 minut).

## Git

```bash
git init && git add -A && git status --short | grep -c . && git check-ignore -v .env
```

`.env` jest ignorowany, `.env.example` śledzony.
