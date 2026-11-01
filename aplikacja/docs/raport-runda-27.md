# Runda 27: Spinka, asystent spraw (29.10.2026)

## Wersja

- Punkt wyjścia: paczka `mobywatel-prototyp-runda-26.zip`, SHA-256 `f91f2a7eaee35d732c1bd739eb6d0b00d8c137fec9c96aef4b7b4a09c37f7e15`,
  zgodna z podaną. W środku 95 sum z `SHA256SUMS.txt` zgodnych; `node build.mjs` na źródłach z paczki dał bajt w bajt build `b54aa1f8…`.
- Praca w nowym katalogu `mobywatel-prototyp-runda-27`. Paczki, projektu rundy 26 (`b54aa1f8…`) ani artefaktu
  https://claude.ai/artifact/Epc2D8fEYguPVdjYogQvnc (wersja 9) nie zmieniano.
- Nowy build:

| Plik | MD5 | SHA-256 |
|---|---|---|
| `dist/index.html` | `61c2912275be841d8bc7c7d7a0767f7f` | `fa3250a3296d4dd6a091866608b1c210e06f92f014154e85f5477051ee72fe41` |
| `dist/artifact.html` | `6bf3bfe8c3781e1d9100ad23b8d35e0b` | `26455bd1a1a02b3d39a27f2df086982969655bac279cc839d87fcf09ca204d9b` |

## Gdzie zmieniła się nazwa i wygląd

| Miejsce | Przed (r26) | Po (r27) | Plik |
|---|---|---|---|
| Nagłówek rozmowy | „Zapytaj Polę”, postać z twarzą | „Zapytaj Spinkę”, znak spinki (44 px, zmienia stan) | `src/assistant.js` |
| Dziennik rozmowy (czytnik) | „Rozmowa z Polą” | „Rozmowa ze Spinką” | `src/assistant.js` |
| Powitanie | „tu Pola, przewodnik…” | „tu Spinka, przewodnik… Spinam sprawy, nie Ciebie.” | `src/assistant.js` |
| „pisze…” i „pyta model AI…” | „Pola pisze…” | „Spinka pisze…”, „Spinka pyta model AI…” | `src/assistant.js` |
| Pole na Starcie (etykieta i znak) | „Zapytaj Polę: co chcesz załatwić?”, postać 34 px | „Zapytaj Spinkę: co chcesz załatwić?”, znak 34 px | `src/app.js` |
| Przycisk przy piśmie | „Odpowiedz z pomocą asystenta” | „Odpowiedz z pomocą Spinki” | `src/app.js` |
| Ekran „Gotowe (w demonstracji)” | postać 58 px | znak 58 px w stanie „gotowe”, bez hasła | `src/app.js` |
| Opis koncepcji obok telefonu (3 miejsca) | „Asystent…” | „Spinka, asystent spraw, …”, „Spinka pokazuje…”, „czego Spinka nie zrobi” | `src/page.html` |
| Zapamiętanie przełącznika AI | `sessionStorage` `pola-ai` | `asystent-ai` (neutralnie) | `src/assistant.js` |
| Znak i jego style | `A.pola`, `.pola-*` | `A.postac`, `A.znak`, `.postac-*` (nazwy neutralne) | `src/icons.js`, `src/styles.css` |
| Nazwa, formy, hasło, przełącznik znaku | rozproszone | jedno miejsce | `src/marka.js` (nowy) |
| Wstawianie nazwy do `page.html` | — | znaczniki `marka:imie` zastępowane przy budowaniu | `build.mjs` |
| Dokumentacja | — | sekcja „Spinka” w README, `docs/nazwa-spinka.md`, ten raport, `testy/runda-27/` | |

Bez zmian: zakładka w dolnym pasku „Asystent” (nazwa zakładki mówi, do czego służy) i opis strony w metadanych.
Serwer `server/gemini-adapter.mjs` jest identyczny z rundą 26.

## Znak

