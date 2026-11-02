// Składa prototyp w jeden plik HTML: dist/index.html (samodzielny) i dist/artifact.html (treść strony bez szkieletu).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(root, 'src', f), 'utf8');

// --wariant-postaci: dodatkowo dist/wariant-postaci.html z postacią Spinki zamiast znaku (do oceny; główny build bez zmian).
const WARIANT = process.argv.includes('--wariant-postaci');
const scripts = ['marka.js', 'data.js', 'icons.js', 'carousel.js', 'assistant.js', 'app.js'];

// Ikony w statycznym HTML wstawiamy tą samą funkcją, której używa aplikacja.
const sandbox = { window: { APP: {} } };
vm.createContext(sandbox);
vm.runInContext(src('marka.js'), sandbox);
vm.runInContext(src('icons.js'), sandbox);
// Nazwa asystenta w statycznym HTML: znaczniki <!--marka:imie--> itd. dostają formy z src/marka.js.
const marka = sandbox.window.APP.marka || { imie: 'Asystent' };

/*
 * Rekordy dla modelu AI: ten sam zestaw fikcyjnych danych, który widać w aplikacji, z datami policzonymi od zegara
 * pokazowego (src/data.js). Serwer odpowiada wyłącznie z nich (server/dane-demo.mjs). Do aplikacji trafia ta sama
 * kopia i ten sam kod stosowania stanu (server/kontekst.mjs), więc podgląd w Profilu = to, co wysyła serwer.
 */
vm.runInContext(src('data.js'), sandbox);
const D = sandbox.window.APP;
const daneDemo = JSON.parse(JSON.stringify(D.kontekstZDanych(D.todoSeed(), D.casesSeed(), D.docs)));
if (!daneDemo.zrodla.length || !/^\d{4}-\d{2}-\d{2}$/.test(daneDemo.dzis)) throw new Error('Nie udało się zbudować rekordów dla modelu AI.');
writeFileSync(join(root, 'server', 'dane-demo.mjs'),
  '// Wygenerowane przez build.mjs z src/data.js (fikcyjne dane prototypu). Nie edytuj ręcznie: zmień src/data.js i zbuduj.\n' +
  'export default ' + JSON.stringify(daneDemo, null, 1) + ';\n');
