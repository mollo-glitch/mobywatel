// Wspólne narzędzia audytu: otwarcie w konfiguracji, dziennik błędów i żądań, kontrole układu w stronie.
const { chromium } = require('playwright');
const H = { 320: 568, 360: 640, 390: 844, 1280: 800 };
exports.open = async (o) => {
  const W = o.w || 390;
  const b = await chromium.launch(o.launch || {});
  const ctx = await b.newContext({ viewport: { width: W, height: o.h || H[W] || 800 }, colorScheme: o.dark ? 'dark' : 'light', reducedMotion: o.rm ? 'reduce' : 'no-preference', hasTouch: o.touch !== undefined ? o.touch : W < 500, forcedColors: o.forced ? 'active' : 'none' });
  const p = await ctx.newPage();
  const log = { konsola: [], strona: [], zadania: [], odpowiedzi: [] };
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.konsola.push(m.type() + ': ' + m.text().slice(0, 300)); });
  p.on('pageerror', (e) => log.strona.push(e.message.slice(0, 300)));
  p.on('requestfailed', (r) => log.zadania.push(r.url().slice(0, 160) + ' → ' + (r.failure() || {}).errorText));
  p.on('response', (r) => { if (r.status() >= 400) log.odpowiedzi.push(r.status() + ' ' + r.url().slice(0, 160)); });
  return { b, ctx, p, log, W };
};
exports.enter = async (p, big) => {
  await p.goto(exports.BASE + '/index.html'); await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 });
  await p.click('[data-act=entry-demo]'); await p.waitForTimeout(300); await p.click('[data-act=enter]'); await p.waitForTimeout(1100);
  if (big) { await p.click('#aa-btn'); await p.waitForTimeout(400); }
};
exports.BASE = process.env.BASE || 'http://127.0.0.1:8200';
// Kontrole w stronie: przepełnienie w bok, przycięty tekst, tekst zasłonięty innym elementem, małe cele, kontrolki bez nazwy,
// elementy z kursorem rączki, które nie są interaktywne, powtórzone identyfikatory.
exports.checks = (p) => p.evaluate(() => {
  const out = { przepelnienie: [], przyciete: [], zasloniete: [], male24: [], male44: 0, bezNazwy: [], raczkaBezAkcji: [], dupId: [] };
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) out.przepelnienie.push('dokument ' + de.scrollWidth + '>' + de.clientWidth);
  document.querySelectorAll('#main > .screen, .gate:not([hidden]), #envd:not([hidden]) .envd-body, #msgs:not([hidden]), #me-peek:not([hidden])').forEach((s) => { if (s.scrollWidth > s.clientWidth + 1) out.przepelnienie.push((s.id || s.className).toString().slice(0, 40) + ' ' + s.scrollWidth + '>' + s.clientWidth); });
  const desc = (e) => (e.id ? '#' + e.id : '') + '.' + (e.className && e.className.baseVal === undefined ? e.className : '').toString().trim().split(/\s+/).slice(0, 2).join('.') + ' „' + (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '”';
  const visRect = (el) => { let r = el.getBoundingClientRect(); let t = r.top, bo = r.bottom, l = r.left, ri = r.right;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) { const q = a.getBoundingClientRect(); t = Math.max(t, q.top); bo = Math.min(bo, q.bottom); l = Math.max(l, q.left); ri = Math.min(ri, q.right); } }
    t = Math.max(t, 0); bo = Math.min(bo, innerHeight); l = Math.max(l, 0); ri = Math.min(ri, innerWidth); return { t, b: bo, l, r: ri, w: ri - l, h: bo - t }; };
  const shown = (el) => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden],[inert]'); };
  // Tekst: elementy z własnym tekstem.
  const texts = Array.from(document.querySelectorAll('body *')).filter((e) => !['SCRIPT', 'STYLE', 'svg', 'path', 'SVG'].includes(e.tagName) && Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim()) && shown(e));
  texts.forEach((e) => {
    const cs = getComputedStyle(e);
    const v = visRect(e); if (v.w < 2 || v.h < 2) return;
    if ((cs.overflow + cs.overflowX).includes('hidden') || cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') { if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2) out.przyciete.push(desc(e) + ' ' + e.scrollWidth + 'x' + e.scrollHeight + '>' + e.clientWidth + 'x' + e.clientHeight); }
    if (e.closest('[aria-hidden="true"]') && !e.closest('.dcard, .wal')) return;
    const range = document.createRange(); const tn = Array.from(e.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim()); range.selectNodeContents(tn); const rr = Array.from(range.getClientRects()).find((q) => q.width > 2);
    if (!rr) return; const x = rr.left + Math.min(rr.width / 2, 12), y = rr.top + rr.height / 2;
    if (x < v.l || x > v.r || y < v.t || y > v.b) return;
    const top = document.elementFromPoint(x, y);
    if (top && top !== e && !e.contains(top) && !top.contains(e)) out.zasloniete.push(desc(e) + ' ← ' + desc(top));
  });
  const ctrls = Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=tab], [tabindex]:not([tabindex="-1"])')).filter(shown);
  ctrls.forEach((c) => { const r = c.getBoundingClientRect(); const v = visRect(c); if (v.w <= 0 || v.h <= 0) return;
    const tgt = c.matches('input[type=checkbox], input[type=file], input.sr-only') ? (c.closest('label') || c) : c; const q = tgt.getBoundingClientRect();
    if (Math.min(q.width, q.height) < 24 && !c.matches('.sr-only')) out.male24.push(desc(c) + ' ' + Math.round(q.width) + 'x' + Math.round(q.height));
    else if (Math.min(q.width, q.height) < 44) out.male44++;
    const name = (c.getAttribute('aria-label') || (c.getAttribute('aria-labelledby') && document.getElementById(c.getAttribute('aria-labelledby')) || {}).textContent || c.innerText || c.title || (c.labels && c.labels[0] && c.labels[0].innerText) || c.placeholder || '').trim();
    if (!name) out.bezNazwy.push(desc(c) + ' <' + c.tagName.toLowerCase() + '>'); });
  Array.from(document.querySelectorAll('body *')).filter((e) => shown(e) && getComputedStyle(e).cursor === 'pointer' && !e.closest('button, a, label, input, select, textarea, summary, [role=button], [role=tab], [tabindex], .car-stage, .dv-track, .ec-track')).slice(0, 10).forEach((e) => out.raczkaBezAkcji.push(desc(e)));
  const ids = {}; document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; }); out.dupId = Object.keys(ids).filter((k) => ids[k] > 1);
  return out;
});
// Suma przesunięć układu (CLS) od wywołania.
exports.clsStart = (p) => p.evaluate(() => { window.__cls = 0; window.__clsList = []; if (!window.__clsObs) { window.__clsObs = new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) { window.__cls += e.value; if (e.value > 0.01) window.__clsList.push(+e.value.toFixed(3) + ' ' + (e.sources || []).map((s) => s.node && (s.node.className || s.node.nodeName).toString().slice(0, 30)).join(',')); } })); window.__clsObs.observe({ type: 'layout-shift', buffered: false }); } });
exports.clsGet = (p) => p.evaluate(() => ({ cls: +(window.__cls || 0).toFixed(3), lista: window.__clsList || [] }));
exports.route = (p) => p.evaluate(() => { const v = document.querySelector('#main > .screen'); const h = v && v.querySelector('h1'); const a = document.activeElement; return { ekran: v ? v.className.replace('screen ', '') : '?', h1: h && h.textContent.trim().slice(0, 40), fokus: (a.id ? '#' + a.id : '') + (a.className || a.tagName).toString().split(' ')[0] + ':' + (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) }; });
