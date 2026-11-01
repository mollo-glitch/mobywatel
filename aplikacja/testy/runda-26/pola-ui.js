// Pola w prawdziwym interfejsie: nagłówek rozmowy, pole na Starcie, ekran „Gotowe”; 320/390/1280, większy tekst,
// wymuszone kolory. argv: port, prefiks plików. Wycinki obejmują okolice postaci.
const L = require('./lib.js');
const PORT = process.argv[2] || '8600'; const PRE = process.argv[3] || 'ui'; L.BASE = 'http://127.0.0.1:' + PORT;
const clip = async (p, sel, name, pad) => { const r = await p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, sel);
  if (!r) { console.log('brak', sel); return; } pad = pad || 10; const vw = p.viewportSize().width;
  await p.screenshot({ path: PRE + '-' + name + '.png', clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: Math.min(vw - Math.max(0, r.x - pad), r.w + 2 * pad), height: r.h + 2 * pad } }); };
(async () => {
  for (const [w, big, forced] of [[390, 0, 0], [320, 1, 0], [1280, 0, 0], [390, 0, 1]]) {
    const T = w + (big ? '-duzy' : '') + (forced ? '-wymuszone' : '');
    const { b, p } = await L.open({ w, forced: !!forced }); await L.enter(p, !!big);
    await clip(p, '.ask-one', T + '-start');
    await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(1600); await clip(p, '.chat-head', T + '-naglowek', 6);
    await p.fill('#chat-input', 'Ile rat zostało mi na auto?'); await p.keyboard.press('Enter'); await p.waitForTimeout(2600); await clip(p, '.chat-head', T + '-naglowek-po-odpowiedzi', 6);
    await b.close();
  }
  { const { b, p } = await L.open({ w: 390 }); await p.goto(L.BASE + '/index.html#portfel'); await p.waitForTimeout(5500);
    for (let k = 0; k < 10; k++) { const r = await p.evaluate(() => { const live = (x) => !x.disabled && x.getAttribute('aria-disabled') !== 'true' && x.getBoundingClientRect().height > 0;
      if (document.querySelector('#main .done-ic')) return 'done'; const cards = Array.from(document.querySelectorAll('.chat-log .qcard')).filter((c) => Array.from(c.querySelectorAll('button')).some(live)); const c = cards.pop(); if (!c) return 'brak';
      const opt = c.querySelector('input:not(:checked)'); if (opt && !c.querySelector('input:checked')) opt.click(); const btn = Array.from(c.querySelectorAll('button.btn')).filter(live).pop() || Array.from(c.querySelectorAll('button')).filter(live)[0]; btn.click(); return 'klik'; });
      if (r === 'done') break; await p.waitForTimeout(1600); }
    await p.waitForTimeout(800); await clip(p, '#main .done-ic', '390-gotowe', 24); await b.close(); }
  console.log('ok');
})();
