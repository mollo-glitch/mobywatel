// Runda 29: testy serwera asystenta BEZ prawdziwego modelu (atrapa: runda-29/atrapa-modelu.mjs).
//   node serwer-test.mjs <port atrapy>
// Sprawdza: kontekst tylko z rekordów serwera, stan demonstracji (bez/przypomnienia/sprawy), limity długości,
// Workers AI przez REST i przez powiązanie (jak w funkcji Cloudflare), błędy dostawcy, funkcję serwerową (Origin, limity).
// To NIE jest test prawdziwego modelu: ten jest w prawdziwy-model-test.mjs i wymaga dostępu do konta.
import { answer, check, wyjmijJson, LIMITY, AiError } from '../../server/rdzen.mjs';
import { zastosujStan, stanCzysty } from '../../server/kontekst.mjs';
import DANE from '../../server/dane-demo.mjs';
import worker from '../../server/funkcja-serwerowa.mjs';

const PM = process.argv[2] || '8697';
const MOCK = 'http://127.0.0.1:' + PM;
const R = []; const ok = (co, w, sz) => { R.push({ co, ok: !!w }); console.log((w ? '✓ ' : '✗ ') + co + (sz ? ' | ' + sz : '')); };
const last = async () => (await (await fetch(MOCK + '/__last')).json()).last;
const REST = { provider: 'workers-ai', providerName: 'Cloudflare Workers AI', token: 'test-token-atrapa', accountId: 'konto-testowe', base: MOCK + '/client/v4', model: '@cf/google/gemma-4-26b-a4b-it', timeoutMs: 8000, name: 'Spinka', dane: DANE };

// --- dane i kontekst
const ids = DANE.zrodla.map((z) => z.id);
ok('dane serwera: fikcyjne rekordy z datą pokazową, bez PESEL-u, tablic i numeru polisy', DANE.dzis === '2026-10-26' && ids.includes('todo:oc') && ids.includes('todo:pismo-us') && !/85031412345|WX.?12345|OC\/\d{4}\/\d+|ABC 123456/.test(JSON.stringify(DANE)), ids.length + ' rekordów');
const oc = DANE.zrodla.find((z) => z.id === 'todo:oc');
ok('termin OC policzony kodem: 04.11.2026, za 9 dni', oc.fakty.some((f) => /04\.11\.2026.*za 9 dni/.test(f)));
const pismo = DANE.zrodla.find((z) => z.id === 'todo:pismo-us');
ok('termin pisma policzony kodem: 07.11.2026, za 12 dni', pismo.fakty.some((f) => /07\.11\.2026.*za 12 dni/.test(f)));
const s1 = stanCzysty({ bez: ['todo:oc', 'todo:nieznane', 'doc:dowod', 7], przypomnienia: { 'todo:oc': '2026-11-02', 'todo:pismo-us': '2027-01-01', 'todo:gmina': '2026-11-01', 'doc:dowod': '2026-11-01' }, sprawy: [{ id: 'oc', status: 'Zakończona w demonstracji' }, { id: 'oc', status: 'Przerwana rozmowa' }, { id: 'zmyslona', status: 'Zakończona w demonstracji' }, { id: 'portfel', status: 'Wysłano do BIK' }, { id: 'dane-bank', status: 'Zakończona w demonstracji' }] }, DANE);
ok('stan z przeglądarki: tylko znane id, daty w zakresie, statusy z listy', JSON.stringify(s1) === JSON.stringify({ bez: ['todo:oc'], przypomnienia: { 'todo:oc': '2026-11-02' }, sprawy: [{ id: 'oc', status: 'Zakończona w demonstracji' }, { id: 'dane-bank', status: 'Zakończona w demonstracji' }] }), JSON.stringify(s1));
const k1 = zastosujStan(DANE, { bez: ['todo:oc'], przypomnienia: { 'todo:pismo-us': '2026-11-04' }, sprawy: [{ id: 'oc', status: 'Zakończona w demonstracji' }, { id: 'nowy-dowod', status: 'Zakończona w demonstracji' }] });
const kOc = k1.zrodla.find((z) => z.id === 'case:oc'); const kDowod = k1.zrodla.find((z) => z.id === 'case:nowy-dowod');
ok('kontekst ze stanu: załatwiona pozycja znika, przypomnienie jako fakt, sprawy z tytułem z serwera', !k1.zrodla.some((z) => z.id === 'todo:oc') && k1.zrodla.find((z) => z.id === 'todo:pismo-us').fakty.includes('Przypomnienie ustawione na 04.11.2026') && kOc && kOc.tytul === 'Zmiana ubezpieczyciela OC' && kDowod.fakty[0] === 'Status: Zakończona w demonstracji' && !kDowod.fakty.some((f) => /Etap/.test(f)));

