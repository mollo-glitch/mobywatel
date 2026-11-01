// Składa prototyp w jeden plik HTML: dist/index.html (samodzielny) i dist/artifact.html (treść strony bez szkieletu).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(root, 'src', f), 'utf8');

const scripts = ['marka.js', 'data.js', 'icons.js', 'carousel.js', 'assistant.js', 'app.js'];

// Ikony w statycznym HTML wstawiamy tą samą funkcją, której używa aplikacja.
const sandbox = { window: { APP: {} } };
vm.createContext(sandbox);
vm.runInContext(src('marka.js'), sandbox);
vm.runInContext(src('icons.js'), sandbox);
// Nazwa asystenta w statycznym HTML: znaczniki <!--marka:imie--> itd. dostają formy z src/marka.js.
const marka = sandbox.window.APP.marka || { imie: 'Asystent' };
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
const js = '<script>\n' + scripts.map((f) => `/* ${f} */\n` + src(f)).join('\n') + '</script>';

const headOut = head.replace('<!--STYLE-->', style).trim();
const bodyOut = body.replace('<!--SCRIPTS-->', js).trim();

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'artifact.html'), headOut + '\n' + bodyOut + '\n');
writeFileSync(
  join(root, 'dist', 'index.html'),
  '<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    headOut + '\n</head>\n<body>\n' + bodyOut + '\n</body>\n</html>\n'
);
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log('dist/index.html', kb(readFileSync(join(root, 'dist', 'index.html'), 'utf8')));
