# Raport rundy 26: Pola i tryb AI (Gemini)

Build: `dist/index.html` MD5 `b54aa1f81547a0f68d21cf972d6280b4`, `dist/artifact.html` MD5 `70f59ccdb5317087dc88559ab188fca8`.
Data: 28.10.2026 (środowisko chmurowe Claude Code). Postać i nazwa „Pola” są w tym buildzie; nazwa nie jest rozstrzygnięta
(patrz `docs/nazwy-asystenta/`). Do czasu wyboru robocza nazwa to „Asystent spraw”.

## Najważniejsze zastrzeżenia

- **Tryb AI nie był testowany z prawdziwym Gemini.** W środowisku nie było `GEMINI_API_KEY`. Wszystkie testy trybu AI używały
  atrapy Gemini API: potwierdzają serwer, sprawdzanie odpowiedzi i obsługę błędów, ale nie jakość odpowiedzi prawdziwego modelu.
  Kontener łączył się z `generativelanguage.googleapis.com` (bez klucza odpowiedź 403 „unregistered callers”).
- **Bezpłatny poziom nie jest do publicznego wdrożenia dla użytkowników w Polsce.** Według fragmentu warunków Gemini API
  z wyników wyszukiwania aplikacja udostępniana użytkownikom w EOG, Szwajcarii lub Wielkiej Brytanii może korzystać tylko
  z usług płatnych. Darmowy poziom nadaje się do lokalnych testów i nagrania pokazu przez autora. Serwer domyślnie słucha
  tylko na 127.0.0.1. To nie jest opinia prawna; strony z warunkami nie udało się otworzyć bezpośrednio.
- **Oficjalna dokumentacja (`ai.google.dev`) była zablokowana przez politykę sieci sesji.** Limity i zasady są znane tylko
  z fragmentów wyników wyszukiwania; liczby w źródłach wtórnych są sprzeczne. Aktualne limity projektu pokazuje Google AI Studio.
- **Czcionki z Google Fonts.** Strona od początku projektu pobiera czcionki z Google Fonts, więc przeglądarka łączy się
  z Google także w trybie statycznym (bez treści rozmów, ale z adresem IP). Przed pokazem publicznym warto podać czcionki lokalnie.

## Wersja i regresja rundy 25

Najnowszy był build rundy 25 (`2199408a…`). Jego pełna regresja przeszła: funkcje 12/12, gesty 6×8/8, 19 skryptów
z poprzednich rund, odpowiedzi asystenta 25/25 identyczne, poprawki rundy 25 40/40, axe 0 naruszeń (21 stanów × 3 konfiguracje),
5 scenariuszy do końca; jedyne uwagi to fałszywe alarmy znane z audytu.

Regresja wykryła usterkę z rundy 25: linia pod imieniem Poli zabierała rozmowie 36 px przy 320×568 i przycisk karty wypadał
z widoku. Linia trafiła obok postaci; rozmowa ma znów co najmniej tyle miejsca co w rundzie 24 (test w `pola-test2.js`).
W trakcie przypadkowo zatrzymałem adapter używany przez sekcję Poli tamtej regresji; sekcję powtórzono osobno: 9/9.

## Pola: wygląd

Problemy poprzedniej wersji: kontur 2,5:1 do bieli (poniżej 3:1 dla grafiki), oczy przy 34 px jak kropki, czerwona zakładka
znikała w 3 z 5 stanów, strzałka „następny krok” zasłaniała oko, przechylona kartka przy „ostrzega” wyglądała jak błąd.

Zmiany: obrys `--muted` (7:1 do bieli, 6,3:1 do tła); zakładka wystaje nad kartkę i jest widoczna w każdym stanie; twarz
z dużymi oczami i ustami zależnymi od stanu, brwi tylko przy „ostrzega”, oczy jak łuki przy „gotowe”; stan pokazuje jedna
odznaka w prawym dolnym rogu (znaki co najmniej 5,9:1, bursztynowa odznaka z ciemnym obrysem). Ruch 200–250 ms, fale
3 razy, jedno mrugnięcie; przy ograniczonym ruchu bez animacji. Miejsca bez zmian: nagłówek Asystenta (44 px), pole na Starcie
(34 px, poniżej 360 px celowo ukryte), ekran „Gotowe” (58 px). Materiały: `zrzuty/runda-26/01–03`.

