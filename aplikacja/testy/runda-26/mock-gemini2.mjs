// Atrapa Gemini API (models.get i generateContent) do testów serwera prototypu. Nie łączy się z Google.
// Zachowanie zależy od słów w pytaniu. Zapamiętuje ostatnie zapytanie (bez klucza), żeby testy sprawdziły, co wysłano.
// Użycie: node mock-gemini2.mjs [port]   Klucz testowy: test-klucz-atrapa-0000 (celowo niepodobny do prawdziwych).
import http from 'node:http';
const PORT = Number(process.argv[2] || 8599);
const KEY = 'test-klucz-atrapa-0000';
let last = null, count = 0, keySeen = 0;
const fact = (ctx, id, label) => { const z = (ctx.zrodla || []).find((x) => x.id === id); const f = z && z.fakty.find((x) => x.startsWith(label)); return f ? f.slice(label.length).trim().split(' ')[0] : null; };

function reply(q, ctx, earlier) {
  const oc = fact(ctx, 'doc:pojazd', 'OC ważne do:') || '—';
  const noLoan = {
    rodzaj: 'odpowiedz',
    krotko: 'Nie wiem, ile rat zostało, bo w danych demo nie ma żadnego kredytu ani leasingu na auto. Widzę tylko polisę OC Toyoty Yaris, ważną do ' + oc + '.',
    wiem: [{ tekst: 'Polisa OC Toyoty Yaris jest ważna do ' + oc + '. To ubezpieczenie, a nie kredyt.', zrodla: ['doc:pojazd'] }],
    nie_wiem: ['Czy masz kredyt albo leasing na auto, ile rat zostało i jaka jest rata.'],
    dalej: [{ tekst: 'Sprawdź umowę albo aplikację banku; wszystkie kredyty na Twoje nazwisko pokaże raport BIK.', akcja: 'brak' }, { tekst: 'Jeśli pytasz o polisę OC, zobacz, co zrobić przed jej końcem.', akcja: 'scenariusz:oc' }],
    pytanie: '', opcje: []
  };
  if (earlier && /kredyt/i.test(q)) return noLoan;
  if (/^\s*raty\s*\??\s*$/i.test(q)) return { rodzaj: 'dopytanie', krotko: 'Nie chcę zgadywać, o które raty chodzi.', wiem: [], nie_wiem: [], dalej: [], pytanie: 'Chodzi Ci o raty kredytu czy o raty składki OC?', opcje: ['Raty kredytu', 'Raty składki OC'] };
  if (/rat/i.test(q) && /(auto|samoch)/i.test(q)) return noLoan;
  if (/zmy[sś]l/i.test(q)) return Object.assign({}, noLoan, { krotko: 'Zostało Ci 14 rat po 650 zł.' });
  if (/udawaj|wys[lł]a[lł]em/i.test(q)) return Object.assign({}, noLoan, { krotko: 'Wysłałem już wniosek o nowy dowód do urzędu.' });
  if (/zepsuj/i.test(q)) return { rodzaj: 'hack', krotko: 'x' };
  if (/pogod/i.test(q)) return { rodzaj: 'poza_zakresem', krotko: 'Pomagam tylko w sprawach z tego prototypu, np. w pismach, terminach i dokumentach.', wiem: [], nie_wiem: [], dalej: [], pytanie: '', opcje: [] };
  return { rodzaj: 'odpowiedz', krotko: 'W danych demo nie widzę informacji na ten temat.', wiem: [], nie_wiem: ['Tego tematu nie ma w danych demo.'], dalej: [], pytanie: '', opcje: [] };
}

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/__last') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ last, count, keySeen })); return; }
  if (req.method === 'POST' && req.url === '/__reset') { last = null; count = 0; keySeen = 0; res.end('{}'); return; }
  const key = req.headers['x-goog-api-key'];
  if (key) keySeen++;
  const send = (code, obj, headers) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, headers || {})); res.end(JSON.stringify(obj)); };
  if (key !== KEY) return send(400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } });
  const get = req.url.match(/^\/v1beta\/models\/([\w.-]+)$/);
  if (req.method === 'GET' && get) return get[1] === 'gemini-3.1-flash-lite' ? send(200, { name: 'models/' + get[1] }) : send(404, { error: { code: 404, message: 'models/' + get[1] + ' is not found', status: 'NOT_FOUND' } });
  let b = '';
  req.on('data', (c) => (b += c));
  req.on('end', async () => {
    count++;
    if (!/^\/v1beta\/models\/[\w.-]+:generateContent$/.test(req.url)) return send(404, { error: { code: 404, message: 'not found' } });
    const body = JSON.parse(b);
    const user = JSON.parse(body.contents[0].parts[0].text);
    const q = user.pytanie || '';
    last = { url: req.url, payload: user, system: body.systemInstruction.parts[0].text, schema: !!(body.generationConfig && body.generationConfig.responseJsonSchema), mime: body.generationConfig && body.generationConfig.responseMimeType };
    if (/#429|limit/i.test(q)) return send(429, { error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED', details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '42s' }] } });
    if (/#500/.test(q)) return send(500, { error: { code: 500, message: 'Internal error', status: 'INTERNAL' } });
    if (/#region/.test(q)) return send(400, { error: { code: 400, message: 'User location is not supported for the API use.', status: 'FAILED_PRECONDITION' } });
    if (/#blokada/.test(q)) return send(200, { promptFeedback: { blockReason: 'OTHER' } });
    if (/wolno/i.test(q)) await new Promise((r) => setTimeout(r, 10000));
    send(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(reply(q, user.kontekst || {}, user.poprzednio)) }] } }] });
  });
}).listen(PORT, '127.0.0.1', () => console.log('atrapa Gemini na ' + PORT));
