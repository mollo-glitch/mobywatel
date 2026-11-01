# Testy rundy 27

Uruchamiane z tego katalogu: `npm install`, `npx playwright install chromium`, potem `./uruchom-testy.sh`.
Skrypt sam startuje serwer statyczny `dist/` (port `PORT_STATYCZNY`, domyślnie 8200) i atrapę Gemini API (8599).
Buduje też w katalogu tymczasowym kopię projektu, w której `src/marka.js` ma inną nazwę („Kartka”), puste hasło
i `postac: false`, i serwuje ją na 8628. Oryginału nie zmienia. Testy trybu AI startują własne instancje
`server/gemini-adapter.mjs` (porty 8611–8616 i 8631) z różnymi ustawieniami: z kluczem testowym, bez klucza,
ze złym kluczem, z nieistniejącym modelem i bez sieci.

| Plik | Co sprawdza |
|---|---|
| `regresja.js` | 40 sprawdzeń poprawek 1–10 z audytu rundy 24 (wstecz systemowy, fokus arkusza głosowego, długie ciągi, przypomnienie, pliki, powitanie 320 px, id, rola karuzeli, main, wymuszone kolory) |
| `plik-widoczny.js` | komunikat o złym pliku i przycisk „Użyj tego pliku” widoczne przy 320 i 390 px |
| `znak-test.js` | 10 sprawdzeń znaku i nazwy: gdzie jest znak, nazwa z `src/marka.js` w nagłówku, etykiecie pola na Starcie, dzienniku rozmowy, powitaniu i opisie koncepcji, hasło raz (tylko w powitaniu), stany w rozmowie, spinka i jedna odznaka w każdym stanie, brak twarzy, skończone animacje, ograniczony ruch, brak „Pola”, wysokość rozmowy przy 320/360/390 px |
| `zamiana-test.js` | 11 sprawdzeń kopii z inną nazwą i bez znaku: nowa nazwa we wszystkich miejscach, zwykłe ikony zamiast znaku, brak „Spink” w dokumencie, brak błędów |
| `zmien-nazwe.js` | pomocniczy: zamiana nazwy w kopii `src/marka.js` (używa go `uruchom-testy.sh`) |
| `ai-test.js` | 26 sprawdzeń trybu AI na atrapie: informacja przed wysłaniem, raty (OC ≠ kredyt), dopytanie, liczby spoza danych, przełącznik, timeout, 500, blokada, 429, brak sieci, brak klucza, zły klucz, brak modelu, region, plik statyczny, brak danych osobowych w zapytaniu, brak klucza w plikach aplikacji, logach i odpowiedziach |
| `ai-a11y.js` | axe-core w 4 stanach trybu AI przy 390, 320 (większy tekst) i 1280 (wymuszone kolory), klawiatura przełącznika |
| `mock-gemini2.mjs` | atrapa Gemini API (nie łączy się z Google) |
| `start-ai.js`, `arkusz.js` | pomocnicze: pytanie ze Startu w trybie AI, arkusz stanów znaku (34, 44, 58 px; DPR 1 i 3) |

**Testy nie sprawdzają prawdziwego modelu Gemini.** Tryb AI testuje atrapa z celowo fałszywym kluczem
(zaczyna się od „test-klucz-”); to nie jest klucz Google. Połączenie z prawdziwym modelem trzeba sprawdzić osobno,
z własnym kluczem w `.env` (patrz „Tryb AI” w `README.md`). Testy działają tylko w Chromium.

Pełna regresja (ekrany w 7 konfiguracjach, kliknięcia, klawiatura, axe na 21 stanach, scenariusze, formularze,
kontrast, gesty, karuzela, intencje) korzysta też ze skryptów z wcześniejszych rund, których nie ma w projekcie.
Jej log z rundy 27: `../logi/regresja-runda-27.log`.
