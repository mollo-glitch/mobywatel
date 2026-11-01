// Dostępność trybu AI: axe-core (WCAG 2.x A/AA + dobre praktyki) na ekranie rozmowy w trybie AI, po odpowiedzi modelu,
// po dopytaniu i po przełączeniu na reguły; 390, 320 z większym tekstem, 1280 z wymuszonymi kolorami.
// Klawiatura: przełącznik osiągalny Tabem, Spacja i Enter przełączają, rola switch i aria-checked, fokus zostaje.
// argv: [2] katalog projektu. Atrapa Gemini musi działać na 8599.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ROOT = process.argv[2];
const srv = spawn('node', ['server/gemini-adapter.mjs'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT: '8631', GEMINI_API_KEY: 'test-klucz-atrapa-0000', GEMINI_API_BASE: 'http://127.0.0.1:8599/v1beta' }), stdio: 'ignore' });
const R = []; const ok = (co, w, sz) => R.push({ co, ok: !!w, sz });
(async () => {
  await new Promise((r) => setTimeout(r, 1500));
  const b = await chromium.launch();
  for (const [w, big, forced] of [[390, 0, 0], [320, 1, 0], [1280, 0, 1]]) {
    const tag = w + (big ? '-duzy' : '') + (forced ? '-wymuszone' : '');
    const p = await b.newPage({ viewport: { width: w, height: w === 1280 ? 800 : 740 }, reducedMotion: 'reduce', forcedColors: forced ? 'active' : 'none' });
    await p.goto('http://127.0.0.1:8631/index.html'); await p.waitForSelector('#entry:not([hidden])');
    await p.click('[data-act=entry-demo]'); await p.click('[data-act=enter]'); await p.waitForTimeout(700);
    if (big) { await p.click('#aa-btn'); await p.waitForTimeout(300); }
    await p.click('.tabbar [data-tab=chat]'); await p.waitForTimeout(900);
    await p.addScriptTag({ content: AXE });
    const run = () => p.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }); return r.violations.map((v) => v.id + ' (' + v.nodes.length + '): ' + v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')); });
    const res = {};
    res.wstep = await run();
    await p.fill('#chat-input', 'Ile rat zostało mi na auto?'); await p.press('#chat-input', 'Enter'); await p.waitForTimeout(1500); res.odpowiedz = await run();
    await p.fill('#chat-input', 'raty?'); await p.press('#chat-input', 'Enter'); await p.waitForTimeout(1500); res.dopytanie = await run();
    await p.click('.ai-switch'); await p.waitForTimeout(300); res.reguly = await run();
    const n = Object.values(res).reduce((a, x) => a + x.length, 0);
    ok(tag + ': axe bez naruszeń w 4 stanach trybu AI', n === 0, res);
    const sz = await p.evaluate(() => { const r = document.querySelector('.ai-switch').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
    ok(tag + ': przełącznik ma co najmniej 24×24 px (WCAG 2.5.8)', sz.w >= 24 && sz.h >= 24, sz);
    if (w === 390) {
      // Klawiatura: od pola wpisywania wstecz do przełącznika, Spacja i Enter.
      await p.evaluate(() => document.querySelector('[data-act=chat-reset]').focus());
      await p.keyboard.press('Shift+Tab'); const f1 = await p.evaluate(() => ({ klasa: document.activeElement.className, rola: document.activeElement.getAttribute('role'), stan: document.activeElement.getAttribute('aria-checked'), nazwa: document.activeElement.textContent.trim() }));
      await p.keyboard.press('Space'); await p.waitForTimeout(250); const f2 = await p.evaluate(() => ({ klasa: document.activeElement.className, stan: document.activeElement.getAttribute('aria-checked'), pasek: document.querySelector('.proto-bar').textContent }));
      await p.keyboard.press('Enter'); await p.waitForTimeout(250); const f3 = await p.evaluate(() => ({ klasa: document.activeElement.className, stan: document.activeElement.getAttribute('aria-checked'), pasek: document.querySelector('.proto-bar').textContent }));
      ok('klawiatura: Shift+Tab z „Nowa rozmowa” trafia na przełącznik (rola switch, nazwa „Tryb AI”); Spacja i Enter przełączają, fokus zostaje, pasek się zmienia',
        f1.klasa === 'ai-switch' && f1.rola === 'switch' && f1.nazwa === 'Tryb AI' && f2.klasa === 'ai-switch' && f2.stan !== f1.stan && f3.klasa === 'ai-switch' && f3.stan === f1.stan && /nic nie jest wysyłane/.test(f1.stan === 'true' ? f2.pasek : f3.pasek), { f1, f2, f3 });
      const outline = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth);
      ok('klawiatura: przełącznik ma widoczną obwódkę fokusu', /solid 3px/.test(outline), outline);
    }
    await p.screenshot({ path: 'ai-a11y-' + tag + '.png' });
    await p.close();
  }
  await b.close(); srv.kill();
  R.forEach((r) => console.log((r.ok ? '✓ ' : '✗ ') + r.co + (r.ok ? '' : '\n    ' + JSON.stringify(r.sz).slice(0, 900))));
  console.log('RAZEM', R.length, '| nieudane', R.filter((r) => !r.ok).length);
})().catch((e) => { console.error(e); srv.kill(); process.exit(1); });
