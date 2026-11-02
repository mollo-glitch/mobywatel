// Zrzuty prawdziwych ekranów aplikacji do sekcji „Demonstracja” i „Twoje dane” (strona/src/obrazy/*.webp), z działającego buildu.
// Nie zmienia aplikacji: otwiera ją jak użytkownik, telefon 390 px, DPR 2, ograniczony ruch (stany końcowe, bez klatek pośrednich).
//   node strona/narzedzia/zrzuty-aplikacji.js http://127.0.0.1:8450/   (adres, pod którym działa aplikacja/dist)
// Wymaga Playwright z Chromium i Pythona z Pillow (zapis WebP).
const { chromium } = require('playwright'); const { execFileSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const URL = process.argv[2] || 'http://127.0.0.1:8450/';
const OUT = path.join(__dirname, '..', 'src', 'obrazy'); fs.mkdirSync(OUT, { recursive: true });
const W = 390, H = 760;
const zapisz = (png, nazwa) => execFileSync('python3', ['-I', '-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], "WEBP", quality=82, method=6)', png, path.join(OUT, nazwa + '.webp')]);

(async () => {
  const b = await chromium.launch();
  const nowy = async () => { const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.goto(URL); await p.waitForSelector('#entry:not([hidden])', { timeout: 20000 }); await p.tap('[data-act=entry-demo]'); await p.waitForTimeout(300); await p.tap('[data-act=enter]'); await p.waitForTimeout(1200); return { ctx, p }; };
  const tmp = path.join(require('os').tmpdir(), 'zrzut-aplikacji.png');

  // 1. Pismo z urzędu: okno sprawy z odpowiedzią, czego dotyczy i do kiedy.
  { const { ctx, p } = await nowy(); await p.locator('[data-ec="1"]').tap(); await p.waitForTimeout(500);
    await p.locator('.ec-slide.on button, .ec-slide.on a', { hasText: 'Otwórz' }).first().tap(); await p.waitForTimeout(900);
    await p.screenshot({ path: tmp }); zapisz(tmp, 'pismo'); await ctx.close(); }
  // 2. Wybór ze skutkami: „Co chcesz zrobić?” w sprawie OC.
  { const { ctx, p } = await nowy(); await p.locator('button', { hasText: 'Zobacz, co zrobić' }).first().tap(); await p.waitForTimeout(700);
    await p.locator('#envd button', { hasText: 'Sprawdź, co zrobić' }).tap(); await p.waitForTimeout(1500);
    await p.locator('.chat-log button', { hasText: 'Co mogę zrobić?' }).last().tap(); await p.waitForTimeout(1800);
    await p.evaluate(() => { const k = [...document.querySelectorAll('.chat-log .qcard')].pop(); if (k) k.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(400);
    await p.screenshot({ path: tmp }); zapisz(tmp, 'wybor'); await ctx.close(); }
  // 3. Przypomnienie bez wysyłania: potwierdzenie z „Nic nie zostanie wysłane”.
  { const { ctx, p } = await nowy(); await p.locator('button', { hasText: 'Zobacz, co zrobić' }).first().tap(); await p.waitForTimeout(700);
    await p.locator('#envd button', { hasText: 'Przypomnij 2 dni przed końcem polisy' }).tap(); await p.waitForTimeout(900);
    await p.screenshot({ path: tmp }); zapisz(tmp, 'przypomnienie'); await ctx.close(); }
  // 4. Profil, część „O prototypie”: co Spinka robi i czego nie robi.
  { const { ctx, p } = await nowy(); await p.tap('.tabbar [data-tab=more]'); await p.waitForTimeout(700);
    await p.evaluate(() => { const h = document.getElementById('me-o'); const sc = document.querySelector('#main > .screen'); sc.scrollTop = h.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 16; }); await p.waitForTimeout(400);
    await p.screenshot({ path: tmp }); zapisz(tmp, 'profil-o-prototypie'); await ctx.close(); }
  // 5. Profil, „Twoje dane”: asystent AI i podgląd danych, które trafiłyby do modelu (generowany w aplikacji, bez serwera).
  { const { ctx, p } = await nowy(); await p.tap('.tabbar [data-tab=more]'); await p.waitForTimeout(700);
    await p.evaluate(() => { const d = document.querySelector('.me-preview'); d.open = true; const h = document.getElementById('me-ai'); const sc = document.querySelector('#main > .screen'); sc.scrollTop = h.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 24; }); await p.waitForTimeout(400);
    await p.screenshot({ path: tmp }); zapisz(tmp, 'profil-dane-dla-ai'); await ctx.close(); }
  await b.close();
  for (const f of fs.readdirSync(OUT)) console.log(f, (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' KB');
})();
