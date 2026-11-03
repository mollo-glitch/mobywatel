# Audyt AI, runda 31 (bez wdrażania)

Data sprawdzenia wszystkich źródeł: **3 listopada 2026**. Nic nie zostało wdrożone ani podłączone. Nie uruchomiono
żadnej płatnej usługi, a do żadnego modelu nie trafiły żadne dane.

Oznaczenia:
- **[potwierdzone]**: przeczytane w kodzie albo w źródle pierwotnym dostawcy;
- **[niepotwierdzone]**: tylko z wyników wyszukiwarki albo z serwisów pośrednich;
- **[niewiadoma]**: nie udało się tego ustalić.

## 0. Jak sprawdzałem i czego nie mogłem sprawdzić

- **Zablokowane strony dostawców.** Sieć tej sesji blokuje: `developers.cloudflare.com`, `www.cloudflare.com`,
  `console.groq.com`, `groq.com`, `ai.google.dev`, `huggingface.co` i `mollo-glitch.github.io`. Nie dało się ich otworzyć ani
  przez `curl`, ani przez narzędzie pobierania stron.
- **Cloudflare.** Czytałem źródła stron dokumentacji z repozytorium Cloudflare na GitHubie
  (`cloudflare/cloudflare-docs`, gałąź `production`). Z tego repozytorium powstaje developers.cloudflare.com, więc to źródło pierwotne.
- **Groq i Gemini API.** Mam tylko fragmenty z wyszukiwarki i serwisy pośrednie, wszystko oznaczone jako [niepotwierdzone].
  Przed decyzją trzeba to przeczytać na stronach dostawców. Wystarczy odblokować wymienione domeny w ustawieniach sieci środowiska.
- **Repozytoria podobnych projektów.** Sklonowałem je tylko do odczytu i przeczytałem kod. Niczego z nich nie uruchamiałem.

## 1. Stan w aktualnym kodzie

- **[potwierdzone] Opublikowana wersja nie łączy się z modelem.**
  - Opublikowana wersja to `gh-pages` `009c9ee`, zbudowana z `main` `98106ad`; jej pliki są bajt w bajt identyczne z lokalnym buildem.
  - Aplikacja w tej wersji nie ma `<meta name="assistant-endpoint">`, więc działa w trybie `static`:
    w nagłówku rozmowy jest „Model AI niepodłączony” i nic nie jest wysyłane
    (`aplikacja/build.mjs` w. 87–91, `aplikacja/src/assistant.js` w. 1168–1176).
  - Workflow `.github/workflows/strona.yml` nie ustawia `ASSISTANT_ENDPOINT`.
- **[potwierdzone] Dotychczasowe testy Workers AI działały na atrapie.**
  - Testy z rundy 29 korzystały z `aplikacja/testy/runda-29/atrapa-modelu.mjs`.
    Opis w `asystent-workers-test.js` mówi wprost: „To NIE jest test prawdziwego modelu”.
  - Test prawdziwego modelu (`prawdziwy-model-test.mjs`) nigdy nie został uruchomiony: w repozytorium nie ma pliku wyniku
    `prawdziwy-model-wynik.json`.
- **[potwierdzone] Kod serwera jest gotowy, ale nie jest wdrożony.**
  - Pliki: `aplikacja/server/funkcja-serwerowa.mjs` (Cloudflare Worker) i `rdzen.mjs`.
  - Model ustawiony domyślnie: `@cf/google/gemma-4-26b-a4b-it` (`funkcja-serwerowa.mjs` w. 38, `wrangler.toml.example` w. 24).
- **[potwierdzone] Do poprawy przed wdrożeniem: nie wyłączamy „rozumowania” modelu.**
  - Katalog modeli Cloudflare podaje dla tego modelu `reasoning_effort.default_enabled: true` i parametr
    `chat_template_kwargs.enable_thinking` z wartością domyślną `true`.
  - Nasze wywołanie (`rdzen.mjs` w. 230–238) tego nie wyłącza.
  - Używamy też `max_tokens`, który w schemacie modelu jest oznaczony jako przestarzały
    na rzecz `max_completion_tokens`.
  - Ryzyko: tokeny rozumowania zużywają limit 800 tokenów odpowiedzi. JSON może się urwać i aplikacja pokaże
    „odpowiedź nie zgadzała się z danymi”. Rosnie też zużycie neuronów.
  - Poprawka na rundę wdrożenia: `chat_template_kwargs: { enable_thinking: false }` i `max_completion_tokens`.
    Sprawdzić ją na prawdziwym modelu.

