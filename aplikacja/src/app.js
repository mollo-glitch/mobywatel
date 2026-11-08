/* Ekrany, nawigacja, głos i ustawienia dostępności. */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = A.esc;
  const T = A.time;
  const $ = (s, r) => (r || document).querySelector(s);

  document.documentElement.lang = 'pl';

  /* ---------- stan i ustawienia ---------- */

  A.state = { docIndex: 0, scen: {} };
  A.todo = A.todoSeed();
  A.cases = A.casesSeed();

  const KEY = 'proto-sprawy-ustawienia';
  // Rozmiar tekstu: 0 standardowy, 1 większy (dawne „bigText”), 2 największy. Kontrast: ciemniejsze linie i opisy.
  const settings = { bigText: false, reduceMotion: false, textSize: 0, contrast: false, hc: false, simple: false };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* brak pamięci przeglądarki */ }
  if (![0, 1, 2].includes(settings.textSize)) settings.textSize = settings.bigText ? 1 : 0;
  settings.bigText = settings.textSize > 0;
  const saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignorujemy */ } };
  A.settings = settings;

  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  A.reducedMotion = () => settings.reduceMotion || mq.matches;

  function applySettings() {
    const r = document.documentElement;
    settings.bigText = settings.textSize > 0;
    r.classList.toggle('big-text', settings.textSize === 1);
    r.classList.toggle('text-xl', settings.textSize === 2);
    r.classList.toggle('kontrast', !!settings.contrast);
    r.classList.toggle('wysoki-kontrast', !!settings.hc); // Spinka 2.0: czarno-biały, grube obrysy, żółty fokus
    r.classList.toggle('uproszczony', !!settings.simple); // Spinka 2.0: mniej sekcji, większe cele, prostsze etykiety
    r.classList.toggle('reduce-motion', A.reducedMotion());
    document.querySelectorAll('[data-text-size]').forEach((b) => { const on = Number(b.dataset.textSize) === settings.textSize; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    document.querySelectorAll('[data-setting]:not([data-setting="aiSend"])').forEach((b) => {
      const on = b.dataset.setting === 'reduceMotion' ? A.reducedMotion() : !!settings[b.dataset.setting];
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      if (b.dataset.setting === 'reduceMotion' && mq.matches) {
        b.setAttribute('aria-disabled', 'true');
        const s = b.querySelector('.sw-sub');
        if (s) s.textContent = 'Włączone w ustawieniach Twojego telefonu.';
      }
    });
    const aa = $('#aa-btn');
    if (aa) aa.setAttribute('aria-pressed', settings.bigText ? 'true' : 'false');
  }

  // Rozmiar tekstu z Profilu (trzy stopnie) albo z przycisku „A A” w nagłówku (standardowy ↔ większy).
  function setTextSize(v) {
    settings.textSize = [0, 1, 2].includes(v) ? v : 0;
    saveSettings();
    applySettings();
    A.announce(['Standardowy rozmiar tekstu', 'Większy tekst włączony', 'Największy tekst włączony'][settings.textSize]);
    carousels.forEach((c) => c.layout && c.layout()); // pas kopert i odsłanianie sekcji nie mają layout()
  }

  let kb = false;
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key.startsWith('Arrow')) kb = true; }, true);
  // Rozmiar tekstu w Profilu to grupa przycisków radiowych: strzałki zmieniają wybór i przenoszą fokus.
  document.addEventListener('keydown', (e) => {
    const r = e.target.closest && e.target.closest('[data-text-size]');
    if (!r || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
    e.preventDefault();
    const next = (Number(r.dataset.textSize) + (/Right|Down/.test(e.key) ? 1 : 2)) % 3;
    setTextSize(next);
    const b = document.querySelector('[data-text-size="' + next + '"]');
    if (b) b.focus();
  });
  window.addEventListener('pointerdown', () => { kb = false; }, true);
  A.lastInputWasKeyboard = () => kb;

  A.announce = (text) => {
    const n = $('#announce');
    if (!n) return;
    n.textContent = '';
    setTimeout(() => { n.textContent = text; }, 60);
  };

  // Komunikat na dole ekranu. kind 'ok' = potwierdzenie (znacznik), inaczej informacja.
  // Wchodzi 8 px z dołu (180 ms), znika przez wygaszenie (160 ms); przy ograniczonym ruchu bez ruchu.
  let toastTimer = 0;
  let toastSeq = 0;
  A.toast = (text, kind) => {
    const t = $('#toast');
    const my = ++toastSeq;
    const was = !t.hidden;
    t.classList.toggle('ok', kind === 'ok');
    t.innerHTML = ic(kind === 'ok' ? 'check' : 'info', 20) + '<span>' + esc(text) + '</span>';
    t.getAnimations().forEach((a) => a.cancel());
    t.hidden = false;
    if (!was && !A.reducedMotion()) t.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      const hide = () => { if (my === toastSeq) t.hidden = true; };
      if (A.reducedMotion()) hide();
      else t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished.then(hide, hide);
    }, 5200);
  };

  /* ---------- sprawy: „Do załatwienia” i „W toku” ---------- */

  const DAYMS = 864e5;
  const byDue = (a, b) => (a.due ? a.due.getTime() : Infinity) - (b.due ? b.due.getTime() : Infinity);
  const plural = (n, one, few, many) => {
    const t = n % 10, h = n % 100;
    return n + ' ' + (n === 1 ? one : (t >= 2 && t <= 4 && (h < 12 || h > 14)) ? few : many);
  };
  A.plural = plural;
  // Bursztyn oznacza termin, który się zbliża (do 14 dni); odległy termin jest spokojny (neutralny), a do 3 dni pilny.
  const dueTone = (d) => { const n = T.inDays(d); return n <= 3 ? 'danger' : n <= 14 ? 'warn' : 'neutral'; };

  // Która rozmowa dotyczy której pozycji: dzięki temu sprawa nie pojawia się w dwóch miejscach.
  const SCEN_TODO = { pismo: 'pismo-us', oc: 'oc' };
  const SCEN_CASE = { nowyDowod: 'nowy-dowod', portfel: 'portfel' };

  A.upsertCase = (c) => {
    const i = A.cases.findIndex((x) => x.id === c.id);
    if (i >= 0) A.cases[i] = Object.assign({}, A.cases[i], c);
    else A.cases.unshift(c);
    refreshBadges();
  };
  A.removeCase = (id) => {
    const i = A.cases.findIndex((x) => x.id === id);
    if (i >= 0) A.cases.splice(i, 1);
  };
  A.newCount = () => A.todo.filter((t) => t.isNew).length + (A.ext && A.ext.unreadCount ? A.ext.unreadCount() : 0);
  A.openTodo = (id) => {
    const t = A.todo.find((x) => x.id === id);
    if (!t) return;
    t.isNew = false;
    if (t.letter) { const l = A.letters.find((x) => x.id === t.letter); if (l) l.unread = false; }
    refreshBadges();
  };
  A.remindTodo = (id, daysBefore) => {
    const t = A.todo.find((x) => x.id === id);
    if (!t || !t.due) return null;
    t.reminder = T.plus(Math.max(1, T.inDays(t.due) - daysBefore));
    t.isNew = false;
    refreshBadges();
    return t.reminder;
  };
  A.resolveTodo = (id) => {
    const i = A.todo.findIndex((x) => x.id === id);
    if (i >= 0) A.todo.splice(i, 1);
    refreshBadges();
  };
  A.markLetterRead = (id) => {
    const l = A.letters.find((x) => x.id === id);
    if (l) l.unread = false;
    const t = A.todo.find((x) => x.letter === id);
    if (t) t.isNew = false;
    refreshBadges();
  };
  // Przerwana albo anulowana rozmowa zostaje przy swojej sprawie, a nie jako osobna pozycja.
  A.scenarioLeft = (cur, cancelled) => {
    const tid = SCEN_TODO[cur.id];
    const cid = SCEN_CASE[cur.id];
    const mark = { step: cur.step, total: cur.total, label: cur.label, cancelled: !!cancelled };
    if (tid && A.todo.some((t) => t.id === tid)) { A.state.scen[cur.id] = mark; return; }
    if (cid && A.cases.some((c) => c.id === cid && c.state !== 'demo')) { A.state.scen[cur.id] = mark; return; }
    if (cur.id === 'dane') return;
    A.upsertCase({ id: 'int-' + cur.id, title: cur.title, state: 'todo', statusText: cancelled ? 'Anulowana przed wysłaniem' : 'Przerwana rozmowa', note: cancelled ? 'Nic nie zostało wysłane.' : 'Zatrzymana na kroku ' + cur.step + ' z ' + cur.total + ': ' + cur.label + '.', run: cur.id, verb: cancelled ? 'Zacznij jeszcze raz' : 'Wróć do sprawy' });
  };
  A.scenarioStarted = (id) => {
    delete A.state.scen[id];
    A.removeCase('int-' + id);
  };

  // Stan rozmowy powiązanej z pozycją: trwająca teraz albo przerwana wcześniej.
  function scenFor(scenId) {
    const cur = A.chat.current();
    if (cur && cur.id === scenId && !cur.done && cur.step > 0) return { live: true, step: cur.step, total: cur.total, label: cur.label };
    return A.state.scen[scenId] || null;
  }
  const scenOfTodo = (t) => Object.keys(SCEN_TODO).find((k) => SCEN_TODO[k] === t.id);
  const scenOfCase = (c) => Object.keys(SCEN_CASE).find((k) => SCEN_CASE[k] === c.id);

  function progressItems() {
    const items = [];
    const cur = A.chat.current();
    const linked = cur && (SCEN_TODO[cur.id] && A.todo.some((t) => t.id === SCEN_TODO[cur.id]) || SCEN_CASE[cur.id] && A.cases.some((c) => c.id === SCEN_CASE[cur.id] && c.state !== 'demo'));
    if (cur && !cur.done && cur.step > 0 && !linked) {
      items.push({ id: 'chat', title: cur.title, state: 'todo', statusText: 'Rozmowa w toku', step: cur.step, steps: cur.total, note: 'Krok ' + cur.step + ' z ' + cur.total + ': ' + cur.label + '.', verb: 'Wróć do rozmowy', tab: 'chat' });
    }
    A.cases.filter((c) => c.state !== 'demo').forEach((c) => items.push(c));
    return items;
  }

  // Termin słowami, z dopiskiem „pilne” przy 3 dniach i mniej (nie samym kolorem).
  const dueWords = (d) => 'za ' + T.dni(T.inDays(d)) + (dueTone(d) === 'danger' ? ', pilne' : '');

  function envelopeHtml(t, i, arrive, lead) {
    const n = t.due ? T.inDays(t.due) : null;
    const tone = t.due ? dueTone(t.due) : 'neutral';
    const openLabel = t.openLabel || 'Otwórz';
    const label = (lead ? 'Najpilniejsza sprawa. ' : '') + 'Nowa sprawa, koperta nieotwarta: ' + t.title + '. Od: ' + t.from + '.' + (t.due ? ' Termin ' + T.fmtLong(t.due) + ', ' + dueWords(t.due) + '.' : '') + ' ' + (t.openLabel ? openLabel + '.' : 'Otwórz kopertę.');
    const open = '<span class="env-open" aria-hidden="true">' + esc(openLabel) + ic('chevronRight', 20) + '</span>';
    const cls = (lead ? 'lead-card' : '') + (arrive ? ' arrive' : '');
    // Pojazd: większa ikona auta na bursztynowym polu i tablica rejestracyjna zamiast linii „Termin · …”.
    const body = t.plate
      ? '<span class="env-body env-car" aria-hidden="true"><span class="env-ic">' + A.carSide(56) + '</span><span class="env-txt"><span class="env-title">' + esc(t.title) + '</span><span class="plate"><span>' + esc(t.plate) + '</span></span></span></span>'
      : '<span class="env-body" aria-hidden="true"><span class="env-ic">' + ic(t.icon, 24) + '</span><span class="env-txt"><span class="env-from">' + esc(t.kind + ' · ' + t.from) + '</span><span class="env-title">' + esc(t.title) + '</span></span></span>';
    return '<li' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + (arrive ? ' style="--i:' + i + '"' : '') + '><button type="button" class="env' + (lead ? ' env-lead' : '') + '" data-act="open-env" data-id="' + t.id + '" aria-label="' + esc(label) + '">' +
      '<svg class="env-flap" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 0 L50 36 L100 0 Z"/></svg>' +
      '<span class="env-seal" aria-hidden="true">' + A.godlo() + '</span>' +
      (t.due && !lead ? '<span class="env-stamp tone-' + tone + '" aria-hidden="true"><span class="env-stamp-k">do</span><span class="env-stamp-d">' + T.fmtDM(t.due) + '</span><span class="env-stamp-n">za ' + T.dni(n) + '</span></span>' : '') +
      '<span class="env-new" aria-hidden="true">Nowa</span>' +
      body +
      open +
    '</button>' + (lead ? dueBlock(t) : '') + '</li>';
  }

  /*
   * Termin najpilniejszej sprawy jako osobny przycisk pod kopertą: dotknięcie rozwija szczegóły
   * (pełna data, co oznacza termin, przypomnienie), a wskazówka zegara wykonuje jeden ruch. Same dane z aplikacji.
   */
  function dueBlock(t) {
    if (!t.due) return '';
    const id = 'due-' + t.id;
    const more = [
      'Termin: ' + T.fmt(t.due) + ' (' + T.fmtLong(t.due).split(',')[0] + '), ' + dueWords(t.due) + '.',
      t.dueNote,
      t.reminder ? 'Przypomnę ' + T.fmtOn(t.reminder) + ' (demo).' : null
    ].filter(Boolean);
    const tone = dueTone(t.due);
    return '<div class="due due-' + tone + (tone === 'neutral' ? '' : ' sig') + '">' +
      '<button type="button" class="due-btn" data-act="due" aria-expanded="false" aria-controls="' + id + '">' + A.clock(24) +
        '<span class="due-txt"><span class="lead-due-k">' + esc(t.dueLabel || 'Najpilniejszy termin') + '</span><span class="lead-due-d">' + esc(T.fmtLong(t.due)) + '</span><span class="lead-due-n">' + dueWords(t.due) + '</span></span>' +
        '<span class="due-chev" aria-hidden="true">' + ic('chevronRight', 20) + '</span>' +
      '</button>' +
      '<div class="due-more" id="' + id + '" hidden><div class="due-more-in">' + more.map((x) => '<p>' + esc(x) + '</p>').join('') + '</div></div>' +
    '</div>';
  }

  function todoRow(t, lead, withNext) {
    const sc = scenFor(scenOfTodo(t));
    const tone = t.due ? dueTone(t.due) : 'neutral';
    const meta = sc
      ? (sc.live ? 'Rozmowa w toku: krok ' : sc.cancelled ? 'Anulowana przed wysłaniem, krok ' : 'Przerwana na kroku ') + sc.step + ' z ' + sc.total
      : t.reminder ? 'Przypomnę ' + T.fmtDM(t.reminder) + ' (demo)'
      : t.from;
    const verb = sc ? (sc.live ? 'Wróć do rozmowy' : 'Wróć do sprawy') : t.verb;
    const verbAttrs = sc && sc.live ? ' data-tab="chat"' : ' data-act="item-go" data-id="' + t.id + '"';
    return '<li class="todo-row">' +
      '<button type="button" class="row" data-act="item" data-id="' + t.id + '">' +
        '<span class="row-ic tone-' + (t.group === 'info' ? 'neutral' : tone) + '">' + ic(t.icon, 24) + '</span>' +
        '<span class="row-main"><span class="row-title">' + esc(t.title) + '</span>' +
          '<span class="row-sub">' + (t.due && !lead ? '<span class="pill pill-' + tone + '">za ' + T.dni(T.inDays(t.due)) + '</span>' : '') + '<span class="row-meta">' + esc(meta) + '</span></span>' +
          (withNext && t.next ? '<span class="row-next"><b>Następny krok:</b> ' + esc(t.next.split('. ')[0].replace(/\.?$/, '.')) + '</span>' : '') + '</span>' +
      '</button>' +
      '<button type="button" class="verb"' + verbAttrs + ' aria-label="' + esc(verb + ': ' + t.title) + '">' + esc(verb) + '</button>' +
    '</li>';
  }

  const STATE_TONE = { todo: 'warn', office: 'info', demo: 'ok' };

  // Profil: czytelne podsumowanie zmiany adresu (status słowami, etapy, termin urzędu). Same dane ze sprawy.
  function addressStatus(c) {
    const due = c.detail && c.detail.due;
    return '<div class="me-status">' +
      '<div class="me-status-top"><b>Zmiana adresu</b><span class="pill pill-info">' + esc(c.statusText) + '</span></div>' +
      '<span class="seg-bar" aria-hidden="true">' + Array.from({ length: c.steps }, (_, i) => '<i class="' + (i < c.step ? 'on' : '') + '"></i>').join('') + '</span>' +
      '<p class="me-status-txt">Etap ' + c.step + ' z ' + c.steps + (due ? ' · urząd ma czas do ' + esc(T.fmtShort(due)) + ' (za ' + T.dni(T.inDays(due)) + ')' : '') + '. Do tego czasu w rejestrze jest adres powyżej.</p>' +
      '<button type="button" class="btn-text sm" data-act="case-detail" data-id="' + c.id + '">Sprawdź status' + ic('chevronRight', 20) + '</button>' +
    '</div>';
  }

  // Stan sprawy „W toku” liczony raz; z niego powstaje pełny wiersz (Sprawy) i krótki (Start).
  function caseModel(c) {
    const sc = scenFor(scenOfCase(c));
    const step = sc ? sc.step : c.step;
    const steps = sc ? sc.total : c.steps;
    const statusText = sc ? (sc.live ? 'Rozmowa w toku' : sc.cancelled ? 'Anulowana przed wysłaniem' : 'Przerwana rozmowa') : c.statusText;
    const verb = sc ? (sc.live ? 'Wróć do rozmowy' : 'Wróć do sprawy') : (c.verb || c.cta || (c.summary ? 'Zobacz podsumowanie' : null));
    let attrs = '';
    if (sc && sc.live) attrs = ' data-tab="chat"';
    else if (c.tab) attrs = ' data-tab="' + c.tab + '"';
    else if (c.run) attrs = ' data-run="' + c.run + '"' + (c.preset ? ' data-preset="' + esc(JSON.stringify(c.preset)) + '"' : '');
    else if (c.detail) attrs = ' data-act="case-detail" data-id="' + c.id + '"';
    else if (c.summary) attrs = ' data-act="case-summary" data-id="' + c.id + '"';
    const deadline = c.state === 'demo' ? null
      : c.due ? { date: c.due, what: c.dueWhat || 'termin' }
      : c.detail && c.detail.due ? { date: c.detail.due, what: 'urząd ma czas do' } : null;
    const next = c.state === 'demo' ? null
      : sc ? (sc.live ? 'Wróć do rozmowy i dokończ krok ' + step + ' z ' + steps + '.' : 'Dokończ od kroku ' + step + ' z ' + steps + ': ' + sc.label + '.')
      : c.next || (c.detail && c.detail.next) || c.note;
    return { sc, step, steps, statusText, verb, attrs, due: c.due && c.state !== 'demo' ? c.due : null, deadline, next };
  }

  // Sprawy: od razu widać status (słowami i etapami) i termin; następny krok ma własne pole razem z jedynym przyciskiem.
  function caseRow(c) {
    const m = caseModel(c);
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    const line = (k, v) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>';
    const status = '<span class="pill pill-' + (STATE_TONE[c.state] || 'neutral') + '">' + esc(m.statusText) + '</span>' +
      (m.steps ? '<span class="cc-step">krok ' + m.step + ' z ' + m.steps + '</span><span class="seg-bar" aria-hidden="true">' + Array.from({ length: m.steps }, (_, i) => '<i class="' + (i < m.step ? 'on' : '') + '"></i>').join('') + '</span>' : '');
    const dl = m.deadline;
    const act = m.attrs && m.verb ? '<button type="button" class="verb cc-act"' + m.attrs + ' aria-label="' + esc(m.verb + ': ' + c.title) + '">' + esc(m.verb) + ic('chevronRight', 20) + '</button>' : '';
    return '<li class="cc">' +
      '<h3 class="cc-title">' + esc(c.title) + '</h3>' +
      '<dl class="cc-lines">' +
        line('Status', status) +
        (dl ? line('Termin', esc(cap(dl.what)) + ' <b>' + esc(T.fmtShort(dl.date)) + '</b> <span class="pill pill-' + dueTone(dl.date) + ' cc-due">za ' + T.dni(T.inDays(dl.date)) + '</span>') : '') +
      '</dl>' +
      (m.next ? '<div class="cc-next"><p class="cc-next-k">' + ic('arrowRight', 20) + 'Następny krok</p><p class="cc-next-t">' + esc(m.next) + '</p>' + act + '</div>' : act) +
    '</li>';
  }

  /* ---------- nawigacja ---------- */

  const TABS = ['start', 'docs', 'chat', 'cases', 'more'];
  let stack = [{ name: 'start' }];
  let carousels = [];
  const seenEnv = new Set(); // koperty, które już raz wjechały na Start
  const main = () => $('#main');

  // Każda zakładka pamięta przewinięcie i swoje ustawienia (np. „W toku”), żeby po powrocie nie zaczynać od początku.
  const tabState = {};
  let shown = null; // trasa, która jest teraz na ekranie

  let navHint = null; // 'push' | 'pop': kierunek krótkiego wsunięcia, gdy nie ma karty, z której ruszyć
  A.nav = (name, params) => {
    if (TABS.includes(name)) {
      const prev = tabState[name];
      stack = [{ name: name, params: params !== undefined ? params : prev && prev.params }];
      render();
      return;
    }
    // Głębiej w tej samej zakładce: dotknięta karta staje się kartą na ekranie szczegółów. W wierszu listy dokumentów
    // leci jego miniatura karty (data-shared), a nie cały wiersz: mały dokument rośnie w duży, bez zmiany kształtu.
    const from = freshOrigin();
    const src = part(from, params && params.id);
    // clip: karta była częściowo schowana w przewijanej liście; powrót trafi w to samo miejsce, więc też będzie schowana.
    // doc: leci sama karta dokumentu (z karuzeli albo miniatura z listy), bez białego kontenera.
    const route = { name: name, params: params, back: from && keyOf(from), clip: !!src && clipped(src), doc: isDoc(src) };
    stack.push(route);
    if (from && A.booted && !gate) morph(src, render, () => main().querySelector(HERO), 'push', null, route.clip, route.doc);
    else { navHint = 'push'; render(); }
  };
  A.back = () => {
    if (stack.length < 2) { render(); return; }
    const leaving = stack.pop();
    // Powrót: karta szczegółów wraca na swoje miejsce na liście (lista ma przywrócone przewinięcie), a pełny profil
    // zwija się do inicjałów, z których go otwarto. Fokus wraca na tę kartę albo na inicjały, nie na nagłówek ekranu.
    // Ze szczegółów dokumentu karta leci do miejsca dokumentu oglądanego na końcu (karuzelą można przejść do innego niż
    // otwarty): wiersza listy, karty karuzeli, portfela. Gdy poprzedni ekran go nie pokazuje (portfel ma trzy karty,
    // karta w rozmowie jeden dokument), nic nie leci do cudzego miejsca: ekran wraca zwykłym wsunięciem.
    const hero = main().querySelector(HERO);
    const id = leaving.name === 'doc' && leaving.params ? leaving.params.id : null;
    const lost = id && leaving.back && !willShow(leaving.back, id);
    const target = () => leaving.name === 'me' ? document.querySelector('#topbar .tb-avatar') : findKey(main(), leaving.back);
    const dest = () => { const t = target(); return id ? showing(t, id) : part(t); };
    // Przewinięcie jest przywrócone; tylko gdy wybrany po drodze dokument leży całkiem poza ekranem, lista przesuwa się
    // o tyle, żeby było go widać (fokus nigdy nie trafia w niewidoczny element). Drugi raz w następnej klatce, po tym,
    // jak render() jeszcze raz ustawi zapamiętane przewinięcie.
    const reveal = () => { const t = target(); if (t && visibleRect(t).height < 1) t.scrollIntoView({ block: 'nearest' }); };
    const update = () => {
      render();
      if (id) { reveal(); requestAnimationFrame(reveal); }
      focusBack(target());
    };
    if (hero && leaving.back && !lost && A.booted && !gate) morph(hero, update, dest, 'pop', null, leaving.clip, leaving.doc && isDoc(hero));
    else { navHint = 'pop'; update(); }
  };
  // Część elementu, która leci w przejściu: w portfelu karta wybranego dokumentu (data-pick), w wierszu listy dokumentów
  // jego miniatura (data-shared), inaczej cały element.
  function part(el, id) {
    if (!el) return el;
    return (id && el.querySelector('[data-pick="' + id + '"] .dcard')) || el.querySelector('[data-shared]') || el;
  }
  // Czy poprzedni ekran pokaże dokument id tam, skąd go otwarto. Klucz wiersza listy i karty karuzeli przechodzi razem
  // z przeglądaniem (docViewer); portfel pokazuje trzy dokumenty, karta w rozmowie jeden.
  function willShow(k, id) {
    if (k.cls === '.wal') return walletDocs().slice(0, 3).some((d) => d.id === id);
    if (k.cls === '.src-card') return k.id === id;
    return true;
  }
  // Ta część, jeśli pokazuje dokument id; inaczej null. Karta z tyłu portfela wraca w cały wachlarz: warstwa przejścia
  // leży nad wszystkim, więc lot do samej karty skończyłby się na dokumencie z wierzchu.
  function showing(el, id) {
    const p = part(el, id);
    if (!p) return null;
    const pick = p.closest('[data-pick]');
    if (pick && !pick.classList.contains('wal-f')) return pick.closest('.wal-stack');
    const idEl = el.matches('[data-id]') ? el : el.querySelector('[data-id]');
    const shown = pick ? pick.dataset.pick : el.matches('.car .dcard') ? (A.docs[Number(el.dataset.i)] || {}).id : idEl && idEl.dataset.id;
    return shown === id ? p : null;
  }
  function isDoc(el) { return !!el && el.matches('.dcard, .doc-ic'); }
  function focusBack(el) {
    const b = el && (el.matches('button, a, [tabindex]') ? el : el.querySelector('button, a, [tabindex]'));
    if (b && A.booted && !gate) b.focus({ preventScroll: true });
  }
  A.ensureRoute = (name, params) => { if (cur().name !== name) A.nav(name, params); };

  /*
   * Systemowy „wstecz” (gest lub przycisk na Androidzie, przycisk przeglądarki). Dopóki w aplikacji jest dokąd wrócić
   * (ekran szczegółów albo otwarte okno sprawy, potwierdzenie, arkusz głosowy, panel wiadomości), nad bieżącym wpisem
   * historii leży jeden wpis „wstecz”. Systemowy „wstecz” zdejmuje go, a aplikacja robi to samo co Escape albo „Wróć”:
   * zamyka okno albo wraca o ekran. Gdy nie ma już dokąd wracać, wpisu nie ma i „wstecz” opuszcza prototyp jak zwykłą
   * stronę (bez „pustego” naciśnięcia). Podgląd profilu (otwierany też najechaniem myszą) wpisu nie dostaje.
   * Gdy History API jest niedostępne (np. ramka z ograniczeniami), zostaje dotychczasowe zachowanie.
   */
  const Hist = (() => {
    let on = true;
    let pending = false; // trwa history.back() wywołane przez aplikację; jego popstate nie jest „wstecz” użytkownika
    const isGuard = () => !!(history.state && history.state.eob === 'wstecz');
    const sheetOpen = () => !!(A.ui && A.ui.sheet && A.ui.sheet.isOpen());
    const want = () => !gate && (stack.length > 1 || Env.isOpen() || Confirm.isOpen() || Msgs.isOpen() || sheetOpen() || !$('#voice').hidden);
    function sync() {
      if (!on || pending || !A.booted) return;
      try {
        if (want() && !isGuard()) history.pushState({ eob: 'wstecz' }, '');
        else if (!want() && isGuard()) { pending = true; history.back(); }
      } catch (e) { on = false; }
    }
    // Najwyższa warstwa: ta sama kolejność co przy Escape.
    function closeTop() {
      if (Confirm.isOpen()) { Confirm.answer(false); return true; }
      if (sheetOpen()) { A.ui.sheet.close(); return true; }
      if (Msgs.isOpen()) { Msgs.close(true); return true; }
      if (Env.isOpen()) { if (Env.isAnimating()) Env.skip(); Env.close(); return true; }
      if (!$('#voice').hidden) { Voice.close(); return true; }
      return false;
    }
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { on = false; }
    window.addEventListener('popstate', () => {
      if (!on) return;
      if (pending) { pending = false; sync(); return; }
      // „Dalej” w przeglądarce wraca na wpis „wstecz”: zostaje tylko wtedy, gdy jest dokąd wracać.
      if (isGuard()) { sync(); return; }
      if (!gate && !closeTop() && stack.length > 1) A.back();
      sync();
    });
    // Okna i panele otwierają się i zamykają w wielu miejscach: wpis dopasowujemy po każdej zmianie ich widoczności.
    let queued = false;
    const later = () => { if (queued) return; queued = true; Promise.resolve().then(() => { queued = false; sync(); }); };
    requestAnimationFrame(() => {
      const app = document.getElementById('app');
      if (app && 'MutationObserver' in window) new MutationObserver(later).observe(app, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    });
    return { sync: later };
  })();
  const cur = () => stack[stack.length - 1];

  // Zmiana zakładki: stary widok znika od razu, więc dwa ekrany nigdy nie są widoczne naraz (żaden tekst nie leży
  // na innym). Nowy wsuwa się o 20 px z kierunku zakładki w 200 ms i od pierwszej klatki jest czytelny (krycie od 0,7,
  // bez pustego ekranu). Przewinięcie i ustawienia zakładki zapisuje render(). Przy ograniczonym ruchu bez animacji.
  function swap(m, old, view, dir) {
    view.getAnimations().forEach((a) => a.cancel());
    // Ten sam ekran (np. rozmowa po zamknięciu koperty) zostaje w drzewie: wyjęcie i włożenie zerowałoby przewinięcie.
    if (old === view && m.children.length === 1) return;
    m.replaceChildren(view);
    if (!dir || !old || old === view) return;
    view.animate([{ opacity: .7, transform: 'translateX(' + (dir * 20) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  /*
   * Wejście w szczegóły i powrót: przejście na wspólnym elemencie. Dotknięta karta (wiersz, karta portfela, dokument
   * z karuzeli, karta źródła w rozmowie) staje się kartą dokumentu na ekranie szczegółów, a przy powrocie wraca na swoje
   * miejsce na liście. Gdy przeglądarka ma View Transition API, robi to ona (zrzut karty przechodzi w zrzut celu);
   * bez niego ten sam efekt daje FLIP: element docelowy startuje z miejsca i rozmiaru karty. Reszta ekranu tylko
   * krótko się pojawia; tekst dwóch ekranów nigdy nie leży na sobie, nic nie zasłania całego ekranu.
   */
  const ORIGIN = '.row, .wal, .car .dcard, .pt, .cc, .me-status, .src-card, .env, .ec-slide, .lead-card, .peek';
  const HERO = '.doc-hero .on > .dcard, .me-hero';
  let origin = null;
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest(ORIGIN);
    origin = el && (el.closest('#main') || el.id === 'me-peek') ? { el: el, t: performance.now() } : null;
  }, true);
  A.markOrigin = (el) => { origin = el ? { el: el, t: performance.now() } : null; };
  const freshOrigin = () => { const o = origin; origin = null; return o && performance.now() - o.t < 1000 && o.el.isConnected ? o.el : null; };

  // Po powrocie ekran rysuje się od nowa, więc ten sam element znajdujemy po klasie i identyfikatorze.
  function keyOf(el) {
    // Koperta na Starcie po otwarciu rysuje się w tym samym slajdzie jako zwykła karta: kluczem jest slajd.
    el = el.closest('.ec-slide') || el;
    const cls = ORIGIN.split(', ').find((c) => el.matches(c));
    const idEl = el.matches('[data-id]') ? el : el.querySelector('[data-id]');
    const id = el.matches('.dcard') ? el.dataset.i : idEl && idEl.dataset.id;
    return cls && id != null ? { cls: cls, id: String(id) } : null;
  }
  function findKey(root, k) {
    return k ? Array.from(root.querySelectorAll(k.cls)).find((x) => {
      const idEl = x.matches('[data-id]') ? x : x.querySelector('[data-id]');
      return String(x.matches('.dcard') ? x.dataset.i : idEl && idEl.dataset.id) === k.id;
    }) || null : null;
  }
  const onScreen = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; };
  const canVT = () => typeof document.startViewTransition === 'function';
  // Część elementu widoczna w jego przewijanych pojemnikach (lista, rozmowa). Pojemniki kończą się na nagłówku i pasku
  // dolnym, więc ruch od tej części albo do niej nigdy nie wchodzi na nagłówek, pole wpisywania ani nawigację.
  function visibleRect(el) {
    const r = el.getBoundingClientRect();
    let top = r.top, bottom = r.bottom, left = r.left, right = r.right;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowY;
      if (o !== 'auto' && o !== 'scroll' && o !== 'hidden') continue;
      const q = p.getBoundingClientRect();
      top = Math.max(top, q.top); bottom = Math.min(bottom, q.bottom); left = Math.max(left, q.left); right = Math.min(right, q.right);
    }
    return { top: top, bottom: bottom, left: left, right: right, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }
  const clipped = (el) => { const r = el.getBoundingClientRect(); const v = visibleRect(el); return v.height < r.height - 1 || v.width < r.width - 1; };

  /*
   * Jedno przejście wspólnego elementu: from (teraz na ekranie) → to() (po zmianie). update() zmienia widok synchronicznie.
   * Z View Transition API: nazwa „eob-shared” najpierw na źródle, po zmianie na celu. Bez niego (albo gdy przejście
   * zostanie przerwane): FLIP na elemencie docelowym. Przy ograniczonym ruchu: sama zmiana.
   */
  let activeVT = null;
  // kind: 'push' / 'pop' (ekran szczegółów, reszta wsuwa się z kierunku) albo 'open' / 'close' (okno nad tą samą listą).
  // fallback: własny ruch zamiast FLIP (np. dla okna koperty); dostaje prostokąt źródła i cel po zmianie.
  // clip = element po stronie listy jest częściowo schowany w przewijanym pojemniku. View Transition prowadzi ruch zawsze
  // do pełnego prostokąta, więc przeszedłby przez nagłówek; wtedy ruch FLIP od widocznej części (albo do niej).
  // doc = leci karta dokumentu (z karuzeli albo miniatura z listy) do karty na ekranie szczegółów lub z powrotem:
  // bez białego kontenera, strona pod spodem się nie przesuwa (style .vt-doc), a bez View Transition API leci sama karta.
  function morph(from, update, to, kind, fallback, clip, doc) {
    if (activeVT) { try { activeVT.skipTransition(); } catch (e) { /* ignore */ } activeVT = null; }
    if (A.reducedMotion() || !from || !onScreen(from) || visibleRect(from).height < 8) { update(); return; }
    const first = visibleRect(from);
    const radius = getComputedStyle(from).borderRadius;
    if (canVT() && !clip && !clipped(from)) {
      from.style.viewTransitionName = 'eob-shared';
      // vt-thumb: z miniatury w wierszu listy (inny obraz niż karta): miniatura gaśnie od razu, bez prześwitu jej ikony.
      const cls = ['vt-shared', 'vt-' + (kind || 'push')].concat(doc ? ['vt-doc'] : [], doc && from.matches('.doc-ic') ? ['vt-thumb'] : []);
      document.documentElement.classList.add.apply(document.documentElement.classList, cls);
      let target = null;
      const vt = document.startViewTransition(() => {
        from.style.viewTransitionName = '';
        update();
        target = to();
        if (target && onScreen(target)) target.style.viewTransitionName = 'eob-shared';
        // Karta dokumentu nie ma dokąd wrócić (np. jej karta w rozmowie jest poza ekranem): gaśnie w miejscu, bez lotu.
        else if (doc && kind === 'pop') { document.documentElement.classList.add('vt-lost'); cls.push('vt-lost'); }
      });
      activeVT = vt;
      const done = () => { if (target) target.style.viewTransitionName = ''; from.style.viewTransitionName = ''; document.documentElement.classList.remove.apply(document.documentElement.classList, cls); if (activeVT === vt) activeVT = null; };
      vt.finished.then(done, done);
      return;
    }
    // Powrót bez View Transition API: kopia karty szczegółów powstaje przed podmianą ekranu. Dokument leci jako sama
    // karta (flyCard, landCard); inne karty jako kontener (land).
    const card = kind === 'pop' && !fallback && doc ? flyCard(from, first) : null;
    const copy = kind === 'pop' && !fallback && !doc ? flyCopy(from, first) : null;
    update();
    if (fallback) fallback(first, radius, to());
    else if (card) landCard(card, first, to());
    else if (copy) land(copy, to());
    else if (doc) flipCard(first, to());
    else flip(first, radius, to());
  }

  // Kopia karty dokumentu do lotu nad ekranem: bez identyfikatorów, niedostępna dla czytnika i dotyku, przypięta
  // w miejscu oryginału, z tą samą szerokością (--cw), od której karta skaluje treść.
  function flyCard(el, r) {
    const c = el.cloneNode(true);
    c.removeAttribute('id');
    c.setAttribute('aria-hidden', 'true');
    c.inert = true;
    const cw = getComputedStyle(el).getPropertyValue('--cw');
    Object.assign(c.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: '40', pointerEvents: 'none', transform: 'none', viewTransitionName: '', boxShadow: getComputedStyle(el).boxShadow });
    if (cw) c.style.setProperty('--cw', cw);
    document.body.appendChild(c);
    return c;
  }

  // Karta maleje do swojego miejsca (karta w karuzeli albo miniatura w wierszu listy) i zostaje nieprzezroczysta przez
  // cały lot; miejsce docelowe pojawia się pod nią dopiero, gdy ma już jego rozmiar, a kopia wtedy gaśnie (ten sam kolor,
  // bez białej plamy i bez pustej klatki).
  function landCard(c, from, target) {
    const done = () => c.remove();
    const to = target && onScreen(target) && visibleRect(target);
    if (!to || to.height < 8) { c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished.then(done, done); return; }
    const end = fit(to, from);
    const D = 300;
    // Miejsce docelowe jest niewidoczne do 75% lotu (animacja, nie zegar: zgadza się także przy spowolnieniu).
    target.animate([{ opacity: 0 }, { opacity: 0, offset: .75 }, { opacity: 1 }], { duration: D });
    // Krzywa tylko na odcinku lotu (do 80%); całość liniowo, żeby kopia nie zaczęła gasnąć, zanim pojawi się cel.
    c.animate([{ transformOrigin: '50% 50%', transform: 'none', opacity: 1, easing: 'cubic-bezier(.2,.8,.2,1)' }, { transformOrigin: '50% 50%', transform: end, opacity: 1, offset: .8 }, { transformOrigin: '50% 50%', transform: end, opacity: 0 }], { duration: D, fill: 'forwards' })
      .finished.then(done, done);
  }

  // Kontener do lotu nad ekranem: biała karta z cieniem (jak kontener View Transition), a w niej kopia elementu bez
  // identyfikatorów, niedostępna dla czytnika i dotyku, przypięta w miejscu oryginału. Karta dokumentu skaluje treść
  // od swojej szerokości (--cw), więc kopia dostaje tę samą wartość.
  function flyCopy(el, r) {
    const cs = getComputedStyle(el);
    const box = document.createElement('div');
    box.className = 'fly-box';
    box.setAttribute('aria-hidden', 'true');
    box.inert = true;
    Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: cs.borderRadius });
    const c = el.cloneNode(true);
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
    const full = el.getBoundingClientRect();
    Object.assign(c.style, { position: 'absolute', left: (full.left - r.left) + 'px', top: (full.top - r.top) + 'px', width: full.width + 'px', height: full.height + 'px', margin: '0', transform: 'none', viewTransitionName: '' });
    if (cs.getPropertyValue('--cw')) c.style.setProperty('--cw', cs.getPropertyValue('--cw'));
    box.appendChild(c);
    document.body.appendChild(box);
    return box;
  }

  /*
   * Bez View Transition API, powrót i zamknięcie: kontener (biała karta z kopią karty albo okno sprawy) leci nad ekranem
   * do widocznej części karty docelowej i przyjmuje jej kształt. Treść kontenera gaśnie w pierwszych 110 ms, karta
   * docelowa pojawia się pod kontenerem w połowie lotu, a kontener gaśnie do 80% czasu. Karta jest niewidoczna tylko
   * na czas lotu (zostaje w drzewie, z fokusem). Tekst dwóch stanów nigdy nie leży na sobie i nie ma klatki z pustym
   * miejscem, do którego nic nie leci.
   */
  function land(c, target, after) {
    const D = 300;
    const finish = () => { if (after) after(); else c.remove(); };
    const box = (r) => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const to = target && onScreen(target) && visibleRect(target);
    if (!to || to.height < 8) { c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished.then(finish, finish); return; }
    const from = c.getBoundingClientRect();
    target.animate([{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1, offset: .62 }, { opacity: 1 }], { duration: D });
    c.animate([Object.assign(box(from), { borderRadius: getComputedStyle(c).borderRadius }), Object.assign(box(to), { borderRadius: getComputedStyle(target).borderRadius })], { duration: D, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    Array.from(c.children).forEach((k) => k.animate([{ opacity: getComputedStyle(k).opacity }, { opacity: 0 }], { duration: 110, fill: 'forwards' }));
    const fade = c.animate([{ opacity: 1 }, { opacity: 1, offset: .5 }, { opacity: 0, offset: .8 }, { opacity: 0 }], { duration: D, fill: 'forwards' });
    fade.finished.then(finish, finish);
  }

  // Przekształcenie, które kładzie prostokąt b na prostokącie a (równa skala, środek na środku: element nie jest rozciągany).
  const fit = (a, b) => 'translate(' + ((a.left + a.width / 2) - (b.left + b.width / 2)) + 'px,' + ((a.top + a.height / 2) - (b.top + b.height / 2)) + 'px) scale(' + Math.min(a.width / b.width, a.height / b.height) + ')';
  A.fit = fit;

  // Wejście w dokument bez View Transition API. Karta szczegółów leży w poziomym pasku karuzeli, który przycina wszystko,
  // co z niego wystaje, więc z miejsca karty źródłowej rośnie jej kopia nad ekranem; karta pod spodem jest niewidoczna
  // dokładnie przez czas lotu, a potem kopia znika (ten sam obraz w tym samym miejscu).
  function flipCard(first, target) {
    if (!target || !onScreen(target)) return;
    const last = target.getBoundingClientRect();
    if (!last.width || !last.height) return;
    const c = flyCard(target, last);
    const done = () => c.remove();
    target.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 280 });
    c.animate([{ transformOrigin: '50% 50%', transform: fit(first, last) }, { transformOrigin: '50% 50%', transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.then(done, done);
  }

  // FLIP: element docelowy (nieprzezroczysty) rusza z miejsca karty źródłowej i rośnie do swojego rozmiaru.
  function flip(first, radius, target) {
    if (!target || !onScreen(target)) return;
    const last = target.getBoundingClientRect();
    if (!last.width || !last.height) return;
    target.animate([{ transformOrigin: '50% 50%', transform: fit(first, last) }, { transformOrigin: '50% 50%', transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  /*
   * Wskaźnik wybranej zakładki: jeden element w dolnym pasku, który przesuwa się pod wybraną ikonę (260 ms),
   * zamiast osobnego podświetlenia w każdej zakładce. Pozycja z układu (offsetLeft), więc wciśnięcie ikony jej nie zmienia.
   * Przy zmianie rozmiaru i większym tekście wskaźnik staje od razu; przy ograniczonym ruchu przeskakuje.
   */
  const Ind = (() => {
    let placed = false;
    function place(animate) {
      const bar = document.querySelector('.tabbar');
      const ind = bar && bar.querySelector('.tab-ind');
      const tab = bar && bar.querySelector('.tab.on');
      const icn = tab && tab.querySelector('.tab-ic');
      if (!ind || !icn || !icn.offsetWidth) return;
      bar.classList.toggle('ind-anim', !!animate && placed && !A.reducedMotion());
      ind.style.width = icn.offsetWidth + 'px';
      ind.style.height = icn.offsetHeight + 'px';
      ind.style.transform = 'translate3d(' + (tab.offsetLeft + icn.offsetLeft) + 'px,' + (tab.offsetTop + icn.offsetTop) + 'px,0)';
      bar.classList.add('ind-on');
      placed = true;
    }
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => place(false));
      requestAnimationFrame(() => { const bar = document.querySelector('.tabbar'); if (bar) ro.observe(bar); });
    }
    return { place: place };
  })();

  function render() {
    carousels.forEach((c) => c.destroy());
    carousels = [];
    const r = cur();
    const m = main();
    const root = stack.length === 1;
    const old = m.querySelector(':scope > .screen');
    if (shown && old) {
      if (shown.root) tabState[shown.name] = { params: shown.route.params, scroll: old.scrollTop };
      else shown.route.scroll = old.scrollTop;
    }
    const view = ((A.ext && A.ext.screens[r.name]) || SCREENS[r.name] || SCREENS.start)(r.params || {});
    const moving = shown && A.booted && !gate && !A.reducedMotion();
    const tabSwitch = moving && shown.root && root && shown.name !== r.name;
    const hint = navHint;
    navHint = null;
    swap(m, old, view, tabSwitch ? (TABS.indexOf(r.name) > TABS.indexOf(shown.name) ? 1 : -1) : moving && hint === 'push' ? 1 : moving && hint === 'pop' ? -1 : 0);
    renderTopbar(r);
    const curTab = TABS.includes(r.name) ? r.name : stack[0].name;
    document.querySelectorAll('.tab').forEach((t) => {
      const on = t.dataset.tab === curTab;
      t.classList.toggle('on', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    Ind.place(!!(shown && shown.tab !== curTab));
    // Karuzela liczy wymiary dopiero na stronie (wcześniej nie zna szerokości); inaczej na małym ekranie
    // jej wysokość zmienia się po przywróceniu przewinięcia i lista przesuwa się o kilkadziesiąt pikseli.
    carousels.forEach((c) => c.layout && c.layout());
    if (r.name !== 'chat') {
      const saved = (root ? tabState[r.name] && tabState[r.name].scroll : r.scroll) || 0;
      view.scrollTop = saved;
      if (saved) requestAnimationFrame(() => { view.scrollTop = saved; });
    } else {
      const sc = view.querySelector('.chat-scroll');
      if (!shown || shown.name !== 'chat') sc.scrollTop = sc.scrollHeight;
      if (!(r.params && r.params.noIntro)) A.chat.intro();
    }
    const h = view.querySelector('h1');
    if (h && A.booted && !gate) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    shown = { name: r.name, root: root, route: r, depth: stack.length, tab: stack[0].name };
    applySettings();
    refreshBadges();
    if (view._after) view._after();
    Hist.sync();
  }
  A.render = () => render();

  // Karta pod przyciskiem w nagłówku (podgląd profilu, wiadomości) rozwija się w dół spod przycisku. Widoczna część jest
  // od pierwszej klatki nieprzezroczysta, więc tekst karty nie prześwituje przez to, co leży pod nią (bez przenikania).
  A.dropIn = (c) => c.animate([{ clipPath: 'inset(0 0 100% 0 round 20px)', transform: 'translateY(-4px)' }, { clipPath: 'inset(0 0 0 0 round 20px)', transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });

  /*
   * Szybki podgląd profilu pod inicjałami na Starcie: imię i nazwisko, miasto, zamaskowany PESEL i stan sprawy
   * adresowej (tylko dane, które już są w prototypie). Dotknięcie otwiera i zamyka; na komputerze także najechanie
   * myszą albo fokus z klawiatury. Zamyka go dotknięcie poza kartą, Escape i każda zmiana ekranu.
   */
  const Peek = (() => {
    let pinned = false;
    let timer = 0;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const ZONE = '#topbar .tb-avatar, #me-peek';
    const btn = () => document.querySelector('#topbar .tb-avatar');
    const card = () => document.getElementById('me-peek');
    const isOpen = () => !!card() && !card().hidden;

    function html() {
      const P = A.person;
      const c = A.cases.find((x) => x.id === 'adres');
      const due = c && c.detail && c.detail.due;
      return '<div class="peek-head"><span class="avatar peek-av" aria-hidden="true">' + esc(P.initials) + '</span>' +
          '<span class="peek-id"><span class="peek-name" id="peek-name">' + esc(P.first + ' ' + P.last) + '</span><span class="peek-meta">' + esc(P.city) + ' · osoba fikcyjna</span></span></div>' +
        '<dl class="peek-dl"><div><dt>PESEL</dt><dd class="masked" aria-label="PESEL zakryty, widać pierwsze 6 cyfr">' + esc(P.peselMasked) + '</dd></div></dl>' +
        (c ? '<div class="peek-status"><div class="peek-status-top"><b>Zmiana adresu</b><span class="pill pill-info">' + esc(c.statusText) + '</span></div>' +
          '<span class="seg-bar" aria-hidden="true">' + Array.from({ length: c.steps }, (_, i) => '<i class="' + (i < c.step ? 'on' : '') + '"></i>').join('') + '</span>' +
          '<p>Etap ' + c.step + ' z ' + c.steps + (due ? ' · urząd ma czas do ' + esc(T.fmtShort(due)) : '') + '</p></div>' : '') +
        '<button type="button" class="btn secondary wide peek-go" data-go="me">Zobacz cały profil' + ic('chevronRight', 20) + '</button>';
    }
    function open(pin) {
      clearTimeout(timer);
      const b = btn();
      const c = card();
      if (!b || !c) return;
      if (pin) pinned = true;
      if (isOpen()) return;
      Msgs.close();
      c.innerHTML = html();
      c.hidden = false;
      fit();
      b.setAttribute('aria-expanded', 'true');
      if (!A.reducedMotion()) A.dropIn(c);
    }
    // Na niskim ekranie (np. 320 px z większym tekstem) karta kończy się nad dolnym paskiem i przewija się w środku:
    // nie zasłania zakładek, a „Zobacz cały profil” zawsze da się osiągnąć.
    function fit() {
      const c = card();
      const top = document.getElementById('topbar');
      const bar = document.querySelector('.tabbar');
      if (!c || c.hidden || !top || !bar) return;
      c.style.maxHeight = '';
      const room = Math.floor(bar.getBoundingClientRect().top - top.getBoundingClientRect().bottom - 8);
      if (c.scrollHeight > room) c.style.maxHeight = Math.max(160, room) + 'px';
    }
    window.addEventListener('resize', fit);
    function close(focusBack) {
      clearTimeout(timer);
      pinned = false;
      const b = btn();
      const c = card();
      if (!c || c.hidden) return;
      c.hidden = true;
      if (b) { b.setAttribute('aria-expanded', 'false'); if (focusBack) b.focus(); }
    }
    // Dotknięcie albo Enter: otwiera i „przypina”; drugie zamyka. Podgląd otwarty najechaniem pierwsze kliknięcie przypina.
    function click() { if (isOpen() && pinned) close(); else open(true); }
    const later = () => { if (pinned) return; clearTimeout(timer); timer = setTimeout(() => close(), 220); };
    const inZone = (el) => !!(el && el.closest && el.closest(ZONE));

    document.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse' && fine.matches && inZone(e.target)) open(false); });
    document.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && fine.matches && inZone(e.target) && !inZone(e.relatedTarget)) later(); });
    document.addEventListener('focusin', (e) => {
      if (inZone(e.target) && isOpen()) { clearTimeout(timer); return; }
      if (kb && e.target.matches && e.target.matches('#topbar .tb-avatar')) open(false);
    });
    document.addEventListener('focusout', (e) => { if (isOpen() && inZone(e.target) && !inZone(e.relatedTarget)) later(); });
    // Dotknięcie poza kartą tylko zamyka podgląd; nie uruchamia przy okazji tego, co leży pod spodem.
    let swallow = 0;
    document.addEventListener('pointerdown', (e) => { if (isOpen() && !inZone(e.target)) { close(); swallow = Date.now(); } }, true);
    document.addEventListener('click', (e) => {
      if (swallow && Date.now() - swallow < 600 && !inZone(e.target)) { e.preventDefault(); e.stopPropagation(); }
      swallow = 0;
    }, true);
    return { click, close, isOpen };
  })();

  /*
   * Wiadomości pod kopertą w nagłówku (ta sama zasada co podgląd profilu: najpierw krótko, całość na życzenie).
   * Same fakty, które już są w prototypie: pisma i termin z „Do załatwienia”, wysłane zgłoszenie z „W toku” i odczyty
   * danych z „Kto ma dostęp”, każdy ze swoją datą; przypomnienie o terminie ma datę dnia pokazu. Najnowsze na górze.
   * Do trzech wiadomości widać wszystkie; więcej: trzy najnowsze i „Zobacz wszystkie (N)”, które rozwija resztę na miejscu.
   * Licznik na kopercie to liczba nowych (nieotwartych) wiadomości, oznaczonych na liście słowem „nowa”.
   */
  const Msgs = (() => {
    const MAX = 3;
    const btn = () => document.getElementById('env-btn');
    const card = () => document.getElementById('msgs');
    const isOpen = () => !!card() && !card().hidden;
    const ZONE = '#env-btn, #msgs';

    function list() {
      const out = (A.ext && A.ext.notifications ? A.ext.notifications() : []).slice();
      A.todo.forEach((t) => {
        const L = t.letter && A.letters.find((x) => x.id === t.letter);
        out.push({ title: t.title, from: L ? t.from : 'Przypomnienie o terminie', when: L ? L.got : T.today, unread: !!t.isNew, icon: t.icon, attrs: 'data-act="item" data-id="' + t.id + '"' });
      });
      const adres = A.cases.find((c) => c.id === 'adres' && c.sent);
      if (adres) out.push({ title: 'Zgłoszenie zmiany adresu wysłane', from: adres.detail ? adres.detail.from : 'Urząd', when: adres.sent, unread: false, icon: 'home', attrs: 'data-act="case-detail" data-id="adres"' });
      // Odczyt danych: dwa pierwsze pola i ile jeszcze (pełna lista jest w „Kto ma dostęp do moich danych”).
      const fields = (w) => w.slice(0, 2).join(', ') + (w.length > 2 ? ' i ' + plural(w.length - 2, 'inna dana', 'inne dane', 'innych danych') : '');
      A.consents.forEach((c) => out.push({ title: 'Odczyt danych: ' + c.who, from: fields(c.what), when: c.last, unread: false, icon: c.icon, attrs: 'data-go="access"' }));
      return out.sort((a, b) => (b.unread - a.unread) || (b.when - a.when));
    }
    A.messages = list;
    const ago = (d) => { const n = -T.inDays(d); return n <= 0 ? 'dziś' : n === 1 ? 'wczoraj' : n < 7 ? n + ' dni temu' : T.fmtShort(d); };
    const row = (m) =>
      '<li><button type="button" class="msg-row' + (m.unread ? ' unread' : '') + '" ' + m.attrs + '>' +
        '<span class="row-ic tone-neutral">' + ic(m.icon, 20) + '</span>' +
        '<span class="msg-main"><span class="msg-title">' + esc(m.title) + '</span><span class="msg-meta">' + esc(m.from) + '</span>' +
          '<span class="msg-foot"><span class="msg-when">' + ago(m.when) + '</span>' + (m.unread ? '<span class="msg-new">nowa</span>' : '') + '</span></span>' +
      '</button></li>';
    function html() {
      const all = list();
      const unread = all.filter((m) => m.unread).length;
      const rest = all.slice(MAX);
      return '<div class="msgs-head"><h2 id="msgs-h">Powiadomienia</h2><span class="msgs-n">' + (unread ? plural(unread, 'nowa', 'nowe', 'nowych') : 'brak nowych') + '</span></div>' +
        // Lista przewija się w środku panelu; „Zobacz wszystkie (N)” i link do spraw zostają zawsze widoczne na dole
        // (także przy 320 px i większym tekście).
        '<div class="msgs-scroll">' +
          (all.length ? '<ul class="msgs-list">' + all.slice(0, MAX).map(row).join('') + '</ul>' : '<p class="msgs-empty">Nie masz powiadomień.</p>') +
          (rest.length ? '<ul class="msgs-list" id="msgs-rest" hidden>' + rest.map(row).join('') + '</ul>' : '') +
        '</div>' +
        '<div class="msgs-foot">' +
          (rest.length ? '<button type="button" class="btn secondary wide msgs-more" aria-expanded="false" aria-controls="msgs-rest">Zobacz wszystkie (' + all.length + ')</button>' : '') +
          '<button type="button" class="btn-text msgs-cases" data-act="cases" data-which="todo">Przejdź do spraw do załatwienia' + ic('chevronRight', 20) + '</button>' +
        '</div>';
    }
    // Panel kończy się nad dolnym paskiem i przewija się w środku (jak podgląd profilu).
    function fit() {
      const c = card();
      const top = document.getElementById('topbar');
      const bar = document.querySelector('.tabbar');
      if (!c || c.hidden || !top || !bar) return;
      c.style.maxHeight = Math.max(200, Math.floor(bar.getBoundingClientRect().top - top.getBoundingClientRect().bottom - 8)) + 'px';
    }
    window.addEventListener('resize', fit);
    function open() {
      const b = btn();
      const c = card();
      if (!b || !c || isOpen()) return;
      Peek.close();
      c.innerHTML = html();
      c.hidden = false;
      fit();
      b.setAttribute('aria-expanded', 'true');
      if (!A.reducedMotion()) A.dropIn(c);
    }
    function close(focusBack) {
      const b = btn();
      const c = card();
      if (!c || c.hidden) return;
      c.hidden = true;
      if (b) { b.setAttribute('aria-expanded', 'false'); if (focusBack) b.focus(); }
    }
    // „Zobacz wszystkie (N)”: reszta pojawia się pod trzema pierwszymi (czytelna od pierwszej klatki, krycie od 40%),
    // przycisk znika, fokus przechodzi na pierwszą nową wiadomość, a panel przewija się do niej.
    function more(t) {
      const rest = document.getElementById('msgs-rest');
      if (!rest) return;
      rest.hidden = false;
      t.remove();
      const rows = Array.from(rest.querySelectorAll('.msg-row'));
      if (!A.reducedMotion()) rows.forEach((r, i) => r.animate([{ opacity: .4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 180, delay: i * 40, easing: 'ease-out', fill: 'backwards' }));
      if (rows[0]) { rows[0].focus({ preventScroll: true }); rows[0].scrollIntoView({ block: 'nearest', behavior: A.reducedMotion() ? 'auto' : 'smooth' }); }
    }
    document.addEventListener('click', (e) => {
      const c = card();
      if (!c || c.hidden || !c.contains(e.target)) return;
      const t = e.target.closest('button');
      if (!t) return;
      if (t.classList.contains('msgs-more')) { e.stopPropagation(); more(t); return; }
      // Wiadomość albo „Przejdź do spraw”: najpierw działa zwykła obsługa przycisku, potem panel się zamyka.
      setTimeout(() => close(), 0);
    }, true);
    // Dotknięcie poza panelem tylko go zamyka; nie uruchamia przy okazji tego, co leży pod spodem.
    let swallow = 0;
    document.addEventListener('pointerdown', (e) => { if (isOpen() && !(e.target.closest && e.target.closest(ZONE))) { close(); swallow = Date.now(); } }, true);
    document.addEventListener('click', (e) => {
      if (swallow && Date.now() - swallow < 600 && !(e.target.closest && e.target.closest(ZONE))) { e.preventDefault(); e.stopPropagation(); }
      swallow = 0;
    }, true);
    return { click: () => (isOpen() ? close() : open()), close, isOpen };
  })();

  function renderTopbar(r) {
    Peek.close();
    const tb = $('#topbar');
    const root = TABS.includes(r.name) && stack.length === 1;
    const n = A.newCount();
    const home = root && r.name === 'start';
    // Na Starcie kompaktowy nagłówek: znak, powitanie i profil. Na pozostałych ekranach sam znak.
    tb.innerHTML =
      (home
        ? '<span class="brand hello"><span class="brand-mark" aria-hidden="true">' + A.godlo() + '</span><span class="hello-txt"><span class="hello-k">Dzień dobry,</span><span class="hello-name">' + esc(A.person.vocative) + '</span></span></span>'
        : root
        ? '<span class="brand"><span class="brand-mark" aria-hidden="true">' + A.godlo() + '</span><span class="brand-name">mObywatel</span><span class="brand-pill">prototyp</span></span>'
        : '<button type="button" class="back-btn" data-act="back">' + ic('back', 24) + '<span>Wróć</span></button>') +
      '<span class="tb-gap"></span>' +
      '<button type="button" class="tb-btn" id="aa-btn" data-act="big-text" aria-pressed="' + (settings.bigText ? 'true' : 'false') + '" aria-label="Większy tekst"><span class="aa" aria-hidden="true">A<small>A</small></span></button>' +
      '<button type="button" class="tb-btn" id="env-btn" data-act="msgs" aria-expanded="false" aria-controls="msgs">' + ic('bell', 24) + '<span class="badge" aria-hidden="true"' + (n ? '' : ' hidden') + '>' + n + '</span></button>' +
      '<section class="peek msgs" id="msgs" hidden aria-labelledby="msgs-h"></section>' +
      (home ? '<button type="button" class="tb-avatar" data-act="me-peek" aria-expanded="false" aria-controls="me-peek" aria-label="Podgląd profilu: ' + esc(A.person.first + ' ' + A.person.last) + ', osoba fikcyjna"><span aria-hidden="true">' + esc(A.person.initials) + '</span></button>' +
        '<section class="peek sig" id="me-peek" data-id="me" hidden aria-labelledby="peek-name"></section>' : '');
    refreshBadges();
  }

  function refreshBadges() {
    const n = A.newCount();
    const btn = document.getElementById('env-btn');
    if (btn) {
      btn.setAttribute('aria-label', 'Powiadomienia' + (n ? ', ' + plural(n, 'nowe', 'nowe', 'nowych') : ', brak nowych'));
      const b = btn.querySelector('.badge');
      b.textContent = n;
      b.hidden = !n;
    }
    const sum = document.getElementById('profile-sum');
    if (sum) sum.textContent = plural(n, 'nowa sprawa', 'nowe sprawy', 'nowych spraw') + ' do załatwienia · ' + plural(progressItems().length, 'sprawa', 'sprawy', 'spraw') + ' w toku';
  }
  A.refreshBadges = refreshBadges;

  /* ---------- ekrany ---------- */

  function screen(cls, html) {
    const s = document.createElement('section');
    s.className = 'screen ' + cls;
    s.innerHTML = html;
    return s;
  }

  // Karuzela zawsze; zwykła lista bez gestów jest pod nią na ekranie Dokumenty (jedna lista, nie osobny tryb).
  function docsBlock(host) {
    carousels.push(new A.Carousel(host, A.docs, { onOpen: (d) => { A.markOrigin(host.querySelector('.dcard.is-front')); A.nav('doc', { id: d.id }); } }));
  }

  function docListHtml() {
    return '<ul class="group doc-list pad-in">' + A.docs.map((d) =>
      '<li><button type="button" class="row" data-go="doc" data-id="' + d.id + '">' +
        '<span class="row-ic doc-ic tone-' + d.tone + '" data-shared>' + ic(d.icon, 24) + '</span>' +
        '<span class="row-main"><span class="row-title">' + esc(d.name) + '</span><span class="row-meta">' + esc(d.key) + ': ' + esc(d.value) + '</span></span>' +
        '<span class="pill pill-' + (d.status.tone === 'warn' ? 'warn' : 'neutral') + '">' + esc(d.status.short || (d.status.tone === 'info' ? 'podgląd' : 'ważny')) + '</span>' +
        '<span class="row-go" aria-hidden="true">' + ic('chevronRight', 20) + '</span>' +
      '</button></li>').join('') + '</ul>';
  }

  /*
   * „Do załatwienia” na Starcie: poziomy pas kopert. Najpilniejsza sprawa jest pierwsza i ma termin napisany wprost,
   * następna wystaje zza krawędzi, a kropki, licznik i strzałki mówią, gdzie jesteś. Gest przesuwa palcem,
   * strzałki i kliknięcie w wystającą kopertę działają myszą. Każda sprawa jest też w „Wszystkie”.
   */
  let envCarId = null; // sprawa ostatnio na wierzchu (powrót na Start, zamknięcie koperty)
  let swipeHinted = false; // podpowiedź gestu pokazujemy raz
  const asDiv = (h) => '<div' + h.slice(3, -5) + '</div>';
  function envCarHtml(items, lead, arriving) {
    const n = items.length;
    const slides = items.map((t, i) => '<div class="ec-slide" data-id="' + t.id + '" role="group" aria-roledescription="slajd" aria-label="' + (i + 1) + ' z ' + n + '">' +
      (t.isNew ? asDiv(envelopeHtml(t, arriving.indexOf(t), arriving.includes(t), t === lead))
        : '<div class="lead-card lead-row-card"><ul>' + todoRow(t, t === lead) + '</ul>' + (t === lead ? dueBlock(t) : '') + '</div>') +
    '</div>').join('');
    return '<div class="ec" role="group" aria-roledescription="karuzela" aria-label="Sprawy do załatwienia">' +
      '<div class="ec-track">' + slides + '</div>' +
      (n > 1 ? '<div class="ec-bar pad"><span class="ec-dots" aria-hidden="true">' + items.map((_, i) => '<i' + (i ? '' : ' class="on"') + '></i>').join('') + '</span>' +
        '<span class="ec-count" aria-live="polite">1 z ' + n + '</span><span class="ec-gap"></span>' +
        '<button type="button" class="ec-arr" data-ec="-1" aria-label="Poprzednia sprawa">' + ic('chevronLeft', 24) + '</button>' +
        '<button type="button" class="ec-arr" data-ec="1" aria-label="Następna sprawa">' + ic('chevronRight', 24) + '</button></div>' : '') +
    '</div>';
  }

  function envCarousel(root) {
    if (!root) return null;
    const track = root.querySelector('.ec-track');
    const slides = Array.from(track.children);
    const dots = Array.from(root.querySelectorAll('.ec-dots i'));
    const count = root.querySelector('.ec-count');
    const prev = root.querySelector('[data-ec="-1"]');
    const next = root.querySelector('[data-ec="1"]');
    let idx = -1;
    let raf = 0;
    const left = (i) => slides[i].offsetLeft - slides[0].offsetLeft;
    function update() {
      raf = 0;
      const stepW = slides.length > 1 ? left(1) : 1;
      const i = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / stepW)));
      if (i === idx) return;
      const first = idx === -1;
      idx = i;
      slides.forEach((sl, k) => sl.classList.toggle('on', k === i));
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      if (count) count.textContent = (i + 1) + ' z ' + slides.length;
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
      envCarId = slides[i].dataset.id;
      // Krótka reakcja po zmianie karty: licznik lekko podskakuje (bez ruchu przy ograniczeniu animacji).
      if (!first && count && !A.reducedMotion()) count.animate([{ transform: 'translateY(3px)', opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
    }
    let stopHint = () => {};
    const go = (i, smooth) => {
      stopHint();
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: left(i), behavior: smooth && !A.reducedMotion() ? 'smooth' : 'auto' });
      if (!smooth) update();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    // Strzałki; kliknięcie myszą albo dotknięcie koperty, która tylko wystaje zza krawędzi, przewija do niej
    // zamiast ją otwierać. Koperta widoczna w całości otwiera się od razu.
    const onClick = (e) => {
      const b = e.target.closest('[data-ec]');
      if (b) { e.stopPropagation(); go(idx + Number(b.dataset.ec), true); return; }
      const sl = e.target.closest('.ec-slide');
      if (!sl || e.detail === 0) return;
      const r = sl.getBoundingClientRect();
      const tr = track.getBoundingClientRect();
      if (!sl.classList.contains('on') && (r.left < tr.left - 2 || r.right > tr.right + 2)) { e.preventDefault(); e.stopPropagation(); go(slides.indexOf(sl), true); }
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('click', onClick, true);
    const start = slides.findIndex((sl) => sl.dataset.id === envCarId);
    go(start > 0 ? start : 0, false);
    // Raz na wejście do aplikacji pas lekko odjeżdża w lewo i wraca, żeby było widać, że koperty da się przesuwać.
    // Bez tego przy ograniczonym ruchu; przerywa go każde działanie użytkownika (dotyk, kółko, strzałki).
    let hint = 0;
    let hintAnims = [];
    if (!swipeHinted && slides.length > 1 && idx === 0 && A.booted && !gate && !A.reducedMotion()) {
      swipeHinted = true;
      hint = setTimeout(() => {
        hintAnims = slides.map((sl) => sl.animate([{ translate: '0 0' }, { translate: '-36px 0', offset: 0.45 }, { translate: '0 0' }], { duration: 760, easing: 'cubic-bezier(.3,.7,.3,1)' }));
      }, 1150);
      stopHint = () => { clearTimeout(hint); hintAnims.forEach((a) => a.cancel()); };
      track.addEventListener('pointerdown', () => stopHint(), { once: true, passive: true });
      track.addEventListener('wheel', () => stopHint(), { once: true, passive: true });
    }
    return { destroy() { stopHint(); track.removeEventListener('scroll', onScroll); root.removeEventListener('click', onClick, true); cancelAnimationFrame(raf); } };
  }

  // Sekcje niżej na Starcie raz „wjeżdżają”, gdy pierwszy raz pojawiają się przy przewijaniu. W spoczynku treść
  // jest zawsze widoczna (ruch zaczyna od 40% krycia), więc nic nie zostaje ukryte. Bez ruchu przy ograniczeniu.
  const revealed = new Set();
  function revealOnScroll(view) {
    if (A.reducedMotion() || !('IntersectionObserver' in window)) return null;
    const bottom = view.getBoundingClientRect().bottom;
    const els = Array.from(view.querySelectorAll('.reveal')).filter((el) => !revealed.has(el.dataset.reveal));
    els.forEach((el) => { if (el.getBoundingClientRect().top < bottom) revealed.add(el.dataset.reveal); });
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting || revealed.has(en.target.dataset.reveal)) return;
      revealed.add(en.target.dataset.reveal);
      io.unobserve(en.target);
      en.target.animate([{ opacity: .4, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }), { root: view, threshold: 0.12 });
    els.filter((el) => !revealed.has(el.dataset.reveal)).forEach((el) => io.observe(el));
    return { destroy: () => io.disconnect() };
  }

  // Pierścień etapów: tyle odcinków, ile etapów; zaliczone są zielone.
  function stepRing(step, steps) {
    const seg = 100 / steps;
    return '<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true" focusable="false">' +
      Array.from({ length: steps }, (_, k) => '<circle class="' + (k < step ? 'on' : '') + '" cx="22" cy="22" r="18" pathLength="100" stroke-dasharray="' + (seg - 4) + ' ' + (100 - seg + 4) + '" stroke-dashoffset="' + (-(k * seg) - 2 + 25) + '"/>').join('') + '</svg>';
  }

  // „W toku” na Starcie: dwa kafelki obok siebie. Od razu widać etap (pierścień i „Etap 1 z 4”), status,
  // następny krok jednym zdaniem i jedno działanie.
  function caseTile(c) {
    const m = caseModel(c);
    const tone = STATE_TONE[c.state] || 'neutral';
    const next = m.next ? m.next.split('. ')[0].replace(/\.?$/, '.') : '';
    const label = c.title + '. ' + m.statusText + (m.steps ? ', etap ' + m.step + ' z ' + m.steps : '') + (m.due ? ', termin za ' + T.dni(T.inDays(m.due)) : '') + '.' + (next ? ' Następny krok: ' + next : '') + (m.verb ? ' ' + m.verb + '.' : '');
    const inner =
      (m.steps ? '<span class="pt-top"><span class="pt-ring" aria-hidden="true">' + stepRing(m.step, m.steps) + '<b>' + m.step + '/' + m.steps + '</b></span><span class="pt-stage">Etap ' + m.step + ' z ' + m.steps + '</span></span>' : '') +
      '<span class="pt-title">' + esc(c.title) + '</span>' +
      '<span class="pill pill-' + tone + '">' + esc(m.statusText) + '</span>' +
      (next ? '<span class="pt-next"><b>Dalej:</b> ' + esc(next) + '</span>' : '') +
      (m.attrs && m.verb ? '<span class="pt-cta" aria-hidden="true">' + esc(m.verb) + ic('chevronRight', 20) + '</span>' : '');
    if (!m.attrs || !m.verb) return '<li><div class="pt static" role="group" aria-label="' + esc(label) + '">' + inner + '</div></li>';
    return '<li><button type="button" class="pt"' + m.attrs + ' aria-label="' + esc(label) + '">' + inner + '</button></li>';
  }

  // Jeden skrót do asystenta: pole „Co chcesz załatwić?” w jednym wierszu (pisanie, mikrofon, wysłanie). Przykłady są w rozmowie.
  function askOne(id) {
    return '<form class="ask-one" data-ask autocomplete="off" aria-label="Zapytaj ' + esc(A.marka ? A.marka.biernik : 'asystenta') + ': co chcesz załatwić?">' +
      '<span class="ask-one-ic" aria-hidden="true">' + A.znak(34, 'slucha', false, 'assistant', 24) + '</span>' +
      '<label class="sr-only" for="' + id + '">Co chcesz załatwić? Opisz sytuację własnymi słowami.</label>' +
      '<input id="' + id + '" type="text" enterkeyhint="send" placeholder="Co chcesz załatwić?">' +
      '<button type="button" class="icon-btn" data-act="voice" data-voice="home" aria-label="Powiedz zamiast pisać">' + ic('mic') + '</button>' +
      '<button type="submit" class="icon-btn send" aria-label="Wyślij">' + ic('send') + '</button>' +
    '</form>';
  }

  // Pod kartą na ekranie szczegółów: ważność dla czytnika (karta jest obrazem), opis, działania i dane dokumentu.
  // Przy zmianie dokumentu w karuzeli rysuje się od nowa, z ukrytymi pełnymi numerami.
  function docBody(d) {
    const rows = d.rows.map((r) =>
      '<div><dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? '<span class="masked" data-full="' + esc(r[1]) + '" data-mask="' + esc(r[2]) + '">' + esc(r[2]) + '</span>' : esc(r[1])) + '</dd></div>').join('');
    const hasMask = d.rows.some((r) => r[2]);
    return '<p class="sr-only">' + esc(d.key + ': ' + d.value + '. ' + d.status.text) + '</p>' +
      (d.note ? '<p class="note-box">' + ic('info', 20) + '<span>' + esc(d.note) + '</span></p>' : '') +
      (d.actions.length ? '<h2>Co możesz zrobić</h2><div class="actions">' + d.actions.map((a) =>
        '<button type="button" class="btn ' + (a.primary ? 'primary' : 'secondary') + ' wide split"' + (a.run ? ' data-run="' + a.run + '"' : '') + (a.go ? ' data-go="' + a.go + '"' : '') + (a.preset ? ' data-preset="' + esc(JSON.stringify(a.preset)) + '"' : '') + '><span>' + esc(a.label) + '</span>' + ic('chevronRight', 20) + '</button>').join('') + '</div>' : '') +
      '<div class="h2-row"><h2>Dane z dokumentu</h2>' + (hasMask ? '<button type="button" class="btn-text" data-act="unmask" aria-pressed="false">' + ic('eye', 20) + '<span>Pokaż pełne dane</span></button>' : '') + '</div>' +
      '<dl class="rows card-rows">' + rows + '</dl>' +
      '<p class="foot-note">Dane są fikcyjne (wzór). Pełne numery są ukryte, żeby nikt nie podejrzał ich przez ramię.</p>';
  }

  /*
   * Karuzela na ekranie szczegółów: wszystkie dokumenty w kolejności listy, w poziomym pasku z przyciąganiem do karty.
   * Dokument zmienia gest palcem, rysikiem lub myszą i gładzik (najwyżej jedna karta na gest), strzałki pod kartą,
   * dotknięcie wystającej karty sąsiada i klawiatura (strzałki, Home, End). Na początku i na końcu odpowiednia strzałka
   * jest wyłączona; z ostatniego dokumentu nie przeskakujemy na pierwszy. Gest pionowy przewija stronę. Zmiana od razu
   * przepisuje tytuł, licznik, opis, działania i dane, a wybór zostaje w trasie: powrót trafia w ten dokument na liście
   * i w karuzeli Dokumentów.
   */
  function docViewer(s, i0) {
    const hero = s.querySelector('.doc-hero');
    const track = hero.querySelector('.dv-track');
    const slides = Array.from(track.children);
    const cards = slides.map((sl) => sl.firstElementChild);
    const dots = Array.from(hero.querySelectorAll('.car-dots i'));
    const count = hero.querySelector('.car-count');
    const prev = hero.querySelector('[data-dv="-1"]');
    const next = hero.querySelector('[data-dv="1"]');
    const h1 = s.querySelector('h1');
    const body = s.querySelector('.dv-body');
    const n = slides.length;
    let idx = -1; // dokument na środku
    let aim = null; // dokąd pasek właśnie jedzie: kolejne strzałki liczą się od celu
    let said = i0; // ostatnio ogłoszony czytnikowi
    let raf = 0, quiet = 0, drag = null, noClick = false;
    const wheel = { t: 0, acc: 0, done: false };
    // Krok paska z ułamkiem piksela (karta ma szerokość z vw): z zaokrąglonym krokiem ostatnia karta nie trafia w środek.
    const stepW = () => (n > 1 ? slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().left : 1) || 1;

    function select(i) {
      if (i === idx) return;
      const first = idx === -1;
      idx = i;
      const d = A.docs[i];
      slides.forEach((sl, k) => sl.classList.toggle('on', k === i));
      dots.forEach((dot, k) => dot.classList.toggle('on', k === i));
      count.textContent = (i + 1) + ' z ' + n;
      track.setAttribute('aria-label', d.name + ', ' + (i + 1) + ' z ' + n);
      prev.setAttribute('aria-disabled', String(i === 0));
      next.setAttribute('aria-disabled', String(i === n - 1));
      prev.setAttribute('aria-label', i > 0 ? 'Poprzedni dokument: ' + A.docs[i - 1].name : 'Poprzedni dokument: to pierwszy dokument');
      next.setAttribute('aria-label', i < n - 1 ? 'Następny dokument: ' + A.docs[i + 1].name : 'Następny dokument: to ostatni dokument');
      if (!first) { h1.textContent = d.name; body.innerHTML = docBody(d); }
      // Wybór zostaje w trasie (odświeżenie ekranu i powrót) i w karuzeli Dokumentów. Wiersz listy i karta karuzeli,
      // do których wraca karta, to teraz ten dokument; portfel i karta w rozmowie zostają (A.back sprawdza, czy go pokazują).
      const r = cur();
      if (r.name === 'doc') {
        r.params = { id: d.id };
        if (r.back && r.back.cls === '.row') r.back.id = d.id;
        if (r.back && r.back.cls === '.car .dcard') r.back.id = String(i);
      }
      A.state.docIndex = i;
    }
    // Sąsiednie karty są trochę mniejsze i ciemniejsze, a ich napisy gasną (z boku widać tylko kolor karty, bez uciętych
    // słów); płynnie wraz z przesunięciem paska, więc karta, która wjeżdża na środek, nabiera treści.
    function paint() {
      raf = 0;
      const pos = track.scrollLeft / stepW();
      cards.forEach((c, k) => {
        // Poniżej 1% kroku to już karta na środku (przewinięcie bywa zaokrąglone do piksela).
        const o = Math.abs(k - pos) < 0.01 ? 0 : Math.min(1, Math.abs(k - pos));
        c.style.transform = o ? 'scale(' + (1 - o * 0.1).toFixed(3) + ')' : '';
        c.style.setProperty('--dim', (o * 0.1).toFixed(3));
        c.firstElementChild.style.opacity = o ? (1 - o).toFixed(3) : '';
      });
      select(Math.max(0, Math.min(n - 1, Math.round(pos))));
    }
    // Po zatrzymaniu paska: czytnik słyszy nowy dokument, a pasek po przeciągnięciu znów przyciąga do karty. Nie wtedy,
    // gdy palec tylko przystanął w trakcie gestu: przyciąganie ściągnęłoby kartę spod palca.
    function settled() {
      if (drag && drag.moved) return;
      aim = null;
      track.classList.remove('dragging');
      if (idx !== said) { said = idx; A.announce(A.docs[idx].name + ', ' + (idx + 1) + ' z ' + n); }
    }
    function go(i, smooth) {
      i = Math.max(0, Math.min(n - 1, i));
      const anim = smooth && !A.reducedMotion();
      aim = anim ? i : null;
      track.scrollTo({ left: i * stepW(), behavior: anim ? 'smooth' : 'auto' });
      if (anim) return;
      const was = idx;
      paint();
      // Przy ograniczonym ruchu karta zmienia się od razu i tylko krótko rozjaśnia, jak w karuzeli Dokumentów.
      if (smooth && idx !== was) cards[idx].animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    }
    const from = () => (aim !== null ? aim : idx);
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
      clearTimeout(quiet);
      quiet = setTimeout(settled, 160);
    };
    const onClick = (e) => {
      const b = e.target.closest('[data-dv]');
      if (b) { if (b.getAttribute('aria-disabled') !== 'true') go(from() + Number(b.dataset.dv), true); return; }
      if (noClick) { noClick = false; return; }
      const sl = e.target.closest('.dv-slide');
      if (sl && Number(sl.dataset.i) !== idx) go(Number(sl.dataset.i), true);
    };
    const onKey = (e) => {
      const k = e.key;
      const to = k === 'ArrowRight' ? from() + 1 : k === 'ArrowLeft' ? from() - 1 : k === 'Home' ? 0 : k === 'End' ? n - 1 : null;
      if (to === null || e.target !== track) return;
      e.preventDefault();
      go(to, true);
    };
    // Przeciągnięcie (palec, rysik, mysz) przesuwa pasek bez przyciągania; gest pionowy zostaje przeglądarce (touch-action)
    // i przewija stronę. Po puszczeniu pasek jedzie do najbliższej karty, najwyżej o jedną od tej, od której gest się
    // zaczął: natywny pęd przeglądarki potrafi przy ograniczonym ruchu przeskoczyć dwie. Szybkie machnięcie, które
    // nie minęło połowy karty, i tak przechodzi o jedną dalej (prędkość z ostatnich 100 ms, jak w karuzeli Dokumentów).
    const onDown = (e) => {
      noClick = false;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, s0: track.scrollLeft, at: from(), moved: false, samples: [{ x: e.clientX, t: e.timeStamp }] };
    };
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      if (!drag.moved) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        drag.moved = true;
        aim = null;
        try { track.setPointerCapture(drag.id); } catch (err) { /* ignore */ }
        track.classList.add('dragging');
      }
      e.preventDefault();
      track.scrollLeft = drag.s0 - dx;
      drag.samples.push({ x: e.clientX, t: e.timeStamp });
      if (drag.samples.length > 8) drag.samples.shift();
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (!d.moved) return;
      noClick = true;
      const b = d.samples[d.samples.length - 1];
      const a = d.samples.find((x) => b.t - x.t <= 100) || d.samples[0];
      const v = e.type === 'pointercancel' ? 0 : (b.x - a.x) / Math.max(1, b.t - a.t);
      let i = Math.round(track.scrollLeft / stepW());
      if (i === d.at && Math.abs(v) > 0.3) i += v < 0 ? 1 : -1;
      go(Math.max(d.at - 1, Math.min(d.at + 1, i)), true);
      // Zakończenie także wtedy, gdy pasek już stoi na celu i nie przyjdzie żadne zdarzenie przewijania.
      clearTimeout(quiet);
      quiet = setTimeout(settled, A.reducedMotion() ? 0 : 160);
    };
    // Gładzik i kółko w poziomie: jeden gest (zdarzenia bez przerwy dłuższej niż 160 ms, razem z bezwładnością) to jeden
    // dokument. Kółko w pionie przewija stronę.
    const onWheel = (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now - wheel.t > 160) { wheel.acc = 0; wheel.done = false; }
      wheel.t = now;
      if (wheel.done) return;
      wheel.acc += e.deltaX * (e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? 300 : 1);
      if (Math.abs(wheel.acc) >= 30) { wheel.done = true; go(from() + (wheel.acc > 0 ? 1 : -1), true); }
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    track.addEventListener('keydown', onKey);
    track.addEventListener('pointerdown', onDown);
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);
    track.addEventListener('pointercancel', onUp);
    track.addEventListener('wheel', onWheel, { passive: false });
    track.addEventListener('dragstart', (e) => e.preventDefault());
    hero.addEventListener('click', onClick);
    go(i0, false);
    return {
      layout() { go(idx, false); },
      destroy() { cancelAnimationFrame(raf); clearTimeout(quiet); track.removeEventListener('scroll', onScroll); }
    };
  }

  // Dokumenty na Starcie: podgląd jak w portfelu. Na wierzchu dokument, który wymaga uwagi (np. kończy się ważność),
  // za nim dwa kolejne. Całą karuzelę ma zakładka Dokumenty. Przycisk portfela (klawiatura, czytnik, napis, kieszeń)
  // otwiera dokument z wierzchu, a dotknięcie wystającej karty z tyłu otwiera ten dokument (data-pick).
  const walletDocs = () => A.docs.slice().sort((a, b) => (b.status.tone === 'warn') - (a.status.tone === 'warn'));
  function walletHtml() {
    const docs = walletDocs();
    const d = docs[0];
    return '<button type="button" class="wal" data-go="doc" data-id="' + d.id + '" aria-label="' + esc(d.name + '. ' + d.key + ': ' + d.value + '. ' + d.status.text + '. Otwórz dokument.') + '">' +
      '<span class="wal-stack" aria-hidden="true">' + docs.slice(1, 3).reverse().map((b, i) => '<span class="wal-card wal-b' + (2 - i) + '" data-pick="' + b.id + '">' + A.docCard(b, { static: true }) + '</span>').join('') +
        '<span class="wal-card wal-f" data-pick="' + d.id + '">' + A.docCard(d, { static: true }) + '</span></span>' +
      '<span class="wal-txt"><span class="wal-k">' + esc(d.eyebrow) + '</span><span class="wal-n">' + esc(d.name) + '</span>' +
        '<span class="wal-v">' + esc(d.key) + ' ' + esc(d.value) + '</span>' +
        '<span class="pill pill-' + (d.status.tone === 'warn' ? 'warn' : 'neutral') + '">' + esc(d.status.text) + '</span></span>' +
      '<span class="wal-pocket"><span class="wal-go">Otwórz dokument' + ic('chevronRight', 20) + '</span></span>' +
    '</button>';
  }

  const SCREENS = {
    start() {
      const allTodo = A.todo.filter((t) => t.group === 'todo');
      const prog = progressItems();
      // Najpilniejsza sprawa (najbliższy termin, nowa albo już otwarta) jest pierwsza w pasie kopert, z terminem napisanym wprost.
      const lead = allTodo.filter((t) => t.due).sort(byDue)[0] || allTodo[0] || null;
      const items = lead ? [lead].concat(allTodo.filter((t) => t !== lead).sort(byDue)) : [];
      // Nowa koperta wjeżdża raz: przy pierwszym pokazaniu po wejściu do aplikacji, nie przy każdym powrocie na Start.
      const live = A.booted && !gate && !A.reducedMotion();
      const fresh = items.filter((t) => t.isNew);
      const arriving = fresh.filter((t) => live && !seenEnv.has(t.id));
      if (live) fresh.forEach((t) => seenEnv.add(t.id));
      const todoHtml = items.length ? envCarHtml(items, lead, arriving) : '<p class="empty pad">Nic nie czeka na Ciebie. Damy znać, gdy pojawi się nowa sprawa.</p>';
      const s = screen('start',
        '<h1 class="sr-only">Start</h1>' +
        '<section class="sec attn mark-warn" aria-labelledby="h-todo"><div class="sec-head pad"><h2 id="h-todo" tabindex="-1">Do załatwienia</h2><button type="button" class="btn-text" data-act="cases" data-which="todo">Wszystkie (' + allTodo.length + ')</button></div>' + todoHtml + '</section>' +
        '<div class="sec pad reveal" data-reveal="ask">' + askOne('ask-home') + '</div>' +
        '<section class="sec mark-ok reveal" data-reveal="prog" aria-labelledby="h-prog"><div class="sec-head pad"><h2 id="h-prog">W toku</h2><button type="button" class="btn-text" data-act="cases" data-which="progress">Wszystkie (' + prog.length + ')</button></div><div class="pad">' +
          (prog.length ? '<ul class="pt-grid">' + prog.slice(0, 2).map(caseTile).join('') + '</ul>' : '<p class="empty">Nie masz rozpoczętych spraw.</p>') + '</div></section>' +
        '<section class="sec mark-accent reveal" data-reveal="docs" aria-labelledby="h-docs"><div class="sec-head pad"><h2 id="h-docs">Dokumenty</h2><button type="button" class="btn-text" data-tab="docs">Wszystkie (' + A.docs.length + ')</button></div><div class="pad">' + walletHtml() + '</div></section>' +
        '<p class="foot-note pad">Prototyp demonstracyjny na mObywatel Challenge. Osoby, dokumenty i pisma są fikcyjne. Nic nie jest wysyłane do żadnego urzędu.</p>'
      );
      // Po wstawieniu do ekranu (i przywróceniu przewinięcia): pas kopert wraca do ostatnio oglądanej sprawy,
      // a sekcje niżej raz „wjeżdżają” przy pierwszym przewinięciu.
      s._after = () => {
        const c = envCarousel(s.querySelector('.ec'));
        if (c) carousels.push(c);
        const r = revealOnScroll(s);
        if (r) carousels.push(r);
      };
      return s;
    },

    docs() {
      const s = screen('docs',
        '<div class="pad"><h1>Dokumenty</h1><p class="lead">Przesuń karty palcem, myszą, kółkiem albo strzałkami. Dotknij karty na środku, żeby zobaczyć szczegóły.</p></div>' +
        '<div class="docs-host"></div>' +
        '<section class="sec mark-accent" aria-labelledby="h-all"><div class="sec-head pad"><h2 id="h-all">Wszystkie dokumenty</h2></div>' + docListHtml() + '</section>' +
        '<p class="foot-note pad">Karty są wzorami z fikcyjnymi danymi. Nie służą do potwierdzania tożsamości.</p>'
      );
      docsBlock(s.querySelector('.docs-host'));
      return s;
    },

    // Szczegóły jednego dokumentu, a nad nimi karuzela wszystkich (w kolejności listy): strzałki, gest i klawiatura
    // przełączają dokument bez wychodzenia z ekranu (docViewer).
    doc(p) {
      const i = Math.max(0, A.docs.findIndex((x) => x.id === p.id));
      const d = A.docs[i];
      const s = screen('doc',
        '<div class="pad stack">' +
          '<h1>' + esc(d.name) + '</h1>' +
          '<div class="doc-hero" role="group" aria-roledescription="karuzela" aria-label="Twoje dokumenty">' +
            '<p class="sr-only" id="dv-help">Strzałki w lewo i w prawo zmieniają dokument.</p>' +
            '<div class="dv-track" role="group" tabindex="0" aria-describedby="dv-help">' +
              A.docs.map((x, k) => '<div class="dv-slide" data-i="' + k + '">' + A.docCard(x, { static: true }) + '</div>').join('') +
            '</div>' +
            '<div class="dv-bar">' +
              '<button type="button" class="round-btn" data-dv="-1">' + ic('chevronLeft') + '</button>' +
              '<div class="dv-now"><span class="car-count"></span><span class="car-dots" aria-hidden="true">' + A.docs.map(() => '<i></i>').join('') + '</span></div>' +
              '<button type="button" class="round-btn" data-dv="1">' + ic('chevronRight') + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="dv-body stack">' + docBody(d) + '</div>' +
        '</div>'
      );
      s._after = () => carousels.push(docViewer(s, i));
      return s;
    },

    chat() {
      return A.chat.screen;
    },

    cases(p) {
      const seg = p.seg === 'progress' ? 'progress' : 'todo';
      const todoAll = A.todo.filter((t) => t.group === 'todo');
      const fresh = todoAll.filter((t) => t.isNew).sort(byDue);
      const opened = todoAll.filter((t) => !t.isNew).sort(byDue);
      const info = A.todo.filter((t) => t.group === 'info');
      const prog = progressItems();
      const done = A.cases.filter((c) => c.state === 'demo');
      const tab = (id, label, count) =>
        '<button type="button" role="tab" id="tab-' + id + '" aria-controls="pane-' + id + '" aria-selected="' + (seg === id) + '" data-seg="' + id + '"' + (seg === id ? '' : ' tabindex="-1"') + '>' + label + ' <span class="seg-n">' + count + '</span></button>';
      const todoPane =
        (fresh.length ? '<h2>Nowe <span class="count">' + fresh.length + '</span></h2><p class="sec-lead">Zamknięta koperta to sprawa, której jeszcze nie otworzyłeś.</p><ul class="envs">' + fresh.map((t, i) => envelopeHtml(t, i, false)).join('') + '</ul>' : '') +
        (opened.length ? '<h2>Otwarte</h2><ul class="group">' + opened.map((t) => todoRow(t, false, true)).join('') + '</ul>' : '') +
        (!todoAll.length ? '<p class="empty">Nic nie czeka na Ciebie. Damy znać, gdy pojawi się nowa sprawa.</p>' : '') +
        (info.length ? '<h2 class="quiet-h">Tylko do wiadomości</h2><ul class="group quiet">' + info.map((t) => todoRow(t)).join('') + '</ul>' : '');
      const progPane =
        '<h2 class="sr-only">Sprawy w toku</h2><p class="sec-lead">Sprawy, które zacząłeś. Każdą dokończysz tam, gdzie przerwałeś.</p>' +
        (prog.length ? '<ul class="case-cards">' + prog.map(caseRow).join('') + '</ul>' : '<p class="empty">Nie masz rozpoczętych spraw.</p>') +
        (done.length ? '<h2 class="quiet-h">Zakończone w demonstracji</h2><ul class="case-cards quiet">' + done.map(caseRow).join('') + '</ul>' : '') +
        '<button type="button" class="btn secondary wide" data-tab="chat">' + ic('plus', 20) + 'Zacznij nową sprawę</button>';
      return screen('cases',
        '<div class="pad stack"><h1>Sprawy</h1>' +
          '<div class="seg" role="tablist" aria-label="Rodzaj spraw" style="--sel:' + (seg === 'progress' ? 1 : 0) + '">' + tab('todo', 'Do załatwienia', todoAll.length) + tab('progress', 'W toku', prog.length) + '</div>' +
          '<div id="pane-todo" role="tabpanel" aria-labelledby="tab-todo" class="stack"' + (seg === 'todo' ? '' : ' hidden') + '>' + todoPane + '</div>' +
          '<div id="pane-progress" role="tabpanel" aria-labelledby="tab-progress" class="stack"' + (seg === 'progress' ? '' : ' hidden') + '>' + progPane + '</div>' +
        '</div>'
      );
    },

    inbox() {
      return SCREENS.cases({ seg: 'todo' });
    },

    letter(p) {
      const L = A.letters.find((x) => x.id === p.id) || A.letters[0];
      if (L.unread) A.markLetterRead(L.id);
      const canSpeak = 'speechSynthesis' in window;
      const s = screen('letter',
        '<div class="pad stack">' +
          '<p class="eyebrow">' + esc(L.from) + ' · ' + T.fmt(L.got) + '</p>' +
          '<h1>' + esc(L.title) + '</h1>' +
          '<div class="seg" role="tablist" aria-label="Sposób czytania pisma">' +
            '<button type="button" role="tab" id="tab-plain" aria-controls="pane-plain" aria-selected="true" data-seg="plain">Po ludzku</button>' +
            '<button type="button" role="tab" id="tab-orig" aria-controls="pane-orig" aria-selected="false" data-seg="orig" tabindex="-1">Oryginał</button>' +
          '</div>' +
          '<div id="pane-plain" role="tabpanel" aria-labelledby="tab-plain" class="plain-card">' + A.plainLetterHtml(L) +
            (canSpeak ? '<button type="button" class="btn-text" data-act="speak">' + ic('speaker', 20) + '<span>Przeczytaj na głos</span></button>' : '') +
          '</div>' +
          '<div id="pane-orig" role="tabpanel" aria-labelledby="tab-orig" class="orig" hidden>' + L.original.map((t) => '<p>' + esc(t) + '</p>').join('') + '</div>' +
          (L.glossary.length ? '<details class="gloss"><summary>Trudne słowa z tego pisma</summary><dl>' + L.glossary.map((g) => '<div><dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd></div>').join('') + '</dl></details>' : '') +
          (L.due ? '<button type="button" class="btn primary wide" data-run="pismo" data-preset=\'{"letter":true}\'>' + ic('assistant', 20) + 'Odpowiedz z pomocą ' + esc(A.marka ? A.marka.dopelniacz : 'asystenta') + '</button>' : '') +
        '</div>'
      );
      return s;
    },

    access() {
      const act = A.consents.filter((c) => c.active);
      const old = A.consents.filter((c) => !c.active);
      const card = (c) =>
        '<li class="consent">' +
          '<div class="consent-head"><span class="row-ic tone-info">' + ic(c.icon, 24) + '</span><div><h3>' + esc(c.who) + '</h3><p class="row-meta">' + esc(c.why) + '</p></div></div>' +
          '<dl class="rows compact"><div><dt>Dane</dt><dd>' + esc(c.what.join(', ')) + '</dd></div><div><dt>Od</dt><dd>' + T.fmt(c.since) + ' (' + c.kind + ')</dd></div><div><dt>Ostatni odczyt</dt><dd>' + T.fmt(c.last) + '</dd></div></dl>' +
          (c.active ? '<button type="button" class="btn secondary wide" data-run="dane" data-preset=\'{"consent":"' + c.id + '"}\'>Cofnij dostęp…</button>' : '') +
        '</li>';
      return screen('access',
        '<div class="pad stack"><h1>Kto ma dostęp do Twoich danych</h1>' +
        '<p class="lead">Widzisz, kto pobiera Twoje dane z aplikacji, po co i kiedy zrobił to ostatnio. Dostęp możesz cofnąć. Przed cofnięciem zobaczysz, co się zmieni.</p>' +
        '<h2>Aktywne (' + act.length + ')</h2><ul class="consents">' + act.map(card).join('') + '</ul>' +
        (old.length ? '<h2>Zakończone</h2><ul class="consents">' + old.map(card).join('') + '</ul>' : '') +
        '<p class="foot-note">Instytucje i daty są przykładowe.</p></div>'
      );
    },

    more() {
      const sw = (key, title, sub, on) =>
        '<li><button type="button" class="row switch" role="switch" data-setting="' + key + '" aria-checked="' + (on ? 'true' : 'false') + '">' +
          '<span class="row-main"><span class="row-title">' + title + '</span><span class="row-meta sw-sub">' + sub + '</span></span>' +
          '<span class="sw" aria-hidden="true"><i></i></span></button></li>';
      const link = (attrs, icn, title, sub) =>
        '<li><button type="button" class="row" ' + attrs + '><span class="row-ic tone-neutral">' + ic(icn, 24) + '</span><span class="row-main"><span class="row-title">' + title + '</span>' + (sub ? '<span class="row-meta">' + sub + '</span>' : '') + '</span><span class="row-go" aria-hidden="true">' + ic('chevronRight', 20) + '</span></button></li>';
      const P = A.person;
      const adres = A.cases.find((c) => c.id === 'adres' && c.state !== 'demo');
      const ai = A.chat && A.chat.ai;
      const ctx = ai ? ai.context() : { zrodla: [] };
      const sec = (id, icn, title, desc, body) =>
        '<section class="me-sec" aria-labelledby="' + id + '">' +
          '<div class="me-sec-head"><span class="me-sec-ic" aria-hidden="true">' + ic(icn, 24) + '</span>' +
            '<span><h3 id="' + id + '">' + title + '</h3>' + (desc ? '<span class="me-sec-desc">' + desc + '</span>' : '') + '</span></div>' + body +
        '</section>';
      // Trzy części profilu jako rozdziały: duży nagłówek, jedno zdanie, treść. Spis na górze przewija do części.
      const part = (id, n, title, lead, body) =>
        '<section class="me-part" aria-labelledby="' + id + '">' +
          '<header class="me-part-head"><span class="me-part-n" aria-hidden="true">' + n + '</span><h2 id="' + id + '" tabindex="-1">' + title + '</h2></header>' +
          (lead ? '<p class="me-part-lead">' + lead + '</p>' : '') + body +
        '</section>';
      const size = settings.textSize || 0;
      const radio = (v, label) => '<button type="button" role="radio" class="size-opt" data-text-size="' + v + '" aria-checked="' + (size === v ? 'true' : 'false') + '" tabindex="' + (size === v ? '0' : '-1') + '"><span class="size-a" aria-hidden="true" style="font-size:' + [1, 1.18, 1.32][v] + 'em">A</span><span>' + label + '</span></button>';
      const li = (icn, t) => '<li>' + ic(icn, 20) + '<span>' + t + '</span></li>';
      const preview = ctx.zrodla.map((z) => '<li><span class="pv-t">' + esc(z.tytul) + '</span><span class="pv-f">' + esc(z.fakty.join(' · ')) + '</span></li>').join('');
      const aiOn = !!(ai && ai.available());
      return screen('more',
        '<div class="pad stack me-stack">' +
        '<section class="me-hero sig" aria-labelledby="me-name">' +
          '<span class="avatar me-av" aria-hidden="true">' + esc(P.initials) + '</span>' +
          '<span class="me-id"><span class="eyebrow">Profil</span><h1 id="me-name">' + esc(P.first + ' ' + P.last) + '</h1><span class="proto-pill">Osoba fikcyjna · dane fikcyjne</span></span>' +
        '</section>' +
        '<nav class="me-index" aria-label="Części profilu">' +
          '<button type="button" data-act="me-jump" data-to="me-o"><span class="me-index-n" aria-hidden="true">1</span>O prototypie</button>' +
          '<button type="button" data-act="me-jump" data-to="me-d"><span class="me-index-n" aria-hidden="true">2</span>Twoje dane</button>' +
          '<button type="button" data-act="me-jump" data-to="me-w"><span class="me-index-n" aria-hidden="true">3</span>Wygoda i dostępność</button>' +
        '</nav>' +
        part('me-o', '1', 'O prototypie', 'Spinka to asystent spraw w <b>nieoficjalnej koncepcji</b> aplikacji mObywatel, przygotowanej na konkurs mObywatel Challenge. To nie jest aplikacja ani usługa administracji publicznej.',
          '<div class="me-two">' +
            '<div class="me-can"><h3>Co robi</h3><ul class="me-list">' +
              li('check', 'Tłumaczy pisma i terminy z tej demonstracji prostym językiem.') +
              li('check', 'Przy każdej możliwości pokazuje skutek, zanim wybierzesz.') +
              li('check', 'Przed każdą zmianą pokazuje podsumowanie; decyzja należy do Ciebie.') +
            '</ul></div>' +
            '<div class="me-cannot"><h3>Czego nie robi</h3><ul class="me-list">' +
              li('x', 'Nie łączy się z urzędem, bankiem, BIK ani żadnym rejestrem.') +
              li('x', 'Niczego nie składa, nie wysyła do instytucji i nie płaci.') +
              li('x', 'Nie zna danych spoza tej aplikacji; czego w nich nie ma, tego nie wie.') +
            '</ul></div>' +
          '</div>' +
          '<ul class="group">' +
            '<li><div class="row static"><span class="row-ic tone-neutral">' + ic('calendar', 24) + '</span><span class="row-main"><span class="row-title">Data w prototypie: ' + esc(A.demo.label) + '</span><span class="row-meta">Stała na czas pokazu. Wszystkie terminy i „za … dni” liczą się od niej.</span></span></div></li>' +
            link('data-go="about"', 'info', 'Jak przeklikać ten prototyp', 'Scenariusze i zasady') +
            link('data-act="switch-profile"', 'user', 'Zmień osobę demonstracyjną', 'Ekran wyboru osoby') +
          '</ul>' +
          '<p class="me-author"><span class="me-author-bar" aria-hidden="true"></span><span>Koncepcja i projekt aplikacji: <b>Igor M.</b></span></p>') +
        part('me-d', '2', 'Twoje dane', 'Osoba, numery i sprawy w demonstracji są fikcyjne. Tu widać, co aplikacja pokazuje, gdzie to trzyma i co może trafić do asystenta AI.',
          sec('me-personal', 'user', 'Dane osobowe (fikcyjne)', 'Odsłaniaj numer tylko wtedy, gdy nikt nie patrzy na ekran.',
            '<dl class="me-fields">' +
              '<div class="me-wide"><dt>PESEL</dt><dd class="me-pesel"><span class="masked" aria-live="polite" data-mask="' + esc(P.peselMasked) + '" data-full="' + esc(P.pesel) + '">' + esc(P.peselMasked) + '</span>' +
                '<button type="button" class="btn-text sm" data-act="unmask" aria-pressed="false" data-off="Pokaż PESEL" data-on="Ukryj PESEL">' + ic('eye', 20) + '<span>Pokaż PESEL</span></button></dd></div>' +
            '</dl>') +
          sec('me-address', 'home', 'Adres i meldunek', 'Adres zameldowania i stan zgłoszonej zmiany.',
            '<p class="me-addr">' + P.address.split(', ').map((x) => '<span class="nw">' + esc(x) + '</span>').join('<br>') + '</p>' +
            (adres ? addressStatus(adres) : '')) +
          sec('me-store', 'lock', 'Gdzie są dane', '',
            '<dl class="me-rows">' +
              '<div><dt>Sprawy, pisma, dokumenty</dt><dd>Wbudowane w aplikację. Twoje zmiany, np. ustawione przypomnienia, są tylko w pamięci tej karty i znikają po jej odświeżeniu.</dd></div>' +
              '<div><dt>Rozmowa ze Spinką</dt><dd>Tylko na ekranie. Nie jest nigdzie zapisywana ani wysyłana w całości.</dd></div>' +
              '<div><dt>Wersje robocze, przypomnienia, płatności i dokumenty ze skrzynki</dt><dd>W pamięci tej przeglądarki (pamięć lokalna), do „Zacznij demonstrację od nowa”. Z dodanych plików zapisuje się tylko nazwa, typ i rozmiar, nigdy treść.</dd></div>' +
              '<div><dt>Wygoda i dostępność</dt><dd>Zapisane w tej przeglądarce (pamięć lokalna), żeby działały po powrocie.</dd></div>' +
              '<div><dt>Wybór i zgoda dla asystenta AI</dt><dd>Tylko w tej karcie (pamięć sesji), do jej zamknięcia.</dd></div>' +
            '</dl>') +
          sec('me-ai', 'assistant', 'Asystent AI', '',
            '<p class="me-ai-status" data-ai-status>' + esc(ai ? ai.statusText() : 'Niepodłączony.') + '</p>' +
            (aiOn ? '<ul class="group quiet">' + sw('aiSend', 'Wysyłaj pytania do modelu AI', 'Bez tego Spinka nie odpowiada na pytania własnymi słowami; scenariusze działają dalej.', ai.sending()) + '</ul>' +
              (ai.consented() ? '<button type="button" class="btn-text" data-act="ai-revoke">' + ic('undo', 20) + 'Cofnij zgodę na wysyłanie</button>' : '')
              : '<p class="me-ai-how">Żeby asystent odpowiadał na pytania, potrzebny jest serwer projektu z modelem językowym (np. funkcja Cloudflare z Workers AI). Dostęp do modelu jest tylko na serwerze: żaden klucz ani token nie trafia do aplikacji w przeglądarce.</p>') +
            '<details class="me-preview"><summary>Co trafiłoby do modelu: podgląd</summary>' +
              '<p class="sub">Razem z pytaniem: data w prototypie i ' + ctx.zrodla.length + ' fikcyjnych pozycji, każda z tytułem i krótkim opisem; terminy i „za … dni” liczy aplikacja, nie model. Tę listę składa serwer projektu z własnej kopii danych; przeglądarka wysyła mu tylko pytanie i stan demonstracji (co załatwiłeś, przypomnienia).</p>' +
              '<ul class="pv-list">' + preview + '</ul>' +
              '<p class="sub"><b>Nie trafiają:</b> imię, nazwisko, PESEL, adres, numery dokumentów, tablice rejestracyjne, numer polisy, pełna treść pism (oryginały) ani wcześniejsza rozmowa (poza poprzednim pytaniem, gdy asystent dopytuje). Pytanie: najwyżej 300 znaków.</p>' +
            '</details>') +
          '<ul class="group">' +
            link('data-go="access"', 'shieldCheck', 'Kto ma dostęp do moich danych', A.consents.filter((c) => c.active).length + ' aktywne dostępy (przykładowe)') +
            link('data-act="chat-clear"', 'assistant', 'Wyczyść rozmowę ze Spinką', 'Usuwa rozmowę z ekranu; sprawy zostają') +
            link('data-act="reset"', 'undo', 'Zacznij demonstrację od nowa', 'Przywraca dane przykładowe i ekran startowy') +
          '</ul>') +
        part('me-w', '3', 'Wygoda i dostępność', 'Działa od razu w całej aplikacji i zostaje w tej przeglądarce.',
          '<section class="me-sec me-size" aria-labelledby="ts-h"><h3 id="ts-h">Rozmiar tekstu</h3>' +
            '<div class="size-seg" role="radiogroup" aria-labelledby="ts-h">' + radio(0, 'Standardowy') + radio(1, 'Większy') + radio(2, 'Największy') + '</div>' +
            '<p class="text-sample"><span class="ts-k">Przykład</span>Kończy się OC: Toyota Yaris. Polisa kończy się ' + esc(T.fmtLong(A.dates.ocEnd)) + '.</p>' +
          '</section>' +
          '<ul class="group">' +
            sw('reduceMotion', 'Ogranicz animacje', 'Karty zmieniają się od razu, bez przesuwania.', A.reducedMotion()) +
            sw('contrast', 'Wyraźniejsze kontury i opisy', 'Ciemniejsze linie podziału i tekst pomocniczy.', !!settings.contrast) +
          '</ul>') +
        '</div>'
      );
    },

    // Pełny profil otwarty z podglądu na Starcie: ten sam ekran co zakładka Profil, ale jako szczegóły Startu (z „Wróć”).
    me() {
      return SCREENS.more();
    },

    about() {
      // Treść przewodnika obok telefonu, bez jego identyfikatorów (id na stronie muszą być jedyne).
      return screen('about', '<div class="pad stack">' + $('#guide-content').innerHTML.replace(/\sid="[^"]*"/g, '').replace('<h1', '<h1 id="about-h"') + '</div>');
    },

    done(p) {
      const real = (p.real || []).map((r) => '<li>' + ic('check', 20) + '<span>' + r + '</span></li>').join('');
      const todo = (p.todo || []).map((t, i) =>
        '<li><label class="todo-item"><input type="checkbox" id="todo-' + i + '"><span class="opt-box" aria-hidden="true">' + ic('check', 20) + '</span>' +
        '<span><b>' + esc(t.text) + '</b><span class="sub">' + esc(t.detail) + '</span></span></label>' +
        (t.copy ? '<button type="button" class="btn-text sm" data-copy="' + esc(t.copy) + '">' + ic('copy', 20) + 'Kopiuj numer</button>' : '') + '</li>').join('');
      const next = (p.next || []).map((n) =>
        '<button type="button" class="btn ' + (n.primary ? 'primary' : 'secondary') + ' wide"' + (n.run ? ' data-run="' + n.run + '"' : '') + (n.preset ? ' data-preset="' + esc(JSON.stringify(n.preset)) + '"' : '') + (n.toast ? ' data-toast="' + esc(n.toast) + '"' : '') + '>' + esc(n.label) + '</button>').join('');
      return screen('done',
        '<div class="pad stack">' +
          '<div class="done-hero">' +
            '<span class="demo-pill">' + ic('info', 20) + 'Demonstracja · nic nie wysłano</span>' +
            '<span class="done-ic" aria-hidden="true">' + A.znak(58, 'gotowe', false, 'check', 32) + '</span>' +
            '<h1>Gotowe (w demonstracji)</h1>' +
            '<p class="lead">' + esc(p.scenario) + '</p>' +
          '</div>' +
          '<section class="panel"><h2>Co zrobiłaby prawdziwa aplikacja</h2><ul class="ticks">' + real + '</ul></section>' +
          '<section class="panel demo-box"><h2>Co naprawdę się stało</h2><p>Nic. To prototyp: żadne dane nie zostały wysłane ani zmienione, a wszystkie osoby, numery i instytucje są fikcyjne.</p></section>' +
          (todo ? '<section class="panel"><h2>Co możesz zrobić teraz</h2><p class="sub">Tych rzeczy aplikacja nie zrobi za Ciebie. Odhaczaj je, gdy je załatwisz.</p><ul class="todo">' + todo + '</ul></section>' : '') +
          '<div class="actions">' + next +
            '<button type="button" class="btn secondary wide" data-act="cases" data-which="progress">' + ic('cases', 20) + 'Zobacz w „Sprawach”</button>' +
            '<button type="button" class="btn ghost wide" data-tab="start">Wróć na start</button>' +
          '</div>' +
        '</div>'
      );
    }
  };

  A.showDone = (payload) => A.nav('done', payload);

  // Spinka 2.0: moduły w osobnych plikach korzystają z tych samych elementów co rdzeń (ekran, podsumowanie, karty spraw).
  A.coreScreens = SCREENS;
  A.screen = screen;
  A.confirm = (o) => Confirm.ask(o);
  A.caseModel = caseModel;
  A.progressItems = progressItems;
  A.dueTone = dueTone;
  A.plural = plural;
  A.byDue = byDue;
  A.walletDocs = walletDocs;
  A.openEnvelope = (id, btn) => Env.openTodo(id, btn, false);
  A.openCaseDetail = (id, btn) => Env.openCase(id, btn);
  A.applySettings = () => { saveSettings(); applySettings(); };
  A.cur = () => cur();
  A.pushCarousel = (c) => { if (c) carousels.push(c); };
  A.askOne = askOne;
  A.caseTile = caseTile;
  A.walletHtml = walletHtml;
  A.stepRing = stepRing;
  A.revealOnScroll = revealOnScroll;

  A.plainLetterHtml = (L) => {
    const P = L.plain;
    const row = (icn, k, v, cls) => '<div class="plain-row ' + (cls || '') + '"><dt><span class="plain-ic">' + ic(icn, 20) + '</span>' + k + '</dt><dd>' + esc(v) + '</dd></div>';
    return '<dl class="plain">' +
      row('building', 'Kto pisze', P.who) +
      row('info', 'Czego chce', P.what) +
      row('calendar', 'Do kiedy', P.due, L.due ? 'warn' : '') +
      row('alert', 'Co, jeśli nic nie zrobisz', P.ifNothing) +
      row('shieldCheck', 'Spokojnie', P.notThis, 'ok') +
    '</dl>';
  };

  /* ---------- głos ---------- */

  const Voice = (() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null;
    let target = 'home';
    let opener = null;
    let heard = '';
    let sample = false;

    const sheet = () => $('#voice');
    let silence = 0;
    // Arkusz jest oknem modalnym: na czas jego otwarcia reszta strony (także okno sprawy i przewodnik obok telefonu)
    // jest wyłączona, więc Tab i czytnik zostają w arkuszu. Po zamknięciu wraca poprzedni stan.
    const LOCK = ['#topbar', '#main', '.tabbar', '.proto-bar', '.guide', '#envd'];
    let locked = [];
    const show = (part) => {
      ['listen', 'fallback', 'confirm'].forEach((p) => { $('#voice-' + p).hidden = p !== part; });
      $('#voice-examples').hidden = part === 'confirm';
    };

    function open(t, btn) {
      target = t || 'home';
      opener = btn || null;
      heard = '';
      sample = false;
      const sh = sheet();
      if (A.chat && A.chat.mood) A.chat.mood('slucha');
      if (!locked.length) { locked = LOCK.map((sel) => $(sel)).filter(Boolean).map((n) => [n, n.inert]); locked.forEach(([n]) => { n.inert = true; }); }
      sh.hidden = false;
      $('#voice-tr').textContent = '';
      document.body.classList.add('sheet-open');
      if (SR) listen();
      else fallback('Ta przeglądarka nie rozpoznaje mowy.');
      setTimeout(() => { const f = sh.querySelector('h2'); if (f) f.focus(); }, 30);
    }

    function listen() {
      show('listen');
      $('#voice-status').textContent = 'Słucham… Powiedz, co chcesz załatwić.';
      try {
        rec = new SR();
        rec.lang = 'pl-PL';
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        let finalText = '';
        clearTimeout(silence);
        // gdy przez 8 sekund nic nie dotrze, nie trzymamy człowieka w zawieszeniu
        silence = setTimeout(() => { if (rec && !$('#voice-tr').textContent.trim()) { const r = rec; rec = null; try { r.abort(); } catch (e) { /* ignore */ } fallback('Nic nie usłyszałem.'); } }, 8000);
        rec.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
          }
          $('#voice-tr').textContent = (finalText + ' ' + interim).trim();
        };
        rec.onerror = (e) => {
          rec = null;
          const why = e.error === 'not-allowed' || e.error === 'service-not-allowed'
            ? 'Nie mam dostępu do mikrofonu w tym podglądzie.'
            : e.error === 'no-speech' ? 'Nic nie usłyszałem.' : 'Rozpoznawanie mowy jest teraz niedostępne.';
          fallback(why);
        };
        rec.onend = () => {
          if (!rec) return;
          rec = null;
          const t = finalText.trim() || $('#voice-tr').textContent.trim();
          if (t) confirm(t); else fallback('Nic nie usłyszałem.');
        };
        rec.start();
      } catch (err) {
        rec = null;
        fallback('Rozpoznawanie mowy jest teraz niedostępne.');
      }
    }

    function fallback(why) {
      clearTimeout(silence);
      show('fallback');
      $('#voice-why').textContent = why;
    }

    function confirm(text, isSample) {
      heard = text;
      sample = !!isSample;
      show('confirm');
      $('#voice-heard').textContent = '„' + text + '”';
      $('#voice-sample-note').hidden = !sample;
      $('#voice-send').focus();
    }

    function stop() {
      if (rec) { const r = rec; rec = null; try { r.stop(); } catch (e) { /* ignore */ } const t = $('#voice-tr').textContent.trim(); if (t) confirm(t); else fallback('Nic nie usłyszałem.'); }
    }

    function close() {
      clearTimeout(silence);
      if (rec) { const r = rec; rec = null; try { r.abort(); } catch (e) { /* ignore */ } }
      sheet().hidden = true;
      document.body.classList.remove('sheet-open');
      locked.forEach(([n, was]) => { n.inert = was; });
      locked = [];
      if (opener && opener.isConnected) opener.focus();
    }

    function sendHeard() {
      const t = heard;
      close();
      if (t) A.chat.send(t, { voice: true });
    }

    function edit() {
      const t = heard;
      close();
      if (target === 'chat') A.chat.setInput(t);
      else { const i = $('#ask-home'); if (i) { i.value = t; i.focus(); } }
    }

    return { open, close, stop, confirm, sendHeard, edit, again: () => (SR ? listen() : fallback('Ta przeglądarka nie rozpoznaje mowy.')) };
  })();

  /* ---------- ukrywanie aplikacji pod warstwą (ekran startowy, okno koperty) ---------- */

  let gate = null; // 'splash' | 'entry' | 'login' | null
  // modal: okno nad aplikacją (okno sprawy). Wtedy wyłączony jest też przewodnik obok telefonu, żeby Tab i czytnik
  // zostały w oknie. Ekrany wejścia go nie wyłączają: przewodnik działa także przed wyborem osoby.
  function setInert(on, modal) {
    ['#topbar', '#main', '.tabbar', '.proto-bar'].concat(modal || !on ? ['.guide'] : []).forEach((sel) => {
      const n = $(sel);
      if (!n) return;
      if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert');
    });
  }

  /* ---------- koperta: otwarcie i szczegóły sprawy ---------- */

  const Env = (() => {
    let entry = null;
    let opener = null;
    let openKey = null; // karta, z której otwarto okno (po zamknięciu lista rysuje się od nowa)
    let closing = false;
    let running = [];
    let fast = false;
    let wasNew = false;

    const wrap = () => $('#envd');
    const play = (el, frames, opts) => {
      const a = el.animate(frames, Object.assign({ fill: 'both' }, opts, fast ? { duration: 1, delay: 0 } : {}));
      running.push(a);
      return a.finished.catch(() => {});
    };

    function fieldRow(icn, k, v, cls) {
      return '<div class="plain-row ' + (cls || '') + '"><dt><span class="plain-ic">' + ic(icn, 20) + '</span>' + k + '</dt><dd>' + v + '</dd></div>';
    }

    function bodyHtml(e) {
      const dueTxt = e.due
        ? '<b>' + T.fmt(e.due) + '</b> (za ' + T.dni(T.inDays(e.due)) + ').' + (e.dueNote ? ' ' + esc(e.dueNote) : '')
        : 'Bez terminu.';
      // Ustawione przypomnienie nie jest już przyciskiem: zamiast niego stan „ustawione” (bez ponownego pytania).
      const more = (e.more || []).map((m, i) => m.remind && e.reminder
        ? '<p class="envd-set">' + ic('check', 20) + '<span>Przypomnienie ustawione na ' + T.fmtOn(e.reminder).replace(/^w |^we /, '') + '</span></p>'
        : '<button type="button" class="btn secondary wide" data-act="envd-more" data-i="' + i + '">' + ic(m.remind ? 'bell' : 'letter', 20) + esc(m.label) + '</button>').join('');
      return '<p class="envd-eyebrow">' + ic(e.icon || 'info', 20) + '<span>' + esc(e.kind + ' · ' + e.from) + '</span></p>' +
        '<h2 id="envd-title" tabindex="-1">' + esc(e.title) + '</h2>' +
        (e.status ? '<div class="envd-status"><span class="pill pill-info">' + esc(e.status.text) + '</span>' + (e.status.steps ? '<span class="cc-step">etap ' + e.status.step + ' z ' + e.status.steps + '</span><span class="seg-bar" aria-hidden="true">' + Array.from({ length: e.status.steps }, (_, i) => '<i class="' + (i < e.status.step ? 'on' : '') + '"></i>').join('') + '</span>' : '') + '</div>' : '') +
        (e.reminder ? '<p class="envd-rem">' + ic('bell', 20) + 'Przypomnę ' + T.fmtOn(e.reminder) + ' (demo).</p>' : '') +
        '<dl class="plain envd-fields">' +
          fieldRow('info', 'Czego dotyczy', esc(e.what)) +
          fieldRow('calendar', 'Do kiedy', dueTxt, e.due ? 'warn' : '') +
          fieldRow('alert', 'Dlaczego to ważne', esc(e.why)) +
          fieldRow('arrowRight', 'Najprostszy następny krok', esc(e.next), 'ok') +
        '</dl>' +
        '<div class="actions">' +
          (e.action ? '<button type="button" class="btn primary wide split" data-act="envd-go"><span>' + esc(e.actionLabel) + '</span>' + ic('chevronRight', 20) + '</button>' : '') +
          more +
          '<button type="button" class="btn ghost wide" data-act="envd-close">Zamknij</button>' +
        '</div>' +
        (e.todoId ? '<p class="envd-note">Otwarta sprawa zostaje na liście „Do załatwienia”, dopóki jej nie załatwisz. Dane są fikcyjne.</p>' : '');
    }

    /*
     * Nowa koperta na Starcie: najpierw na dotkniętej karcie unosi się klapka i znika pieczęć (140 ms), potem ta sama
     * karta przechodzi w okno sprawy jak każda inna (wspólny element, od razu z treścią). Klapka i pieczęć zostają
     * otwarte do ponownego narysowania listy. Kliknięcie w trakcie przyspiesza do końca.
     */
    function flapOpen(card) {
      const flap = card.querySelector('.env-flap');
      const seal = card.querySelector('.env-seal');
      const anims = [];
      if (flap) anims.push(flap.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(-1)' }], { duration: 140, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }));
      if (seal) anims.push(seal.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px) scale(.8)' }], { duration: 140, fill: 'forwards' }));
      running = running.concat(anims);
      return Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => { running = running.filter((a) => !anims.includes(a)); });
    }

    let seq = 0;
    async function show(e, opts) {
      const my = ++seq;
      entry = e;
      opener = opts.opener || null;
      wasNew = !!opts.wasNew;
      fast = false;
      closing = false;
      running = [];
      const op = opts.opener && opts.opener.closest ? opts.opener : null;
      const card = op && op.closest('.env');
      // Skąd rośnie okno: karta, wiersz albo kafelek, którego dotknięto (jeśli jest widoczny na ekranie).
      const src = op && (op.closest(ORIGIN) || (op.closest('#main') && op));
      openKey = src && keyOf(src);
      const open = () => {
        $('#envd-body').innerHTML = bodyHtml(e);
        wrap().hidden = false;
        setInert(true, true);
      };
      const focus = () => { const h = $('#envd-title'); if (h) h.focus({ preventScroll: true }); };
      if (A.reducedMotion()) { open(); focus(); return; }
      // Nowa koperta na Starcie: najpierw klapka (sygnatura), potem wspólny element jak przy każdej karcie.
      if (opts.animate && card) {
        await flapOpen(card);
        if (my !== seq) return; // w międzyczasie otwarto coś innego
      }
      if (src && onScreen(src) && visibleRect(src).height >= 8) {
        morph(src, () => { open(); focus(); }, () => $('#envd-dialog'), 'open', (first) => { animateOpenFrom(first); }, clipped(src));
        return;
      }
      open();
      await play($('#envd-dialog'), [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 180 }).then(() => { running.forEach((a) => a.cancel()); running = []; });
      focus();
    }

    // Bez View Transition API: prawdziwe okno (z treścią) rośnie z miejsca karty, tło łagodnie się przyciemnia.
    function animateOpenFrom(from) {
      const dlg = $('#envd-dialog');
      play(wrap().querySelector('.envd-backdrop'), [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      play(dlg, [{ transformOrigin: '50% 50%', transform: A.fit(from, dlg.getBoundingClientRect()) }, { transformOrigin: '50% 50%', transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' })
        .then(() => { running.forEach((a) => a.cancel()); running = []; });
    }

    // Zamknięcie bez View Transition API: kopia okna (bez identyfikatorów, niedostępna) staje się lecącym kontenerem
    // i ląduje na swojej karcie na liście (land); tło rozjaśnia się. Prawdziwe okno jest już schowane, fokus wrócił na kartę.
    function shrinkTo(copy, fromRect, el) {
      if (!copy) return;
      const d = copy.querySelector('.envd');
      const bd = copy.querySelector('.envd-backdrop');
      if (bd) bd.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
      const gone = () => copy.remove();
      if (!d) { copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished.then(gone, gone); return; }
      Object.assign(d.style, { position: 'fixed', left: fromRect.left + 'px', top: fromRect.top + 'px', width: fromRect.width + 'px', height: fromRect.height + 'px', margin: '0', maxHeight: 'none' });
      land(d, el, gone);
    }

    // Kopia okna do ruchu zamknięcia: bez identyfikatorów, niedostępna dla czytnika ekranu i dotyku.
    function copyOf() {
      const w = wrap();
      const c = w.cloneNode(true);
      c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      c.classList.add('envd-leaving');
      c.setAttribute('aria-hidden', 'true');
      c.inert = true;
      w.after(c);
      const sc = c.querySelector('.envd-scroll');
      if (sc) sc.scrollTop = $('#envd-body').scrollTop;
      return c;
    }

    function skip() {
      if (!running.length) return;
      fast = true;
      running.forEach((a) => { try { a.finish(); } catch (err) { /* ignore */ } });
    }

    // Zamknięcie: prawdziwe okno chowa się od razu (fokus i stan jak dotąd), a jego kopia bez identyfikatorów
    // zjeżdża 16 px i gaśnie (160 ms). Kopia jest niedostępna dla czytnika ekranu i dotyku.
    function leave() {
      if (A.reducedMotion()) return;
      const w = wrap();
      const c = w.cloneNode(true);
      c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      c.classList.add('envd-leaving');
      c.setAttribute('aria-hidden', 'true');
      c.inert = true;
      w.after(c);
      const sc = c.querySelector('.envd-scroll');
      if (sc) sc.scrollTop = $('#envd-body').scrollTop;
      const d = c.querySelector('.envd');
      if (d) d.animate([{ transform: 'none' }, { transform: 'translateY(16px)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
      c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).finished.then(() => c.remove(), () => c.remove());
    }

    function close(after) {
      if (wrap().hidden || closing) return;
      running.forEach((a) => a.cancel());
      running = [];
      const was = wasNew;
      const e = entry;
      const key = openKey;
      const dlg = $('#envd-dialog');
      const dlgRect = dlg.getBoundingClientRect();
      const hide = () => { wrap().hidden = true; setInert(false); entry = null; closing = false; };
      // Przejście do innej sprawy lub rozmowy: okno tylko łagodnie znika, cel jest gdzie indziej.
      if (after) { leave(); hide(); after(); return; }
      closing = true;
      // Po zamknięciu: lista rysuje się od nowa w tym samym miejscu, fokus wraca na kartę, z której otwarto okno.
      const restore = () => {
        hide();
        render();
        if (was && e) A.announce('Sprawa „' + e.title + '” jest teraz na liście Do załatwienia jako otwarta.');
        const card = key && findKey(main(), key);
        const btn = card && (card.matches('button, a') ? card : card.querySelector('button, a, [tabindex]'));
        // Okno otwarte z panelu wiadomości: panel jest już zamknięty, więc fokus wraca na kopertę w nagłówku.
        const fromMsgs = opener && opener.closest && opener.closest('#msgs') ? document.getElementById('env-btn') : null;
        const target = btn || fromMsgs || (opener && opener.isConnected && opener) || document.getElementById('h-todo') || $('#main h1');
        if (target) { if (!target.hasAttribute('tabindex') && target.tagName === 'H2') target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
      };
      if (key && !A.reducedMotion()) {
        // Karta, do której wraca okno, leży pod nim w tym samym miejscu, w którym będzie po zamknięciu.
        const under = findKey(main(), key);
        const clip = !!under && clipped(under);
        const copy = canVT() && !clip ? null : copyOf();
        morph(dlg, restore, () => findKey(main(), key), 'close', (first, radius, el) => shrinkTo(copy, dlgRect, el), clip);
        return;
      }
      leave();
      restore();
    }

    function go() {
      const e = entry;
      if (!e || !e.action) return;
      close(() => {
        if (e.action.run) A.chat.start(e.action.run, e.action.preset || {});
        else if (e.action.go) A.nav(e.action.go, e.action.id ? { id: e.action.id } : {});
      });
    }

    function more(i) {
      const e = entry;
      const m = e && e.more && e.more[i];
      if (!m) return;
      if (m.go) { close(() => A.nav(m.go, m.id ? { id: m.id } : {})); return; }
      if (m.remind && e.todoId && !e.reminder) {
        const t = A.todo.find((x) => x.id === e.todoId);
        if (!t || !t.due) return;
        const when = T.plus(Math.max(1, T.inDays(t.due) - m.remind));
        Confirm.ask({
          title: 'Ustawić przypomnienie?',
          items: ['Przypomnę ' + T.fmtOn(when) + ', o sprawie „' + t.title + '”.', 'Termin sprawy: ' + T.fmtLong(t.due) + ' (za ' + T.dni(T.inDays(t.due)) + ').', 'Sprawa zostaje w „Do załatwienia”. Nic nie zostanie wysłane.'],
          ok: 'Ustaw przypomnienie',
          opener: document.querySelector('#envd [data-act="envd-more"][data-i="' + i + '"]')
        }).then((yes) => {
          if (!yes || entry !== e) return;
          e.reminder = A.remindTodo(e.todoId, m.remind);
          $('#envd-body').innerHTML = bodyHtml(e);
          A.toast('Przypomnę ' + T.fmtOn(e.reminder) + '. To przypomnienie w prototypie, nic nie zostało wysłane.', 'ok');
          const h = $('#envd-title');
          if (h) h.focus({ preventScroll: true });
        });
      }
    }

    // Otwiera kopertę (nowa sprawa) albo szczegóły otwartej pozycji.
    function openTodo(id, btn, animate) {
      const t = A.todo.find((x) => x.id === id);
      if (!t) return;
      const isNew = t.isNew;
      if (isNew) A.openTodo(id);
      show(Object.assign({ todoId: t.id }, t), { opener: btn, animate: animate && isNew, wasNew: isNew });
    }

    function openCase(id, btn) {
      const c = A.cases.find((x) => x.id === id);
      if (!c || !c.detail) return;
      show(Object.assign({ title: c.title, icon: 'cases', status: { text: c.statusText, step: c.step, steps: c.steps } }, c.detail), { opener: btn, animate: false });
    }

    return { openTodo, openCase, close, go, more, skip, isOpen: () => !wrap().hidden, isAnimating: () => running.length > 0 };
  })();

  /* ---------- ekran startowy mObywatela i wybór osoby demonstracyjnej ---------- */

  const SESSION = 'eob-sesja';
  const sess = () => { try { return JSON.parse(sessionStorage.getItem(SESSION) || '{}'); } catch (e) { return {}; } };
  const setSess = (o) => { try { sessionStorage.setItem(SESSION, JSON.stringify(Object.assign(sess(), o))); } catch (e) { /* bez pamięci sesji */ } };
  const clearSess = () => { try { sessionStorage.removeItem(SESSION); } catch (e) { /* ignorujemy */ } };

  // Animacja rusza dopiero, gdy ekran jest naprawdę widoczny (np. panel z aplikacją jest otwarty).
  function whenVisible(el) {
    return new Promise((resolve) => {
      let inView = !('IntersectionObserver' in window);
      let io = null;
      const ok = () => document.visibilityState !== 'hidden' && inView;
      const done = () => { document.removeEventListener('visibilitychange', check); if (io) io.disconnect(); resolve(); };
      const check = () => { if (ok()) done(); };
      document.addEventListener('visibilitychange', check);
      if (io === null && 'IntersectionObserver' in window) {
        io = new IntersectionObserver((es) => { inView = es.some((e) => e.isIntersecting && e.intersectionRatio >= 0.3); check(); }, { threshold: [0, 0.3, 0.6, 1] });
        io.observe(el);
      } else check();
    });
  }

  /*
   * Sekwencja: 1) cały ekran czerwony, 2) orzeł wznosi się z dołu, niosąc koronę wysoko nad głową, i zatrzymuje na środku,
   * 3) gdy orzeł stanie, korona spada mu na głowę i osiada, 4) czerwień kurczy się do kwadratowej ikony na białym tle,
   * 5) ikona przesuwa się w lewo, a po prawej odsłania się napis „mObywatel”, 6) gotowy znak chwilę stoi,
   * 7) znak i napis „osiadają” w nagłówku następnego ekranu, dokładnie tam, gdzie logo stoi w aplikacji, a białe tło znika.
   * Krok 7 zastępuje dawne wygaszanie (krótsza chwila w kroku 6), więc całość nie jest dłuższa.
   */
  const Splash = (() => {
    let anims = [];
    let fast = false;
    let token = 0;

    const play = (el, frames, opts) => {
      const a = el.animate(frames, Object.assign({ fill: 'both' }, opts, fast ? { duration: 1, delay: 0 } : {}));
      anims.push(a);
      return a.finished.catch(() => {});
    };
    const wait = (ms) => play(document.getElementById('sp-red'), [{ opacity: 1 }, { opacity: 1 }], { duration: ms, fill: 'none' });

    function geometry(sp, name) {
      const W = sp.clientWidth;
      const H = sp.clientHeight;
      const cx = W / 2;
      const cy = Math.round(H * 0.45);
      const E = Math.round(Math.min(W * 0.86, H * 0.5, 340)); // duży znak na środku ekranu
      const I = 88;                                             // końcowa ikona aplikacji
      const gap = 16;
      const tw = name.getBoundingClientRect().width;
      const d = (gap + tw) / 2;                                 // o ile ikona przesuwa się w lewo
      return { W, H, cx, cy, E, I, R: 22, gap, tw, d };
    }
    const inset = (g, x) => 'inset(' + (g.cy - g.I / 2) + 'px ' + (g.W - x - g.I / 2) + 'px ' + (g.H - g.cy - g.I / 2) + 'px ' + (x - g.I / 2) + 'px round ' + g.R + 'px)';

    function place(g, emblem, name) {
      emblem.style.width = g.E + 'px';
      emblem.style.height = g.E + 'px';
      emblem.style.left = (g.cx - g.E / 2) + 'px';
      emblem.style.top = (g.cy - g.E / 2) + 'px';
      name.style.left = (g.cx - g.d + g.I / 2 + g.gap) + 'px';
      name.style.top = (g.cy - name.offsetHeight / 2) + 'px';
    }

    function finalState(g, red, emblem, layers, name) {
      red.style.clipPath = inset(g, g.cx - g.d);
      emblem.style.transform = 'translateX(' + (-g.d) + 'px) scale(' + (g.I / g.E) + ')';
      layers[0].style.opacity = '0';
      layers[1].style.opacity = '0';
      layers[2].style.opacity = '1';
      name.style.clipPath = 'inset(0 0 0 0)';
      name.style.opacity = '1';
    }

    // Czerwony kwadrat jako tło samego znaku (ten sam kształt co clip-path tła), a godło przycięte do tego kwadratu.
    // Od tej chwili ramka i orzeł poruszają się jednym transformem, więc nie mogą się rozjechać.
    function asIcon(g, red, emblem) {
      emblem.style.background = getComputedStyle(red).backgroundColor;
      emblem.style.borderRadius = (100 * g.R / g.I) + '%';
      emblem.style.overflow = 'hidden';
      red.style.visibility = 'hidden';
    }

    function reset(red, emblem, layers, name) {
      anims.forEach((a) => a.cancel());
      anims = [];
      red.style.clipPath = '';
      red.style.visibility = '';
      emblem.style.transform = '';
      emblem.style.background = '';
      emblem.style.borderRadius = '';
      emblem.style.overflow = '';
      layers.forEach((l) => { l.style.opacity = ''; l.style.transform = ''; l.style.transformOrigin = ''; });
      name.style.clipPath = '';
      name.style.opacity = '';
    }

    async function fontsReady(sp) {
      if (!document.fonts || document.fonts.status === 'loaded') return;
      const load = document.getElementById('sp-load');
      const t = setTimeout(() => { load.hidden = false; }, 250); // komunikat tylko gdy naprawdę czekamy
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
      clearTimeout(t);
      load.hidden = true;
    }

    async function run(next) {
      const my = ++token;
      gate = 'splash';
      setInert(true);
      fast = false;
      const sp = document.getElementById('splash');
      const red = document.getElementById('sp-red');
      const emblem = document.getElementById('sp-emblem');
      const layers = Array.from(emblem.querySelectorAll('svg')); // [orzeł bez korony, korona, całe godło]
      const name = document.getElementById('sp-name');
      $('#login').hidden = true;
      sp.hidden = false;
      sp.style.opacity = '';
      sp.classList.add('js-run');
      reset(red, emblem, layers, name);
      A.announce('mObywatel. Prototyp demonstracyjny. Uruchamianie.');

      await whenVisible(sp);
      if (my !== token) return;
      let g = geometry(sp, name);
      place(g, emblem, name);
      const rm = A.reducedMotion();

      if (rm) {
        // Bez ruchu: od razu gotowy znak z nazwą, krótka chwila na odczyt.
        await fontsReady(sp);
        g = geometry(sp, name);
        place(g, emblem, name);
        finalState(g, red, emblem, layers, name);
        await wait(900);
      } else {
        // 2) orzeł wznosi się z dołu ekranu razem z koroną i zatrzymuje na środku. Ruch dostaje cały element znaku,
        // więc orzeł i korona mają w każdej klatce to samo przesunięcie (także przy wolnym renderowaniu).
        // Dawniej korona spadała osobno z góry ekranu (ok. 550 px lotu), co wyglądało, jakby odpadła od orła.
        const rise = g.H - (g.cy - g.E / 2);
        layers[0].style.opacity = '1';
        layers[1].style.opacity = '1';
        const p1 = play(emblem, [{ transform: 'translateY(' + rise + 'px)' }, { transform: 'translateY(0)' }], { duration: 700, delay: 120, easing: 'cubic-bezier(.16,.84,.3,1)' });
        // 3) korona spada na głowę dopiero, gdy orzeł stanie (runda 34): przez cały lot orzeł niesie ją ok. 16% wysokości
        // znaku nad głową (prawie 2 wysokości korony, przechyloną o 4°). Orzeł staje po 0,82 s; 40 ms później korona
        // zaczyna spadać z przyspieszeniem, dotyka głowy po ok. 0,3 s, odbija się o ok. 2% wysokości znaku i osiada na tym
        // samym miejscu nieruchomo (całość do ok. 1,4 s). Bez zgniatania i bez wchodzenia w głowę: tylko przesunięcie
        // i lekki obrót. Runda 32: opad zaczynał się już w czasie hamowania orła; runda 30: opad był mały (4%).
        // Ruch jest liczony względem orła (ten sam element znaku), więc korona nie odrywa się od niego w poziomie, nie
        // wychodzi poza kadr i nie znika. Punkt obrotu: środek podstawy korony.
        const crown = layers[1].querySelector('use');
        const cb = crown ? crown.getBoundingClientRect() : null;
        const lb = layers[1].getBoundingClientRect();
        if (cb && cb.width) layers[1].style.transformOrigin = (cb.left + cb.width / 2 - lb.left) + 'px ' + (cb.bottom - lb.top) + 'px';
        const hover = Math.round(g.E * 0.16);
        const hop = Math.max(2, Math.round(g.E * 0.022));
        const p2 = play(layers[1], [
          { transform: 'translateY(' + (-hover) + 'px) rotate(-4deg)', easing: 'cubic-bezier(.55,0,.85,.4)' },
          { transform: 'translateY(0) rotate(0deg)', offset: 0.55, easing: 'cubic-bezier(.2,.6,.4,1)' },
          { transform: 'translateY(' + (-hop) + 'px) rotate(-.6deg)', offset: 0.76, easing: 'cubic-bezier(.6,0,.85,.45)' },
          { transform: 'translateY(0) rotate(0deg)' }
        ], { duration: 560, delay: 860 });
        await Promise.all([p1, p2]);
        if (my !== token) return;
        // chwila na złożony znak przed zmianą w ikonę (krótsza niż dawniej, bo osiadanie korony samo daje pauzę)
        if (!fast) await wait(60);
        if (my !== token) return;
        // złożony znak: podmieniamy warstwy na całe godło (ten sam kształt, oryginalna kolejność)
        layers[2].style.opacity = '1';
        layers[0].style.opacity = '0';
        layers[1].style.opacity = '0';
        // 4) czerwony ekran kurczy się do kwadratowej ikony, tło poza nią jest białe
        await Promise.all([
          play(red, [{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: inset(g, g.cx) }], { duration: 500, delay: 40, easing: 'cubic-bezier(.65,0,.35,1)' }),
          play(emblem, [{ transform: 'scale(1)' }, { transform: 'scale(' + (g.I / g.E) + ')' }], { duration: 500, delay: 40, easing: 'cubic-bezier(.65,0,.35,1)' })
        ]);
        if (my !== token) return;
        // Napis potrzebuje czcionki; jeśli jeszcze się ładuje, mówimy o tym zamiast udawać postęp.
        if (!fast) await fontsReady(sp);
        g = geometry(sp, name);
        place(g, emblem, name);
        // 5) ikona przesuwa się w lewo, po prawej odsłania się nazwa. Czerwony kwadrat jedzie razem z godłem jako tło
        // tego samego elementu: osobne animacje (clip-path tła i transform godła) potrafiły się na chwilę rozjechać
        // i orzeł wystawał poza czerwoną ramkę.
        asIcon(g, red, emblem);
        await Promise.all([
          play(emblem, [{ transform: 'translateX(0px) scale(' + (g.I / g.E) + ')' }, { transform: 'translateX(' + (-g.d) + 'px) scale(' + (g.I / g.E) + ')' }], { duration: 440, easing: 'cubic-bezier(.65,0,.35,1)' }),
          play(name, [{ clipPath: 'inset(0 100% 0 0)', opacity: 0.4, transform: 'translateX(-10px)' }, { clipPath: 'inset(0 0% 0 0)', opacity: 1, transform: 'none' }], { duration: 380, delay: 250, easing: 'cubic-bezier(.2,.8,.2,1)' })
        ]);
        if (my !== token) return;
        finalState(g, red, emblem, layers, name);
        anims.forEach((a) => a.cancel());
        anims = [];
        // 6) gotowy znak z nazwą zostaje chwilę czytelny
        if (!fast) await wait(380);
      }
      if (my !== token) return;
      // Najpierw przygotowujemy następny ekran pod spodem, potem znak osiada w jego nagłówku (bez mignięcia innego widoku).
      gate = null;
      (next || showLogin)();
      if (!rm && !fast) await settle(sp, red, emblem, name, g);
      if (my !== token) return;
      sp.hidden = true;
      anims.forEach((a) => a.cancel());
      anims = [];
      sp.getAnimations().forEach((a) => a.cancel());
    }

    // 7) Znak leci do logo w nagłówku (wejście, wybór osoby albo Start), napis do nazwy obok; tło splasha znika w tym samym czasie.
    async function settle(sp, red, emblem, name, g) {
      const host = [document.querySelector('.gate:not([hidden]) .gate-top .brand'), document.querySelector('#topbar .brand')]
        .find((el) => el && el.querySelector('.brand-mark') && el.getBoundingClientRect().width);
      const D = 360;
      const E = 'cubic-bezier(.45,0,.2,1)';
      const chrome = Array.from(sp.querySelectorAll('.sp-proto, .sp-skip'));
      if (!host) {
        await play(sp, [{ opacity: 1 }, { opacity: 0 }], { duration: 220 });
        return;
      }
      const mark = host.querySelector('.brand-mark');
      const word = host.querySelector('.brand-name');
      const sr = sp.getBoundingClientRect();
      const m = mark.getBoundingClientRect();
      const tx = m.left - sr.left + m.width / 2;
      const ty = m.top - sr.top + m.height / 2;
      // Czerwony kwadrat leci razem z godłem jako tło tego samego elementu (sam transform), żeby warstwy się nie rozjechały.
      asIcon(g, red, emblem);
      // Treść pod spodem pojawia się dopiero za przelatującym znakiem: dolne części od połowy lotu, górna (tuż pod
      // nagłówkiem) na samym końcu. Dzięki temu napis nie przelatuje nad innym tekstem.
      const gateEl = host.closest('.gate');
      const parts = gateEl
        ? Array.from(gateEl.querySelectorAll('.login-in > *')).map((el, i) => [el, i === 0 ? 0.8 : 0.5]).concat([[gateEl.querySelector('.entry-cta'), 0.5]])
        : [[document.getElementById('main'), 0.75], [document.querySelector('.tabbar'), 0.5]];
      const content = parts.filter((p) => p[0]);
      host.classList.add('settling');
      const steps = [
        play(emblem, [{ transform: 'translateX(' + (-g.d) + 'px) scale(' + (g.I / g.E) + ')' }, { transform: 'translate(' + (tx - g.cx) + 'px,' + (ty - g.cy) + 'px) scale(' + (m.width / g.E) + ')' }], { duration: D, easing: E }),
        play(sp, [{ backgroundColor: '#FFFFFF' }, { backgroundColor: 'rgba(255,255,255,0)' }], { duration: D, easing: 'ease-out' })
      ].concat(chrome.map((el) => play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 140 })))
        .concat(content.map(([el, from]) => play(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 0, transform: 'translateY(8px)', offset: from }, { opacity: 1, transform: 'none' }], { duration: D, easing: 'ease-out' })));
      if (word) {
        const n = name.getBoundingClientRect();
        const w = word.getBoundingClientRect();
        const k = parseFloat(getComputedStyle(word).fontSize) / parseFloat(getComputedStyle(name).fontSize);
        name.style.transformOrigin = '0 50%';
        steps.push(play(name, [
          { transform: 'none', color: getComputedStyle(name).color },
          { transform: 'translate(' + (w.left - n.left) + 'px,' + ((w.top + w.height / 2) - (n.top + n.height / 2)) + 'px) scale(' + k + ')', color: getComputedStyle(word).color }
        ], { duration: D, easing: E }));
      } else steps.push(play(name, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 }));
      await Promise.all(steps);
      host.classList.remove('settling');
      name.style.transformOrigin = '';
    }

    function skip() {
      if (gate !== 'splash') return;
      fast = true;
      anims.forEach((a) => { try { a.finish(); } catch (e) { /* ignore */ } });
    }

    // Wejście do aplikacji z pominięciem reszty animacji (np. z przewodnika obok telefonu).
    function cancel() {
      token++;
      anims.forEach((a) => a.cancel());
      anims = [];
      const sp = document.getElementById('splash');
      sp.getAnimations().forEach((a) => a.cancel());
      sp.hidden = true;
    }

    return { run, skip, cancel };
  })();

  // Po animacji: ekran wejścia (potem wybór osoby) albo, gdy osoba jest już wybrana w tej karcie, od razu aplikacja.
  function afterSplash(deepRun) {
    if (deepRun) { enterApp({ instant: true, render: false }); deepRun(); return; }
    if (sess().profile) { enterApp({ instant: true }); return; }
    showEntry();
  }

  // Ekrany wejścia i wyboru osoby zaczynają się pod paskiem „Prototyp · dane fikcyjne”, żeby oznaczenie było widoczne.
  const underProtoBar = (el) => { el.style.top = $('.proto-bar').offsetHeight + 'px'; };

  // Demonstracyjne wejście: opis prawdziwego logowania i droga do demonstracji bez wpisywania danych.
  function showEntry() {
    gate = 'entry';
    setInert(true);
    const en = $('#entry');
    en.hidden = false;
    underProtoBar(en);
    en.querySelector('.login-in').scrollTop = 0;
    inviteIn(en);
    setTimeout(() => { const h = $('#entry-h'); if (h && gate === 'entry') h.focus({ preventScroll: true }); }, 30);
  }

  /*
   * Scena powitalna: dokument i termin raz wysuwają się z otwartej koperty, gdy po animacji startowej znak osiada
   * w nagłówku. Bez pętli; przy ograniczonym ruchu od razu stan końcowy. Termin to ten sam co w sprawie OC.
   */
  function inviteIn(en) {
    const oc = A.todo.find((t) => t.id === 'oc');
    const n = en.querySelector('.inv-case-n');
    if (n && oc && oc.due) n.textContent = 'za ' + T.dni(T.inDays(oc.due));
    if (A.reducedMotion()) return;
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    const rise = (sel, from, to, delay) => {
      const el = en.querySelector(sel);
      if (el) el.animate([{ transform: from }, { transform: to }], { duration: 560, delay: delay, easing: ease, fill: 'backwards' });
    };
    rise('.inv-doc', 'translateY(46%) rotate(-2deg)', 'rotate(-6deg)', 200);
    rise('.inv-case', 'translateY(58%) rotate(1deg)', 'rotate(5deg)', 290);
  }

  function showLogin() {
    gate = 'login';
    setInert(true);
    $('#entry').hidden = true;
    const l = $('#login');
    l.hidden = false;
    underProtoBar(l);
    l.querySelector('.login-in').scrollTop = 0;
    refreshBadges();
    applySettings();
    setTimeout(() => { const h = $('#login-h'); if (h && gate === 'login') h.focus({ preventScroll: true }); }, 30);
  }

  function enterApp(opts) {
    opts = opts || {};
    setSess({ splash: 1, profile: 'tomasz' });
    const fromLogin = gate === 'login';
    if (gate === 'splash') Splash.cancel();
    gate = null;
    $('#entry').hidden = true;
    const l = $('#login');
    if (!l.hidden && fromLogin && !A.reducedMotion() && !opts.instant) {
      l.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).finished.then(() => { l.hidden = true; }, () => { l.hidden = true; });
    } else l.hidden = true;
    setInert(false);
    if (opts.render !== false) A.nav('start');
  }

  /* ---------- zdarzenia ---------- */

  function parsePreset(el) {
    try { return el.dataset.preset ? JSON.parse(el.dataset.preset) : {}; } catch (e) { return {}; }
  }

  // Safari na iOS pokazuje stan :active (wciśnięcie) przy dotyku dopiero, gdy strona nasłuchuje dotknięć.
  document.addEventListener('touchstart', () => {}, { passive: true });

  document.addEventListener('click', (e) => {
    if (gate === 'splash' && e.target.closest('#splash')) { Splash.skip(); return; }
    if (Env.isOpen() && Env.isAnimating() && e.target.closest('#envd')) { Env.skip(); return; }
    // Przewodnik obok telefonu działa także przed wyborem osoby: od razu wchodzimy do aplikacji.
    if (gate && e.target.closest('.guide') && !e.target.closest('[data-act="replay-splash"]')) enterApp({ instant: true, render: false });
    const t = e.target.closest('button, a');
    if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true' && !t.dataset.q) {
      if (t && t.dataset.setting === 'reduceMotion' && mq.matches) A.toast('Ograniczenie animacji jest włączone w ustawieniach Twojego telefonu.');
      return;
    }
    if (t.closest('.car') && t.dataset.car) return; // obsługuje karuzela
    const d = t.dataset;
    if (d.say) { A.chat.send(d.say); return; }
    if (d.run) { A.chat.start(d.run, parsePreset(t)); return; }
    if (d.tab) {
      // Ponowne dotknięcie aktywnej zakładki w dolnym pasku przewija ją na początek.
      if (t.closest('.tabbar') && stack.length === 1 && cur().name === d.tab && d.tab !== 'chat') {
        const v = main().querySelector(':scope > .screen');
        if (v) v.scrollTo({ top: 0, behavior: A.reducedMotion() ? 'auto' : 'smooth' });
        return;
      }
      A.nav(d.tab);
      return;
    }
    // W portfelu na Starcie dotknięta karta wybiera dokument; z klawiatury (detail 0) przycisk otwiera dokument z wierzchu.
    const pick = e.detail && e.target.closest('[data-pick]');
    if (d.go) { A.nav(d.go, d.id ? { id: pick && t.contains(pick) ? pick.dataset.pick : d.id } : {}); return; }
    if (d.copy) { copy(d.copy, t); return; }
    if (d.toast) { A.toast(d.toast); return; }
    if (d.setting === 'aiSend') { A.chat.ai.toggle(); return; }
    if (d.textSize) { setTextSize(Number(d.textSize)); return; }
    if (d.setting) {
      settings[d.setting] = !settings[d.setting];
      saveSettings();
      applySettings();
      if (d.setting === 'reduceMotion') A.toast(settings.reduceMotion ? 'Animacje ograniczone. Karty zmieniają się od razu.' : 'Animacje włączone.');
      if (d.setting === 'contrast') A.announce(settings.contrast ? 'Wyraźniejsze kontury włączone' : 'Wyraźniejsze kontury wyłączone');
      if (d.setting === 'hc') A.toast(settings.hc ? 'Wysoki kontrast włączony.' : 'Wysoki kontrast wyłączony.');
      if (d.setting === 'simple') { A.toast(settings.simple ? 'Tryb uproszczony: na Starcie tylko to, co najważniejsze.' : 'Tryb uproszczony wyłączony.'); if (cur().name === 'start' || cur().name === 'more') render(); }
      return;
    }
    if (d.seg) { segTo(t); return; }
    if (d.act) act(d.act, t);
  });

  /*
   * Pola „Co chcesz załatwić?” i rozmowy wysyłamy z Enter i z przycisku, a submit zostaje tylko jako zapas.
   * W ramce z sandboxem bez allow-forms przeglądarka blokuje wysłanie formularza, zanim submit w ogóle zajdzie.
   */
  function sendAsk(f) {
    const i = f.querySelector('input');
    const v = i.value.trim();
    if (!v) { i.focus(); A.toast('Wpisz kilka słów, np. „zgubiłem portfel”, albo wybierz przykład.'); return; }
    i.value = '';
    A.chat.send(v);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask] .send');
    if (!b) return;
    e.preventDefault();
    sendAsk(b.closest('[data-ask]'));
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-ask]');
    if (!f) return;
    e.preventDefault();
    sendAsk(f);
  });

  document.addEventListener('keydown', (e) => {
    if (gate === 'splash' && ['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); Splash.skip(); return; }
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229 && e.target.matches && e.target.matches('[data-ask] input')) {
      e.preventDefault();
      sendAsk(e.target.closest('[data-ask]'));
      return;
    }
    if (e.key === 'Escape' && Confirm.isOpen()) { Confirm.answer(false); return; }
    if (e.key === 'Escape' && A.ui && A.ui.sheet.isOpen()) { A.ui.sheet.close(); return; }
    if (e.key === 'Escape' && Msgs.isOpen()) { Msgs.close(true); return; }
    if (e.key === 'Escape' && Peek.isOpen()) { Peek.close(true); return; }
    if (e.key === 'Escape' && Env.isOpen()) { if (Env.isAnimating()) Env.skip(); else Env.close(); return; }
    if (e.key === 'Escape' && !$('#voice').hidden) { Voice.close(); return; }
    const tab = e.target.closest && e.target.closest('[role="tab"]');
    if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const tabs = Array.from(tab.parentElement.querySelectorAll('[role="tab"]'));
      const n = tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      segTo(n);
      n.focus();
    }
  });

  // Wskaźnik przesuwa się pod wybraną zakładkę (CSS, --sel), a nowa treść wchodzi krótko, bez przesuwania ekranu.
  function segTo(btn) {
    const r = cur();
    r.params = Object.assign({}, r.params, { seg: btn.dataset.seg });
    const root = btn.closest('.screen');
    const tabs = Array.from(btn.parentElement.querySelectorAll('[role="tab"]'));
    btn.parentElement.style.setProperty('--sel', tabs.indexOf(btn));
    tabs.forEach((b) => {
      const on = b === btn;
      const pane = root.querySelector('#' + b.getAttribute('aria-controls'));
      const changed = on && pane.hidden;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      pane.hidden = !on;
      if (changed && !A.reducedMotion()) pane.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }

  function copy(text, btn) {
    const ok = () => A.toast('Skopiowano: ' + text, 'ok');
    const fail = () => A.toast('Nie udało się skopiować. Numer: ' + text);
    try {
      navigator.clipboard.writeText(text).then(ok, fail);
    } catch (e) { fail(); }
    btn.blur();
  }

  function resetDemo() {
    A.cases = A.casesSeed();
    A.todo = A.todoSeed();
    A.state.scen = {};
    A.state.docIndex = 0;
    A.letters.forEach((l) => { l.unread = !!l.due; });
    if (A.store) A.store.reset();
    A.chat.reset();
    seenEnv.clear();
    clearSess();
    A.nav('start');
    Splash.run(() => afterSplash(null));
  }

  /*
   * Podsumowanie przed zmianą poza rozmową: co się stanie, informacja, że to prototyp, i dwa przyciski.
   * Bez „Potwierdź” nic się nie zmienia. Escape, „Anuluj” i dotknięcie tła anulują.
   */
  const Confirm = (() => {
    let done = null;
    let back = null;
    let prev = [];
    const wrap = () => $('#confirm');
    const LOCK = ['#topbar', '#main', '.tabbar', '.proto-bar', '.guide', '#envd'];
    function ask(o) {
      if (done) answer(false);
      back = o.opener || document.activeElement;
      $('#confirm-h').textContent = o.title;
      $('#confirm-list').innerHTML = o.items.map((x) => '<li><span class="li-ic">' + ic('check', 20) + '</span><span>' + esc(x) + '</span></li>').join('');
      $('#confirm-yes').textContent = o.ok;
      prev = LOCK.map((sel) => $(sel)).filter(Boolean).map((n) => [n, n.inert]);
      prev.forEach(([n]) => { n.inert = true; });
      wrap().hidden = false;
      setTimeout(() => $('#confirm-h').focus(), 30);
      return new Promise((res) => { done = res; });
    }
    function answer(yes) {
      if (!done) return;
      const res = done;
      done = null;
      wrap().hidden = true;
      prev.forEach(([n, was]) => { n.inert = was; });
      prev = [];
      if (back && back.isConnected) back.focus({ preventScroll: true });
      res(yes);
    }
    return { ask, answer, isOpen: () => !!done };
  })();

  function act(a, t) {
    switch (a) {
      case 'back': A.back(); break;
      case 'me-peek': Peek.click(); break;
      case 'msgs': Msgs.click(); break;
      case 'voice': Voice.open(t.dataset.voice, t); break;
      case 'voice-close': Voice.close(); break;
      case 'voice-stop': Voice.stop(); break;
      case 'voice-again': Voice.again(); break;
      case 'voice-send': Voice.sendHeard(); break;
      case 'voice-edit': Voice.edit(); break;
      case 'voice-sample': Voice.confirm(t.dataset.text, true); break;
      case 'chat-reset': A.chat.reset(); A.toast('Zaczęliśmy nową rozmowę.'); break;
      case 'big-text':
        setTextSize(settings.textSize ? 0 : 1);
        break;
      case 'me-jump': {
        const h = document.getElementById(t.dataset.to);
        if (h) { h.scrollIntoView({ block: 'start', behavior: A.reducedMotion() ? 'auto' : 'smooth' }); h.focus({ preventScroll: true }); }
        break;
      }
      case 'ai-revoke':
        A.chat.ai.revokeConsent();
        A.toast('Zgoda cofnięta. Przed następnym pytaniem do modelu AI zapytam ponownie.');
        t.remove();
        break;
      case 'chat-clear':
        A.chat.reset();
        A.toast('Rozmowa wyczyszczona. Sprawy i ustawienia zostały bez zmian.');
        break;
      case 'due': {
        const open = t.getAttribute('aria-expanded') !== 'true';
        const box = document.getElementById(t.getAttribute('aria-controls'));
        if (!box) break;
        t.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (A.reducedMotion() || !box.animate) { box.hidden = !open; break; }
        if (open) {
          box.hidden = false;
          box.animate([{ height: '0px', opacity: 0 }, { height: box.scrollHeight + 'px', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
          const hand = t.querySelector('.due-hand');
          if (hand) hand.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)' });
        } else {
          box.animate([{ height: box.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 160, easing: 'ease-in' }).finished
            .then(() => { if (t.getAttribute('aria-expanded') === 'false') box.hidden = true; }, () => {});
        }
        break;
      }
      case 'unmask': {
        const on = t.getAttribute('aria-pressed') !== 'true';
        t.setAttribute('aria-pressed', on ? 'true' : 'false');
        t.querySelector('span').textContent = on ? (t.dataset.on || 'Ukryj pełne dane') : (t.dataset.off || 'Pokaż pełne dane');
        t.querySelector('svg').outerHTML = ic(on ? 'eyeOff' : 'eye', 20);
        document.querySelectorAll('.masked').forEach((m) => { m.textContent = on ? m.dataset.full : m.dataset.mask; });
        break;
      }
      case 'speak': {
        const L = A.letters.find((x) => x.id === (cur().params || {}).id) || A.letters[0];
        const synth = window.speechSynthesis;
        if (synth.speaking) { synth.cancel(); t.querySelector('span').textContent = 'Przeczytaj na głos'; break; }
        const P = L.plain;
        const u = new SpeechSynthesisUtterance('Kto pisze: ' + P.who + '. Czego chce: ' + P.what + ' Do kiedy: ' + P.due + ' Co, jeśli nic nie zrobisz: ' + P.ifNothing + ' ' + P.notThis);
        u.lang = 'pl-PL';
        u.onend = () => { if (t.isConnected) t.querySelector('span').textContent = 'Przeczytaj na głos'; };
        synth.speak(u);
        t.querySelector('span').textContent = 'Zatrzymaj czytanie';
        break;
      }
      case 'reset':
        Confirm.ask({
          title: 'Zacząć prototyp od nowa?',
          items: ['Sprawy, koperty i rozmowa wrócą do stanu przykładowego.', 'Zobaczysz ponownie ekran startowy i wejście do demonstracji.', 'Ustawienia (większy tekst, ograniczenie animacji) zostaną bez zmian.'],
          ok: 'Zacznij od nowa',
          opener: t
        }).then((yes) => { if (yes) resetDemo(); });
        break;
      case 'confirm-yes': Confirm.answer(true); break;
      case 'confirm-no': Confirm.answer(false); break;
      case 'replay-splash': Splash.run(() => afterSplash(null)); break;
      case 'entry-demo': showLogin(); break;
      case 'skip-splash': Splash.skip(); break;
      case 'enter': enterApp(); break;
      case 'switch-profile': showLogin(); break;
      case 'cases': A.nav('cases', { seg: t.dataset.which === 'progress' ? 'progress' : 'todo' }); break;
      case 'open-env': Env.openTodo(t.dataset.id, t, true); break;
      case 'item': Env.openTodo(t.dataset.id, t, false); break;
      case 'item-go': {
        const it = A.todo.find((x) => x.id === t.dataset.id);
        if (!it) break;
        A.openTodo(it.id);
        if (it.action.run) A.chat.start(it.action.run, it.action.preset || {});
        else if (it.action.go) A.nav(it.action.go, it.action.id ? { id: it.action.id } : {});
        break;
      }
      case 'case-detail': Env.openCase(t.dataset.id, t); break;
      case 'case-summary': {
        const c = A.cases.find((x) => x.id === t.dataset.id);
        if (c && c.summary) A.nav('done', c.summary);
        break;
      }
      case 'envd-close': Env.close(); break;
      case 'envd-go': Env.go(); break;
      case 'envd-more': Env.more(Number(t.dataset.i)); break;
      default:
        if (A.ext && A.ext.acts[a]) A.ext.acts[a](t);
        else console.warn('Nieznana akcja: ' + a);
        break;
    }
  }

  /* ---------- start ---------- */

  function boot() {
    const app = $('#app');
    const dd = document.getElementById('demo-date');
    if (dd) dd.textContent = A.demo.label;
    A.chat.build();
    app.querySelector('#voice-samples').innerHTML = A.voiceSamples.map((s) =>
      '<button type="button" class="opt opt-btn" data-act="voice-sample" data-text="' + esc(s) + '"><span class="opt-ic">' + ic('mic', 20) + '</span><span class="opt-body"><span class="opt-label">„' + esc(s) + '”</span></span></button>').join('');
    applySettings();
    if (mq.addEventListener) mq.addEventListener('change', applySettings);
    const hash = (location.hash || '').slice(1).toLowerCase();
    const deep = { portfel: 'portfel', pismo: 'pismo', oc: 'oc', dane: 'dane', dowod: 'nowyDowod' };
    render();
    A.booted = true;
    let deepRun = null;
    if (deep[hash]) deepRun = () => A.chat.start(deep[hash], hash === 'dowod' ? { resume: true } : {});
    else if (hash === 'dokumenty') deepRun = () => A.nav('docs');
    else if (A.ext && A.ext.deep[hash]) deepRun = () => A.ext.deep[hash]();
    Splash.run(() => afterSplash(deepRun));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.APP);
