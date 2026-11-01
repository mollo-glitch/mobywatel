// Plansza porównawcza nazw asystenta: postać (z buildu aplikacji), „Zapytaj …”, wymowa, skojarzenie, wstępne ryzyko.
// argv: [2] port z dist, [3] plik wyjściowy. Wstępny przegląd, nie opinia prawna.
const { chromium } = require('playwright');
const C = [
  { n: 'Asystent spraw', z: 'Asystent spraw', w: 'a-SYS-tent spraw', s: 'nazwa robocza do czasu wyboru; opisowa, nie do rejestracji', r: 'robocza', rk: 'neutral' },
  { n: 'Spinka', z: 'Zapytaj Spinkę', w: 'SPIN-ka', s: 'spina sprawy w całość; czerwona zakładka jak spinka na kartce', r: 'niskie–średnie', rk: 'ok', u: 'potocznie „spina” = stres' },
  { n: 'Nitka', z: 'Zapytaj Nitkę', w: 'NIT-ka', s: '„po nitce do kłębka”: prowadzi krok po kroku', r: 'niskie–średnie', rk: 'ok', u: 'podobnie brzmi „Nika” (projekty AI za granicą)' },
  { n: 'Sprawnik', z: 'Zapytaj Sprawnika', w: 'SPRAW-nik', s: 'sprawy + sprawnie, jak „przewodnik”; słowo nowe', r: 'niskie (wstępnie)', rk: 'ok', u: 'istnieje jako nazwisko; „-nik” lekko urzędowe' },
  { n: 'Busola', z: 'Zapytaj Busolę', w: 'bu-SO-la', s: 'kompas: wskazuje kierunek w sprawach', r: 'średnie', rk: 'warn', u: '„Bussola/Bússola” to nazwy aplikacji-kompasów' },
  { n: 'Fiszka', z: 'Zapytaj Fiszkę', w: 'FISZ-ka', s: 'karta z podpowiedzią (postać to karta)', r: 'wysokie', rk: 'bad', u: 'Fiszki GO, iFiszki, Fiszki Polityki' },
  { n: 'Rubryka', z: 'Zapytaj Rubrykę', w: 'ru-BRY-ka', s: 'pole formularza (gra słów jak „Pola”)', r: 'wysokie', rk: 'bad', u: 'media „Rubryka” (UA), oprogramowanie „Rubrik” (USA)' },
  { n: 'Pola', z: 'Zapytaj Polę', w: 'PO-la', s: 'obecnie w buildzie b54aa1f8; „pola” formularza', r: 'wysokie', rk: 'bad', u: 'aplikacja „Pola” (PL, Klub Jagielloński) i planowany znak' }
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('http://127.0.0.1:' + process.argv[2] + '/index.html'); await p.waitForSelector('#entry:not([hidden])'); await p.evaluate(() => document.fonts.ready);
  await p.evaluate((C) => {
    const chip = { neutral: ['#E3E8F0', '#131A2A'], ok: ['var(--ok-soft)', 'var(--ok)'], warn: ['var(--warn-soft)', 'var(--warn)'], bad: ['#FBE3E7', 'var(--danger)'] };
    const tile = (c) => '<div style="background:#fff;border-radius:18px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 2px rgba(19,26,42,.08)">' +
      '<div style="display:flex;align-items:center;gap:10px">' + APP.pola(52, c.n === 'Asystent spraw' ? 'slucha' : 'wyjasnia') +
      '<div><div style="font-family:var(--font-head);font-weight:700;font-size:24px;color:var(--ink);line-height:1.15">' + c.z + '</div>' +
      '<div style="font-size:14px;color:var(--muted);font-weight:600">wymowa: ' + c.w + '</div></div></div>' +
      '<div style="font-size:15px;line-height:1.35;color:var(--ink)">' + c.s + '</div>' +
      (c.u ? '<div style="font-size:13px;line-height:1.35;color:var(--muted)">' + c.u + '</div>' : '') +
      '<div><span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:13px;font-weight:700;background:' + chip[c.rk][0] + ';color:' + chip[c.rk][1] + '">ryzyko kolizji: ' + c.r + '</span></div></div>';
    document.body.innerHTML = '<div style="position:fixed;inset:0;overflow:auto;background:var(--bg);padding:28px 32px;font-family:var(--font-body, inherit)">' +
      '<div style="display:flex;align-items:baseline;gap:14px;margin-bottom:6px"><div style="font-family:var(--font-head);font-weight:800;font-size:30px;color:var(--ink)">Asystent spraw: kandydaci na nazwę</div></div>' +
      '<div style="font-size:15px;color:var(--muted);margin-bottom:18px">Wstępny przegląd 29.10.2026: wyszukiwarka internetowa (aplikacje, czatboty, marki). Rejestry UPRP, TMview i EUIPO nie były dostępne z tej sesji. To nie jest opinia prawna ani potwierdzenie, że nazwa jest wolna.</div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">' + C.map(tile).join('') + '</div></div>';
  }, C);
  await p.waitForTimeout(600);
  const h = await p.evaluate(() => { const g = document.body.firstElementChild.lastElementChild; return Math.ceil(g.getBoundingClientRect().bottom + 28); });
  await p.setViewportSize({ width: 1200, height: h }); await p.waitForTimeout(200);
  await p.screenshot({ path: process.argv[3] }); await b.close(); console.log('plansza', h);
})();