// --- answer() przez Workers AI REST
await fetch(MOCK + '/__reset', { method: 'POST' });
let r = await answer(REST, { pytanie: 'Kiedy kończy się moja polisa OC?', kontekst: { dzis: '2030-01-01', zrodla: [{ id: 'todo:oc', rodzaj: 'termin', tytul: 'Polisa', fakty: ['Polisa OC kończy się: 01.01.2031'] }] }, stan: {} });
let L = await last();
ok('Workers AI (REST): pytanie o polisę → odpowiedź z datą 04.11.2026 i źródłem todo:oc', r.code === 200 && /04\.11\.2026/.test(JSON.stringify(r.body.odpowiedz)) && r.body.odpowiedz.wiem[0].zrodla[0] === 'todo:oc', r.code + ' ' + (r.body.odpowiedz ? r.body.odpowiedz.krotko : JSON.stringify(r.body)));
ok('kontekst przysłany przez przeglądarkę jest ignorowany: model dostał rekordy serwera (dziś 2026-10-26)', L.payload.kontekst.dzis === '2026-10-26' && !/01\.01\.2031/.test(JSON.stringify(L.payload)));
ok('zapytanie do dostawcy: JSON Mode ze schematem, max_tokens ' + LIMITY.maxTokens + ', model gemma-4', L.schema && L.max_tokens === LIMITY.maxTokens && /gemma-4/.test(L.model), (L.bytes / 1024).toFixed(1) + ' KB');
r = await answer(REST, { pytanie: 'Ile mam czasu na odpowiedź?', stan: {} });
ok('„Ile mam czasu na odpowiedź?” → termin pisma 07.11.2026 ze źródłem pisma, nie OC', r.code === 200 && /07\.11\.2026/.test(JSON.stringify(r.body.odpowiedz.wiem)) && r.body.odpowiedz.wiem.every((w) => w.zrodla.includes('todo:pismo-us')));
r = await answer(REST, { pytanie: 'raty?', stan: {} });
ok('„raty?” → dopytanie (kredyt czy składka OC)', r.code === 200 && r.body.odpowiedz.rodzaj === 'dopytanie' && /kredyt/i.test(r.body.odpowiedz.pytanie));
for (const [tag, co] of [['#zla-data', 'data pisma podana jako koniec OC'], ['#zmyslone-raty', 'wymyślone raty i kwota'], ['#bik', 'udawane sprawdzenie w BIK'], ['#pesel', 'PESEL w odpowiedzi'], ['#wyslalem', 'udawane wysłanie']]) {
  r = await answer(REST, { pytanie: 'Kiedy kończy się polisa? ' + tag, stan: {} });
  ok('zła odpowiedź modelu odrzucona: ' + co, r.code === 502 && r.body.error === 'invalid', r.why);
}
r = await answer(REST, { pytanie: 'Kiedy kończy się polisa OC? #tekst', stan: {} });
ok('odpowiedź jako tekst w bloku ```json``` też jest czytana i sprawdzana', r.code === 200);
r = await answer(REST, { pytanie: 'x'.repeat(LIMITY.pytanie + 1), stan: {} });
ok('pytanie dłuższe niż ' + LIMITY.pytanie + ' znaków: 413 bez wysyłania do modelu', r.code === 413 && r.body.error === 'too_long');
const before = (await (await fetch(MOCK + '/__last')).json()).count;
r = await answer(REST, { pytanie: '   ', stan: {} });
ok('puste pytanie: 400 bez wysyłania', r.code === 400 && (await (await fetch(MOCK + '/__last')).json()).count === before);
for (const [tag, kind] of [['#limit-dzienny', 'limit_dzienny'], ['#429', 'limit'], ['#500', 'provider'], ['#json-niespelniony', 'invalid']]) {
  let e = null; try { await answer(REST, { pytanie: 'Kiedy kończy się polisa? ' + tag, stan: {} }); } catch (x) { e = x; }
  ok('błąd dostawcy ' + tag + ' → ' + kind + (kind === 'limit_dzienny' ? ' (przerwa do 00:00 UTC)' : ''), e instanceof AiError && e.kind === kind && (kind !== 'limit_dzienny' || (e.retryAfter > 0 && e.retryAfter <= 86400)), e && e.kind + ' ' + e.retryAfter);
}
{ let e = null; try { await answer(Object.assign({}, REST, { token: 'zly' }), { pytanie: 'Kiedy kończy się polisa?', stan: {} }); } catch (x) { e = x; } ok('zły token → bad_key', e && e.kind === 'bad_key'); }
{ let e = null; try { await answer(Object.assign({}, REST, { model: '@cf/test/paid-only-model' }), { pytanie: 'Kiedy kończy się polisa?', stan: {} }); } catch (x) { e = x; } ok('model tylko dla Workers Paid → model_unavailable', e && e.kind === 'model_unavailable'); }
ok('wyjmijJson: obiekt, OpenAI choices, tekst z <think>', wyjmijJson({ response: { a: 1 } }).a === 1 && wyjmijJson({ choices: [{ message: { content: '{"a":2}' } }] }).a === 2 && wyjmijJson({ response: '<think>…</think> {"a":3}' }).a === 3);

