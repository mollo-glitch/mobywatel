// Atrapa modelu AI do testów rundy 29: Cloudflare Workers AI (REST API: /client/v4/accounts/:konto/ai/run/:model)
// oraz Gemini API (models.get, generateContent). NIE łączy się z żadnym dostawcą i NIE sprawdza jakości prawdziwego modelu:
// odpowiada według prostych reguł z kontekstu, który dostał od serwera projektu, żeby sprawdzić przepływ, walidację,
// limity i interfejs. Specjalne znaczniki w pytaniu wywołują błędy i złe odpowiedzi (#zla-data, #limit-dzienny, …).
// Dane dostępowe atrapy (nie są prawdziwe): token „test-token-atrapa”, klucz Gemini „test-klucz-atrapa-0000”.
import http from 'node:http';
const PORT = Number(process.argv[2] || 8697);
const TOKEN = 'test-token-atrapa';
const KEY = 'test-klucz-atrapa-0000';
let last = null, count = 0;
const src = (ctx, id) => (ctx.zrodla || []).find((z) => z.id === id);
const factOf = (ctx, id, label) => { const z = src(ctx, id); const f = z && z.fakty.find((x) => x.startsWith(label)); return f ? f.slice(label.length).trim() : null; };
const firstDate = (s) => (String(s || '').match(/\d{2}\.\d{2}\.\d{4}/) || [null])[0];
const daysIn = (s) => (String(s || '').match(/za (\d+) dni|za (1) dzień/) || []).slice(1).find(Boolean);