Dwie kartki sprawy i czerwona spinka wystająca nad krawędź (pełny kształt ze szczeliną). Odznaka w prawym dolnym rogu
pokazuje stan: **słucha** (fale), **wyjaśnia** („i”, linie się wypisują), **ostrzega** (bursztynowe „!”, przed
potwierdzeniem), **następny krok** (strzałka, przednia kartka się przesuwa), **gotowe** (zielony ptaszek, spinka się zatrzaskuje).

- **Bez twarzy.** Spinacz z oczami to najbardziej oczywiste skojarzenie (asystent z pakietu biurowego), więc znak go unika.
  Nie korzysta z sylwetek, mimiki ani kolorów InPostu, Gemini czy innych marek; kolory to czerwień i szarości aplikacji.
- **Mały rozmiar:** czytelny przy 34 px (DPR 1 i 3, `zrzuty/runda-27/znak-stany-dpr1.png`, `znak-stany-dpr3.png`).
  Obrys kartek 7:1 do bieli, spinka 5,9:1. Przy ograniczonym ruchu stan zmienia się bez animacji; animacje są skończone (fale 3 razy).
- **Ukryty przed czytnikiem** (`aria-hidden`); znaczenie niesie tekst.

**Ocena w kontekście asystenta** (`zrzuty/runda-27/kontekst-przed-po.png`, `przed-po-1-start-asystent-390.png`):

- Poprawia: nagłówek rozmowy jest rozpoznawalny od razu, spinka łączy się z nazwą bez tłumaczenia,
  stan po odpowiedzi daje cichą informację zwrotną. Przy 34 px w polu na Starcie znak jest spokojniejszy niż Pola z twarzą.
- Ryzyko: kartka ze spinką może się kojarzyć z ikoną załącznika (aplikacja ma liniową ikonę spinacza przy dodawaniu pliku).
  Ogranicza to pełny czerwony kształt i to, że znak stoi tylko przy nazwie asystenta. Nie testowałem tego na ludziach.
- **Rekomendacja: nie dodawać znaku na wszystkie ekrany.** Zostaje w trzech miejscach związanych z asystentem: nagłówek
  rozmowy, pole „Co chcesz załatwić?” (poniżej 360 px ukryty, żeby zmieścił się tekst) i ekran „Gotowe”. Na Dokumentach,
  Sprawach czy w Profilu byłby ozdobą bez funkcji i rozpraszałby od treści urzędowej. Decyzja należy do Ciebie.

## Hasło

Sprawdzone dwa miejsca (`zrzuty/runda-27/haslo-porownanie.png`; 390 px i 320 px z większym tekstem):

| Wariant | Miejsce | Wynik |
|---|---|---|
| **A (wdrożony)** | powitanie w rozmowie, w pierwszej osobie: „Spinam sprawy, nie Ciebie.” | bez przewijania w bok; pojawia się raz na rozmowę, mówi sam asystent; dymek wyższy o 25 px (390 i 320 px) i o 58 px (320 px z większym tekstem) |
| B (tylko makieta, odrzucony) | podpis pod polem na Starcie | jedna linia, mieści się; ale czyta się jak reklama na ekranie urzędowym i powtarza przy każdym wejściu |

**Koszt wariantu A na najmniejszym ekranie:** przy 320 px z większym tekstem widoczny obszar rozmowy ma 216 px. Powitanie
nie mieściło się w nim już w rundzie 26 (257 px), teraz ma 315 px, więc instrukcja „Napisz albo powiedz…” jest jeszcze
niżej i trzeba przewinąć. Przy 320 px ze zwykłym tekstem (246 px przy 270 px widoku) i przy 390 px (172 przy 544) mieści się.
Jeśli ważniejsza jest instrukcja niż żart, są dwie proste zmiany (nie wdrożone, bo wymagałyby nowej regresji):
przenieść hasło na koniec powitania albo skrócić powitanie przy większym tekście.

Pełne „Spinka — spina sprawy, nie Ciebie.” zostaje na materiały poza aplikacją (film, strona, prezentacja). Hasła nie ma
w podsumowaniach, błędach ani na ekranie „Gotowe”: tam żart byłby nie na miejscu. Uwaga: „spina” potocznie znaczy stres;
hasło gra tym znaczeniem świadomie, ale dla części odbiorców może brzmieć zbyt luźno jak na usługę publiczną.

