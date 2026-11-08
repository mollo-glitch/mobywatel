/*
 * Asystent spraw: rozpoznaje sprawę z tekstu lub głosu i prowadzi przez nią krok po kroku.
 * Zasady w kodzie: asystent nie zgaduje (przy niepewności dopytuje), nie decyduje za człowieka
 * (pokazuje opcje i ich skutki), przed każdą ważną czynnością pokazuje podsumowanie,
 * a koniec sprawy zawsze jest oznaczony jako demonstracja.
 */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = A.esc;
  const T = A.time;
  // Nazwa asystenta i jej formy: tylko z src/marka.js (zapas, gdyby pliku zabrakło: neutralny „asystent”).
  const M = A.marka || { imie: 'Asystent', biernik: 'asystenta', dopelniacz: 'asystenta', zNarzednikiem: 'z asystentem', haslo: '', postac: true };
  const ABORT = { abort: true };

  let run = 0;           // numer bieżącego scenariusza; stare scenariusze same się zatrzymują
  let pending = null;    // { reject } dla pytania, na które czekamy
  let current = null;    // { id, title, step, total, label, done }
  let qid = 0;

  const sleep = (ms) => new Promise((r) => setTimeout(r, A.reducedMotion() ? 0 : ms));
  const guard = (my) => { if (my !== run) throw ABORT; };

  /* ---------- scenariusze demonstracyjne: tylko podpowiedź, nie odpowiedź ---------- */

  // Asystent nie interpretuje pytań regułami. Słowa kluczowe służą wyłącznie do podpowiedzenia, który scenariusz
  // demonstracyjny pasuje do wpisanego tekstu (przycisk „Zacznij”), gdy model AI nie jest podłączony.
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  const SCEN_P = {
    portfel: /portfel|zgubi|zgubl|ukradl|ukradzi|kradziez|skradzi|zastrz|zginal|zginel/,
    nowyDowod: /nowy dowod|wyrobi\w* (nowy |nowego )?dowod|wymien\w* dowod|wniosek o dowod|odnowi\w* dowod/,
    pismo: /pism|wezwani|skarbow|urzad\w* (przyslal|napisal)/,
    oc: /\boc\b|polis|ubezpiecz/,
    dane: /kto widzi|kto ma dostep|dostep do (moich |twoich )?danych|udostep|zgod/
  };
  function detect(text) {
    const t = norm(String(text || ''));
    return Object.keys(SCEN_P).filter((k) => SCEN_P[k].test(t));
  }

  /* ---------- widok rozmowy ---------- */

  const el = {};

  function build() {
    const s = A.node(
      '<section class="screen chat" aria-labelledby="chat-h" aria-describedby="chat-sub">' +
        '<div class="chat-head pad">' +
          // Asystent (nazwa z src/marka.js) i jego znak. Pod imieniem zawsze widać, czy model AI jest podłączony: bez serwera
          // „niepodłączony” i scenariusze demonstracyjne; z serwerem przełącznik „Model AI” i jedno zdanie stanu (AI.paint).
          // „Dane fikcyjne” mówi pasek prototypu nad ekranem i powitanie, więc tu się nie powtarza: krótkie zdanie mieści się
          // obok postaci i nie zabiera wysokości rozmowie na małym telefonie.
          '<div class="chat-who">' + A.znak(44, 'slucha', true, 'assistant', 24) +
            '<div class="chat-name"><h1 id="chat-h" tabindex="-1">Zapytaj ' + esc(M.biernik) + '</h1>' +
            '<p class="chat-sub" id="chat-sub">Model AI niepodłączony</p></div></div>' +
          '<button type="button" class="btn-text" data-act="chat-reset" aria-label="Nowa rozmowa">' + ic('plus', 20) + '<span class="narrow-hide">Nowa rozmowa</span></button>' +
        '</div>' +
        '<div class="stepper pad" id="stepper" hidden>' +
          '<p class="stepper-label" id="stepper-label"></p>' +
          '<div class="stepper-bar" id="stepper-bar" aria-hidden="true"></div>' +
        '</div>' +
        '<div class="chat-scroll" id="chat-scroll">' +
          '<div class="chat-log pad" id="chat-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Rozmowa ' + esc(M.zNarzednikiem) + '"></div>' +
        '</div>' +
        '<form class="composer pad" id="composer" data-ask autocomplete="off">' +
          '<label class="sr-only" for="chat-input">Napisz, co chcesz załatwić</label>' +
          '<div class="ask-field">' +
            '<input id="chat-input" type="text" enterkeyhint="send" placeholder="Napisz własnymi słowami…">' +
            '<button type="button" class="icon-btn" data-act="voice" data-voice="chat" aria-label="Powiedz zamiast pisać">' + ic('mic') + '</button>' +
            '<button type="submit" class="icon-btn send" aria-label="Wyślij">' + ic('send') + '</button>' +
          '</div>' +
        '</form>' +
      '</section>'
    );
    el.screen = s;
    el.log = s.querySelector('#chat-log');
    el.scroll = s.querySelector('#chat-scroll');
    el.stepper = s.querySelector('#stepper');
    el.stepLabel = s.querySelector('#stepper-label');
    el.stepBar = s.querySelector('#stepper-bar');
    el.input = s.querySelector('#chat-input');
    el.input.addEventListener('input', () => mood('slucha'));
    s.addEventListener('click', (e) => { if (e.target.closest('.ai-switch')) AI.toggle(); });
    AI.paint();
    return s;
  }

  // Nowa wiadomość wchodzi szybko (180 ms), bez animowania liter. Odpowiedź startuje od 40% krycia,
  // więc tekst jest czytelny od razu. Kilka dymków jednej odpowiedzi wchodzi co 60 ms; treść jest w drzewie
  // od początku, więc czytnik ekranu dostaje ją bez czekania.
  let burst = 0;
  let burstFrame = 0;
  // Stan znaku w nagłówku wynika z tego, co właśnie pojawiło się w rozmowie: odpowiedź (wyjaśnia), pytanie o wybór
  // w scenariuszu (następny krok), podsumowanie przed potwierdzeniem albo błąd (ostrzega), wykonane (gotowe).
  // Pisanie w polu: słucha. Wolne podpowiedzi pod odpowiedzią stanu nie zmieniają.
  function moodOf(node) {
    if (!node || !node.matches || node.matches('.msg.me')) return null;
    if (node.matches('.st-ok')) return 'gotowe';
    if (node.matches('.st-err, .st-off, .qcard.summary, .icard.consent')) return 'ostrzega';
    if (node.matches('.st-cancel')) return 'slucha';
    if (node.matches('.qcard, .quick.bound')) return 'krok'; // pytanie w karcie albo odpowiedzi do wyboru w scenariuszu
    if (node.matches('.msg.bot, .icard')) return 'wyjasnia';
    return null;
  }
  function mood(m) {
    if (!m || !el.screen) return;
    el.screen.querySelectorAll('svg.postac[data-live]').forEach((x) => x.setAttribute('data-state', m));
  }
  function append(node) {
    el.log.appendChild(node);
    mood(moodOf(node));
    if (!A.reducedMotion() && node.animate) {
      const delay = Math.min(burst, 3) * 60;
      burst++;
      cancelAnimationFrame(burstFrame);
      burstFrame = requestAnimationFrame(() => { burst = 0; });
      node.animate([{ opacity: node.classList.contains('typing') ? 0 : 0.4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 180, delay: delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    }
    reveal(node);
    return node;
  }

  let turnStart = null; // pierwsza wiadomość bieżącej tury: to, co powiedział użytkownik

  // Pokazujemy całą turę (wiadomość użytkownika i odpowiedź), a gdy się nie mieści, początek nowej karty.
  function reveal(node) {
    requestAnimationFrame(() => {
      const sc = el.scroll;
      if (!sc || !sc.isConnected || !node.isConnected) return;
      const bottom = node.offsetTop + node.offsetHeight;
      const from = turnStart && turnStart.isConnected ? turnStart.offsetTop : node.offsetTop;
      const first = turnStart && turnStart.isConnected ? turnStart.nextElementSibling : null;
      const tallCard = node.matches('.qcard, .icard') && node.offsetHeight > sc.clientHeight * 0.55;
      let top;
      if (bottom - from <= sc.clientHeight - 16) top = Math.max(bottom - sc.clientHeight + 16, from - 12);
      else if (tallCard) top = node.offsetTop - 12;
      // Długa odpowiedź: pokazujemy ją od pierwszego zdania, a nie od końca.
      else if (first && first !== node) top = Math.max(Math.min(bottom - sc.clientHeight + 16, first.offsetTop - 12), 0);
      else top = node.offsetTop - 12;
      if (top > sc.scrollTop || node === turnStart) sc.scrollTo({ top: top, behavior: A.reducedMotion() ? 'auto' : 'smooth' });
    });
  }

  function botNow(html) {
    return append(A.node('<div class="msg bot"><div class="bubble">' + html + '</div></div>'));
  }

  // „Asystent pisze…” tylko przy prawdziwym czekaniu: gdy odpowiedź nie jest gotowa po 300 ms.
  // Odpowiedzi prototypu powstają na miejscu, więc zwykle pojawiają się od razu i wskaźnika nie widać.
  // Przy ograniczonym ruchu kropki stoją, napis zostaje.
  function whileWaiting(work, label) {
    let t = null;
    const timer = setTimeout(() => {
      t = append(A.node('<div class="msg bot typing"><div class="bubble"><span class="typing-label">' + esc(label || M.imie + ' pisze…') + '</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></div></div>'));
    }, 300);
    return Promise.resolve(work).finally(() => { clearTimeout(timer); if (t) t.remove(); });
  }

  async function say(my, html) {
    guard(my);
    return botNow(html);
  }

  /*
   * Dymek stanu: ikona w kółku i krótki komunikat. ok = zrobione (znacznik, zielony), err = błąd (ostrzeżenie, czerwony),
   * cancel = anulowane (krzyżyk, szary). Oczekiwanie pokazuje whileWaiting() (kropki i opis, na co czekamy).
   * Ikona jest ozdobna; znaczenie niesie tekst („Ustawione…”, „Nie udało się…”, „Anulowane…”).
   */
  const STATE_IC = { ok: 'check', err: 'alert', cancel: 'x', off: 'info' };
  function botState(kind, html) {
    return append(A.node('<div class="msg bot st st-' + kind + '"><div class="bubble"><span class="st-ic" aria-hidden="true">' + ic(STATE_IC[kind], 20) + '</span><span>' + html + '</span></div></div>'));
  }
  const botOk = (html) => botState('ok', html);

  // Odpowiedź poza scenariuszem: nie przerywa sprawy, w której czekamy na wybór.
  async function sayFree(html) {
    return botNow(html);
  }

  function userSays(text, opts) {
    const v = opts && opts.voice;
    turnStart = append(A.node('<div class="msg me"><div class="bubble">' + (v ? '<span class="said">' + ic('mic', 20) + 'powiedziane</span>' : '') + esc(text) + '</div></div>'));
    return turnStart;
  }

  function divider(text) {
    append(A.node('<div class="chat-divider" role="separator"><span>' + esc(text) + '</span></div>'));
  }

  // Pasek kroków zmienia się tylko wtedy, gdy naprawdę zmienia się krok. Nowo zaliczony odcinek wypełnia się
  // od lewej (220 ms); przy ograniczonym ruchu od razu. Ten sam krok nie rusza paska.
  function setBar(step, total) {
    const bars = Array.from(el.stepBar.children);
    if (bars.length !== total) {
      el.stepBar.innerHTML = Array.from({ length: total }, (_, i) => '<i class="' + (i < step ? 'on' : '') + '"></i>').join('');
      return;
    }
    bars.forEach((b, i) => {
      const on = i < step;
      if (on === b.classList.contains('on')) return;
      b.classList.toggle('on', on);
      if (on && !A.reducedMotion() && b.animate) b.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }

  function progress(step, label) {
    if (!current) return;
    current.step = step;
    current.label = label;
    el.stepper.hidden = false;
    el.stepLabel.innerHTML = '<b>' + esc(current.title) + '</b><span>Krok ' + step + ' z ' + current.total + ': ' + esc(label) + '</span>';
    setBar(step, current.total);
    A.refreshBadges();
  }

  function finish() {
    if (!current) return;
    current.done = true;
    el.stepLabel.innerHTML = '<b>' + esc(current.title) + '</b><span>Zakończone w demonstracji</span>';
    setBar(current.total, current.total);
    A.refreshBadges();
  }

  function lock(card) {
    card.classList.add('answered');
    card.querySelectorAll('input, button, textarea, select').forEach((x) => { x.disabled = true; });
  }

  /* ---------- karty pytań ---------- */

  function tagHtml(t) {
    if (!t) return '';
    const i = t.tone === 'ok' ? 'undo' : t.tone === 'danger' ? 'alert' : 'info';
    return '<span class="tag tag-' + t.tone + '">' + ic(i, 20) + esc(t.text) + '</span>';
  }

  function optionHtml(op, o, name) {
    const body =
      '<span class="opt-body">' +
        '<span class="opt-label">' + esc(op.label) + '</span>' +
        (op.desc ? '<span class="opt-desc">' + op.desc + '</span>' : '') +
        tagHtml(op.tag) +
      '</span>';
    const lead = op.icon ? '<span class="opt-ic">' + ic(op.icon, 24) + '</span>' : '';
    if (o.multi) {
      const checked = o.preset && o.preset.includes(op.id) ? ' checked' : '';
      return '<label class="opt' + (o.rich ? ' rich' : '') + '"><input type="checkbox" name="' + name + '" value="' + op.id + '"' + checked + '>' +
        '<span class="opt-box" aria-hidden="true">' + ic('check', 20) + '</span>' + lead + body + '</label>';
    }
    return '<button type="button" class="opt opt-btn' + (o.rich ? ' rich' : '') + '" data-v="' + op.id + '">' + lead + body +
      '<span class="opt-go" aria-hidden="true">' + ic('chevronRight', 20) + '</span></button>';
  }

  function choice(my, o) {
    guard(my);
    const name = 'q' + (++qid);
    const card = A.node(
      '<div class="qcard" role="group" aria-labelledby="' + name + '-q">' +
        '<p class="q" id="' + name + '-q" tabindex="-1">' + o.q + '</p>' +
        (o.hint ? '<p class="q-hint">' + o.hint + '</p>' : '') +
        '<div class="opts">' + o.options.map((op) => optionHtml(op, o, name)).join('') + '</div>' +
        (o.note ? '<div class="q-note">' + ic('assistant', 20) + '<p>' + o.note + '</p></div>' : '') +
        ((o.multi || o.none) ? '<div class="q-actions">' +
          (o.multi ? '<button type="button" class="btn primary" data-q="submit">' + esc(o.submit || 'Dalej') + ic('arrowRight', 20) + '</button>' : '') +
          (o.none ? '<button type="button" class="btn ghost" data-q="none">' + esc(o.none.label) + '</button>' : '') +
        '</div>' : '') +
        (o.multi ? '<p class="q-req" hidden>Zaznacz przynajmniej jedną pozycję albo wybierz przycisk poniżej.</p>' : '') +
      '</div>'
    );
    return new Promise((resolve, reject) => {
      pending = { reject: reject };
      const done = (val, echo) => {
        lock(card);
        pending = null;
        if (echo) userSays(echo);
        resolve(val);
      };
      if (o.multi) {
        const submit = card.querySelector('[data-q="submit"]');
        const req = card.querySelector('.q-req');
        const sync = () => {
          const any = card.querySelectorAll('input:checked').length > 0;
          submit.setAttribute('aria-disabled', any ? 'false' : 'true');
          if (any) req.hidden = true;
        };
        card.addEventListener('change', sync);
        sync();
        submit.addEventListener('click', () => {
          const sel = Array.from(card.querySelectorAll('input:checked')).map((x) => x.value);
          if (!sel.length) { req.hidden = false; return; }
          const labels = o.options.filter((op) => sel.includes(op.id)).map((op) => op.label);
          done(sel, labels.join(', '));
        });
      } else {
        card.querySelectorAll('.opt-btn').forEach((b) => b.addEventListener('click', () => {
          const op = o.options.find((x) => x.id === b.dataset.v);
          b.classList.add('picked');
          done(op.id, op.echo || op.label);
        }));
      }
      if (o.none) card.querySelector('[data-q="none"]').addEventListener('click', () => done(o.multi ? [] : o.none.id || null, o.none.label));
      append(card);
      focusQuestion(card);
    });
  }

  function focusQuestion(card) {
    const q = card.querySelector('.q, .sum-title');
    if (q && A.lastInputWasKeyboard()) q.focus({ preventScroll: true });
  }

  function info(my, html, cls) {
    guard(my);
    return append(A.node('<div class="icard ' + (cls || '') + '">' + html + '</div>'));
  }

  function summary(my, o) {
    guard(my);
    const name = 's' + (++qid);
    const will = o.will.map((w) =>
      '<li class="' + (w.danger ? 'danger' : '') + '"><span class="li-ic">' + ic(w.danger ? 'alert' : 'check', 20) + '</span>' +
      '<span><b>' + w.title + '</b>' + (w.detail ? '<span class="sub">' + w.detail + '</span>' : '') + tagHtml(w.undo) + '</span></li>').join('');
    const wont = (o.wont || []).map((w) => '<li><span class="li-ic">' + ic('x', 20) + '</span><span>' + w + '</span></li>').join('');
    const card = A.node(
      '<div class="qcard summary" role="group" aria-labelledby="' + name + '-t">' +
        '<p class="sum-eyebrow">' + ic('shieldCheck', 20) + 'Podsumowanie przed potwierdzeniem</p>' +
        '<h2 class="sum-title" id="' + name + '-t" tabindex="-1">' + esc(o.title || 'Sprawdź, zanim potwierdzisz') + '</h2>' +
        (o.lead ? '<p class="sum-lead">' + o.lead + '</p>' : '') +
        '<h3>Co się stanie, gdy naciśniesz „' + esc(o.confirm || 'Potwierdź') + '”</h3>' +
        '<ul class="will">' + will + '</ul>' +
        (wont ? '<h3>Czego nie zrobię</h3><ul class="wont">' + wont + '</ul>' : '') +
        (o.extra || '') +
        (o.ack ? '<label class="ack"><input type="checkbox" id="' + name + '-ack"><span class="opt-box" aria-hidden="true">' + ic('check', 20) + '</span><span>' + o.ack + '</span></label>' : '') +
        '<p class="demo-note">' + ic('info', 20) + '<span>' + (o.note || '<b>To prototyp.</b> Po potwierdzeniu nic nie zostanie wysłane ani zmienione. Zobaczysz, jak wyglądałby koniec sprawy.') + '</span></p>' +
        '<div class="q-actions">' +
          '<button type="button" class="btn primary" data-q="confirm"' + (o.ack ? ' aria-describedby="' + name + '-why"' : '') + '>' + ic('check', 20) + esc(o.confirm || 'Potwierdź') + '</button>' +
          (o.ack ? '<p class="q-req" id="' + name + '-why" hidden>Najpierw zaznacz pole „Rozumiem” powyżej.</p>' : '') +
          '<button type="button" class="btn secondary" data-q="edit">' + ic('undo', 20) + 'Zmień wybór</button>' +
          '<button type="button" class="btn ghost" data-q="cancel">Anuluj, nic nie rób</button>' +
        '</div>' +
      '</div>'
    );
    return new Promise((resolve, reject) => {
      pending = { reject: reject };
      const ack = card.querySelector('.ack input');
      const confirm = card.querySelector('[data-q="confirm"]');
      const why = card.querySelector('.q-req');
      const sync = () => {
        const ok = !ack || ack.checked;
        confirm.setAttribute('aria-disabled', ok ? 'false' : 'true');
        if (ok && why) why.hidden = true;
      };
      if (ack) ack.addEventListener('change', sync);
      sync();
      card.querySelector('.q-actions').addEventListener('click', (e) => {
        const b = e.target.closest('[data-q]');
        if (!b) return;
        const v = b.dataset.q;
        if (v === 'confirm' && ack && !ack.checked) { why.hidden = false; ack.focus(); return; }
        lock(card);
        card.classList.add('chosen-' + v);
        if (v !== 'edit') card.insertAdjacentHTML('beforeend', '<p class="q-result r-' + v + '">' + ic(v === 'confirm' ? 'check' : 'x', 20) + '<span>' +
          (v === 'confirm' ? 'Potwierdzone. W demonstracji nic nie zostało wysłane.' : 'Anulowane. Nic nie zostało zrobione.') + '</span></p>');
        pending = null;
        userSays(v === 'confirm' ? (o.confirm || 'Potwierdź') : v === 'edit' ? 'Zmień wybór' : 'Anuluj');
        resolve(v);
      });
      append(card);
      focusQuestion(card);
    });
  }

  function textEdit(my, o) {
    guard(my);
    const name = 't' + (++qid);
    const card = A.node(
      '<div class="qcard">' +
        '<p class="q" id="' + name + '-q" tabindex="-1">' + o.q + '</p>' +
        (o.hint ? '<p class="q-hint">' + o.hint + '</p>' : '') +
        '<label class="sr-only" for="' + name + '">' + esc(o.label) + '</label>' +
        '<textarea id="' + name + '" rows="7">' + esc(o.value) + '</textarea>' +
        '<div class="q-actions"><button type="button" class="btn primary">' + esc(o.submit || 'Dalej') + ic('arrowRight', 20) + '</button></div>' +
      '</div>'
    );
    return new Promise((resolve, reject) => {
      pending = { reject: reject };
      card.querySelector('.btn').addEventListener('click', () => {
        const v = card.querySelector('textarea').value.trim();
        lock(card);
        pending = null;
        userSays(o.echo || 'Treść gotowa');
        resolve(v);
      });
      append(card);
      focusQuestion(card);
    });
  }

  // Czy plik pasuje do accept („image/*”, „application/pdf”). Gdy przeglądarka nie podaje typu (zdarza się na telefonach),
  // decyduje rozszerzenie.
  function fileOk(f, accept) {
    const want = (accept || '*/*').split(',').map((x) => x.trim().toLowerCase());
    if (want.includes('*/*')) return true;
    const type = (f.type || '').toLowerCase();
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    return want.some((w) => w === 'image/*' ? (type ? type.startsWith('image/') : /^(jpe?g|png|heic|heif|webp|gif|bmp|tiff?)$/.test(ext))
      : w === 'application/pdf' ? (type ? type === w : ext === 'pdf') : type === w);
  }

  function fileStep(my, o) {
    guard(my);
    const name = 'f' + (++qid);
    const card = A.node(
      '<div class="qcard">' +
        '<p class="q" tabindex="-1">' + o.q + '</p>' +
        (o.hint ? '<div class="q-hint">' + o.hint + '</div>' : '') +
        '<div class="opts">' +
          '<label class="opt opt-file" for="' + name + '"><span class="opt-ic">' + ic(o.icon || 'paperclip', 24) + '</span><span class="opt-body"><span class="opt-label">' + esc(o.pick) + '</span><span class="opt-desc">Plik zostaje w tej przeglądarce. Prototyp nigdzie go nie wysyła.</span></span></label>' +
          '<input class="sr-only" type="file" id="' + name + '" accept="' + (o.accept || '*/*') + '">' +
          o.alts.map((a) => '<button type="button" class="opt opt-btn" data-v="' + a.id + '"><span class="opt-ic">' + ic(a.icon, 24) + '</span><span class="opt-body"><span class="opt-label">' + esc(a.label) + '</span>' + (a.desc ? '<span class="opt-desc">' + a.desc + '</span>' : '') + '</span><span class="opt-go" aria-hidden="true">' + ic('chevronRight', 20) + '</span></button>').join('') +
        '</div>' +
        '<div class="file-preview" hidden></div>' +
      '</div>'
    );
    return new Promise((resolve, reject) => {
      pending = { reject: reject };
      const input = card.querySelector('input[type=file]');
      const prev = card.querySelector('.file-preview');
      const done = (val, echo) => { lock(card); pending = null; userSays(echo); resolve(val); };
      // Komunikat albo podgląd pliku pojawia się na dole karty: rozmowa przewija się tak, żeby było go widać.
      // Ostatni element (przycisk „Użyj tego pliku” albo komunikat), bo przycisk wystaje poza ramkę podglądu.
      const showPrev = () => requestAnimationFrame(() => (prev.lastElementChild || prev).scrollIntoView({ block: 'nearest', behavior: A.reducedMotion() ? 'auto' : 'smooth' }));
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        if (!f) return;
        // Typ pliku sprawdzamy sami: atrybut accept tylko podpowiada wybór (na komputerze da się wybrać „Wszystkie pliki”).
        if (!fileOk(f, o.accept)) {
          input.value = '';
          prev.hidden = false;
          prev.innerHTML = '<p class="file-err" role="alert">' + ic('alert', 20) + '<span>„' + esc(f.name) + '” to nie jest ' + (/pdf/.test(o.accept || '') ? 'zdjęcie ani plik PDF. Wybierz zdjęcie (JPG, PNG, HEIC) albo PDF.' : 'zdjęcie. Wybierz plik JPG, PNG albo HEIC.') + '</span></p>';
          showPrev();
          return;
        }
        const isImg = /^image\//.test(f.type);
        prev.hidden = false;
        prev.innerHTML = (isImg ? '<img alt="Podgląd wybranego zdjęcia" src="' + URL.createObjectURL(f) + '">' : '<span class="file-chip">' + ic('paperclip', 20) + esc(f.name) + '</span>') +
          '<div class="q-actions"><button type="button" class="btn primary" data-ok>Użyj tego pliku' + ic('arrowRight', 20) + '</button></div>';
        prev.querySelector('[data-ok]').addEventListener('click', () => done({ kind: 'file', name: f.name }, 'Dodałem plik: ' + f.name));
        showPrev();
      });
      card.querySelectorAll('.opt-btn').forEach((b) => b.addEventListener('click', () => {
        const a = o.alts.find((x) => x.id === b.dataset.v);
        done({ kind: a.id, name: a.file || a.label }, a.label);
      }));
      append(card);
      focusQuestion(card);
    });
  }

  function chips(my, list) {
    guard(my);
    const wrap = A.node('<div class="quick bound" role="group" aria-label="Szybkie odpowiedzi">' +
      list.map((c) => '<button type="button" class="chip" data-v="' + c.id + '">' + esc(c.label) + '</button>').join('') + '</div>');
    return new Promise((resolve, reject) => {
      pending = { reject: reject };
      wrap.addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        const c = list.find((x) => x.id === b.dataset.v);
        wrap.remove();
        pending = null;
        userSays(c.label);
        resolve(c.id);
      });
      append(wrap);
    });
  }

  function actionChips(list) {
    const wrap = A.node('<div class="quick" role="group" aria-label="Możliwe odpowiedzi">' +
      list.map((c, i) => '<button type="button" class="chip" data-i="' + i + '">' + esc(c.label) + '</button>').join('') + '</div>');
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      const c = list[Number(b.dataset.i)];
      wrap.remove();
      userSays(c.label);
      Promise.resolve().then(c.go).catch(failed);
    });
    append(wrap);
  }

  // Przykładowe sprawy pod powitaniem: każdy przycisk uruchamia scenariusz demonstracyjny.
  function freeChips(list) {
    const wrap = A.node('<div class="quick" role="group" aria-label="Scenariusze demonstracyjne">' +
      list.map((c) => '<button type="button" class="chip">' + esc(c) + '</button>').join('') + '</div>');
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      wrap.remove();
      const id = detect(b.textContent)[0];
      if (id) start(id, {}); else send(b.textContent);
    });
    append(wrap);
  }

  function done(payload) {
    finish();
    if (payload.caseRec) A.upsertCase(Object.assign({ run: null, preset: null, verb: 'Zobacz podsumowanie', summary: payload }, payload.caseRec, { cta: null }));
    botOk('Sprawę zapisałem w zakładce <b>Sprawy → W toku</b>, w części „Zakończone w demonstracji”, razem z listą rzeczy do zrobienia.');
    A.showDone(payload);
  }

  function cancelled(my, what) {
    botState('cancel', 'Anulowane. Niczego nie zrobiłem. ' + (what || '') + ' Możesz wrócić do tej sprawy w każdej chwili.');
    if (current) A.scenarioLeft(current, true);
    finish();
  }

  /* ---------- scenariusz: zgubiony portfel ---------- */

  async function portfel(my, preset) {
    const S = ctx(my);
    S.progress(1, 'Co zginęło');
    await S.say('Przykro mi, to stresująca sytuacja. Pomogę Ci zabezpieczyć dokumenty i podpowiem, co zrobić z resztą. Zajmie to około 2 minut.');
    const items = await S.choice({
      q: 'Co było w portfelu? Zaznacz wszystko, co pamiętasz.',
      multi: true, preset: preset.items,
      options: [
        { id: 'dowod', label: 'Dowód osobisty', icon: 'id' },
        { id: 'prawko', label: 'Prawo jazdy', icon: 'steering' },
        { id: 'karty', label: 'Karty płatnicze', icon: 'card' },
        { id: 'kdr', label: 'Karta Dużej Rodziny', icon: 'family' },
        { id: 'inne', label: 'Gotówka lub inne rzeczy', icon: 'wallet' }
      ]
    });
    const theft = await S.choice({
      q: 'Czy portfel mógł zostać skradziony?',
      hint: 'Pytam, bo od tego zależy moja podpowiedź. Nie musisz być pewny.',
      options: [
        { id: 'zgubiony', label: 'Raczej go zgubiłem' },
        { id: 'kradziez', label: 'Mógł zostać skradziony' },
        { id: 'niewiem', label: 'Nie wiem' }
      ]
    });

    const later = [];
    if (items.includes('karty')) later.push({ id: 'karty', text: 'Zastrzeż karty płatnicze w banku', detail: 'W aplikacji banku albo pod numerem +48 828 828 828. To wspólny numer do zastrzegania kart wielu banków.', copy: '+48 828 828 828' });
    if (items.includes('dowod')) later.push({ id: 'dz', text: 'Zastrzeż dowód w banku', detail: 'W dowolnym oddziale banku dowód trafi do bazy Dokumenty Zastrzeżone. Dzięki temu nikt nie otworzy na niego konta. Tego aplikacja nie zrobi za Ciebie.' });
    if (theft === 'kradziez') later.push({ id: 'policja', text: 'Zgłoś kradzież na policji', detail: 'Na dowolnym komisariacie. Potwierdzenie zgłoszenia przyda się w banku i przy ubezpieczeniu.' });
    if (items.includes('prawko')) later.push({ id: 'prawko', text: 'Prawo jazdy: bez pośpiechu', detail: 'Nie musisz go wozić przy sobie, policja sprawdza uprawnienia w systemie. Nowy dokument zamówisz w wydziale komunikacji.' });
    if (items.includes('kdr')) later.push({ id: 'kdr', text: 'Karta Dużej Rodziny działa w telefonie', detail: 'Plastikowy duplikat zamówisz w urzędzie gminy.' });

    let actions = [];
    let laterShown = false;
    for (;;) {
      if (items.includes('dowod')) {
        S.progress(2, 'Wybierz, co zrobić');
        await S.say('Najważniejszy jest dowód osobisty, bo ktoś mógłby się nim posłużyć, np. przy pożyczce. Masz dwie możliwości. Różnią się tym, czy da się je cofnąć.');
        const rec = theft === 'kradziez'
          ? 'Przy kradzieży zwykle wybiera się obie, bo dowodu raczej nie odzyskasz.'
          : theft === 'zgubiony'
            ? 'Jeśli liczysz, że portfel się znajdzie, możesz zacząć od zastrzeżenia PESEL. Da się je cofnąć, a utratę dowodu zgłosisz później.'
            : 'Jeśli nie wiesz, zacznij od zastrzeżenia PESEL. Da się je cofnąć, a utratę dowodu zgłosisz później.';
        actions = await S.choice({
          q: 'Co chcesz zrobić z dowodem?',
          multi: true, rich: true,
          options: [
            { id: 'pesel', label: 'Zastrzeż numer PESEL', desc: 'Nikt nie weźmie kredytu ani pożyczki na Twoje dane. Działa od razu, a dowód zostaje ważny.', tag: { tone: 'ok', text: 'Możesz cofnąć w każdej chwili' } },
            { id: 'utrata', label: 'Zgłoś utratę dowodu', desc: 'Dowód zostanie unieważniony na stałe. Nikt go nie użyje, ale Ty też nie. Potrzebny będzie nowy dowód: bezpłatny, z wizytą w urzędzie.', tag: { tone: 'danger', text: 'Nie da się cofnąć' } }
          ],
          note: '<b>Podpowiedź:</b> ' + rec + ' Decyzja należy do Ciebie.',
          submit: 'Dalej',
          none: { label: 'Na razie nic, jeszcze poszukam' }
        });
      }

      if (later.length && !laterShown) {
        laterShown = true;
        S.progress(items.includes('dowod') ? 2 : 1, 'Reszta rzeczy z portfela');
        await S.say('Tych rzeczy nie załatwię za Ciebie w aplikacji. Dodam je do listy na koniec:');
        await S.info('<ul class="later">' + later.map((l) => '<li>' + ic(l.id === 'karty' ? 'card' : l.id === 'policja' ? 'shield' : l.id === 'prawko' ? 'steering' : l.id === 'kdr' ? 'family' : 'building', 20) + '<span><b>' + esc(l.text) + '</b><span class="sub">' + esc(l.detail) + '</span></span></li>').join('') + '</ul>');
      }

      if (!actions.length) {
        S.progress(3, 'Przypomnienie');
        await S.say(items.includes('dowod')
          ? 'Dobrze. Dowód zostaje bez zmian. Mogę przypomnieć Ci jutro rano, żebyś wrócił do tej sprawy, jeśli portfel się nie znajdzie.'
          : 'Dokumentów w telefonie nie trzeba zastrzegać. Mogę przypomnieć Ci jutro o rzeczach z listy.');
        const r = await S.chips([{ id: 'yes', label: 'Przypomnij mi jutro o 9:00' }, { id: 'no', label: 'Nie, dziękuję' }]);
        if (r === 'yes') {
          A.upsertCase({ id: 'portfel', title: 'Zgubiony portfel', state: 'todo', statusText: 'Przypomnę jutro', note: 'Przypomnienie: ' + T.fmtLong(T.plus(1)) + ', 9:00 (demo). Dowód i PESEL bez zmian.', run: 'portfel', verb: 'Wróć do sprawy' });
          await S.ok('Ustawione. Jutro o 9:00 dostaniesz powiadomienie. Sprawa czeka w zakładce <b>Sprawy → W toku</b>. Nic nie zostało wysłane.');
        } else {
          await S.say('W porządku. Gdyby portfel się nie znalazł, napisz „zgubiłem portfel”, a zaczniemy od tego miejsca.');
        }
        finish();
        return;
      }

      S.progress(3, 'Sprawdź i potwierdź');
      const will = [];
      if (actions.includes('pesel')) will.push({ title: 'Zastrzegę Twój numer PESEL', detail: 'Od teraz do czasu, aż sam cofniesz zastrzeżenie. Bank i firma pożyczkowa muszą to sprawdzić przed udzieleniem kredytu. Do lekarza czy urzędu pójdziesz jak dotąd.', undo: { tone: 'ok', text: 'Cofniesz w aplikacji w kilka sekund' } });
      if (actions.includes('utrata')) will.push({ title: 'Zgłoszę utratę dowodu ABC 123456', detail: 'Dowód zostanie unieważniony. Zaświadczenie o utracie dowodu trafi do Twojej skrzynki.', undo: { tone: 'danger', text: 'Nie da się cofnąć, nawet gdy dowód się znajdzie' }, danger: true });
      const wont = [];
      if (items.includes('karty')) wont.push('Nie zastrzegę kart płatniczych. Zrobisz to w banku.');
      wont.push('Nie zastrzegę dowodu w bankach (Dokumenty Zastrzeżone). To też robi bank.');
      wont.push('Nie przekażę nikomu Twoich danych poza tymi zgłoszeniami.');
      const res = await S.summary({
        title: 'Sprawdź, zanim potwierdzisz',
        will: will, wont: wont,
        ack: actions.includes('utrata') ? 'Rozumiem, że unieważnionego dowodu nie da się przywrócić, nawet jeśli się znajdzie.' : null,
        confirm: 'Potwierdź'
      });
      if (res === 'edit') { await S.say('Jasne, wybierz jeszcze raz.'); continue; }
      if (res === 'cancel') { cancelled(my, 'Dowód i PESEL są bez zmian.'); return; }

      S.progress(4, 'Gotowe');
      const real = [];
      if (actions.includes('pesel')) real.push('Twój PESEL zostałby zastrzeżony od razu. Bank czy firma pożyczkowa zobaczyliby to przy próbie udzielenia kredytu na Twoje dane.');
      if (actions.includes('utrata')) real.push('Dowód ABC 123456 zostałby unieważniony w Rejestrze Dowodów Osobistych, a zaświadczenie o utracie trafiłoby do Twojej skrzynki.');
      const next = [];
      if (actions.includes('utrata')) next.push({ label: 'Przygotuj wizytę po nowy dowód', run: 'nowyDowod', preset: { reason: 'utrata' }, primary: true });
      if (actions.includes('pesel') && !actions.includes('utrata')) next.push({ label: 'Portfel się znalazł? Cofnij zastrzeżenie', toast: 'W prawdziwej aplikacji tutaj cofniesz zastrzeżenie PESEL. Tu nic nie trzeba cofać, bo nic nie zostało zastrzeżone.' });
      done({
        scenario: 'Zgubiony portfel',
        real: real,
        todo: later.filter((l) => l.id !== 'prawko' && l.id !== 'kdr'),
        next: next,
        caseRec: {
          id: 'portfel', title: 'Zgubiony portfel', state: 'demo', statusText: 'Zakończona w demonstracji',
          note: (actions.includes('pesel') ? 'PESEL: zastrzeżony (demo). ' : '') + (actions.includes('utrata') ? 'Dowód: zgłoszona utrata (demo). ' : '') + (later.length ? 'Do zrobienia poza aplikacją: ' + later.length + '.' : ''),
          cta: null
        }
      });
      return;
    }
  }

  /* ---------- scenariusz: pismo z urzędu ---------- */

  async function pismo(my, preset) {
    const S = ctx(my);
    const L = A.letters[0];
    S.progress(1, 'Które pismo');
    const inTodo = A.todo.some((t) => t.id === 'pismo-us');
    A.openTodo('pismo-us');
    if (!preset.letter) {
      let which = 'paper';
      if (inTodo) {
        await S.say('W „Do załatwienia” czeka pismo: <b>' + esc(L.title) + '</b> od: ' + esc(L.from) + ', z ' + T.fmt(L.got) + '. Chodzi o nie?');
        which = await S.chips([{ id: 'this', label: 'Tak, to pismo' }, { id: 'paper', label: 'Nie, dostałem pismo papierowe' }]);
      }
      if (which === 'paper') {
        await S.fileStep({
          q: 'Zrób zdjęcie pisma albo wybierz plik. Wyjaśnię je prostymi słowami.',
          pick: 'Zrób zdjęcie lub wybierz plik', icon: 'photo', accept: 'image/*,application/pdf',
          alts: [{ id: 'sample', label: 'Użyj przykładowego pisma', icon: 'letter', desc: 'Prototyp nie odczytuje prawdziwych pism. Pokażę działanie na przykładzie.' }]
        });
        await S.say('W prototypie nie odczytuję prawdziwych zdjęć, więc pokażę, jak to działa, na przykładowym piśmie z urzędu skarbowego.');
      }
    }

    S.progress(2, 'Co to za pismo');
    await S.say('Oto to pismo w prostych słowach:');
    await S.info(A.plainLetterHtml(L) + '<button type="button" class="btn-text" data-go="letter" data-id="' + L.id + '">' + ic('letter', 20) + 'Pokaż oryginał pisma</button>', 'plain-card');
    await S.chips([{ id: 'go', label: 'Co mogę z tym zrobić?' }]);

    for (;;) {
      S.progress(3, 'Wybierz, co zrobić');
      const how = await S.choice({
        q: 'Co chcesz zrobić?',
        rich: true,
        options: [
          { id: 'reply', label: 'Odpowiem i dołączę fakturę', desc: 'Najczęstsza odpowiedź. Przygotuję krótkie pismo, Ty je sprawdzisz.', tag: { tone: 'info', text: 'Przed wysłaniem zobaczysz podsumowanie' } },
          { id: 'fix', label: 'Ulga mi się nie należała', desc: 'Wtedy trzeba poprawić PIT (złożyć korektę) i dopłacić podatek.' },
          { id: 'call', label: 'Wolę zadzwonić do urzędu', desc: 'Pokażę numer z pisma.' },
          { id: 'later', label: 'Przypomnij mi później', desc: 'Przypomnę 3 dni przed terminem.' }
        ]
      });
      if (how === 'call') {
        await S.info('<p class="big-num"><span class="mono">' + L.phone + '</span><button type="button" class="btn-text" data-copy="' + L.phone + '">' + ic('copy', 20) + 'Kopiuj numer</button></p><p class="sub">Numer przykładowy z pisma. Urząd odbiera w dni robocze, zwykle od 8:00 do 15:00. Przygotuj pismo, bo urzędnik zapyta o jego numer.</p>');
        await S.say('Po rozmowie możesz wrócić tutaj i odpowiedzieć na pismo.');
        const r = await S.chips([{ id: 'reply', label: 'Jednak odpowiem tutaj' }, { id: 'end', label: 'Na razie wystarczy' }]);
        if (r === 'end') { finish(); return; }
      } else if (how === 'later') {
        // Przypomnienie to zmiana w aplikacji, więc najpierw podsumowanie, jak przy przypomnieniu z koperty.
        const t = (A.todo || []).find((x) => x.id === 'pismo-us');
        if (!t || !t.due) { await S.say('Tego pisma nie ma już w „Do załatwienia”, więc nie ma o czym przypominać.'); finish(); return; }
        const at = T.plus(Math.max(1, T.inDays(t.due) - 3));
        const res = await S.summary({
          title: 'Ustawić przypomnienie?',
          will: [{ title: 'Przypomnę Ci ' + esc(T.fmtOn(at)) + ', o tym piśmie', detail: 'Termin odpowiedzi mija ' + esc(T.fmtOn(t.due)) + ' (za ' + T.dni(T.inDays(t.due)) + '). Pismo zostaje w „Do załatwienia”.' }],
          wont: ['Nie odpowiem urzędowi i niczego nie wyślę.'],
          note: '<b>To prototyp.</b> Dane są fikcyjne i nic nie jest wysyłane. Przypomnienie działa tylko w tym prototypie.',
          confirm: 'Ustaw przypomnienie'
        });
        if (res === 'edit') continue;
        if (res === 'cancel') { cancelled(my, 'Przypomnienie nie zostało ustawione.'); return; }
        const when = A.remindTodo('pismo-us', 3);
        await S.ok('Ustawione. Przypomnę Ci ' + T.fmtOn(when) + '. Pismo zostaje w „Do załatwienia”. Nic nie zostało wysłane.');
        finish();
        return;
      } else if (how === 'fix') {
        await S.say('Korektę PIT-37 składa się w e-Urzędzie Skarbowym. W prawdziwej aplikacji przygotowałbym ją za Ciebie z danymi z zeznania. W tym prototypie ta ścieżka kończy się tutaj.');
        const r = await S.chips([{ id: 'reply', label: 'Wróć do wyboru' }, { id: 'end', label: 'Zakończ' }]);
        if (r === 'end') { finish(); return; }
        continue;
      }
      break;
    }

    S.progress(3, 'Przygotuj odpowiedź');
    const att = await S.fileStep({
      q: 'Dołącz fakturę albo potwierdzenie przelewu za internet z ' + A.demo.taxYear + ' roku.',
      pick: 'Wybierz plik z telefonu', icon: 'paperclip', accept: 'image/*,application/pdf',
      alts: [{ id: 'sample', label: 'Użyj przykładowej faktury', icon: 'letter', file: 'Faktura_internet_' + A.demo.taxYear + '.pdf', desc: 'Faktura_internet_' + A.demo.taxYear + '.pdf, plik pokazowy' }]
    });
    const P = A.person;
    const text = await S.textEdit({
      q: 'Napisałem krótką odpowiedź. Przeczytaj ją i zmień, jeśli chcesz.',
      label: 'Treść odpowiedzi do urzędu',
      value: 'Dzień dobry,\nw odpowiedzi na wezwanie z dnia ' + T.fmt(L.got) + ' przesyłam fakturę za dostęp do internetu za ' + A.demo.taxYear + ' rok. Na jej podstawie odliczyłem ulgę w wysokości ' + A.demo.relief + ' zł.\n\nZ poważaniem\n' + P.first + ' ' + P.last,
      echo: 'Treść odpowiedzi jest gotowa'
    });

    for (;;) {
      S.progress(4, 'Sprawdź i potwierdź');
      const res = await S.summary({
        title: 'Sprawdź, zanim wyślesz',
        will: [
          { title: 'Wyślę Twoją odpowiedź do: ' + esc(L.from), detail: 'Treść: „' + esc(text.slice(0, 120)) + (text.length > 120 ? '…' : '') + '”. Załącznik: ' + esc(att.name) + '. Pismo podpiszę Twoim podpisem zaufanym.', undo: { tone: 'info', text: 'Wysłanego pisma nie cofniesz, ale możesz wysłać uzupełnienie' } },
          { title: 'Zapiszę potwierdzenie wysłania w tej sprawie', detail: 'Będziesz mieć dowód, że odpowiedziałeś w terminie.' }
        ],
        wont: ['Nie zmienię Twojego zeznania PIT.', 'Nie wyślę nic poza tym, co widzisz powyżej.'],
        confirm: 'Potwierdź'
      });
      if (res === 'edit') {
        await S.say('Możesz zmienić treść albo załącznik. Zacznijmy od treści.');
        return pismoRestartEdit(my, L, att);
      }
      if (res === 'cancel') { cancelled(my, 'Odpowiedź nie została wysłana.'); return; }
      break;
    }
    S.progress(4, 'Gotowe');
    done({
      scenario: 'Odpowiedź na pismo z urzędu skarbowego',
      real: [
        'Urząd dostałby Twoją odpowiedź z fakturą od razu, a Ty potwierdzenie, że pismo dotarło.',
        'Jeśli wszystko się zgadza, urząd zwykle kończy sprawdzanie bez kolejnego pisma.'
      ],
      todo: [{ id: 'fv', text: 'Zachowaj fakturę za internet przez 5 lat', detail: 'Tyle czasu urząd może sprawdzać Twoje zeznanie.' }],
      next: [],
      caseRec: { id: 'pismo', title: 'Pismo z urzędu skarbowego', state: 'demo', statusText: 'Zakończona w demonstracji', note: 'Odpowiedź z fakturą „wysłana” w demonstracji.', cta: null }
    });
    A.markLetterRead(L.id);
    A.resolveTodo('pismo-us');
  }

  async function pismoRestartEdit(my, L, att) {
    const S = ctx(my);
    const P = A.person;
    const text = await S.textEdit({
      q: 'Popraw treść odpowiedzi.',
      label: 'Treść odpowiedzi do urzędu',
      value: 'Dzień dobry,\nw odpowiedzi na wezwanie z dnia ' + T.fmt(L.got) + ' przesyłam fakturę za dostęp do internetu za ' + A.demo.taxYear + ' rok. Na jej podstawie odliczyłem ulgę w wysokości ' + A.demo.relief + ' zł.\n\nZ poważaniem\n' + P.first + ' ' + P.last,
      echo: 'Poprawiłem treść'
    });
    const res = await S.summary({
      title: 'Sprawdź, zanim wyślesz',
      will: [{ title: 'Wyślę Twoją odpowiedź do: ' + esc(L.from), detail: 'Treść: „' + esc(text.slice(0, 120)) + (text.length > 120 ? '…' : '') + '”. Załącznik: ' + esc(att.name) + '.', undo: { tone: 'info', text: 'Wysłanego pisma nie cofniesz, ale możesz wysłać uzupełnienie' } }],
      wont: ['Nie zmienię Twojego zeznania PIT.'],
      confirm: 'Potwierdź'
    });
    if (res === 'confirm') {
      S.progress(4, 'Gotowe');
      done({
        scenario: 'Odpowiedź na pismo z urzędu skarbowego',
        real: ['Urząd dostałby Twoją odpowiedź z fakturą od razu, a Ty potwierdzenie, że pismo dotarło.'],
        todo: [{ id: 'fv', text: 'Zachowaj fakturę za internet przez 5 lat', detail: 'Tyle czasu urząd może sprawdzać Twoje zeznanie.' }],
        next: [],
        caseRec: { id: 'pismo', title: 'Pismo z urzędu skarbowego', state: 'demo', statusText: 'Zakończona w demonstracji', note: 'Odpowiedź „wysłana” w demonstracji.', cta: null }
      });
      A.markLetterRead(L.id);
      A.resolveTodo('pismo-us');
    } else if (res === 'edit') {
      return pismoRestartEdit(my, L, att);
    } else cancelled(my, 'Odpowiedź nie została wysłana.');
  }

  /* ---------- scenariusz: koniec OC ---------- */

  async function oc(my) {
    const S = ctx(my);
    const end = A.dates.ocEnd;
    const n = T.inDays(end);
    S.progress(1, 'Co to oznacza');
    A.openTodo('oc');
    await S.say('Polisa OC Twojego auta <b>Toyota Yaris, WX\u00a012345</b> kończy się <b>' + T.fmt(end) + '</b>, czyli za ' + T.dni(n) + '.');
    // Sprawa, o której mowa: karta z „Do załatwienia” z przyciskiem otwierającym dokładnie tę kopertę.
    const t = todo('oc');
    if (t) S.node('<div class="src-list">' + sourceCard(t) + '</div>');
    await S.info(
      '<h2 class="icard-h">Co to oznacza w praktyce</h2><ul class="facts">' +
      '<li>' + ic('info', 20) + '<span>OC musisz mieć bez przerwy, dopóki auto jest zarejestrowane. Nawet gdy stoi w garażu.</span></li>' +
      '<li>' + ic('undo', 20) + '<span><b>Jeśli nic nie zrobisz,</b> umowa zwykle przedłuży się sama na kolejne 12 miesięcy w tym samym towarzystwie. Cena może się zmienić.</span></li>' +
      '<li>' + ic('calendar', 20) + '<span><b>Jeśli chcesz zmienić ubezpieczyciela,</b> wypowiedz obecną umowę najpóźniej dzień przed jej końcem. Inaczej możesz mieć dwie polisy naraz.</span></li>' +
      '<li>' + ic('alert', 20) + '<span>Za przerwę w OC Ubezpieczeniowy Fundusz Gwarancyjny nalicza karę, nawet kilka tysięcy złotych.</span></li>' +
      '</ul>'
    );
    await S.chips([{ id: 'go', label: 'Co mogę zrobić?' }]);
    S.progress(2, 'Wybierz, co zrobić');
    const how = await S.choice({
      q: 'Co chcesz zrobić?',
      rich: true,
      options: [
        { id: 'stay', label: 'Zostaję w obecnym towarzystwie', desc: 'Nic nie musisz robić. Mogę przypomnieć o zapłacie nowej składki.', tag: { tone: 'ok', text: 'Nic nie zostanie wysłane' } },
        { id: 'switch', label: 'Chcę zmienić ubezpieczyciela', desc: 'Przygotuję wypowiedzenie obecnej umowy. Nową polisę kupisz sam, tam gdzie chcesz.', tag: { tone: 'info', text: 'Przed wysłaniem zobaczysz podsumowanie' } },
        { id: 'sold', label: 'Sprzedałem to auto', desc: 'Powiem, co zrobić po sprzedaży.' }
      ]
    });
    if (how === 'stay') {
      await S.say('Dobrze. Twoja polisa najpewniej przedłuży się sama. Ustawić przypomnienie, żeby sprawdzić nową polisę i zapłacić składkę?');
      const r = await S.chips([{ id: 'yes', label: 'Tak, przypomnij ' + T.fmtShort(T.plus(n - 2)) }, { id: 'no', label: 'Nie trzeba' }]);
      if (r === 'yes') {
        const when = A.remindTodo('oc', 2);
        await S.ok('Ustawione. Przypomnę ' + T.fmtOn(when) + '. Sprawa zostaje w „Do załatwienia”. Do ubezpieczyciela nic nie zostało wysłane.');
      } else await S.say('W porządku. Termin końca OC zostaje w „Do załatwienia”.');
      finish();
      return;
    }
    if (how === 'sold') {
      await S.say('Po sprzedaży polisa OC przechodzi na kupującego. Ty masz 30 dni, żeby zgłosić sprzedaż w wydziale komunikacji i powiadomić ubezpieczyciela. W prawdziwej aplikacji zgłosiłbyś to tutaj; w tym prototypie ta sprawa kończy się na wyjaśnieniu.');
      finish();
      return;
    }
    for (;;) {
      S.progress(3, 'Sprawdź i potwierdź');
      const res = await S.summary({
        title: 'Sprawdź, zanim potwierdzisz',
        lead: 'Wypowiedzenie umowy OC nr <span class="mono">' + A.demo.policyNo + '</span> w TU Przykład S.A., z końcem dnia ' + T.fmt(end) + '.',
        will: [
          { title: 'Przygotuję wypowiedzenie i podpiszę je Twoim podpisem zaufanym', detail: 'Treść: „Wypowiadam umowę obowiązkowego ubezpieczenia OC pojazdu WX\u00a012345 z dniem ' + T.fmt(end) + '”.' },
          { title: 'Wyślę je do TU Przykład S.A.', detail: 'Umowa nie przedłuży się na kolejny rok.', undo: { tone: 'danger', text: 'Wycofasz je tylko w porozumieniu z ubezpieczycielem' }, danger: true }
        ],
        wont: ['Nie kupię nowej polisy. Musisz ją kupić sam, z początkiem od ' + T.fmt(T.plus(n + 1)) + '.'],
        ack: 'Rozumiem, że muszę kupić nową polisę OC, zanim ta się skończy.',
        confirm: 'Potwierdź'
      });
      if (res === 'edit') {
        await S.say('Wybierz jeszcze raz.');
        return oc(my);
      }
      if (res === 'cancel') { cancelled(my, 'Polisa jest bez zmian.'); return; }
      break;
    }
    done({
      scenario: 'Zmiana ubezpieczyciela OC',
      real: ['TU Przykład S.A. dostałoby podpisane wypowiedzenie, a Ty potwierdzenie jego doręczenia.', 'Obecna polisa skończyłaby się ' + T.fmt(end) + ' i nie przedłużyła sama.'],
      todo: [{ id: 'nowa', text: 'Kup nową polisę OC z początkiem od ' + T.fmt(T.plus(n + 1)), detail: 'U dowolnego ubezpieczyciela. Gdy ją kupisz, pojawi się przy aucie w aplikacji.' }],
      next: [],
      caseRec: { id: 'oc', title: 'Zmiana ubezpieczyciela OC', state: 'demo', statusText: 'Zakończona w demonstracji', note: 'Wypowiedzenie „wysłane” w demonstracji. Do zrobienia: nowa polisa od ' + T.fmt(T.plus(n + 1)) + '.', cta: null }
    });
    A.resolveTodo('oc');
  }

  /* ---------- scenariusz: nowy dowód (można wrócić do rozpoczętej sprawy) ---------- */

  async function nowyDowod(my, preset) {
    const S = ctx(my);
    const P = A.person;
    S.progress(1, 'Powód');
    let reason = preset.reason || null;
    if (preset.resume) {
      await S.say('Wracamy do wniosku, który zacząłeś ' + T.fmtShort(A.dates.caseStarted) + '. Powód: Twój dowód traci ważność ' + T.fmt(A.dates.idEnd) + '.');
      reason = 'waznosc';
    } else if (!reason) {
      reason = await S.choice({
        q: 'Dlaczego potrzebujesz nowego dowodu?',
        options: [
          { id: 'waznosc', label: 'Kończy się ważność' },
          { id: 'utrata', label: 'Zgubiłem go lub go skradziono' },
          { id: 'dane', label: 'Zmieniłem dane, np. nazwisko' },
          { id: 'uszkodzony', label: 'Jest uszkodzony' }
        ]
      });
      if (reason === 'utrata') {
        await S.say('Najpierw warto zabezpieczyć zgubiony dowód. Przejdźmy do tego.');
        if (current) current.done = true;
        return start('portfel', { items: ['dowod'] });
      }
    }
    await S.say('Ważna informacja: po nowy dowód musisz pójść do urzędu osobiście, bo urzędnik pobiera odciski palców. Mogę przygotować wszystko wcześniej, żeby wizyta trwała kilka minut.');

    S.progress(2, 'Dane i zdjęcie');
    await S.info('<h2 class="icard-h">Twoje dane z rejestru</h2><dl class="rows">' +
      [['Imię i nazwisko', P.first + ' ' + P.last], ['PESEL', P.peselMasked], ['Data urodzenia', P.born], ['Adres zameldowania', P.address]]
        .map((r) => '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>');
    const ok = await S.chips([{ id: 'ok', label: 'Dane są poprawne' }, { id: 'bad', label: 'Coś się nie zgadza' }]);
    if (ok === 'bad') {
      await S.say('Jeśli dane się nie zgadzają, urzędnik poprawi je na wizycie albo wskaże, gdzie to zrobić. Zaznaczę to we wniosku. Przejdźmy dalej.');
    }
    const photo = await S.fileStep({
      q: 'Dodaj zdjęcie do dowodu.',
      hint: '<ul class="reqs"><li>wykonane w ciągu ostatnich 6 miesięcy</li><li>rozmiar 35 × 45 mm, jasne i jednolite tło</li><li>cała twarz widoczna, bez nakrycia głowy</li></ul>',
      pick: 'Dodaj zdjęcie z telefonu', icon: 'photo', accept: 'image/*',
      alts: [
        { id: 'sample', label: 'Użyj przykładowego zdjęcia', icon: 'user', desc: 'Tylko w prototypie.' },
        { id: 'bring', label: 'Przyniosę zdjęcie do urzędu', icon: 'building' }
      ]
    });

    S.progress(3, 'Urząd i termin');
    const office = await S.choice({
      q: 'W którym urzędzie chcesz złożyć wniosek?',
      hint: 'Możesz wybrać dowolny urząd gminy w Polsce.',
      rich: true,
      options: [
        { id: 'a', label: 'Urząd Dzielnicy Przykładowo', desc: 'ul. Główna 1 · 1,2 km od domu', icon: 'building', echo: 'Urząd Dzielnicy Przykładowo' },
        { id: 'b', label: 'Urząd Dzielnicy Śródmieście (przykład)', desc: 'ul. Długa 5 · 4,8 km od domu', icon: 'building', echo: 'Urząd Dzielnicy Śródmieście' }
      ]
    });
    const officeName = office === 'a' ? 'Urząd Dzielnicy Przykładowo, ul. Główna 1' : 'Urząd Dzielnicy Śródmieście, ul. Długa 5';
    const slots = [[3, '9:30'], [4, '12:00'], [6, '15:15']].map((s) => ({ id: s[0] + '|' + s[1], label: T.fmtLong(T.plus(s[0])) + ', ' + s[1] }));
    const slot = await S.choice({ q: 'Wybierz termin wizyty.', options: slots });
    const slotLabel = slots.find((s) => s.id === slot).label;

    S.progress(4, 'Sprawdź i potwierdź');
    const res = await S.summary({
      title: 'Sprawdź, zanim potwierdzisz',
      will: [
        { title: 'Zarezerwuję wizytę: ' + esc(slotLabel), detail: esc(officeName) + '.', undo: { tone: 'ok', text: 'Odwołasz lub przełożysz w aplikacji do dnia przed wizytą' } },
        { title: 'Przekażę urzędowi przygotowany wniosek' + (photo.kind === 'bring' ? '' : ' i zdjęcie'), detail: 'Dane z rejestru' + (ok === 'bad' ? ' z adnotacją, że trzeba je sprawdzić' : '') + '. Urzędnik nie będzie ich przepisywał.' }
      ],
      wont: ['Nie złożę wniosku bez Ciebie. Podpiszesz go w urzędzie, po pobraniu odcisków palców.', 'Nie unieważnię obecnego dowodu. Jest ważny do ' + T.fmt(A.dates.idEnd) + '.'],
      extra: '<p class="sum-bring">' + ic('id', 20) + '<span><b>Na wizytę weź</b> obecny dowód osobisty' + (photo.kind === 'bring' ? ' i zdjęcie' : '') + '. Wydanie dowodu jest bezpłatne.</span></p>',
      confirm: 'Potwierdź'
    });
    if (res === 'edit') { await S.say('Dobrze, wybierzmy jeszcze raz.'); return nowyDowod(my, { resume: false, reason: reason }); }
    if (res === 'cancel') { cancelled(my, 'Wizyta nie została zarezerwowana.'); return; }
    done({
      scenario: 'Nowy dowód osobisty',
      real: ['Urząd dostałby przygotowany wniosek' + (photo.kind === 'bring' ? '' : ' ze zdjęciem') + ', a termin ' + slotLabel + ' byłby zarezerwowany.', 'Dzień przed wizytą dostałbyś przypomnienie. Dowód jest zwykle gotowy w ciągu 30 dni od złożenia wniosku. Dostałbyś powiadomienie, gdy będzie do odbioru.'],
      todo: [{ id: 'wizyta', text: 'Wizyta w urzędzie: ' + slotLabel, detail: officeName + '. Weź obecny dowód.' }],
      next: [],
      caseRec: { id: 'nowy-dowod', title: 'Wniosek o nowy dowód osobisty', state: 'demo', statusText: 'Zakończona w demonstracji', step: 4, steps: 4, note: 'Wizyta: ' + slotLabel + ' (demo).', cta: null }
    });
  }

  /* ---------- scenariusz: kto ma dostęp do danych ---------- */

  async function dane(my, preset) {
    const S = ctx(my);
    S.progress(1, 'Kto ma dostęp');
    const active = A.consents.filter((c) => c.active);
    let pick = preset.consent;
    if (!pick) {
      await S.say('Dostęp do Twoich danych z aplikacji mają teraz <b>' + active.length + ' ' + (active.length === 1 ? 'instytucja' : 'instytucje') + '</b>. Wybierz jedną, żeby zobaczyć szczegóły i zdecydować, czy dostęp zostaje.');
      pick = await S.choice({
        q: 'Kto ma dostęp do Twoich danych',
        rich: true,
        options: active.map((c) => ({ id: c.id, label: c.who, icon: c.icon, desc: esc(c.what.join(', ')) + '<br>Ostatnio sprawdzał: ' + T.fmt(c.last) })),
        none: { id: 'none', label: 'Tylko sprawdzałem, wszystko w porządku' }
      });
      if (!pick || pick === 'none') { await S.say('W porządku. Listę zawsze znajdziesz w zakładce Profil, w sekcji „Kto ma dostęp do moich danych”.'); finish(); return; }
    }
    const c = A.consents.find((x) => x.id === pick);
    S.progress(2, 'Szczegóły');
    await S.info('<h2 class="icard-h">' + esc(c.who) + '</h2><dl class="rows">' +
      '<div><dt>Jakie dane</dt><dd>' + esc(c.what.join(', ')) + '</dd></div>' +
      '<div><dt>Po co</dt><dd>' + esc(c.why) + '</dd></div>' +
      '<div><dt>Dostęp od</dt><dd>' + T.fmt(c.since) + ' (' + c.kind + ')</dd></div>' +
      '<div><dt>Ostatni odczyt</dt><dd>' + T.fmt(c.last) + '</dd></div></dl>');
    const keep = await S.choice({
      q: 'Czy ' + esc(c.who) + ' ma dalej mieć dostęp?',
      options: [{ id: 'revoke', label: 'Cofnij dostęp' }, { id: 'keep', label: 'Zostaw bez zmian' }]
    });
    if (keep === 'keep') { await S.say('Dostęp zostaje bez zmian.'); finish(); return; }
    S.progress(3, 'Sprawdź i potwierdź');
    const res = await S.summary({
      title: 'Sprawdź, zanim potwierdzisz',
      will: [
        { title: 'Cofnę dostęp: ' + esc(c.who), detail: 'Od teraz nie pobierze z aplikacji danych: ' + esc(c.what.join(', ')) + '.', undo: { tone: 'ok', text: 'Dostęp dasz ponownie, gdy o niego poprosi' } }
      ],
      wont: ['Nie usunę danych, które ' + esc(c.who) + ' już pobrał. O ich usunięcie możesz go poprosić sam.', 'Nie zamknę Twojego konta ani umowy.'],
      extra: '<p class="sum-bring">' + ic('info', 20) + '<span><b>Skutek:</b> przy następnej usłudze ' + esc(c.who) + ' może poprosić Cię o potwierdzenie tożsamości w inny sposób, np. w oddziale.</span></p>',
      confirm: 'Potwierdź'
    });
    if (res === 'edit') return dane(my, {});
    if (res === 'cancel') { cancelled(my, 'Dostęp jest bez zmian.'); return; }
    done({
      scenario: 'Cofnięcie dostępu do danych',
      real: [esc(c.who) + ' straciłby dostęp do Twoich danych od razu i dostałby o tym informację.', 'Wpis o cofnięciu dostępu zostałby w historii, z datą i godziną.'],
      todo: [{ id: 'rodo', text: 'Jeśli chcesz, poproś o usunięcie pobranych danych', detail: 'Napisz do ' + c.who + ' z prośbą o usunięcie danych (prawo z RODO).' }],
      next: [],
      caseRec: { id: 'dane-' + c.id, title: 'Cofnięcie dostępu: ' + c.who, state: 'demo', statusText: 'Zakończona w demonstracji', note: 'Dostęp cofnięty w demonstracji.', cta: null }
    });
  }

  const SC = {
    portfel: { title: 'Zgubiony portfel', steps: 4, fn: portfel },
    pismo: { title: 'Pismo z urzędu', steps: 4, fn: pismo },
    oc: { title: 'Koniec polisy OC', steps: 3, fn: oc },
    nowyDowod: { title: 'Nowy dowód osobisty', steps: 4, fn: nowyDowod },
    dane: { title: 'Dostęp do Twoich danych', steps: 3, fn: dane }
  };

  function ctx(my) {
    return {
      say: (h) => say(my, h),
      ok: async (h) => { guard(my); return botOk(h); },
      info: (h, c) => info(my, h, c),
      choice: (o) => choice(my, o),
      summary: (o) => summary(my, o),
      chips: (l) => chips(my, l),
      textEdit: (o) => textEdit(my, o),
      fileStep: (o) => fileStep(my, o),
      progress: (s, l) => { guard(my); progress(s, l); },
      node: (h) => { guard(my); return append(A.node(h)); }
    };
  }

  /* ---------- sterowanie ---------- */

  function stopPending() {
    if (pending) { const p = pending; pending = null; p.reject(ABORT); }
    // pytania z przerwanej sprawy przestają być aktywne
    el.log.querySelectorAll('.qcard:not(.answered)').forEach(lock);
    el.log.querySelectorAll('.quick.bound').forEach((q) => q.remove());
  }

  function start(id, preset) {
    const sc = SC[id];
    if (!sc) return;
    if (current && !current.done && current.id !== id && current.step > 0) {
      A.scenarioLeft(current, false);
    }
    A.scenarioStarted(id);
    stopPending();
    const my = ++run;
    current = { id: id, title: sc.title, total: sc.steps, step: 0, label: '', done: false };
    A.ensureRoute('chat', { noIntro: true });
    if (el.log.children.length) divider('Nowa sprawa: ' + sc.title);
    sc.fn(my, preset || {}).catch((e) => { if (e !== ABORT) failed(e); });
  }

  /* ---------- pytania własnymi słowami: tylko model AI albo jasny stan „niepodłączony” ---------- */

  function failed(err) {
    if (err) console.error(err);
    botState('err', 'Nie udało mi się pokazać odpowiedzi. To błąd po mojej stronie, nie Twój. Spróbuj jeszcze raz albo wybierz scenariusz:');
    freeChips(A.suggestions);
  }

  // Karty danych pochodzą z rekordów aplikacji (fikcyjnych), nigdy z tekstu modelu.
  const todo = (id) => (A.todo || []).find((t) => t.id === id);
  const docById = (id) => (A.docs || []).find((d) => d.id === id);
  const caseById = (id) => (A.cases || []).find((c) => c.id === id);

  /*
   * Karta źródła: pismo lub termin z „Do załatwienia” (od kogo, tytuł, termin, możliwa kwota) z przyciskiem,
   * który otwiera dokładnie tę sprawę. Oznaczona jako fikcyjne dane demonstracyjne.
   */
  function sourceCard(t) {
    const n = T.inDays(t.due);
    return '<article class="src-card" aria-labelledby="src-' + t.id + '">' +
      '<svg class="env-flap" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 0 L50 36 L100 0 Z"/></svg>' +
      '<p class="src-k">' + ic(t.icon === 'car' ? 'car' : 'letter', 20) + '<span>Dane z aplikacji: Do załatwienia</span><span class="src-demo">Dane fikcyjne</span></p>' +
      '<p class="src-from">' + esc(t.kind + ' · ' + t.from) + '</p>' +
      '<h2 class="src-title" id="src-' + t.id + '">' + esc(t.title) + '</h2>' +
      '<dl class="src-facts">' +
        '<div><dt>' + esc(t.dueLabel || 'Termin odpowiedzi') + '</dt><dd>' + esc(T.fmtLong(t.due)) + ' <span class="pill pill-' + (n <= 3 ? 'danger' : n <= 14 ? 'warn' : 'neutral') + '">za ' + T.dni(n) + '</span></dd></div>' +
        (t.amount ? '<div><dt>Możliwa kwota</dt><dd><b>' + esc(t.amount.text) + '</b>, ' + esc(t.amount.when) + '</dd></div>' : '') +
      '</dl>' +
      '<button type="button" class="btn secondary wide split src-go" data-act="item" data-id="' + t.id + '"><span>Otwórz tę sprawę</span>' + ic('chevronRight', 20) + '</button>' +
    '</article>';
  }

  // Karta dokumentu z zakładki Dokumenty: to, co jest w danych (np. „Ważny do”), i przycisk otwierający ten dokument.
  function docCard(d) {
    const tone = d.status && /^(ok|warn|danger|info)$/.test(d.status.tone) ? d.status.tone : 'neutral';
    return '<article class="src-card src-doc" aria-labelledby="srcd-' + d.id + '">' +
      '<p class="src-k">' + ic(d.icon || 'card', 20) + '<span>Dane z aplikacji: Dokumenty</span><span class="src-demo">Dane fikcyjne</span></p>' +
      '<p class="src-from">' + esc(d.eyebrow) + '</p>' +
      '<h2 class="src-title" id="srcd-' + d.id + '">' + esc(d.name) + '</h2>' +
      '<dl class="src-facts"><div><dt>' + esc(d.key) + '</dt><dd>' + esc(d.value) + (d.status ? ' <span class="pill pill-' + tone + '">' + esc(d.status.text) + '</span>' : '') + '</dd></div></dl>' +
      '<button type="button" class="btn secondary wide split src-go" data-go="doc" data-id="' + d.id + '"><span>Otwórz dokument</span>' + ic('chevronRight', 20) + '</button>' +
    '</article>';
  }

  // Karta sprawy z zakładki Sprawy: status i termin z danych.
  function caseCard(c) {
    return '<article class="src-card src-case" aria-labelledby="srcc-' + c.id + '">' +
      '<p class="src-k">' + ic('cases', 20) + '<span>Dane z aplikacji: Sprawy</span><span class="src-demo">Dane fikcyjne</span></p>' +
      '<h2 class="src-title" id="srcc-' + c.id + '">' + esc(c.title) + '</h2>' +
      '<dl class="src-facts"><div><dt>Status</dt><dd>' + esc(c.statusText) + '</dd></div>' +
        (c.due ? '<div><dt>' + esc(c.dueWhat ? c.dueWhat.charAt(0).toUpperCase() + c.dueWhat.slice(1) : 'Termin') + '</dt><dd>' + esc(T.fmtLong(c.due)) + '</dd></div>' : '') + '</dl>' +
      '<button type="button" class="btn secondary wide split src-go" data-act="cases" data-which="progress"><span>Zobacz w „Sprawach”</span>' + ic('chevronRight', 20) + '</button>' +
    '</article>';
  }

  const showSources = (list) => {
    if (list.length) append(A.node('<div class="src-list"><p class="src-list-h">' + ic('cases', 20) + '<span>Dane z aplikacji, na których oparto odpowiedź</span></p>' + list.join('') + '</div>'));
  };

  // Odpowiedź modelu w trzech częściach: co model wyczytał z danych aplikacji (ze źródłem), czego w danych nie ma, co dalej.
  function knowCard(o) {
    const row = (cls, icon, k, v) => v ? '<div class="know-row ' + cls + '"><dt class="know-k">' + ic(icon, 20) + '<span>' + k + '</span></dt><dd>' + v + '</dd></div>' : '';
    append(A.node('<div class="icard know"><dl>' +
      row('k-have', 'check', 'Z danych aplikacji (fikcyjnych)', o.have) +
      row('k-miss', 'info', 'Tego w danych nie ma', o.miss) +
      row('k-next', 'arrowRight', 'Co możesz zrobić', o.next) +
    '</dl></div>'));
  }

  // Przyciski prowadzące do miejsc w aplikacji (bez zmiany stanu) i do scenariuszy (te mają własne potwierdzenia).
  function placeChips(ids) {
    const list = [
      { label: 'Do załatwienia', go: () => A.nav('cases', { seg: 'todo' }) },
      { label: 'Dokumenty', go: () => A.nav('docs') }
    ].concat(ids.map((k) => ({ label: 'Zacznij: ' + SC[k].title, go: () => start(k, {}) })));
    actionChips(list);
  }

  // Model AI nie jest dostępny: mówimy to wprost i nie podajemy gotowej odpowiedzi zamiast niego.
  function offline(q) {
    const why = AI.reasonText();
    const ids = detect(q).slice(0, 2);
    botState('off', (AI.available() ? '<b>Nie wysłałem tego pytania do modelu AI</b> (' + esc(why) + '). ' : '<b>Nie odpowiem na to pytanie: model AI nie jest podłączony</b> (' + esc(why || 'brak serwera z modelem') + '). ') +
      'Nie podaję gotowych odpowiedzi zamiast AI. ' + (!AI.available() ? 'Do odpowiedzi potrzebny jest serwer projektu z modelem językowym; szczegóły są w Profilu, w części „Twoje dane”.' : !AI.sending() ? 'Wysyłanie włączysz przełącznikiem pod moim imieniem albo w Profilu.' : 'Po tej godzinie możesz zapytać jeszcze raz.') +
      '<span class="st-next">Możesz sam sprawdzić dane w aplikacji albo przejść ' + (ids.length ? 'pasujący ' : '') + 'scenariusz demonstracyjny (bez AI):</span>');
    placeChips(ids.length ? ids : ['pismo', 'oc']);
  }

  let asked = 0; // numer ostatniej wiadomości; spóźniona odpowiedź modelu na starszą wiadomość jest pomijana
  function send(text, opts) {
    A.ensureRoute('chat', { noIntro: true });
    const q = String(text || '').trim();
    if (!q) return;
    const mine = userSays(q, opts);
    const n = ++asked;
    AI.ready.then(() => {
      if (n !== asked) return;
      // Spinka 2.0: bez modelu AI odpowiada tryb demonstracyjny (src/spinka-demo.js): tylko dane aplikacji i opisy
      // procesów, ze źródłem i z tym, czego nie wiadomo. Gdy go nie ma, zostaje uczciwy komunikat „model niepodłączony”.
      if (!AI.active()) { if (A.ext && A.ext.demoAnswer) A.ext.demoAnswer(q, API); else offline(q); return; }
      const go = () => {
        if (n !== asked) return;
        whileWaiting(AI.answer(q, mine), M.imie + ' pyta model AI…').then((r) => {
          if (n !== asked) return;
          if (r.ok) AI.render(r).catch(failed); else AI.problem(r, q);
        }, () => { if (n === asked) AI.problem({ error: 'server' }, q); });
      };
      // Zgoda przed pierwszym wysłaniem: pytanie czeka, dopóki ktoś nie wybierze „Wyślij do modelu AI”.
      if (!AI.consented()) AI.askConsent(q, go); else go();
    }).catch(failed);
  }

  /*
   * Model AI przez serwer projektu: lokalny server/serwer-lokalny.mjs albo funkcja serwerowa Cloudflare
   * (server/funkcja-serwerowa.mjs, Workers AI) pod adresem wpisanym przy budowaniu. Bez serwera asystent nie odpowiada
   * na pytania własnymi słowami i mówi to wprost; scenariusze demonstracyjne działają lokalnie.
   * Do serwera trafiają tylko: pytanie (do 300 znaków), po dopytaniu poprzednie pytanie, i stan demonstracji
   * (które pozycje załatwiono, ustawione przypomnienia, statusy spraw z listy). Rekordy dla modelu ma serwer
   * (server/dane-demo.mjs, ta sama kopia co A.kontekstSeed), więc z przeglądarki nie da się podsunąć modelowi innych „danych”.
   * Pierwsze wysłanie wymaga zgody (do zamknięcia karty). Odpowiedź jest sprawdzana na serwerze i tutaj: źródła tylko
   * z kontekstu, a każda liczba i nazwa miesiąca tylko z tego rekordu, na który odpowiedź się powołuje.
   */
  const AI = (() => {
    const m = document.querySelector('meta[name="assistant-endpoint"]');
    const raw = m ? String(m.content || '').trim() : '';
    const base = /^\/[\w\/-]+$/.test(raw) || /^https:\/\/[\w.-]+(:\d+)?(\/[\w\/-]*)?$/.test(raw) ? raw.replace(/\/+$/, '') : null;
    const cred = base && /^https:/.test(base) ? 'omit' : 'same-origin';
    const REASON = { static: 'ta wersja nie ma serwera z modelem AI', no_key: 'serwer projektu nie ma dostępu do modelu AI', bad_key: 'serwer odrzucił klucz API', model_unavailable: 'model jest niedostępny', region: 'model jest niedostępny w tym regionie', server: 'brak połączenia z serwerem projektu', origin: 'serwer nie przyjmuje pytań z tej strony', off: 'wysyłanie pytań do modelu AI jest wyłączone' };
    const SOON = { timeout: 'Model AI nie odpowiedział w wyznaczonym czasie', network: 'Serwer projektu nie połączył się z modelem AI (brak sieci)', server: 'Brak połączenia z serwerem projektu', provider: 'Dostawca modelu AI zwrócił błąd', invalid: 'Odpowiedź modelu AI nie zgadzała się z danymi aplikacji, więc jej nie pokazuję', too_long: 'Pytanie jest za długie' };
    const MAXQ = 300;
    const st = { status: base ? 'checking' : 'static', reason: base ? null : 'static', on: true, pausedUntil: 0, why: '', fails: 0, consent: false, clarify: null, timer: 0, provider: 'model AI', plan: 'free', model: '' };
    try { if (sessionStorage.getItem('asystent-ai') === 'off') st.on = false; if (sessionStorage.getItem('asystent-ai-zgoda') === 'tak') st.consent = true; } catch (e) { /* bez pamięci sesji */ }
    const remember = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* bez pamięci sesji */ } };

    const hhmm = (t) => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const paused = () => Date.now() < st.pausedUntil;
    const available = () => st.status === 'ai';
    const active = () => available() && st.on && !paused();
    const reasonKey = () => (!available() ? st.reason : !st.on ? 'off' : null);

    // Pasek prototypu i zdanie pod imieniem zawsze mówią, czy pytania trafiają do modelu AI.
    function paint() {
      const bar = document.querySelector('.proto-bar p');
      if (bar && base) bar.innerHTML = '<strong>Prototyp</strong> · dane fikcyjne · ' + (active() ? 'pytania trafiają do modelu AI' : 'nic nie jest wysyłane');
      document.querySelectorAll('[data-ai-status]').forEach((x) => { x.textContent = statusText(); });
      document.querySelectorAll('[data-setting="aiSend"]').forEach((b) => { b.setAttribute('aria-checked', st.on ? 'true' : 'false'); });
      const sub = el.screen && el.screen.querySelector('#chat-sub');
      if (!sub) return;
      const hadFocus = !!(document.activeElement && document.activeElement.classList.contains('ai-switch'));
      if (st.status === 'checking') sub.textContent = 'Sprawdzam model AI…';
      else if (!available()) sub.textContent = 'Model AI niepodłączony';
      else {
        sub.innerHTML = '<button type="button" class="ai-switch" role="switch" aria-checked="' + st.on + '"><span class="ai-knob" aria-hidden="true"></span>Model AI</button> <span>' +
          (!st.on ? '· wyłączony' : paused() ? '· wstrzymany do ' + hhmm(st.pausedUntil) : '· z danych aplikacji') + '</span>';
        if (hadFocus) sub.querySelector('.ai-switch').focus();
      }
    }
    function statusText() {
      if (st.status === 'checking') return 'Sprawdzam, czy model AI jest podłączony…';
      if (!available()) return 'Niepodłączony: ' + (REASON[st.reason] || 'brak serwera') + '. Pytania własnymi słowami nie są wysyłane.';
      return st.provider + (st.model ? ', model ' + st.model : '') + ' przez serwer projektu. ' + (!st.on ? 'Wysyłanie wyłączone.' : paused() ? 'Wstrzymany do ' + hhmm(st.pausedUntil) + '.' : 'Wysyłanie włączone' + (st.consent ? ', zgoda udzielona.' : ', przed pierwszym pytaniem zapytam o zgodę.'));
    }

    function pause(sec, why) {
      st.pausedUntil = Date.now() + Math.max(30, Number(sec) || 60) * 1000;
      st.why = why;
      clearTimeout(st.timer);
      st.timer = setTimeout(paint, st.pausedUntil - Date.now() + 300);
      paint();
    }

    // Co i dokąd trafia. Zdanie o dostawcy zależy od tego, kto obsługuje model (dane z /status serwera).
    function disclosure() {
      const cf = /cloudflare/i.test(st.provider);
      const g = /gemini|google/i.test(st.provider);
      return 'Pytanie (do ' + MAXQ + ' znaków) trafi do serwera projektu, a stamtąd do ' + esc(st.provider) + ' razem z fikcyjnymi rekordami tej demonstracji: tytułami spraw i dokumentów, krótkimi opisami, terminami policzonymi przez aplikację, statusami i możliwymi kwotami. ' +
        'Z rozmowy trafia tylko bieżące pytanie, a gdy dopytuję, także poprzednie. Nie trafiają: imię, nazwisko, PESEL, adres, numery dokumentów, tablice rejestracyjne, numer polisy ani pełna treść pism. ' +
        (cf ? 'Cloudflare zastrzega w zasadach Workers AI, że nie używa tych treści do trenowania modeli. ' : g && st.plan === 'free' ? 'Na bezpłatnym poziomie Google może wykorzystywać te treści do ulepszania swoich usług. ' : 'Jak dostawca przetwarza te dane, określają jego warunki. ') +
        'Nie wpisuj prawdziwych danych osobowych.';
    }
    // Zgoda przed pierwszym pytaniem do modelu. „Nie wysyłaj” wyłącza wysyłanie do zamknięcia karty.
    function askConsent(q, go) {
      const card = A.node('<div class="icard consent" role="group" aria-labelledby="cz-h-' + (++qid) + '">' +
        '<p class="consent-h" id="cz-h-' + qid + '"><b>Wysłać to pytanie do modelu AI?</b></p><p>' + disclosure() + '</p>' +
        '<div class="q-actions"><button type="button" class="btn primary" data-v="tak">Wyślij do modelu AI</button><button type="button" class="btn secondary" data-v="nie">Nie wysyłaj</button></div></div>');
      card.addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]');
        if (!b || card.classList.contains('answered')) return;
        card.classList.add('answered');
        // Po decyzji karta zwija się do jednego zdania, żeby odpowiedź była od razu widoczna.
        card.innerHTML = '<p class="consent-done">' + ic(b.dataset.v === 'tak' ? 'check' : 'x', 20) + '<span>' + (b.dataset.v === 'tak' ? 'Zgoda udzielona: pytania trafiają do modelu AI do zamknięcia karty.' : 'Nie wysłano do modelu AI.') + '</span></p>';
        if (b.dataset.v === 'tak') { st.consent = true; remember('asystent-ai-zgoda', 'tak'); paint(); go(); return; }
        st.on = false; remember('asystent-ai', 'off'); paint();
        botState('cancel', 'Nie wysłałem pytania. Wysyłanie do modelu AI jest wyłączone do zamknięcia karty; włączysz je przełącznikiem pod moim imieniem albo w Profilu.');
        offline(q);
      });
      append(card);
    }

    function toggle() {
      st.on = !st.on;
      remember('asystent-ai', st.on ? 'on' : 'off');
      paint();
      if (!el.log || !el.log.children.length) return;
      botNow(st.on ? '<b>Wysyłanie do modelu AI włączone.</b> ' + (st.consent ? 'Pytania wpisane własnymi słowami trafią do modelu razem z fikcyjnymi danymi aplikacji.' : 'Przed pierwszym pytaniem zapytam o zgodę.') : '<b>Wysyłanie do modelu AI wyłączone.</b> Nic nie wysyłam; scenariusze demonstracyjne działają bez AI.');
    }

    // Status serwera: tylko zapytanie do serwera projektu, nic nie trafia do dostawcy modelu.
    const ready = !base ? Promise.resolve() : (() => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 5000);
      return fetch(base + '/status', { cache: 'no-store', credentials: cred, signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('status'))))
        .then((j) => {
          st.status = j && j.mode === 'ai' ? 'ai' : 'off'; st.reason = (j && j.reason) || (st.status === 'ai' ? null : 'server');
          if (j && typeof j.provider === 'string') st.provider = j.provider.slice(0, 40);
          if (j && typeof j.model === 'string') st.model = j.model.slice(0, 40);
          if (j && (j.plan === 'free' || j.plan === 'paid')) st.plan = j.plan;
          if (j && j.pausedFor > 0) pause(j.pausedFor, j.pauseKind === 'limit_dzienny' ? 'wyczerpana dzienna pula modelu' : 'limit zapytań');
        })
        .catch(() => { st.status = 'off'; st.reason = 'server'; })
        .then(() => { clearTimeout(timer); paint(); });
    })();

    // Stan demonstracji: jedyna zmienna część kontekstu, którą przeglądarka wysyła (serwer sprawdza id, daty i statusy).
    const two = (n) => (n < 10 ? '0' : '') + n;
    const iso = (d) => d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
    function stanDemo() {
      const seed = (A.kontekstSeed && A.kontekstSeed.zrodla) || [];
      const live = (A.todo || []).map((t) => 'todo:' + t.id);
      const przypomnienia = {};
      (A.todo || []).forEach((t) => { if (t.reminder) przypomnienia['todo:' + t.id] = iso(t.reminder); });
      return {
        bez: seed.filter((z) => z.id.indexOf('todo:') === 0 && live.indexOf(z.id) < 0).map((z) => z.id),
        przypomnienia: przypomnienia,
        sprawy: (A.cases || []).filter((c) => A.kontekst.STATUSY.indexOf(c.statusText) >= 0).map((c) => ({ id: c.id, status: c.statusText }))
      };
    }
    // Ten sam kod i te same rekordy co na serwerze (server/kontekst.mjs + server/dane-demo.mjs, wklejone przy budowaniu).
    function demoContext() { return A.kontekst.zastosujStan(A.kontekstSeed, stanDemo()); }

    // Drugie sprawdzenie w przeglądarce (pierwsze robi serwer): kształt, źródła z kontekstu i — najważniejsze —
    // każda liczba (data, kwota, liczba dni) i nazwa miesiąca tylko z tego rekordu, na który odpowiedź się powołuje.
    const MIES = /stycz\w*|lut\w*|mar(?:ca|zec)|kwie\w*|maj\w*|czerw\w*|lip\w*|sierp\w*|wrze\w*|paździer\w*|listopad\w*|grud\w*/gi;
    const nums = (s) => (String(s).match(/\d+(?:[.,:]\d+)*/g) || []).reduce((acc, t) => acc.concat(t.split(/[.,:]/)), []).map((x) => String(parseInt(x, 10)));
    const months = (s) => (String(s).match(MIES) || []).map((x) => x.toLowerCase().slice(0, 4));
    const arr = (v) => (Array.isArray(v) ? v : []);
    function accept(a, ctx, asked) {
      if (!a || ['odpowiedz', 'dopytanie', 'poza_zakresem'].indexOf(a.rodzaj) < 0 || typeof a.krotko !== 'string' || !a.krotko.trim()) return null;
      const out = {
        rodzaj: a.rodzaj, krotko: a.krotko,
        wiem: arr(a.wiem).filter((w) => w && typeof w.tekst === 'string').slice(0, 4),
        nie_wiem: arr(a.nie_wiem).filter((x) => typeof x === 'string').slice(0, 4),
        dalej: arr(a.dalej).filter((d) => d && typeof d.tekst === 'string' && typeof d.akcja === 'string').slice(0, 3),
        pytanie: typeof a.pytanie === 'string' ? a.pytanie : '',
        opcje: arr(a.opcje).filter((x) => typeof x === 'string' && x.trim()).slice(0, 3)
      };
      const byId = {};
      ctx.zrodla.forEach((z) => { byId[z.id] = z.tytul + ' ' + z.fakty.join(' '); });
      if (out.rodzaj === 'dopytanie' && !out.pytanie.trim()) return null;
      if (out.wiem.some((w) => !arr(w.zrodla).length || w.zrodla.some((x) => !byId[x]))) return null;
      const baseText = [ctx.dzis, ctx.dzis_slownie, asked].join(' ');
      const fits = (t, ids) => {
        const pool = baseText + ' ' + ids.map((x) => byId[x] || '').join(' ');
        const okN = {}; nums(pool).forEach((n) => { okN[n] = true; });
        const okM = {}; months(pool).forEach((x) => { okM[x] = true; });
        return nums(t).every((n) => okN[n]) && months(t).every((x) => okM[x]);
      };
      if (out.wiem.some((w) => !fits(w.tekst, w.zrodla))) return null;
      const cited = [];
      out.wiem.forEach((w) => w.zrodla.forEach((x) => { if (cited.indexOf(x) < 0) cited.push(x); }));
      out.dalej.forEach((d) => { const x = d.akcja.indexOf('otworz:') === 0 ? d.akcja.slice(7) : null; if (x && byId[x] && cited.indexOf(x) < 0) cited.push(x); });
      const rest = [out.krotko, out.pytanie].concat(out.nie_wiem, out.dalej.map((d) => d.tekst), out.opcje);
      if (rest.some((t) => !fits(t, cited))) return null;
      return out;
    }

    async function answer(text, bubble) {
      if (String(text).trim().length > MAXQ) return { ok: false, error: 'too_long' };
      if (bubble) bubble.querySelector('.bubble').insertAdjacentHTML('beforeend', '<span class="said remote">' + ic('info', 20) + 'wysłane do modelu AI (' + esc(st.provider) + ')</span>');
      const ctx = demoContext();
      const earlier = st.clarify;
      st.clarify = null;
      const body = { pytanie: String(text).trim(), stan: stanDemo() };
      if (earlier) body.poprzednio = earlier;
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 20000);
      try {
        const res = await fetch(base + '/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal, credentials: cred, cache: 'no-store' });
        let j = null;
        try { j = await res.json(); } catch (e) { j = null; }
        if (res.ok && j && j.odpowiedz) {
          const a = accept(j.odpowiedz, ctx, body.pytanie + ' ' + (earlier ? earlier.pytanie + ' ' + earlier.dopytanie : ''));
          if (a) { st.fails = 0; return { ok: true, a: a, q: body.pytanie }; }
          return { ok: false, error: 'invalid' };
        }
        return { ok: false, error: (j && j.error) || 'provider', retryAfter: j && j.retryAfter };
      } catch (e) {
        return { ok: false, error: e && e.name === 'AbortError' ? 'timeout' : 'server' };
      } finally {
        clearTimeout(timer);
      }
    }

    // Błąd: jedno zdanie, co się stało, przycisk „Zapytaj jeszcze raz” i drogi bez AI. Nigdy odpowiedź z gotowych reguł.
    function problem(r, q) {
      const e = r && r.error;
      if (REASON[e] && e !== 'server') {
        st.status = 'off'; st.reason = e; paint();
        offline(q);
        return;
      }
      let msg;
      if (e === 'too_long') {
        botState('err', 'Nie wysłałem pytania: ma ' + String(q).trim().length + ' znaków, a model przyjmuje najwyżej ' + MAXQ + '. Skróć je i zapytaj jeszcze raz.');
        return;
      }
      if (e === 'limit' || e === 'local_limit' || e === 'limit_dzienny') {
        pause(r.retryAfter, e === 'limit_dzienny' ? 'wyczerpana dzienna pula modelu' : e === 'limit' ? 'limit dostawcy' : 'limit serwera projektu');
        msg = (e === 'limit_dzienny' ? 'AI niedostępne: wyczerpała się dzienna bezpłatna pula modelu (' + st.provider + ').' : e === 'limit' ? 'AI niedostępne: wyczerpał się limit zapytań do modelu.' : 'Serwer projektu ogranicza liczbę zapytań do modelu AI.') + ' Do ' + hhmm(st.pausedUntil) + ' nie wysyłam pytań.';
      } else if (e === 'invalid') {
        // Treść niezgodna z danymi to nie awaria: nie wstrzymujemy AI, można zapytać inaczej.
        msg = SOON.invalid + '. Możesz zapytać inaczej albo sprawdzić dane w aplikacji.';
      } else {
        st.fails++;
        if (st.fails >= 2) { st.fails = 0; pause(120, 'powtarzające się błędy'); msg = (SOON[e] || 'Model AI nie odpowiedział') + ', drugi raz z rzędu. Do ' + hhmm(st.pausedUntil) + ' nie wysyłam pytań.'; }
        else msg = (SOON[e] || 'Model AI nie odpowiedział') + '.';
      }
      botState('err', esc(msg) + ' Nie zastępuję tej odpowiedzi gotowym tekstem.');
      const list = active() ? [{ label: 'Zapytaj jeszcze raz', go: () => send(q) }] : [];
      actionChips(list.concat([{ label: 'Do załatwienia', go: () => A.nav('cases', { seg: 'todo' }) }, { label: 'Dokumenty', go: () => A.nav('docs') }]));
    }

    // Nazwy źródeł i przyciski pochodzą z danych aplikacji, nie z tekstu modelu.
    function sourceName(x) {
      const id = x.slice(x.indexOf(':') + 1);
      const o = x.indexOf('todo:') === 0 ? todo(id) : x.indexOf('doc:') === 0 ? docById(id) : caseById(id);
      return o ? (o.title || o.name) : null;
    }
    function askChips(list) {
      const wrap = A.node('<div class="quick bound" role="group" aria-label="Doprecyzuj pytanie">' + list.map((c) => '<button type="button" class="chip">' + esc(c) + '</button>').join('') + '</div>');
      wrap.addEventListener('click', (ev) => { const b = ev.target.closest('.chip'); if (!b) return; wrap.remove(); send(b.textContent); });
      append(wrap);
    }
    async function render(r) {
      const a = r.a;
      await sayFree('<span class="ai-tag" >' + ic('info', 20) + 'Objaśnienie modelu AI</span>' + esc(a.krotko));
      if (a.rodzaj === 'dopytanie') {
        await sayFree(esc(a.pytanie));
        st.clarify = { pytanie: r.q, dopytanie: a.pytanie };
        if (a.opcje.length) askChips(a.opcje);
        return;
      }
      if (a.rodzaj === 'poza_zakresem') { freeChips(A.suggestions); return; }
      const li = (list) => (list.length ? '<ul class="know-list">' + list.map((x) => '<li>' + x + '</li>').join('') + '</ul>' : '');
      if (a.wiem.length || a.nie_wiem.length || a.dalej.length) {
        knowCard({
          have: li(a.wiem.map((w) => { const n = w.zrodla.map(sourceName).filter(Boolean); return esc(w.tekst) + (n.length ? ' <span class="know-src">(źródło: ' + esc(n.join(', ')) + ')</span>' : ''); })),
          miss: li(a.nie_wiem.map(esc)),
          next: li(a.dalej.map((d) => esc(d.tekst)))
        });
      }
      const cited = [];
      a.wiem.forEach((w) => w.zrodla.forEach((x) => { if (cited.indexOf(x) < 0) cited.push(x); }));
      a.dalej.forEach((d) => { if (d.akcja.indexOf('otworz:') === 0 && cited.indexOf(d.akcja.slice(7)) < 0) cited.push(d.akcja.slice(7)); });
      showSources(cited.map((x) => {
        const id = x.slice(x.indexOf(':') + 1);
        if (x.indexOf('todo:') === 0) { const t = todo(id); return t && t.due ? sourceCard(t) : null; }
        if (x.indexOf('doc:') === 0) { const d = docById(id); return d ? docCard(d) : null; }
        if (x.indexOf('case:') === 0) { const c = caseById(id); return c ? caseCard(c) : null; }
        return null;
      }).filter(Boolean).slice(0, 2));
      const scen = [];
      a.dalej.forEach((d) => { const k = d.akcja.indexOf('scenariusz:') === 0 ? d.akcja.slice(11) : null; if (k && SC[k] && scen.indexOf(k) < 0) scen.push(k); });
      if (scen.length) actionChips(scen.map((k) => ({ label: 'Zacznij: ' + SC[k].title, go: () => start(k, {}) })));
    }

    return {
      on: !!base, ready: ready, active: active, available: available, paint: paint, toggle: toggle,
      consented: () => st.consent, askConsent: askConsent, statusText: statusText, disclosure: disclosure,
      checking: () => st.status === 'checking', reasonText: () => (available() && st.on && paused() ? 'model AI jest wstrzymany do ' + hhmm(st.pausedUntil) + ' (' + st.why + ')' : REASON[reasonKey()] || ''), sending: () => st.on,
      revokeConsent: () => { st.consent = false; try { sessionStorage.removeItem('asystent-ai-zgoda'); } catch (e) { /* bez pamięci sesji */ } paint(); },
      answer: answer, render: render, problem: problem, context: demoContext
    };
  })();

  function intro() {
    if (el.log.children.length) return;
    botNow('Dzień dobry, tu ' + esc(M.imie) + '.' + (M.haslo ? ' ' + esc(M.haslo) : '') + ' Pomagam zrozumieć sprawy w tej demonstracji: pisma, terminy i dokumenty. Dane są fikcyjne.');
    if (AI.active()) botNow('Na pytania wpisane własnymi słowami odpowiada model AI (' + esc(AI.statusText().split(' przez')[0]) + '), tylko na podstawie danych z tej aplikacji. Czego w nich nie ma, tego nie wiem. Zanim cokolwiek zmienię, pokażę podsumowanie; decyzja należy do Ciebie.');
    else if (AI.checking()) { const c = botNow('Sprawdzam, czy model AI jest podłączony. Do tego czasu nic nie wysyłam.'); c.setAttribute('data-checking', ''); AI.ready.then(() => { if (!c.isConnected) return; c.removeAttribute('data-checking'); c.querySelector('.bubble').innerHTML = AI.active() ? 'Model AI jest podłączony (' + esc(AI.statusText().split(' przez')[0]) + '). Na pytania własnymi słowami odpowiada na podstawie danych z tej aplikacji; przed pierwszym pytaniem zapytam o zgodę.' : 'Model AI nie jest podłączony (' + esc(AI.reasonText()) + '), więc na pytania własnymi słowami nie odpowiadam i nic nie wysyłam. Możesz przejść scenariusz demonstracyjny.'; }); }
    else if (A.ext && A.ext.demoIntro) A.ext.demoIntro(API, AI.available());
    else botNow('W tej wersji model AI ' + (AI.available() ? 'jest wyłączony' : 'nie jest podłączony') + ', więc na pytania własnymi słowami nie odpowiadam i nic nie wysyłam. Możesz przejść scenariusz demonstracyjny: prowadzę go krok po kroku i przed każdą zmianą pokazuję podsumowanie.');
    freeChips(A.suggestions);
    mood('slucha');
  }

  function reset() {
    stopPending();
    run++;
    asked++;
    current = null;
    el.log.innerHTML = '';
    el.stepper.hidden = true;
    intro();
    A.refreshBadges();
  }

  // Elementy rozmowy dla trybu demonstracyjnego (src/spinka-demo.js): te same dymki, karty źródeł i przyciski co scenariusze.
  const API = { append: append, botNow: botNow, botState: botState, actionChips: actionChips, freeChips: freeChips, sourceCard: sourceCard,
    docCard: docCard, caseCard: caseCard, knowCard: knowCard, showSources: showSources, mood: mood, start: start, offline: offline,
    whileWaiting: whileWaiting, el: el };

  A.chat = {
    api: API,
    build: build,
    get screen() { return el.screen; },
    start: start,
    send: send,
    intro: intro,
    reset: reset,
    current: () => current,
    mood: mood,
    focusInput: () => el.input && el.input.focus(),
    setInput: (v) => { if (el.input) { el.input.value = v; el.input.focus(); } },
    detect: detect,
    // Dla Profilu: stan modelu AI, podgląd danych, które trafiłyby do modelu, przełącznik wysyłania i cofnięcie zgody.
    ai: { ready: AI.ready, statusText: AI.statusText, context: AI.context, available: AI.available, sending: AI.sending, consented: AI.consented,
      toggle: AI.toggle, revokeConsent: AI.revokeConsent, disclosure: AI.disclosure, paint: AI.paint }
  };
})(window.APP);
