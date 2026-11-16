/* Hero scene.
   1. Load: particles gather into a portrait sampled from assets/portrait.webp, with an orange star orbiting it.
   2. Scroll: the portrait swirls apart into a see-through particle box: dotted edges, faint faces, and inside
      a chaotic cluster that keeps organising itself into circuit-like structure. Rings, planets, an ember,
      floating status labels and a seated "ME" on the lid.
   3. Scroll on: the box unfolds, faces bending like paper, into a flat net that glows at each face's centre,
      with a standing figure beside it. */
(() => {
  "use strict";
  const hero = document.getElementById("hero");
  const canvas = document.getElementById("heroCanvas");
  if (!hero || !canvas) return;

  // ------------------------------------------------------------ utils
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BONE = "236,235,230", EMBER = "255,106,43";
  const TAU = Math.PI * 2;

  const mouse = { x: -9999, y: -9999, nx: 0.5, ny: 0.5 };
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = e.clientX / innerWidth; mouse.ny = e.clientY / innerHeight;
  }, { passive: true });

  const glow = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 96;
    const g = c.getContext("2d"), gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, "rgba(255,214,150,1)"); gr.addColorStop(0.12, "rgba(255,150,70,.9)");
    gr.addColorStop(0.35, "rgba(255,106,43,.35)"); gr.addColorStop(1, "rgba(255,106,43,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 96, 96); return c;
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

  function silhouette(W, H, base, cx, n, draw) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.fillStyle = g.strokeStyle = "#fff"; g.lineCap = g.lineJoin = "round";
    draw(g);
    const d = g.getImageData(0, 0, W, H).data, on = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 100) {
        const edge = [-2, 2].some((o) => (d[((y + o) * W + x) * 4 + 3] | 0) < 60 || (d[(y * W + x + o) * 4 + 3] | 0) < 60);
        on.push([(x - cx) / H, (base - y) / H, edge]);
      }
    }
    return Array.from({ length: n }, () => { const p = on[(Math.random() * on.length) | 0]; return [p[0] + gauss() * 0.004, p[1] + gauss() * 0.004, p[2] ? rand(0.85, 1) : rand(0.5, 0.95)]; });
  }
  const seg = (g, w, pts) => { g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](x, y)); g.stroke(); };
  const SEATED = silhouette(70, 80, 76, 30, 2200, (g) => {
    g.beginPath(); g.arc(25, 11, 7.5, 0, TAU); g.fill();
    seg(g, 4.5, [[25, 17], [24, 22]]); seg(g, 12, [[25, 26], [21, 42], [22, 62]]);
    g.beginPath(); g.ellipse(25, 68, 11, 8, 0, 0, TAU); g.fill();
    seg(g, 10, [[24, 64], [47, 45]]); seg(g, 7.5, [[48, 45], [52, 71]]); seg(g, 5, [[50, 73], [60, 74]]); seg(g, 5, [[28, 28], [40, 44], [47, 49]]);
  });
  const STANDING = silhouette(40, 120, 118, 20, 2600, (g) => {
    g.beginPath(); g.arc(20, 10, 7, 0, TAU); g.fill();
    seg(g, 4, [[20, 16], [20, 22]]);
    g.beginPath(); g.roundRect(11, 22, 18, 44, 7); g.fill();
    seg(g, 5, [[13, 26], [9, 50], [10, 64]]); seg(g, 5, [[27, 26], [30, 50], [29, 64]]);
    seg(g, 7.5, [[16, 64], [16, 114]]); seg(g, 7.5, [[24, 64], [24, 114]]);
    seg(g, 4, [[13, 116], [19, 116]]); seg(g, 4, [[21, 116], [28, 116]]);
  });

  // ------------------------------------------------------------ particles
  // indices [0, N) form the box shell; [N, N+NI) are the inside of the box. All of them draw the portrait first.
  const MOBILE = innerWidth < 760;
  const LOW = MOBILE || (navigator.hardwareConcurrency || 8) <= 4;
  const N = MOBILE ? 12000 : LOW ? 18000 : 28000;
  const NI = MOBILE ? 5000 : LOW ? 8000 : 12000;
  const M = N + NI;
  const cloud = new Float32Array(M * 3);
  const U = new Float32Array(N), V = new Float32Array(N);
  const face = new Uint8Array(N), pin = new Uint8Array(N);
  const base = new Float32Array(N), life = new Float32Array(N);
  const ph = new Float32Array(M), fr = new Float32Array(M), swirl = new Float32Array(M);
  const PX = new Float32Array(M), PY = new Float32Array(M), PL = new Float32Array(M);
  const ox = new Float32Array(M), oy = new Float32Array(M), px = new Float32Array(M), py = new Float32Array(M);
  const isEmb = new Uint8Array(M);
  const LV = 16, lvCount = new Int32Array(LV), lvIdx = Array.from({ length: LV }, () => new Int32Array(M));
  const embIdx = new Int32Array(M); let embCount = 0;
  const netC = [[0, 0], [0, -2], [0, 2], [-2, 0], [2, 0], [0, 4]];

  for (let i = 0; i < M; i++) {
    const th = rand(0, TAU), phi = Math.acos(rand(-1, 1)), r = 2.4 * Math.cbrt(Math.random());
    cloud[i * 3] = r * Math.sin(phi) * Math.cos(th) * 1.4; cloud[i * 3 + 1] = r * Math.cos(phi) * 0.9; cloud[i * 3 + 2] = r * Math.sin(phi) * Math.sin(th);
    ph[i] = rand(0, TAU); fr[i] = rand(0.5, 2.4); swirl[i] = gauss() * 160;
    PX[i] = 0.5 + gauss() * 0.3; PY[i] = 0.5 + gauss() * 0.3; PL[i] = 0;
  }
  for (let i = 0; i < N; i++) {
    face[i] = i % 6;
    let u = rand(-1, 1), v = rand(-1, 1);
    const k = Math.random();
    if (k < 0.14) { pin[i] = 1; u = Math.sign(u) * (1 - Math.random() * 0.008); }
    else if (k < 0.28) { pin[i] = 2; v = Math.sign(v) * (1 - Math.random() * 0.008); }
    U[i] = u; V[i] = v;
    base[i] = pin[i] ? rand(0.6, 1) : 0.2 + Math.pow(Math.random(), 1.4) * 0.8;
    life[i] = !pin[i] && Math.random() < 0.03 ? Math.random() : -1;
  }

  // the inside: chaos <-> circuit
  const IC = new Float32Array(NI * 3), IS = new Float32Array(NI * 3), Ia = new Float32Array(NI);
  (() => {
    const G = [-0.62, -0.31, 0, 0.31, 0.62];
    const segs = [];
    for (let s = 0; s < 46; s++) {
      const a = [G[(Math.random() * 5) | 0], G[(Math.random() * 5) | 0], G[(Math.random() * 5) | 0]];
      const axis = (Math.random() * 3) | 0, b = a.slice();
      b[axis] = G[(Math.random() * 5) | 0];
      if (b[axis] === a[axis]) b[axis] = -a[axis] || 0.62;
      segs.push([a, b]);
    }
    for (let i = 0; i < NI; i++) {
      const th = rand(0, TAU), phi = Math.acos(rand(-1, 1)), r = 0.78 * Math.pow(Math.random(), 0.7);
      const lump = 1 + 0.25 * Math.sin(th * 3) * Math.cos(phi * 2);
      IC[i * 3] = r * lump * Math.sin(phi) * Math.cos(th); IC[i * 3 + 1] = r * lump * Math.cos(phi) * 0.9; IC[i * 3 + 2] = r * lump * Math.sin(phi) * Math.sin(th);
      const q = Math.random();
      if (q < 0.18) {
        const t2 = rand(0, TAU), p2 = Math.acos(rand(-1, 1)), rr = 0.15;
        IS[i * 3] = rr * Math.sin(p2) * Math.cos(t2); IS[i * 3 + 1] = rr * Math.cos(p2); IS[i * 3 + 2] = rr * Math.sin(p2) * Math.sin(t2);
      } else if (q < 0.26) {
        const sgm = segs[(Math.random() * segs.length) | 0][Math.random() < 0.5 ? 0 : 1];
        IS[i * 3] = sgm[0] + gauss() * 0.025; IS[i * 3 + 1] = sgm[1] + gauss() * 0.025; IS[i * 3 + 2] = sgm[2] + gauss() * 0.025;
      } else {
        const [a, b] = segs[(Math.random() * segs.length) | 0], t = Math.random();
        IS[i * 3] = lerp(a[0], b[0], t) + gauss() * 0.006; IS[i * 3 + 1] = lerp(a[1], b[1], t) + gauss() * 0.006; IS[i * 3 + 2] = lerp(a[2], b[2], t) + gauss() * 0.006;
      }
      Ia[i] = rand(0.35, 1);
      isEmb[N + i] = Math.hypot(IC[i * 3], IC[i * 3 + 1], IC[i * 3 + 2]) < 0.18 && Math.random() < 0.4 ? 1 : 0;
    }
  })();

  // icons for the six net faces, taken from the skill tiles' SVGs so the hero net matches the section below.
  // About 40% of each face's particles gather into its icon once the net is laid flat.
  const FACE_TILE = [2, 0, 4, 1, 3, 5];   // face -> tile: front=centre, top, bottom, left, right, back(bottom-most)
  const hasIcon = new Uint8Array(N), ICU = new Float32Array(N), ICV = new Float32Array(N);
  const TILE_LABELS = [...document.querySelectorAll("#net .tile > span")].map((el) => el.textContent.trim().toUpperCase());
  const iconImgs = [...document.querySelectorAll("#net .tile svg")].map((svg) => {
    const c = svg.cloneNode(true);
    c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", "200"); c.setAttribute("height", "160");
    c.querySelectorAll("*").forEach((el) => {
      el.setAttribute("fill", "none"); el.setAttribute("stroke", "#fff"); el.setAttribute("stroke-linecap", "round"); el.setAttribute("stroke-linejoin", "round");
      if (el.classList.contains("teeth")) { el.setAttribute("stroke-width", "9"); el.setAttribute("stroke-dasharray", "4 5"); el.setAttribute("stroke-linecap", "butt"); }
      else el.setAttribute("stroke-width", "4.4");
    });
    const im = new Image(); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(c.outerHTML); return im;
  });
  let iconsBuilt = false;
  function buildIcons() {
    iconsBuilt = true;
    const byFace = [[], [], [], [], [], []];
    for (let i = 0; i < N; i++) if (!pin[i] && life[i] < 0) byFace[face[i]].push(i);
    for (let f = 0; f < 6; f++) {
      const im = iconImgs[FACE_TILE[f]]; if (!im) continue;
      const iw = 200, ih = 160, c = document.createElement("canvas"); c.width = iw; c.height = ih;
      const g = c.getContext("2d"); g.drawImage(im, 0, 0, iw, ih);
      const d = g.getImageData(0, 0, iw, ih).data, on = [];
      for (let y = 0; y < ih; y += 1) for (let x = 0; x < iw; x += 1) if (d[(y * iw + x) * 4 + 3] > 90) on.push(x, y);
      const cnt = on.length / 2; if (!cnt) continue;
      const want = Math.min(Math.round(byFace[f].length * 0.42), Math.round(cnt * 0.9));
      for (let k = 0; k < want; k++) {
        const i = byFace[f][k], q = (Math.random() * cnt) | 0;
        ICU[i] = (on[q * 2] / iw - 0.5) * 1.5 + gauss() * 0.006;
        ICV[i] = (on[q * 2 + 1] / ih - 0.5) * 1.2 + 0.06 + gauss() * 0.006;
        hasIcon[i] = 1;
      }
    }
  }

  // portrait: brightness-weighted sampling of the photo
  let portraitAspect = 0.8, portraitReady = false, portraitT = 0;
  const img = new Image();
  img.onload = () => {
    portraitAspect = img.naturalWidth / img.naturalHeight;
    const W = 300, H = Math.round(W / portraitAspect);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    const lum = new Float32Array(W * H), cdf = new Float32Array(W * H);
    let acc = 0;
    for (let i = 0; i < W * H; i++) {
      const l = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      lum[i] = l; acc += l > 0.07 ? Math.pow(l, 1.35) : 0; cdf[i] = acc;
    }
    for (let i = 0; i < M; i++) {
      const t = Math.random() * acc;
      let lo = 0, hi = W * H - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < t) lo = m + 1; else hi = m; }
      PX[i] = (lo % W + Math.random()) / W; PY[i] = (((lo / W) | 0) + Math.random()) / H; PL[i] = lum[lo];
    }
    portraitReady = true; portraitT = performance.now();
  };
  img.src = "assets/portrait.webp";

  // ------------------------------------------------------------ props
  function ringBasis(tx, tz, o = [0, 0, 0]) {
    return (th, R) => {
      let x = Math.cos(th) * R, y = 0, z = Math.sin(th) * R;
      const y1 = y * Math.cos(tx) - z * Math.sin(tx), z1 = y * Math.sin(tx) + z * Math.cos(tx); y = y1; z = z1;
      const x2 = x * Math.cos(tz) - y * Math.sin(tz), y2 = x * Math.sin(tz) + y * Math.cos(tz);
      return [x2 + o[0], y2 + o[1], z + o[2]];
    };
  }
  const RINGS = [
    { R: 2.85, at: ringBasis(-0.1, 0.08), n: 2000 },   // near-level ring, centred on the box
    { R: 2.5, at: ringBasis(0.44, -0.3), n: 1800 },    // tilted ring crossing it, also centred
  ];
  RINGS.forEach((rg) => { rg.pts = Array.from({ length: rg.n }, (_, k) => { const th = (k / rg.n) * TAU; return [...rg.at(th, rg.R + gauss() * 0.005), rand(0.4, 1)]; }); });
  const MOON = Array.from({ length: 1400 }, (_, i) => { const y = 1 - (i / 1399) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; return [Math.cos(th) * r, y, Math.sin(th) * r]; });
  const DEBRIS = [];
  while (DEBRIS.length < (MOBILE ? 400 : 900)) {
    const x = gauss() * 4.5, y = rand(-0.8, 1.3), z = gauss() * 3.5;
    if (Math.abs(x) < 1.15 && Math.abs(z) < 1.15) continue;
    DEBRIS.push([x, y, z, rand(0.1, 0.5), Math.random() < 0.15 ? 1.6 : 1]);
  }
  const LABELS = [
    { p: [-1.75, -0.35, 0.9], a: "DATA", b: "CLEANED" },
    { p: [0.9, -1.55, -0.5], a: "MODELS", b: "TRAINED" },
    { p: [1.65, 0.35, 0.9], a: "PIPELINES", b: "AUTOMATED" },
    { p: [-1.6, 0.6, -0.9], a: "APPS", b: "SHIPPED" },
  ];
  const DUST = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), a: rand(0.05, 0.28), p: rand(0, 6), s: Math.random() < 0.08 ? rand(6, 18) : 1 }));
  // the portrait's own orbit: a faint dotted ellipse the star travels along
  const PORBIT = Array.from({ length: 700 }, (_, k) => [k / 700 * TAU, rand(0.3, 1)]);

  // ------------------------------------------------------------ projection
  let cY, sY, cX, sX, CX, CY, K;
  const D = 7.5, out = [0, 0, 0, 0];
  function project(x, y, z) {
    const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
    const y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
    const s = D / (D + z2);
    out[0] = CX + x1 * s * K; out[1] = CY + y1 * s * K; out[2] = s; out[3] = z2;
    return out;
  }
  function rotN(n) {
    const x1 = n[0] * cY + n[2] * sY, z1 = -n[0] * sY + n[2] * cY;
    return [x1, n[1] * cX - z1 * sX, n[1] * sX + z1 * cX];
  }
  const NORMALS = [[0, 0, 1], [0, -1, 0], [0, 1, 0], [-1, 0, 0], [1, 0, 0], [0, 0, -1]];
  function hull(pts) {   // convex hull of the projected corners (monotone chain), counter-clockwise
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function inHull(poly, x, y) {
    for (let i = 0, n = poly.length; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false;
    }
    return true;
  }
  const PLIGHT = (() => { const l = [-0.62, -0.62, -0.48], n = Math.hypot(...l); return l.map((v) => v / n); })();
  const LIT = (() => { const l = [-0.35, -0.85, -0.45], n = Math.hypot(...l); return l.map((v) => v / n); })();

  // ------------------------------------------------------------ frame
  const t0 = performance.now();
  let lastNow = t0, dt = 16, lastPhase = -1;
  const figNo = document.getElementById("figNo"), figCap = document.getElementById("figCap"), cue = document.getElementById("scrollCue");
  const CAPS = ["The engineer, seen from outside", "The engineer's box", "The same box, opening", "Six sides, laid flat"];
  let lastCap = "";

  function frame(now) {
    requestAnimationFrame(frame);
    dt = Math.min(50, now - lastNow); lastNow = now;
    const hr = hero.getBoundingClientRect();
    if (hr.bottom < 0 || hr.top > innerHeight) return;

    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (canvas.width !== w * DPR || canvas.height !== h * DPR) { canvas.width = w * DPR; canvas.height = h * DPR; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // ---- timeline
    const p = clamp(-hr.top / Math.max(1, hr.height - innerHeight));
    // the story, in scroll order: portrait -> solid box -> inspected (see-through, circuit inside) -> solid again ->
    // unfolds, faces bending -> flat net -> icons form on each face
    const phase = p < 0.1 ? 0 : p < 0.5 ? 1 : p < 0.8 ? 2 : 3;
    if (phase !== lastPhase) {
      lastPhase = phase;
      hero.classList.toggle("phase-box", phase >= 1);
      hero.classList.toggle("phase-b", phase >= 2);
      hero.classList.toggle("phase-c", phase >= 3);
      figNo.textContent = "0" + (phase + 1);
    }
    cue.style.opacity = 1 - smooth(0.02, 0.08, p);
    const T = now * 0.001, step = Math.min(3, dt / 16.7);
    const intro = REDUCED ? 1 : portraitReady ? smooth(0.15, 2.6, (now - portraitT) / 1000) : 0;
    const mP = smooth(0.08, 0.2, p);                                    // portrait -> solid box
    const insp = smooth(0.28, 0.34, p) * (1 - smooth(0.43, 0.49, p));   // faces go see-through, the inside shows
    const m2 = smooth(0.5, 0.7, p);                                     // box -> flat net
    const mIcon = smooth(0.8, 0.9, p);                                  // icons gather on each face
    const extras = smooth(0.16, 0.24, p) * (1 - smooth(0.48, 0.56, p));
    const inner = insp;
    const form = REDUCED ? 1 : smooth(0.31, 0.37, p);                   // inside: chaos -> circuit as you scroll in
    const labelA = smooth(0.3, 0.35, p) * (1 - smooth(0.43, 0.47, p));
    const standA = smooth(0.66, 0.76, p);
    const starA = intro * (1 - smooth(0.05, 0.12, p));
    const cap = phase === 1 && insp > 0.5 ? "The engineer's box, inspected" : CAPS[phase];
    if (cap !== lastCap) { lastCap = cap; figCap.textContent = cap; }
    if (!iconsBuilt && iconImgs.length && iconImgs.every((im) => im.complete && im.naturalWidth)) buildIcons();

    // ---- layout
    const mobile = w < 760;
    const pH = mobile ? h * 0.62 : h * 0.94, pW = pH * portraitAspect;
    const pX0 = mobile ? (w - pW) / 2 : w * 0.64 - pW / 2, pY0 = mobile ? h * 0.08 : h * 0.04;
    const kCube = mobile ? w * 0.2 : Math.min(w * 0.105, h * 0.15);
    const kNet = Math.min(h * 0.76 / 8, w * (mobile ? 0.9 : 0.42) / 6);
    K = lerp(kCube, kNet, m2);
    CX = lerp(w * 0.5, mobile ? w * 0.5 : w * 0.7, m2);
    CY = lerp(h * (mobile ? 0.4 : 0.42), h * 0.54, m2);
    let ry = 0.62 + Math.sin(now * 0.00017) * 0.16 + (mouse.nx - 0.5) * 0.45 + (1 - mP) * 1.4;
    ry = lerp(ry, -0.08 + (mouse.nx - 0.5) * 0.18, m2);
    const rx = lerp(0.48 + (mouse.ny - 0.5) * 0.22, 0.08 + (mouse.ny - 0.5) * 0.08, m2);
    cY = Math.cos(ry); sY = Math.sin(ry); cX = Math.cos(rx); sX = Math.sin(rx);
    const faceA = NORMALS.map((n) => {
      const r = rotN(n), facing = r[2] < 0.02;
      const lit = 0.68 + 0.32 * Math.max(0, r[0] * LIT[0] + r[1] * LIT[1] + r[2] * LIT[2]);
      return lerp(lerp(facing ? lit : 0.03, facing ? 1 : 0.55, insp), 1, m2);
    });

    // ---- dust
    for (const s of DUST) { ctx.fillStyle = `rgba(${BONE},${s.a * (0.6 + 0.4 * Math.sin(T + s.p))})`; ctx.fillRect(s.x * w, s.y * h, s.s, 1); }

    // ---- the portrait's two orbits + the sun (back halves drawn first, front halves after the portrait)
    // one orbit circles the head and shoulders, the other the chest
    const ORB = [
      { cx: pX0 + pW * 0.5, cy: pY0 + pH * 0.44, rx: pW * 0.66, ry: pH * 0.13, tl: -0.2 },
      { cx: pX0 + pW * 0.5, cy: pY0 + pH * 0.78, rx: pW * 0.62, ry: pH * 0.12, tl: -0.3 },
    ];
    for (const o of ORB) { o.c = Math.cos(o.tl); o.s = Math.sin(o.tl); }
    const onOrbit = (o, a) => { const ex = Math.cos(a) * o.rx, ey = Math.sin(a) * o.ry; return [o.cx + ex * o.c - ey * o.s, o.cy + ex * o.s + ey * o.c, Math.sin(a)]; };
    // the sun does a lap on the top orbit, swoops down to the lower orbit for a lap, then swoops back up.
    // The swoop happens on the front side (across the chest) so it is always visible.
    const SWOOP = 1.2, SWOOP_END = Math.PI / 2 + SWOOP / 2;
    const sunPos = (s) => {
      const u = s - SWOOP_END, lap = Math.floor(u / TAU), ph = u - lap * TAU;
      const from = ((lap % 2) + 2) % 2, m = smooth(TAU - SWOOP, TAU, ph);
      const p0 = onOrbit(ORB[from], s), p1 = onOrbit(ORB[1 - from], s);
      return [lerp(p0[0], p1[0], m), lerp(p0[1], p1[1], m), p0[2]];
    };
    const starAng = T * 0.75;
    const drawOrbit = (front) => {
      if (starA < 0.01) return;
      ctx.fillStyle = `rgb(${BONE})`;
      for (const o of ORB) for (const [a, al] of PORBIT) {
        const q = onOrbit(o, a);
        if ((q[2] > 0) !== front) continue;
        ctx.globalAlpha = al * starA * (front ? 0.32 : 0.14);
        ctx.fillRect(q[0], q[1], 1, 1);
      }
      // the sun and its trail (the trail follows the same path, so it bends through the swoop)
      for (let k = 60; k >= 0; k--) {
        const q = sunPos(starAng - k * 0.018);
        if ((q[2] > 0) !== front) continue;
        if (k === 0) {
          ctx.globalAlpha = 1;
          drawSun(ctx, q[0], q[1], front ? 9 : 5.5, now, starA * (front ? 1 : 0.5), 1);
        } else {
          ctx.globalAlpha = Math.pow(1 - k / 60, 2) * starA * (front ? 0.9 : 0.45);
          ctx.fillStyle = `rgb(${EMBER})`;
          ctx.fillRect(q[0], q[1], 1.6, 1.6);
        }
      }
      ctx.globalAlpha = 1;
    };
    drawOrbit(false);

    // ---- 3D props behind
    if (extras > 0.01) {
      ctx.fillStyle = `rgb(${BONE})`;
      for (const [x, y, z, a, sz] of DEBRIS) { project(x, y + Math.sin(T * 0.5 + x * 3) * 0.03, z); ctx.globalAlpha = a * extras; ctx.fillRect(out[0], out[1], sz, sz); }
      ctx.globalAlpha = 1;
    }
    // the box's silhouette: anything behind it is hidden while it is solid, and dimmed while it is see-through
    let sil = null;
    if (extras > 0.01 && m2 < 0.05) {
      const corners = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) { project(a, b, c); corners.push([out[0], out[1]]); }
      sil = hull(corners);
    }
    const occl = mP * (1 - insp * 0.6);                       // 1 = solid box hides fully; 0.4 = glass box dims
    const behindBox = (x, y, z2) => (sil && z2 > 0 && inHull(sil, x, y) ? 1 - occl : 1);
    const ringDraw = (front) => {
      if (extras < 0.01) return;
      ctx.fillStyle = `rgb(${BONE})`;
      for (const rg of RINGS) for (const [x, y, z, ra] of rg.pts) {
        project(x, y, z);
        if ((out[3] <= 0) !== front) continue;
        const vis = front ? 1 : behindBox(out[0], out[1], out[3]);
        if (vis < 0.02) continue;
        ctx.globalAlpha = ra * extras * (front ? 0.9 : 0.45) * vis;
        ctx.fillRect(out[0], out[1], 1.2, 1.2);
      }
      ctx.globalAlpha = 1;
    };
    // the sun riding ring A, drawn in two passes so it really goes behind the box
    const sunDraw = (front) => {
      if (extras < 0.01) return;
      const eTh = now * 0.00022;
      for (let k = 46; k >= 0; k--) {
        const e = RINGS[0].at(eTh - k * 0.011, RINGS[0].R);
        project(e[0], e[1], e[2]);
        if ((out[3] <= 0) !== front) continue;
        const vis = front ? 1 : behindBox(out[0], out[1], out[3]);
        if (vis < 0.02) continue;
        if (k === 0) drawSun(ctx, out[0], out[1], 6.5 * out[2], now, extras * vis * (front ? 1 : 0.7), 1);
        else { ctx.fillStyle = `rgba(${EMBER},${Math.pow(1 - k / 46, 2) * extras * 0.9 * vis})`; ctx.fillRect(out[0], out[1], 1.5, 1.5); }
      }
    };
    ringDraw(false);
    sunDraw(false);
    const moons = [
      { c: RINGS[0].at(Math.PI - 0.06 + now * 0.000015, RINGS[0].R), R: 0.17, step: 3 },
      { c: RINGS[1].at(0.15 + now * 0.00002, RINGS[1].R), R: 0.2, step: 2 },
    ];
    for (const m of moons) { project(m.c[0], m.c[1], m.c[2]); m.sx = out[0]; m.sy = out[1]; m.s = out[2]; m.front = out[3] <= 0; m.vis = m.front ? 1 : behindBox(m.sx, m.sy, out[3]); }
    const drawMoon = (m) => {
      if (extras < 0.01 || m.vis < 0.05) return;
      const sp = now * 0.00025, cs = Math.cos(sp), ss = Math.sin(sp);
      ctx.globalAlpha = 0.92 * extras * m.vis; ctx.fillStyle = "#0b0b0c";
      ctx.beginPath(); ctx.arc(m.sx, m.sy, m.R * K * m.s * 1.02, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgb(${BONE})`;
      for (let q = 0; q < MOON.length; q += m.step) {
        const [x, y, z] = MOON[q];
        const xr = x * cs + z * ss, zr = -x * ss + z * cs, n = rotN([xr, y, zr]);
        if (n[2] > 0.05) continue;
        const lam = Math.max(0, n[0] * PLIGHT[0] + n[1] * PLIGHT[1] + n[2] * PLIGHT[2]);
        project(m.c[0] + xr * m.R, m.c[1] + y * m.R, m.c[2] + zr * m.R);
        ctx.globalAlpha = clamp(0.07 + 0.88 * Math.pow(lam, 1.8)) * extras * m.vis;
        ctx.fillRect(out[0], out[1], 1.2, 1.2);
      }
      ctx.globalAlpha = 1;
    };
    moons.forEach((m) => { if (!m.front) drawMoon(m); });
    // glowing core while the inside is chaotic
    if (mP > 0.5 && inner > 0.02) {
      project(0, 0, 0);
      const cg = (1 - form) * inner * smooth(0.5, 1, mP);
      if (cg > 0.02) { const gs = 70 * K / 140; ctx.globalAlpha = cg * 0.9; ctx.drawImage(glow, out[0] - gs / 2, out[1] - gs / 2, gs, gs); ctx.globalAlpha = 1; }
    }

    // ---- all particles: portrait position blended with box position
    const mx = mouse.x - rect.left, my = mouse.y - rect.top, RR = 80, RR2 = RR * RR;
    const parX = (mouse.nx - 0.5) * 18, parY = (mouse.ny - 0.5) * 10;
    const bend = Math.sin(Math.PI * m2), spin = T * 0.35;
    lvCount.fill(0); embCount = 0;
    for (let i = 0; i < M; i++) {
      const shell = i < N;
      // -------- box position (screen) + alpha
      let bx = 0, by = 0, aB = 0, l = -1, lifeA = 1;
      if (shell) {
        const f = face[i];
        let u = U[i], v = V[i];
        if (pin[i] !== 1) { u += Math.sin(v * 2.3 + T * 0.35 + f * 1.3) * 0.0014 * step; if (u > 1) u -= 2; else if (u < -1) u += 2; }
        if (pin[i] !== 2) { v += Math.cos(u * 2.1 - T * 0.3 + f * 1.7) * 0.0014 * step; if (v > 1) v -= 2; else if (v < -1) v += 2; }
        U[i] = u; V[i] = v;
        let off = 0;
        if (life[i] >= 0) {
          l = life[i] + dt * 0.00022;
          if (l >= 1) { l -= 1; U[i] = u = rand(-1, 1); V[i] = v = rand(-1, 1); }
          life[i] = l; off = (1 - Math.pow(1 - l, 2)) * 0.6; lifeA = Math.min(1, l * 10) * Math.pow(1 - l, 1.6);
        }
        if (mP > 0) {
          let cx, cy, cz;
          switch (f) {
            case 0: cx = u; cy = v; cz = 1 + off; break;
            case 1: cx = u; cy = -1 - off; cz = v; break;
            case 2: cx = u; cy = 1 + off; cz = -v; break;
            case 3: cx = -1 - off; cy = v; cz = -u; break;
            case 4: cx = 1 + off; cy = v; cz = u; break;
            default: cx = -u; cy = v; cz = -1 - off;
          }
          if (m2 > 0) {
            let nu = u, nv = v;
            if (hasIcon[i] && mIcon > 0) {
              const e = smooth(0, 1, clamp(mIcon * 1.4 - (ph[i] / TAU) * 0.4));
              nu = lerp(u, ICU[i] + Math.sin(T * 1.3 + ph[i]) * 0.004, e); nv = lerp(v, ICV[i] + Math.cos(T * 1.1 + ph[i]) * 0.004, e);
            }
            const curl = bend * 0.55 * (u * u - 0.35) * (f === 0 ? 0.3 : 1);
            cx = lerp(cx, netC[f][0] + nu, m2); cy = lerp(cy, netC[f][1] + nv - 1, m2); cz = lerp(cz, off * 0.3, m2) + curl;
          }
          project(cx, cy, cz); bx = out[0]; by = out[1];
          const tw = pin[i] ? 0.8 + 0.2 * Math.sin(T * fr[i] * 2 + ph[i]) : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(T * fr[i] * 2.2 + ph[i]));
          // solid box: dense faces; inspected: faint glass; net: dense, then a faint speckle once the icons form
          const solidLevel = pin[i] ? 1 : lerp(1.15, 0.15, insp);
          const netLevel = pin[i] ? lerp(1, 0.42, mIcon) : hasIcon[i] ? lerp(1.15, 1.35, mIcon) : lerp(1.15, 0.24, mIcon);
          const faceLevel = lerp(solidLevel, netLevel, m2);
          aB = base[i] * tw * lifeA * faceLevel * (l >= 0 ? Math.max(faceA[f], 0.6) : faceA[f]);
        }
      } else if (mP > 0) {
        const k = i - N, j = k * 3;
        const r = Math.hypot(IC[j], IC[j + 2]), a0 = Math.atan2(IC[j + 2], IC[j]) + spin * (1.2 - r);
        const cx0 = Math.cos(a0) * r + Math.sin(T * 1.7 + ph[i]) * 0.05, cz0 = Math.sin(a0) * r, cy0 = IC[j + 1] + Math.cos(T * 1.3 + ph[i]) * 0.05;
        const e = smooth(0, 1, clamp(form * 1.4 - (ph[i] / TAU) * 0.4));
        project(lerp(cx0, IS[j], e), lerp(cy0, IS[j + 1], e), lerp(cz0, IS[j + 2], e));
        bx = out[0]; by = out[1];
        aB = Ia[k] * inner * (0.55 + 0.45 * Math.sin(T * 2.5 + ph[i])) * lerp(0.75, 1, e);
      }

      // -------- portrait position (screen) + alpha
      let sx = 0, sy = 0, aP = 0;
      if (mP < 1) {
        const depth = PL[i];
        sx = pX0 + PX[i] * pW + parX * depth + Math.sin(T * 0.8 + ph[i]) * 0.35;
        sy = pY0 + PY[i] * pH + parY * depth + Math.cos(T * 0.7 + ph[i]) * 0.35;
        if (l >= 0) { sy -= l * 46; sx += Math.sin(ph[i] + T) * l * 12; }
        aP = clamp(PL[i] * 1.25) * (0.62 + 0.38 * Math.sin(T * fr[i] * 2 + ph[i])) * (l >= 0 ? lifeA : 1);
        if (intro < 1) {
          const c3 = i * 3;
          const sv = [CX, CY, K, cY, sY, cX, sX];
          K = kCube * 1.3; CX = w * 0.6; CY = h * 0.45;
          project(cloud[c3], cloud[c3 + 1], cloud[c3 + 2]);
          [CX, CY, K, cY, sY, cX, sX] = sv;
          const e = smooth(0, 1, clamp(intro * 1.25 - PL[i] * 0.25));
          sx = lerp(out[0], sx, e); sy = lerp(out[1], sy, e); aP *= lerp(0.5, 1, e);
        }
      }

      // -------- blend with a swirl through the middle of the move
      let X, Y, a;
      if (mP <= 0) { X = sx; Y = sy; a = aP; }
      else if (mP >= 1) { X = bx; Y = by; a = aB; }
      else {
        const e = smooth(0, 1, clamp(mP * 1.3 - PY[i] * 0.3));
        const arc = Math.sin(e * Math.PI);
        X = lerp(sx, bx, e) + arc * swirl[i];
        Y = lerp(sy, by, e) - arc * Math.abs(swirl[i]) * 0.35;
        a = lerp(aP, aB, e) * (1 - arc * 0.3);
      }

      const dx = X + ox[i] - mx, dy = Y + oy[i] - my, d2 = dx * dx + dy * dy;
      if (d2 < RR2 && d2 > 0.01) { const d = Math.sqrt(d2), fo = (1 - d / RR) * 2.2; ox[i] += (dx / d) * fo; oy[i] += (dy / d) * fo; }
      ox[i] *= 0.92; oy[i] *= 0.92;
      px[i] = X + ox[i]; py[i] = Y + oy[i];
      if (a < 0.03) continue;
      if (isEmb[i] && mP > 0.6 && form < 0.5) { embIdx[embCount++] = i; continue; }
      const L = Math.min(LV - 1, (a * LV) | 0);
      lvIdx[L][lvCount[L]++] = i;
    }
    const big = mP > 0.6;
    for (let L = 0; L < LV; L++) {
      const n = lvCount[L]; if (!n) continue;
      ctx.fillStyle = `rgba(${BONE},${((L + 0.5) / LV).toFixed(3)})`;
      const idx = lvIdx[L];
      for (let k = 0; k < n; k++) { const i = idx[k], sz = big && i < N && pin[i] ? 1.3 : 1.05; ctx.fillRect(px[i], py[i], sz, sz); }
    }
    if (embCount) {
      ctx.fillStyle = `rgba(${EMBER},${0.9 * inner})`;
      for (let k = 0; k < embCount; k++) { const i = embIdx[k]; ctx.fillRect(px[i], py[i], 1.3, 1.3); }
    }

    // ---- front props
    drawOrbit(true);
    ringDraw(true);
    moons.forEach((m) => { if (m.front) drawMoon(m); });
    sunDraw(true);
    if (extras > 0.01) {
      ctx.font = "500 10px 'Geist Mono', ui-monospace, monospace";
      ctx.textAlign = "left";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "1.6px";
      for (let li = 0; li < LABELS.length; li++) {
        const Lb = LABELS[li];
        project(Lb.p[0], Lb.p[1], Lb.p[2]);
        const show = smooth(0.25 + li * 0.04, 0.4 + li * 0.04, form);
        ctx.fillStyle = `rgba(${BONE},${labelA * lerp(0.4, 0.85, show)})`;
        ctx.fillText(Lb.a + " → " + (show > 0.5 ? Lb.b : "…"), out[0], out[1]);
      }
      project(0.12, -0.32, 0.2);
      ctx.fillStyle = `rgba(${BONE},${labelA * 0.85})`;
      ctx.fillText("CORE", out[0] + 12, out[1]);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
      project(-0.42, -1, 0.22);                                  // sitting on the lid, back-left of centre
      const ax = out[0], ay = out[1], hf = 0.44 * K * out[2];
      ctx.fillStyle = `rgb(${BONE})`;
      for (const [dx, dy, a] of SEATED) {
        ctx.globalAlpha = a * extras * (0.7 + 0.3 * Math.sin(T * 3.2 + dx * 97 + dy * 53));
        ctx.fillRect(ax + dx * hf + Math.sin(T * 1.7 + dy * 40) * 0.25, ay - dy * hf, 1.05, 1.05);
      }
      ctx.globalAlpha = extras;
      const hx = ax - 0.06 * hf, hy = ay - hf * 0.81;
      ctx.strokeStyle = `rgba(${BONE},.75)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hx + hf * 0.1, hy - hf * 0.16, 3.2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(${BONE},.4)`;
      ctx.beginPath(); ctx.moveTo(hx - 48, hy - 56); ctx.lineTo(hx - 2, hy - 30); ctx.stroke();
      ctx.fillStyle = `rgba(${BONE},.95)`; ctx.font = "600 12px Geist, system-ui, sans-serif"; ctx.textAlign = "right";
      ctx.fillText("ME", hx - 58, hy - 32);
      ctx.globalAlpha = 1;
    }
    if (mIcon > 0.01) {
      ctx.font = "500 10px 'Geist Mono', ui-monospace, monospace"; ctx.textAlign = "left";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "1.4px";
      for (let f = 0; f < 6; f++) {
        const lab = TILE_LABELS[FACE_TILE[f]]; if (!lab) continue;
        project(netC[f][0] - 0.88, netC[f][1] - 1 - 0.8, 0);
        ctx.fillStyle = `rgba(${BONE},${0.72 * mIcon})`;
        ctx.fillText(lab, out[0], out[1] + 4);
      }
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    }
    if (standA > 0.01) {
      project(-1.75, 4, 0);
      const ax = out[0], ay = out[1], hf = 1.55 * K * out[2];
      ctx.fillStyle = `rgb(${BONE})`;
      for (const [dx, dy, a] of STANDING) { ctx.globalAlpha = a * standA * (0.85 + 0.15 * Math.sin(T * 3 + dy * 40)); ctx.fillRect(ax + dx * hf, ay - dy * hf, 1.2, 1.2); }
      ctx.globalAlpha = 1;
    }
  }
  requestAnimationFrame(frame);
})();