## Nazwa: wstępne rozeznanie

Szczegóły: `docs/nazwa-spinka.md`. **To nie jest opinia prawna, a nazwa nie jest zatwierdzona ani potwierdzona jako wolna.**

- **UPRP, TMview, EUIPO (i WIPO) nie zostały przeszukane:** serwer pośredniczący sesji odrzucał połączenia z tymi domenami (CONNECT 403).
- Wyszukiwarka internetowa (indeks z USA, słabe pokrycie polskich źródeł): brak aplikacji, czatbota ani znaku „Spinka”
  w oprogramowaniu. Najbliżej: „Spink” (aplikacja SpareBank 1, zapis bliski), „Spoki” (platforma czatbotów, ta sama kategoria),
  „SPINKO sp. z o.o.”, firmy „PW Spinka Plus” (odzież) i „Spinka Film Studio”. Wstępne ryzyko: niskie–średnie.
- W dokumencie jest lista zapytań do rejestrów (SPINKA, SPINK*, SPINKI, SPINKO, SPINKY, SPINK, SPINCA, SPINA, SPIKA, SPOKI,
  SPINKA AI, ZAPYTAJ SPINKĘ) i klasy 9, 35, 38, 42 (pomocniczo 41, 45).

## Zmiana albo usunięcie nazwy i znaku

Wszystko w `src/marka.js`: `imie`, `biernik`, `dopelniacz`, `zNarzednikiem`, `haslo` (puste = bez hasła), `postac`
(`false` = zwykłe ikony zamiast znaku). Potem `node build.mjs`. Sprawdzone na kopii z nazwą „Kartka”, bez hasła i bez znaku:
nowa nazwa we wszystkich miejscach, zwykłe ikony, poza skryptami nigdzie „Spink”, bez błędów (`testy/runda-27/zamiana-test.js`).
Komentarze w `src/marka.js` podają przykłady form ze „Spinką”; przy zmianie nazwy warto je poprawić razem z wartościami.

## Małe ekrany, dostępność, nawigacja

- „Zapytaj Spinkę” mieści się w jednej linii przy 320 px z większym tekstem i przy 1280 px.
- Wysokość obszaru rozmowy bez zmian względem rundy 24: 268 px (320×568), 340 px (360×640), 544 px (390×844).
- Powitanie z hasłem jest wyższe o 25 px (o 58 px przy 320 px z większym tekstem, patrz „Hasło”), więc rozmowa przewija
  się dalej; przywracanie pozycji po zamknięciu koperty: różnica 0 px przy 320, 360 i 390.
- axe-core 4.10.2: 0 naruszeń w 21 stanach × 3 konfiguracje (390, 1280 z wymuszonymi kolorami, 320 z większym tekstem) i w 4 stanach trybu AI.
- Klawiatura, kolejność fokusu, Escape w oknach, drzewo dostępności: bez zmian względem rundy 26.

## Testy

### Testy lokalne (przeglądarka Chromium, atrapa Gemini)

Pełna regresja na buildzie `61c29122…` (log: `testy/logi/regresja-runda-27.log`):

| Obszar | Wynik |
|---|---|
| Funkcje (4 szerokości × 3 tryby) | 12/12, pozycje powrotu zgodne, bez błędów |
| Gesty karuzeli | 6 × 8/8 |
| Rozmowa 320/360/390: przywrócenie pozycji | 4/4, różnica 0 |
| Wskaźnik zakładek | bez błędów, jeden ekran naraz |
| 19 skryptów regresji z rund 9–20 | wszystkie kod 0 |
| Dostępność (a11y), dopasowanie (fit), zgodność trybów (parity) | 54 OK, 84 OK, 0 różnic |
| Odpowiedzi asystenta | 25/25 identyczne z rundą 26 |
| Rundy 22, 23, 24 | bez regresji (R23 13/13, R24 12/12) |
| Poprawki rundy 25 | 40/40 |
| Znak i nazwa (nowy test) | 10/10 |
| Zmiana nazwy w `src/marka.js` | nowa nazwa wszędzie, zwykłe ikony, bez błędów |
| Tryb AI na atrapie Gemini | 26/26 |
| Dostępność trybu AI | 8/8 |
| Audyt ekranów (7 konfiguracji) | 298 stanów, 21 z uwagami, identyczne z rundą 26 (nakładki: fałszywe alarmy) |
| Kliknięcia, klawiatura, scenariusze, formularze, kontrast, czytnik | identyczne z rundą 26; axe 0; 5/5 scenariuszy do końca; 0/36 napisów poniżej progu |

