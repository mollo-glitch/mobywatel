# Audyt AI, runda 32 (bez integracji)

Data researchu: **3 listopada 2026**. Ten plik zastępuje `audyt-ai-runda-31.md`: ma układ „opcja po opcji” i nowe ustalenia
dotyczące języka polskiego oraz publicznych projektów.

W tej rundzie nic nie zostało podłączone. Nie dodano kluczy, nie uruchomiono płatnych usług, do żadnego modelu nie trafiły dane.

Oznaczenia:
- **[F]** fakt zweryfikowany w kodzie albo w źródle pierwotnym (dokumentacja lub karta modelu publikowana przez dostawcę);
- **[P]** przypuszczenie albo informacja tylko z wyszukiwarki lub serwisów pośrednich, do potwierdzenia u dostawcy;
- **[?]** niewiadoma.

## Ograniczenia researchu

- **Domeny zablokowane w tej sesji** (nie dało się ich otworzyć ani przez `curl`, ani narzędziem pobierania stron):
  developers.cloudflare.com, www.cloudflare.com, console.groq.com, groq.com, ai.google.dev, huggingface.co,
  platform.publicai.co, mobywatel.mateuszkozlowski.xyz, mollo-glitch.github.io, eli.gov.pl, api.sejm.gov.pl.