## 2. Publiczne repozytoria i demonstracje z asystentem AI w podobnym prototypie

| Projekt | Co potwierdziłem w kodzie | Czy publiczna demonstracja ma działający model |
|---|---|---|
| [mkljczk/mobywatel-ai](https://github.com/mkljczk/mobywatel-ai), commit `6ec13a2` z 24.10.2026; demo: https://mkljczk.github.io/mobywatel-ai/ | **[potwierdzone] Integracja istnieje.** Serwer w Pythonie `serwer/agent.py` woła `https://api.anthropic.com/v1/messages` (w. 88), `https://api.openai.com/v1/responses` (w. 140) albo dowolne API zgodne z OpenAI `/chat/completions` (w. 219). Klucze są tylko w zmiennych środowiskowych serwera (`.env.example`). Front (`mockup/agent.js`) pyta `/api/health` i `/api/agent`. | **Nie [potwierdzone].** Workflow Pages publikuje tylko katalog `mockup/` (`.github/workflows/pages.yml`, w. 27). README, w. 36: „Wersja na stronie mobywatel.ai działa bez asystenta AI (scenariusze ze skryptu)”. Model działa tylko lokalnie i z płatnymi kluczami autora. Samego demo nie otworzyłem (domena zablokowana). |
| [peszew/GovBot-Hackaton](https://github.com/peszew/GovBot-Hackaton), commit `5cccd9e` z 18.02.2026 | W repozytorium jest tylko README i PDF. README deklaruje „ChatGPT 4.5 Preview, ChatGPT 4o mini”, n8n i prototyp na Telegramie. **Kodu integracji nie ma: [niepotwierdzone].** | Brak publicznej demonstracji w repozytorium. |
| Oficjalna aplikacja mObywatel | **[niepotwierdzone, źródła wtórne]** Według serwisów informacyjnych od 31.12.2025 aplikacja ma wirtualnego asystenta na polskim modelu PLLuM, z wiedzą ze stron gov.pl i ograniczonego do spraw urzędowych ([Spider's Web](https://spidersweb.pl/2025/01/mobywatel-czatbot-w-aplikacji-rozmowa.html), [Tabletowo](https://www.tabletowo.pl/?p=1026872), [GeekWeek](https://geekweek.interia.pl/technologia/sztuczna-inteligencja/news-sztuczna-inteligencja-w-mobywatelu-ukonczono-wazny-etap,nId,21398687), [OECD.AI](https://oecd.ai/en/dashboards/policy-initiatives/virtual-assistant-in-m-obywatel)). Strony gov.pl nie sprawdzałem. | Nie dotyczy (to usługa państwowa, nie prototyp). |

**Pozostałe wyszukiwania.** Szukałem na GitHubie fraz `mobywatel+ai`, `+asystent`, `+chatbot`, `+llm`, `+gemini`
i `+openai`. Poza powyższymi nie znalazłem repozytoriów z integracją modelu. Wśród 390 wyników dla samego „mobywatel”
są głównie kopie kodu aplikacji i podróbki dokumentów.

**Wniosek.**
- Nie znalazłem żadnej publicznie wdrożonej demonstracji podobnego prototypu z działającym modelem.
- Najbliższy projekt (mobywatel-ai) świadomie publikuje wersję bez AI. Model ma tylko pełna paczka uruchamiana lokalnie,
  i to na płatnych API.
- Jeżeli Spinka miałaby publiczny model, byłaby w tym wyjątkiem. Trzeba też uważać, żeby nie wyglądała na oficjalnego
  asystenta mObywatela.

## 3. Dostawcy: darmowy limit, konto, zachowanie po przekroczeniu

| | Cloudflare Workers AI | Groq | Gemini API |
|---|---|---|---|
| **Status źródeł** | **[potwierdzone]** w dokumentacji dostawcy (repozytorium cloudflare-docs) | **[niepotwierdzone]**: strona dostawcy zablokowana | **[niepotwierdzone]**: strona dostawcy zablokowana |
| **Darmowy limit** | 10 000 neuronów dziennie, wspólnie dla wszystkich modeli. Reset o 00:00 UTC. Limit zapytań dla generowania tekstu: 300 na minutę. | Limity per model: zapytania na minutę i na dzień, tokeny na minutę i na dzień. Liczą się dla całej organizacji, nie dla klucza. Serwisy pośrednie podają sprzeczne liczby (np. 30/min i 1 000/dzień, ale też 14 400/dzień dla llama-3.1-8b). Aktualne limity widać w console.groq.com/settings/limits. | Limity per projekt i model: zapytania na minutę, tokeny na minutę, zapytania na dzień. Zapytania na dzień resetują się o północy czasu pacyficznego. Liczby w źródłach są sprzeczne (od ok. 500 do 1 000 zapytań dziennie dla modeli „Flash-Lite”). |
| **Po przekroczeniu** | Plan Workers Free: dopłata niemożliwa („N/A – Upgrade to Workers Paid”). Cloudflare pisze: „further operations will fail with an error”. **Nie ma rachunku.** | Błąd 429 z nagłówkiem retry-after, bez opłat (odpowiedź pracownika Groq na forum). | Błąd 429 (zgodne z tym, co obsługuje nasz kod). Szczegóły niepotwierdzone. |
| **Konto i karta** | Konto Cloudflare na planie Workers Free. Czy karta jest potrzebna: [niewiadoma]. Serwisy pośrednie piszą, że tylko do przekroczenia limitu, a to wymaga planu płatnego. | Rejestracja na console.groq.com z potwierdzeniem e-maila. Według forum i serwisów pośrednich karta nie jest wymagana na planie Free. | Konto Google i klucz z AI Studio. Plan płatny („Paid Services”) wymaga projektu z aktywnym rozliczeniem, czyli **odpada** przez zasadę „bez rozliczeń”. |
| **Cena przykładowego modelu** | `@cf/google/gemma-4-26b-a4b-it`: 9 091 neuronów za milion tokenów wejścia i 27 273 za milion tokenów wyjścia ($0,10 i $0,30 za milion). | Nie dotyczy (plan Free). | Nie dotyczy (plan bezpłatny). |

**Szacunek zużycia dla Spinki na Workers AI.** To moje wyliczenie z cennika, do zmierzenia na prawdziwym modelu:
- Pytanie z kontekstem to ok. 2 000 tokenów wejścia, odpowiedź ok. 300 tokenów wyjścia.
- Bez rozumowania: ok. 18 + 8 = **26 neuronów**, czyli ok. **380 pytań dziennie** z darmowej puli.
- Z rozumowaniem (np. dodatkowe 1 000 tokenów): ok. 53 neurony, czyli ok. 190 pytań dziennie.

## 4. Język polski i jakość wyjaśnień

**Gemma 4 26B A4B (model domyślny w kodzie).**
- **[niepotwierdzone]** Kopia karty modelu na stronie osób trzecich mówi o „35+ językach od razu” i treningu na „140+” językach.
- Nie potwierdziłem, że polski jest na liście obsługiwanych języków. Oficjalna karta jest na zablokowanych domenach (ai.google.dev, huggingface.co).
- **[potwierdzone]** Licencja: „Gemma 4 license” (link w katalogu modeli Cloudflare).

**Inne modele na Workers AI.**
- **[potwierdzone]** W cenniku są `@cf/mistralai/mistral-small-3.1-24b-instruct` i `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
  Llama 3.3 70B jest ok. 7 razy droższa w neuronach na token wyjścia.
- Jakość polskiego: [niewiadoma].

**Polskie modele (PLLuM, Bielik).**
- **[potwierdzone]** Nie ma ich w cenniku Workers AI.
- mobywatel-ai pokazuje podłączenie takich modeli przez API zgodne z OpenAI, ale lokalnie (vLLM, Ollama).
  To wymaga własnego serwera z GPU, więc nie pasuje do „bez płatnych usług”.

**Jak to rozstrzygnąć bez zgadywania.**
- Projekt ma gotowy test 10 pytań z oceną dat i źródeł (`aplikacja/testy/runda-29/prawdziwy-model-test.mjs`).
- Proponuję uruchomić go dla 2–3 modeli: Gemma 4 z wyłączonym rozumowaniem, Mistral Small 3.1, Llama 3.3 70B.
  Koszt to ok. 300–500 neuronów na model, czyli 3–5% dziennej darmowej puli.

**Ryzyko błędu modelu jest ograniczone przez projekt.**
- **[potwierdzone]** Daty, liczby i źródła sprawdza serwer i aplikacja (`rdzen.mjs`: liczby i miesiące tylko z rekordu,
  na który odpowiedź się powołuje).
- Model pisze tylko objaśnienie, a odpowiedź bez pokrycia w danych jest odrzucana. Model nie musi więc „znać” terminów;
  musi poprawnie po polsku wyjaśnić to, co jest w rekordzie.

## 5. Gdzie trafiają prompt i odpowiedź; zgoda

**Przepływ w obecnym kodzie [potwierdzone]:**
1. Przeglądarka wysyła dopiero po zgodzie: pytanie (do 300 znaków) i stan demonstracji.
2. Worker na Cloudflare składa kontekst z fikcyjnych rekordów serwera (`server/dane-demo.mjs`).
3. Worker woła model Workers AI w infrastrukturze Cloudflare i dostaje odpowiedź JSON.
4. Worker sprawdza odpowiedź i odsyła ją do przeglądarki.

Przeglądarka nie wysyła rekordów ani danych osobowych (sprawdzał to test na atrapie: `asystent-workers-test.js`).

**Workers AI [potwierdzone, data-usage.mdx]:**
- Wejścia i wyjścia to „Customer Content” w rozumieniu umów Cloudflare.
- **„Zero data retention”**: przy zwykłych zapytaniach treść nie jest przechowywana po obsłużeniu zapytania.
- **„No training”**: Cloudflare nie trenuje modeli na tych treściach.
- Przechowywane mogą być metadane operacyjne, bez treści: identyfikatory, czasy, rozmiary, liczba neuronów, kody błędów.
- Treść jest przechowywana, gdy sami ją zapiszemy: logi aplikacji, logowanie w AI Gateway, magazyny danych.
  Przy wdrożeniu nie wolno logować treści pytań.

**Groq [niepotwierdzone]:**
- Strona „Your data” (console.groq.com/docs/your-data) wspomina standardową 30-dniową retencję i opcję Zero Data Retention w ustawieniach Data Controls.
- Według serwisów pośrednich umowa DPA zakazuje trenowania na danych klientów. Źródła są sprzeczne co do tego, czy ZDR da się włączyć samemu.

**Gemini API, poziom bezpłatny [niepotwierdzone, fragmenty warunków]:**
- W wersjach warunków z października 2025 Google używa treści z „Unpaid Services” do ulepszania produktów i mogą je czytać ludzie.
  Warunki proszą, żeby nie przesyłać danych wrażliwych, poufnych ani osobowych.
- Klauzula o EOG zmieniała się:
  - wersja z 7.10.2025: dla użytkowników w EOG, Szwajcarii i UK wolno używać tylko „Paid Services”;
  - wersja z 17.10.2025: dla EOG zasady „Paid Services” obejmują też poziom bezpłatny.
- Aktualnej treści (wersja od 23.03.2026) nie widziałem w całości.

**Zgoda.**
- Dane w demonstracji są fikcyjne, ale pytanie wpisuje człowiek i może wpisać prawdziwe dane.
- Obecna karta zgody (przed pierwszym wysłaniem) nazywa dostawcę, mówi o limicie 300 znaków i o tym, czego aplikacja nie wysyła.
  Przy Workers AI wystarczy, gdy powie też „nie wpisuj danych osobowych” (to już jest w aplikacji).
- Przy Gemini na poziomie bezpłatnym zgoda musiałaby uprzedzać o możliwym czytaniu treści przez ludzi.
  To przemawia przeciw tej opcji.
- Uwaga: to nie jest opinia prawna. Umowy powierzenia przetwarzania (DPA) Cloudflare w tej rundzie nie czytałem.

## 6. Jak to połączyć z obecnym hostingiem

- Strona i aplikacja są na GitHub Pages (pliki statyczne), więc **nie mogą trzymać klucza**. Potrzebna jest funkcja serwerowa.
- **Workers AI (zalecane)**:
  - Worker `aplikacja/server/funkcja-serwerowa.mjs` z `wrangler.toml` (`DOZWOLONE_ZRODLA = https://mollo-glitch.github.io`).
  - Model przez powiązanie AI konta, więc **w Workerze nie ma żadnego klucza**.
  - Adres: `https://spinka-asystent.<konto>.workers.dev/api/assistant`.
  - Build aplikacji z `ASSISTANT_ENDPOINT=<ten adres>`. Wymaga to dopisania zmiennej do workflow Pages,
    czyli zmiany konfiguracji publikacji, na którą potrzebna jest Twoja zgoda.
- **Groq albo Gemini**: ten sam Worker, a klucz jako sekret Workera (`wrangler secret put`), nigdy w repozytorium, HTML ani bundlu.

## 7. Klucze, nadużycia i komunikat o niedostępności

**Jest w kodzie, ale nie jest wdrożone [potwierdzone]:**
- tylko adresy z `DOZWOLONE_ZRODLA` (CORS i sprawdzenie nagłówka `Origin`), inne strony dostają 403;
- limit na adres IP: powiązanie Rate Limiting `LIMIT_IP` i licznik w pamięci;
- limit dzienny `AI_MAX_PER_DAY`;
- pytanie do 300 znaków, żądanie do 4 KB, odpowiedź do 800 tokenów;
- po kodzie 4006 (wyczerpana pula) przerwa do 00:00 UTC;
- komunikaty w aplikacji:
  - „Model AI niepodłączony”;
  - „AI niedostępne: wyczerpała się dzienna bezpłatna pula… Do HH:MM nie wysyłam pytań”;
  - „Nie wysłałem tego pytania do modelu AI…”;
  - błędy dostawcy i limitu czasu.

  Nigdzie nie ma gotowych odpowiedzi udających model.

**Braki i ryzyka:**
- Nagłówek `Origin` da się podrobić poza przeglądarką (np. curl). Lista adresów chroni przed innymi stronami,
  ale nie przed skryptem. Przed skryptem chronią limit na IP, limit dzienny i twardy limit puli na Workers Free (brak rachunku).
  Dodatkowo można rozważyć Cloudflare Turnstile ([niewiadoma]: warunki darmowe nie były sprawdzane).
- Rozumowanie modelu jest włączone (punkt 1).
- Nie logować treści pytań ani odpowiedzi (punkt 5).

## 8. Rekomendacja na osobną rundę

1. **Cloudflare Workers AI na planie Workers Free.** To jedyna z trzech opcji, której warunki potwierdziłem u źródła:
   - brak klucza w kodzie;
   - brak retencji treści i brak treningu;
   - po wyczerpaniu puli błąd, a nie rachunek.

   Model wybrać po teście 10 pytań. Start: `gemma-4-26b-a4b-it` z wyłączonym rozumowaniem; dla porównania Mistral Small 3.1.
2. **Groq rezerwowo**, po przeczytaniu „Your data” i DPA oraz po włączeniu Zero Data Retention.
3. **Gemini API na poziomie bezpłatnym: nie.**
   - Warunki dla danych z poziomu bezpłatnego (ulepszanie produktów, czytanie przez ludzi) kłócą się z minimalizacją danych.
   - Zasady dla EOG zmieniały się i nie są potwierdzone.
   - Poziom płatny wymaga rozliczeń.

**Co jest potrzebne od Ciebie:**
- konto Cloudflare (Workers Free);
- zgoda na wdrożenie Workera i dodanie `ASSISTANT_ENDPOINT` do budowania;
- do potwierdzenia źródeł odblokowanie domen w ustawieniach sieci środowiska:
  `developers.cloudflare.com`, `www.cloudflare.com`, `console.groq.com`, `groq.com`, `ai.google.dev`, `huggingface.co`.

## 9. Niewiadome

- Czy plan Workers Free wymaga podania karty.
- Czy Gemma 4 oficjalnie obsługuje polski i jak dobrze, w porównaniu z Mistral Small 3.1 i Llama 3.3 70B.
  Potrzebny jest test na prawdziwym modelu.
- Rzeczywiste zużycie neuronów na pytanie w Spince.
- Aktualne limity Groq i Gemini, aktualna klauzula Gemini dla EOG oraz to, czy ZDR w Groq da się włączyć samemu.
- Czy wpis o asystencie PLLuM w oficjalnym mObywatelu jest aktualny (źródła wtórne).
- Jak działa publiczne demo mobywatel-ai (wiem tylko z kodu i README, że jest bez AI).

## Źródła (wszystkie sprawdzone 3.11.2026)

Pierwotne, przeczytane:
- Cloudflare, Workers AI Pricing: [pricing.mdx w cloudflare-docs](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/platform/pricing.mdx); strona: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare, Workers AI Limits: [limits.mdx](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/platform/limits.mdx); strona: https://developers.cloudflare.com/workers-ai/platform/limits/
- Cloudflare, Data usage: [data-usage.mdx](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/platform/data-usage.mdx); strona: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- Cloudflare, katalog modeli: [gemma-4-26b-a4b-it.json](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/workers-ai-models/gemma-4-26b-a4b-it.json), [mistral-small-3.1-24b-instruct.json](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/workers-ai-models/mistral-small-3.1-24b-instruct.json), [llama-3.3-70b-instruct-fp8-fast.json](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/workers-ai-models/llama-3.3-70b-instruct-fp8-fast.json)
- Kod: [mkljczk/mobywatel-ai](https://github.com/mkljczk/mobywatel-ai) (`serwer/agent.py`, `.github/workflows/pages.yml`, `README.md`), [peszew/GovBot-Hackaton](https://github.com/peszew/GovBot-Hackaton) (`README.md`)
- Wyszukiwarka repozytoriów GitHub (API search/repositories), frazy z punktu 2.

Wyniki wyszukiwania (fragmenty, do potwierdzenia u dostawcy):
- Groq: [Your data](https://console.groq.com/docs/your-data), [Privacy Policy](https://groq.com/privacy-policy), [forum: darmowy plan i limity](https://community.groq.com/t/is-there-a-free-tier-and-what-are-its-limits/790), [forum: czy plan Free coś kosztuje](https://community.groq.com/t/do-i-get-charged-for-anything-on-the-groq-free-plan/832), serwisy pośrednie: [eesel.ai](https://eesel.ai/blog/groq-pricing), [benchlm.ai](https://benchlm.ai/free-tier/groq), [meetily.ai](https://meetily.ai/llm-privacy/groq), [standardcompute.com](https://standardcompute.com/providers/groq)
- Gemini API: [Additional Terms (aktualne)](https://ai.google.dev/terms), [archiwum 7.10.2025](https://ai.google.dev/gemini-api/terms-archive/terms_10_07_25), [archiwum 17.10.2025](https://ai.google.dev/gemini-api/terms-archive/terms_10_17_25), [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- Gemma 4: [kopia karty modelu (osoba trzecia)](https://huggingface.co/gsstec322/gemma), [Zilliz FAQ](https://zilliz.com/ai-faq/does-gemma-4-support-multiple-languages)
- Cloudflare (pomocniczo): [flaviocopes.com](https://flaviocopes.com/cloudflare-workers-ai), [costbench.com](https://costbench.com/software/llm-api-providers/cloudflare-workers-ai/free-plan/)
