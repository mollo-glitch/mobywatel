/*
 * WARIANT DO OCENY (nie w głównej aplikacji): postać Spinki zamiast znaku z odznakami stanu.
 * Budowany tylko poleceniem `node build.mjs --wariant-postaci` do dist/wariant-postaci.html. Główny dist/index.html
 * ma nadal znak (src/icons.js, A.postac) bez zmian.
 *
 * Postać to przednia kartka znaku z zagiętym rogiem i czerwoną spinką, bez twarzy. Stan wynika z tego samego
 * moodOf() co w znaku (src/assistant.js), więc poza zawsze odpowiada prawdziwemu stanowi interfejsu:
 *   słucha     — ktoś pisze w polu: spinka się unosi, linie są puste (kartka czeka na treść);
 *   wyjaśnia   — pojawiła się odpowiedź: linie wypisują się tuszem;
 *   ostrzega   — podsumowanie przed zmianą, błąd albo brak danych: zagięty róg robi się bursztynowy, środkowa linia
 *                jest przerywana (luka w danych), kartka lekko się cofa;
 *   krok       — wybór w scenariuszu: środkowa linia wychodzi z kartki strzałką;
 *   gotowe     — wykonane (w demonstracji): ptaszek, spinka się zatrzaskuje.
 * Ruch: każda zmiana stanu raz, 220–400 ms, bez pętli. Przy ograniczonym ruchu stan zmienia się od razu.
 */
(function (A) {
  'use strict';
  const STYLE = '' +
    '.postac-k { overflow: visible; }' +
    '.postac-k .k-cialo { transform-box: view-box; transform-origin: 37px 74px; transition: transform .3s cubic-bezier(.2,.8,.2,1); }' +
    '.postac-k .k-klips { transform-box: view-box; transform-origin: 27px 28px; transform: rotate(-8deg); transition: transform .25s cubic-bezier(.2,.8,.2,1); }' +
    '.postac-k .k-rog { transition: fill .25s ease; }' +
    '.postac-k .k-linia { stroke: var(--muted); transition: stroke .2s ease, opacity .2s ease; }' +
    '.postac-k .k-strzalka, .postac-k .k-ptaszek, .postac-k .k-luka { opacity: 0; }' +
    '.postac-k[data-state="slucha"] .k-klips { transform: translateY(-3px) rotate(-16deg); }' +
    '.postac-k[data-state="slucha"] .k-linia { opacity: .35; }' +
    '.postac-k[data-state="wyjasnia"] .k-linia { stroke: var(--ink); stroke-dasharray: 1; animation: k-pisz .4s ease-out 1 both; }' +
    '.postac-k[data-state="wyjasnia"] .k-linia-2 { animation-delay: .08s; } .postac-k[data-state="wyjasnia"] .k-linia-3 { animation-delay: .16s; }' +
    '.postac-k[data-state="ostrzega"] .k-rog { fill: var(--warn-mark); }' +
    '.postac-k[data-state="ostrzega"] .k-linia-2 { opacity: 0; }' +
    '.postac-k[data-state="ostrzega"] .k-luka { opacity: 1; }' +
    '.postac-k[data-state="ostrzega"] .k-cialo { transform: rotate(-4deg); }' +
    '.postac-k[data-state="krok"] .k-linia-2 { opacity: 0; }' +
    '.postac-k[data-state="krok"] .k-strzalka { opacity: 1; stroke-dasharray: 1; animation: k-pisz .35s cubic-bezier(.2,.8,.2,1) 1 both; }' +
    '.postac-k[data-state="krok"] .k-cialo { transform: rotate(4deg); }' +
    '.postac-k[data-state="gotowe"] .k-linia { opacity: 0; }' +
    '.postac-k[data-state="gotowe"] .k-ptaszek { opacity: 1; stroke-dasharray: 1; animation: k-pisz .35s cubic-bezier(.2,.8,.2,1) 1 both; }' +
    '.postac-k[data-state="gotowe"] .k-klips { animation: k-zatrzask .3s ease-out 1; }' +
    '@keyframes k-pisz { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }' +
    '@keyframes k-zatrzask { 0% { transform: translateY(-4px) rotate(-22deg); } 100% { transform: rotate(-8deg); } }' +
    '@media (prefers-reduced-motion: reduce) { .postac-k *, .postac-k { transition: none !important; animation: none !important; } }' +
    '.reduce-motion .postac-k, .reduce-motion .postac-k * { transition: none !important; animation: none !important; }';
  const st = document.createElement('style');
  st.textContent = STYLE;
  document.head.appendChild(st);

  A.postac = function (size, state, live) {
    return '<svg class="postac postac-k" viewBox="0 0 80 80" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false" data-state="' + (state || '') + '"' + (live ? ' data-live=""' : '') + '>' +
      '<g class="k-cialo">' +
        '<path fill="#FFFFFF" stroke="#4F586C" stroke-width="3.4" stroke-linejoin="round" d="M19 16H47L58 27V71a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3Z"/>' +
        '<path class="k-rog" fill="#E3E8F0" stroke="#4F586C" stroke-width="3.4" stroke-linejoin="round" d="M47 16V24a3 3 0 0 0 3 3H58"/>' +
        '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
          '<path class="k-linia k-linia-1" stroke-width="3.4" pathLength="1" d="M24 40h26"/>' +
          '<path class="k-linia k-linia-2" stroke-width="3.4" pathLength="1" d="M24 48h26"/>' +
          '<path class="k-linia k-linia-3" stroke-width="3.4" pathLength="1" d="M24 56h17"/>' +
          '<path class="k-luka" stroke="#8F5200" stroke-width="3.4" stroke-dasharray="4 4" d="M24 48h26"/>' +
          '<path class="k-strzalka" stroke="#131A2A" stroke-width="3.8" pathLength="1" d="M24 48H72M65 41l7 7-7 7"/>' +
          '<path class="k-ptaszek" stroke="#1B6E3C" stroke-width="4.4" pathLength="1" d="M27 47l8 8 15-18"/>' +
        '</g>' +
      '</g>' +
      '<g class="k-klips"><rect fill="#C8102E" x="21" y="3" width="12" height="27" rx="6"/><rect fill="#FFFFFF" x="25.25" y="8.5" width="3.5" height="15" rx="1.75"/></g>' +
    '</svg>';
  };
})(window.APP);
