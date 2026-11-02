# Spinka: strona projektu

Statyczna strona projektu: na pierwszym ekranie (także 320 × 568) przycisk „Otwórz demo”, skróty „Pismo z urzędu”
(`aplikacja/#pismo`) i „Kończy się OC” (`aplikacja/#oc`) prosto do scenariuszy, film z paskiem postępu zsynchronizowanym
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
| `testy/otwarcie-test.js` | otwarcie z rundy 29: nagłówek pisma i data zgodna z aplikacją, brak przypiętej kartki w otwarciu i w „Twoich danych”, sceny filmu myszą i klawiaturą, spinka na torze, sceny ukryte bez filmu |
| `testy/test-strony.js` | testy w Chromium: pierwszy ekran 320/390/1280, odtwarzanie, napisy, pauza, koniec, klawiatura, ograniczony ruch, stos ekranów w „Demonstracji”, nagłówki w 2 liniach, brak przewijania w bok przy 16 szerokościach, axe, `/aplikacja/`, brak filmu |
| `public/` | wynik buildu: to wgrywa się na hosting |

Źródła spoza tego katalogu (ścieżki domyślne, można zmienić opcjami `build.mjs`):

- aplikacja: `../aplikacja/dist/index.html`; `build.mjs` przerywa, jeśli MD5 nie zgadza się z wartością `APLIKACJA_MD5` w `build.mjs` (runda 29: `aa05f84856717a12399b0bc075fa888e`).
  Plik trafia do `public/aplikacja/index.html` bajt w bajt: zachowanie, dane, ekrany i teksty aplikacji są niezmienione.
- znak: `../aplikacja/docs/znak-spinki/` (oryginalny znak Spinki wyeksportowany z kodu aplikacji).

## Otwarcie (runda 29)

Pierwsza część strony jest zbudowana jak pierwsza strona pisma, bo tym zajmuje się Spinka:

- tytuł „Każda sprawa ma następny krok.” jak temat sprawy; obok (od 960 px) nagłówek pisma: „Data w prototypie” (z zegara pokazowego aplikacji, wstawiana przy budowaniu) i „W sprawie: asystenta spraw w koncepcji aplikacji mObywatel”; na telefonie ten sam nagłówek stoi niżej, pod opisem;
- film bez przypiętej kartki i bez tła-plamy: nad nim linia „Film, 0:41, z napisami” i „Pomiń film”, pod nim tor postępu, na którym mała czerwona spinka stoi w miejscu odtwarzania;
- „Sceny filmu”: spis sześciu scen z czasem; wybór przewija film do sceny i ją odtwarza, bieżąca scena ma czerwoną kreskę (`aria-current`); na szerokim ekranie pas na całą szerokość pod filmem i opisem, na telefonie pod opisem;
- podpis autora jak pod pismem: „Koncepcja i projekt aplikacji:” drobnym krojem i „Igor M.” antykwą, z czerwoną kreską na marginesie;
- przypięta kartka została tylko w sekcji „Demonstracja”; ekrany Profilu w „Asystent mówi, skąd wie” są płaskie, w cienkiej ramce.

Na telefonie pierwszy ekran bez zmian w treści: tytuł, film z „Pomiń film”, „Otwórz demo”, skróty (320×568 bez przewijania).

## Film

Strona oczekuje w `film-web/` plików wybranej wersji filmu (domyślnie v9; `node build.mjs --wersja-filmu v8` buduje z v8). Wersja webowa, nie master:

| Plik | Co to jest |
|---|---|
| `spinka-film-v8.mp4` | H.264 + AAC, `faststart`, najwyżej 1920 px szerokości |
| `spinka-film-v8-plakat.jpg` | plakat (pierwszy obraz przed odtworzeniem) |
| `spinka-film-v8.pl.vtt` | napisy WebVTT po polsku, domyślnie włączone; film v8 nie ma lektora, więc napisy opisują dźwięk |
| `spinka-film-v8.tekst.txt` | tekst z filmu, plansza po planszy (opis obrazu w nawiasach); trafia na stronę jako rozwijany „Tekst z filmu” |

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
