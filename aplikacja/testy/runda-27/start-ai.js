// Pytanie wpisane w polu „Co chcesz załatwić?” na Starcie w trybie AI: informacja o wysyłaniu pojawia się przed nim,
// a to pierwsze pytanie zostaje w regułach (nic nie idzie do modelu). Drugie idzie już do modelu.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const api = [];
  p.on('request', (r) => { if (r.url().includes('/answer')) api.push(r.method()); });
  await p.goto('http://127.0.0.1:' + (process.argv[2] || '8498') + '/index.html'); await p.waitForSelector('#entry:not([hidden])'); await p.click('[data-act=entry-demo]'); await p.click('[data-act=enter]'); await p.waitForTimeout(900);
  await p.fill('#ask-home', 'Ile rat zostało mi na auto?'); await p.press('#ask-home', 'Enter'); await p.waitForTimeout(1500);
  const r1 = await p.evaluate(() => [...document.querySelectorAll('#chat-log > *')].map((x) => x.className.split(' ').slice(0, 2).join('.') + ': ' + x.textContent.replace(/\s+/g, ' ').slice(0, 80)));
  const n1 = api.length;
  await p.fill('#chat-input', 'Ile rat zostało mi na auto?'); await p.press('#chat-input', 'Enter'); await p.waitForTimeout(1500);
  console.log(r1.join('\n')); console.log('POST /answer po pierwszym:', n1, '| po drugim:', api.length); await b.close(); })();
