/*
 * Spinka 2.0: Centrum bezpieczeństwa i centrum aktualizacji.
 * Sesje, ostrzeżenia i historia dostępu są symulacją na fikcyjnych danych. Stan usług i aktualizacje dotyczą WYŁĄCZNIE
 * tego prototypu (wersja, moduły, czy model AI jest podłączony): prototyp nie sprawdza i nie opisuje stanu prawdziwej
 * infrastruktury ani certyfikatów.
 */
(function (A) {
  'use strict';
  const ic = (n, s) => A.icon(n, s);
  const esc = (s) => A.esc(s);
  const T = A.time;
  const U = A.ui;
  const S = A.s2;
  const st = () => A.store.get();
  const WERSJA = '2.0';

  const openIssues = () => (!st().ended.tablet && !st().ack.tablet ? 1 : 0);
  A.security = {
    status: () => (openIssues() ? { tone: 'warn', text: A.plural(openIssues(), 'sprawa do sprawdzenia', 'sprawy do sprawdzenia', 'spraw do sprawdzenia') } : { tone: 'ok', text: 'Wszystko w porządku' }),
    topbarButton: () => {
      const s = A.security.status();
      return '<button type="button" class="tb-btn tb-sec" data-go="bezpieczenstwo" aria-label="Bezpieczeństwo: ' + esc(s.text) + ' (symulacja)">' + ic(s.tone === 'ok' ? 'shieldCheck' : 'shield', 24) +
        '<span class="tb-dot ' + s.tone + '" aria-hidden="true"></span></button>';
    }
  };

  const session = (x) => {
    const ended = st().ended[x.id];
    return '<li class="s2-sess' + (x.unusual && !ended && !st().ack[x.id] ? ' unusual' : '') + '">' +
      '<span class="s2-case-ic" aria-hidden="true">' + ic('device', 24) + '</span>' +
      '<div class="s2-sess-t"><b>' + esc(x.device) + '</b> <span class="s2-sess-os">' + esc(x.os) + '</span>' +
        '<span class="s2-sess-m">' + esc(x.where) + ' · ostatnio ' + esc(x.last && T.inDays(x.last) === 0 ? 'dziś' : T.fmtShort(x.last)) + '</span>' +
        (x.current ? U.pill('To urządzenie', 'ok') : ended ? U.pill('Zakończona', 'neutral') : x.unusual && !st().ack[x.id] ? U.pill('Nowe miejsce logowania', 'warn') : '') + '</div>' +
      (!x.current && !ended ? '<button type="button" class="btn secondary sm" data-act="sec-end" data-id="' + x.id + '">Zakończ</button>' : '') +
    '</li>';
  };

  A.ext.screens.bezpieczenstwo = () => {
    const stat = A.security.status();
    const tab = S.sessions.find((x) => x.id === 'tablet');
    const alert = !st().ended.tablet && !st().ack.tablet;
    const ai = A.chat && A.chat.ai;
    return A.screen('bezpieczenstwo',
      '<div class="pad stack"><h1>Centrum bezpieczeństwa</h1>' +
        '<div class="s2-banner">' + U.sim('Symulacja') + '<p>Sesje, logowania i odczyty danych są przykładowe. Prototyp nie ma prawdziwego konta i nie sprawdza stanu prawdziwych usług.</p></div>' +
        '<section class="s2-secstat tone-' + stat.tone + '" aria-labelledby="sec-stat"><span class="s2-secstat-ic" aria-hidden="true">' + ic(stat.tone === 'ok' ? 'shieldCheck' : 'shield', 32) + '</span>' +
          '<div><h2 id="sec-stat">' + esc(stat.text) + '</h2><p>' + (stat.tone === 'ok' ? 'Wszystkie sesje są rozpoznane, a zgody aktualne.' : 'Sprawdź nowe logowanie poniżej.') + '</p></div></section>' +
        (alert ? '<section class="s2-alert" aria-labelledby="sec-al"><h2 id="sec-al">' + ic('alert', 20) + 'Nowe logowanie: ' + esc(tab.device) + ', ' + esc(tab.where) + '</h2>' +
          '<p>Dziś ktoś zalogował się na Twoje konto z urządzenia, którego wcześniej nie używałeś (symulacja). Jeśli to nie Ty, zakończ sesję.</p>' +
          '<div class="s2-actions"><button type="button" class="btn primary" data-act="sec-end" data-id="tablet">Zakończ tę sesję</button><button type="button" class="btn secondary" data-act="sec-ack" data-id="tablet">To byłem ja</button></div></section>' : '') +
        '<section aria-labelledby="sec-s"><h2 id="sec-s">Sesje i urządzenia</h2><ul class="s2-sesss">' + S.sessions.map(session).join('') + '</ul>' +
          '<button type="button" class="btn ghost wide" data-act="sec-end-all">Zakończ wszystkie inne sesje</button></section>' +
        '<section aria-labelledby="sec-h"><h2 id="sec-h">Historia dostępu do danych</h2><p class="sub">Kto i po co odczytał Twoje dane (przykłady).</p>' +
          '<ul class="s2-log">' + S.accessLog.map((l) => '<li><span class="s2-log-d">' + esc(T.fmtShort(l.when)) + '</span><span><b>' + esc(l.who) + '</b><span class="s2-log-m">' + esc(l.what) + ' · ' + esc(l.why) + '</span></span></li>').join('') + '</ul></section>' +
        '<section aria-labelledby="sec-z"><h2 id="sec-z">Zgody i udostępnianie</h2><ul class="group">' +
          U.linkRow('data-go="access"', 'shieldCheck', 'Kto ma dostęp do moich danych', A.plural((A.consents || []).filter((c) => c.active).length, 'aktywny dostęp', 'aktywne dostępy', 'aktywnych dostępów') + ' · cofnięcie dostępu') +
          U.linkRow('data-go="rodzina"', 'family', 'Udostępnianie w rodzinie', 'Co widzą inni członkowie rodziny') +
          U.linkRow('data-go="portfeleu"', 'globe', 'Historia zgód w portfelu EU', 'Koncepcja: co i komu pokazałeś') +
          U.linkRow('data-go="more"', 'assistant', 'Zgoda na wysyłanie pytań do modelu AI', ai ? ai.statusText() : 'Niepodłączony') +
        '</ul><p class="s2-note">' + ic('info', 16) + '<span>Udostępnianie danych zawsze wymaga Twojej zgody: widzisz, kto pyta, jakie dane chce dostać i po co. Zgodę możesz cofnąć.</span></p></section>' +
        '<section aria-labelledby="sec-w"><h2 id="sec-w">Porady</h2><ul class="s2-tips">' +
          '<li>' + ic('alert', 20) + '<span><b>Urząd nie prosi o hasło ani kod SMS</b> w wiadomości, mailu ani telefonie. Nie klikaj w linki „do aktualizacji danych”.</span></li>' +
          '<li>' + ic('refresh', 20) + '<span><b>Aktualizuj aplikację tylko ze sklepu z aplikacjami</b> (Google Play, App Store). Link w SMS-ie to częsty sposób oszustów.</span></li>' +
          '<li>' + ic('lock', 20) + '<span><b>Zablokuj telefon</b> kodem albo biometrią. Dokumenty w aplikacji są wtedy bezpieczniejsze.</span></li>' +
        '</ul></section>' +
        '<section aria-labelledby="sec-u"><h2 id="sec-u">Aktualizacje i stan usług</h2><ul class="group">' +
          U.linkRow('data-go="aktualizacje"', 'refresh', 'Centrum aktualizacji', 'Wersja prototypu ' + WERSJA + ', co nowego, certyfikaty') +
        '</ul></section>' +
        '<section aria-labelledby="sec-r"><h2 id="sec-r">Odzyskiwanie dostępu</h2>' +
          '<details class="gloss"><summary>Zgubiłem telefon albo go skradziono</summary><ol class="s2-steps">' +
            '<li>Na innym urządzeniu zakończ sesje (w prawdziwej usłudze: w serwisie przez przeglądarkę).</li>' +
            '<li>Jeśli w telefonie był dostęp do bankowości, zablokuj go w banku.</li>' +
            '<li>Na nowym telefonie potwierdzasz tożsamość tak jak przy pierwszym uruchomieniu: przez bank, e-dowód albo Profil Zaufany.</li>' +
            '<li>Dokumenty fizyczne (dowód, prawo jazdy) zostają ważne; zastrzegasz je tylko wtedy, gdy też zginęły.</li></ol></details>' +
          '<details class="gloss"><summary>Nie pamiętam hasła do aplikacji</summary><p>Hasło do aplikacji ustawiasz na nowo po ponownym potwierdzeniu tożsamości. Nikt (także urząd) nie zna Twojego hasła i nie może go podać.</p></details>' +
          '<p class="s2-note">' + ic('info', 16) + '<span>Kroki są ogólne. Dokładny przebieg zależy od prawdziwej usługi.</span></p></section>' +
      '</div>');
  };

  A.ext.screens.aktualizacje = () => {
    const ai = A.chat && A.chat.ai;
    const mods = [['Centrum spraw', 'działa lokalnie'], ['Załatw za mnie (10 spraw)', 'działa lokalnie, symulacja'], ['Skrzynka dokumentów', 'działa lokalnie, OCR symulowany'], ['Kalendarz', 'działa lokalnie'],
      ['Płatności', 'symulacja, bez banku'], ['Rodzina', 'działa lokalnie, dane fikcyjne'], ['Portfel EU', 'koncepcja demonstracyjna'], ['Model AI', ai ? ai.statusText() : 'niepodłączony']];
    return A.screen('aktualizacje',
      '<div class="pad stack"><h1>Centrum aktualizacji</h1>' +
        '<dl class="s2-sum"><div><dt>Wersja prototypu</dt><dd><b>' + WERSJA + '</b> ' + U.pill('najnowsza w tym buildzie', 'ok') + '</dd></div><div><dt>Data w prototypie</dt><dd>' + esc(A.demo.label) + '</dd></div><div><dt>Dane</dt><dd>Fikcyjne, zapisane tylko w tej przeglądarce</dd></div></dl>' +
        '<section aria-labelledby="up-n"><h2 id="up-n">Co nowego w wersji 2.0</h2><ul class="ticks">' +
          ['Centrum spraw: „Wymaga Twojej uwagi” z kolejnością według skutków i terminu, szybkie działania, sprawy z postępem.', 'Załatw za mnie: 10 spraw krok po kroku, z wersjami roboczymi i walidacją.',
            'Skrzynka dokumentów i kalendarz obywatela.', 'Centrum bezpieczeństwa, Rodzina i koncepcja Portfela EU.', 'Spinka: tryb demonstracyjny ze źródłami i dziewięć nazwanych stanów.', 'Tryb wysokiego kontrastu i tryb uproszczony.']
            .map((x) => '<li>' + ic('check', 20) + '<span>' + esc(x) + '</span></li>').join('') + '</ul></section>' +
        '<section aria-labelledby="up-s"><h2 id="up-s">Stan modułów tego prototypu</h2><p class="sub">To nie jest stan prawdziwych usług publicznych: prototyp ich nie sprawdza.</p>' +
          '<dl class="s2-sum">' + mods.map((m) => '<div><dt>' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd></div>').join('') + '</dl></section>' +
        '<section aria-labelledby="up-c"><h2 id="up-c">Certyfikaty i wymagane aktualizacje</h2>' +
          '<p>Aplikacje, które pokazują dokumenty, co jakiś czas wymagają aktualizacji, np. gdy zmieniają się certyfikaty bezpieczeństwa używane do potwierdzania ich autentyczności. Wtedy starsza wersja może przestać pokazywać dokumenty, dopóki jej nie zaktualizujesz.</p>' +
          '<p class="s2-note">' + ic('info', 16) + '<span>Ten prototyp nie sprawdza i nie pokazuje stanu prawdziwych certyfikatów. Prawdziwa aplikacja poinformowałaby o wymaganej aktualizacji w sklepie z aplikacjami i w samej aplikacji, nigdy SMS-em z linkiem.</span></p></section>' +
      '</div>');
  };

  A.ext.acts['sec-ack'] = (t) => { A.store.update((s) => { s.ack[t.dataset.id] = true; s.read['n-sesja'] = true; }); A.toast('Zapisano: to Twoje urządzenie. Ostrzeżenie zniknęło.', 'ok'); A.render(); };
  A.ext.acts['sec-end'] = (t) => {
    const x = S.sessions.find((y) => y.id === t.dataset.id);
    if (!x) return;
    A.confirm({ title: 'Zakończyć sesję: ' + x.device + ', ' + x.where + '?', items: ['To urządzenie zostanie wylogowane (symulacja).', 'Żeby znów z niego korzystać, trzeba będzie potwierdzić tożsamość.', 'Ta sesja na tym telefonie zostaje.'], ok: 'Zakończ sesję', opener: t })
      .then((yes) => { if (!yes) return; A.store.update((s) => { s.ended[x.id] = true; s.read['n-sesja'] = true; }); A.toast('Sesja zakończona (symulacja).', 'ok'); A.render(); });
  };
  A.ext.acts['sec-end-all'] = (t) => {
    const others = S.sessions.filter((x) => !x.current && !st().ended[x.id]);
    if (!others.length) { A.toast('Nie ma innych aktywnych sesji.'); return; }
    A.confirm({ title: 'Zakończyć wszystkie inne sesje?', items: others.map((x) => x.device + ', ' + x.where + ' zostanie wylogowane (symulacja).').concat(['Ta sesja na tym telefonie zostaje.']), ok: 'Zakończ ' + others.length, opener: t })
      .then((yes) => { if (!yes) return; A.store.update((s) => { others.forEach((x) => { s.ended[x.id] = true; }); s.read['n-sesja'] = true; }); A.toast('Zakończono inne sesje (symulacja).', 'ok'); A.render(); });
  };
  A.ext.deep.bezpieczenstwo = () => A.nav('bezpieczenstwo');
  A.ext.deep.aktualizacje = () => A.nav('aktualizacje');
  A.ext.search.push(() => [{ group: 'Bezpieczeństwo', title: 'Centrum bezpieczeństwa', sub: 'Sesje, historia dostępu, zgody', icon: 'shieldCheck', attrs: 'data-go="bezpieczenstwo"', keys: 'sesja logowanie haslo urzadzenie' },
    { group: 'Bezpieczeństwo', title: 'Centrum aktualizacji', sub: 'Wersja ' + WERSJA + ', certyfikaty', icon: 'refresh', attrs: 'data-go="aktualizacje"', keys: 'aktualizacja certyfikat wersja' }]);
})(window.APP);
