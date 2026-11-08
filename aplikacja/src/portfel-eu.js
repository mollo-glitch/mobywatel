/*
 * Spinka 2.0: Europejski Portfel Tożsamości Cyfrowej — KONCEPCJA DEMONSTRACYJNA, nie działający portfel.
 * Pokazuje zasady z eIDAS 2.0 na fikcyjnych danych: poświadczenia, selektywne udostępnianie (tylko potrzebne atrybuty,
 * np. „powyżej 21 lat” zamiast daty urodzenia), zgodę przed każdym udostępnieniem, symulowaną weryfikację i historię zgód.
 * Weryfikator (wypożyczalnia w Lizbonie) jest fikcyjny. Nic nie jest wysyłane.
 */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = (s) => A.esc(s);
  const T = A.time;
  const U = A.ui;
  const st = () => A.store.get();
  const P = A.person;

  const CREDS = [
    { id: 'pid', icon: 'id', t: 'Dane osobowe (PID)', iss: 'Wystawca: państwo członkowskie (koncepcja)', attrs: [['Imię i nazwisko', P.first + ' ' + P.last], ['Data urodzenia', P.born], ['Obywatelstwo', 'PL'], ['Powyżej 18 lat', 'tak'], ['Powyżej 21 lat', 'tak']] },
    { id: 'mdl', icon: 'steering', t: 'Prawo jazdy (mDL)', iss: 'Wystawca: organ wydający prawa jazdy (koncepcja)', attrs: [['Kategorie', 'B'], ['Ważne do', T.fmt(T.plus(2900))], ['Numer', '•••••/04/1465']] },
    { id: 'ehic', icon: 'health', t: 'Karta EKUZ', iss: 'Wystawca: instytucja ubezpieczenia zdrowotnego (koncepcja)', attrs: [['Ważna do', T.fmt(T.plus(480))], ['Kraj', 'PL']] }
  ];
  // Scenariusz transgraniczny: wynajem auta w Lizbonie (fikcyjna wypożyczalnia). Prośba zawiera więcej, niż potrzeba;
  // Spinka podpowiada minimum, ale wybór należy do Ciebie.
  const REQ = {
    who: 'Aluguer Exemplo, Lizbona (fikcyjna wypożyczalnia)', why: 'Wynajem samochodu',
    items: [
      { id: 'kat', l: 'Kategorie prawa jazdy', cred: 'mdl', need: true, v: 'B' },
      { id: 'waz', l: 'Ważność prawa jazdy', cred: 'mdl', need: true, v: 'do ' + T.fmt(T.plus(2900)) },
      { id: 'age21', l: 'Czy masz ukończone 21 lat', cred: 'pid', need: true, v: 'tak', tip: 'Zamiast daty urodzenia: sama odpowiedź „tak”.' },
      { id: 'name', l: 'Imię i nazwisko', cred: 'pid', need: true, v: P.first + ' ' + P.last },
      { id: 'born', l: 'Data urodzenia', cred: 'pid', need: false, v: P.born, tip: 'Niepotrzebna: wystarczy potwierdzenie wieku.' },
      { id: 'nat', l: 'Obywatelstwo', cred: 'pid', need: false, v: 'PL', tip: 'Niepotrzebne do wynajmu auta w UE.' }
    ]
  };

  let flow = null; // { step: 'wybor'|'weryfikacja'|'koniec', pick: [...] }

  A.ext.screens.portfeleu = () => {
    const hist = (st().wallet || []).slice().reverse();
    return A.screen('portfeleu',
      '<div class="pad stack"><p class="eyebrow">' + ic('globe', 16) + ' Koncepcja eIDAS 2.0</p><h1>Portfel EU</h1>' +
        '<div class="s2-banner warn"><span class="sim-badge">' + ic('info', 16) + '<span>Koncepcja demonstracyjna</span></span><p><b>To nie jest działający Europejski Portfel Tożsamości Cyfrowej</b> ani oficjalna usługa. Pokazuje, jak mogłoby działać selektywne udostępnianie danych w Unii. Dane i weryfikator są fikcyjne.</p></div>' +
        '<p class="lead">Za granicą pokazujesz tylko to, co jest potrzebne, np. „powyżej 21 lat” zamiast daty urodzenia. Przed każdym udostępnieniem widzisz, kto pyta i po co.</p>' +
        '<section aria-labelledby="eu-c"><h2 id="eu-c">Poświadczenia (koncepcja)</h2><ul class="s2-creds">' + CREDS.map((c) =>
          '<li><details class="s2-cred"><summary><span class="s2-case-ic" aria-hidden="true">' + ic(c.icon, 24) + '</span><span><b>' + esc(c.t) + '</b><span class="s2-cred-i">' + esc(c.iss) + '</span></span></summary>' +
            '<dl class="s2-sum">' + c.attrs.map((a) => '<div><dt>' + esc(a[0]) + '</dt><dd>' + esc(a[1]) + '</dd></div>').join('') + '</dl></details></li>').join('') + '</ul></section>' +
        '<section class="s2-scenario" aria-labelledby="eu-s"><h2 id="eu-s">Scenariusz: wynajem auta w Lizbonie</h2>' +
          '<p>Wypożyczalnia (fikcyjna) prosi o dane z portfela. Wybierasz, co pokazać, potwierdzasz, a wypożyczalnia sprawdza podpis wystawcy (symulacja).</p>' +
          '<button type="button" class="btn primary wide" data-act="eu-start">' + ic('globe', 20) + 'Zacznij scenariusz</button></section>' +
        '<section aria-labelledby="eu-h"><h2 id="eu-h">Historia zgód</h2>' +
          (hist.length ? '<ul class="s2-log">' + hist.map((h) => '<li><span class="s2-log-d">' + esc(T.fmtShort(A.store.fromIso(h.at) || T.today)) + '</span><span><b>' + esc(h.who) + '</b><span class="s2-log-m">Udostępniono: ' + esc(h.shared.join(', ')) + (h.withheld.length ? ' · nie udostępniono: ' + esc(h.withheld.join(', ')) : '') + '</span></span></li>').join('') + '</ul>'
            : '<p class="empty">Nie udostępniałeś jeszcze danych z portfela.</p>') + '</section>' +
        '<details class="gloss"><summary>Czym jest eIDAS 2.0?</summary><p>Unijne przepisy o tożsamości elektronicznej (eIDAS 2.0) przewidują, że każde państwo członkowskie udostępni obywatelom europejski portfel tożsamości cyfrowej. Szczegóły i terminy wdrożenia sprawdzisz na stronach Komisji Europejskiej i administracji krajowej.</p></details>' +
      '</div>');
  };

  function stepHtml() {
    if (flow.step === 'wybor') {
      return '<p class="s2-sheet-lead"><b>' + esc(REQ.who) + '</b> prosi o dane. Cel: ' + esc(REQ.why) + '.</p>' +
        '<form class="s2-form" id="eu-form" novalidate><fieldset class="s2-fieldset"><legend class="s2-label">Co pokazać?</legend><ul class="s2-attrs">' +
        REQ.items.map((x) => '<li><label class="s2-checkl"><input type="checkbox" name="a" value="' + x.id + '"' + (flow.pick.includes(x.id) ? ' checked' : '') + '><span class="s2-checkbox" aria-hidden="true">' + ic('check', 16) + '</span>' +
          '<span><b>' + esc(x.l) + '</b>: ' + esc(x.v) + ' ' + U.pill(x.need ? 'potrzebne' : 'niepotrzebne', x.need ? 'info' : 'neutral') + (x.tip ? '<span class="s2-hint">' + esc(x.tip) + '</span>' : '') + '</span></label></li>').join('') +
        '</ul></fieldset><p class="s2-err" id="eu-err" hidden></p>' +
        '<p class="s2-note">' + ic('assistant', 16) + '<span>Spinka zaznaczyła tylko to, co potrzebne do wynajmu. Możesz to zmienić.</span></p>' +
        '<div class="q-actions"><button type="button" class="btn primary" data-act="eu-share">Udostępnij wybrane</button><button type="button" class="btn ghost" data-act="eu-deny">Odmów</button></div></form>';
    }
    if (flow.step === 'weryfikacja') {
      return '<ul class="s2-verify" aria-live="polite">' + ['Podpis wystawcy zgodny', 'Poświadczenie ważne i nieunieważnione', 'Udostępniono tylko wybrane dane'].map((x, i) =>
        '<li data-i="' + i + '"><span class="s2-verify-ic" aria-hidden="true">' + ic('check', 16) + '</span><span>' + esc(x) + ' (symulacja)</span></li>').join('') + '</ul>';
    }
    const shared = REQ.items.filter((x) => flow.pick.includes(x.id));
    return U.success('Weryfikacja udana (symulacja)', 'Wypożyczalnia dostała ' + A.plural(shared.length, 'informację', 'informacje', 'informacji') + ', bez daty urodzenia i obywatelstwa.') +
      '<dl class="s2-sum">' + shared.map((x) => '<div><dt>' + esc(x.l) + '</dt><dd>' + esc(x.v) + '</dd></div>').join('') + '</dl>' +
      '<p class="s2-note">' + ic('info', 16) + '<span>To koncepcja: nic nie zostało wysłane i żadna instytucja tego nie sprawdziła.</span></p>' +
      '<div class="q-actions"><button type="button" class="btn primary" data-act="s2sheet-close">Gotowe</button></div>';
  }
  function paint() { const b = U.sheet.body(); if (b) b.innerHTML = stepHtml(); }

  A.ext.acts['eu-start'] = (t) => {
    flow = { step: 'wybor', pick: REQ.items.filter((x) => x.need).map((x) => x.id) };
    U.sheet.open({ title: 'Prośba o dane: wynajem auta', opener: t, html: stepHtml(), onClose: () => { if (flow && flow.step === 'koniec') A.render(); flow = null; } });
  };
  A.ext.acts['eu-deny'] = () => {
    A.store.update((s) => { s.wallet.push({ at: A.store.iso(T.today), who: REQ.who, shared: ['nic (odmowa)'], withheld: REQ.items.map((x) => x.l) }); });
    flow.step = 'koniec-odmowa';
    U.sheet.close();
    A.toast('Odmówiono. Wypożyczalnia nie dostała żadnych danych (koncepcja).', 'ok');
    A.render();
  };
  A.ext.acts['eu-share'] = () => {
    const form = document.getElementById('eu-form');
    const pick = Array.from(form.querySelectorAll('input[name="a"]:checked')).map((i) => i.value);
    const err = document.getElementById('eu-err');
    if (!pick.length) { err.hidden = false; err.textContent = 'Zaznacz co najmniej jedną informację albo wybierz „Odmów”.'; form.querySelector('input').focus(); return; }
    flow.pick = pick;
    A.confirm({
      title: 'Udostępnić ' + A.plural(pick.length, 'informację', 'informacje', 'informacji') + '?',
      items: REQ.items.filter((x) => pick.includes(x.id)).map((x) => x.l + ': ' + x.v).concat(['Odbiorca: ' + REQ.who + '.', 'Koncepcja: nic nie zostanie wysłane.']),
      ok: 'Udostępnij (koncepcja)'
    }).then((yes) => {
      if (!yes || !flow) return;
      flow.step = 'weryfikacja';
      paint();
      const items = Array.from(U.sheet.body().querySelectorAll('.s2-verify li'));
      items.forEach((li, i) => setTimeout(() => { li.classList.add('ok'); }, A.reducedMotion() ? 0 : 350 * (i + 1)));
      setTimeout(() => {
        if (!flow) return;
        A.store.update((s) => { s.wallet.push({ at: A.store.iso(T.today), who: REQ.who, shared: REQ.items.filter((x) => pick.includes(x.id)).map((x) => x.l), withheld: REQ.items.filter((x) => !pick.includes(x.id)).map((x) => x.l) }); });
        flow.step = 'koniec';
        paint();
        const c = U.sheet.body().querySelector('.s2-check'); if (c && !A.reducedMotion()) c.classList.add('play');
        const h = U.sheet.body().querySelector('h1'); if (h) h.focus();
      }, A.reducedMotion() ? 0 : 350 * (items.length + 1));
    });
  };
  A.ext.deep.portfeleu = () => A.nav('portfeleu');
  A.ext.search.push(() => [{ group: 'Portfel EU (koncepcja)', title: 'Portfel EU', sub: 'Selektywne udostępnianie danych za granicą', icon: 'globe', attrs: 'data-go="portfeleu"', keys: 'eidas unia europa granica wynajem' }]);
})(window.APP);
