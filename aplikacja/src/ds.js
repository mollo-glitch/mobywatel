/*
 * Spinka 2.0: rejestr modułów i wspólne komponenty (design system).
 * Moduły (centrum, usługi, skrzynka, kalendarz, bezpieczeństwo, rodzina, portfel EU) rejestrują tu swoje ekrany
 * (A.ext.screens), akcje przycisków data-act (A.ext.acts), powiadomienia i głębokie linki. Rdzeń (app.js) pyta
 * rejestr przy każdym renderze, więc kolejność plików nie ma znaczenia.
 * Komponenty zwracają HTML (jak reszta aplikacji); zachowanie obsługuje jeden nasłuch kliknięć w app.js.
 */
window.APP = window.APP || {};
(function (A) {
  'use strict';

  A.ext = A.ext || { screens: {}, acts: {}, deep: {}, providers: [] };
  const ic = (n, s) => A.icon(n, s);
  const esc = (s) => A.esc(s);
  const U = (A.ui = {});

  /* ---------- tokeny ruchu (te same wartości co w CSS: --t-fast, --t-panel, --ease-out) ---------- */
  U.MOTION = { fast: 180, panel: 320, ease: 'cubic-bezier(.2,.8,.2,1)', easeIn: 'cubic-bezier(.4,0,1,1)' };
  U.animate = (el, frames, ms, opts) => (el && el.animate && !A.reducedMotion()
    ? el.animate(frames, Object.assign({ duration: ms || U.MOTION.fast, easing: U.MOTION.ease }, opts || {}))
    : null);

  /* ---------- drobne elementy ---------- */

  const TONES = ['ok', 'warn', 'danger', 'info', 'neutral', 'accent'];
  U.pill = (text, tone) => '<span class="pill pill-' + (TONES.includes(tone) ? tone : 'neutral') + '">' + esc(text) + '</span>';

  // Znak symulacji: każda funkcja bez prawdziwej integracji ma go przy sobie (tekst, nie sam kolor).
  U.sim = (text) => '<span class="sim-badge">' + ic('info', 16) + '<span>' + esc(text || 'Symulacja') + '</span></span>';

  // Pasek postępu: role=progressbar z wartością i opisem; wypełnienie rośnie transformacją (bez zmiany układu).
  U.progress = (value, max, label, tone) => {
    const v = Math.max(0, Math.min(max, value));
    const pct = max ? Math.round((v / max) * 100) : 0;
    return '<div class="pbar pbar-' + (tone || 'accent') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + max + '" aria-valuenow="' + v + '"' +
      (label ? ' aria-label="' + esc(label) + '"' : '') + ' aria-valuetext="' + esc('Etap ' + v + ' z ' + max) + '">' +
      '<span class="pbar-fill" style="--p:' + (pct / 100) + '"></span></div>';
  };

  U.secHead = (id, title, action) =>
    '<div class="sec-head pad"><h2 id="' + id + '">' + esc(title) + '</h2>' + (action || '') + '</div>';

  U.empty = (icon, title, text, action) =>
    '<div class="s2-empty"><span class="s2-empty-ic" aria-hidden="true">' + ic(icon || 'info', 32) + '</span>' +
      '<p class="s2-empty-t">' + esc(title) + '</p>' + (text ? '<p class="s2-empty-d">' + esc(text) + '</p>' : '') + (action || '') + '</div>';

  // Wiersz-łącze: ikona, tytuł, opis, strzałka. attrs: data-go / data-act / data-tab itd.
  U.linkRow = (attrs, icon, title, sub, extra) =>
    '<li><button type="button" class="row" ' + attrs + '><span class="row-ic tone-neutral">' + ic(icon, 24) + '</span>' +
      '<span class="row-main"><span class="row-title">' + esc(title) + '</span>' + (sub ? '<span class="row-meta">' + esc(sub) + '</span>' : '') + '</span>' +
      (extra || '') + '<span class="row-go" aria-hidden="true">' + ic('chevronRight', 20) + '</span></button></li>';

  // Kafelek modułu (siatka „Więcej”, szybkie działania).
  U.tile = (attrs, icon, title, sub, tone) =>
    '<li><button type="button" class="s2-tile tone-' + (tone || 'neutral') + '" ' + attrs + '>' +
      '<span class="s2-tile-ic" aria-hidden="true">' + ic(icon, 24) + '</span>' +
      '<span class="s2-tile-t">' + esc(title) + '</span>' + (sub ? '<span class="s2-tile-d">' + esc(sub) + '</span>' : '') + '</button></li>';

  // Filtry jako przyciski przełączane (aria-pressed); obsługa w module przez data-act.
  U.chips = (act, list, current, label) =>
    '<div class="s2-chips" role="group" aria-label="' + esc(label || 'Filtry') + '">' +
      list.map((c) => '<button type="button" class="s2-chip" data-act="' + act + '" data-v="' + esc(c.id) + '" aria-pressed="' + (c.id === current ? 'true' : 'false') + '">' +
        (c.icon ? ic(c.icon, 16) : '') + '<span>' + esc(c.label) + '</span>' + (c.n !== undefined ? '<span class="s2-chip-n">' + c.n + '</span>' : '') + '</button>').join('') +
    '</div>';

  // Etykiety terminów: data słownie i „za N dni” z zegara pokazowego. Ton z liczby dni.
  U.dueTone = (d) => { const n = A.time.inDays(d); return n < 0 ? 'neutral' : n <= 3 ? 'danger' : n <= 14 ? 'warn' : 'neutral'; };
  U.dueText = (d) => {
    const T = A.time; const n = T.inDays(d);
    return n === 0 ? 'dziś' : n === 1 ? 'jutro' : n > 0 ? 'za ' + T.dni(n) : T.dni(-n) + ' temu';
  };
  U.money = (zl) => zl.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';

  /* ---------- pola formularzy z walidacją ---------- */

  /*
   * f: { id, label, type: text|date|select|radio|checkbox|textarea|email|tel, required, hint, value, options:[{v,l}],
   *      auto: 'źródło autouzupełnienia' (np. „z Twojego profilu”), pattern: RegExp, msg: 'komunikat błędu',
   *      min/max (dla dat: 'dzis', liczba dni) }
   * Błąd stoi pod polem (aria-describedby), pole dostaje aria-invalid. Podsumowanie błędów nad formularzem.
   */
  U.field = (f) => {
    const id = 'f-' + f.id;
    const hint = f.hint ? '<p class="s2-hint" id="' + id + '-h">' + esc(f.hint) + '</p>' : '';
    const auto = f.auto ? '<span class="s2-auto">' + ic('check', 16) + 'Uzupełnione ' + esc(f.auto) + '</span>' : '';
    const err = '<p class="s2-err" id="' + id + '-e" hidden></p>';
    const desc = [f.hint ? id + '-h' : null, id + '-e'].filter(Boolean).join(' ');
    const req = f.required ? ' required aria-required="true"' : '';
    const val = f.value !== undefined && f.value !== null ? String(f.value) : '';
    const lab = '<label class="s2-label" for="' + id + '">' + esc(f.label) + (f.required ? '' : ' <span class="s2-opt">(opcjonalnie)</span>') + '</label>';
    let control;
    if (f.type === 'select') {
      control = '<select id="' + id + '" name="' + f.id + '" class="s2-input" aria-describedby="' + desc + '"' + req + '>' +
        '<option value="">Wybierz…</option>' +
        f.options.map((o) => '<option value="' + esc(o.v) + '"' + (o.v === val ? ' selected' : '') + '>' + esc(o.l) + '</option>').join('') + '</select>';
    } else if (f.type === 'radio') {
      return '<fieldset class="s2-field s2-fieldset" id="' + id + '" data-field="' + f.id + '" aria-describedby="' + desc + '"' + (f.required ? ' data-required="1"' : '') + '>' +
        '<legend class="s2-label">' + esc(f.label) + '</legend>' + hint +
        '<div class="s2-radios">' + f.options.map((o, i) =>
          '<label class="s2-radio"><input type="radio" name="' + f.id + '" value="' + esc(o.v) + '"' + (o.v === val ? ' checked' : '') + (i === 0 && f.required ? ' required' : '') + '>' +
          '<span class="s2-radio-box" aria-hidden="true"></span><span class="s2-radio-l"><b>' + esc(o.l) + '</b>' + (o.d ? '<span>' + esc(o.d) + '</span>' : '') + '</span></label>').join('') +
        '</div>' + err + '</fieldset>';
    } else if (f.type === 'checkbox') {
      return '<div class="s2-field s2-check" data-field="' + f.id + '">' +
        '<label class="s2-checkl"><input type="checkbox" id="' + id + '" name="' + f.id + '"' + (val === 'true' || val === 'on' ? ' checked' : '') + req + ' aria-describedby="' + desc + '">' +
        '<span class="s2-checkbox" aria-hidden="true">' + ic('check', 16) + '</span><span>' + esc(f.label) + '</span></label>' + hint + err + '</div>';
    } else if (f.type === 'textarea') {
      control = '<textarea id="' + id + '" name="' + f.id + '" class="s2-input" rows="3" aria-describedby="' + desc + '"' + req + (f.max ? ' maxlength="' + f.max + '"' : '') + '>' + esc(val) + '</textarea>';
    } else {
      const type = f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text';
      control = '<input id="' + id + '" name="' + f.id + '" class="s2-input" type="' + type + '" value="' + esc(val) + '"' +
        (f.inputmode ? ' inputmode="' + f.inputmode + '"' : '') + (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : ' autocomplete="off"') +
        ' aria-describedby="' + desc + '"' + req + '>';
    }
    return '<div class="s2-field" data-field="' + f.id + '">' + lab + auto + hint + control + err + '</div>';
  };

  const isoOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  U.iso = isoOf;
  U.parseIso = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; };

  // Odczyt wartości formularza (radio: wybrana wartość; checkbox: 'true'/'').
  U.values = (form) => {
    const out = {};
    form.querySelectorAll('[name]').forEach((el) => {
      if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; else if (!(el.name in out)) out[el.name] = ''; }
      else if (el.type === 'checkbox') out[el.name] = el.checked ? 'true' : '';
      else out[el.name] = el.value.trim();
    });
    return out;
  };

  /*
   * Walidacja: pola wymagane, wzory (pattern + msg), daty (min/max względem „dziś” w prototypie).
   * Komunikat mówi, co poprawić, a nie tylko, że jest błąd. Zwraca listę błędów; pierwszy dostaje fokus
   * przez podsumowanie nad formularzem (linki do pól).
   */
  U.validate = (form, fields) => {
    const v = U.values(form);
    const errors = [];
    fields.forEach((f) => {
      const val = v[f.id];
      let msg = '';
      if (f.required && !val) msg = f.type === 'radio' || f.type === 'select' ? 'Wybierz jedną z możliwości.' : f.type === 'checkbox' ? 'Zaznacz, żeby przejść dalej.' : 'Uzupełnij to pole.';
      else if (val && f.pattern && !f.pattern.test(val)) msg = f.msg || 'Sprawdź format.';
      else if (val && f.type === 'date') {
        const d = U.parseIso(val); const n = d ? A.time.inDays(d) : null;
        if (!d) msg = 'Wpisz datę w formacie dzień, miesiąc, rok.';
        else if (f.min !== undefined && n < f.min) msg = f.minMsg || 'Ta data jest za wcześnie.';
        else if (f.max !== undefined && n > f.max) msg = f.maxMsg || 'Ta data jest za późno.';
      }
      const box = form.querySelector('[data-field="' + f.id + '"]');
      if (!box) return;
      const e = box.querySelector('.s2-err');
      const input = box.querySelector('input, select, textarea');
      box.classList.toggle('has-err', !!msg);
      if (e) { e.hidden = !msg; e.textContent = msg; }
      const target = box.tagName === 'FIELDSET' ? box : input;
      if (target) { if (msg) target.setAttribute('aria-invalid', 'true'); else target.removeAttribute('aria-invalid'); }
      if (msg) errors.push({ id: f.id, label: f.label, msg: msg });
    });
    let sum = form.querySelector('.s2-errsum');
    if (!sum) { sum = document.createElement('div'); sum.className = 's2-errsum'; sum.tabIndex = -1; sum.setAttribute('role', 'alert'); form.prepend(sum); }
    if (errors.length) {
      sum.hidden = false;
      sum.innerHTML = '<p class="s2-errsum-h">' + ic('alert', 20) + '<span>' + (errors.length === 1 ? 'Popraw jedno pole' : 'Popraw pola: ' + errors.length) + '</span></p>' +
        '<ul>' + errors.map((e) => '<li><a href="#f-' + e.id + '" data-focus="f-' + e.id + '">' + esc(e.label) + ': ' + esc(e.msg) + '</a></li>').join('') + '</ul>';
      sum.focus();
    } else { sum.hidden = true; sum.innerHTML = ''; }
    return { ok: !errors.length, errors: errors, values: v };
  };
  // Formularze modułów nie mają adresu: Enter w polu nie przeładowuje strony (działania obsługują przyciski).
  document.addEventListener('submit', (e) => { if (e.target.closest && e.target.closest('.s2-form, .s2-search')) e.preventDefault(); });
  // Link w podsumowaniu błędów przenosi fokus na pole (bez zmiany adresu strony).
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-focus]');
    if (!a) return;
    e.preventDefault();
    const el = document.getElementById(a.dataset.focus);
    const target = el && (el.matches('fieldset') ? el.querySelector('input') : el);
    if (target) { target.focus(); target.scrollIntoView({ block: 'center', behavior: A.reducedMotion() ? 'auto' : 'smooth' }); }
  });

  /* ---------- arkusz dolny (bottom sheet) ---------- */

  /*
   * Jeden arkusz na moduły: tytuł, treść, przyciski. Otwiera się od dołu (320 ms, transform), reszta aplikacji jest
   * wtedy nieaktywna (inert), fokus trafia na tytuł i wraca do przycisku, który arkusz otworzył. Escape, tło i „Zamknij”
   * zamykają. Przy ograniczonym ruchu pojawia się od razu.
   */
  U.sheet = (() => {
    let opener = null; let prev = []; let onClose = null;
    const LOCK = ['#topbar', '#main', '.tabbar', '.proto-bar', '.guide'];
    const el = () => {
      let w = document.getElementById('s2sheet');
      if (w) return w;
      w = A.node('<div class="sheet-wrap s2sheet-wrap" id="s2sheet" hidden>' +
        '<div class="sheet-backdrop" data-act="s2sheet-close"></div>' +
        '<div class="sheet s2sheet" role="dialog" aria-modal="true" aria-labelledby="s2sheet-h">' +
          '<span class="s2sheet-grip" aria-hidden="true"></span>' +
          '<h2 id="s2sheet-h" tabindex="-1"></h2><div class="s2sheet-body"></div>' +
          '<button type="button" class="sheet-close" data-act="s2sheet-close" aria-label="Zamknij">' + ic('x', 24) + '</button>' +
        '</div></div>');
      document.getElementById('app').appendChild(w);
      return w;
    };
    function open(o) {
      const w = el();
      if (!w.hidden) close(true);
      opener = o.opener || document.activeElement;
      onClose = o.onClose || null;
      w.querySelector('#s2sheet-h').textContent = o.title;
      w.querySelector('.s2sheet-body').innerHTML = o.html;
      prev = LOCK.map((s) => document.querySelector(s)).filter(Boolean).map((n) => [n, n.inert]);
      prev.forEach(([n]) => { n.inert = true; });
      w.hidden = false;
      U.animate(w.querySelector('.s2sheet'), [{ transform: 'translateY(100%)' }, { transform: 'none' }], U.MOTION.panel);
      U.animate(w.querySelector('.sheet-backdrop'), [{ opacity: 0 }, { opacity: 1 }], U.MOTION.panel);
      setTimeout(() => { const h = w.querySelector('#s2sheet-h'); if (h) h.focus(); }, 30);
      if (o.after) o.after(w.querySelector('.s2sheet-body'));
      return w.querySelector('.s2sheet-body');
    }
    function close(quiet) {
      const w = document.getElementById('s2sheet');
      if (!w || w.hidden) return;
      const finish = () => {
        w.hidden = true;
        prev.forEach(([n, was]) => { n.inert = was; });
        prev = [];
        const cb = onClose; onClose = null;
        if (cb) cb();
        if (!quiet && opener && opener.isConnected) opener.focus({ preventScroll: true });
      };
      const a = quiet ? null : U.animate(w.querySelector('.s2sheet'), [{ transform: 'none' }, { transform: 'translateY(100%)' }], 220, { easing: U.MOTION.easeIn });
      if (a) a.finished.then(finish, finish); else finish();
    }
    const isOpen = () => { const w = document.getElementById('s2sheet'); return !!w && !w.hidden; };
    const body = () => { const w = document.getElementById('s2sheet'); return w && w.querySelector('.s2sheet-body'); };
    return { open, close, isOpen, body };
  })();
  A.ext.acts['s2sheet-close'] = () => U.sheet.close();

  /* ---------- sukces (zakończenie procesu) ---------- */

  // Znacznik rysuje się linią (stroke-dashoffset) w 420 ms; przy ograniczonym ruchu stoi od razu.
  U.success = (title, lead) =>
    '<div class="s2-success"><svg class="s2-check" viewBox="0 0 52 52" aria-hidden="true" focusable="false"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>' +
      '<h1 tabindex="-1">' + esc(title) + '</h1>' + (lead ? '<p class="lead">' + esc(lead) + '</p>' : '') + '</div>';

  /* ---------- wyszukiwanie: źródła z modułów ---------- */

  // Każdy moduł dopisuje funkcję zwracającą [{ title, sub, icon, attrs, group }] (wyszukiwarka filtruje po tekście).
  A.ext.search = A.ext.search || [];
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  U.norm = norm;
  U.searchAll = (q) => {
    const t = norm(q).trim();
    if (!t) return [];
    const words = t.split(/\s+/);
    const all = [];
    A.ext.search.forEach((fn) => { try { all.push(...fn()); } catch (e) { console.error(e); } });
    return all.filter((r) => { const h = norm(r.title + ' ' + (r.sub || '') + ' ' + (r.keys || '')); return words.every((w) => h.includes(w)); });
  };
})(window.APP);
