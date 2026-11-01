// Podsumowanie (ostrzega) i „Gotowe”: autopilot scenariusza #portfel. argv: [2] szerokość, [3] 'duzy'
const L = require('./lib.js'); L.BASE = 'http://127.0.0.1:' + (process.env.PORT || 8200);
const W = +(process.argv[2] || 390); const BIG = process.argv[3] === 'duzy'; const T = W + (BIG ? '-duzy' : '');
(async () => { const { b, p, log } = await L.open({ w: W }); await p.goto(L.BASE + '/index.html#portfel'); await p.waitForTimeout(5500);
  if (BIG) { await p.click('#aa-btn'); await p.waitForTimeout(300); }
  const state = () => p.evaluate(() => document.querySelector('.chat-head svg.pola').getAttribute('data-state'));
  const seq = [];
  for (let k = 0; k < 8; k++) {
    const sum = await p.$('.chat-log .qcard.summary'); if (sum) { seq.push('podsumowanie: ' + await state()); await p.screenshot({ path: 'pola/' + T + '-5-podsumowanie.png' }); break; }
    await p.evaluate(() => { const live = (x) => !x.disabled && x.getAttribute('aria-disabled') !== 'true' && x.getBoundingClientRect().height > 0; const kids = Array.from(document.querySelector('.chat-log').children).filter((c) => Array.from(c.querySelectorAll('button, input')).some(live)); const c = kids.pop(); c.setAttribute('data-x', '1'); });
    if (await p.$('[data-x] input[type=checkbox]') && !(await p.$('[data-x] input[type=checkbox]:checked'))) await p.click('[data-x] label:has(input[type=checkbox])');
    const btn = (await p.$$('[data-x] [data-q=submit], [data-x] button.btn.primary, [data-x] button.opt-btn, [data-x] button.opt'))[0]; seq.push((await btn.innerText()).trim().slice(0, 25) + ' → ' + await state()); await btn.click();
    await p.evaluate(() => { const c = document.querySelector('[data-x]'); if (c) c.removeAttribute('data-x'); }); await p.waitForTimeout(1700);
  }
  const conf = (await p.$$('.qcard.summary [data-q=confirm], .qcard.summary button.btn.primary')).pop(); if (conf) await conf.click(); await p.waitForTimeout(2200);
  seq.push('po potwierdzeniu: ' + (await L.route(p)).ekran); await p.screenshot({ path: 'pola/' + T + '-6-gotowe.png' });
  console.log(T, seq.join(' | '), '| błędy', log.strona.length + log.konsola.length); await b.close(); })();
