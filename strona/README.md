# Spinka: strona projektu

Statyczna strona projektu: na pierwszym ekranie (także 320 × 568) przycisk „Zobacz demonstrację”, trzy przykłady „Pismo z urzędu”
(`aplikacja/#pismo`), „Kończy się OC” (`aplikacja/#oc`) i „Zgubiony portfel” (`aplikacja/#portfel`) prosto do scenariuszy, film z paskiem postępu zsynchronizowanym
z czasem filmu i „Pomiń film”; po końcu filmu „Przejdź do demonstracji”; demonstracja pod `/aplikacja/` i krótka informacja
o projekcie. Film niczego nie blokuje: do demo prowadzi jedno dotknięcie.
Bez frameworka, bez analityki, bez plików cookie, bez zależności w przeglądarce. Działa na dowolnym hostingu plików statycznych.

## Co jest w środku

| Ścieżka | Co to jest |
|---|---|
| `src/index.html` | strona (style i skrypt w jednym pliku); znaczniki `<!--znak:…-->`, `<!--film:…-->` i `<!--data-pokazu-->` wypełnia build |
| `src/fonty/` | Poltawski Nowy (nagłówki; rewitalizacja antykwy Półtawskiego, zmienna waga 400–700) i Atkinson Hyperlegible Next (tekst, ten sam krój co w aplikacji), latin i latin-ext, z licencjami OFL 1.1; serwowane z własnego adresu |
| `src/postac/spinka-postac.svg` | postać Spinki: kartka ze spinką bez twarzy; znacznik `<!--postac:STAN:ROZMIAR-->` (stany: pojawia, spokoj, wskazuje, gotowe, pomylka, odpoczywa), ruch w CSS strony |
| `build.mjs` | składa `public/`: strona, fonty, znak, film, `aplikacja/index.html` |
| `przygotuj-film.sh` | wersja webowa filmu i plakat z pliku źródłowego (nie nadpisuje źródła) |
| `podglad.mjs` | lokalny serwer `public/` z obsługą Range (przewijanie wideo) |
| `src/obrazy/` | zrzuty prawdziwych ekranów aplikacji (WebP): trzy do „Demonstracji”, dwa ekrany Profilu do „Asystent mówi, skąd wie” |
| `narzedzia/zrzuty-aplikacji.js` | odtwarza `src/obrazy/` z działającego buildu aplikacji (Playwright, Pillow); aplikacji nie zmienia |
| `testy/otwarcie-test.js` | otwarcie z rund 29–31: plansza (wiersze hasła na 12 szerokościach, rzędy słów, prędkość i kierunek, ruch staje poza ekranem i wraca, brak przycisku pauzy, ograniczony ruch), hasło marki i pytanie w stopce, nagłówek pisma i data zgodna z aplikacją, sceny filmu myszą i klawiaturą, spinka na torze, sceny ukryte bez filmu |
| `testy/sciezki-test.js` | rundy 31–32: trzy przykłady „Albo zacznij od przykładu” (Pismo z urzędu, Kończy się OC, Zgubiony portfel) od strony do końca scenariusza w aplikacji: telefon 390 px dotykiem i komputer 1280 px klawiaturą; podsumowanie i „Gotowe” albo komunikat końcowy, bez błędów strony |
| `testy/test-strony.js` | testy w Chromium: pierwszy ekran 320/390/1280, odtwarzanie, napisy, pauza, koniec, klawiatura, ograniczony ruch, stos ekranów w „Demonstracji”, nagłówki w 2 liniach, brak przewijania w bok przy 16 szerokościach, axe, `/aplikacja/`, brak filmu |
| `public/` | wynik buildu: to wgrywa się na hosting |

Źródła spoza tego katalogu (ścieżki domyślne, można zmienić opcjami `build.mjs`):

