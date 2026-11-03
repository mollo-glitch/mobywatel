// Runda 31: trzy ścieżki „Albo zacznij od sprawy” od strony do końca scenariusza w aplikacji.
//   node sciezki-test.js <port strony>
// Dla każdej ścieżki (Pismo z urzędu, Kończy się OC, Zgubiony portfel): telefon 390 px (dotknięcie) i komputer 1280 px
// (klawiatura: fokus na odnośniku i Enter). W aplikacji „autopilot” wybiera pierwszą możliwość w każdym kroku
// (zaznacza pierwsze pole, jeśli trzeba), aż pojawi się podsumowanie (potwierdza je i czeka na ekran „Gotowe”) albo
// komunikat końcowy w rozmowie (np. OC: „Ustawione. Przypomnę… Do ubezpieczyciela nic nie zostało wysłane.”).
// Sprawdza też brak błędów strony i brak ekranów wejścia.
const { chromium } = require('playwright');
const PORT = process.argv[2] || '8470';
const A = 'http://127.0.0.1:' + PORT;
const R = []; const ok = (co, w, sz) => { R.push({ co, ok: !!w }); console.log((w ? '✓ ' : '✗ ') + co + (sz ? ' | ' + (typeof sz === 'string' ? sz : JSON.stringify(sz)) : '')); };
const SCIEZKI = [['Pismo z urzędu', '#pismo', 'Pismo z urzędu'], ['Kończy się OC', '#oc', 'Koniec polisy OC'], ['Zgubiony portfel', '#portfel', 'Zgubiony portfel']];

(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    for (const [etykieta, kotwica, tytul] of SCIEZKI) {
      const tel = w < 500;
      const c = await b.newContext(Object.assign({ viewport: { width: w, height: h } }, tel ? { isMobile: true, hasTouch: true } : {}));
      const p = await c.newPage(); const bledy = []; p.on('pageerror', (e) => bledy.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') bledy.push(m.text()); });
      await p.goto(A + '/'); await p.waitForTimeout(400);
      const link = 'a.skrot[href="aplikacja/' + kotwica + '"]';
      const opis = await p.$eval(link, (a) => ({ nazwa: a.querySelector('.skrot-nazwa').textContent, opis: a.querySelector('.skrot-opis').textContent, wys: a.getBoundingClientRect().height, dostepna: a.textContent.replace(/\s+/g, ' ').trim() }));
      if (tel) await p.tap(link); else { await p.focus(link); await p.keyboard.press('Enter'); }
      await p.waitForURL(A + '/aplikacja/' + kotwica);
      await p.waitForFunction((t) => document.querySelector('.screen.chat') && document.querySelector('#chat-log .msg.bot') && document.body.innerText.includes(t), tytul, { timeout: 20000 }).catch(() => {});
      await p.waitForTimeout(1500);
      const start = await p.evaluate(() => ({ brama: !document.querySelector('#entry').hidden || !document.querySelector('#login').hidden, tekst: document.querySelector('#main').innerText.replace(/\s+/g, ' ').slice(0, 200) }));
      const kroki = [];
      let podsumowanie = false; let koniecWRozmowie = false;
      const KONIEC_ROZMOWY = /Ustawione\. Przypomnę .*nic nie zostało wysłane/;
      for (let k = 0; k < 14 && !podsumowanie && !koniecWRozmowie; k++) {
        if (await p.$('.chat-log .qcard.summary')) { podsumowanie = true; break; }
        if (KONIEC_ROZMOWY.test(await p.evaluate(() => document.querySelector('.chat-log').innerText.replace(/\s+/g, ' ')))) { koniecWRozmowie = true; break; }
        const jest = await p.evaluate(() => { const live = (x) => !x.disabled && x.getAttribute('aria-disabled') !== 'true' && x.getBoundingClientRect().height > 0;
          const kids = Array.from(document.querySelector('.chat-log').children).filter((c) => Array.from(c.querySelectorAll('button, input')).some(live)); const c = kids.pop(); if (!c) return false; c.setAttribute('data-x', '1'); return true; });
        if (!jest) { await p.waitForTimeout(800); continue; }
        if (await p.$('[data-x] input[type=checkbox]') && !(await p.$('[data-x] input[type=checkbox]:checked'))) await p.click('[data-x] label:has(input[type=checkbox])');
        const btn = (await p.$$('[data-x] [data-q=submit], [data-x] button.btn.primary, [data-x] button.opt-btn, [data-x] button.opt, [data-x] button.chip'))[0];
        if (!btn) { await p.evaluate(() => { const c = document.querySelector('[data-x]'); if (c) c.removeAttribute('data-x'); }); await p.waitForTimeout(800); continue; }
        kroki.push((await btn.innerText()).trim().replace(/\s+/g, ' ').slice(0, 30));
        await btn.click();
        await p.evaluate(() => { const c = document.querySelector('[data-x]'); if (c) c.removeAttribute('data-x'); }); await p.waitForTimeout(1500);
      }
      let koniec = null;
      if (podsumowanie) {
        const conf = (await p.$$('.qcard.summary [data-q=confirm], .qcard.summary button.btn.primary')).pop();
        if (conf) { kroki.push('[potwierdź] ' + (await conf.innerText()).trim().slice(0, 20)); await conf.click(); }
        await p.waitForTimeout(2600);
        koniec = await p.evaluate(() => { const v = document.querySelector('#main > .screen'); const t = document.body.innerText.replace(/\s+/g, ' ');
          return { ekran: v ? v.className.replace('screen ', '') : '?', gotowe: /Gotowe|Zapisane|Ustawione|ustawione|zapisałem|Zapisałem/.test(t), wyslane: /Nic nie zostało wysłane|nic nie trafi|niczego nie wysła|Nic nie wysłano|nie wysłałem/i.test(t) }; });
      }
      ok(w + ' px, ' + (tel ? 'dotyk' : 'klawiatura') + ': „' + etykieta + ' – ' + opis.opis + '” otwiera scenariusz „' + tytul + '” bez ekranów wejścia',
        !start.brama && start.tekst.includes(tytul) && opis.wys >= 44 && opis.dostepna === etykieta + ': ' + opis.opis, { nazwa: opis.dostepna, wys: Math.round(opis.wys) });
      if (koniecWRozmowie) koniec = { ekran: 'chat', gotowe: true, wyslane: true, komunikat: 'Ustawione… nic nie zostało wysłane' };
      ok(w + ' px: „' + etykieta + '” da się przejść do końca (podsumowanie i „Gotowe” albo komunikat końcowy), bez błędów strony',
        (podsumowanie || koniecWRozmowie) && koniec && koniec.gotowe && koniec.wyslane && bledy.length === 0, { kroki: kroki.join(' → '), koniec, bledy: bledy.slice(0, 3) });
      if (w === 390) await p.screenshot({ path: process.env.ZRZUTY ? process.env.ZRZUTY + '/sciezka-' + kotwica.slice(1) + '-koniec-390.png' : '/dev/null' }).catch(() => {});
      await c.close();
    }
  }
  await b.close();
  const zle = R.filter((r) => !r.ok).length; console.log('RAZEM ' + R.length + ' | nieudane ' + zle); process.exit(zle ? 1 : 0);
})();
