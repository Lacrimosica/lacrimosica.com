/* ---------- Manifesto path ----------
 * The idea grows like a plant: the line starts from a seed above the first
 * milestone, sways down through the milestone nodes, puts out small leaves
 * as it grows and ends in a bunch of grapes. As the page scrolls, the tip
 * of the line follows a fixed height on screen, so it keeps pace with your
 * reading. Redrawn on resize, since the cards reflow. */

const TIP = 0.62; // where the tip of the line sits, as a share of screen height
const SEED_RISE = 110; // how far above the first node the seed sits, in px
const LEAF_EVERY = 120; // px of line between leaves
const LEAF = "M0 0 C5 -6 14 -7 20 0 C14 6 5 6 0 0 Z"; // a small leaf, base at 0,0

const SVG = "http://www.w3.org/2000/svg";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const list = document.querySelector(".manifesto-path");
if (list) start(list);

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(SVG, name);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  parent?.append(node);
  return node;
}

function start(root) {
  const nodes = Array.from(root.querySelectorAll(".milestone-node"));
  if (nodes.length < 2) return;

  const svg = el("svg", { class: "manifesto-line", "aria-hidden": "true" });
  const path = el("path", { class: "manifesto-stem" }, svg);
  const leaves = el("g", { class: "manifesto-leaves-layer" }, svg);
  const grapes = el("g", { class: "manifesto-grapes" }, svg);
  const seed = el("g", { class: "manifesto-seed" }, svg);
  el("ellipse", { rx: 9, ry: 13 }, seed);
  el("ellipse", { class: "manifesto-seed-shine", rx: 3, ry: 6, cx: -3, cy: -3 }, seed);
  root.append(svg); // last, so the cards keep their odd/even positions

  let length = 0;
  let samples = []; // [{ len, y }] along the path, so a screen height maps to a length
  let leafList = []; // [{ len, node }]

  function draw() {
    const box = root.getBoundingClientRect();
    const points = nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    });
    // Sway: control points lean out to alternate sides, wider on wide screens.
    const sway = Math.min(70, box.width * 0.06);
    const first = points[0];
    const last = points[points.length - 1];
    const seedY = first.y - SEED_RISE;
    seed.setAttribute("transform", `translate(${first.x} ${seedY}) rotate(-22)`);

    let d = `M ${first.x} ${seedY + 12} C ${first.x + sway * 0.6} ${seedY + 45}, ${first.x - sway * 0.6} ${first.y - 40}, ${first.x} ${first.y}`;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const dy = b.y - a.y;
      const lean = i % 2 ? sway : -sway;
      d += ` C ${a.x + lean} ${a.y + dy * 0.45}, ${b.x - lean} ${b.y - dy * 0.45}, ${b.x} ${b.y}`;
    }
    const end = { x: last.x + sway * 0.25, y: last.y + 80 };
    d += ` Q ${last.x + sway * 0.6} ${last.y + 40} ${end.x} ${end.y}`;
    path.setAttribute("d", d);
    length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;

    samples = [];
    for (let len = 0; len <= length; len += 4) samples.push({ len, y: path.getPointAtLength(len).y });

    // Leaves along the stem, alternating sides, kept clear of the nodes.
    leaves.replaceChildren();
    leafList = [];
    let side = 1;
    for (let len = 50; len < length - 40; len += LEAF_EVERY) {
      const p = path.getPointAtLength(len);
      if (points.some((n) => Math.hypot(n.x - p.x, n.y - p.y) < 28)) continue;
      const q = path.getPointAtLength(Math.min(length, len + 1));
      const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI + side * 55;
      const g = el("g", { transform: `translate(${p.x} ${p.y}) rotate(${angle})` }, leaves);
      const leaf = el("path", { class: "manifesto-leaf", d: LEAF }, g);
      leafList.push({ len, node: leaf });
      side *= -1;
    }

    // A bunch of grapes hanging from the end of the stem.
    grapes.replaceChildren();
    grapes.setAttribute("transform", `translate(${end.x} ${end.y})`);
    const bunch = el("g", { class: "manifesto-bunch" }, grapes);
    // The rotation lives on a wrapper, since the leaf's CSS scale would replace a transform attribute.
    el("path", { class: "manifesto-leaf", d: LEAF }, el("g", { transform: "rotate(-150)" }, bunch));
    // A wide-shouldered bunch that tapers to a point: rows of 4, 3, 2, 1,
    // nudged a little so it looks picked, not printed.
    const berries = [
      [-15, 9], [-5, 7], [5, 8], [15, 10],
      [-10, 17], [0, 16], [10, 18],
      [-5, 25], [5, 26],
      [0, 34],
    ];
    berries.forEach(([x, y], i) => {
      el("circle", { class: `manifesto-grape manifesto-grape--${i % 3}`, cx: x, cy: y, r: 6 }, bunch);
    });
    // A curly tendril off the stem, on the side opposite the leaf.
    el("path", { class: "manifesto-tendril", d: "M2 0 C 10 -4, 18 -2, 18 4 C 18 9, 12 10, 11 6 C 10 3, 14 2, 15 4" }, bunch);

    grow();
  }

  function grow() {
    let drawn = length;
    if (!reducedMotion.matches) {
      // Draw up to the furthest point of the path that is above the tip line.
      const tipY = window.innerHeight * TIP - root.getBoundingClientRect().top;
      drawn = 0;
      for (const sample of samples) {
        if (sample.y <= tipY) drawn = sample.len;
      }
    }
    path.style.strokeDashoffset = `${length - drawn}`;
    leafList.forEach(({ len, node }) => node.classList.toggle("is-grown", drawn >= len));
    grapes.classList.toggle("is-grown", drawn >= length - 4);
  }

  window.addEventListener("scroll", grow, { passive: true });
  window.addEventListener("resize", draw);
  new ResizeObserver(draw).observe(root);
  draw();
}
