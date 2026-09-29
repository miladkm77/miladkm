// Parametric line-art cat used by the FIP scroll story.
//
// Every frame is generated from the same two key poses ("sick" → "healthy")
// with identical point topology, so all four frames share one canvas
// (400×400), one ground line and one registration point — they cross-fade
// cleanly. Colours are never hard-coded: everything is driven by CSS
// variables (--cat-line, --cat-fill) so the page can turn grey into brand blue.
//
// Original artwork generated in code (no third-party licence involved). It is a
// solid placeholder-quality illustration; a commissioned drawing can replace
// the four <g class="cat-frame"> blocks 1:1 without touching the JS.

const lerp = (a, b, t) => a + (b - a) * t;
const lerpPts = (A, B, t) => A.map((p, i) => [lerp(p[0], B[i][0], t), lerp(p[1], B[i][1], t)]);
const lerpArr = (A, B, t) => A.map((v, i) => lerp(v, B[i], t));
const f = (n) => (Math.round(n * 10) / 10).toString();
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

// ---- Catmull-Rom helpers ---------------------------------------------------

function crSegments(pts, closed) {
  const n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = [];
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    segs.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ]);
  }
  return segs;
}

function smoothClosedPath(pts) {
  const segs = crSegments(pts, true);
  let d = `M${pt(segs[0][0])}`;
  for (const s of segs) d += `C${pt(s[1])} ${pt(s[2])} ${pt(s[3])}`;
  return d + 'Z';
}

function sampleOpen(pts, perSeg = 10) {
  const out = [];
  const segs = crSegments(pts, false);
  segs.forEach((s, si) => {
    for (let k = si === 0 ? 0 : 1; k <= perSeg; k++) {
      const t = k / perSeg, u = 1 - t;
      out.push([
        u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0],
        u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1],
      ]);
    }
  });
  return out;
}

// Tapered tube around an open curve. Returns { poly, left, right } where
// left/right are the offset edges (used to draw detail lines).
function tube(ctrl, widths, perSeg = 10) {
  const c = sampleOpen(ctrl, perSeg);
  const wAt = (i) => {
    const t = (i / (c.length - 1)) * (widths.length - 1);
    const a = Math.floor(t), b = Math.min(widths.length - 1, a + 1);
    return lerp(widths[a], widths[b], t - a);
  };
  const left = [], right = [], tan = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    tan.push([dx, dy]);
    const w = wAt(i) / 2;
    left.push([c[i][0] - dy * w, c[i][1] + dx * w]);
    right.push([c[i][0] + dy * w, c[i][1] - dx * w]);
  }
  // round caps: semicircle around the tip, through the tangent direction
  const cap = (center, T, r, sign) => {
    const L = [-T[1], T[0]];
    const pts = [];
    for (let k = 1; k < 8; k++) {
      const phi = (k / 8) * Math.PI;
      const cx = Math.cos(phi), sy = Math.sin(phi) * sign;
      pts.push([center[0] + r * (L[0] * cx * sign + T[0] * sy), center[1] + r * (L[1] * cx * sign + T[1] * sy)]);
    }
    return pts;
  };
  const n = c.length - 1;
  const capEnd = cap(c[n], tan[n], wAt(n) / 2, 1);
  const capStart = cap(c[0], tan[0], wAt(0) / 2, -1);
  const ring = [...left, ...capEnd, ...right.slice().reverse(), ...capStart];
  return { poly: 'M' + ring.map(pt).join('L') + 'Z', left, right };
}

function ellipsePts(cx, cy, rx, ry, n = 12, jaw = 0.9) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2; // start at top, clockwise
    const s = Math.sin(a);
    out.push([cx + Math.cos(a) * rx, cy + s * ry * (s > 0 ? jaw : 1)]);
  }
  return out;
}

// ---- Key poses -------------------------------------------------------------
// Cat faces LEFT. Ground line is y = 350.

const SICK = {
  body: [[168, 272], [212, 232], [266, 222], [314, 250], [338, 304], [326, 340], [240, 352], [170, 350], [142, 326], [146, 294]],
  head: [112, 306, 46, 38],
  earNear: [[82, 284], [68, 258], [110, 272]],
  earFar: [[120, 270], [150, 254], [154, 292]],
  legNear: { c: [[152, 338], [112, 346], [72, 347]], w: [26, 22, 20] },
  legFar: { c: [[164, 342], [128, 349], [94, 350]], w: [24, 20, 18] },
  hind: { c: [[312, 346], [278, 350], [248, 350]], w: [22, 20, 20] },
  tail: { c: [[326, 334], [350, 346], [370, 346], [382, 338], [386, 330], [382, 324]], w: [22, 18, 16, 14, 12, 10] },
  haunch: [[238, 338], [242, 292], [278, 264], [318, 284]],
};

const WELL = {
  body: [[158, 148], [210, 152], [264, 184], [308, 248], [322, 312], [302, 346], [220, 351], [156, 347], [132, 300], [126, 204]],
  head: [135, 118, 50, 43],
  earNear: [[98, 92], [102, 44], [136, 78]],
  earFar: [[142, 76], [176, 44], [182, 94]],
  legNear: { c: [[146, 236], [144, 290], [142, 340]], w: [30, 26, 24] },
  legFar: { c: [[170, 246], [170, 292], [168, 340]], w: [26, 24, 22] },
  hind: { c: [[300, 346], [262, 349], [230, 348]], w: [22, 20, 20] },
  tail: { c: [[312, 318], [350, 326], [374, 292], [376, 232], [362, 184], [344, 168]], w: [22, 18, 16, 14, 12, 10] },
  haunch: [[226, 318], [230, 268], [268, 236], [304, 262]],
};