- aplikacja: `../aplikacja/dist/index.html`; `build.mjs` przerywa, jeśli MD5 nie zgadza się z wartością `APLIKACJA_MD5` w `build.mjs` (runda 29: `aa05f84856717a12399b0bc075fa888e`).
  Plik trafia do `public/aplikacja/index.html` bajt w bajt: zachowanie, dane, ekrany i teksty aplikacji są niezmienione.
- znak: `../aplikacja/docs/znak-spinki/` (oryginalny znak Spinki wyeksportowany z kodu aplikacji).

## Otwarcie (runda 29, zmienione w rundzie 30)

- **Plansza jak w filmie v8 (master):** czerwone pole na całą szerokość, hasło „KAŻDA SPRAWA / MA NASTĘPNY KROK.” białym Archivo 900 wersalikami. Poniżej 960 px hasło ma trzy wiersze („KAŻDA SPRAWA / MA NASTĘPNY / KROK.”, do 72 px), od 960 px dwa (do 104 px). Rozmiar liczony z szerokości ekranu (dzielniki 8,8 i 11,8 przy zmierzonych 8,44 em i 11,44 em), więc hasło nigdy nie wychodzi poza ekran (sprawdzone od 320 do 1920 px). Archivo 900 (OFL, `src/fonty/archivo-900-*.woff2`) jest tylko na planszy; reszta strony bez zmian (Poltawski Nowy, Atkinson).
- **Słowa w tle:** dwa rzędy „PISMO · TERMIN · DECYZJA · SPOKÓJ” pustym obrysem (biały 42%), nad hasłem i pod nim, ukryte przed czytnikiem. Rzędy płyną w przeciwne strony ze stałą prędkością 28 px/s, bez końca i bez szwu (dwie identyczne połówki, przesunięcie o 50%); krawędzie wygaszone maską, więc słowo nie jest ucięte w pół litery. Ruch staje, gdy plansza jest poza ekranem.
- **Bez przycisku pauzy (runda 31, na prośbę autora):** rzędy grają same, stają, gdy plansza jest poza ekranem, a przy systemowym ograniczeniu ruchu i bez skryptu stoją od początku. **Uwaga:** WCAG 2.2.2 (poziom A) wymaga sposobu zatrzymania ruchu, który trwa dłużej niż 5 s i jest obok innej treści; bez przycisku strona tego kryterium nie spełnia (ograniczenie ruchu w systemie go nie zastępuje). Przycisk z rundy 30 jest w historii (`punkt-runda5b`).
- **Przejście przy wejściu:** plansza wjeżdża od lewej (0,46 s, jak zmiana koloru w filmie), wiersze hasła odsłaniają się po kolei (całość jednorazowo, poniżej 1,2 s).
- **Małe ekrany:** przy 320 × 568 (wysokość do 600 px) dolny rząd jest ukryty, żeby „Otwórz demo” zmieściło się blisko pierwszego ekranu.
- **Stopka:** „Masz za dużo na głowie?” nad znakiem i nazwą Spinki, pod nimi „spina sprawy, nie Ciebie.”. Tło (runda 32, na prośbę autora): granat z poświatą chłodnego błękitu i seledynu i duży, cichy orzeł z kropek w seledynie po prawej (30% krycia, na telefonie 26%). Kształt to sylwetka orła z ekranu startowego aplikacji (`src/obrazy/orzel-maska.webp`, maska CSS), cała i niezniekształcona, bez czerwieni i bez napisów. Orzeł nie zachodzi na odnośniki i noty i jest ukryty przed czytnikiem; bez obsługi masek się nie pokazuje. Noty: „nieoficjalny prototyp konkursowy… nie jest stroną ani usługą administracji publicznej i nie ma jej poparcia”. **Do sprawdzenia przed publikacją:** zasady używania wizerunku orła i godła w ustawie o godle, barwach i hymnie RP (tekst jednolity Dz.U. 2024 poz. 155); w tej sesji strony ELI były zablokowane.
- **„Spinka nie ma twarzy” (rundy 31–32):** pięć stanów jako sekwencja. Na komputerze (od 960 px) etapy stoją w jednym rzędzie, z dużymi rysunkami (104–136 px), nazwą i jednym zdaniem; między nimi czerwone strzałki w prawo od rysunku do rysunku. Gdy rząd wchodzi w widok, etapy pojawiają się po kolei co 180 ms (razem poniżej 1,2 s), bez przypinania i bez blokowania przewijania. Na telefonie etapy są w pionie ze strzałkami w dół; każdy pojawia się, gdy wchodzi w dolną część ekranu, a etap na środku ekranu ma białe tło. Bez skryptu i przy ograniczonym ruchu wszystko jest od razu widoczne, bez ruchu. W sekcji nie ma elementów do obsługi klawiaturą.
- **Typografia i przyciski (runda 32):** nagłówki, zdania wstępu i przyciski w Newsreader (Production Type, OFL; redakcyjny krój z osią rozmiaru optycznego; sekcje 700, mniejsze nagłówki 600). Tekst i sterowanie w Atkinson Hyperlegible Next. Znak „Spinka” (logo, stopka, podpis) zostaje w Poltawski Nowy, jak w aplikacji. Porównanie wariantów (Poltawski, Newsreader, Bona Nova, Fraunces) było w próbniku; Fraunces odpadł przez błędne polskie znaki („Ź” bez kreski). Przyciski: jedna etykieta „Zobacz demonstrację” wszędzie, gdzie otwiera się aplikacja (nagłówek, otwarcie, koniec filmu, sekcja trzech spraw, stopka), ze strzałką. W menu sekcja nazywa się „Trzy sprawy”, a linki w sekcji: „Przykład: pismo z urzędu”, „Przykład: kończy się OC”, „Demonstracja od początku”.
- **Ikona karty (runda 32):** `src/ikony/favicon.svg` to uproszczony znak Spinki do 16–48 px: jedna kartka z ciemnym obrysem, dwie linie i większa czerwona spinka. Jest czytelny na jasnych i ciemnych paskach kart. Do tego PNG 16/32/48 i `apple-touch-icon.png` (180 px, pełny znak na jasnym tle). Build kopiuje `src/ikony/*` do katalogu głównego strony.
- **Pod planszą:** film bez przypiętej kartki. Nad filmem jedno zdanie, co pokazuje: „Kończące się OC w prototypie, krok po kroku · 0:41” (czas dopisuje skrypt; bez obietnic funkcji, których prototyp nie ma). Obok „Pomiń film”; napisy są włączone od początku; tor postępu ma małą spinkę. Dalej opis, „Zobacz demonstrację” i „Albo zacznij od przykładu:” z trzema działającymi przykładami, każdy z podpowiedzią, czego się w nim dowiesz: „Pismo z urzędu: do kiedy odpowiedzieć i co, jeśli nie odpowiesz” (`aplikacja/#pismo`), „Kończy się OC: czy polisa przedłuży się sama i co możesz zmienić” (`#oc`), „Zgubiony portfel: co zastrzec od razu, a co może poczekać” (`#portfel`). Na końcu podpis autora i nagłówek pisma. Przy 1280×800 widać pierwszy przykład, przy 390×844 dwa; podpis autora jest tuż pod pierwszym ekranem.
- **Sceny filmu:** sześć scen z czasem i nazwą tego, co widać: „Wstęp: pismo, termin, pytanie”, „Ekran Start: kończy się OC”, „Co to znaczy i do kiedy”, „Scenariusz ze Spinką”, „Trzy możliwości i ich skutki”, „Przypomnienie, nic nie wysłano”. Wybór przewija film do sceny, a bieżąca scena ma czerwoną kreskę (`aria-current`). Pod spisem rozwijany „Tekst filmu i opis obrazu” (plansze po kolei, z opisem obrazu): dostępna wersja treści filmu.
- Przypięta kartka została tylko w „Demonstracji”; ekrany Profilu w „Asystent mówi, skąd wie” są płaskie.