// --- funkcja serwerowa Cloudflare z powiązaniem AI (atrapa powiązania przekazuje zapytanie do atrapy REST)
const fakeAi = { run: async (model, payload) => {
  const res = await fetch(MOCK + '/client/v4/accounts/x/ai/run/' + model, { method: 'POST', headers: { Authorization: 'Bearer test-token-atrapa', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const j = await res.json();
  if (!j.success) throw new Error(j.errors.map((x) => x.code + ': ' + x.message).join('; '));
  return j.result;
} };
let limitCalls = 0;
const env = { AI: fakeAi, DOZWOLONE_ZRODLA: 'https://mollo-glitch.github.io', AI_MAX_PER_MINUTE: '3', LIMIT_IP: { limit: async () => ({ success: ++limitCalls <= 5 }) } };
const ORIGIN = 'https://mollo-glitch.github.io';
const call = (path, init, e) => worker.fetch(new Request('https://spinka.example.workers.dev' + path, init), e || env);
let w = await call('/api/assistant/status', { headers: { Origin: 'https://obca-strona.example' } });
ok('funkcja: obca strona dostaje 403', w.status === 403);
w = await call('/api/assistant/status', { headers: { Origin: ORIGIN } });
let j = await w.json();
ok('funkcja: status z dozwolonej strony: Workers AI, model gemma-4-26b-a4b-it, plan free, CORS', j.mode === 'ai' && j.provider === 'Cloudflare Workers AI' && j.model === 'gemma-4-26b-a4b-it' && w.headers.get('Access-Control-Allow-Origin') === ORIGIN, JSON.stringify(j));
w = await call('/api/assistant/status', { headers: { Origin: ORIGIN } }, Object.assign({}, env, { AI: undefined }));
ok('funkcja bez powiązania AI: status „off” (no_key), bez udawania', (await w.json()).mode === 'off');
const post = (body, extra) => call('/api/assistant/answer', { method: 'POST', headers: Object.assign({ Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' }, extra || {}), body: typeof body === 'string' ? body : JSON.stringify(body) });
w = await post({ pytanie: 'Kiedy kończy się moja polisa OC?', stan: {} });
j = await w.json();
ok('funkcja + powiązanie AI: odpowiedź z datą OC i źródłem', w.status === 200 && /04\.11\.2026/.test(JSON.stringify(j.odpowiedz)), w.status);
w = await post('{"pytanie":"' + 'a'.repeat(5000) + '"}');
ok('funkcja: zapytanie > 4 KB → 413', w.status === 413);
w = await post({ pytanie: 'Kiedy kończy się polisa?', stan: {} }); w = await post({ pytanie: 'Kiedy kończy się polisa?', stan: {} });
w = await post({ pytanie: 'Kiedy kończy się polisa?', stan: {} }); j = await w.json();
ok('funkcja: 4. pytanie z tego samego IP w minucie → 429 local_limit (bez pytania modelu)', w.status === 429 && j.error === 'local_limit', JSON.stringify(j));
limitCalls = 5; // następne wywołanie limitera Cloudflare odmówi
w = await post({ pytanie: 'Kiedy kończy się polisa?', stan: {} }, { 'CF-Connecting-IP': '203.0.113.8' }); j = await w.json();
ok('funkcja: limit Cloudflare (powiązanie LIMIT_IP) odmawia → 429', w.status === 429 && j.error === 'local_limit' && limitCalls > 5, 'wywołań limitera: ' + limitCalls);
limitCalls = 0;
w = await post({ pytanie: 'Kiedy kończy się polisa? #limit-dzienny', stan: {} }, { 'CF-Connecting-IP': '203.0.113.9' });
j = await w.json();
ok('funkcja: wyczerpana dzienna pula → 429 limit_dzienny', w.status === 429 && j.error === 'limit_dzienny' && j.retryAfter > 0, JSON.stringify(j));
w = await call('/api/assistant/status', { headers: { Origin: ORIGIN } }); j = await w.json();
ok('funkcja: status pokazuje przerwę i jej powód (dla komunikatu „AI niedostępne”)', j.pausedFor > 0 && j.pauseKind === 'limit_dzienny');
w = await post({ pytanie: 'Kiedy kończy się polisa?', stan: {} });
ok('funkcja w przerwie nie pyta modelu (429)', w.status === 429);

const zle = R.filter((x) => !x.ok).length; console.log('RAZEM ' + R.length + ' | nieudane ' + zle); process.exit(zle ? 1 : 0);
