/*
 * Kontekst dla modelu AI z ograniczonego, fikcyjnego zestawu rekordów (server/dane-demo.mjs, generowany przez build.mjs
 * z src/data.js) i krótkiego stanu demonstracji z przeglądarki. Ten sam plik działa na serwerze i w przeglądarce
 * (build.mjs wkleja go do aplikacji bez słów „export”), więc podgląd w Profilu pokazuje dokładnie to, co wysyła serwer.
 *
 * Z przeglądarki serwer przyjmuje tylko:
 *   bez:           identyfikatory pozycji „Do załatwienia” załatwionych w demonstracji (tylko znane id),
 *   przypomnienia: { id pozycji: 'RRRR-MM-DD' } (tylko znane pozycje z terminem, data między dziś a terminem),
 *   sprawy:        [{ id, status }] sprawy z demonstracji (id z listy wzorców, status z zamkniętej listy).
 * Tytuły i opisy spraw pochodzą z serwera, nie z przeglądarki. Dowolny tekst z przeglądarki nie trafia do modelu
 * (poza pytaniem), więc endpointu nie da się użyć jako ogólnego czatu z własnymi „danymi”.
 */

export const STATUSY = ['Do dokończenia', 'Zakończona w demonstracji', 'Przypomnę jutro', 'Anulowana przed wysłaniem', 'Przerwana rozmowa'];
const SCEN = ['oc', 'pismo', 'nowyDowod', 'portfel', 'dane'];
const TYTULY = {
  pismo: 'Pismo z urzędu skarbowego',
  oc: 'Zmiana ubezpieczyciela OC',
  'nowy-dowod': 'Wniosek o nowy dowód osobisty',
  portfel: 'Zgubiony portfel'
};
const NOTA = 'To wynik demonstracji w tej aplikacji: nic nie zostało naprawdę wysłane do urzędu ani firmy.';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dzien = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const fmtIso = (s) => s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4);

function tytulSprawy(id) {
  if (TYTULY[id]) return TYTULY[id];
  if (/^dane-[a-z0-9-]{1,24}$/.test(id)) return 'Cofnięcie dostępu do danych';
  const m = id.match(/^int-(\w{1,12})$/);
  if (m && SCEN.indexOf(m[1]) >= 0) return 'Rozmowa przerwana w demonstracji';
  return null;
}

// Stan z przeglądarki → tylko pola i wartości, które serwer zna. Wszystko inne jest pomijane bez błędu.
export function stanCzysty(stan, dane) {
  const out = { bez: [], przypomnienia: {}, sprawy: [] };
  if (!stan || typeof stan !== 'object' || !dane) return out;
  const byId = {};
  dane.zrodla.forEach((z) => { byId[z.id] = z; });
  (Array.isArray(stan.bez) ? stan.bez.slice(0, 10) : []).forEach((id) => {
    if (typeof id === 'string' && /^todo:/.test(id) && byId[id] && out.bez.indexOf(id) < 0) out.bez.push(id);
  });
  const p = stan.przypomnienia && typeof stan.przypomnienia === 'object' ? stan.przypomnienia : {};
  Object.keys(p).slice(0, 5).forEach((id) => {
    const z = byId[id]; const d = p[id];
    if (!z || !z.termin || typeof d !== 'string' || !ISO.test(d)) return;
    if (dzien(d) < dzien(dane.dzis) || dzien(d) > dzien(z.termin)) return;
    out.przypomnienia[id] = d;
  });
  (Array.isArray(stan.sprawy) ? stan.sprawy.slice(0, 8) : []).forEach((s) => {
    if (!s || typeof s.id !== 'string' || typeof s.status !== 'string' || STATUSY.indexOf(s.status) < 0) return;
    const id = s.id.slice(0, 40);
    if ((byId['case:' + id] || tytulSprawy(id)) && !out.sprawy.some((x) => x.id === id)) out.sprawy.push({ id: id, status: s.status });
  });
  return out;
}

// Rekordy dla modelu: dane serwera + oczyszczony stan. Najwyżej 16 źródeł.
export function zastosujStan(dane, stan) {
  const s = stanCzysty(stan, dane);
  const zrodla = dane.zrodla
    .filter((z) => s.bez.indexOf(z.id) < 0)
    .map((z) => {
      const r = { id: z.id, rodzaj: z.rodzaj, tytul: z.tytul, fakty: z.fakty.slice() };
      const id = z.id.slice(5);
      if (z.id.indexOf('todo:') === 0 && s.przypomnienia[z.id]) r.fakty.push('Przypomnienie ustawione na ' + fmtIso(s.przypomnienia[z.id]));
      const sp = z.id.indexOf('case:') === 0 ? s.sprawy.find((x) => x.id === id) : null;
      if (sp) r.fakty = ['Status: ' + sp.status].concat(sp.status === 'Do dokończenia' ? r.fakty.filter((f) => f.indexOf('Status:') !== 0) : [NOTA]);
      return r;
    });
  s.sprawy.forEach((sp) => {
    if (dane.zrodla.some((z) => z.id === 'case:' + sp.id)) return;
    zrodla.push({ id: 'case:' + sp.id, rodzaj: 'sprawa', tytul: tytulSprawy(sp.id), fakty: ['Status: ' + sp.status, NOTA] });
  });
  return { dzis: dane.dzis, dzis_slownie: dane.dzis_slownie, zrodla: zrodla.slice(0, 16) };
}
