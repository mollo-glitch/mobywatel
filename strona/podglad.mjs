// Lokalny podgląd public/ z obsługą żądań zakresowych (Range), których potrzebuje przewijanie wideo; bez zależności.
//   node podglad.mjs [port, domyślnie 8400] [katalog, domyślnie public]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname), 'public'));
const PORT = +(process.argv[2] || 8400);
const TYPY = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let p = path.join(ROOT, path.normalize(url));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    if (!url.endsWith('/')) { res.writeHead(301, { Location: url + '/' }); return res.end(); }
    p = path.join(p, 'index.html');
  }
  if (!fs.existsSync(p)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Nie ma takiej strony.'); }
  const size = fs.statSync(p).size; const typ = TYPY[path.extname(p)] || 'application/octet-stream';
  const zakres = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (zakres) {
    let a = zakres[1] === '' ? size - +zakres[2] : +zakres[1]; let b = zakres[1] === '' || zakres[2] === '' ? size - 1 : +zakres[2];
    if (a > b || b >= size) { res.writeHead(416, { 'Content-Range': 'bytes */' + size }); return res.end(); }
    res.writeHead(206, { 'Content-Type': typ, 'Content-Length': b - a + 1, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Accept-Ranges': 'bytes' });
    return req.method === 'HEAD' ? res.end() : fs.createReadStream(p, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': typ, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
  req.method === 'HEAD' ? res.end() : fs.createReadStream(p).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log('Podgląd: http://127.0.0.1:' + PORT + '/  (katalog ' + ROOT + ')'));
