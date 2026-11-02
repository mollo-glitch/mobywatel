# Spinka: strona projektu

Statyczna strona projektu: na pierwszym ekranie (także 320 × 568) przycisk „Otwórz demo”, skróty „Pismo z urzędu”
(`aplikacja/#pismo`) i „Kończy się OC” (`aplikacja/#oc`) prosto do scenariuszy, film z paskiem postępu zsynchronizowanym
z czasem filmu i „Pomiń film”; po końcu filmu „Przejdź do demonstracji”; demonstracja pod `/aplikacja/` i krótka informacja
o projekcie. Film niczego nie blokuje: do demo prowadzi jedno dotknięcie.
Bez frameworka, bez analityki, bez plików cookie, bez zależności w przeglądarce. Działa na dowolnym hostingu plików statycznych.

## Co jest w środku

| Ścieżka | Co to jest |
|---|---|
| `src/index.html` | strona (style i skrypt w jednym pliku); znaczniki `<!--znak:…-->` i `<!--film:…-->` wypełnia build |
| `src/fonty/` | Atkinson Hyperlegible Next i IBM Plex Sans 700 (latin, latin-ext) z licencjami OFL; te same kroje co w aplikacji, serwowane z własnego adresu |
| `build.mjs` | składa `public/`: strona, fonty, znak, film, `aplikacja/index.html` |
| `przygotuj-film.sh` | wersja webowa filmu i plakat z pliku źródłowego (nie nadpisuje źródła) |
| `podglad.mjs` | lokalny serwer `public/` z obsługą Range (przewijanie wideo) |
| `src/obrazy/` | trzy zrzuty prawdziwych ekranów aplikacji (WebP) do sekcji „Demonstracja” |
| `narzedzia/zrzuty-aplikacji.js` | odtwarza `src/obrazy/` z działającego buildu aplikacji (Playwright, Pillow); aplikacji nie zmienia |
| `testy/test-strony.js` | testy w Chromium: pierwszy ekran 320/390/1280, odtwarzanie, napisy, pauza, koniec, klawiatura, ograniczony ruch, stos ekranów w „Demonstracji”, nagłówki w 2 liniach, brak przewijania w bok przy 16 szerokościach, axe, `/aplikacja/`, brak filmu |
| `public/` | wynik buildu: to wgrywa się na hosting |

Źródła spoza tego katalogu (ścieżki domyślne, można zmienić opcjami `build.mjs`):

- aplikacja: `../aplikacja/dist/index.html`, build 27; `build.mjs` przerywa, jeśli MD5 nie jest `61c2912275be841d8bc7c7d7a0767f7f`.
  Plik trafia do `public/aplikacja/index.html` bajt w bajt: zachowanie, dane, ekrany i teksty aplikacji są niezmienione.
- znak: `../aplikacja/docs/znak-spinki/` (oryginalny znak Spinki wyeksportowany z kodu aplikacji).

## Film

Strona oczekuje w `film-web/` trzech plików (wersja webowa, nie master):

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

Rozmiar strony bez filmu: około 350 KB (HTML ~43 KB, fonty ~92 KB, trzy zrzuty ekranów ~218 KB wczytywane dopiero przy przewinięciu) plus aplikacja ~490 KB pobierana dopiero po przejściu.
Film ładuje tylko metadane (`preload="metadata"`), dopóki ktoś go nie włączy.

## Czego strona nie robi

Nie zmienia aplikacji ani filmu. Nie ma analityki, śledzenia, plików cookie ani formularzy. Aplikacja (niezmieniona)
pobiera czcionki z Google Fonts; strona projektu ma je u siebie.
