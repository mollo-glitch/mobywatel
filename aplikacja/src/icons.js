/* Ikony liniowe 24×24, rysowane kolorem tekstu. */
(function (A) {
  'use strict';
  const P = {
    home: 'M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z',
    docs: 'M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2zM9 8.5h6M9 12h6M9 15.5h3.5',
    chat: 'M4 6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6v7.5a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4.2A2 2 0 0 1 4 13.8zM8.5 10h.01M12 10h.01M15.5 10h.01',
    cases: 'M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2zM8.5 13.5l2 2 4-4',
    more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
    mic: 'M12 3.5a3 3 0 0 1 3 3v5.5a3 3 0 0 1-6 0V6.5a3 3 0 0 1 3-3zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6',
    send: 'M12 19V5.5M5.75 11.25 12 5l6.25 6.25',
    mail: 'M3.5 6.5h17v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1zM3.75 7 12 13.25 20.25 7',
    back: 'M14.5 5.5 8 12l6.5 6.5',
    chevronLeft: 'M14.5 5.5 8 12l6.5 6.5',
    chevronRight: 'M9.5 5.5 16 12l-6.5 6.5',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    shield: 'M12 3.25l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5v-5.5z',
    shieldCheck: 'M12 3.25l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5v-5.5zM8.75 12l2.25 2.25 4.25-4.5',
    alert: 'M12 4 21 19.5H3zM12 10v4.25M12 17h.01',
    clock: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 7.5V12l3 2',
    car: 'M4 15.5v-3.2L6.2 7.5A1.6 1.6 0 0 1 7.7 6.5h8.6a1.6 1.6 0 0 1 1.5 1l2.2 4.8v3.2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4.5 12h15M7 16.5v2M17 16.5v2M7.25 14h1.5M15.25 14h1.5',
    id: 'M3.5 5.5h17a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM8.5 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM5.25 16c.6-1.3 1.8-2 3.25-2s2.65.7 3.25 2M14.5 10h4M14.5 13h3',
    steering: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 9.75a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5zM3.7 11.3l6.1.5M14.2 11.8l6.1-.5M12 14.25v6.1',
    wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5v10A2.5 2.5 0 0 0 6.5 20h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-13A2.5 2.5 0 0 1 4 7.5zM16.5 14.5h.01',
    card: 'M3 6.5h18v11H3zM3 10h18M6.5 14.5h4',
    family: 'M8 8a2.25 2.25 0 1 0 0-4.5A2.25 2.25 0 0 0 8 8zM16.5 8a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5zM4 20v-5.5A3.5 3.5 0 0 1 7.5 11h1a3.5 3.5 0 0 1 3.5 3.5V20M12.5 20v-4a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v4',
    passport: 'M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6zM12 7.75a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5zM8.75 11h6.5M12 7.75c-1.1 1.6-1.1 4.9 0 6.5M12 7.75c1.1 1.6 1.1 4.9 0 6.5M9.5 17.5h5',
    health: 'M12 20s-7.5-4.5-7.5-10A4.25 4.25 0 0 1 12 7.2 4.25 4.25 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10zM12 10.5v4.5M9.75 12.75h4.5',
    letter: 'M5.5 3.5h8.5l4.5 4.5v12a.5.5 0 0 1-.5.5h-12.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5zM13.75 3.75V8.25h4.5M8.5 12.5h7M8.5 16h4.5',
    info: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 11v5M12 8h.01',
    x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
    list: 'M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01',
    fan: 'M9 4.5h6a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1zM4.5 7l-1 10M19.5 7l1 10',
    copy: 'M9 9h10.5v11H9zM15.5 9V5a.5.5 0 0 0-.5-.5H5a.5.5 0 0 0-.5.5v10.5a.5.5 0 0 0 .5.5h4',
    eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5z',
    eyeOff: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5zM4 4l16 16',
    lock: 'M6 10.5h12v9.5H6zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3',
    phone: 'M6.5 3.5h3l1.5 4-2 1.25a10 10 0 0 0 6.25 6.25L16.5 13l4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z',
    undo: 'M9 14 4.5 9.5 9 5M4.5 9.5H15a5 5 0 0 1 0 10h-3',
    calendar: 'M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5v4M15.5 3.5v4',
    speaker: 'M4.5 9.5H8l4.5-4v13L8 14.5H4.5zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
    stop: 'M7 7h10v10H7z',
    // Znak asystenta: dymek rozmowy (jak „chat”) ze strzałką w środku, czyli rozmowa, która prowadzi do rozwiązania.
    assistant: 'M4 6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6v7.5a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4.2A2 2 0 0 1 4 13.8zM8.25 9.75h7M12.75 7.25l2.5 2.5-2.5 2.5',
    sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
    plus: 'M12 5v14M5 12h14',
    arrowRight: 'M5 12h14M13 6l6 6-6 6',
    photo: 'M4 7.5h3l1.5-2h7l1.5 2h3v11H4zM12 10a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
    building: 'M3.5 20.5h17M5 20.5v-10M19 20.5v-10M9.5 20.5v-10M14.5 20.5v-10M3.5 9 12 4l8.5 5z',
    bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2 2 0 0 0 4 0',
    user: 'M12 4a3.75 3.75 0 1 1 0 7.5A3.75 3.75 0 0 1 12 4zM4.5 20c.9-3.4 3.9-5.5 7.5-5.5s6.6 2.1 7.5 5.5',
    paperclip: 'M19 11.5l-7.2 7.2a4.5 4.5 0 0 1-6.4-6.4l7.5-7.5a3 3 0 0 1 4.2 4.2l-7.4 7.4a1.5 1.5 0 0 1-2.1-2.1l6.7-6.7',
    hand: 'M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11.5V5a1.5 1.5 0 0 1 3 0v6.5M14 11.5V7a1.5 1.5 0 0 1 3 0v7.5a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.6-2.2L3.6 15.6a1.5 1.5 0 0 1 2.2-2l2.2 2',
    // Spinka 2.0: wyszukiwanie, płatności, rodzina, firma, UE, import, urządzenia, klucz, odświeżanie, edycja, moduły.
    search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.25 15.25 20 20',
    coin: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM14.75 9.25c-.5-.9-1.5-1.5-2.75-1.5-1.6 0-2.75.85-2.75 2s1.1 1.6 2.75 2 2.75.95 2.75 2.1-1.15 2.15-2.75 2.15c-1.3 0-2.35-.65-2.8-1.6M12 6v1.75M12 16v2',
    baby: 'M12 4.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM7 20v-3.5a5 5 0 0 1 10 0V20M10.25 7.75h.01M13.75 7.75h.01',
    briefcase: 'M4 8h16v11H4zM9 8V5.5h6V8M4 12.5h16M11 12.5v2h2v-2',
    globe: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM3.5 12h17M12 3.5c2.3 2.4 3.5 5.3 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.3-3.5-8.5s1.2-6.1 3.5-8.5z',
    upload: 'M12 15.5V4.5M7.5 9 12 4.5 16.5 9M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15',
    scan: 'M4 8.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3M15.5 4h3A1.5 1.5 0 0 1 20 5.5v3M20 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3M8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3M7.5 9.5h9M7.5 12h9M7.5 14.5h5.5',
    device: 'M7.5 3.5h9a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1.5-1.5zM11 17.5h2',
    key: 'M8.5 10.5a4 4 0 1 1 5 3.9L13.5 15h-2v2h-2v2H6.5v-3l5.1-5.1M8.5 9.5h.01',
    refresh: 'M19.5 12a7.5 7.5 0 0 1-13 5.1M4.5 12a7.5 7.5 0 0 1 13-5.1M17.5 3.5v3.4h-3.4M6.5 20.5v-3.4h3.4',
    edit: 'M14.5 5.5l4 4L9 19H5v-4zM12.5 7.5l4 4',
    grid: 'M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z',
    filter: 'M4 6h16M7 12h10M10 18h4',
    flag: 'M5.5 21V4M5.5 4.5h11l-2 3.5 2 3.5h-11',
    sparkle: 'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1-5.1-1.9 5.1-1.9zM18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
    trash: 'M5 7h14M9.5 7V4.5h5V7M7 7l.8 12.5h8.4L17 7M10.5 11v5M13.5 11v5'
  };

  /*
   * Jeden styl ikon: linia o stałej grubości 1,85 px niezależnie od rozmiaru (vector-effect), zaokrąglone końce.
   * Rozmiary: 20 (w tekście i przyciskach), 24 (standard, kafelki w kartach), 26 (dolny pasek), 32 (wyróżnione kafelki).
   */
  A.icon = function (name, size, extra) {
    const s = size || 24;
    const d = P[name] || P.info;
    return '<svg class="ic' + (extra ? ' ' + extra : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '" vector-effect="non-scaling-stroke"/></svg>';
  };

  /*
   * Dolny pasek: ta sama ikona liniowa, pod nią kształt, który po wyborze zakładki dostaje lekkie wypełnienie
   * (bez animacji). Grubość linii się nie zmienia.
   */
  const FILL = {
    home: P.home,
    docs: 'M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z',
    chat: 'M4 6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6v7.5a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4.2A2 2 0 0 1 4 13.8z',
    assistant: 'M4 6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6v7.5a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4.2A2 2 0 0 1 4 13.8z',
    cases: 'M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z',
    user: P.user,
    grid: P.grid
  };
  A.tabIcon = function (name) {
    return A.icon(name, 26).replace('<path ', '<path class="ic-fill" d="' + FILL[name] + '"/><path ');
  };

  /*
   * Godło RP jako znak aplikacji. Kształty pochodzą z pliku src/assets/godlo-zrodlo.svg;
   * build.mjs wstawia je raz do strony jako symbole: 'godlo' (całość), 'godlo-orzel' i 'godlo-korona'.
   */
  A.godlo = function (symbol, cls) {
    return '<svg class="godlo' + (cls ? ' ' + cls : '') + '" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><use href="#' + (symbol || 'godlo') + '"/></svg>';
  };

  // Zegar z osobną wskazówką minutową (.due-hand), żeby mogła wykonać jeden ruch po dotknięciu terminu.
  // Kształt jak ikona 'clock'.
  A.clock = function (size) {
    const s = size || 24;
    const vs = ' vector-effect="non-scaling-stroke"';
    return '<svg class="ic due-clock" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z"' + vs + '/><path class="due-hand" d="M12 12V7.5"' + vs + '/><path d="M12 12l3 2"' + vs + '/></svg>';
  };

  /*
   * Ilustracja auta z boku do karty OC: ta sama kreska co ikony (1,85 px, zaokrąglona), kształt hatchbacka bez marki.
   */
  A.carSide = function (w) {
    const W = w || 56;
    const vs = ' vector-effect="non-scaling-stroke"';
    return '<svg class="ic car-side" width="' + W + '" height="' + Math.round(W * 28 / 48) + '" viewBox="0 0 48 28" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M8.2 21H5a1 1 0 0 1-1-1v-3.5c0-1 .3-2 .8-2.9l2.8-4.2A3 3 0 0 1 10.2 8H20a2 2 0 0 1 1.3.5l6.2 4.1 12.6 1.4a3.4 3.4 0 0 1 3 2.7l.4 2.3v1a1 1 0 0 1-1 1h-3.7M15.8 21h15.4"' + vs + '/>' +
      '<path d="M7.9 12.6l1.8-2.8h5.8v2.8zM17.3 9.8h3.3l4.2 2.8h-7.5z"' + vs + '/>' +
      '<path d="M15.8 21a3.8 3.8 0 1 1-7.6 0 3.8 3.8 0 0 1 7.6 0zM38.8 21a3.8 3.8 0 1 1-7.6 0 3.8 3.8 0 0 1 7.6 0z"' + vs + '/>' +
      '<path class="car-ground" d="M2 25.6h44"' + vs + '/></svg>';
  };

  /*
   * Znak asystenta (nazwa w src/marka.js): dwie kartki sprawy spięte czerwoną spinką, która wystaje nad krawędź.
   * Czerwona spinka jest znakiem rozpoznawczym, widocznym w każdym stanie i w małym rozmiarze (34 px). Znak nie ma twarzy:
   * spokojny, „urzędowy” charakter i żadnego podobieństwa do maskotek (np. spinacza z oczami z pakietu biurowego).
   * Stan (data-state) pokazują ruch spinki i kartki oraz jedna odznaka zawsze w prawym dolnym rogu:
   *   „slucha”   spinka lekko się uchyla (gotowa przyjąć sprawę), czerwona odznaka z falami (pulsują 3 razy),
   *   „wyjasnia” linie na kartce się wypisują, odznaka „i”,
   *   „ostrzega” bursztynowa odznaka „!” z ciemnym obrysem,
   *   „krok”     przednia kartka przesuwa się w prawo, odznaka ze strzałką,
   *   „gotowe”   spinka się zatrzaskuje, zielona odznaka z ptaszkiem.
   * Zawsze ozdoba (aria-hidden): znaczenie niesie tekst obok. Ruch w styles.css (.postac); przy ograniczonym ruchu
   * stany zmieniają się od razu. Nazwy klas i funkcji są neutralne, żeby zmiana nazwy asystenta ich nie dotyczyła.
   */
  A.postac = function (size, state, live) {
    const S = size || 40;
    return '<svg class="postac" data-state="' + (state || 'slucha') + '"' + (live ? ' data-live' : '') + ' width="' + S + '" height="' + S + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      '<rect class="postac-tyl" x="19" y="9" width="34" height="42" rx="5"/>' +
      '<g class="postac-przod">' +
        '<rect class="postac-kartka" x="10" y="15" width="34" height="43" rx="5"/>' +
        '<path class="postac-linie" d="M17.5 33.5h19M17.5 41h19M17.5 48.5h11"/>' +
      '</g>' +
      '<g class="postac-spinka">' +
        '<rect class="postac-spinka-ksztalt" x="16.5" y="2.5" width="12" height="25" rx="6"/>' +
        '<rect class="postac-spinka-szczelina" x="20.75" y="7.5" width="3.5" height="14" rx="1.75"/>' +
      '</g>' +
      '<g class="postac-odznaka">' +
        '<circle class="postac-dot" cx="50.5" cy="50.5" r="11"/>' +
        '<g class="postac-b postac-b-slucha"><circle cx="46.6" cy="50.5" r="1.7"/><path d="M49.6 47.4a4.4 4.4 0 0 1 0 6.2M52.4 44.7a8.2 8.2 0 0 1 0 11.6"/></g>' +
        '<g class="postac-b postac-b-wyjasnia"><circle cx="50.5" cy="45.4" r="1.75"/><path d="M50.5 49.4v6.6"/></g>' +
        '<g class="postac-b postac-b-ostrzega"><path d="M50.5 44.6v7.2M50.5 56.1v.2"/></g>' +
        '<g class="postac-b postac-b-krok"><path d="M44.8 50.5h11M51.2 45.9l4.6 4.6-4.6 4.6"/></g>' +
        '<g class="postac-b postac-b-gotowe"><path d="M45.2 50.9l3.7 3.7 6.9-7.6"/></g>' +
      '</g>' +
    '</svg>';
  };

  // Znak albo zwykła ikona, gdy znak jest wyłączony w src/marka.js (postac: false).
  A.znak = function (size, state, live, ikona, ikonaRozmiar) {
    return A.marka && A.marka.postac === false ? A.icon(ikona || 'assistant', ikonaRozmiar || 24) : A.postac(size, state, live);
  };

  A.esc = function (s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  A.node = function (html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
})(window.APP);
