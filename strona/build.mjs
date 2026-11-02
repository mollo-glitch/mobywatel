// Składa stronę projektu w katalogu public/ (statyczne pliki dla dowolnego hostingu).
//   node build.mjs [--film film-web] [--aplikacja ../aplikacja/dist/index.html]
//                  [--znak ../aplikacja/docs/znak-spinki] [--bez-filmu]
// Aplikacja trafia do public/aplikacja/index.html bajt w bajt (build 27 z poprawką animacji godła, MD5 sprawdzane niżej).
// Film: pliki z katalogu --film (wersja webowa, nie master): spinka-film-v8.mp4, spinka-film-v8-plakat.jpg, spinka-film-v8.pl.vtt.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes('--' + n);
const APLIKACJA = path.resolve(ROOT, arg('aplikacja', '../aplikacja/dist/index.html'));
const ZNAK = path.resolve(ROOT, arg('znak', '../aplikacja/docs/znak-spinki'));
const FILM = path.resolve(ROOT, arg('film', 'film-web'));
const OUT = path.join(ROOT, 'public');
const APLIKACJA_MD5 = '83d237e0c6d0e28ec90a01296f5ca5c8';
const PLIKI = { mp4: 'spinka-film-v8.mp4', plakat: 'spinka-film-v8-plakat.jpg', vtt: 'spinka-film-v8.pl.vtt' };
// Tekst z filmu dla osób, które go nie widzą: jedna plansza w linii, opis obrazu w [nawiasach]. Trafia do strony, nie do public/film.
const TEKST = 'spinka-film-v8.tekst.txt';

const stop = (m) => { console.error('BŁĄD: ' + m); process.exit(1); };
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');

// Aplikacja: tylko zweryfikowany build (runda 27 z poprawką animacji godła przy wejściu).
const app = fs.readFileSync(APLIKACJA);
if (md5(app) !== APLIKACJA_MD5) stop('aplikacja ma MD5 ' + md5(app) + ', oczekiwano ' + APLIKACJA_MD5 + ': ' + APLIKACJA);

// Film: wersja webowa; bez niej build przerywa, chyba że podano --bez-filmu (strona pokaże wtedy, że film jest niedostępny).
const jest = (k) => fs.existsSync(path.join(FILM, PLIKI[k]));
if (!jest('mp4') && !flag('bez-filmu')) stop('brak ' + path.join(FILM, PLIKI.mp4) + '. Przygotuj go: ./przygotuj-film.sh (albo zbuduj z --bez-filmu).');
if (jest('vtt') && !fs.readFileSync(path.join(FILM, PLIKI.vtt), 'utf8').replace(/^﻿/, '').startsWith('WEBVTT')) stop(PLIKI.vtt + ' nie zaczyna się od WEBVTT');

// Znak: z wyeksportowanych plików SVG (te same co w aplikacji), bez tytułu, jako ozdoba ukryta przed czytnikiem.
const znak = (stan, rozmiar) => {
  const svg = fs.readFileSync(path.join(ZNAK, 'spinka-znak-' + stan + '.svg'), 'utf8');
  return svg.replace(/<title>.*?<\/title>\n?/, '').replace(/\n/g, '')
    .replace('width="64" height="64"', 'width="' + rozmiar + '" height="' + rozmiar + '" aria-hidden="true" focusable="false"').trim();
};

let html = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
html = html.replace(/<!--znak:([\w-]+):(\d+)-->/g, (_, s, r) => znak(s, +r));
html = html.replace('<!--film:mp4-->', 'film/' + PLIKI.mp4);
html = html.replace('<!--film:poster-->', jest('plakat') ? ' poster="film/' + PLIKI.plakat + '"' : '');
html = html.replace('<!--film:preload-plakatu-->', jest('plakat') ? '<link rel="preload" href="film/' + PLIKI.plakat + '" as="image" fetchpriority="high">' : '');
html = html.replace('<!--film:track-->', jest('vtt') ? '<track kind="captions" srclang="pl" label="Polski" src="film/' + PLIKI.vtt + '" default>' : '');
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tekst = jest('mp4') && fs.existsSync(path.join(FILM, TEKST)) ? fs.readFileSync(path.join(FILM, TEKST), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean) : [];
html = html.replace('<!--film:tekst-->', tekst.length ? '<details class="tekst-filmu wejscie" style="--i:6"><summary>Tekst z filmu</summary><ol>' +
  tekst.map((l) => '<li>' + esc(l).replace(/^\[(.*?)\]\s*/, '<span class="opis-obrazu">$1</span> ') + '</li>').join('') + '</ol></details>' : '');
if (/<!--(znak|film):/.test(html)) stop('zostały niezastąpione znaczniki w src/index.html');

fs.rmSync(OUT, { recursive: true, force: true });
for (const d of ['aplikacja', 'film', 'fonty']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, 'aplikacja/index.html'), app);
fs.copyFileSync(path.join(ZNAK, 'spinka-znak-bez-odznaki.svg'), path.join(OUT, 'znak.svg'));
for (const f of fs.readdirSync(path.join(ROOT, 'src/fonty'))) fs.copyFileSync(path.join(ROOT, 'src/fonty', f), path.join(OUT, 'fonty', f));
for (const k of Object.keys(PLIKI)) if (jest(k)) fs.copyFileSync(path.join(FILM, PLIKI[k]), path.join(OUT, 'film', PLIKI[k]));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

// Sumy wszystkich plików strony.
const lista = []; const zbierz = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? zbierz(p) : lista.push(p); } };
zbierz(OUT); lista.sort();
fs.writeFileSync(path.join(OUT, 'SHA256SUMS.txt'), lista.map((p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') + '  ' + path.relative(OUT, p)).join('\n') + '\n');

const kb = (p) => (fs.statSync(p).size / 1024).toFixed(1) + ' KB';
console.log('public/index.html ' + kb(path.join(OUT, 'index.html')) + ' | aplikacja ' + APLIKACJA_MD5.slice(0, 8) + ' (bez zmian) | tekst z filmu: ' + (tekst.length ? tekst.length + ' plansz' : 'brak'));
for (const k of Object.keys(PLIKI)) console.log('film/' + PLIKI[k] + ': ' + (jest(k) ? kb(path.join(OUT, 'film', PLIKI[k])) : 'BRAK'));