- **Cloudflare:** dokumentację czytałem ze źródeł w repozytorium [cloudflare/cloudflare-docs](https://github.com/cloudflare/cloudflare-docs)
  (gałąź `production`). Z niego powstaje developers.cloudflare.com, więc to źródło pierwotne.
- **Karty modeli:** czytałem w repozytoriach twórców na GitHubie (Meta, Qwen, OpenAI, Google DeepMind).
- **Groq i Gemini API:** tylko fragmenty z wyszukiwarki, wszystko oznaczone [P].
- **Repozytoria podobnych projektów:** sklonowane tylko do odczytu. Niczego z nich nie uruchamiałem.

## 1. Stan w aktualnym kodzie [F]

- **Opublikowana wersja nie łączy się z modelem.** To `main` `98106ad` i `gh-pages` `009c9ee`;
  lokalna wersja tej rundy zachowuje się tak samo.
  - Build aplikacji nie ma `<meta name="assistant-endpoint">` (`aplikacja/build.mjs`, w. 87–91), więc asystent działa w trybie
    `static`: w nagłówku rozmowy jest „Model AI niepodłączony” i nic nie jest wysyłane (`aplikacja/src/assistant.js`, w. 1168–1176).
  - Komunikat builda w tej rundzie: „asystent: bez serwera (AI niepodłączone)”.
  - Workflow `.github/workflows/strona.yml` nie ustawia `ASSISTANT_ENDPOINT`.
- **Wcześniejsze testy Workers AI używały atrapy.**
  - Atrapa to `aplikacja/testy/runda-29/atrapa-modelu.mjs`; `asystent-workers-test.js` mówi wprost:
    „To NIE jest test prawdziwego modelu”.
  - Testu prawdziwego modelu (`prawdziwy-model-test.mjs`) nikt nie uruchomił: brak pliku `prawdziwy-model-wynik.json`.
- **Gotowy, niewdrożony serwer.**
  - Pliki: `aplikacja/server/funkcja-serwerowa.mjs` (Cloudflare Worker) i `rdzen.mjs`.
  - Domyślny model: `@cf/google/gemma-4-26b-a4b-it`.
  - Dwie rzeczy do poprawy przed wdrożeniem:
    - wywołanie nie wyłącza „rozumowania” modelu (`chat_template_kwargs.enable_thinking`, domyślnie `true` według katalogu modeli Cloudflare);
    - używa przestarzałego `max_tokens` zamiast `max_completion_tokens`.

## 2. Opcje

### A. Cloudflare Workers AI

**Darmowy limit, konto, przekroczenie [F]:**
- 10 000 neuronów dziennie, wspólnie dla wszystkich modeli; reset o 00:00 UTC.
- Na planie Workers Free nie da się dopłacić. Po wyczerpaniu puli „further operations will fail with an error”, czyli błąd, a nie rachunek.
- Generowanie tekstu: do 300 zapytań na minutę.
- Potrzebne konto Cloudflare na planie Workers Free. Czy trzeba podać kartę: [?].
- Źródła: [pricing](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/platform/pricing.mdx), [limits](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/platform/limits.mdx).

**Język polski (z kart modeli):**

| Model na Workers AI | Polski | Źródło |
|---|---|---|
| `llama-3.3-70b-instruct-fp8-fast` | **Nie [F].** Oficjalnie 8 języków bez polskiego. Meta „strongly discourage[s]” rozmowy w językach spoza listy. | [MODEL_CARD Llama 3.3](https://github.com/meta-llama/llama-models/blob/main/models/llama3_3/MODEL_CARD.md) |
| `llama-4-scout-17b-16e-instruct` | **Nie [F].** Oficjalnie 12 języków bez polskiego. | [MODEL_CARD Llama 4](https://github.com/meta-llama/llama-models/blob/main/models/llama4/MODEL_CARD.md) |
| `gemma-4-26b-a4b-it` (domyślny w kodzie) | **[?]** Karta modelu jest na ai.google.dev (zablokowane). README Gemmy tylko do niej odsyła. Kopia u osób trzecich podaje „35+ języków od razu, 140+ w treningu”. | [google-deepmind/gemma](https://github.com/google-deepmind/gemma) |
| `mistral-small-3.1-24b-instruct` | **[P]** Polski jest wymieniony dla rodziny Mistral Small 3 (2501, kopie karty). Karty 3.1 nie widziałem. | wyszukiwarka, np. [kopia karty 2501](https://huggingface.co/mistralai/Mistral-Small-24B-Base-2501) |
| `qwen3-30b-a3b-fp8` | **[P]** README: „100+ languages and dialects”, polski nie jest wymieniony z nazwy. | [QwenLM/Qwen3](https://github.com/QwenLM/Qwen3) |
| `gpt-oss-20b / 120b` | **[?]** README nie mówi o językach. | [openai/gpt-oss](https://github.com/openai/gpt-oss) |

**Przydatność do wyjaśniania terminów i kroków.**
- **[F] w kodzie projektu:** daty, liczby i źródła sprawdza serwer i aplikacja; model pisze tylko objaśnienie,
  a odpowiedź bez pokrycia w danych jest odrzucana.
- Jakość polszczyzny trzeba zmierzyć gotowym testem 10 pytań, osobno dla każdego modelu.
  Koszt to ok. 300–500 neuronów na model, czyli 3–5% dziennej puli.

**Prompty i odpowiedzi [F]:**
- Treść to „Customer Content”, objęta zerową retencją dla zwykłych zapytań.
- Brak trenowania na niej.
- Przechowywane mogą być tylko metadane operacyjne, bez treści.
- Treść zostaje przechowana, jeśli sami ją zapiszemy (logi, AI Gateway).
- Źródło: [data-usage](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers-ai/platform/data-usage.mdx).

**Połączenie z GitHub Pages [F, kod projektu]:**
- Worker `aplikacja/server/funkcja-serwerowa.mjs` łączy się z modelem przez powiązanie AI konta, więc w Workerze nie ma żadnego klucza.
- Build aplikacji dostaje `ASSISTANT_ENDPOINT=https://…workers.dev/api/assistant`.
  Wymaga to dopisania zmiennej do workflow Pages, czyli zmiany konfiguracji publikacji, na którą potrzebna jest Twoja zgoda.

**Zabezpieczenia i komunikaty.**
- Jest w kodzie [F]:
  - tylko adresy z `DOZWOLONE_ZRODLA` (inne strony dostają 403);
  - limit na IP (Rate Limiting) i limit dzienny;
  - pytanie do 300 znaków, żądanie do 4 KB, odpowiedź do 800 tokenów;
  - po wyczerpaniu puli przerwa do 00:00 UTC;
  - komunikaty w aplikacji: „Model AI niepodłączony”, „AI niedostępne: wyczerpała się dzienna bezpłatna pula… Do HH:MM nie wysyłam pytań”,
    „Nie wysłałem tego pytania do modelu AI…”, błąd dostawcy i limit czasu. Nigdzie nie ma gotowych odpowiedzi udających model.
- Brakuje:
  - wyłączenia rozumowania;
  - zasady „nie logować treści”;
  - ochrony przed skryptem, który podrobi nagłówek `Origin`. Dziś chronią przed nim limit IP, limit dzienny i twardy limit puli;
    można dodać Cloudflare Turnstile (warunki: [?]).

### B. Groq [P]: strony dostawcy zablokowane

**Darmowy limit, konto, przekroczenie:**
- Plan Free z limitami na model (zapytania i tokeny na minutę i na dzień), liczonymi dla całej organizacji.
  Liczby w źródłach pośrednich są sprzeczne.
- Rejestracja na console.groq.com; według forum Groq karta nie jest wymagana.
- Po przekroczeniu błąd 429 z `retry-after`, bez opłat.
- Źródła: [forum Groq: darmowy plan](https://community.groq.com/t/is-there-a-free-tier-and-what-are-its-limits/790), [forum Groq: opłaty](https://community.groq.com/t/do-i-get-charged-for-anything-on-the-groq-free-plan/832), [eesel.ai](https://eesel.ai/blog/groq-pricing), [benchlm.ai](https://benchlm.ai/free-tier/groq).

**Polski:**
- Modele Llama na Groq odpadają z tych samych powodów co w punkcie A [F, karty Meta].
- Qwen3: „100+ języków” [P].
- gpt-oss: [?].

**Prompty i odpowiedzi:**
- Strona [Your data](https://console.groq.com/docs/your-data) wspomina 30-dniową retencję i opcję Zero Data Retention w Data Controls [P].
- Według serwisów pośrednich DPA zakazuje trenowania na danych klientów [P]
  ([meetily.ai](https://meetily.ai/llm-privacy/groq), [standardcompute.com](https://standardcompute.com/providers/groq)).

**Połączenie i zabezpieczenia:**
- Ten sam Worker, klucz Groq jako sekret Workera (`wrangler secret put`), nigdy w HTML, bundlu ani repozytorium.
- Limity i komunikaty jak w punkcie A (kod obsługuje 429 i czas oczekiwania).

### C. Gemini API [P]: strony dostawcy zablokowane

**Darmowy limit, konto, przekroczenie:**
- Limity na projekt i model. Zapytania na dzień resetują się o północy czasu pacyficznego. Liczby w źródłach są sprzeczne.
- Potrzebne konto Google i klucz z AI Studio. Poziom płatny wymaga projektu z aktywnym rozliczeniem, więc odpada.
- Źródło: [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

**Prompty i odpowiedzi:**
- W warunkach z października 2025 dane z poziomu bezpłatnego służą do ulepszania produktów i mogą je czytać ludzie;
  warunki proszą, żeby nie przesyłać danych osobowych.
- Klauzula o EOG się zmieniała:
  - [7.10.2025](https://ai.google.dev/gemini-api/terms-archive/terms_10_07_25): dla użytkowników w EOG wolno używać tylko usług płatnych;
  - [17.10.2025](https://ai.google.dev/gemini-api/terms-archive/terms_10_17_25): w EOG zasady usług płatnych obejmują wszystko.
- Aktualnych [warunków](https://ai.google.dev/terms) nie widziałem w całości.

**Polski:** [P] modele Gemini są wielojęzyczne; karty z listą języków nie czytałem.

**Połączenie:** jak w punkcie B (klucz w sekrecie Workera).

**Ocena:** na poziomie bezpłatnym nie: warunki danych kłócą się z minimalizacją, a płatny wymaga rozliczeń.

### D. Bielik (polski model) przez Public AI albo CloudFerro: znalezione w projekcie mObywatel 2028

**Fakty z kodu [F]:**
- [mateuszkozlowski/mobywatel-2028](https://github.com/mateuszkozlowski/mobywatel-2028), commit `cbed6c7` z 27.10.2026, plik `serwer/polish_ai.py`.
- Model `speakleash/Bielik-11B-v3.0-Instruct` przez `https://api.publicai.co/v1` albo CloudFerro Sherlock
  (`https://api-sherlock.cloudferro.com/openai/v1`); lokalnie Bielik przez Ollamę.
- Klucz w zmiennej środowiskowej serwera (`deploy/.env.example`).

**Koszt i dane [P, według `deploy/README.md` autora, cennik sprawdzony przez niego 26.10.2026]:**
- Public AI: 0,40 USD za milion tokenów wejścia i wyjścia, jednorazowo 2 USD kredytu.
  Autor pisze: „Plan Free określa limit żądań, nie bezpłatne tokeny bez końca”.
- To **usługa płatna** po wykorzystaniu kredytu. Public AI to według autora „zagraniczna usługa badawcza”.

**Polski:** model trenowany z myślą o polskim (SpeakLeash, ACK Cyfronet AGH) [P]. Karty na huggingface.co nie czytałem.

**Ocena:** najlepszy kandydat pod względem polszczyzny, ale **nie jest darmowy**. Wymaga Twojej decyzji o koszcie
(autor tamtego projektu ustawił limit 1 USD miesięcznie).

## 3. Publiczne repozytoria i demonstracje podobnych projektów

| Projekt | AI w kodzie? | Publiczna demonstracja z działającym modelem? |
|---|---|---|
| [mkljczk/mobywatel-ai](https://github.com/mkljczk/mobywatel-ai) (`6ec13a2`, 24.10.2026) | **Tak [F]:** `serwer/agent.py` woła API Anthropic (w. 88), OpenAI Responses (w. 140) albo API zgodne z OpenAI (w. 219); klucze na serwerze. | **Nie [F]:** Pages publikuje tylko `mockup/`; README, w. 36: „Wersja na stronie mobywatel.ai działa bez asystenta AI”. |
| [mateuszkozlowski/mobywatel-2028](https://github.com/mateuszkozlowski/mobywatel-2028) (`cbed6c7`, 27.10.2026) | **Tak [F]:** `serwer/polish_ai.py` (Bielik przez Public AI, CloudFerro albo Ollamę); do tego `serwer/agent.py` z projektu bazowego. | **Deklarowana [P]:** `deploy/README.md` mówi, że wersja pod https://mobywatel.mateuszkozlowski.xyz używa Bielika przez Public AI. Strona jest zablokowana w tej sesji, więc działania nie potwierdziłem. |
| [peszew/GovBot-Hackaton](https://github.com/peszew/GovBot-Hackaton) (`5cccd9e`) | **Brak kodu:** repozytorium ma tylko README i PDF (deklaracja ChatGPT, n8n, Telegram). | Nie. |
| [mgmra/mObywatelChallenge_mgmra](https://github.com/mgmra/mObywatelChallenge_mgmra) (`91d55ea`) | **Nie [F]:** jeden statyczny `index.html` bez wywołań sieciowych. | Nie dotyczy. |
| Oficjalny mObywatel | [P] Według serwisów informacyjnych asystent na modelu PLLuM od 31.12.2025 ([Spider's Web](https://spidersweb.pl/2025/01/mobywatel-czatbot-w-aplikacji-rozmowa.html), [Tabletowo](https://www.tabletowo.pl/?p=1026872)). | Usługa państwowa, nie prototyp. |

Wyszukiwanie na GitHubie (API search/repositories) objęło frazy `mobywatel+ai`, `+challenge`, `+assistant`, `+asystent`, `+chatbot`,
`+llm`, `+gemini`, `+openai`, `bielik+urzad`, `gov+pl+chatbot`. Poza tabelą nie znalazłem projektów z integracją modelu.

## 4. Wnioski do decyzji w osobnej rundzie

1. **Jedyna opcja darmowa i potwierdzona u źródła to Workers AI** (bez klucza w kodzie, bez retencji treści, błąd zamiast rachunku).
   **Słaby punkt to polski:** Llama oficjalnie go nie obsługuje, a dla Gemma 4, Mistral Small 3.1 i Qwen3 obsługa jest niepotwierdzona.
   Przed decyzją trzeba uruchomić test 10 pytań na 2–3 modelach (Gemma 4 z wyłączonym rozumowaniem, Mistral Small 3.1, Qwen3).
2. **Jeśli polszczyzna na Workers AI będzie za słaba,** realną drogą jest Bielik przez Public AI albo CloudFerro, ale to koszt.
   Potrzebna Twoja decyzja o budżecie.
3. **Groq rezerwowo,** po przeczytaniu „Your data” i DPA oraz włączeniu ZDR. Modele Llama na Groq odpadają.
4. **Darmowe Gemini nie.**

**Do potwierdzenia przez odblokowanie domen w ustawieniach sieci środowiska:** wszystkie [P] i [?] z tego raportu.
Lista domen jest w punkcie „Ograniczenia researchu”.
