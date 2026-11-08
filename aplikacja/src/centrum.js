/*
 * Spinka 2.0: Centrum spraw (nowy Start), „Więcej”, wyszukiwarka i płatności.
 * Start odpowiada na pytanie „co mam teraz zrobić”: najpierw to, co wymaga uwagi (kolejność według skutków i terminu,
 * z wyjaśnieniem), potem szybkie działania, sprawy w toku z postępem i dokumenty powiązane ze sprawami.
 */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = (s) => A.esc(s);
  const T = A.time;
  const U = A.ui;
  const S = A.s2;
  const st = () => A.store.get();

  // Instytucja przy sprawie (dane fikcyjne); kreatory zapisują ją same.
  const INST = { 'nowy-dowod': 'Urząd Miasta Przykładowo (fikcyjny)', adres: 'Urząd Dzielnicy Przykładowo (fikcyjny)', portfel: 'Kilka instytucji', pismo: 'Urząd Skarbowy w Przykładowie (fikcyjny)', chat: 'Rozmowa ze Spinką' };
  const CASE_IC = { 'nowy-dowod': 'id', adres: 'home', portfel: 'wallet', chat: 'assistant' };

  /* ---------- karty „Wymaga Twojej uwagi” ---------- */

  function dueLine(o) {
    if (!o.due) return '<p class="s2-attn-due">' + U.pill('Bez terminu', 'neutral') + '</p>';
    const tone = U.dueTone(o.due);
    return '<p class="s2-attn-due">' + ic('clock', 16) + '<span><b>' + esc(T.fmtLong(o.due)) + '</b></span>' + U.pill(U.dueText(o.due) + (tone === 'danger' ? ', pilne' : ''), tone) + '</p>';
  }
  function attnCard(o, i) {
    const tone = o.cons === 3 ? 'danger' : o.cons === 2 ? 'warn' : 'neutral';
    const whyId = 's2why-' + i;
    return '<li class="s2-attn-item tone-' + tone + (i === 0 ? ' s2-lead' : '') + '" data-attn="' + esc(o.id) + '">' +
      '<span class="s2-attn-rank" aria-hidden="true">' + (i + 1) + '</span>' +
      '<div class="s2-attn-body">' +
        '<p class="s2-attn-k">' + ic(o.icon, 16) + '<span>' + esc(o.kind) + '</span><span class="s2-dot" aria-hidden="true">·</span><span class="s2-attn-from">' + esc(o.from) + '</span></p>' +
        '<h3 class="s2-attn-t">' + esc(o.title) + '</h3>' +
        dueLine(o) +
        (o.amount ? '<p class="s2-attn-amt">Kwota: <b>' + esc(U.money(o.amount)) + '</b></p>' : '') +
        '<div class="s2-attn-foot">' +
          '<button type="button" class="s2-why-btn" data-act="s2-why" aria-expanded="false" aria-controls="' + whyId + '">Dlaczego tutaj?' + ic('chevronRight', 16) + '</button>' +
          '<button type="button" class="btn primary sm" ' + o.attrs + '>' + esc(o.verb) + ic('arrowRight', 16) + '</button>' +
        '</div>' +
        '<div class="s2-why" id="' + whyId + '" hidden>' +
          '<p><b>Skutek: ' + esc(o.consText) + '.</b> ' + esc(o.why || '') + '</p>' +
          '<p><b>Termin:</b> ' + (o.due ? esc(U.dueText(o.due)) + ' (' + esc(T.fmt(o.due)) + ').' : 'brak, ale sprawa czeka na Ciebie.') + '</p>' +
          (o.rule ? '<p class="s2-rule">' + ic('info', 16) + '<span>' + esc(o.rule) + '</span></p>' : '') +
          (o.next ? '<p><b>Co dalej:</b> ' + esc(o.next) + '</p>' : '') +
          '<p class="s2-why-how">Kolejność: najpierw skutki (kara, utrata uprawnień), potem bliskość terminu. Liczy to aplikacja z danych, nie model AI.</p>' +
        '</div>' +
      '</div></li>';
  }
  A.ext.acts['s2-why'] = (t) => {
    const box = document.getElementById(t.getAttribute('aria-controls'));
    if (!box) return;
    const open = t.getAttribute('aria-expanded') !== 'true';
    t.setAttribute('aria-expanded', open ? 'true' : 'false');
    box.hidden = !open;
    if (open) U.animate(box, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], U.MOTION.fast);
  };
  A.ext.acts['s2-attn-more'] = (t) => {
    const rest = document.getElementById('s2-attn-rest');
    if (!rest) return;
    rest.hidden = false;
    const items = Array.from(rest.children);
    items.forEach((el, i) => U.animate(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 220, { delay: i * 40, fill: 'backwards' }));
    t.remove();
    const first = rest.querySelector('h3');
    if (first) { first.tabIndex = -1; first.focus(); }
  };

  /* ---------- „Twoje sprawy”: postęp, instytucja, termin, następny krok ---------- */

  function caseCard(c) {
    const m = A.caseModel(c);
    const tone = { todo: 'warn', office: 'info', demo: 'ok' }[c.state] || 'neutral';
    const inst = c.inst || INST[c.id] || (c.detail && c.detail.from) || '';
    const dl = m.deadline;
    return '<li><article class="s2-case" aria-labelledby="s2c-' + esc(c.id) + '">' +
      '<div class="s2-case-top"><span class="s2-case-ic" aria-hidden="true">' + ic(c.icon || CASE_IC[c.id] || 'cases', 24) + '</span>' +
        '<div class="s2-case-h"><h3 id="s2c-' + esc(c.id) + '">' + esc(c.title) + '</h3>' + (inst ? '<p class="s2-case-inst">' + esc(inst) + '</p>' : '') + '</div>' +
        U.pill(m.statusText, tone) + '</div>' +
      (m.steps ? '<div class="s2-case-prog">' + U.progress(m.step, m.steps, 'Postęp sprawy: ' + c.title) + '<span class="s2-case-step">Etap ' + m.step + ' z ' + m.steps + '</span></div>' : '') +
      '<dl class="s2-case-dl">' +
        (dl ? '<div><dt>' + esc(dl.what.charAt(0).toUpperCase() + dl.what.slice(1)) + '</dt><dd>' + esc(T.fmtShort(dl.date)) + ' ' + U.pill(U.dueText(dl.date), U.dueTone(dl.date)) + '</dd></div>' : '') +
        (m.next ? '<div><dt>Następny krok</dt><dd>' + esc(m.next) + '</dd></div>' : '') +
      '</dl>' +
      (m.verb && m.attrs ? '<button type="button" class="btn secondary wide split"' + m.attrs + '><span>' + esc(m.verb) + '</span>' + ic('chevronRight', 20) + '</button>' : '') +
    '</article></li>';
  }
  A.s2CaseCard = caseCard;

  /* ---------- „Twoje dokumenty”: grupy i powiązane sprawy ---------- */

  const GROUPS = [
    { label: 'Tożsamość i podróże', ids: ['dowod', 'paszport'] },
    { label: 'Pojazd i uprawnienia', ids: ['prawko', 'pojazd'] },
    { label: 'Rodzina i zdrowie', ids: ['kdr', 'ekuz'] }
  ];
  const LINKS = {
    dowod: () => { const c = (A.cases || []).find((x) => x.id === 'nowy-dowod' && x.state !== 'demo'); return c ? { label: 'Sprawa: wniosek o nowy dowód', attrs: 'data-run="nowyDowod" data-preset=\'{"resume":true}\'' } : null; },
    pojazd: () => { const t = (A.todo || []).find((x) => x.id === 'oc'); return t ? { label: 'Sprawa: kończy się OC', attrs: 'data-act="item" data-id="oc"' } : null; },
    kdr: () => ({ label: 'Rodzina: 3 dzieci w profilu', attrs: 'data-go="rodzina"' })
  };
  function docsGrouped() {
    return GROUPS.map((g) => {
      const rows = g.ids.map((id) => (A.docs || []).find((d) => d.id === id)).filter(Boolean).map((d) => {
        const link = LINKS[d.id] && LINKS[d.id]();
        const tone = d.status && /^(ok|warn|danger|info)$/.test(d.status.tone) ? d.status.tone : 'neutral';
        return '<li class="s2-doc">' +
          '<button type="button" class="s2-doc-main" data-go="doc" data-id="' + d.id + '"><span class="s2-doc-ic tone-' + esc(d.tone || 'blue') + '" aria-hidden="true">' + ic(d.icon, 20) + '</span>' +
            '<span class="s2-doc-t"><span class="s2-doc-n">' + esc(d.name) + '</span><span class="s2-doc-v">' + esc(d.key + ': ' + d.value) + '</span></span>' +
            U.pill(d.status.short || d.status.text, tone) + '</button>' +
          (link ? '<button type="button" class="s2-doc-link" ' + link.attrs + '>' + ic('paperclip', 16) + '<span>' + esc(link.label) + '</span></button>' : '') +
        '</li>';
      }).join('');
      return '<div class="s2-docgroup"><h3 class="s2-docgroup-h">' + esc(g.label) + '</h3><ul class="s2-docs">' + rows + '</ul></div>';
    }).join('');
  }

  /* ---------- Start ---------- */

  const QUICK = [
    { attrs: 'data-go="skrzynka"', icon: 'scan', t: 'Wyjaśnij pismo', d: 'Zdjęcie lub PDF' },
    { attrs: 'data-go="uslugi"', icon: 'cases', t: 'Załatw sprawę', d: '10 spraw krok po kroku' },
    { attrs: 'data-go="skrzynka" data-id="dodaj"', icon: 'upload', t: 'Dodaj dokument', d: 'Do skrzynki' },
    { attrs: 'data-go="platnosci"', icon: 'coin', t: 'Opłać należność', d: '' },
    { attrs: 'data-go="kalendarz"', icon: 'calendar', t: 'Sprawdź termin', d: 'Kalendarz' },
    { attrs: 'data-tab="chat"', icon: 'assistant', t: 'Zapytaj Spinkę', d: 'Tekstem lub głosem' }
  ];
  function start() {
    const attn = S.attention();
    const top = attn.slice(0, 3); const rest = attn.slice(3);
    const unpaid = S.payments.filter((p) => !st().paid[p.id]).length;
    QUICK[3].d = unpaid ? A.plural(unpaid, 'należność', 'należności', 'należności') : 'Wszystko opłacone';
    const cases = A.progressItems();
    const sec = A.security ? A.security.status() : { tone: 'ok', text: 'Wszystko w porządku' };
    const s = A.screen('start',
      '<h1 class="sr-only">Centrum spraw</h1>' +
      // Pasek stanu pod nagłówkiem: dzisiejsza data w prototypie i wskaźnik bezpieczeństwa (tekst + ikona, nie sam kolor).
      '<div class="s2-status pad"><p class="s2-today">' + ic('calendar', 16) + '<span>' + esc(T.fmtLong(T.today)) + '</span></p>' +
        '<button type="button" class="s2-secchip tone-' + sec.tone + '" data-go="bezpieczenstwo">' + ic(sec.tone === 'ok' ? 'shieldCheck' : 'shield', 20) +
          '<span><span class="sr-only">Bezpieczeństwo: </span>' + esc(sec.text) + '</span>' + ic('chevronRight', 16) + '</button></div>' +
      '<section class="sec s2-attn" aria-labelledby="h-attn">' +
        '<div class="sec-head pad"><h2 id="h-attn">Wymaga Twojej uwagi <span class="s2-count">' + attn.length + '</span></h2>' +
          '<button type="button" class="btn-text" data-act="cases" data-which="todo">Sprawy</button></div>' +
        '<p class="s2-sec-lead pad">Najpierw to, co ma poważne skutki, potem to, co ma bliski termin.</p>' +
        (attn.length
          ? '<ol class="s2-attn-list pad">' + top.map(attnCard).join('') + '</ol>' +
            (rest.length ? '<ol class="s2-attn-list pad" id="s2-attn-rest" start="4" hidden>' + rest.map((o, i) => attnCard(o, i + 3)).join('') + '</ol>' +
              '<div class="pad"><button type="button" class="btn secondary wide" data-act="s2-attn-more">Pokaż pozostałe (' + rest.length + ')</button></div>' : '')
          : '<div class="pad">' + U.empty('check', 'Nic nie wymaga teraz Twojej uwagi', 'Damy znać, gdy pojawi się termin, pismo albo płatność.') + '</div>') +
      '</section>' +
      '<div class="sec pad">' + A.askOne('ask-home') + '</div>' +
      '<section class="sec s2-quick-sec" aria-labelledby="h-quick">' + U.secHead('h-quick', 'Szybkie działania', '') +
        '<ul class="s2-quick pad">' + QUICK.map((q) => U.tile(q.attrs, q.icon, q.t, q.d)).join('') + '</ul></section>' +
      '<section class="sec s2-adv" aria-labelledby="h-cases">' + U.secHead('h-cases', 'Twoje sprawy', '<button type="button" class="btn-text" data-act="cases" data-which="progress">Wszystkie (' + cases.length + ')</button>') +
        (cases.length ? '<ul class="s2-cases pad">' + cases.slice(0, 3).map(caseCard).join('') + '</ul>' : '<div class="pad">' + U.empty('cases', 'Nie masz spraw w toku', 'Zacznij od „Załatw sprawę”.', '<button type="button" class="btn secondary" data-go="uslugi">Załatw sprawę</button>') + '</div>') +
      '</section>' +
      '<section class="sec s2-adv" aria-labelledby="h-docs2">' + U.secHead('h-docs2', 'Twoje dokumenty', '<button type="button" class="btn-text" data-tab="docs">Wszystkie (' + A.docs.length + ')</button>') +
        '<div class="pad">' + docsGrouped() + '</div></section>' +
      '<p class="foot-note pad">Nieoficjalny prototyp konkursowy na mObywatel Challenge. Osoby, sprawy, płatności i dokumenty są fikcyjne. Nic nie jest wysyłane do żadnego urzędu.</p>'
    );
    s._after = () => {
      // Paski postępu rosną od zera przy pierwszym pokazaniu (transform, bez zmiany układu).
      if (!A.reducedMotion()) s.querySelectorAll('.pbar-fill').forEach((f, i) => U.animate(f, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(var(--p))' }], 600, { delay: 120 + i * 60, fill: 'backwards' }));
    };
    return s;
  }
  A.ext.screens.start = start;

  /* ---------- Więcej: moduły + profil ---------- */

  const MODULES = [
    { go: 'uslugi', icon: 'cases', t: 'Załatw za mnie', d: 'Kreatory spraw', tone: 'accent' },
    { go: 'kalendarz', icon: 'calendar', t: 'Kalendarz', d: 'Wszystkie terminy' },
    { go: 'skrzynka', icon: 'scan', t: 'Skrzynka dokumentów', d: 'Pisma, zdjęcia, PDF' },
    { go: 'platnosci', icon: 'coin', t: 'Płatności', d: 'Należności i historia' },
    { go: 'bezpieczenstwo', icon: 'shieldCheck', t: 'Bezpieczeństwo', d: 'Sesje, zgody, dostęp' },
    { go: 'rodzina', icon: 'family', t: 'Rodzina', d: 'Profile i uprawnienia' },
    { go: 'portfeleu', icon: 'globe', t: 'Portfel EU', d: 'Koncepcja eIDAS 2.0' },
    { go: 'szukaj', icon: 'search', t: 'Szukaj', d: 'Sprawy, dokumenty, usługi' }
  ];
  A.ext.screens.more = (p) => {
    const s = A.coreScreens.more(p);
    const hero = s.querySelector('.me-hero');
    if (hero) hero.insertAdjacentHTML('afterend',
      '<section class="s2-hub" aria-labelledby="h-hub"><h2 id="h-hub" class="s2-hub-h">Moduły</h2>' +
        '<ul class="s2-tiles">' + MODULES.map((m) => U.tile('data-go="' + m.go + '"', m.icon, m.t, m.d, m.tone)).join('') + '</ul></section>');
    const w = s.querySelector('#me-w');
    const ul = w && w.closest('.me-part') && w.closest('.me-part').querySelector('ul.group');
    const sw = (key, title, sub) => '<li><button type="button" class="row switch" role="switch" data-setting="' + key + '" aria-checked="' + (A.settings[key] ? 'true' : 'false') + '">' +
      '<span class="row-main"><span class="row-title">' + title + '</span><span class="row-meta sw-sub">' + sub + '</span></span><span class="sw" aria-hidden="true"><i></i></span></button></li>';
    if (ul) ul.insertAdjacentHTML('beforeend',
      sw('hc', 'Wysoki kontrast', 'Czarne tło kart, biały tekst, grube obrysy i żółty fokus.') +
      sw('simple', 'Tryb uproszczony', 'Na Starcie tylko najważniejsze sprawy, szybkie działania i pytanie do Spinki.'));
    return s;
  };

  /* ---------- wyszukiwarka ---------- */

  A.ext.screens.szukaj = (p) => {
    const s = A.screen('szukaj',
      '<div class="pad stack"><h1>Szukaj</h1>' +
        '<form class="s2-search" role="search" autocomplete="off">' +
          '<label class="sr-only" for="s2-q">Czego szukasz?</label>' + ic('search', 20) +
          '<input id="s2-q" type="search" placeholder="np. paszport, OC, podatek" value="' + esc(p.q || '') + '" aria-describedby="s2-q-n">' +
        '</form>' +
        '<p class="s2-hint" id="s2-q-n" aria-live="polite"></p>' +
        '<div id="s2-res"></div>' +
        '<p class="foot-note">Szukam w danych tej demonstracji: sprawach, dokumentach, usługach, terminach i płatnościach.</p></div>');
    const paint = () => {
      const q = s.querySelector('#s2-q').value;
      const res = U.searchAll(q);
      s.querySelector('#s2-q-n').textContent = q.trim() ? (res.length ? 'Wyniki: ' + res.length : 'Brak wyników. Spróbuj innego słowa albo zapytaj Spinkę.') : 'Wpisz co najmniej jedno słowo.';
      const groups = {};
      res.forEach((r) => { (groups[r.group] = groups[r.group] || []).push(r); });
      s.querySelector('#s2-res').innerHTML = Object.keys(groups).map((g) => '<h2 class="s2-res-h">' + esc(g) + '</h2><ul class="group">' +
        groups[g].map((r) => U.linkRow(r.attrs, r.icon, r.title, r.sub)).join('') + '</ul>').join('') +
        (q.trim() && !res.length ? '<button type="button" class="btn secondary wide" data-say="' + esc(q) + '">' + ic('assistant', 20) + 'Zapytaj Spinkę: „' + esc(q) + '”</button>' : '');
    };
    s._after = () => { const i = s.querySelector('#s2-q'); i.addEventListener('input', paint); paint(); if (!p.q) setTimeout(() => i.focus(), 60); };
    return s;
  };
  A.ext.search.push(() => (A.docs || []).map((d) => ({ group: 'Dokumenty', title: d.name, sub: d.key + ': ' + d.value, icon: d.icon, attrs: 'data-go="doc" data-id="' + d.id + '"', keys: d.eyebrow })));
  A.ext.search.push(() => (A.todo || []).map((t) => ({ group: 'Do załatwienia', title: t.title, sub: t.from, icon: t.icon, attrs: 'data-act="item" data-id="' + t.id + '"', keys: t.what })));
  A.ext.search.push(() => A.progressItems().map((c) => ({ group: 'Sprawy w toku', title: c.title, sub: c.statusText, icon: 'cases', attrs: 'data-act="cases" data-which="progress"' })));
  A.ext.search.push(() => S.payments.map((p) => ({ group: 'Płatności', title: p.title, sub: U.money(p.amount) + ' · ' + p.inst, icon: 'coin', attrs: 'data-go="platnosci" data-id="' + p.id + '"', keys: 'oplata zaplac platnosc' })));
  A.ext.search.push(() => MODULES.map((m) => ({ group: 'Moduły', title: m.t, sub: m.d, icon: m.icon, attrs: 'data-go="' + m.go + '"' })));

  /* ---------- płatności (symulacja) ---------- */

  function payRow(p) {
    const paid = st().paid[p.id];
    return '<li><article class="s2-pay' + (paid ? ' paid' : '') + '" id="pay-' + p.id + '" aria-labelledby="pay-h-' + p.id + '">' +
      '<div class="s2-pay-top"><span class="s2-case-ic" aria-hidden="true">' + ic(p.icon, 24) + '</span>' +
        '<div class="s2-case-h"><h2 id="pay-h-' + p.id + '">' + esc(p.title) + '</h2><p class="s2-case-inst">' + esc(p.inst) + '</p></div>' +
        '<p class="s2-pay-amt">' + esc(U.money(p.amount)) + '</p></div>' +
      '<p class="s2-pay-what">' + esc(p.what) + '</p>' +
      '<dl class="s2-case-dl"><div><dt>Termin</dt><dd>' + esc(T.fmtLong(p.due)) + ' ' + (paid ? U.pill('Opłacona w symulacji', 'ok') : U.pill(U.dueText(p.due), U.dueTone(p.due))) + '</dd></div>' +
        '<div><dt>Podstawa</dt><dd>' + esc(p.ref) + ' (fikcyjna)</dd></div>' +
        (paid ? '<div><dt>Opłacona</dt><dd>' + esc(T.fmtShort(A.store.fromIso(paid))) + ', ' + esc(st().payMethod && st().payMethod[p.id] || 'symulacja') + '</dd></div>' : '<div><dt>Po terminie</dt><dd>' + esc(p.ifLate) + '</dd></div>') +
      '</dl>' +
      (paid ? '<p class="s2-note">' + ic('info', 16) + '<span>Płatność w prototypie jest symulacją: żadne pieniądze nie zostały przelane.</span></p>'
        : '<div class="s2-actions"><button type="button" class="btn primary" data-act="pay" data-id="' + p.id + '">' + ic('coin', 20) + 'Opłać (symulacja)</button>' +
          '<button type="button" class="btn secondary" data-act="pay-remind" data-id="' + p.id + '">' + ic('bell', 20) + 'Przypomnij 2 dni przed</button></div>') +
    '</article></li>';
  }
  A.ext.screens.platnosci = (p) => {
    const unpaid = S.payments.filter((x) => !st().paid[x.id]);
    const sum = unpaid.reduce((a, x) => a + x.amount, 0);
    const s = A.screen('platnosci',
      '<div class="pad stack"><h1>Płatności</h1>' +
        '<p class="lead">Należności z urzędów w jednym miejscu: ile, za co, do kiedy i co się stanie po terminie.</p>' +
        '<div class="s2-banner">' + U.sim('Symulacja płatności') + '<p>Prototyp nie łączy się z bankiem ani z systemem płatności. „Opłać” pokazuje przebieg, ale nie pobiera pieniędzy i nie prosi o dane karty ani logowania do banku.</p></div>' +
        '<p class="s2-total">Do zapłaty: <b>' + esc(U.money(sum)) + '</b> (' + A.plural(unpaid.length, 'należność', 'należności', 'należności') + ')</p>' +
        '<ul class="s2-pays">' + S.payments.slice().sort((a, b) => !!st().paid[a.id] - !!st().paid[b.id] || a.due - b.due).map(payRow).join('') + '</ul></div>');
    if (p.id) s._after = () => { const el = s.querySelector('#pay-' + p.id); if (el) { el.classList.add('s2-flash'); el.scrollIntoView({ block: 'center' }); } };
    return s;
  };
  A.ext.acts.pay = (t) => {
    const p = S.payments.find((x) => x.id === t.dataset.id);
    if (!p) return;
    U.sheet.open({
      title: 'Opłać: ' + p.title,
      opener: t,
      html: '<p class="s2-sheet-lead">' + U.sim('Symulacja') + ' Wybierz sposób, żeby zobaczyć przebieg. Nic nie zostanie pobrane.</p>' +
        '<form class="s2-form" id="pay-form" novalidate>' +
          U.field({ id: 'metoda', label: 'Sposób płatności', type: 'radio', required: true, options: [
            { v: 'BLIK', l: 'BLIK', d: 'W prawdziwej aplikacji: kod z aplikacji banku.' },
            { v: 'przelew', l: 'Przelew z banku', d: 'W prawdziwej aplikacji: przekierowanie do banku.' },
            { v: 'karta', l: 'Karta', d: 'W prawdziwej aplikacji: bramka płatnicza.' }] }) +
          '<dl class="s2-sum"><div><dt>Kwota</dt><dd>' + esc(U.money(p.amount)) + '</dd></div><div><dt>Odbiorca</dt><dd>' + esc(p.inst) + '</dd></div><div><dt>Tytuł</dt><dd>' + esc(p.title) + '</dd></div></dl>' +
          '<div class="q-actions"><button type="button" class="btn primary" data-act="pay-confirm" data-id="' + p.id + '">Potwierdź (symulacja)</button>' +
          '<button type="button" class="btn ghost" data-act="s2sheet-close">Anuluj</button></div>' +
        '</form>'
    });
  };
  A.ext.acts['pay-confirm'] = (t) => {
    const form = document.getElementById('pay-form');
    const f = [{ id: 'metoda', label: 'Sposób płatności', type: 'radio', required: true }];
    const r = U.validate(form, f);
    if (!r.ok) return;
    const id = t.dataset.id;
    A.store.update((s) => { s.paid[id] = A.store.iso(T.today); s.payMethod = s.payMethod || {}; s.payMethod[id] = r.values.metoda + ' (symulacja)'; });
    U.sheet.close(true);
    A.toast('Symulacja płatności zakończona. Żadne pieniądze nie zostały pobrane.', 'ok');
    A.render();
  };
  A.ext.acts['pay-remind'] = (t) => {
    const p = S.payments.find((x) => x.id === t.dataset.id);
    if (!p) return;
    const when = T.plus(Math.max(1, T.inDays(p.due) - 2));
    A.store.update((s) => { s.reminders = s.reminders.filter((r) => r.id !== 'pay-' + p.id).concat([{ id: 'pay-' + p.id, date: A.store.iso(when), title: 'Zapłać: ' + p.title, note: U.money(p.amount) }]); });
    A.toast('Przypomnę ' + T.fmtOn(when) + '. Przypomnienie jest w Kalendarzu (w prototypie).', 'ok');
  };

  A.ext.deep.platnosci = () => A.nav('platnosci');
  A.ext.deep.szukaj = () => A.nav('szukaj');
})(window.APP);
