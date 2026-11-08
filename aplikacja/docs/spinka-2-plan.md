# Spinka 2.0: audyt i plan wdrożenia

Stan wyjściowy: gałąź `wyglad-strony`, commit `ea8db01` (opublikowany na GitHub Pages 4.11.2026).
Stos zostaje: aplikacja to czysty HTML, CSS i JavaScript składany przez `build.mjs` w jeden plik `dist/index.html`,
bez frameworka i bez zależności w przeglądarce. Nowe moduły to kolejne pliki w `src/` dołączane przez `build.mjs`.

## Etap 1: audyt (8.11.2026)

Sprawdzone: struktura repozytorium, wszystkie ekrany (`SCREENS` w `src/app.js`), silnik scenariuszy
(`src/assistant.js`), dane (`src/data.js`), regresja rundy 25 (40/40 na bieżącym buildzie), zrzuty 390, 768 i 1280 px.

Co działa dobrze i zostaje:
- koperty „Do załatwienia” z terminem napisanym wprost, pismo „po ludzku” i oryginał, słowniczek;
- pięć scenariuszy rozmowy z podsumowaniem przed zmianą, „da się cofnąć”, uczciwym końcem („nic nie wysłano”);
- portfel i karuzela dokumentów, szczegóły z maskowaniem numerów;
- „Kto ma dostęp do moich danych” z cofaniem dostępu;
- asystent AI tylko przez serwer projektu, z kontrolą źródeł i liczb; bez serwera mówi to wprost;
- rozmiar tekstu (3 stopnie), ograniczenie animacji, wyraźniejsze kontury, obsługa klawiatury, czytnik.

Braki względem briefu Spinka 2.0:
1. Start nie jest centrum spraw: brak priorytetu według pilności i skutków, płatności, centrum powiadomień,
   wskaźnika bezpieczeństwa, szybkich działań i dokumentów powiązanych ze sprawami.
2. Bez modelu AI asystent nie pomaga przy pytaniach spoza 5 scenariuszy (np. narodziny dziecka, działalność
   gospodarcza, „czy mam niezałatwione sprawy”). Stany asystenta nie są nazwane na ekranie.
3. Brak kreatorów spraw („Załatw za mnie”): formularzy z walidacją, wersji roboczych, kosztów, statusu.
4. Brak skrzynki dokumentów: importu PDF/zdjęcia, rozpoznania (OCR), terminów, przypisania do sprawy.
5. Brak kalendarza obywatela (terminy są rozproszone w kopertach, dokumentach i sprawach).
6. Bezpieczeństwo ograniczone do zgód: brak sesji, ostrzeżeń, centrum aktualizacji, stanu usług, odzyskiwania.
7. Brak trybu rodzinnego i koncepcji Europejskiego Portfela Tożsamości Cyfrowej (eIDAS 2.0).
8. Dostępność: brak trybu wysokiego kontrastu i trybu uproszczonego.
9. Nawigacja: zakładka Profil mieści tylko profil i ustawienia, nowe moduły nie mają miejsca.
10. Tablet: aplikacja jest pokazywana w ramce telefonu także przy 768 px (świadomy wybór prezentacji).

Nie sprawdzone w tej sesji (blokada sieci): mobywatel.ai, gov.pl, bezprawnik.pl, 60fps.design.
Inspiracje ruchu i układu opierają się na ogólnych zasadach projektowania mobilnego, nie na tych stronach.

## Plan i kolejność

