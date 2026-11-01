/*
 * Karuzela dokumentów po okręgu.
 * Każda karta leży na okręgu o promieniu R, którego środek jest pod wybraną kartą.
 * Karta o przesunięciu o (w krokach) ma kąt o·α: x = R·sin(o·α), y = R·(1 − cos(o·α)),
 * a obrót karty jest styczny do okręgu (na wąskim ekranie spłaszczony do łagodnego łuku).
 * Pozycja `pos` jest ciągła podczas przeciągania i zawsze kończy się na liczbie całkowitej.
 */
(function (A) {
  'use strict';

  const mod = (a, n) => ((a % n) + n) % n;
  // przesunięcie karty względem wybranej, najkrótszą drogą po okręgu: [-n/2, n/2)
  const wrap = (o, n) => mod(o + n / 2, n) - n / 2;
  let uid = 0;

  class Carousel {
    constructor(host, docs, opts) {
      this.host = host;
      this.docs = docs;
      this.n = docs.length;
      this.opts = opts || {};
      this.pos = A.state.docIndex || 0;
      this.raf = 0;
      this.moveRaf = 0;
      this.target = null; // dokąd karuzela właśnie jedzie; kolejne strzałki liczą się od celu, nie od bieżącej pozycji
      this.vel = 0;
      this.drag = null;
      this.suppressClick = false;
      this.wheelAcc = 0;
      this.wheelDone = false;
      this.lastWheel = 0;
      this.announced = -1;
      this.build();
      this.bind();
      this.layout();
      this.announced = this.index();
    }

    build() {
      const id = 'car' + (++uid);
      const ic = A.icon;
      this.host.innerHTML =
        '<div class="car" role="region" aria-roledescription="karuzela" aria-label="Twoje dokumenty">' +
          '<p class="sr-only" id="' + id + '-help">Strzałki w lewo i w prawo zmieniają dokument. Enter otwiera szczegóły wybranego dokumentu.</p>' +
          // Rola group: element z fokusem ma nazwę, którą czytnik odczyta (zwykły div nie może mieć aria-label).
          '<div class="car-stage" role="group" tabindex="0" aria-describedby="' + id + '-help" aria-label="Dokumenty">' +
            this.docs.map((d, i) => A.docCard(d, { i: i, n: this.n })).join('') +
          '</div>' +
          '<div class="car-bar">' +
            '<button type="button" class="round-btn" data-car="prev" aria-label="Poprzedni dokument">' + ic('chevronLeft') + '</button>' +
            '<div class="car-now"><span class="car-name"></span><span class="car-count"></span></div>' +
            '<button type="button" class="round-btn" data-car="next" aria-label="Następny dokument">' + ic('chevronRight') + '</button>' +
          '</div>' +
          '<div class="car-dots" aria-hidden="true">' + this.docs.map(() => '<i></i>').join('') + '</div>' +
          '<div class="car-foot">' +
            '<button type="button" class="btn secondary" data-car="open">' + ic('eye', 20) + '<span>Otwórz: <span class="car-open-name"></span></span></button>' +
          '</div>' +
        '</div>';
      this.stage = this.host.querySelector('.car-stage');
      this.cards = Array.from(this.stage.querySelectorAll('.dcard'));
      this.nameEl = this.host.querySelector('.car-name');
      this.countEl = this.host.querySelector('.car-count');
      this.openName = this.host.querySelector('.car-open-name');
      this.dots = Array.from(this.host.querySelectorAll('.car-dots i'));
    }

    bind() {
      const s = this.stage;
      this.onDown = this.onDown.bind(this);
      this.onMove = this.onMove.bind(this);
      this.onUp = this.onUp.bind(this);
      s.addEventListener('pointerdown', this.onDown);
      s.addEventListener('pointermove', this.onMove);
      s.addEventListener('pointerup', this.onUp);
      s.addEventListener('pointercancel', this.onUp);
      s.addEventListener('click', (e) => this.onClick(e));
      s.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
      s.addEventListener('keydown', (e) => this.onKey(e));
      s.addEventListener('dragstart', (e) => e.preventDefault());
      this.host.addEventListener('click', (e) => {
        const b = e.target.closest('[data-car]');
        if (!b) return;
        const a = b.dataset.car;
        if (a === 'prev') this.step(-1);
        else if (a === 'next') this.step(1);
        else if (a === 'open') this.open(this.index());
      });
      if ('ResizeObserver' in window) {
        this.ro = new ResizeObserver(() => this.layout());
        this.ro.observe(s);
      }
    }

    destroy() {
      cancelAnimationFrame(this.raf);
      cancelAnimationFrame(this.moveRaf);
      if (this.ro) this.ro.disconnect();
    }

    index() { return mod(Math.round(this.pos), this.n); }

    scale(o) { return 1 - Math.min(Math.abs(o), 2.5) * this.dS; }

    layout() {
      const W = this.stage.clientWidth || 360;
      const big = document.documentElement.classList.contains('big-text');
      const cw = Math.round(Math.min(W * (big ? 0.48 : 0.42), big ? 236 : 200));
      const ch = Math.round(cw * 1.3);
      this.cw = cw;
      this.dS = big ? 0.24 : 0.18;      // o ile mniejsza jest każda kolejna karta
      const side = cw * (1 - this.dS);
      // sąsiednia karta mieści się w całości na ekranie
      this.s = Math.max(cw * 0.62, Math.min(cw * 0.95, W / 2 - side / 2 - 8));
      this.R = cw * 3.1;                // promień okręgu
      this.alpha = Math.asin(Math.min(0.9, this.s / this.R));
      this.k = W < 520 ? 0.3 : 0.5;     // karty tylko lekko się nachylają: łuk, a nie rozłożona talia
      // napis na karcie po prawej przesuwa się w jej widoczną część, żeby nie chował się pod wybraną
      this.stage.style.setProperty('--shift', big ? 36 : 28);
      // Pokazujemy tylko tyle sąsiadów, ile mieści się w całości i da się przeczytać.
      let vis = 1;
      for (let o = 2; o <= 3; o++) {
        const x = this.R * Math.sin(Math.min(o * this.alpha, Math.PI / 2));
        if (x + cw * this.scale(o) * 0.5 <= W / 2 - 4 && o * 2 + 1 <= this.n) vis = o;
        else break;
      }
      this.vis = vis;
      this.stage.style.setProperty('--cw', cw + 'px');
      this.stage.style.setProperty('--ch', ch + 'px');
      const drop = this.R * (1 - Math.cos(this.alpha * vis));
      this.stage.style.height = Math.round(ch + Math.min(drop, ch * 0.25) + 34) + 'px';
      this.update();
    }

    update() {
      const n = this.n;
      for (let i = 0; i < n; i++) {
        const c = this.cards[i];
        const o = wrap(i - this.pos, n);
        const ao = Math.abs(o);
        const a = o * this.alpha;
        const x = this.R * Math.sin(a);
        const y = this.R * (1 - Math.cos(a));
        const rot = a * this.k;
        const sc = this.scale(o);
        let op = 1;
        if (ao > this.vis) op = Math.max(0, 1 - (ao - this.vis) * 1.8);
        c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(4) + 'rad) scale(' + sc.toFixed(3) + ')';
        c.style.opacity = op.toFixed(3);
        c.style.zIndex = String(100 - Math.round(ao * 10));
        c.style.visibility = op < 0.02 ? 'hidden' : 'visible';
        c.style.setProperty('--dim', (Math.min(ao, 1) * 0.1).toFixed(3));
        c.style.setProperty('--tx', Math.max(0, Math.min(1, o)).toFixed(3));
        const front = ao < 0.5;
        c.classList.toggle('is-front', front);
        c.setAttribute('aria-current', front ? 'true' : 'false');
      }
      const idx = this.index();
      const d = this.docs[idx];
      this.nameEl.textContent = d.name;
      this.countEl.textContent = (idx + 1) + ' z ' + n;
      this.stage.setAttribute('aria-label', 'Wybrany dokument: ' + d.name + ', ' + (idx + 1) + ' z ' + n);
      this.openName.textContent = d.name;
      this.dots.forEach((dot, i) => dot.classList.toggle('on', i === idx));
    }

    settle() {
      this.target = null;
      this.pos = mod(Math.round(this.pos), this.n);
      this.update();
      const idx = this.index();
      A.state.docIndex = idx;
      if (idx !== this.announced) {
        this.announced = idx;
        A.announce('Wybrany dokument: ' + this.docs[idx].name + ', ' + (idx + 1) + ' z ' + this.n);
      }
    }

    /*
     * Ruch do karty jak tłumiona sprężyna: łagodnie wyhamowuje i krótko osiada (o kilka pikseli za celem i z powrotem).
     * v0 to prędkość z puszczonego przeciągnięcia [kroki/ms], więc ruch po puszczeniu palca nie szarpie.
     */
    animateTo(target, v0) {
      cancelAnimationFrame(this.raf);
      this.target = target;
      const from = this.pos;
      if (Math.abs(target - from) < 0.001 && !v0) { this.pos = target; this.vel = 0; this.settle(); return; }
      if (A.reducedMotion()) {
        this.pos = target;
        this.vel = 0;
        this.settle();
        this.stage.classList.remove('rm-swap');
        void this.stage.offsetWidth;
        this.stage.classList.add('rm-swap');
        return;
      }
      const w = 0.017; // częstość własna [rad/ms]: większość drogi w ok. 200 ms
      const z = 0.74; // tłumienie poniżej 1 daje jedno małe, krótkie osiadanie
      let x = from - target;
      let v = v0 !== undefined ? v0 : (this.vel || 0);
      let last = performance.now();
      const tick = (t) => {
        let dt = Math.min(48, t - last);
        last = t;
        while (dt > 0) {
          const h = Math.min(4, dt);
          v += (-w * w * x - 2 * z * w * v) * h;
          x += v * h;
          dt -= h;
        }
        this.pos = target + x;
        this.vel = v;
        this.update();
        if (Math.abs(x) < 0.004 && Math.abs(v) < 0.0004) { this.pos = target; this.vel = 0; this.settle(); }
        else this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }

    // Szybkie kolejne naciśnięcia (strzałki, przyciski, kółko) sumują się: każde przesuwa o jedną kartę dalej od celu.
    base() { return this.target !== null ? this.target : Math.round(this.pos); }

    step(dir) { this.animateTo(this.base() + dir); }

    goTo(i) { const b = this.base(); this.animateTo(b + Math.round(wrap(i - b, this.n))); }

    open(i) {
      if (this.opts.onOpen) this.opts.onOpen(this.docs[i]);
    }

    onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cancelAnimationFrame(this.raf);
      // Cel ruchu, który właśnie trwał: kolejne machnięcie liczy się od niego, więc szybkie gesty się sumują.
      const base = this.base();
      this.target = null;
      this.vel = 0; // złapana karta zatrzymuje się pod palcem
      this.suppressClick = false;
      this.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: this.pos, base: base, moved: false, samples: [{ x: e.clientX, t: e.timeStamp }] };
    }

    onMove(e) {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      if (!d.moved) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          d.moved = true;
          try { this.stage.setPointerCapture(d.id); } catch (err) { /* ignore */ }
          this.stage.classList.add('dragging');
        } else if (Math.abs(dy) > 10) {
          // gest pionowy: zostawiamy przewijanie strony
          this.drag = null;
          this.animateTo(Math.round(this.pos));
          return;
        } else return;
      }
      e.preventDefault();
      this.pos = d.p0 - dx / this.s;
      // Karty rysujemy raz na klatkę, nawet gdy zdarzeń ruchu jest więcej.
      if (!this.moveRaf) this.moveRaf = requestAnimationFrame(() => { this.moveRaf = 0; this.update(); });
      d.samples.push({ x: e.clientX, t: e.timeStamp });
      if (d.samples.length > 8) d.samples.shift();
    }

    onUp(e) {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      this.stage.classList.remove('dragging');
      if (!d.moved) {
        if (Math.abs(this.pos - Math.round(this.pos)) > 0.001) this.animateTo(Math.round(this.pos));
        return;
      }
      this.suppressClick = true;
      cancelAnimationFrame(this.moveRaf);
      this.moveRaf = 0;
      // Prędkość z ostatnich 100 ms ruchu: wcześniejsze wahanie palca nie zmienia kierunku machnięcia.
      const b = d.samples[d.samples.length - 1];
      const a = d.samples.find((x) => b.t - x.t <= 100) || d.samples[0];
      const v = e.type === 'pointercancel' ? 0 : (b.x - a.x) / Math.max(1, b.t - a.t);
      // Przeciągnięcie kończy się na najbliższej karcie. Szybkie machnięcie przesuwa o tyle kart, ile palec naprawdę
      // przejechał (co najmniej o jedną), licząc od celu, do którego karuzela już jechała: trzy machnięcia = trzy karty,
      // także na wąskim ekranie, gdzie krok karty jest krótszy, a sprężyna chwilę przestrzeliwuje cel.
      let target = Math.round(this.pos);
      if (Math.abs(v) > 0.35) {
        const n = Math.max(1, Math.round(Math.abs(this.pos - d.p0)));
        target = d.base + (v < 0 ? n : -n);
      }
      // Prędkość palca w krokach karuzeli. Im bliżej celu karta jest w chwili puszczenia, tym mniej jej przejmujemy, żeby
      // nie przestrzeliła środka o więcej niż ok. 5% kroku. Jeśli palec przeciągnął kartę już za cel (przy 320 px krok jest
      // krótszy, a palec równie szybki), pęd od celu prawie znika: sprężyna nie dokłada odbicia do tego, co zrobił palec.
      const rest = this.pos - target;
      const raw = -v / this.s;
      const cap = raw * rest > 0 ? 0.0012 : Math.min(0.008, 0.0021 + 0.0133 * Math.abs(rest));
      const vs = Math.max(-cap, Math.min(cap, raw));
      this.animateTo(target, vs);
    }

    onClick(e) {
      if (this.suppressClick) { this.suppressClick = false; e.preventDefault(); return; }
      const card = e.target.closest('.dcard');
      if (!card) return;
      const i = Number(card.dataset.i);
      const o = wrap(i - this.pos, this.n);
      if (Math.abs(o) < 0.5) this.open(i);
      else this.goTo(i);
    }

    /*
     * Kółko myszy: każdy wyraźny skok kółka (duża zmiana, odstęp od poprzedniego zdarzenia) to jeden krok,
     * więc szybkie obroty się sumują. Gładzik: jeden gest (gęsty strumień drobnych zmian razem z bezwładnością)
     * to najwyżej jeden krok; nowy gest zaczyna się po 160 ms ciszy.
     */
    onWheel(e) {
      if (e.ctrlKey) return;
      const dx = e.deltaX;
      const dy = e.deltaY;
      const d = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      if (!d) return;
      e.preventDefault();
      const now = performance.now();
      const gap = now - this.lastWheel;
      this.lastWheel = now;
      const px = d * (e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? 300 : 1);
      if (Math.abs(px) >= 50 && gap > 30) { this.wheelAcc = 0; this.wheelDone = true; this.step(px > 0 ? 1 : -1); return; }
      if (gap > 160) { this.wheelAcc = 0; this.wheelDone = false; }
      if (this.wheelDone) return;
      this.wheelAcc += px;
      if (Math.abs(this.wheelAcc) >= 40) { this.wheelDone = true; this.step(this.wheelAcc > 0 ? 1 : -1); }
    }

    onKey(e) {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); this.step(1); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); this.step(-1); }
      else if (k === 'Home') { e.preventDefault(); this.goTo(0); }
      else if (k === 'End') { e.preventDefault(); this.goTo(this.n - 1); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); this.open(this.index()); }
    }
  }

  A.Carousel = Carousel;

  A.docCard = function (d, o) {
    o = o || {};
    const tag = o.static ? 'div' : 'button';
    const attrs = o.static
      ? ' aria-hidden="true"'
      : ' type="button" tabindex="-1" data-i="' + o.i + '" aria-label="' + A.esc(d.name + '. ' + d.key + ': ' + d.value + '. ' + d.status.text + '. Wzór demonstracyjny.') + '"';
    return '<' + tag + ' class="dcard tone-' + d.tone + (o.static ? ' is-static' : '') + '"' + attrs + '>' +
      '<span class="dcard-in">' +
        '<span class="dcard-eyebrow">' + A.esc(d.eyebrow) + '</span>' +
        '<span class="dcard-name">' + A.esc(d.name) + '</span>' +
        '<span class="dcard-icon">' + A.icon(d.icon, 32) + '</span>' +
        '<span class="dcard-meta"><span class="dcard-k">' + A.esc(d.key) + '</span><span class="dcard-v">' + A.esc(d.value) + '</span></span>' +
        '<span class="dcard-status st-' + d.status.tone + '">' + A.esc(d.status.text) + '</span>' +
        '<span class="dcard-foot" aria-hidden="true">Wzór demonstracyjny</span>' +
      '</span>' +
    '</' + tag + '>';
  };
})(window.APP);