function pose(t, perSeg) {
  const P = {
    body: lerpPts(SICK.body, WELL.body, t),
    head: lerpArr(SICK.head, WELL.head, t),
    earNear: lerpPts(SICK.earNear, WELL.earNear, t),
    earFar: lerpPts(SICK.earFar, WELL.earFar, t),
    haunch: lerpPts(SICK.haunch, WELL.haunch, t),
  };
  for (const k of ['legNear', 'legFar', 'hind', 'tail']) {
    P[k] = { c: lerpPts(SICK[k].c, WELL[k].c, t), w: lerpArr(SICK[k].w, WELL[k].w, t) };
  }
  P.perSeg = perSeg;
  return P;
}

// ---- Rendering -------------------------------------------------------------

function shapesOf(P) {
  const [hx, hy, rx, ry] = P.head;
  const tubes = {
    tail: tube(P.tail.c, P.tail.w, P.perSeg),
    legFar: tube(P.legFar.c, P.legFar.w, P.perSeg),
    legNear: tube(P.legNear.c, P.legNear.w, P.perSeg),
    hind: tube(P.hind.c, P.hind.w, P.perSeg),
  };
  const shapes = [
    tubes.tail.poly,
    tubes.hind.poly,
    smoothClosedPath(P.body),
    tubes.legFar.poly,
    tubes.legNear.poly,
    smoothClosedPath(ellipsePts(hx, hy, rx, ry, 12)),
    'M' + P.earFar.map(pt).join('L') + 'Z',
    'M' + P.earNear.map(pt).join('L') + 'Z',
  ];
  return { shapes, tubes };
}

function detailsOf(P, tubes, eye) {
  const [hx, hy, rx, ry] = P.head;
  const out = [];

  // inner ear
  const inner = (e) => {
    const mid = [(e[0][0] + e[2][0]) / 2, (e[0][1] + e[2][1]) / 2];
    const a = [lerp(mid[0], e[1][0], 0.28), lerp(mid[1], e[1][1], 0.28)];
    const b = [lerp(mid[0], e[1][0], 0.72), lerp(mid[1], e[1][1], 0.72)];
    return `<path class="cat-line" d="M${pt(a)}L${pt(b)}"/>`;
  };
  out.push(inner(P.earNear));

  // haunch curve
  const h = P.haunch;
  out.push(`<path class="cat-line" d="M${pt(h[0])}C${pt(h[1])} ${pt(h[2])} ${pt(h[3])}"/>`);

  // near-leg edge (separates the two front legs)
  const edge = tubes.legNear.right.slice(Math.floor(tubes.legNear.right.length * 0.28), Math.floor(tubes.legNear.right.length * 0.9));
  out.push(`<path class="cat-line" d="M${edge.map(pt).join('L')}"/>`);

  // eye
  const ex = hx - rx * 0.34, ey = hy - ry * 0.12;
  if (eye === 'open') out.push(`<circle class="cat-dot" cx="${f(ex)}" cy="${f(ey)}" r="4.6"/>`);
  else if (eye === 'slit') out.push(`<path class="cat-line" d="M${f(ex - 7)} ${f(ey)}L${f(ex + 7)} ${f(ey + 1)}"/>`);
  else out.push(`<path class="cat-line" d="M${f(ex - 8)} ${f(ey - 1)}Q${f(ex)} ${f(ey + 8)} ${f(ex + 8)} ${f(ey - 1)}"/>`);

  // nose + whiskers
  const nx = hx - rx + 3, ny = hy + ry * 0.2;
  out.push(`<path class="cat-dot" d="M${f(nx - 1)} ${f(ny - 3)}L${f(nx + 6)} ${f(ny - 2)}L${f(nx + 2)} ${f(ny + 4)}Z"/>`);
  const droop = eye === 'closed' ? 10 : eye === 'slit' ? 5 : 0;
  const wh = [[-38, -9 + droop], [-42, 2 + droop], [-36, 13 + droop * 0.6]];
  for (const [dx, dy] of wh) {
    out.push(`<path class="cat-whisker" d="M${f(nx - 3)} ${f(ny + 1)}L${f(nx + dx)} ${f(ny + dy)}"/>`);
  }
  return out.join('');
}

/**
 * @returns {{ defs: string, frames: string[], silhouette: string }}
 * frames: 4 inner-SVG strings (each a <g class="cat-frame" data-frame="n">)
 */
export function buildCat() {
  const stops = [
    { t: 0, eye: 'closed' },
    { t: 0.36, eye: 'slit' },
    { t: 0.7, eye: 'open' },
    { t: 1, eye: 'open' },
  ];
  const defs = [];
  const frames = stops.map((s, i) => {
    const P = pose(s.t, 10);
    const { shapes, tubes } = shapesOf(P);
    defs.push(`<g id="cat-shapes-${i + 1}">${shapes.map((d) => `<path d="${d}"/>`).join('')}</g>`);
    return (
      `<g class="cat-frame" data-frame="${i + 1}">` +
      `<use href="#cat-shapes-${i + 1}" class="cat-halo"/>` +
      `<use href="#cat-shapes-${i + 1}" class="cat-fill"/>` +
      detailsOf(P, tubes, s.eye) +
      `</g>`
    );
  });

  // Light-weight silhouette for the crowd (fewer samples)
  const Ps = pose(1, 5);
  const { shapes: sil } = shapesOf(Ps);
  defs.push(`<symbol id="cat-sil" viewBox="0 0 400 400"><g class="cat-sil-shape">${sil.map((d) => `<path d="${d}"/>`).join('')}</g></symbol>`);

  return { defs: defs.join(''), frames, silhouette: '#cat-sil' };
}