const kontekstJs = readFileSync(join(root, 'server', 'kontekst.mjs'), 'utf8').replace(/^export /gm, '');
if (/\bimport\b|\bexport\b/.test(kontekstJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) throw new Error('server/kontekst.mjs nie może mieć importów: jest wklejany do aplikacji.');
const kontekstBundle = '(function (A) {\n' + kontekstJs + '\nA.kontekst = { stanCzysty: stanCzysty, zastosujStan: zastosujStan, STATUSY: STATUSY };\nA.kontekstSeed = ' + JSON.stringify(daneDemo) + ';\n})(window.APP);\n';
const escHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = sandbox.window.APP.icon;
const tabIcon = sandbox.window.APP.tabIcon;
const godlo = sandbox.window.APP.godlo;

/*
 * Godło: plik źródłowy src/assets/godlo-zrodlo.svg (wizerunek godła na czerwonym kwadracie, viewBox 0 0 40 40).
 * Usuwamy czerwone tło (kształt 0) i napis leżący poza ikoną (ostatni kształt), a koronę (kształty 1 i 191–196)
 * wydzielamy do osobnej warstwy na czas animacji. Pełny znak składamy z tych samych grup w oryginalnej kolejności.
 */
function godloSprite() {
  const svg = src('assets/godlo-zrodlo.svg');
  const paths = svg.match(/<path\b[^>]*\/>/g) || [];
  const defs = (svg.match(/<defs>[\s\S]*<\/defs>/) || [''])[0];
  const fill = (p) => (p.match(/fill="([^"]+)"/) || [])[1];
  const crown = new Set([1, 191, 192, 193, 194, 195, 196]);
  const last = paths.length - 1;
  if (paths.length !== 203 || fill(paths[0]) !== '#DC143C' || fill(paths[1]) !== '#F6D155' || fill(paths[last]) !== '#1D1D1D') {
    throw new Error('Nieoczekiwana struktura pliku godła: sprawdź podział na warstwy.');
  }
  const group = (from, to, pick) => paths.slice(from, to + 1).filter((_, i) => pick(from + i)).join('');
  const c1 = group(1, 1, () => true);
  const b1 = group(2, 190, (i) => !crown.has(i));
  const c2 = group(191, 196, () => true);
  const b2 = group(197, last - 1, () => true);
  return '<svg class="godlo-sprite" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;overflow:hidden">' +
    defs.replace('</defs>',
      '<g id="godlo-c1">' + c1 + '</g><g id="godlo-b1">' + b1 + '</g><g id="godlo-c2">' + c2 + '</g><g id="godlo-b2">' + b2 + '</g>' +
      '<symbol id="godlo" viewBox="0 0 40 40"><use href="#godlo-c1"/><use href="#godlo-b1"/><use href="#godlo-c2"/><use href="#godlo-b2"/></symbol>' +
      '<symbol id="godlo-orzel" viewBox="0 0 40 40"><use href="#godlo-b1"/><use href="#godlo-b2"/></symbol>' +
      '<symbol id="godlo-korona" viewBox="0 0 40 40"><use href="#godlo-c1"/><use href="#godlo-c2"/></symbol>' +
      '</defs>') +
    '</svg>';
}

let page = src('page.html')
  .replace('<!--GODLO-SPRITE-->', godloSprite())
  .replace(/<!--tab:(\w+)-->/g, (_, name) => tabIcon(name))
  .replace(/<!--ic:(\w+)-->/g, (_, name) => icon(name, 24))
  .replace(/<!--godlo:([\w-]*)-->/g, (_, symbol) => godlo(symbol))
  .replace(/<!--marka:(\w+)-->/g, (_, k) => escHtml(marka[k] || ''));
const [head, body] = page.split('<!--/HEAD-->');
const style = '<style>\n' + src('styles.css') + '</style>';
const part = (f) => (f === 'kontekst' ? '/* server/kontekst.mjs + server/dane-demo.mjs */\n' + kontekstBundle : `/* ${f} */\n` + src(f));
const withKontekst = (list) => list.reduce((acc, f) => acc.concat(f === 'data.js' ? [f, 'kontekst'] : [f]), []);
const js = '<script>\n' + withKontekst(scripts).map(part).join('\n') + '</script>';

const headOut = head.replace('<!--STYLE-->', style).trim();
const bodyOut = body.replace('<!--SCRIPTS-->', js).trim();

// Adres serwera asystenta (funkcja serwerowa dla strony statycznej): tylko z ASSISTANT_ENDPOINT przy budowaniu, tylko https.
// Bez niego build nie ma adresu i asystent mówi, że model AI nie jest podłączony. Klucz API nigdy nie trafia do buildu.
const endpoint = (process.env.ASSISTANT_ENDPOINT || '').trim();
if (endpoint && !/^https:\/\/[\w.-]+(:\d+)?(\/[\w\/-]*)?$/.test(endpoint)) throw new Error('ASSISTANT_ENDPOINT musi być adresem https bez parametrów, np. https://spinka-asystent.example.workers.dev/api/assistant');
const endpointMeta = endpoint ? '<meta name="assistant-endpoint" content="' + escHtml(endpoint) + '">\n' : '';

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'artifact.html'), headOut + '\n' + bodyOut + '\n');
writeFileSync(
  join(root, 'dist', 'index.html'),
  '<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n' + endpointMeta + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    headOut + '\n</head>\n<body>\n' + bodyOut + '\n</body>\n</html>\n'
);
if (WARIANT) {
  const jsW = '<script>\n' + withKontekst(['marka.js', 'data.js', 'icons.js', 'wariant-postaci.js', 'carousel.js', 'assistant.js', 'app.js']).map(part).join('\n') + '</script>';
  writeFileSync(join(root, 'dist', 'wariant-postaci.html'),
    '<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n' + endpointMeta + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
      headOut + '\n</head>\n<body>\n' + body.replace('<!--SCRIPTS-->', jsW).trim() + '\n</body>\n</html>\n');
  console.log('dist/wariant-postaci.html (postać Spinki zamiast znaku, do oceny)');
}
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log('dist/index.html', kb(readFileSync(join(root, 'dist', 'index.html'), 'utf8')) + (endpoint ? ' | asystent: ' + endpoint : ' | asystent: bez serwera (AI niepodłączone)'));
