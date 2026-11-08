/*
 * Spinka 2.0: kalendarz obywatela. Wszystkie terminy z aplikacji w jednym miejscu (pisma, ważność dokumentów, OC,
 * płatności, rodzina, przypomnienia), widok miesiąca, lista nadchodzących i szczegóły. Każdy termin ma rodzaj i źródło;
 * terminy przewidywane są oznaczone jako szacunek, który NIE jest prawnie wiążący.
 * Siatka miesiąca to tabela z przyciskami dni; strzałki przenoszą fokus o dzień i tydzień, Home/End na początek/koniec tygodnia.
 */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = (s) => A.esc(s);
  const T = A.time;
  const U = A.ui;
  const S = A.s2;

  const KIND = {
    termin: { l: 'Termin z danych sprawy', tone: 'warn', d: 'Wynika z pisma, decyzji, polisy albo przepisu opisanego w aplikacji (dane fikcyjne).' },
    waznosc: { l: 'Ważność dokumentu', tone: 'info', d: 'Data ważności zapisana w dokumencie.' },
    przypomnienie: { l: 'Twoje przypomnienie', tone: 'neutral', d: 'Ustawione przez Ciebie. Nie ma skutków prawnych.' },
    szacunek: { l: 'Szacunek, niewiążący', tone: 'neutral', d: 'Przewidywany termin wyliczony przez prototyp. Nie jest terminem urzędowym ani prawnie wiążącym.' }
  };
  const MIES = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const DNI = ['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd'];
  const DNI_PELNE = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const key = (d) => A.store.iso(d);

  let view = null;  // pierwszy dzień oglądanego miesiąca
  let sel = null;   // wybrany dzień
  let filtr = 'all';

  function events() { return S.events().filter((e) => filtr === 'all' || e.cat === filtr); }

  function grid(ev) {
    const y = view.getFullYear(); const m = view.getMonth();
    const first = new Date(y, m, 1, 12);
    const off = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const byDay = {};
    ev.forEach((e) => { (byDay[key(e.date)] = byDay[key(e.date)] || []).push(e); });
    let html = '<table class="s2-cal" role="grid" aria-labelledby="cal-m"><thead><tr>' + DNI.map((d, i) => '<th scope="col" abbr="' + DNI_PELNE[i] + '">' + d + '</th>').join('') + '</tr></thead><tbody><tr>';
    for (let i = 0; i < off; i++) html += '<td class="pad-day"></td>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d, 12);
      const list = byDay[key(date)] || [];
      const isToday = same(date, T.today); const isSel = sel && same(date, sel);
      const tones = list.slice(0, 3).map((e) => '<i class="dot k-' + e.kind + (e.done ? ' done' : '') + '"></i>').join('');
      const label = d + ' ' + T.fmtShort(date).split(' ')[1] + (isToday ? ', dziś' : '') + ', ' + (list.length ? A.plural(list.length, 'termin', 'terminy', 'terminów') : 'bez terminów');
      html += '<td><button type="button" class="s2-day' + (isToday ? ' today' : '') + (isSel ? ' sel' : '') + (list.length ? ' has' : '') + '" data-act="cal-day" data-d="' + key(date) + '" aria-label="' + esc(label) + '" aria-pressed="' + (isSel ? 'true' : 'false') + '" tabindex="' + (isSel ? '0' : '-1') + '">' +
        '<span class="n">' + d + '</span><span class="dots" aria-hidden="true">' + tones + '</span></button></td>';
      if ((off + d) % 7 === 0 && d < days) html += '</tr><tr>';
    }
    const tail = (7 - ((off + days) % 7)) % 7;
    for (let i = 0; i < tail; i++) html += '<td class="pad-day"></td>';
    return html + '</tr></tbody></table>';
  }

  function evRow(e) {
    const k = KIND[e.kind] || KIND.termin;
    const cat = S.CATS.find((c) => c.id === e.cat) || S.CATS[0];
    return '<li><button type="button" class="s2-ev k-' + e.kind + (e.done ? ' done' : '') + '" data-act="cal-ev" data-id="' + esc(e.id) + '">' +
      '<span class="s2-ev-date" aria-hidden="true"><b>' + e.date.getDate() + '</b><span>' + esc(T.fmtShort(e.date).split(' ')[1].slice(0, 3)) + '</span></span>' +
      '<span class="s2-ev-main"><span class="s2-ev-t">' + esc(e.title) + '</span>' +
        '<span class="s2-ev-m">' + ic(cat.icon, 16) + '<span>' + esc(cat.label) + '</span><span class="s2-dot" aria-hidden="true">·</span><span>' + esc(U.dueText(e.date)) + '</span></span></span>' +
      U.pill(e.done ? 'Załatwione' : k.l, e.done ? 'ok' : k.tone) + '</button></li>';
  }

  A.ext.screens.kalendarz = (p) => {
    if (!view) { view = new Date(T.today.getFullYear(), T.today.getMonth(), 1, 12); sel = T.today; }
    const ev = events();
    const inMonth = ev.filter((e) => e.date.getMonth() === view.getMonth() && e.date.getFullYear() === view.getFullYear());
    const dayList = sel ? ev.filter((e) => same(e.date, sel)) : [];
    const upcoming = ev.filter((e) => T.inDays(e.date) >= 0 && !e.done).slice(0, 8);
    const counts = {}; S.events().forEach((e) => { counts[e.cat] = (counts[e.cat] || 0) + 1; });
    const s = A.screen('kalendarz',
      '<div class="pad stack"><h1>Kalendarz</h1>' +
        '<p class="lead">Wszystkie terminy w jednym miejscu: pisma, dokumenty, OC, płatności i sprawy rodziny.</p>' +
        U.chips('cal-filtr', [{ id: 'all', label: 'Wszystkie', n: S.events().length }].concat(S.CATS.map((c) => ({ id: c.id, label: c.label, icon: c.icon, n: counts[c.id] || 0 }))), filtr, 'Rodzaj terminu') +
        '<section class="s2-cal-box" aria-label="Miesiąc">' +
          '<div class="s2-cal-head"><button type="button" class="round-btn" data-act="cal-mon" data-d="-1" aria-label="Poprzedni miesiąc">' + ic('chevronLeft') + '</button>' +
            '<h2 id="cal-m" aria-live="polite">' + MIES[view.getMonth()] + ' ' + view.getFullYear() + '</h2>' +
            '<button type="button" class="round-btn" data-act="cal-mon" data-d="1" aria-label="Następny miesiąc">' + ic('chevronRight') + '</button></div>' +
          grid(ev) +
          '<p class="s2-cal-legend"><span><i class="dot k-termin"></i>termin</span><span><i class="dot k-waznosc"></i>ważność</span><span><i class="dot k-przypomnienie"></i>przypomnienie</span><span><i class="dot k-szacunek"></i>szacunek</span></p>' +
          '<p class="sr-only">W miesiącu: ' + A.plural(inMonth.length, 'termin', 'terminy', 'terminów') + '. Strzałki zmieniają dzień.</p>' +
        '</section>' +
        '<section aria-labelledby="cal-day-h"><h2 id="cal-day-h">' + (sel ? esc(T.fmtLong(sel)) + (same(sel, T.today) ? ' (dziś)' : '') : 'Wybierz dzień') + '</h2>' +
          (dayList.length ? '<ul class="s2-evs">' + dayList.map(evRow).join('') + '</ul>' : '<p class="empty">Tego dnia nie ma terminów.</p>') +
          '<button type="button" class="btn secondary wide" data-act="cal-add">' + ic('plus', 20) + 'Dodaj przypomnienie' + (sel ? ' na ' + esc(T.fmtShort(sel)) : '') + '</button>' +
        '</section>' +
        '<section aria-labelledby="cal-up-h"><h2 id="cal-up-h">Nadchodzące</h2>' +
          (upcoming.length ? '<ul class="s2-evs">' + upcoming.map(evRow).join('') + '</ul>' : U.empty('calendar', 'Brak nadchodzących terminów', filtr === 'all' ? '' : 'Zmień filtr, żeby zobaczyć inne terminy.')) +
        '</section>' +
        '<p class="s2-note">' + ic('info', 16) + '<span>Terminy oznaczone „szacunek” wylicza prototyp. Nie są prawnie wiążące. Terminy z pism i dokumentów pochodzą z danych demonstracyjnych.</span></p>' +
      '</div>');
    s._after = () => {
      const g = s.querySelector('.s2-cal');
      g.addEventListener('keydown', (e) => {
        const b = e.target.closest('.s2-day');
        if (!b) return;
        const d = A.store.fromIso(b.dataset.d);
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
        let to = null;
        if (step) to = T.plus(T.inDays(d) + step);
        if (e.key === 'Home') to = T.plus(T.inDays(d) - ((d.getDay() + 6) % 7));
        if (e.key === 'End') to = T.plus(T.inDays(d) + (6 - ((d.getDay() + 6) % 7)));
        if (!to) return;
        e.preventDefault();
        pick(to, true);
      });
    };
    return s;
  };
  function pick(d, focus) {
    sel = d;
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1, 12);
    A.render();
    if (focus) { const b = document.querySelector('.s2-day[data-d="' + key(d) + '"]'); if (b) b.focus(); }
  }
  A.ext.acts['cal-day'] = (t) => pick(A.store.fromIso(t.dataset.d), true);
  A.ext.acts['cal-mon'] = (t) => {
    const n = Number(t.dataset.d);
    view = new Date(view.getFullYear(), view.getMonth() + n, 1, 12);
    sel = null;
    A.render();
    const b = document.querySelector('[data-act="cal-mon"][data-d="' + n + '"]'); if (b) b.focus();
  };
  A.ext.acts['cal-filtr'] = (t) => { filtr = t.dataset.v; A.render(); const b = document.querySelector('[data-act="cal-filtr"][data-v="' + filtr + '"]'); if (b) b.focus(); };

  A.ext.acts['cal-ev'] = (t) => {
    const e = S.events().find((x) => x.id === t.dataset.id);
    if (!e) return;
    const k = KIND[e.kind] || KIND.termin;
    const cat = S.CATS.find((c) => c.id === e.cat) || S.CATS[0];
    U.sheet.open({
      title: e.title, opener: t,
      html: '<dl class="s2-sum">' +
          '<div><dt>Data</dt><dd>' + esc(T.fmtLong(e.date)) + ' ' + A.demo.year + ' ' + U.pill(U.dueText(e.date), U.dueTone(e.date)) + '</dd></div>' +
          '<div><dt>Rodzaj</dt><dd>' + U.pill(k.l, k.tone) + '<span class="s2-qa-n">' + esc(k.d) + '</span></dd></div>' +
          '<div><dt>Kategoria</dt><dd>' + esc(cat.label) + '</dd></div>' +
          '<div><dt>Źródło</dt><dd>' + esc(e.source || '') + '</dd></div>' +
          (e.note ? '<div><dt>Notatka</dt><dd>' + esc(e.note) + '</dd></div>' : '') +
          (e.detail ? '<div><dt>Uwaga</dt><dd>' + esc(e.detail) + '</dd></div>' : '') +
        '</dl>' +
        '<div class="q-actions">' + (e.attrs ? '<button type="button" class="btn primary" data-act="cal-open" data-id="' + esc(e.id) + '">Przejdź do sprawy</button>' : '') +
          (e.mine ? '<button type="button" class="btn secondary" data-act="cal-del" data-id="' + esc(e.mine) + '">' + ic('trash', 20) + 'Usuń przypomnienie</button>' : '') +
          '<button type="button" class="btn ghost" data-act="s2sheet-close">Zamknij</button></div>'
    });
  };
  // „Przejdź do sprawy”: zamyka arkusz i uruchamia ten sam przycisk co w miejscu terminu (data-go, data-act, data-run).
  A.ext.acts['cal-open'] = (t) => {
    const e = S.events().find((x) => x.id === t.dataset.id);
    U.sheet.close(true);
    if (!e || !e.attrs) return;
    const tmp = A.node('<button type="button" ' + e.attrs + ' hidden></button>');
    document.getElementById('main').appendChild(tmp);
    tmp.click();
    tmp.remove();
  };
  A.ext.acts['cal-del'] = (t) => {
    A.store.update((s) => { s.reminders = s.reminders.filter((r) => r.id !== t.dataset.id); });
    U.sheet.close(true);
    A.toast('Przypomnienie usunięte.', 'ok');
    A.render();
  };
  A.ext.acts['cal-add'] = (t) => {
    const d = sel || T.today;
    U.sheet.open({
      title: 'Nowe przypomnienie', opener: t,
      html: '<form class="s2-form" id="cal-form" novalidate>' +
        U.field({ id: 'tytul', label: 'O czym przypomnieć?', type: 'text', required: true, pattern: /\S{2,}/, msg: 'Wpisz kilka słów, np. „Odebrać dowód”.' }) +
        U.field({ id: 'data', label: 'Kiedy?', type: 'date', required: true, value: A.store.iso(d), min: 0, minMsg: 'Przypomnienie może być najwcześniej dziś (' + T.fmt(T.today) + ').', max: 730, maxMsg: 'Wybierz datę w ciągu dwóch lat.' }) +
        U.field({ id: 'notatka', label: 'Notatka', type: 'textarea', max: 200 }) +
        '<p class="s2-note">' + ic('info', 16) + '<span>Przypomnienie jest tylko w tej przeglądarce. Nie ma skutków prawnych.</span></p>' +
        '<div class="q-actions"><button type="button" class="btn primary" data-act="cal-add-ok">Zapisz</button><button type="button" class="btn ghost" data-act="s2sheet-close">Anuluj</button></div></form>'
    });
  };
  A.ext.acts['cal-add-ok'] = () => {
    const f = [{ id: 'tytul', label: 'O czym przypomnieć', type: 'text', required: true, pattern: /\S{2,}/, msg: 'Wpisz kilka słów, np. „Odebrać dowód”.' },
      { id: 'data', label: 'Kiedy', type: 'date', required: true, min: 0, minMsg: 'Przypomnienie może być najwcześniej dziś (' + T.fmt(T.today) + ').', max: 730, maxMsg: 'Wybierz datę w ciągu dwóch lat.' }];
    const r = U.validate(document.getElementById('cal-form'), f);
    if (!r.ok) return;
    A.store.update((s) => { s.reminders.push({ id: 'r' + Date.now().toString(36), date: r.values.data, title: r.values.tytul, note: r.values.notatka || '' }); });
    U.sheet.close(true);
    sel = A.store.fromIso(r.values.data);
    view = new Date(sel.getFullYear(), sel.getMonth(), 1, 12);
    A.toast('Zapisano przypomnienie na ' + T.fmtOn(sel) + '.', 'ok');
    A.render();
  };

  A.ext.search.push(() => S.events().map((e) => ({ group: 'Kalendarz', title: e.title, sub: T.fmt(e.date) + ' · ' + (KIND[e.kind] || KIND.termin).l, icon: 'calendar', attrs: 'data-act="cal-ev" data-id="' + e.id + '"' })));
  A.ext.deep.kalendarz = () => A.nav('kalendarz');
  A.store.on(() => { if (!A.store.get().reminders.length && !A.store.get().submitted.length) { view = null; sel = null; filtr = 'all'; } });
})(window.APP);