## Tryb AI

- Model domyślny `gemini-3.1-flash-lite` (`GEMINI_MODEL`); serwer przy starcie sprawdza, czy model istnieje.
- Klucz tylko na serwerze: `.env` (w `.gitignore`) albo zmienna środowiskowa. Nigdy w przeglądarce, HTML, odpowiedziach API ani logach.
- Przed pierwszym pytaniem do modelu widoczna informacja, że treść trafia do Google. Pod imieniem przełącznik „Tryb AI”
  (`role="switch"`); pasek prototypu mówi „pytania trafiają do Google” albo „nic nie jest wysyłane”.
- Do modelu idzie tylko wpisane pytanie i fikcyjny kontekst demo (tytuły, terminy, statusy, możliwe kwoty), bez imienia,
  PESEL-u, adresu, numerów dokumentów, tablicy i polisy. Poprzednie pytanie tylko przy odpowiedzi na dopytanie modelu.
- Odpowiedź (JSON wg schematu: krótko, wiem ze źródłami, nie wiem, dalej, dopytanie) sprawdzana na serwerze i w przeglądarce:
  źródła i akcje z listy, każda liczba musi być w danych demo, bez „wysłałem/złożyłem”, bez linków i danych kontaktowych.
- Każdy błąd kończy się odpowiedzią z reguł i komunikatem: brak klucza, zły klucz, brak modelu, region, 429 (przerwa do
  godziny z RetryInfo), brak sieci, timeout, błąd dostawcy, odpowiedź niezgodna z danymi; drugi błąd z rzędu wstrzymuje AI na 2 min.
- Serwer wysyła stronę z CSP `connect-src 'self'` (wyjątek: czcionki Google Fonts).

## Testy na buildzie b54aa1f8 (pełna regresja w `testy/logi/regresja-runda-26.log`)

| Zakres | Wynik |
|---|---|
| Funkcje 320/360/390/1280 × 3 tryby | 12/12, wartości jak w rundzie 25 |
| Gesty karuzeli, rozmowa 320 px, wskaźnik zakładek, machnięcie | bez zmian względem rundy 25 |
| 19 skryptów regresji z rund 9–20 (w tym `r20/states` na nowym serwerze AI), a11y 54 OK, fit 84 OK, parity 0 różnic | przeszły |
| Odpowiedzi asystenta w trybie regułowym | 25/25 identyczne z rundą 25 |
| Rundy 22–24 (profil, wiadomości, koperta, niebieskie elementy, dokumenty 13 konfiguracji, macierz 12 przebiegów) | przeszły |
| Poprawki rundy 25 | 40/40 |
| Pola | 9/9 |
| Tryb AI (atrapa Gemini) | 26/26 |
| Skrypty audytu: 298 stanów ekranów (0 błędów konsoli i strony), kliknięcia 221 elementów, klawiatura, axe 0 naruszeń (21 × 3), 5 scenariuszy, formularze, długie ciągi 0 px w bok, kontrast 0/36, czytnik | jak w rundzie 25; uwagi = fałszywe alarmy z audytu |
| Dostępność trybu AI (osobno, ten sam build) | 8/8 |
| Wyciek klucza testowego (pliki aplikacji, logi serwera, 33 odpowiedzi w przeglądarce) | nie znaleziono |
| `.gitignore` (tymczasowe repozytorium) | `.env` ignorowany, `.env.example` śledzony |

Ograniczenia: tylko headless Chromium; dotyk i wymuszone kolory emulowane; bez Safari/iOS, Firefoksa, prawdziwego czytnika
ekranu i prawdziwego modelu. Sprawdzanie liczb nie wykryje pomylenia OC z kredytem, jeśli model nie poda żadnej liczby.

## Źródła (wyszukiwanie 28.10.2026)

- Warunki Gemini API: https://ai.google.dev/gemini-api/terms (fragmenty z wyników wyszukiwania; strona niedostępna z sesji)
- Limity: https://ai.google.dev/gemini-api/docs/rate-limits (jw.)
- Wątek o „only Paid Services” w EOG: https://discuss.ai.google.dev/t/clarification-on-only-paid-services-for-eea-ch-uk/107860