## Film

Strona oczekuje w `film-web/` plików wybranej wersji filmu (domyślnie v9; `node build.mjs --wersja-filmu v8` buduje z v8). Wersja webowa, nie master:

| Plik | Co to jest |
|---|---|
| `spinka-film-v8.mp4` | H.264 + AAC, `faststart`, najwyżej 1920 px szerokości |
| `spinka-film-v8-plakat.jpg` | plakat (pierwszy obraz przed odtworzeniem) |
| `spinka-film-v8.pl.vtt` | napisy WebVTT po polsku, domyślnie włączone; film v8 nie ma lektora, więc napisy opisują dźwięk |
| `spinka-film-v8.tekst.txt` | tekst z filmu, plansza po planszy (opis obrazu w nawiasach); trafia na stronę jako rozwijany „Tekst filmu i opis obrazu” |

Przygotowanie z zatwierdzonego eksportu (Linux, macOS, Git Bash na Windows; wymaga ffmpeg):

```bash
./przygotuj-film.sh "ścieżka/spinka-film-v8-podglad_1080p30.mp4" "ścieżka/napisy.vtt" "ścieżka/plakat.jpg"
# bez gotowego plakatu: trzeci argument to czas klatki, np. 00:00:03
```

Windows (PowerShell, ffmpeg w PATH), te same ustawienia:

