// Arkusz stanów Poli w prawdziwych rozmiarach (34, 44, 58 px) przy DPR 1 i 3, na tle aplikacji.
// argv: port, plik wyjściowy (bez .png), [stan końcowy po ms]
const { chromium } = require('playwright');
const PORT = process.argv[2] || '8200'; const OUT = process.argv[3] || 'pola-teraz';
(async () => {
  const b = await chromium.launch();
  for (const dpr of [1, 3]) {
    const p = await b.newPage({ viewport: { width: 760, height: 330 }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
    await p.goto('http://127.0.0.1:' + PORT + '/index.html'); await p.waitForSelector('#entry:not([hidden])');
    await p.evaluate(() => {
      const S = ['slucha', 'wyjasnia', 'ostrzega', 'krok', 'gotowe'];
      const L = { slucha: 'słucha', wyjasnia: 'wyjaśnia', ostrzega: 'ostrzega', krok: 'następny krok', gotowe: 'gotowe' };
      document.body.innerHTML = '<div id="sheet" style="position:fixed;inset:0;background:var(--bg,#F2F4F8);padding:14px;font:600 13px/1.3 system-ui;color:#333;display:grid;grid-template-columns:110px repeat(5,1fr);gap:10px;align-items:center"></div>';
      const g = document.getElementById('sheet');
      g.insertAdjacentHTML('beforeend', '<div></div>' + S.map((s) => '<div style="text-align:center">' + L[s] + '</div>').join(''));
      for (const size of [34, 44, 58]) {
        g.insertAdjacentHTML('beforeend', '<div>' + size + ' px</div>');
        for (const s of S) g.insertAdjacentHTML('beforeend', '<div style="display:flex;justify-content:center;align-items:center;height:' + (size + 24) + 'px;background:#fff;border-radius:12px">' + APP.pola(size, s) + '</div>');
      }
      g.insertAdjacentHTML('beforeend', '<div>44 px na tle nagłówka</div>' + S.map((s) => '<div style="display:flex;justify-content:center;align-items:center;height:68px;background:var(--bg,#EEF1F6);border-radius:12px">' + APP.pola(44, s) + '</div>').join(''));
    });
    await p.waitForTimeout(400);
    await p.screenshot({ path: OUT + '-dpr' + dpr + '.png' }); await p.close();
  }
  await b.close();
})();
