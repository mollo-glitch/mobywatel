// Zrzuty trybu AI (serwer prototypu + atrapa Gemini). argv: [2] katalog projektu, [3] katalog wyjściowy.
// Uruchamia własne serwery: 8621 (z kluczem), 8622 (z kluczem, do limitu 429), 8623 (bez klucza).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const ROOT = process.argv[2]; const OUT = process.argv[3]; require('fs').mkdirSync(OUT, { recursive: true });
const KEY = 'test-klucz-atrapa-0000'; const MOCK = 'http://127.0.0.1:8599';
const procs = [];
const server = (port, env) => procs.push(spawn('node', ['server/gemini-adapter.mjs'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(port), GEMINI_API_KEY: '' }, env), stdio: 'ignore' }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  server(8621, { GEMINI_API_KEY: KEY, GEMINI_API_BASE: MOCK + '/v1beta' });
  server(8622, { GEMINI_API_KEY: KEY, GEMINI_API_BASE: MOCK + '/v1beta' });
  server(8623, {});
  await sleep(1800);
  const b = await chromium.launch();
  async function open(port, w, big) {
    const p = await b.newPage({ viewport: { width: w, height: w === 1280 ? 800 : w === 320 ? 640 : 844 } });
    await p.goto('http://127.0.0.1:' + port + '/index.html'); await p.waitForSelector('#entry:not([hidden])');
    await p.click('[data-act=entry-demo]'); await p.click('[data-act=enter]'); await p.waitForTimeout(900);
    if (big) { await p.click('#aa-btn'); await p.waitForTimeout(300); }
    await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(1200);
    return p;
  }
  const ask = async (p, q, ms) => { await p.fill('#chat-input', q); await p.press('#chat-input', 'Enter'); await p.waitForTimeout(ms || 2200); };
  { const p = await open(8621, 390);
    await p.screenshot({ path: OUT + '/ai-390-1-wstep.png' });
    await ask(p, 'Ile rat zostało mi na auto?'); await p.screenshot({ path: OUT + '/ai-390-2-raty.png' });
    await p.evaluate(() => { const c = document.querySelector('#chat-scroll'); c.scrollTop = c.scrollHeight; }); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/ai-390-3-raty-dol.png' });
    await ask(p, 'raty?'); await p.screenshot({ path: OUT + '/ai-390-4-dopytanie.png' });
    await p.click('.ai-switch'); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/ai-390-5-przelacznik-reguly.png' });
    await p.close(); }
  { const p = await open(8622, 390); await ask(p, '#429 limit'); await p.screenshot({ path: OUT + '/ai-390-6-limit-429.png' }); await p.close(); }
  { const p = await open(8623, 390); await p.screenshot({ path: OUT + '/ai-390-7-bez-klucza.png' }); await p.close(); }
  { const p = await open(8621, 320, true); await ask(p, 'Ile rat zostało mi na auto?'); await p.screenshot({ path: OUT + '/ai-320-duzy-raty.png' }); await p.close(); }
  { const p = await open(8621, 1280); await ask(p, 'Ile rat zostało mi na auto?'); await p.screenshot({ path: OUT + '/ai-1280-raty.png' }); await p.close(); }
  await b.close(); procs.forEach((x) => x.kill()); console.log('zrzuty AI gotowe');
})().catch((e) => { console.error(e); procs.forEach((x) => x.kill()); process.exit(1); });