Uwagi powtarzające się od rundy 26 (nie nowe): przy kliknięciach „W toku 2” i zakładka „Asystent” nie mają efektu, bo są
już wybrane; „Poprzedni dokument/sprawa” przy pierwszym elemencie jest wyłączony, więc kliknięcie kończy się po 4 s.
Pola tekstowe mają obwódkę fokusu na ramce formularza, nie na samym polu, co skrypt zgłasza.

### Połączenie z prawdziwym modelem: niezweryfikowane

- W środowisku nie ma `GEMINI_API_KEY`. Serwer prototypu (`http://127.0.0.1:8080/api/assistant/status`) zwraca
  `"mode":"rules","reason":"no_key"`, więc aplikacja odpowiada z gotowych reguł.
- Testy trybu AI korzystają z atrapy (`mock-gemini2.mjs`) i celowo fałszywego klucza; **nie potwierdzają, że prawdziwy
  Gemini działa** ani że model `gemini-3.1-flash-lite` jest dostępny dla Twojego klucza i regionu.
- Z kontenera `generativelanguage.googleapis.com` odpowiada (403 bez klucza), więc połączenie sieciowe jest możliwe,
  ale samego wywołania modelu nie wykonano.
- Jak sprawdzić u siebie: `README.md`, sekcja „Tryb AI”: klucz w `.env` z projektu bez rozliczeń, `node server/gemini-adapter.mjs`,
  w logu serwera widać, czy klucz jest ustawiony (bez treści) i czy model istnieje.

### Pakiet w projekcie

`testy/runda-27/uruchom-testy.sh`: regresja poprawek rundy 25, plik, który nie jest zdjęciem, znak i nazwa, zmiana nazwy,
tryb AI na atrapie, dostępność trybu AI. `testy/runda-26/` dotyczy buildu `b54aa1f8…`; na bieżącym buildzie jego test postaci
nie przejdzie, bo szuka „Poli”.

## Zrzuty (`zrzuty/runda-27/`)

| Plik | Co pokazuje |
|---|---|
| `przed-po-1-start-asystent-390.png` | Start i powitanie w rozmowie: Pola → Spinka |
| `przed-po-2-odpowiedz-gotowe-390.png` | odpowiedź z kartą źródła i ekran „Gotowe” |
| `przed-po-3-pismo-320.png` | przycisk przy piśmie; rozmowa przy 320 px z większym tekstem |
| `przed-po-4-1280.png` | 1280 px: opis koncepcji i rozmowa |
| `znak-stany-dpr1.png`, `znak-stany-dpr3.png` | 5 stanów znaku w rozmiarach 34, 44 i 58 px |
| `kontekst-przed-po.png` | znak w nagłówku i w polu na Starcie, przed i po (390, 320 z większym tekstem, 1280, wymuszone kolory) |
| `haslo-porownanie.png` | hasło: wariant A (powitanie, 390 i 320 px z większym tekstem) i B (makieta na Starcie) |
| `pojedyncze/` | pojedyncze zrzuty przed/po |

## Otwarte decyzje

1. Czy znak ma zostać tylko przy asystencie (rekomendacja), czy pojawić się szerzej.
2. Przeszukanie rejestrów i konsultacja z rzecznikiem patentowym przed użyciem nazwy poza konkursem.
3. Sprawdzenie prawdziwego połączenia z Gemini na własnym kluczu.
4. Publikacja nowej wersji w artefakcie (teraz nadal wersja 9) dopiero po Twojej decyzji.
