# Testy rundy 26

Uruchamiane z tego katalogu: `npm install`, `npx playwright install chromium`, potem `./uruchom-testy.sh`.
Skrypt sam startuje serwer statyczny `dist/` (port `PORT_STATYCZNY`, domyślnie 8200) i atrapę Gemini API (8599).
Testy trybu AI startują własne instancje `server/gemini-adapter.mjs` (porty 8611–8616 i 8631) z różnymi ustawieniami:
z kluczem testowym, bez klucza, ze złym kluczem, z nieistniejącym modelem i bez sieci.

| Plik | Co sprawdza |
|---|---|
| `regresja.js` | 40 sprawdzeń poprawek 1–10 z audytu rundy 24 (wstecz systemowy, fokus arkusza głosowego, długie ciągi, przypomnienie, pliki, powitanie 320 px, id, rola karuzeli, main, wymuszone kolory) |
| `plik-widoczny.js` | komunikat o złym pliku i przycisk „Użyj tego pliku” widoczne przy 320 i 390 px |
| `pola-test2.js` | 9 sprawdzeń postaci: gdzie występuje, stany w rozmowie, zakładka i jedna odznaka w każdym stanie, kontrast obrysu, skończone animacje, ograniczony ruch, wysokość rozmowy |
| `ai-test.js` | 26 sprawdzeń trybu AI na atrapie: informacja przed wysłaniem, raty (OC ≠ kredyt), dopytanie, liczby spoza danych, przełącznik, timeout, 500, blokada, 429, brak sieci, brak klucza, zły klucz, brak modelu, region, plik statyczny, brak danych osobowych w zapytaniu, brak klucza w plikach aplikacji, logach i odpowiedziach |
| `ai-a11y.js` | axe-core w 4 stanach trybu AI przy 390, 320 (większy tekst) i 1280 (wymuszone kolory), klawiatura przełącznika |
| `mock-gemini2.mjs` | atrapa Gemini API (nie łączy się z Google) |
| `start-ai.js`, `arkusz.js`, `pola-ui.js`, `pola-koniec.js`, `ai-shots.js` | pomocnicze: pytanie ze Startu w trybie AI, arkusz stanów postaci, zrzuty |

`../logi/` zawiera pełne logi regresji rund 25 i 26 z sesji, w której powstał build `b54aa1f8…`.
`batch-runda-26.sh.txt` to skrypt tamtej pełnej regresji, tylko do wglądu: korzysta też z testów z wcześniejszych rund,
których nie ma w tej paczce, i ze ścieżek środowiska chmurowego.

Testy nie sprawdzają prawdziwego modelu Gemini (brak klucza) ani innych przeglądarek niż Chromium.
