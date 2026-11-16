/* Siddhartha Vasam: portfolio interactions. Plain JS, no dependencies. */
(() => {
  "use strict";

  // ---------------------------------------------------------------- utils
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LOW = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
  const BONE = "236,235,230", EMBER = "255,106,43", INK = "12,12,13";

  // The CV prints siddharthaharibol@gmail.com but its link points to vasamsiddhartha02@gmail.com; change it here if needed.
  const EMAIL = "siddharthaharibol@gmail.com";
  $$("[data-email]").forEach((a) => {
    const sub = a.dataset.subject ? "?subject=" + encodeURIComponent(a.dataset.subject) : "";
    a.href = "mailto:" + EMAIL + sub;
    if (a.textContent.trim().toLowerCase() === "email" && a.closest(".menu-foot")) a.textContent = EMAIL;
  });

  let VW = innerWidth, VH = innerHeight;
  const mouse = { x: VW / 2, y: VH / 2, nx: 0.5, ny: 0.5 };

  function fit(canvas) {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (canvas.width !== w * DPR || canvas.height !== h * DPR) {
      canvas.width = w * DPR; canvas.height = h * DPR;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { ctx, w, h };
  }
  // progress of a tall sticky section: 0 when its top hits the viewport top, 1 when its bottom hits the viewport bottom
  function prog(el) {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - VH));
  }
  function inView(el, margin = 0) {
    const r = el.getBoundingClientRect();
    return r.bottom > -margin && r.top < VH + margin;
  }
  // glow sprite for ember points
  const glow = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,140,80,.95)"); gr.addColorStop(.25, "rgba(255,106,43,.45)"); gr.addColorStop(1, "rgba(255,106,43,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
  })();

  // a glowing orange sun: white-hot core, orange glow, wide additive bloom, slight flicker, small companion
  function drawSun(ctx, x, y, r, t, alpha = 1, companion = 1) {
    if (alpha <= 0.01 || !isFinite(x) || !isFinite(y)) return;
    r *= 1 + 0.07 * Math.sin(t * 0.021) + 0.05 * Math.sin(t * 0.0137 + 1.3);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    let g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.4);
    g.addColorStop(0, "rgba(255,120,30,0.6)"); g.addColorStop(0.3, "rgba(255,85,15,0.22)"); g.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4.4, 0, 7); ctx.fill();
    g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.7);
    g.addColorStop(0, "rgba(255,200,100,1)"); g.addColorStop(0.45, "rgba(255,135,40,0.9)"); g.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fill();
    g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.65);
    g.addColorStop(0, "rgba(255,255,248,1)"); g.addColorStop(0.55, "rgba(255,238,195,0.95)"); g.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.65, 0, 7); ctx.fill();
    if (companion) {
      const a = t * 0.0011, cx = x + Math.cos(a) * r * 1.9 * companion, cy = y + Math.sin(a) * r * 1.15 * companion;
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.95);
      g.addColorStop(0, "rgba(255,185,95,0.95)"); g.addColorStop(0.5, "rgba(255,120,35,0.5)"); g.addColorStop(1, "rgba(255,90,20,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 0.95, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- cursor + coords
  const cursor = $(".cursor");
  const cur = { x: mouse.x, y: mouse.y };
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = e.clientX / VW; mouse.ny = e.clientY / VH;
    $("#cx").textContent = "X " + mouse.nx.toFixed(3);
    $("#cy").textContent = "Y " + mouse.ny.toFixed(3);
  }, { passive: true });
  document.addEventListener("pointerover", (e) => {
    cursor.classList.toggle("big", !!e.target.closest("a, button, summary, .tile, .side-list li, .prompts li"));
  });

  // ---------------------------------------------------------------- clock + uptime
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const city = (tz.split("/").pop() || "LOCAL").replace(/_/g, " ").toUpperCase();
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  const t0 = Date.now();
  function tick() {
    const s = fmt.format(new Date());
    $("#clock").textContent = city + " " + s;
    $("#footClock").textContent = city + " " + s;
    const up = Math.floor((Date.now() - t0) / 1000);
    $("#uptime").textContent = [up / 3600, (up / 60) % 60, up % 60].map((n) => String(Math.floor(n)).padStart(2, "0")).join(":");
  }
  tick(); setInterval(tick, 1000);
  $("#yr").textContent = new Date().getFullYear();

  // ---------------------------------------------------------------- menu
  const menuBtn = $(".menu-btn");
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    $("#menu").setAttribute("aria-hidden", !open);
  };
  menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $$("#menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // ---------------------------------------------------------------- hero text effects
  const lineA = $(".line-a");
  // letters fade in one by one; each word stays together so the name only wraps between words
  let letterIdx = 0;
  lineA.innerHTML = lineA.textContent.split(" ").map((word) =>
    `<span class="w">${[...word].map((c) => `<span class="ch-l" style="animation-delay:${200 + (letterIdx++) * 38}ms">${c}</span>`).join("")}</span>`
  ).join(" ");

  const scrEl = $("[data-scramble]");
  const GLYPHS = "#*+x%0=░▒";
  function scramble() {
    const target = scrEl.dataset.scramble;
    const start = performance.now(), dur = 1700;
    (function step(now) {
      const t = (now - start) / dur;
      let html = "";
      for (let i = 0; i < target.length; i++) {
        const settle = i / target.length;
        const c = target[i];
        if (c === " " || t > settle + 0.12) html += c;
        else if (t > settle - 0.35) {
          const g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          html += `<span class="sc${Math.random() < 0.12 ? " e" : ""}">${g}</span>`;
        } else html += `<span class="sc">${c === "'" ? c : "·"}</span>`;
      }
      scrEl.innerHTML = html;
      if (t < 1.15) requestAnimationFrame(step); else scrEl.textContent = target;
    })(start);
  }
  setTimeout(scramble, 500);
  if (!REDUCED) setInterval(() => { if (scrollY < VH) scramble(); }, 8000);

  // ---------------------------------------------------------------- DotArt: sample a drawing into stippled, morphable particles
  const SHAPES = {
    standing(g) {
      const seg = (w, pts) => { g.lineWidth = w; g.lineCap = "round"; g.beginPath(); pts.forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](x, y)); g.stroke(); };
      g.beginPath(); g.arc(20, 10, 7, 0, 7); g.fill();
      seg(4, [[20, 16], [20, 22]]);
      g.beginPath(); g.roundRect(11, 22, 18, 44, 7); g.fill();
      seg(5, [[13, 26], [9, 50], [10, 64]]); seg(5, [[27, 26], [30, 50], [29, 64]]);
      seg(7.5, [[16, 64], [16, 114]]); seg(7.5, [[24, 64], [24, 114]]);
    },
    cricket(g) {
      g.save(); g.translate(46, 62); g.rotate(-0.55);
      g.beginPath(); g.roundRect(-9, -46, 18, 62, 6); g.fill();
      g.fillRect(-3, -66, 6, 22);
      g.restore();
      g.beginPath(); g.arc(76, 30, 9, 0, 7); g.fill();
      g.globalCompositeOperation = "destination-out"; g.lineWidth = 1.6;
      g.beginPath(); g.arc(76, 30, 6, -1.2, 1.2); g.stroke(); g.globalCompositeOperation = "source-over";
      g.lineWidth = 1.2; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(84, 26); g.quadraticCurveTo(94, 10, 96, 4); g.stroke(); g.setLineDash([]);
      for (const x of [24, 32, 40]) g.fillRect(x, 92, 3, 26);
      g.fillRect(22, 90, 22, 2);
    },
    bin(g) {
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(28, 44); g.lineTo(34, 108); g.lineTo(66, 108); g.lineTo(72, 44); g.closePath(); g.stroke();
      g.fillRect(24, 38, 52, 5); g.fillRect(44, 32, 12, 6);
      for (const x of [41, 50, 59]) g.fillRect(x - 1, 54, 2.4, 44);
      g.setLineDash([3, 3]); g.lineWidth = 1.4; g.strokeRect(58, 6, 32, 34); g.setLineDash([]);
      g.beginPath(); g.roundRect(68, 14, 12, 22, 3); g.fill(); g.fillRect(71, 9, 6, 5);
    },
    mail(g) {
      g.lineWidth = 2.6;
      g.strokeRect(14, 40, 72, 48);
      g.beginPath(); g.moveTo(14, 40); g.lineTo(50, 68); g.lineTo(86, 40); g.stroke();
      for (let i = 0; i < 4; i++) g.fillRect(26, 98 + i * 6, i % 2 ? 34 : 48, 2.6);
      g.beginPath(); g.arc(80, 34, 9, 0, 7); g.fill();
    },
    person(g) {
      g.beginPath(); g.arc(46, 20, 9, 0, 7); g.fill();
      g.beginPath(); g.roundRect(34, 32, 24, 40, 8); g.fill();
      g.fillRect(36, 70, 8, 40); g.fillRect(48, 70, 8, 40);
      g.globalCompositeOperation = "destination-out"; g.fillRect(36, 14, 20, 6); g.globalCompositeOperation = "source-over";
      g.lineWidth = 1.4; g.beginPath(); g.moveTo(78, 10); g.lineTo(78, 110); g.stroke();
      for (let y = 10; y <= 110; y += 10) g.fillRect(74, y, 8, 1.4);
      g.setLineDash([2, 3]); g.beginPath(); g.moveTo(56, 11); g.lineTo(76, 11); g.moveTo(58, 110); g.lineTo(76, 110); g.stroke(); g.setLineDash([]);
    },
    traffic(g) {
      g.lineWidth = 2.6; g.beginPath(); g.roundRect(34, 8, 32, 80, 8); g.stroke();
      g.beginPath(); g.arc(50, 24, 8, 0, 7); g.stroke();
      g.beginPath(); g.arc(50, 48, 8, 0, 7); g.stroke();
      g.beginPath(); g.arc(50, 72, 8, 0, 7); g.fill();
      g.fillRect(47, 88, 6, 30);
    },
    hub(g) { // everything runs through you
      g.beginPath(); g.arc(50, 70, 9, 0, 7); g.fill();
      g.fillRect(44, 82, 12, 28);
      const nodes = [[16, 22], [50, 14], [84, 22], [12, 56], [88, 56], [22, 92], [78, 92], [34, 38], [66, 38]];
      g.lineWidth = 1.4;
      for (const [x, y] of nodes) { g.beginPath(); g.moveTo(50, 70); g.lineTo(x, y); g.stroke(); g.fillRect(x - 5, y - 5, 10, 10); }
    },
    chat(g) {
      g.lineWidth = 3;
      g.beginPath(); g.roundRect(14, 30, 72, 48, 12); g.stroke();
      g.beginPath(); g.moveTo(30, 78); g.lineTo(26, 96); g.lineTo(46, 78); g.stroke();
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(36 + i * 14, 54, 4.5, 0, 7); g.fill(); }
    },
    doc(g) {
      g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(22, 12); g.lineTo(64, 12); g.lineTo(78, 26); g.lineTo(78, 104); g.lineTo(22, 104); g.closePath(); g.stroke();
      for (let i = 0; i < 6; i++) g.fillRect(32, 34 + i * 9, i % 2 ? 26 : 36, 3);
      g.beginPath(); g.arc(70, 96, 14, 0, 7); g.fill();
      g.globalCompositeOperation = "destination-out"; g.lineWidth = 3.5; g.beginPath(); g.moveTo(63, 96); g.lineTo(68, 101); g.lineTo(77, 90); g.stroke(); g.globalCompositeOperation = "source-over";
    },
    chart(g) {
      g.lineWidth = 2; g.beginPath(); g.moveTo(14, 14); g.lineTo(14, 104); g.lineTo(92, 104); g.stroke();
      const hs = [26, 40, 34, 58, 50, 74];
      hs.forEach((v, i) => g.fillRect(22 + i * 12, 100 - v, 8, v));
      g.lineWidth = 1.6; g.beginPath(); hs.forEach((v, i) => g[i ? "lineTo" : "moveTo"](26 + i * 12, 92 - v)); g.stroke();
    },
  };

  class DotArt {
    constructor(canvas, shape, opts = {}) {
      this.c = canvas; this.n = opts.n || 2400; this.rgb = opts.rgb || BONE; this.shape = shape;
      this.draw2 = opts.draw || null; this.space = opts.space || [100, 125];
      this.size = opts.size || 1.3; this.streak = opts.streak || 0; this.after = opts.after || null; this.ease = opts.ease || 0.09;
      this.pts = []; this.w = 0; this.h = 0; this.visible = false; this.enter = opts.enter || null; this.replay = false;
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !this.visible && this.enter && this.pts.length) this.replay = true;
        this.visible = e.isIntersecting;
      }, { rootMargin: "0px" }).observe(canvas);
    }
    sample(w, h) {
      const off = document.createElement("canvas"); off.width = w; off.height = h;
      const g = off.getContext("2d");
      g.fillStyle = g.strokeStyle = "#fff";
      const on = [];
      if (this.draw2) this.draw2(g, w, h);
      else {
        const [sw, sh] = this.space, sc = Math.min(w / sw, h / sh) * 0.86;
        g.translate((w - sw * sc) / 2, (h - sh * sc) / 2); g.scale(sc, sc);
        SHAPES[this.shape](g);
      }
      const d = g.getImageData(0, 0, w, h).data;
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 90) on.push(x, y);
      return on;
    }
    targets(w, h) {
      const on = this.sample(w, h), out = new Float32Array(this.n * 2), cnt = on.length / 2;
      for (let i = 0; i < this.n; i++) {
        if (!cnt) { out[i * 2] = rand(0, w); out[i * 2 + 1] = rand(0, h); continue; }
        const k = (Math.random() * cnt) | 0;
        out[i * 2] = on[k * 2] + rand(-1.2, 1.2); out[i * 2 + 1] = on[k * 2 + 1] + rand(-1.2, 1.2);
      }
      return out;
    }
    refresh(burst = true) {
      if (this.w) this.tg = this.targets(this.w, this.h);
      if (burst) for (const p of this.pts) p.v = rand(1, 4);
    }
    setShape(shape) { this.shape = shape; this.refresh(); }
    frame(t) {
      if (!this.visible) return;
      const { ctx, w, h } = fit(this.c);
      if (w !== this.w || h !== this.h) {
        this.w = w; this.h = h; this.tg = this.targets(w, h);
        if (!this.pts.length) this.pts = Array.from({ length: this.n }, (_, i) => ({ x: this.tg[i * 2] + gauss() * w * 0.25, y: this.tg[i * 2 + 1] + gauss() * h * 0.25, ox: 0, oy: 0, a: rand(0.3, 1), v: 0, ph: rand(0, 6) }));
        if (this.enter) this.replay = true;
      }
      if (this.replay) {
        // particles start strung out to the left of their spot and streak in
        this.replay = false;
        for (let i = 0; i < this.n; i++) { const p = this.pts[i]; p.x = this.tg[i * 2] - rand(80, 720) * (0.4 + Math.random()); p.y = this.tg[i * 2 + 1] + gauss() * 6; p.ox = p.oy = 0; p.v = 0; }
      }
      ctx.clearRect(0, 0, w, h);
      const r = this.c.getBoundingClientRect(), mx = mouse.x - r.left, my = mouse.y - r.top;
      const dtf = this.lt ? Math.min(8, Math.max(0.2, (t - this.lt) / 16.7)) : 1; this.lt = t;
      const tg = this.tg, R = 60, E = 1 - Math.pow(1 - this.ease, dtf), S = this.size, damp = Math.pow(0.9, dtf);
      ctx.fillStyle = `rgb(${this.rgb})`;
      for (let i = 0; i < this.n; i++) {
        const p = this.pts[i];
        const vx = (tg[i * 2] - p.x) * E;
        p.x += vx; p.y += (tg[i * 2 + 1] - p.y) * E;
        if (p.v > 0) { p.ox += gauss() * p.v; p.oy += gauss() * p.v * (this.streak ? 0.2 : 1); p.v *= damp; if (p.v < 0.05) p.v = 0; }
        const dx = p.x + p.ox - mx, dy = p.y + p.oy - my, d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 0.01) { const d = Math.sqrt(d2), f = (1 - d / R) * 1.8; p.ox += dx / d * f; p.oy += dy / d * f; }
        p.ox *= damp; p.oy *= damp;
        ctx.globalAlpha = p.a * (0.75 + 0.25 * Math.sin(t * 0.003 + p.ph));
        const len = this.streak ? Math.min(22, Math.abs(vx / dtf) * this.streak) : 0;
        ctx.fillRect(p.x + p.ox - (vx > 0 ? len : 0), p.y + p.oy, S + len, S);
      }
      ctx.globalAlpha = 1;
      if (this.after) this.after(ctx, w, h, t);
    }
  }

  // ---------------------------------------------------------------- SIX SIDES
  const sides = $("#sides"), sideLis = $$("#sideList li"), tiles = $$("#net .tile");
  let sideIdx = -1;
  function sidesUpdate() {
    if (VW < 760) { if (sideIdx !== 0) { sideIdx = 0; } tiles.forEach((t, i) => t.classList.toggle("on", i === Math.floor((Date.now() / 1800) % 6))); return; }
    const i = Math.min(5, Math.floor(prog(sides) * 6));
    if (i === sideIdx) return; sideIdx = i;
    sideLis.forEach((li, k) => li.classList.toggle("on", k === i));
    tiles.forEach((t, k) => t.classList.toggle("on", k === i));
  }
  sideLis.forEach((li, i) => li.addEventListener("click", () => {
    if (VW < 760) return;
    const top = sides.offsetTop + ((i + 0.5) / 6) * (sides.offsetHeight - VH);
    scrollTo({ top, behavior: "smooth" });
  }));
  tiles.forEach((t, i) => t.addEventListener("click", () => sideLis[i].click()));

  // ---------------------------------------------------------------- the net, drawn in particles
  // Each tile: a faint speckle, a dotted border and its icon as a dense particle cluster. The active tile gets an
  // orange border, its icon bursts and re-forms, and a glowing sun circles it. When you scroll past the section the
  // whole net dissolves into drifting dust (borders first, then the speckle, then the icons and the figure) and
  // the sun sheds sparks that trail away. Scrolling back reassembles it.
  const netEl = $("#net"), spark = $("#netSpark"), netFigEl = $("#netFig");
  $(".sides .sticky").appendChild(spark);
  const NETFX = { tiles: [], fig: [], w: 0, h: 0, ready: false };
  const relRect = (el) => { const cr = spark.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height }; };
  const tileRect = (i) => relRect(tiles[i]);
  function iconImage(svg) {
    const c = svg.cloneNode(true);
    c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    c.setAttribute("width", "200"); c.setAttribute("height", "160");
    c.querySelectorAll("*").forEach((el) => {
      el.setAttribute("fill", "none"); el.setAttribute("stroke", "#fff");
      el.setAttribute("stroke-linecap", "round"); el.setAttribute("stroke-linejoin", "round");
      if (el.classList.contains("teeth")) { el.setAttribute("stroke-width", "9"); el.setAttribute("stroke-dasharray", "4 5"); el.setAttribute("stroke-linecap", "butt"); }
      else el.setAttribute("stroke-width", "4.4");
    });
    const im = new Image();
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(c.outerHTML);
    return im;
  }
  const ICON_IMGS = tiles.map((t) => iconImage($("svg", t)));
  const iconsLoaded = () => ICON_IMGS.every((im) => im.complete && im.naturalWidth > 0);
  // every particle gets its own way of blowing away: when it lets go, how far, which way, and a wobble
  const mkDrift = (st0, st1) => ({ st: rand(st0, st1), dist: rand(90, 620), vy: rand(-0.35, 1.15), sw: rand(0, 6), fl: rand(0.75, 1.25) });
  function buildNet() {
    NETFX.tiles = tiles.map((t, i) => {
      const rc = tileRect(i);
      const noise = Array.from({ length: Math.round((rc.w * rc.h) / 24) }, () => ({ x: Math.random() * rc.w, y: Math.random() * rc.h, a: rand(0.05, 0.34), ph: rand(0, 6), sz: Math.random() < 0.1 ? 1.5 : 1, ...mkDrift(0.06, 0.45) }));
      const border = [], per = 2 * (rc.w + rc.h);
      for (let d = 0; d < per; d += 2) {
        let x, y, dd = d;
        if (dd < rc.w) { x = dd; y = 0; } else if ((dd -= rc.w) < rc.h) { x = rc.w; y = dd; } else if ((dd -= rc.h) < rc.w) { x = rc.w - dd; y = rc.h; } else { dd -= rc.w; x = 0; y = rc.h - dd; }
        border.push({ x: x + gauss() * 0.7, y: y + gauss() * 0.7, a: rand(0.3, 1), ph: rand(0, 6), ...mkDrift(0, 0.28) });
      }
      const icon = [], im = ICON_IMGS[i];
      if (im.complete && im.naturalWidth > 0) {
        const iw = Math.max(20, Math.round(rc.w * 0.74)), ih = Math.round(iw * 0.8);
        const c = document.createElement("canvas"); c.width = iw; c.height = ih;
        const g = c.getContext("2d"); g.drawImage(im, 0, 0, iw, ih);
        const d = g.getImageData(0, 0, iw, ih).data, on = [];
        for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) if (d[(y * iw + x) * 4 + 3] > 90) on.push(x, y);
        const cnt = on.length / 2, n = Math.min(1900, Math.round(cnt * 0.75));
        const x0 = (rc.w - iw) / 2, y0 = (rc.h - ih) / 2 + rc.h * 0.05;
        for (let k = 0; k < n; k++) {
          const q = (Math.random() * cnt) | 0, tx = x0 + on[q * 2] + gauss() * 0.9, ty = y0 + on[q * 2 + 1] + gauss() * 0.9;
          icon.push({ tx, ty, x: tx + gauss() * 40, y: ty + gauss() * 40, ox: 0, oy: 0, a: rand(0.55, 1), ph: rand(0, 6), v: 0, ...mkDrift(0.22, 0.62) });
        }
      }
      return { noise, border, icon };
    });
    // the standing figure, drawn here so it can dissolve with the rest
    const fc = document.createElement("canvas"); fc.width = 40; fc.height = 120;
    const fg = fc.getContext("2d"); fg.fillStyle = fg.strokeStyle = "#fff"; SHAPES.standing(fg);
    const fd = fg.getImageData(0, 0, 40, 120).data, fon = [];
    for (let y = 0; y < 120; y++) for (let x = 0; x < 40; x++) if (fd[(y * 40 + x) * 4 + 3] > 90) fon.push([x / 40, y / 120]);
    NETFX.fig = Array.from({ length: 1700 }, () => { const q = fon[(Math.random() * fon.length) | 0]; return { u: q[0] + gauss() * 0.012, v: q[1] + gauss() * 0.004, a: rand(0.5, 1), ph: rand(0, 6), ...mkDrift(0.12, 0.6) }; });
    NETFX.ready = iconsLoaded();
  }
  const D = [0, 0, 1];
  function driftOf(q, dz, T) {
    const k = clamp((dz - q.st) / 0.5);
    if (k <= 0) { D[0] = 0; D[1] = 0; D[2] = 1; return D; }
    const e = k * k * (3 - 2 * k);
    D[0] = -q.dist * e * q.fl + Math.sin(e * 3.2 + q.sw) * 26 * e + Math.sin(T * 1.7 + q.sw) * 3 * e;
    D[1] = q.dist * 0.32 * q.vy * e + Math.cos(e * 2.6 + q.sw) * 16 * e + Math.cos(T * 1.3 + q.sw) * 3 * e;
    D[2] = 1 - smooth(0.3, 1, k);
    return D;
  }

  const star = { x: 0, y: 0, s: 0, from: null, t: 1, trail: [] };
  const SPARKS = [];
  function perim(rc, s) {
    const P = 2 * (rc.w + rc.h); let d = (s % 1) * P;
    if (d < rc.w) return [rc.x + d, rc.y]; d -= rc.w;
    if (d < rc.h) return [rc.x + rc.w, rc.y + d]; d -= rc.h;
    if (d < rc.w) return [rc.x + rc.w - d, rc.y + rc.h]; d -= rc.w;
    return [rc.x, rc.y + rc.h - d];
  }
  let starTile = -1, starLast = performance.now(), lastActive = -1, labelFade = -1;
  function sparkDraw(now) {
    if (!inView(sides)) { SPARKS.length = 0; return; }
    const { ctx, w, h } = fit(spark);
    if (w !== NETFX.w || h !== NETFX.h || (!NETFX.ready && iconsLoaded())) { NETFX.w = w; NETFX.h = h; buildNet(); }
    ctx.clearRect(0, 0, w, h);
    const T = now * 0.001, dtS = Math.min(60, now - starLast); starLast = now;
    const E = 1 - Math.pow(0.9, dtS / 16.7), damp = Math.pow(0.9, dtS / 16.7);

    // how far the net has dissolved: starts near the end of the pinned scroll, completes as the section leaves
    const sr = sides.getBoundingClientRect();
    const pinPart = VW < 760 ? 0 : smooth(0.9, 1, prog(sides));
    const leave = clamp((VH - sr.bottom) / (VH * 0.7));
    const dz = clamp(pinPart * 0.32 + leave * 0.78);
    const lf = 1 - smooth(0.04, 0.4, dz);
    if (Math.abs(lf - labelFade) > 0.01) { labelFade = lf; tiles.forEach((t) => { $("span", t).style.opacity = lf; }); }

    const cur = tiles.findIndex((t) => t.classList.contains("on"));
    if (cur !== lastActive) { lastActive = cur; const tt = NETFX.tiles[cur]; if (tt) tt.icon.forEach((q) => { q.v = rand(1.5, 5); }); }
    const cr = spark.getBoundingClientRect(), mx = mouse.x - cr.left, my = mouse.y - cr.top, R = 46;

    NETFX.tiles.forEach((tt, i) => {
      const rc = tileRect(i), on = i === cur;
      ctx.fillStyle = `rgb(${BONE})`;
      for (const q of tt.noise) {
        driftOf(q, dz, T); if (D[2] <= 0.01) continue;
        ctx.globalAlpha = q.a * (0.55 + 0.45 * Math.sin(T * 1.6 + q.ph)) * (on ? 1.3 : 1) * D[2];
        ctx.fillRect(rc.x + q.x + D[0], rc.y + q.y + D[1], q.sz, q.sz);
      }
      ctx.fillStyle = on ? "rgb(255,138,48)" : `rgb(${BONE})`;
      for (const q of tt.border) {
        driftOf(q, dz, T); if (D[2] <= 0.01) continue;
        ctx.globalAlpha = (on ? q.a * (0.55 + 0.45 * Math.sin(T * 4 + q.ph)) : q.a * 0.2) * D[2];
        const sz = on ? 1.4 : 1.1;
        ctx.fillRect(rc.x + q.x + D[0], rc.y + q.y + D[1], sz, sz);
      }
      ctx.fillStyle = `rgb(${BONE})`;
      for (const q of tt.icon) {
        q.x += (q.tx - q.x) * E; q.y += (q.ty - q.y) * E;
        if (q.v > 0) { q.ox += gauss() * q.v; q.oy += gauss() * q.v; q.v *= damp; if (q.v < 0.05) q.v = 0; }
        const dx = rc.x + q.x + q.ox - mx, dy = rc.y + q.y + q.oy - my, d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 0.01) { const d = Math.sqrt(d2), f = (1 - d / R) * 1.6; q.ox += (dx / d) * f; q.oy += (dy / d) * f; }
        q.ox *= damp; q.oy *= damp;
        driftOf(q, dz, T); if (D[2] <= 0.01) continue;
        ctx.globalAlpha = q.a * (0.78 + 0.22 * Math.sin(T * 3 + q.ph)) * (on ? 1 : 0.62) * D[2];
        ctx.fillRect(rc.x + q.x + q.ox + D[0], rc.y + q.y + q.oy + D[1], 1.45, 1.45);
      }
    });
    // standing figure
    const fr = relRect(netFigEl);
    if (fr.h > 10) {
      const fh = fr.h, fw = fh / 3, fx0 = fr.x + (fr.w - fw) / 2;
      ctx.fillStyle = `rgb(${BONE})`;
      for (const q of NETFX.fig) {
        driftOf(q, dz, T); if (D[2] <= 0.01) continue;
        ctx.globalAlpha = q.a * (0.82 + 0.18 * Math.sin(T * 3 + q.ph)) * D[2];
        ctx.fillRect(fx0 + q.u * fw + D[0], fr.y + q.v * fh + D[1], 1.2, 1.2);
      }
    }
    ctx.globalAlpha = 1;

    // the sun: circles the active tile, fades as the net dissolves and sheds sparks while it does
    if (cur >= 0) {
      const rc = tileRect(cur);
      if (cur !== starTile) { star.from = starTile < 0 ? null : [star.x, star.y]; star.t = star.from ? 0 : 1; star.s = 0; starTile = cur; }
      star.s += dtS / 3800;
      let [x, y] = perim(rc, star.s);
      if (star.t < 1) {
        star.t = Math.min(1, star.t + dtS / 650);
        const e = star.t * star.t * (3 - 2 * star.t);
        x = star.from[0] + (x - star.from[0]) * e; y = star.from[1] + (y - star.from[1]) * e;
      }
      star.x = x; star.y = y;
      star.trail.push([x, y]); if (star.trail.length > 46) star.trail.shift();
      const sunA = 1 - smooth(0.35, 0.9, dz);
      // sparks: a few always, a stream while dissolving
      const rate = (0.12 + dz * 7) * (dtS / 16.7) * (dz < 0.97 ? 1 : 0);
      const count = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
      for (let k = 0; k < count; k++) {
        const fromCorner = Math.random() < 0.6, sx = fromCorner ? rc.x + 3 : x, sy = fromCorner ? rc.y + 3 : y;
        SPARKS.push({ x: sx + gauss() * 3, y: sy + gauss() * 3, vx: -rand(0.3, 2.6) * (0.4 + dz), vy: rand(-0.4, 1.4) * (0.4 + dz), life: 1, decay: rand(0.0005, 0.0011), s: rand(1, 2.2) });
        if (SPARKS.length > 700) SPARKS.shift();
      }
      if (sunA > 0.01) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < star.trail.length; k++) {
          const [tx, ty] = star.trail[k], a = Math.pow(k / star.trail.length, 2) * sunA;
          ctx.fillStyle = `rgba(255,${120 + (a * 80) | 0},40,${a * 0.9})`;
          ctx.fillRect(tx - 1 + gauss() * 0.7, ty - 1 + gauss() * 0.7, 2, 2);
        }
        ctx.restore();
        drawSun(ctx, rc.x + 3, rc.y + 3, 6.5, now, sunA, 1);
        drawSun(ctx, x, y, 4.6, now + 777, 0.95 * sunA, 0);
      }
    }
    // sparks drift down-left, cool from gold to deep orange, and fade
    if (SPARKS.length) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const f = dtS / 16.7;
      for (let k = SPARKS.length - 1; k >= 0; k--) {
        const sp = SPARKS[k];
        sp.x += sp.vx * f; sp.y += sp.vy * f; sp.vx *= Math.pow(0.992, f); sp.vy += 0.006 * f;
        sp.x += Math.sin(T * 2 + k) * 0.25 * f;
        sp.life -= sp.decay * dtS;
        if (sp.life <= 0) { SPARKS.splice(k, 1); continue; }
        const g = (70 + sp.life * 95) | 0;
        ctx.fillStyle = `rgba(255,${g},${(20 + sp.life * 40) | 0},${Math.min(1, sp.life * 1.2)})`;
        ctx.fillRect(sp.x, sp.y, sp.s, sp.s);
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- WHO
  const PERSONAS = [
    { cap: "PL. 01 · B.Tech CSE (AI/ML), Parul University", pain: "An AI/ML engineer who loves real-time systems.", fit: "Computer vision, NLP and LLMs, taken all the way to a working app.", get: "Models that leave the notebook.", shape: "hub" },
    { cap: "PL. 02 · AI Automation Engineer, 1XL Infra", pain: "Building property-management software in Dubai.", fit: "Leases, invoices, leads and site visits, plus WhatsApp automation for follow-ups.", get: "Busywork, automated.", shape: "chat" },
    { cap: "PL. 03 · Requirements → model → validation", pain: "I start from the business problem, not the model.", fit: "Work with stakeholders, validate model outputs, test, and keep improving accuracy.", get: "Results you can measure.", shape: "chart" },
    { cap: "PL. 04 · Cricket, research papers, running", pain: "Reading AI/ML research papers for fun.", fit: "Cricket, movies, open-source computer vision projects and outdoor runs.", get: "Fresh ideas, every week.", shape: "cricket" },
  ];

  const youArt = new DotArt($("#youArt"), "hub", { n: 2600 });
  const youRows = $("#youRows"), dds = $$("dd", youRows);
  function setPersona(i, instant) {
    const p = PERSONAS[i];
    $$("#youTabs button").forEach((b, k) => b.setAttribute("aria-selected", k === i));
    const apply = () => { $("#youCap").textContent = p.cap; dds[0].textContent = p.pain; dds[1].textContent = p.fit; dds[2].innerHTML = `<em>${p.get}</em>`; youRows.classList.remove("swap"); };
    if (instant) apply(); else { youRows.classList.add("swap"); setTimeout(apply, 280); }
    youArt.setShape(p.shape);
  }
  $$("#youTabs button").forEach((b) => b.addEventListener("click", () => setPersona(+b.dataset.i)));
  setPersona(0, true);

  // ---------------------------------------------------------------- PROJECTS (one pinned panel)
  const CASES = [
    { no: "Project 01", date: "· Apr – Jul 2026", title: "AI Resume Screening System", value: "3 tiers",
      bv: "Manual review", bt: "every CV read and compared to the job description by hand",
      av: "Fit · Potential · Not fit", at: "semantic matching ranks every candidate against the job",
      chips: ["Python", "NLP", "Hugging Face", "Semantic similarity"], link: "https://github.com/Vasamsiddhartha/Resume-Screener", art: "doc", cap: "Parse → match → classify" },
    { no: "Project 02", date: "· Nov 2025 – Jan 2026", title: "Real-Time Waste Detection", value: "92%",
      bv: "Sorting by eye", bt: "waste classified manually, item by item",
      av: "92% accuracy", at: "YOLOv8 on a live webcam feed, with a Streamlit interface",
      chips: ["YOLOv8", "OpenCV", "Streamlit", "Python"], link: "https://github.com/Vasamsiddhartha/waste-managment-using-AI-and-ML", art: "bin", cap: "Detect → classify → display" },
    { no: "Project 03", date: "· Sep 2024 – Jan 2025", title: "AI Inbox Summarizer", value: "85%+",
      bv: "Inbox overload", bt: "Gmail and SMS messages read one at a time",
      av: "85%+ automated", at: "a LoRA fine-tune lifted summary relevance by about 65%",
      chips: ["Hugging Face", "LoRA", "Gmail API", "Streamlit"], link: "https://github.com/Vasamsiddhartha/AI-Inbox-Summarizer", art: "mail", cap: "Ingest → label → summarise" },
    { no: "Internship", date: "· Clomotech · May – Sep 2025", title: "Occluded Person Re-ID", value: "+15%",
      bv: "Face hidden", bt: "no identification when faces are partly or fully covered",
      av: "+15% accuracy", at: "height as a biometric cue, with 30% less compute for 3D reconstruction",
      chips: ["YOLOv8-Pose", "Mask R-CNN", "Camera calibration"], link: null, art: "person", cap: "Pose → height → identity" },
    { no: "Internship", date: "· Slash Mark · Dec 2024 – Mar 2025", title: "Traffic Light Classifier", value: "92%+",
      bv: "2,400+ frames", bt: "raw road images, simulated and real-world",
      av: "92%+ accuracy", at: "a CNN for autonomous navigation; augmentation added 15% and cut latency 20%",
      chips: ["TensorFlow", "CNN", "Augmentation"], link: null, art: "traffic", cap: "Frame → CNN → signal" },
  ];
  const proofStage = $("#proofStage"), pcTitle = $$("#pcTitle span"), pcBa = $("#pcBa"), caseBars = $$("#caseProg i");
  const pcArt = new DotArt($("#pcArt"), CASES[0].art, { n: 3200 });
  let pcVal = null, pcIdx = -1, pcTitleSide = 0, valueText = CASES[0].value, valueEnd = 0;
  document.fonts.ready.then(() => {
    pcVal = new DotArt($("#pcValue"), null, {
      n: VW < 760 ? 2200 : 4200, size: 1.5, streak: 1.6, ease: 0.08,
      draw(g, w, h) {
        let fs = h * 0.92;
        g.font = `800 ${fs}px Doto, monospace`;
        const tw = g.measureText(valueText).width;
        if (tw > w * 0.92) { fs *= (w * 0.92) / tw; g.font = `800 ${fs}px Doto, monospace`; }
        g.textBaseline = "alphabetic";
        g.fillText(valueText, 0, h * 0.82);
        valueEnd = Math.min(w - 8, g.measureText(valueText).width + 14);
      },
      after(ctx, w, h, t) {
        // ember at the end of the number
        const y = h * 0.74;
        ctx.globalAlpha = 0.9; ctx.drawImage(glow, valueEnd - 12, y - 12, 24, 24);
        ctx.fillStyle = `rgb(${EMBER})`; ctx.beginPath(); ctx.arc(valueEnd, y, 2.2 + Math.sin(t * 0.004) * 0.4, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      },
    });
  });
  function setCase(i, instant) {
    const c = CASES[i];
    $("#pcNo").textContent = c.no;
    $("#pcDate").textContent = c.date;
    pcTitleSide ^= 1;
    pcTitle[pcTitleSide].textContent = c.title;
    pcTitle.forEach((s, k) => s.classList.toggle("on", k === pcTitleSide));
    const apply = () => {
      $("#pcBv").textContent = c.bv; $("#pcBt").textContent = c.bt;
      $("#pcAv").textContent = c.av; $("#pcAt").textContent = c.at;
      $("#pcChips").innerHTML = c.chips.map((x) => `<li>${x}</li>`).join("");
      const a = $("#pcLink");
      if (c.link) { a.href = c.link; a.textContent = "View on GitHub ↗"; a.classList.remove("off"); }
      else { a.removeAttribute("href"); a.textContent = "Internship work"; a.classList.add("off"); }
      $("#pcCap").textContent = c.cap;
      pcBa.classList.remove("swap");
    };
    if (instant) apply(); else { pcBa.classList.add("swap"); setTimeout(apply, 260); }
    pcArt.setShape(c.art);
    valueText = c.value;
    if (pcVal) pcVal.refresh(true);
    caseBars.forEach((b, k) => b.classList.toggle("on", k === i));
  }
  setCase(0, true); pcIdx = 0;
  function proofUpdate() {
    const i = Math.min(CASES.length - 1, Math.floor(prog(proofStage) * CASES.length));
    if (i !== pcIdx) { pcIdx = i; setCase(i); }
  }

  // ---------------------------------------------------------------- NUMBERS: particle numerals that streak in
  const statArts = [];
  document.fonts.ready.then(() => {
    $$(".stat b").forEach((b, idx) => {
      const txt = b.textContent.trim();
      b.setAttribute("aria-label", txt);
      const c = document.createElement("canvas");
      c.className = "stat-val"; c.setAttribute("aria-hidden", "true");
      b.appendChild(c);
      statArts.push(new DotArt(c, null, {
        n: VW < 760 ? 1300 : 2200, size: 1.6, streak: 1.7, ease: 0.06 - idx * 0.004, enter: "left",
        draw(g, w, h) {
          let fs = parseFloat(getComputedStyle(b).fontSize);
          g.font = `800 ${fs}px Doto, monospace`;
          const tw = g.measureText(txt).width;
          if (tw > w * 0.98) { fs *= (w * 0.98) / tw; g.font = `800 ${fs}px Doto, monospace`; }
          g.textBaseline = "alphabetic";
          g.fillText(txt, 0, h * 0.86);
        },
      }));
    });
  });

  // ---------------------------------------------------------------- HOW (journey: six stops riding an orbit around the engineer)
  // Laid out on a 1671×707 stage (the reference composition), scaled to the viewport and anchored to its bottom.
  // Two canvases sandwich the stop cards, so a card on the far side of the orbit passes behind the engineer and a
  // card on the near side passes in front. Scrolling turns the orbit like a conveyor: upcoming stops wait as small
  // cards along the far arc, the next one lifts off the orbit into the focus panel and opens up, and the finished one
  // shrinks into the orbit and runs as a comet along the near arc to its milestone, which stays lit with its name.
  // The near arc fills with ember as the journey goes on. Stop content lives in the #jrCards markup.
  const how = $("#how"), howBack = $("#howBack"), howCanvas = $("#howCanvas");
  const jrStage = $("#jrStage"), jrCards = $$("#jrCards li"), jrNo = $("#jrNo"), jrTicks = $$("#jrTicks i");
  const JN = jrCards.length, jrLabels = jrCards.map((li) => li.dataset.bead.toUpperCase());
  let jrActive = -1, jrSwitched = 0;
  const setActive = (i) => {
    if (i === jrActive) return;
    jrActive = i; jrSwitched = performance.now();
    jrCards.forEach((li, k) => li.classList.toggle("on", k === i));
    jrNo.textContent = String(i + 1).padStart(2, "0");
    jrTicks.forEach((tk, k) => { tk.classList.toggle("on", k === i); tk.classList.toggle("done", k < i); });
  };

  // the small seated figure, also used by the ambient backdrop
  const SEATED_PTS = (() => {
    const W = 70, H = 80, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.fillStyle = g.strokeStyle = "#fff"; g.lineCap = g.lineJoin = "round";
    const seg = (lw, pts) => { g.lineWidth = lw; g.beginPath(); pts.forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](x, y)); g.stroke(); };
    g.beginPath(); g.arc(25, 11, 7.5, 0, 7); g.fill();
    seg(12, [[25, 26], [21, 42], [22, 62]]); g.beginPath(); g.ellipse(25, 68, 11, 8, 0, 0, 7); g.fill();
    seg(10, [[24, 64], [47, 45]]); seg(7.5, [[48, 45], [52, 71]]); seg(5, [[28, 28], [40, 44], [47, 49]]);
    const d = g.getImageData(0, 0, W, H).data, on = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 100) on.push([(x - 32) / H, (76 - y) / H]);
    return Array.from({ length: 1400 }, () => { const q = on[(Math.random() * on.length) | 0]; return [q[0] + gauss() * 0.005, q[1] + gauss() * 0.005, rand(0.5, 1)]; });
  })();

  // ---- stage geometry (reference coordinates)
  const SW = 1671, SH = 707;
  const RING = { cx: 836, cy: 365, rx: 714, ry: 152 };
  const DOME = { cx: 840, cy: 560, rx: 360, ry: 465 };
  const SCREEN = { x: 1005, y: 418 };
  const CROP = { x: 690, y: 250, w: 430, h: 310 };
  const FOCUS = 2.62;                                   // orbit angle under the focus panel
  const PANEL = { x: 240, y: 296 };                     // focus panel centre
  const CHIP0 = 4.25, CHIP_STEP = 0.44, CHIP_SC = 0.45; // where upcoming stops wait on the far arc, and their size
  const MILES = [2.3, 1.95, 1.6, 1.25, 0.9, 0.55];      // milestone angles along the near arc, left to right
  const RING_BEADS = [3.792, Math.PI, 5.79, 0];
  const STEMS = [[275, 459, 600], [524, 502, 640], [940, 560, 655], [1228, 492, 625], [1427, 450, 598], [1462, 441, 612]];
  const ringS = (a) => [RING.cx + Math.cos(a) * RING.rx, RING.cy + Math.sin(a) * RING.ry];
  let JR = { s: 1, ox: 0, oy: 0, w: 0, h: 0, mobile: false }, jrCardH = jrCards.map(() => 230);
  function jrLayout(w, h) {
    const mobile = VW < 760;
    let s, ox, oy;
    if (mobile) { s = (w * 0.56) / 410; ox = w / 2 - 905 * s; oy = h - SH * s; }
    else { s = Math.min(w / SW, h / SH); ox = (w - SW * s) / 2; oy = h - SH * s; }
    JR = { s, ox, oy, w, h, mobile };
    jrStage.style.cssText = mobile ? "" : `left:${ox}px;top:${oy}px;width:${SW * s}px;height:${SH * s}px`;
    jrStage.style.setProperty("--s", mobile ? 1 : s.toFixed(4));
    if (mobile) jrCards.forEach((li) => li.removeAttribute("style"));
    else jrCardH = jrCards.map((li) => li.offsetHeight / s);         // card heights in stage units (transforms don't affect this)
  }
  document.fonts.ready.then(() => { JR.w = 0; });                    // re-measure the cards once the web fonts are in

  // ---- the engineer, stippled from the reference image (6 colour buckets: 3 bone, 3 ember)
  const JR_COL = ["rgb(140,139,135)", "rgb(200,199,194)", "rgb(246,245,241)", "rgb(196,112,52)", "rgb(240,158,84)", "rgb(255,216,165)"];
  let JR_FIG = null;
  {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = CROP.w; c.height = CROP.h;
      const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, CROP.w, CROP.h);
      let d; try { d = g.getImageData(0, 0, CROP.w, CROP.h).data; } catch (e) { return; }   // file:// blocks pixel reads
      const N = LOW ? 5500 : 11000, pts = [];
      for (let guard = 0; pts.length < N && guard < N * 60; guard++) {
        const x = Math.random() * CROP.w, y = Math.random() * CROP.h, i = ((y | 0) * CROP.w + (x | 0)) * 4;
        const r = d[i], gg = d[i + 1], b = d[i + 2], lum = (0.3 * r + 0.59 * gg + 0.11 * b) / 255;
        if (lum < 0.07 || Math.random() > Math.pow(lum, 1.05) * 1.3) continue;
        const warm = r - b > 45 && r > 100;
        pts.push({
          x: CROP.x + x, y: CROP.y + y, b: (warm ? 3 : 0) + (lum > 0.6 ? 2 : lum > 0.33 ? 1 : 0), a: clamp(0.35 + lum * 0.85),
          sx: rand(-1, 1) * 320, sy: rand(-1, 0.6) * 260, dl: rand(0, 0.45), ph: rand(0, 7),
          typing: x > 200 && x < 262 && y > 188 && y < 220,
        });
      }
      JR_FIG = pts.sort((p, q) => p.b - q.b);
    };
    img.src = "assets/journey-engineer.webp";
  }
  const JR_DOME = Array.from({ length: LOW ? 1100 : 2200 }, () => ({ u: Math.random(), r: 1 + gauss() * 0.045, a: rand(0.25, 1), v: rand(0.000012, 0.000035), ph: rand(0, 7), w: Math.random(), big: Math.random() < 0.05 }));
  const JR_EMBERS = [0.12, 0.2, 0.27, 0.315, 0.35, 0.4, 0.44];
  const JR_RING = Array.from({ length: 1500 }, (_, k) => [k / 1500 * Math.PI * 2 + rand(-0.001, 0.001), rand(0.4, 1), rand(-1, 1)]);
  const JR_ROWS = 44;
  const JR_DUNES = Array.from({ length: JR_ROWS }, (_, row) => Array.from({ length: Math.round((LOW ? 170 : 340) * (0.6 + 0.8 * row / JR_ROWS)) }, () => ({ x: Math.random(), j: gauss() * 0.4, a: rand(0.4, 1), ph: rand(0, 7) })));
  const JR_WARM = new Float32Array(2000 * 3);
  const hill = (X, d, T) => 0.6 * Math.sin(X * 0.0046 + d * 2.6 + T * 0.1) + 0.28 * Math.sin(X * 0.0093 - d * 3.4 - T * 0.07 + 1.3) + 0.12 * Math.sin(X * 0.019 + d * 5.1 + T * 0.13);
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
  let jrT0 = 0, jrLast = 0;

  function howDraw(t) {
    if (!inView(how)) { jrLast = 0; return; }
    const B = fit(howBack), { ctx, w, h } = fit(howCanvas), bctx = B.ctx;
    if (w !== JR.w || h !== JR.h || (VW < 760) !== JR.mobile) jrLayout(w, h);
    bctx.clearRect(0, 0, w, h); ctx.clearRect(0, 0, w, h);
    const { s, ox, oy, mobile } = JR, X = (x) => ox + x * s, Y = (y) => oy + y * s;
    if (!jrT0) jrT0 = t;
    const dt = jrLast ? Math.min(50, t - jrLast) : 16.7; jrLast = t;
    const T = t * 0.001, intro = REDUCED ? 1 : clamp((t - jrT0) / 2800);
    const flick = 0.88 + 0.08 * Math.sin(t * 0.013) + 0.04 * Math.sin(t * 0.031);
    const px = Math.max(1, Math.min(1.8, 1.15 * s));

    // ---- where the journey is: g runs 0..5; each stop dwells, then the orbit turns to the next
    const p = mobile ? (t * 0.00004) % 1 : prog(how);
    const ph = p * JN, base = Math.min(JN - 1, Math.floor(ph));
    const g = base + (base < JN - 1 ? smooth(0.58, 1, ph - base) : 0);
    setActive(clamp(Math.round(g), 0, JN - 1));
    const since = t - jrSwitched, flare = Math.exp(-since / 650);
    const cardsIn = REDUCED ? 1 : smooth(0.45, 0.9, intro);

    // ---- warm light from the screen (back)
    bctx.save(); bctx.globalCompositeOperation = "lighter";
    let gr = bctx.createRadialGradient(X(SCREEN.x), Y(SCREEN.y), 0, X(SCREEN.x), Y(SCREEN.y), 380 * s);
    gr.addColorStop(0, `rgba(255,120,40,${((0.12 + 0.08 * flare) * intro * flick).toFixed(3)})`); gr.addColorStop(1, "rgba(255,90,20,0)");
    bctx.fillStyle = gr; bctx.fillRect(0, 0, w, h);

    // ---- dome of drifting data (back)
    const domeIn = easeOut(intro * 1.5);
    for (const d of JR_DOME) {
      d.u += d.v * dt; if (d.u > 1) d.u -= 1;
      const th = Math.PI + d.u * Math.PI, x = X(DOME.cx + Math.cos(th) * DOME.rx * d.r), y = Y(DOME.cy + Math.sin(th) * DOME.ry * d.r);
      const warm = d.w < 0.9 * (1 - smooth(0.3, 0.52, d.u));
      const al = d.a * Math.pow(Math.sin(d.u * Math.PI), 0.6) * (0.55 + 0.45 * Math.sin(T * 2.1 + d.ph)) * domeIn * (warm ? 1 : 0.85);
      if (al < 0.03) continue;
      bctx.fillStyle = warm ? "rgb(255,140,60)" : `rgb(${BONE})`; bctx.globalAlpha = al;
      const sz = (d.big ? 2.1 : 1.2) * px; bctx.fillRect(x, y, sz, sz);
    }
    JR_EMBERS.forEach((u, i) => {
      const th = Math.PI + u * Math.PI, x = X(DOME.cx + Math.cos(th) * DOME.rx), y = Y(DOME.cy + Math.sin(th) * DOME.ry);
      bctx.globalAlpha = domeIn * (0.55 + 0.45 * Math.sin(T * 1.6 + i * 1.9));
      const r = (9 + (i % 3) * 3) * s; bctx.drawImage(glow, x - r, y - r, r * 2, r * 2);
    });
    bctx.restore(); bctx.globalAlpha = 1;

    // ---- orbit: far half on the back canvas, near half on the front
    const ringIn = easeOut(intro * 1.3);
    const ringXY = (a) => { const [x, y] = ringS(a); return [X(x), Y(y)]; };
    const inCrop = (x, y) => x > CROP.x && x < CROP.x + CROP.w && y > CROP.y && y < CROP.y + CROP.h;
    const waveR = since * 0.0024, waveA = Math.exp(-since / 900);
    const angDist = (a, b) => { const d = Math.abs(((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); return d; };
    const drawRing = (c, front) => {
      c.fillStyle = `rgb(${BONE})`;
      for (const [a, al, jt] of JR_RING) {
        if ((Math.sin(a) > 0) !== front) continue;
        if (((a - 3.63 + Math.PI * 4) % (Math.PI * 2)) / (Math.PI * 2) > ringIn) continue;
        const [sx, sy0] = ringS(a), sy = sy0 + jt * 1.2;
        if (front && JR_FIG && inCrop(sx, sy)) continue;                                // the image already has this stretch
        c.globalAlpha = al * (front ? 0.72 : 0.2) * (0.8 + 0.2 * Math.sin(T * 3 + a * 40));
        c.fillRect(X(sx), Y(sy), px, px);
      }
      // the switch wave: a ripple of ember running both ways round the orbit from the focus point
      if (waveA > 0.02) {
        c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = `rgb(${EMBER})`;
        for (const [a, al] of JR_RING) {
          if ((Math.sin(a) > 0) !== front) continue;
          const k = Math.exp(-Math.pow(angDist(a, FOCUS) - waveR, 2) / 0.012) * waveA;
          if (k < 0.03) continue;
          const [x, y] = ringXY(a); c.globalAlpha = k * al; c.fillRect(x - 0.6, y - 0.6, px * 1.6, px * 1.6);
        }
        c.restore();
      }
      c.globalAlpha = 1;
    };
    drawRing(bctx, false);
    if (ringIn > 0.9) for (const a of RING_BEADS) {
      const [x, y] = ringXY(a), c = Math.sin(a) < 0 ? bctx : ctx;
      c.fillStyle = `rgba(${BONE},.12)`; c.beginPath(); c.arc(x, y, 6 * s, 0, 7); c.fill();
      c.fillStyle = "rgba(250,248,240,.95)"; c.beginPath(); c.arc(x, y, Math.max(1.6, 2.6 * s), 0, 7); c.fill();
    }

    // ---- stems down into the dunes, a pulse running down each
    const stemIn = easeOut(intro * 1.4 - 0.35);
    STEMS.forEach(([sx, y0, y1], i) => {
      const x = X(sx), ya = Y(y0), yb = Y(lerp(y0, y1, stemIn));
      ctx.fillStyle = `rgba(${BONE},.3)`;
      for (let yy = ya; yy < yb; yy += 3.5 * Math.max(1, s)) ctx.fillRect(x - 0.5, yy, 1, 1.3);
      if (stemIn > 0.95) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(T * 2 + i); ctx.drawImage(glow, x - 7 * s, yb - 7 * s, 14 * s, 14 * s);
        const k = (T * 0.3 + i * 0.27) % 1; ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
        ctx.drawImage(glow, x - 8 * s, lerp(ya, yb, k) - 8 * s, 16 * s, 16 * s);
        ctx.restore();
        ctx.fillStyle = "rgba(255,220,180,.9)"; ctx.fillRect(x - 1.1, yb - 1.1, 2.2, 2.2);
      }
    });

    // ---- the engineer
    if (JR_FIG) {
      let lastB = -1;
      const breathe = Math.sin(T * 1.1) * 0.6;
      for (const q of JR_FIG) {
        const k = REDUCED ? 1 : easeOut((intro - q.dl) / 0.55);
        if (k <= 0) continue;
        let x = q.x + q.sx * (1 - k), y = q.y + q.sy * (1 - k) + (q.x < 960 ? breathe * (1 - (q.y - 250) / 310) : 0);
        if (q.typing) y += Math.sin(t * 0.03 + q.x * 1.3) * 0.7;
        const fade = 1 - smooth(528, 562, q.y);
        if (fade <= 0) continue;
        if (q.b !== lastB) { ctx.fillStyle = JR_COL[q.b]; lastB = q.b; }
        ctx.globalAlpha = Math.min(1, q.a * k * fade * (q.b >= 3 ? flick * (1 + 0.5 * flare) : 0.82 + 0.18 * Math.sin(t * 0.004 + q.ph)));
        ctx.fillRect(X(x), Y(y), px, px);
      }
      ctx.globalAlpha = 1;
    }
    // screen bloom, flaring each time a new stop opens
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    gr = ctx.createRadialGradient(X(SCREEN.x), Y(SCREEN.y), 0, X(SCREEN.x), Y(SCREEN.y), 90 * s * (1 + 0.6 * flare));
    gr.addColorStop(0, `rgba(255,160,80,${((0.28 + 0.35 * flare) * intro * flick).toFixed(3)})`); gr.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(X(SCREEN.x), Y(SCREEN.y), 90 * s * (1 + 0.6 * flare), 0, 7); ctx.fill();
    ctx.restore();

    drawRing(ctx, true);

    // ---- the stop cards (DOM), placed on the stage every frame
    const [fx, fy] = ringS(FOCUS);
    if (!mobile) jrCards.forEach((li, j) => {
      const o = j - g, H = jrCardH[j];
      const hang = (a, sc) => { const [x, y] = ringS(a); return [x, y - 18 - (H * sc) / 2]; };
      let cx = 0, cy = 0, sc = 1, op = 0, mini = 0, full = 0, front = false;
      if (o >= 1) {                                       // waiting on the far arc
        sc = CHIP_SC * (1 - (o - 1) * 0.07);
        [cx, cy] = hang(CHIP0 + (o - 1) * CHIP_STEP, sc);
        op = clamp(1.1 - (o - 1) * 0.17); mini = 1;
      } else if (o >= 0) {                                // lifting off the orbit into the focus panel
        const u = smooth(0, 1, 1 - o), [x0, y0] = hang(CHIP0, CHIP_SC);
        cx = lerp(x0, PANEL.x, u); cy = lerp(y0, PANEL.y, u) - Math.sin(u * Math.PI) * 70;
        sc = lerp(CHIP_SC, 1, u); op = 1; mini = 1 - smooth(0.25, 0.6, u); full = smooth(0.55, 0.95, u); front = u > 0.3;
      } else if (o > -0.5) {                              // finished: shrinking into the orbit at the focus point
        const u = smooth(0, 0.5, -o);
        cx = lerp(PANEL.x, fx, u); cy = lerp(PANEL.y, fy, u);
        sc = lerp(1, 0.05, u); op = 1 - u * u; full = 1 - smooth(0, 0.5, u); front = true;
      }
      op *= cardsIn;
      if (op <= 0.01) { if (li.style.visibility !== "hidden") li.style.visibility = "hidden"; return; }
      li.style.visibility = "visible";
      li.style.opacity = op.toFixed(3);
      li.style.transform = `translate(${(cx * s).toFixed(1)}px, ${(cy * s).toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(4)})`;
      li.style.setProperty("--mini", mini.toFixed(3));
      li.style.setProperty("--full", full.toFixed(3));
      li.classList.toggle("front", front);
      // a short dotted tether from each waiting card down to its point on the orbit
      if (o >= 1) {
        const [ax, ay] = ringXY(CHIP0 + (o - 1) * CHIP_STEP);
        bctx.fillStyle = `rgba(${BONE},${(0.4 * op).toFixed(3)})`;
        for (let yy = ay - 18 * s; yy < ay - 2; yy += 3) bctx.fillRect(ax - 0.5, yy, 1, 1.2);
        bctx.fillStyle = `rgba(${BONE},${(0.9 * op).toFixed(3)})`; bctx.beginPath(); bctx.arc(ax, ay, Math.max(1.4, 2.2 * s), 0, 7); bctx.fill();
      }
    });

    // ---- the lit trail: the near arc turns ember from the focus point up to the newest milestone (or the comet)
    let done = 0; for (let j = 0; j < JN; j++) if (j - g <= -1 + 1e-6) done = j + 1;
    let trailEnd = done ? MILES[done - 1] : FOCUS, comet = -1;
    const cj = done; if (cj < JN && cj - g < -0.5) { comet = lerp(FOCUS, MILES[cj], smooth(-0.5, -1, cj - g)); trailEnd = comet; }
    if (trailEnd < FOCUS && cardsIn > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let a = FOCUS; a > trailEnd; a -= 0.004) {
        const [x, y] = ringXY(a);
        ctx.fillStyle = `rgba(255,${(150 + 60 * Math.sin(a * 30 + T * 2)) | 0},80,${(0.55 * cardsIn).toFixed(3)})`;
        ctx.fillRect(x - 0.7, y - 0.7, 1.6 * px, 1.6 * px);
      }
      ctx.restore();
    }
    if (comet >= 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 60; k++) {
        const q = Math.pow(1 - k / 60, 1.5), [x, y] = ringXY(comet + k * 0.006);
        ctx.fillStyle = `rgba(255,${(120 + q * 110) | 0},${(40 + q * 80) | 0},${(q * 0.95).toFixed(3)})`;
        ctx.fillRect(x - 1, y - 1, 2.2 * px, 2.2 * px);
      }
      ctx.restore();
      const [x, y] = ringXY(comet); drawSun(ctx, x, y, 4.2 * Math.max(0.7, s), t, 1, 0);
    }

    // ---- tether from the focus panel to the orbit, and the sun that marks the focus point
    if (!mobile && jrActive >= 0 && cardsIn > 0) {
      const o = jrActive - g, vis = cardsIn * (1 - smooth(0, 0.35, Math.abs(o)));
      const [tx, ty] = [X(PANEL.x), Y(PANEL.y + jrCardH[jrActive] / 2)], [qx, qy] = ringXY(FOCUS);
      ctx.fillStyle = `rgba(${EMBER},${(0.6 * vis).toFixed(3)})`;
      for (let k = 0; k <= 1; k += 0.06) ctx.fillRect(lerp(tx, qx, k) - 0.6, lerp(ty, qy, k) - 0.6, 1.3, 1.3);
    }
    { const [x, y] = ringXY(FOCUS); drawSun(ctx, x, y, (5.2 + 2 * flare) * Math.max(0.7, s), t, cardsIn, 0); }
    // a second sun keeps circling the orbit, passing behind the engineer on the far side
    if (intro > 0.35) {
      const sa = easeOut((intro - 0.35) / 0.5), a0 = T * 0.06 + p * 2.2 + 0.4, c = Math.sin(a0) < 0 ? bctx : ctx;
      c.save(); c.globalCompositeOperation = "lighter";
      for (let k = 0; k < 110; k++) {
        const q = Math.pow(1 - k / 110, 1.6), [x, y] = ringXY(a0 - k * 0.006);
        c.fillStyle = `rgba(255,${(110 + q * 110) | 0},${(30 + q * 60) | 0},${(q * 0.8 * sa * (Math.sin(a0) < 0 ? 0.6 : 1)).toFixed(3)})`;
        c.fillRect(x - 0.8, y - 0.8, 1.8 * px, 1.8 * px);
      }
      c.restore();
      const [x, y] = ringXY(a0); drawSun(c, x, y, 4.6 * Math.max(0.7, s), t, sa * (Math.sin(a0) < 0 ? 0.6 : 1), 0);
    }

    // ---- particle hills: rows drawn back to front, each one blotting out the rows behind it so the hills read as
    // real silhouettes; crests catch the light, valleys fall dark, warm under the screen glow
    const dIn = easeOut(intro * 1.3), step = 8;
    for (let row = 0; row < JR_ROWS; row++) {
      const dep = (row + 0.5) / JR_ROWS, base = 596 + Math.pow(dep, 1.3) * 165, amp = 38 + 88 * dep;
      const surf = (xs) => { const Xs = (xs - ox) / s, hv = hill(Xs, dep, T); return [Xs, hv, Y(base - amp * (hv + 1) / 2)]; };
      ctx.fillStyle = "#0a0a0b"; ctx.beginPath(); ctx.moveTo(-step, h);
      for (let xs = -step; xs <= w + step; xs += step) ctx.lineTo(xs, surf(xs)[2] + 2.5);
      ctx.lineTo(w + step, h); ctx.closePath(); ctx.fill();
      let nw = 0;
      ctx.fillStyle = `rgb(${BONE})`;
      const sz = px * (0.85 + dep * 0.75);
      for (const d of JR_DUNES[row]) {
        const sxv = d.x * w, [Xs, hv, y0] = surf(sxv), c = (hv + 1) / 2;
        const yv = y0 + d.j * 2;
        if (yv > h + 2) continue;
        const slope = hill(Xs + 7, dep, T) - hv, light = clamp(0.12 + c * 0.88 - slope * 4);
        const al = d.a * (0.05 + 0.95 * Math.pow(light, 1.6)) * (0.35 + 0.65 * Math.sqrt(dep)) * (0.82 + 0.18 * Math.sin(T * 2 + d.ph)) * dIn;
        if (al < 0.02) continue;
        const warm = Math.exp(-Math.pow((Xs - 900) / 430, 2)) * c * c * 1.5;
        if (warm > 0.42 && nw < 2000) { JR_WARM[nw * 3] = sxv; JR_WARM[nw * 3 + 1] = yv; JR_WARM[nw * 3 + 2] = al * (0.7 + 0.5 * warm); nw++; continue; }
        ctx.globalAlpha = clamp(al); ctx.fillRect(sxv, yv, sz, sz);
      }
      ctx.fillStyle = "rgb(255,170,100)";
      for (let i = 0; i < nw; i++) { ctx.globalAlpha = clamp(JR_WARM[i * 3 + 2]); ctx.fillRect(JR_WARM[i * 3], JR_WARM[i * 3 + 1], sz * 1.15, sz * 1.15); }
      ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    gr = ctx.createRadialGradient(X(900), Y(640), 0, X(900), Y(640), 520 * s);
    gr.addColorStop(0, `rgba(255,120,40,${(0.07 * dIn * flick).toFixed(3)})`); gr.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = gr; ctx.fillRect(0, Y(540), w, h);
    ctx.restore();

    // ---- milestones on the near arc: hollow until reached, pulsing for the open stop, lit (with their name) once done
    if (cardsIn > 0) {
      ctx.font = `500 ${Math.max(8, 9.5 * s).toFixed(1)}px "Geist Mono", ui-monospace, monospace`; ctx.textAlign = "center";
      for (let j = 0; j < JN; j++) {
        const [x, y] = ringXY(MILES[j]), o = j - g, lit = o <= -0.999, open = j === jrActive && !lit;
        const r = Math.max(2.4, 3.6 * s);
        ctx.globalAlpha = cardsIn;
        if (lit) {
          ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(glow, x - 14 * s, y - 14 * s, 28 * s, 28 * s); ctx.restore();
          ctx.fillStyle = "rgb(255,236,210)"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        } else {
          ctx.strokeStyle = open ? `rgba(${EMBER},${(0.6 + 0.4 * Math.sin(T * 4)).toFixed(3)})` : `rgba(${BONE},.3)`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, open ? r * (1.3 + 0.25 * Math.sin(T * 4)) : r, 0, 7); ctx.stroke();
          if (open) { ctx.fillStyle = `rgb(${EMBER})`; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 7); ctx.fill(); }
        }
        ctx.fillStyle = lit ? "rgba(255,214,180,.92)" : open ? `rgba(${EMBER},.85)` : `rgba(${BONE},.28)`;
        ctx.shadowColor = "rgba(10,10,11,.95)"; ctx.shadowBlur = 6;
        ctx.fillText(jrLabels[j], x, y + 20 * Math.max(0.8, s));
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- EXIT tunnel
  const exit = $("#exit"), exitCanvas = $("#exitCanvas"), exitFade = $("#exitFade"), exitCopy = $("#exitCopy");
  function archPts(W, Hh, n, thick) {
    const pts = [], r = W / 2, straight = Hh - r, L = straight * 2 + Math.PI * r;
    for (let i = 0; i < n; i++) {
      let s = Math.random() * L, x, y;
      if (s < straight) { x = -r; y = s; } else if (s < straight + Math.PI * r) { const a = Math.PI - (s - straight) / r; x = Math.cos(a) * r; y = straight + Math.sin(a) * r; } else { x = r; y = s - straight - Math.PI * r; }
      pts.push([x + gauss() * thick, y + gauss() * thick, rand(0.3, 1)]);
    }
    return pts;
  }
  const arches = Array.from({ length: 7 }, (_, i) => ({ z: 1.4 + i * 1.3, pts: archPts(2.6 - i * 0.12, 3.2 - i * 0.12, 900, 0.018) }));
  const door = (() => { const pts = [], W = 0.9, Hh = 1.3, r = W / 2; for (let i = 0; i < 2600; i++) { const x = rand(-r, r), y = rand(0, Hh); if (y > Hh - r && Math.hypot(x, y - (Hh - r)) > r) continue; if ((Math.abs(x) < 0.065 && y < 0.5) || Math.hypot(x, y - 0.58) < 0.07 || (Math.abs(x) < 0.11 && y > 0.28 && y < 0.5)) continue; pts.push([x, y, rand(0.4, 1)]); } return { z: 10.8, pts }; })();
  function exitDraw() {
    if (!inView(exit)) { return; }
    const { ctx, w, h } = fit(exitCanvas);
    ctx.clearRect(0, 0, w, h);
    const p = prog(exit), cam = smooth(0, 1, p) * 10.4;
    const F = Math.min(w, h) * 0.55, eye = 1.0, cx = w / 2, cy = h * 0.56;
    const proj = (x, y, z) => { const dz = z - cam; if (dz <= 0.05) return null; const s = F / dz; return [cx + x * s, cy + (eye - y) * s, s]; };
    for (const a of arches) {
      const dz = a.z - cam; if (dz <= 0.05) continue;
      const fade = clamp(dz / 1.2) * clamp(1.4 - dz / 9);
      ctx.fillStyle = `rgb(${BONE})`;
      for (const [x, y, al] of a.pts) { const q = proj(x, y, a.z); if (!q) continue; ctx.globalAlpha = al * fade; ctx.fillRect(q[0], q[1], 1.4, 1.4); }
    }
    // door + reflection
    const dz = door.z - cam;
    ctx.fillStyle = `rgb(${BONE})`;
    for (const [x, y, al] of door.pts) {
      const q = proj(x, y, door.z); if (!q) continue;
      ctx.globalAlpha = al; ctx.fillRect(q[0], q[1], 1.5, 1.5);
      if (Math.random() < 0.25) { const r2 = proj(x, -y * 0.6, door.z); if (r2) { ctx.globalAlpha = al * 0.18; ctx.fillRect(r2[0], r2[1], 1.4, 1.4); } }
    }
    ctx.globalAlpha = 1;
    exitFade.style.opacity = smooth(0.82, 0.99, p);
    exitCopy.style.opacity = 1 - smooth(0.1, 0.32, p);
    exitCopy.style.transform = `translateY(${-p * 60}px)`;
  }

  // ---------------------------------------------------------------- AMBIENT backdrop (About, Numbers, Credentials, Questions)
  // A big dotted planet with a thin ring and a glowing sun riding it, rolling particle dunes across the bottom,
  // and a small seated figure on the dunes.
  const amb = $("#ambient");
  // planet surface: random speckle (not a lattice), each dot with its own brightness
  const AMB_SPHERE = Array.from({ length: VW < 760 ? 2600 : 5200 }, () => {
    const z = rand(-1, 1), t2 = rand(0, Math.PI * 2), r = Math.sqrt(1 - z * z);
    return [r * Math.cos(t2), z, r * Math.sin(t2), Math.pow(Math.random(), 1.6) * 0.85 + 0.15, Math.random() < 0.08 ? 1.6 : 1.05];
  });
  // two thin rings at different tilts
  const AMB_RINGS = [
    { rx: 1.95, ry: 0.27, tilt: -0.05, ox: 0, oy: 0.02, n: 1300, a: 0.42 },
    { rx: 2.05, ry: 0.42, tilt: 0.2, ox: 0.18, oy: 0.3, n: 1400, a: 0.5 },
  ].map((rg) => ({ ...rg, pts: Array.from({ length: rg.n }, (_, k) => [k / rg.n * Math.PI * 2, rand(0.35, 1)]) }));
  const DUNES = Array.from({ length: VW < 760 ? 9000 : LOW ? 15000 : 26000 }, () => ({ x: rand(-1.5, 1.5), z: Math.pow(Math.random(), 0.75), a: rand(0.35, 1), ph: rand(0, 6) }));
  const duneH = (X, Z, t) => 0.38 * Math.sin(X * 0.85 + Z * 0.55 + t * 0.22) + 0.22 * Math.sin(X * 1.7 - Z * 1.15 - t * 0.17) + 0.1 * Math.sin(X * 3.3 + Z * 2.4 + t * 0.29);
  function ambDraw(t) {
    if (!amb.classList.contains("on")) return;
    const { ctx, w, h } = fit(amb);
    ctx.clearRect(0, 0, w, h);
    const T = t * 0.001, mobile = w < 760;

    // ---- planet (speckled, slowly spinning) with two rings and a sun riding the tilted one
    const R = Math.min(w, h) * (mobile ? 0.25 : 0.22), pcx = w * (mobile ? 0.7 : 0.62), pcy = h * 0.34, rot = T * 0.05;
    const cr = Math.cos(rot), sr = Math.sin(rot), tilt = 0.28, ct = Math.cos(tilt), st = Math.sin(tilt);
    const ringPt = (rg, a2) => {
      const ex = Math.cos(a2) * rg.rx * R, ey = Math.sin(a2) * rg.ry * R, c = Math.cos(rg.tilt), sn = Math.sin(rg.tilt);
      return [pcx + rg.ox * R + ex * c - ey * sn, pcy + rg.oy * R + ex * sn + ey * c, Math.sin(a2) > 0];
    };
    const behindPlanet = (x, y) => Math.hypot(x - pcx, y - pcy) < R * 0.99;
    const ringB = AMB_RINGS[1], sunA = T * 0.28;
    const drawRings = (front) => {
      ctx.fillStyle = `rgb(${BONE})`;
      for (const rg of AMB_RINGS) for (const [a2, al] of rg.pts) {
        const [x, y, f] = ringPt(rg, a2);
        if (f !== front || (!front && behindPlanet(x, y))) continue;
        ctx.globalAlpha = al * rg.a * (front ? 1 : 0.5);
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
      // the sun's trail lights the ring orange behind it
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 140; k++) {
        const a2 = sunA - k * 0.008, [x, y, f] = ringPt(ringB, a2);
        if (f !== front || (!front && behindPlanet(x, y))) continue;
        const q = Math.pow(1 - k / 140, 1.6);
        ctx.fillStyle = `rgba(255,${(110 + q * 110) | 0},${(30 + q * 60) | 0},${q * (front ? 0.95 : 0.5)})`;
        ctx.fillRect(x - 0.6, y - 0.6, 1.6, 1.6);
      }
      ctx.restore();
      const [sx, sy, sf] = ringPt(ringB, sunA);
      if (sf === front && (front || !behindPlanet(sx, sy))) {
        drawSun(ctx, sx, sy, front ? 4.4 : 3.2, t, front ? 1 : 0.6, 0);
        // a crisp little sparkle on top
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(255,230,180,${front ? 0.85 : 0.45})`; ctx.lineWidth = 1;
        const fl = (front ? 7 : 5) * (0.85 + 0.15 * Math.sin(t * 0.011));
        ctx.beginPath(); ctx.moveTo(sx - fl, sy); ctx.lineTo(sx + fl, sy); ctx.moveTo(sx, sy - fl); ctx.lineTo(sx, sy + fl); ctx.stroke(); ctx.restore();
      }
    };
    drawRings(false);
    // body: a dark disc hides what is behind it, then the speckle
    ctx.fillStyle = "rgba(10,10,11,.92)"; ctx.beginPath(); ctx.arc(pcx, pcy, R, 0, 7); ctx.fill();
    ctx.fillStyle = `rgb(${BONE})`;
    for (const [x, y, z, al, sz] of AMB_SPHERE) {
      const x1 = x * cr + z * sr, z1 = -x * sr + z * cr;        // spin
      const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;       // axial tilt
      if (z2 > 0.02) continue;                                  // far side
      const limb = Math.pow(1 - Math.abs(z2), 2.2);             // brighter towards the rim
      const shade = 0.75 + 0.25 * clamp(-x1 * 0.6 - y2 * 0.4 + 0.3);
      ctx.globalAlpha = Math.min(1, al * (0.42 + 0.62 * limb) * shade);
      ctx.fillRect(pcx + x1 * R, pcy + y2 * R, sz, sz);
    }
    ctx.globalAlpha = 1;
    drawRings(true);

    // ---- dunes
    const hor = h * (mobile ? 0.64 : 0.6), F = h * 0.95, camH = 1.05;
    ctx.fillStyle = `rgb(${BONE})`;
    let seatX = w * (mobile ? 0.86 : 0.93), seatY = h;
    for (const d of DUNES) {
      const Z = 0.55 + d.z * 7.5, X = d.x * Z * 0.75;
      const hh = duneH(X, Z, T), slope = duneH(X + 0.08, Z, T) - hh;
      const sx = w / 2 + (X * F) / Z * 0.9, sy = hor + ((camH - hh * 0.55) * F) / Z * 0.42;
      if (sx < -4 || sx > w + 4 || sy > h + 4) continue;
      const light = clamp(0.4 + slope * 9);
      const near = 1 - d.z;
      ctx.globalAlpha = clamp(d.a * (0.22 + 0.75 * near) * (0.18 + 0.95 * light) * (0.8 + 0.2 * Math.sin(T * 2 + d.ph)));
      const sz = near > 0.65 ? 1.7 : near > 0.35 ? 1.3 : 1;
      ctx.fillRect(sx, sy, sz, sz);
    }
    ctx.globalAlpha = 1;
    // where the dunes sit under the seated figure
    {
      const Z = 2.6, X = ((seatX - w / 2) / 0.9) * Z / F, hh = duneH(X, Z, T);
      seatY = hor + ((camH - hh * 0.55) * F) / Z * 0.42;
    }

    // ---- seated figure on the dunes
    const fh = h * (mobile ? 0.06 : 0.075);
    ctx.fillStyle = `rgb(${BONE})`;
    for (const [fx, fy, fa] of SEATED_PTS) { ctx.globalAlpha = fa * 0.9; ctx.fillRect(seatX + fx * fh, seatY - fy * fh, 1.1, 1.1); }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- footer mark (striped "SV")
  let footArt;
  document.fonts.ready.then(() => {
    footArt = new DotArt($("#footMark"), null, {
      n: VW < 760 ? 3000 : 6500, rgb: INK,
      draw(g, w, h) {
        g.font = `700 ${h * 1.02}px Geist, system-ui, sans-serif`;
        g.textBaseline = "alphabetic";
        const tw = g.measureText("SV").width, s = Math.min(1, (w * 0.98) / tw);
        g.save(); g.scale(s, s); g.fillText("SV", 0, h * 0.86 / s); g.restore();
        // stripe mask
        g.globalCompositeOperation = "destination-out";
        const step = h / 11;
        for (let y = -w; y < h + w; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y - w * 0.18); g.lineTo(w, y - w * 0.18 + step * 0.38); g.lineTo(0, y + step * 0.38); g.fill(); }
        g.globalCompositeOperation = "source-over";
      },
    });
  });

  // ---------------------------------------------------------------- contact typewriter
  const typer = $("#typer"), promptLis = $$("#prompts li");
  const LINES = promptLis.map((li) => li.textContent.trim());
  let tIdx = 0, tChar = 0, tDir = 1, tHold = 0, tLast = 0, pinned = false;
  function typeTick(now) {
    if (pinned || !inView($("#contact"))) return;
    const speed = tDir > 0 ? 45 : 18;
    if (now - tLast < speed) return; tLast = now;
    if (tHold > 0) { tHold -= speed; return; }
    const s = LINES[tIdx];
    tChar += tDir;
    if (tChar >= s.length) { tDir = -1; tHold = 1800; }
    if (tChar <= 0) { tDir = 1; tIdx = (tIdx + 1) % LINES.length; tHold = 250; }
    typer.textContent = s.slice(0, Math.max(0, tChar));
    promptLis.forEach((li, i) => li.classList.toggle("on", i === tIdx));
  }
  promptLis.forEach((li, i) => li.addEventListener("click", () => {
    pinned = true; typer.textContent = LINES[i];
    promptLis.forEach((l, k) => l.classList.toggle("on", k === i));
    $(".btn-dark").href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Hello Siddhartha") + "&body=" + encodeURIComponent(LINES[i]);
    setTimeout(() => { pinned = false; tIdx = i; tChar = LINES[i].length; tDir = -1; tHold = 2500; }, 6000);
  }));

  // ---------------------------------------------------------------- reveal on scroll
  const revIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revIO.unobserve(e.target); } }), { threshold: 0.2 });
  $$("[data-reveal]").forEach((el) => revIO.observe(el));

  // ---------------------------------------------------------------- HUD (chapter index) + paper mode
  const chapters = $$(".ch"), ticks = $("#hudTicks");
  ticks.innerHTML = chapters.map(() => "<i></i>").join("");
  $("#hudTotal").textContent = "/" + String(chapters.length).padStart(2, "0");
  const tickEls = $$("i", ticks);
  let lastCh = -1;
  function hudUpdate() {
    let cur = 0;
    chapters.forEach((c, i) => { if (c.getBoundingClientRect().top <= VH * 0.5) cur = i; });
    if (cur !== lastCh) {
      lastCh = cur;
      $("#hudNum").textContent = String(cur + 1).padStart(2, "0");
      $("#hudName").textContent = chapters[cur].dataset.ch;
      tickEls.forEach((t, i) => t.classList.toggle("on", i === cur));
    }
    const contactTop = $("#contact").getBoundingClientRect().top;
    const exitP = prog(exit);
    document.body.classList.toggle("on-paper", contactTop < 40 || (inView(exit) && exitP > 0.9));
    const c = chapters[cur];
    amb.classList.toggle("on", !!c.dataset.amb || c.id === "you");
  }

  // ---------------------------------------------------------------- main loop
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(50, now - last); last = now;
    cur.x += (mouse.x - cur.x) * 0.18; cur.y += (mouse.y - cur.y) * 0.18;
    cursor.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
    hudUpdate(); sidesUpdate(); proofUpdate();
    youArt.frame(now);
    pcArt.frame(now); if (pcVal) pcVal.frame(now); sparkDraw(now); statArts.forEach((a) => a.frame(now));
    if (footArt) footArt.frame(now);
    howDraw(now); exitDraw(); ambDraw(now); typeTick(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  addEventListener("resize", () => { VW = innerWidth; VH = innerHeight; sideIdx = -1; }, { passive: true });
})();