```powershell
ffmpeg -i "$HOME\Documents\Codex\film-spinka-animatyk\09-eksport\spinka-film-v8-podglad_1080p30.mp4" -map 0:v:0 -map 0:a:0? -c:v libx264 -preset slow -crf 23 -profile:v high -pix_fmt yuv420p -vf "scale='min(1920,iw)':-2" -c:a aac -b:a 128k -movflags +faststart film-web\spinka-film-v8.mp4
```

Pliku źródłowego ani mastera nic nie zmienia; wynik zawsze ląduje w `film-web/`. Jeśli zatwierdzony eksport jest już
w H.264 i ma rozsądny rozmiar (do ok. 8 Mb/s), wystarczy go skopiować jako `film-web/spinka-film-v8.mp4`;
ważne, żeby miał `faststart` (wtedy przeglądarka zaczyna odtwarzać przed pobraniem całości).

## Budowanie, podgląd, testy

```bash
node build.mjs                 # bez filmu w film-web/ przerywa; node build.mjs --bez-filmu buduje stronę z komunikatem „Film jest chwilowo niedostępny”
node podglad.mjs 8400          # http://127.0.0.1:8400/  i  http://127.0.0.1:8400/aplikacja/
```

Testy (Node.js 18+, `npm install playwright@1.63.0 axe-core@4.10.2`, `npx playwright install chromium`): zbuduj dwie wersje
(z filmem i z `--bez-filmu`) w osobnych kopiach katalogu, uruchom dla każdej `podglad.mjs` na innym porcie, potem
`node testy/test-strony.js <port z filmem> <port bez filmu>`.

## Publikacja

`public/` to gotowa strona. Wystarczy hosting plików statycznych z obsługą żądań Range dla wideo (GitHub Pages, Netlify,
Cloudflare Pages, Vercel i zwykły serwer WWW ją mają). Linki są względne, więc strona działa także pod podkatalogiem,
np. `https://użytkownik.github.io/spinka/`. `public/.nojekyll` wyłącza przetwarzanie Jekyll na GitHub Pages.
Po publikacji sprawdź publiczny adres: stronę, film z napisami, `/aplikacja/` i adres bez końcowego ukośnika.

Rozmiar strony bez filmu: około 380 KB (HTML ~56 KB, fonty ~120 KB, trzy zrzuty ekranów ~218 KB wczytywane dopiero przy przewinięciu) plus aplikacja ~490 KB pobierana dopiero po przejściu.
Film ładuje tylko metadane (`preload="metadata"`), dopóki ktoś go nie włączy.

## Czego strona nie robi

Nie zmienia aplikacji ani filmu. Nie ma analityki, śledzenia, plików cookie ani formularzy. Aplikacja (niezmieniona)
pobiera czcionki z Google Fonts; strona projektu ma je u siebie.