| Etap | Zakres | Pliki |
|---|---|---|
| 2. Fundament | rejestr ekranów i akcji modułów, magazyn stanu z wersją i zapisem lokalnym, komponenty (karta, pigułka, pasek postępu, pole z walidacją, arkusz dolny, pusty stan, znak „Symulacja”), zakładka „Więcej” | `src/ds.js`, `src/stan.js`, `src/app.js` (punkty rozszerzeń) |
| 3. Centrum spraw | nagłówek z powitaniem, datą, powiadomieniami i wskaźnikiem bezpieczeństwa; „Wymaga Twojej uwagi” z wyjaśnieniem priorytetu; „Twoje sprawy” z paskiem postępu; szybkie działania; dokumenty pogrupowane i powiązane ze sprawami; wyszukiwarka | `src/centrum.js` |
| 4. Spinka | tryb demonstracyjny bez modelu: odpowiedzi tylko z danych aplikacji i opisów procesów, ze źródłem, niepewnością i kolejnym krokiem; 9 nazwanych stanów; przejście do formularza | `src/spinka-demo.js`, `src/assistant.js` |
| 5. Usługi | silnik kreatora i 10 procesów (wyjaśnienie, dokumenty, autouzupełnianie, formularz z walidacją, koszty, wersja robocza, podsumowanie, potwierdzenie, status symulacji); skrzynka z symulacją OCR; kalendarz | `src/uslugi.js`, `src/skrzynka.js`, `src/kalendarz.js` |
| 6. Bezpieczeństwo i przyszłość | centrum bezpieczeństwa, rodzina z uprawnieniami, portfel EU (koncepcja) | `src/bezpieczenstwo.js`, `src/rodzina.js`, `src/portfel-eu.js` |
| 7. Ruch | tokeny czasu i krzywych, arkusze, paski postępu, sukces, karty; wszystko wyłączane przy ograniczonym ruchu | `src/styles.css`, `src/spinka2.css` |
| 8. Testy | nowe testy procesów i dostępności, regresja rundy 25, testy strony | `testy/spinka-2/` |

Zasady obowiązujące we wszystkich modułach:
- dane osób, spraw, płatności i dokumentów są fikcyjne; każda symulacja ma widoczne oznaczenie;
- nic nie udaje połączenia z urzędem ani oficjalnego potwierdzenia (brak UPO, pieczęci, numerów nadania);
- asystent nie wymyśla terminów, podstaw prawnych ani statusów: terminy liczy aplikacja z danych, opisy procesów
  są ogólne i oznaczone „sprawdź aktualne zasady na gov.pl”; gdy czegoś nie ma w danych, mówi to wprost;
- terminy przewidywane (np. przypomnienie o wymianie dokumentu) są oznaczone jako niewiążące;
- stan usług i bezpieczeństwa dotyczy wyłącznie prototypu; brak komunikatów o prawdziwej infrastrukturze.

## Wynik (8.11.2026)

Zrobione etapy 1–8. Szczegóły modułów: `README.md`, sekcja „Spinka 2.0”.

Działa na danych fikcyjnych i jest oznaczone jako symulacja albo koncepcja:
- kreatory „Załatw za mnie” (nic nie trafia do urzędu; status i przewidywany termin to symulacja, termin oznaczony jako niewiążący);
- płatności (bez banku, bez danych karty), podpis zgody rodzica, zakończenie sesji, weryfikacja w portfelu EU;
- OCR na trzech przykładowych pismach (własny plik: tylko podgląd, treść nie jest odczytywana);
- tryb demonstracyjny Spinki (rozpoznanie słów kluczowych, odpowiedzi tylko z danych aplikacji i opisów procesów).

Wymagałoby prawdziwej integracji: logowanie i tożsamość (węzeł krajowy / aplikacja), rejestry (PESEL, USC, CEIDG,
CEPiK, rejestr dowodów), e-Doręczenia i skrzynka pism, płatności (bramka, Płatności w aplikacji), OCR (usługa lub model
na urządzeniu), kalendarz terminów z systemów dziedzinowych, powiadomienia push, model AI przez serwer z polityką danych,
portfel EU zgodny z ARF i weryfikacją podpisów wystawców, stan usług i informacje o certyfikatach z prawdziwych źródeł.

Poprawka po przeglądzie zrzutów: na kroku „Dane” sześciu kreatorów fokus klawiatury chował się pod przyklejonym paskiem
„Wstecz / Dalej” (6 z 29 pól całkowicie, 2 częściowo; WCAG 2.2, 2.4.11). `ds.js` mierzy teraz pasek po każdym przeniesieniu
fokusu i dosuwa ekran; test procesów sprawdza to przy standardowym i największym tekście.

Testy (build aplikacji `fe870d5d`): Spinka 2.0 58/58, godło 40/40, asystent z atrapą Workers AI 12/12. Pozostałe
(regresja rundy 25, strona, otwarcie, ścieżki, stopka) dopisane w następnym commicie po zakończeniu przebiegu.