function reply(q, ctx, earlier) {
  const oc = firstDate(factOf(ctx, 'todo:oc', 'Polisa OC kończy się:')) || firstDate(factOf(ctx, 'doc:pojazd', 'OC ważne do:'));
  const ocDni = daysIn(factOf(ctx, 'todo:oc', 'Polisa OC kończy się:'));
  const pismo = firstDate(factOf(ctx, 'todo:pismo-us', 'Termin odpowiedzi:') || factOf(ctx, 'todo:pismo-us', 'Termin:'));
  const pismoDni = daysIn(factOf(ctx, 'todo:pismo-us', 'Termin odpowiedzi:') || factOf(ctx, 'todo:pismo-us', 'Termin:'));
  const none = (k) => ({ rodzaj: 'odpowiedz', krotko: k, wiem: [], nie_wiem: ['Tego tematu nie ma w danych aplikacji.'], dalej: [], pytanie: '', opcje: [] });
  if (earlier && /kredyt/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Nie wiem, ile rat zostało: w danych aplikacji nie ma kredytu ani leasingu.', wiem: [{ tekst: 'Jest tylko polisa OC Toyoty Yaris, ważna do ' + oc + '. To ubezpieczenie, nie kredyt.', zrodla: ['todo:oc'] }], nie_wiem: ['Czy masz kredyt albo leasing, ile rat zostało i jaka jest rata.'], dalej: [{ tekst: 'Sprawdź umowę albo aplikację banku.', akcja: 'brak' }], pytanie: '', opcje: [] };
  if (/#zla-data/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Polisa OC kończy się ' + pismo + '.', wiem: [{ tekst: 'Polisa OC Toyoty Yaris kończy się ' + pismo + '.', zrodla: ['todo:oc'] }], nie_wiem: [], dalej: [], pytanie: '', opcje: [] };
  if (/#zmyslone-raty/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Zostało Ci 14 rat po 650 zł.', wiem: [], nie_wiem: [], dalej: [], pytanie: '', opcje: [] };
  if (/#bik/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Sprawdziłem w BIK: nie masz zaległości.', wiem: [], nie_wiem: [], dalej: [], pytanie: '', opcje: [] };
  if (/#data-bez-zrodla/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Termin mija ' + pismo + '.', wiem: [], nie_wiem: [], dalej: [], pytanie: '', opcje: [] };
  if (/polis|\boc\b/i.test(q) && /kiedy|koniec|kończy|ważn/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Twoja polisa OC Toyoty Yaris kończy się ' + oc + (ocDni ? ', czyli za ' + ocDni + ' dni' : '') + '.', wiem: [{ tekst: 'Polisa OC Toyoty Yaris: koniec ' + oc + '.', zrodla: ['todo:oc'] }], nie_wiem: ['Czy ubezpieczyciel przedłuży umowę sam: to zależy od umowy, której nie ma w danych.'], dalej: [{ tekst: 'Zobacz, co możesz zrobić przed końcem polisy.', akcja: 'scenariusz:oc' }, { tekst: 'Otwórz sprawę w „Do załatwienia”.', akcja: 'otworz:todo:oc' }], pytanie: '', opcje: [] };
  if (/ile czasu|do kiedy|odpowied/i.test(q) && !/polis|oc\b/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Na odpowiedź na wezwanie z urzędu skarbowego masz czas do ' + pismo + (pismoDni ? ' (za ' + pismoDni + ' dni)' : '') + '.', wiem: [{ tekst: 'Wezwanie do złożenia wyjaśnień: termin ' + pismo + '.', zrodla: ['todo:pismo-us'] }], nie_wiem: ['Kiedy dokładnie odebrałeś pismo: termin liczy się od dnia odbioru.'], dalej: [{ tekst: 'Zobacz, jak odpowiedzieć na pismo.', akcja: 'scenariusz:pismo' }], pytanie: '', opcje: [] };
  if (/^\s*(raty|ile rat)\s*\??\s*$/i.test(q) || /^\s*jaki (jest )?termin\s*\??\s*$/i.test(q)) {
    const raty = /rat/i.test(q);
    return { rodzaj: 'dopytanie', krotko: raty ? 'Nie wiem, o które raty chodzi: w danych aplikacji nie ma żadnego kredytu.' : 'W aplikacji jest kilka terminów, więc nie chcę zgadywać.', wiem: [], nie_wiem: [], dalej: [], pytanie: raty ? 'Chodzi o raty kredytu czy o raty składki OC?' : 'O który termin pytasz?', opcje: raty ? ['Raty kredytu', 'Raty składki OC'] : ['Pismo z urzędu skarbowego', 'Polisa OC', 'Dowód osobisty'] };
  }
  if (/rat/i.test(q) && /(auto|samoch)/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Nie wiem, ile rat zostało: w danych aplikacji nie ma kredytu ani leasingu na auto.', wiem: [{ tekst: 'Jest polisa OC Toyoty Yaris, ważna do ' + oc + '. To ubezpieczenie, nie kredyt.', zrodla: ['todo:oc'] }], nie_wiem: ['Czy masz kredyt albo leasing na auto, ile rat zostało i jaka jest rata.'], dalej: [{ tekst: 'Sprawdź umowę albo aplikację banku.', akcja: 'brak' }], pytanie: '', opcje: [] };
  if (/pogod/i.test(q)) return { rodzaj: 'poza_zakresem', krotko: 'Pomagam tylko w sprawach z tej aplikacji: pismach, terminach i dokumentach.', wiem: [], nie_wiem: [], dalej: [], pytanie: '', opcje: [] };
  return none('W danych aplikacji nie widzę informacji na ten temat.');
}


function special(q) {
  if (/#pesel/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Twój PESEL to 85031412345.', wiem: [], nie_wiem: [], dalej: [], pytanie: '', opcje: [] };
  if (/#wyslalem/i.test(q)) return { rodzaj: 'odpowiedz', krotko: 'Wysłałem odpowiedź do urzędu.', wiem: [], nie_wiem: [], dalej: [], pytanie: '', opcje: [] };
  return null;
}

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/__last') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ last, count })); return; }
  if (req.method === 'POST' && req.url === '/__reset') { last = null; count = 0; res.end('{}'); return; }
  const send = (code, obj, headers) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, headers || {})); res.end(JSON.stringify(obj)); };
  let b = '';
  req.on('data', (c) => (b += c));
  req.on('end', () => {
    const wa = req.url.match(/^\/client\/v4\/accounts\/([\w-]+)\/ai\/run\/(@cf\/[\w.-]+\/[\w.-]+)$/);
    if (wa) {
      if (req.headers.authorization !== 'Bearer ' + TOKEN) return send(401, { success: false, errors: [{ code: 10000, message: 'Authentication error' }] });
      if (/paid-only/.test(wa[2])) return send(403, { success: false, errors: [{ code: 5016, message: 'This model requires the Workers Paid plan' }] });
      count++;
      const body = JSON.parse(b);
      const user = JSON.parse(body.messages[1].content);
      const q = user.pytanie || '';
      last = { provider: 'workers-ai', model: wa[2], payload: user, system: body.messages[0].content, schema: !!(body.response_format && body.response_format.json_schema), max_tokens: body.max_tokens, bytes: b.length };
      if (/#limit-dzienny/.test(q)) return send(429, { success: false, errors: [{ code: 4006, message: 'you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare\'s Workers Paid plan if you would like to continue usage.' }] });
      if (/#429/.test(q)) return send(429, { success: false, errors: [{ code: 3040, message: 'Capacity temporarily exceeded, please try again.' }] });
      if (/#500/.test(q)) return send(500, { success: false, errors: [{ code: 3043, message: 'Internal server error' }] });
      if (/#json-niespelniony/.test(q)) return send(400, { success: false, errors: [{ code: 3030, message: "JSON Mode couldn't be met" }] });
      const r = special(q) || reply(q, user.kontekst || {}, user.poprzednio);
      if (/#tekst/.test(q)) return send(200, { success: true, result: { response: '```json\n' + JSON.stringify(r) + '\n```' } });
      return send(200, { success: true, result: { response: r, usage: { prompt_tokens: Math.round(b.length / 3), completion_tokens: 200 } } });
    }
    // Gemini (jak w rundzie 28)
    if (req.headers['x-goog-api-key'] !== KEY) return send(400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } });
    const get = req.url.match(/^\/v1beta\/models\/([\w.-]+)$/);
    if (req.method === 'GET' && get) return send(200, { name: 'models/' + get[1] });
    count++;
    const body = JSON.parse(b);
    const user = JSON.parse(body.contents[0].parts[0].text);
    const q = user.pytanie || '';
    last = { provider: 'gemini', payload: user, system: body.systemInstruction.parts[0].text, schema: !!(body.generationConfig && body.generationConfig.responseJsonSchema), bytes: b.length };
    if (/#429/.test(q)) return send(429, { error: { code: 429, message: 'Resource has been exhausted', details: [{ retryDelay: '42s' }] } });
    if (/#500/.test(q)) return send(500, { error: { code: 500, message: 'Internal error' } });
    send(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(special(q) || reply(q, user.kontekst || {}, user.poprzednio)) }] } }] });
  });
}).listen(PORT, '127.0.0.1', () => console.log('atrapa modelu (Workers AI + Gemini) na ' + PORT));
