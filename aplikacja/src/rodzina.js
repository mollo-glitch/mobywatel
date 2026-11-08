/*
 * Spinka 2.0: tryb rodzinny (demonstracja, dane fikcyjne).
 * Każdy profil ma ograniczony dostęp: rodzic widzi dokumenty i sprawy niepełnoletniego dziecka; dorosły członek rodziny
 * sam decyduje, co udostępnia (tu: tylko podgląd jego ustawień); dziecko nie widzi danych rodziców.
 * Zgody rodzicielskie „podpisujesz” w symulacji; uprawnienia drugiego rodzica przełączasz i widzisz od razu ich skutek.
 */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = (s) => A.esc(s);
  const T = A.time;
  const U = A.ui;
  const S = A.s2;
  const st = () => A.store.get();

  // Uprawnienia drugiego rodzica (Anny) do spraw dziecka: domyślnie wszystko, możesz wyłączyć pojedyncze rzeczy.
  const PERMS = [
    { id: 'docs', l: 'Dokumenty dziecka', d: 'Anna widzi dokumenty i ich ważność.' },
    { id: 'cases', l: 'Sprawy i wnioski', d: 'Anna widzi sprawy w toku i może je dokończyć.' },
    { id: 'remind', l: 'Wspólne przypomnienia', d: 'Anna dostaje te same przypomnienia o terminach.' }
  ];
  const perm = (child, p) => { const v = st().perms[child + ':' + p]; return v === undefined ? true : v; };

  const memberCard = (m) => {
    const cons = (m.consents || []).filter((c) => !st().signed[c.id]).length;
    const exp = (m.docs || []).filter((d) => d.valid && T.inDays(d.valid) <= 60).length;
    const regDone = (st().submitted || []).some((x) => x.proc === 'narodziny');
    const flags = [m.newborn && !regDone ? U.pill('Zgłoś narodziny', 'danger') : null, m.newborn && regDone ? U.pill('Zgłoszone (symulacja)', 'ok') : null,
      cons ? U.pill(A.plural(cons, 'zgoda czeka', 'zgody czekają', 'zgód czeka'), 'warn') : null, exp ? U.pill(A.plural(exp, 'dokument wygasa', 'dokumenty wygasają', 'dokumentów wygasa'), 'warn') : null].filter(Boolean).join('');
    return '<li><button type="button" class="s2-member" data-go="osoba" data-id="' + m.id + '">' +
      '<span class="avatar s2-av' + (m.adult ? '' : ' kid') + '" aria-hidden="true">' + esc(m.initials) + '</span>' +
      '<span class="s2-member-t"><span class="s2-member-n">' + esc(m.newborn ? 'Najmłodsze dziecko' : m.name) + '</span><span class="s2-member-r">' + esc(m.rel + (m.age ? ', ' + m.age + ' lat' : m.newborn ? ', ur. ' + T.fmtShort(T.plus(-7)) : '')) + '</span>' +
        (flags ? '<span class="s2-member-f">' + flags + '</span>' : '') + '</span>' +
      '<span class="row-go" aria-hidden="true">' + ic('chevronRight', 20) + '</span></button></li>';
  };

  A.ext.screens.rodzina = () => {
    const famEv = S.events().filter((e) => e.cat === 'rodzina' && T.inDays(e.date) >= 0).slice(0, 5);
    return A.screen('rodzina',
      '<div class="pad stack"><h1>Rodzina</h1>' +
        '<p class="lead">Sprawy i dokumenty dzieci, zgody rodzicielskie i wspólne przypomnienia. Każdy widzi tylko to, do czego ma prawo.</p>' +
        '<div class="s2-banner">' + U.sim('Dane fikcyjne') + '<p>Osoby i dokumenty są przykładowe. W prawdziwej usłudze powiązania rodzinne pochodziłyby z rejestrów.</p></div>' +
        '<section aria-labelledby="fam-h"><h2 id="fam-h">Profile</h2><ul class="s2-members">' +
          '<li><div class="s2-member me"><span class="avatar s2-av" aria-hidden="true">' + esc(A.person.initials) + '</span><span class="s2-member-t"><span class="s2-member-n">' + esc(A.person.first + ' ' + A.person.last) + '</span><span class="s2-member-r">Ty · pełny dostęp do swoich danych</span></span></div></li>' +
          S.family.map(memberCard).join('') + '</ul></section>' +
        '<section aria-labelledby="fam-r"><h2 id="fam-r">Wspólne przypomnienia</h2>' +
          (famEv.length ? '<ul class="s2-evs">' + famEv.map((e) => '<li><button type="button" class="s2-ev" data-act="cal-ev" data-id="' + esc(e.id) + '"><span class="s2-ev-date" aria-hidden="true"><b>' + e.date.getDate() + '</b><span>' + esc(T.fmtShort(e.date).split(' ')[1].slice(0, 3)) + '</span></span><span class="s2-ev-main"><span class="s2-ev-t">' + esc(e.title) + '</span><span class="s2-ev-m">' + esc(U.dueText(e.date)) + '</span></span>' + (e.done ? U.pill('Załatwione', 'ok') : '') + '</button></li>').join('') + '</ul>' : '<p class="empty">Brak wspólnych terminów.</p>') +
          '<button type="button" class="btn secondary wide" data-go="kalendarz">' + ic('calendar', 20) + 'Kalendarz rodziny</button></section>' +
        '<section aria-labelledby="fam-z"><h2 id="fam-z">Zasady dostępu</h2><ul class="s2-tips">' +
          '<li>' + ic('family', 20) + '<span><b>Rodzic</b> widzi dokumenty i sprawy niepełnoletniego dziecka i może je załatwiać.</span></li>' +
          '<li>' + ic('user', 20) + '<span><b>Dorosły członek rodziny</b> sam decyduje, co Ci udostępnia. Nie zmienisz tego za niego.</span></li>' +
          '<li>' + ic('lock', 20) + '<span><b>Dziecko</b> nie widzi Twoich danych ani spraw.</span></li></ul></section>' +
      '</div>');
  };

  A.ext.screens.osoba = (p) => {
    const m = S.family.find((x) => x.id === p.id) || S.family[0];
    const regDone = (st().submitted || []).some((x) => x.proc === 'narodziny');
    const docs = (m.docs || []).map((d) => {
      const n = d.valid ? T.inDays(d.valid) : null;
      return '<li class="s2-fdoc"><span class="s2-case-ic" aria-hidden="true">' + ic(/Paszport/.test(d.name) ? 'passport' : /Karta/.test(d.name) ? 'family' : 'id', 24) + '</span>' +
        '<span><b>' + esc(d.name) + '</b><span class="s2-fdoc-m">Ważny do ' + esc(T.fmt(d.valid)) + '</span>' + (d.warn ? '<span class="s2-fdoc-w">' + esc(d.warn) + '</span>' : '') + '</span>' +
        U.pill(n <= 60 ? 'za ' + T.dni(n) : 'ważny', n <= 60 ? 'warn' : 'ok') + '</li>';
    }).join('');
    const cons = (m.consents || []).map((c) => {
      const sig = st().signed[c.id];
      return '<li class="s2-consent"><h3>' + esc(c.title) + '</h3><p class="s2-case-inst">' + esc(c.from) + '</p><p>' + esc(c.detail) + '</p>' +
        '<p class="s2-attn-due">' + ic('clock', 16) + '<span>Odpowiedź do <b>' + esc(T.fmtLong(c.due)) + '</b></span>' + U.pill(U.dueText(c.due), U.dueTone(c.due)) + '</p>' +
        (sig ? '<p>' + U.pill(sig === 'tak' ? 'Zgoda wyrażona (symulacja podpisu)' : 'Odmówiono (symulacja)', sig === 'tak' ? 'ok' : 'neutral') + ' <button type="button" class="btn-text sm" data-act="fam-undo" data-id="' + c.id + '">Cofnij decyzję</button></p>'
          : '<div class="s2-actions"><button type="button" class="btn primary" data-act="fam-sign" data-id="' + c.id + '" data-v="tak">Wyrażam zgodę</button><button type="button" class="btn secondary" data-act="fam-sign" data-id="' + c.id + '" data-v="nie">Nie wyrażam zgody</button></div>') +
      '</li>';
    }).join('');
    const permsHtml = m.adult
      ? '<p class="sub">' + esc(m.note) + '</p><ul class="group quiet">' + m.shares.map((x) => '<li><div class="row static"><span class="row-ic tone-neutral">' + ic(x.on ? 'eye' : 'eyeOff', 24) + '</span><span class="row-main"><span class="row-title">' + esc(x.label) + '</span><span class="row-meta">' + (x.on ? 'Udostępnione Ci przez Annę' : 'Nieudostępnione') + ' · zmienia tylko Anna</span></span></div></li>').join('') + '</ul>'
      : '<p class="sub">Ty masz pełny dostęp jako rodzic. Wybierz, co widzi drugi rodzic (Anna).</p><ul class="group">' +
        PERMS.map((x) => '<li><button type="button" class="row switch" role="switch" data-act="fam-perm" data-id="' + m.id + ':' + x.id + '" aria-checked="' + perm(m.id, x.id) + '"><span class="row-main"><span class="row-title">' + esc(x.l) + '</span><span class="row-meta sw-sub">' + esc(x.d) + '</span></span><span class="sw" aria-hidden="true"><i></i></span></button></li>').join('') + '</ul>' +
        '<p class="s2-note">' + ic('lock', 16) + '<span>' + esc(m.short) + ' nie widzi Twoich danych ani spraw.</span></p>';
    return A.screen('osoba',
      '<div class="pad stack"><p class="eyebrow">' + ic('family', 16) + ' Rodzina · ' + esc(m.rel) + '</p><h1>' + esc(m.newborn ? 'Najmłodsze dziecko' : m.name) + '</h1>' +
        (m.newborn ? '<section class="s2-alert' + (regDone ? ' ok' : '') + '" aria-labelledby="nb-h"><h2 id="nb-h">' + ic(regDone ? 'check' : 'baby', 20) + (regDone ? 'Narodziny zgłoszone (symulacja)' : 'Zgłoś narodziny dziecka') + '</h2>' +
          (regDone ? '<p>Zgłoszenie jest w Sprawach. W prawdziwej usłudze dziecko dostałoby akt urodzenia i PESEL.</p><button type="button" class="btn primary" data-go="proces" data-id="swiadczenie">Wniosek o świadczenie wychowawcze</button>'
            : '<p>' + esc(m.karta.from) + ' przekazał kartę urodzenia ' + esc(T.fmtShort(m.karta.date)) + '. Termin zgłoszenia: <b>' + esc(T.fmtLong(m.karta.due)) + '</b> (' + esc(U.dueText(m.karta.due)) + ').</p><p class="s2-rule">' + ic('info', 16) + '<span>21 dni od sporządzenia karty urodzenia (informacja ogólna, sprawdź na gov.pl).</span></p><button type="button" class="btn primary" data-go="proces" data-id="narodziny">Zgłoś narodziny</button>') + '</section>' : '') +
        (docs ? '<section aria-labelledby="os-d"><h2 id="os-d">Dokumenty</h2><ul class="s2-fdocs">' + docs + '</ul>' + (m.id === 'zosia' ? '<button type="button" class="btn secondary wide" data-go="proces" data-id="paszport">' + ic('passport', 20) + 'Wniosek o nowy paszport</button>' : '') + '</section>' : '') +
        (cons ? '<section aria-labelledby="os-c"><h2 id="os-c">Zgody rodzica</h2><ul class="s2-consents">' + cons + '</ul></section>' : '') +
        '<section aria-labelledby="os-p"><h2 id="os-p">' + (m.adult ? 'Co Ci udostępnia' : 'Uprawnienia') + '</h2>' + permsHtml + '</section>' +
      '</div>');
  };

  A.ext.acts['fam-perm'] = (t) => {
    const k = t.dataset.id;
    const [child, p] = k.split(':');
    const on = !perm(child, p);
    A.store.update((s) => { s.perms[k] = on; });
    t.setAttribute('aria-checked', on ? 'true' : 'false');
    const x = PERMS.find((y) => y.id === p);
    A.toast((on ? 'Włączone: ' : 'Wyłączone: ') + x.l.toLowerCase() + ' dla Anny (symulacja).', 'ok');
  };
  A.ext.acts['fam-sign'] = (t) => {
    const c = S.family.flatMap((m) => m.consents || []).find((x) => x.id === t.dataset.id);
    if (!c) return;
    const yes = t.dataset.v === 'tak';
    A.confirm({
      title: (yes ? 'Wyrazić zgodę: ' : 'Odmówić zgody: ') + c.title.toLowerCase() + '?',
      items: yes ? ['Szkoła dostanie informację o Twojej zgodzie (symulacja podpisu).', 'Anna zobaczy decyzję we wspólnych przypomnieniach.', 'Decyzję możesz cofnąć do ' + T.fmtShort(c.due) + '.'] : ['Szkoła dostanie informację, że nie zgadzasz się na wyjazd (symulacja).', 'Decyzję możesz zmienić do ' + T.fmtShort(c.due) + '.'],
      ok: yes ? 'Podpisz (symulacja)' : 'Odmów (symulacja)', opener: t
    }).then((ok) => {
      if (!ok) return;
      A.store.update((s) => { s.signed[c.id] = yes ? 'tak' : 'nie'; });
      A.toast(yes ? 'Zgoda wyrażona w symulacji. Nic nie zostało wysłane.' : 'Odmowa zapisana w symulacji.', 'ok');
      A.render();
    });
  };
  A.ext.acts['fam-undo'] = (t) => { A.store.update((s) => { delete s.signed[t.dataset.id]; }); A.toast('Decyzja cofnięta. Możesz zdecydować jeszcze raz.'); A.render(); };

  A.ext.deep.rodzina = () => A.nav('rodzina');
  A.ext.search.push(() => S.family.map((m) => ({ group: 'Rodzina', title: m.newborn ? 'Najmłodsze dziecko' : m.name, sub: m.rel, icon: 'family', attrs: 'data-go="osoba" data-id="' + m.id + '"', keys: 'rodzina dziecko zgoda' })));
})(window.APP);
