/* ---------- Le Châtelier lab ----------
 * A microscope view of a system in dynamic equilibrium, with the stages of
 * the cycle drawn as a ring around the lens. Pick a disturbance (AI, a
 * security incident, a funding call, a conflict, new tools) and watch it
 * play out: a burst of new atoms pours in, the system pushes back and
 * reacts them away, back to the same balance. Then the conditions change
 * and the balance itself moves. A live chart beside the lens draws the
 * textbook picture of the same thing: amounts over time.
 *
 * Each disturbance has its own look under the lens (js/lab-themes.js).
 * By default the cycle plays on its own. "Slow motion" lets people step
 * through it at their own pace, zoom in, read what each stage means, and
 * rewind to any earlier stage: the system plays backwards to where that
 * stage began, like restoring a checkpoint.
 *
 * Content lives in the HTML (one button and one panel per disturbance), so
 * the section reads fine without JavaScript. */

import { parseHex } from "./palette.js";
import {
  AUTOPLAY_MS,
  BURST,
  KEPT,
  RING,
  STEPS,
  arcPath,
  atomCount,
  flowAt,
  mix,
  ratesFor,
  ringProgress,
  unitFor,
} from "./lab-shape.js";
import { themeFor, scienceFor } from "./lab-themes.js";

const SVG = "http://www.w3.org/2000/svg";
const LAST = STEPS.length - 1;
const STAGE_LABELS = {
  disturbance: "Disturbance",
  counter: "Push-back",
  restored: "Back to balance",
  conditions: "I change the conditions",
};
const SLOW = 0.35; // speed in slow motion
const ZOOMS = [1, 1.6, 2.4];
const FRAME_MS = 1000 / 60;
const STEP_FRAMES = 160; // frames a skipped step gets when jumping forward
const REWIND_PER_FRAME = 4; // snapshots undone per frame while rewinding
const MAX_HISTORY = 3000;

const lab = document.querySelector(".lab");
if (lab) start(lab);

function start(root) {
  const panels = Array.from(root.querySelectorAll(".lab-panel"));
  // A disturbance needs its panel; one without is left out instead of breaking the lab.
  const buttons = Array.from(root.querySelectorAll(".lab-pick")).filter((button) => {
    const ok = panels.some((p) => p.dataset.id === button.dataset.id);
    if (!ok) button.hidden = true;
    return ok;
  });
  const scope = root.querySelector(".lab-scope");
  const canvas = scope.querySelector("canvas");
  const ring = scope.querySelector(".lab-ring");
  const chartCanvas = root.querySelector(".lab-chart canvas");
  const legend = root.querySelector(".lab-legend");
  const captionStep = root.querySelector(".lab-caption-step");
  const captionText = root.querySelector(".lab-caption-text");
  const chips = root.querySelector(".lab-chips");
  const guide = root.querySelector(".lab-guide");
  const guideStep = guide.querySelector(".lab-guide-step");
  const guideScience = guide.querySelector(".lab-guide-science");
  const guideBody = guide.querySelector(".lab-guide-body");
  const slowButton = root.querySelector(".lab-slow");
  const guideNav = root.querySelector(".lab-guide-nav");
  const backButton = guideNav.querySelector(".lab-back");
  const nextButton = guideNav.querySelector(".lab-next");
  const exitButton = guideNav.querySelector(".lab-exit");
  const zoomLevel = scope.querySelector(".lab-zoom-level");
  const zoomHint = scope.querySelector(".lab-zoom-hint");
  const gaugeCondition = scope.querySelector(".lab-gauge-condition");
  const ctx = canvas.getContext("2d");
  const chart = chartCanvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const examples = new Map(
    buttons.map((button) => {
      const id = button.dataset.id;
      const panel = panels.find((p) => p.dataset.id === id);
      const text = (selector) => panel.querySelector(selector)?.textContent.trim() ?? "";
      const raw = themeFor(id);
      button.style.setProperty("--pick-color", raw.guest.base);
      return [
        id,
        {
          id,
          button,
          panel,
          theme: parseTheme(raw),
          travel: Number(button.dataset.travel ?? 0) || 0,
          disturbance: text('[data-step="disturbance"] p'),
          principle: text(".lab-principle"),
          push: Array.from(panel.querySelectorAll(".lab-push li"), (li) => li.dataset.short ?? li.textContent),
          fix: Array.from(panel.querySelectorAll(".lab-fix li"), (li) => li.dataset.short ?? li.textContent),
        },
      ];
    }),
  );

  root.classList.add("is-ready");

  /* ---------- The ring ----------
   * Scale ticks like a microscope reticle, then one arc per stage with its
   * name, and a marker that travels round as the cycle plays. In slow
   * motion the arcs are clickable: jump forward, or rewind. */

  const marker = buildRing();

  function buildRing() {
    const c = 100;
    const add = (name, attrs, parent = ring) => {
      const el = document.createElementNS(SVG, name);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      parent.append(el);
      return el;
    };
    const ticks = add("g", { class: "lab-ring-ticks" });
    for (let deg = 0; deg < 360; deg += 6) {
      const long = deg % 30 === 0;
      const rad = (deg * Math.PI) / 180;
      const r1 = 79;
      const r2 = long ? 83 : 81;
      add("line", { x1: c + r1 * Math.cos(rad), y1: c + r1 * Math.sin(rad), x2: c + r2 * Math.cos(rad), y2: c + r2 * Math.sin(rad) }, ticks);
    }
    RING.forEach((stageId, i) => {
      const from = -90 + i * 120 + 4;
      const to = -90 + (i + 1) * 120 - 4;
      add("path", { class: "lab-ring-arc", "data-step": stageId, d: arcPath(c, c, 89, from, to) });
      const mid = (from + to) / 2;
      const bottom = mid > 0 && mid < 180;
      const id = `lab-ring-label-${stageId}`;
      add("path", { id, d: arcPath(c, c, bottom ? 97.5 : 94, from, to, bottom), fill: "none" });
      const label = add("text", { class: "lab-ring-label", "data-step": stageId });
      add("textPath", { href: `#${id}`, startOffset: "50%", "text-anchor": "middle" }, label).textContent =
        `${String(i + 1).padStart(2, "0")} ${STAGE_LABELS[stageId]}`;
      // A wide, invisible band over the arc and its label, to click on.
      const hit = add("path", { class: "lab-ring-hit", d: arcPath(c, c, 92, from, to) });
      // In slow motion, jump to this stage of the loop you are in (before or after the change).
      hit.addEventListener("click", () => guided && jumpTo((step >= 4 ? 5 : 1) + i));
    });
    return add("circle", { class: "lab-ring-marker", r: 3.4, cx: c, cy: c - 89 });
  }

  let markerProgress = 0;

  function moveMarker() {
    // Playing: follow the clock. Slow motion: rest in the middle of the stage.
    // Off the loop (at rest, or while the conditions change) it waits at the top.
    const target = guided
      ? ({ disturbance: 1 / 6, counter: 1 / 2, restored: 5 / 6, conditions: 1 }[stage] ?? 0)
      : ringProgress(stage, (simMs - startedAt) / STEPS[step].ms);
    if (target < markerProgress - 0.5) markerProgress -= 1; // carry on round, don't run back
    markerProgress += (target - markerProgress) * (guided ? 0.1 : 1);
    const rad = ((-90 + markerProgress * 360) * Math.PI) / 180;
    marker.setAttribute("cx", 100 + 89 * Math.cos(rad));
    marker.setAttribute("cy", 100 + 89 * Math.sin(rad));
  }

  /* ---------- State ---------- */

  let current = examples.get(buttons[0].dataset.id);
  let theme = current.theme;
  let previousTheme = theme;
  let themeMix = 1; // 0..1, fades the lens from the previous look to this one
  let step = 0; // index into STEPS
  let stage = "equilibrium";
  let conditions = "old";
  let rates = ratesFor("equilibrium", "old");
  let guided = false;
  let speed = 1;
  let zoom = 1;
  let zoomIndex = 0;
  let simMs = 0; // simulation clock: slows down in slow motion, stops off screen
  let startedAt = 0; // simMs when the current step began
  let conditionMix = 0; // 0..1, how far the lens has turned to the new conditions
  let sweep = 0; // 1..0, the wave of new conditions closing in from the rim
  let rewinding = null; // { target } while playing backwards
  let forwarding = null; // { target, frames } while skipping ahead
  const history = []; // snapshots of the system, for rewinding

  /* ---------- The system ---------- */

  let side = 0; // canvas size in CSS px (it is square)
  let radius = 0; // lens radius
  let size = 7; // atom radius
  let base = 50; // atoms at the starting equilibrium
  let time = 0;
  let sampleClock = 0;
  let atoms = [];
  const flashes = [];

  function makeAtom(kind, x, y) {
    return { kind, from: kind, t: 1, x, y, vx: 0, vy: 0, alpha: 1, fading: false, delay: 0, spin: Math.random() * 6, seed: Math.random(), entering: false };
  }

  function randomInLens() {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (radius - size * 2);
    return [side / 2 + Math.cos(angle) * r, side / 2 + Math.sin(angle) * r];
  }

  /** Back to the same clean equilibrium: base atoms, half of each kind, no guests. */
  function resetToRest() {
    atoms.forEach((a) => {
      if (a.kind === "guest") a.fading = true;
    });
    const system = atoms.filter((a) => a.kind !== "guest" && !a.fading);
    system.slice(base).forEach((a) => (a.fading = true));
    while (system.length < base) {
      const atom = makeAtom(system.length % 2 ? "b" : "a", ...randomInLens());
      atoms.push(atom);
      system.push(atom);
    }
    const kept = system.slice(0, base);
    const many = kept.filter((a) => a.kind === "b");
    const extra = many.length - Math.round(base / 2);
    const pool = extra > 0 ? many : kept.filter((a) => a.kind === "a");
    pool.slice(0, Math.abs(extra)).forEach((a) => convert(a, extra > 0 ? "a" : "b", false));
  }

  function convert(atom, kind, flash = true) {
    atom.from = atom.kind;
    atom.kind = kind;
    atom.t = 0;
    if (flash) flashes.push({ x: atom.x, y: atom.y, r: size, alpha: 0.8, color: colorOf(atom)[0] });
  }

  function pour() {
    const count = Math.round(base * BURST);
    const along = unitFor(current.travel);
    const source = Math.atan2(-along.y, -along.x);
    for (let i = 0; i < count; i += 1) {
      const angle = source + (Math.random() - 0.5) * 1.1;
      const r = radius + size * 3;
      const atom = makeAtom("guest", side / 2 + Math.cos(angle) * r, side / 2 + Math.sin(angle) * r);
      // Aim at a point near the centre, so every atom pours into view.
      const pace = 2 + Math.random() * 0.8;
      const aimX = side / 2 + (Math.random() - 0.5) * radius * 0.5 - atom.x;
      const aimY = side / 2 + (Math.random() - 0.5) * radius * 0.5 - atom.y;
      const aim = Math.hypot(aimX, aimY);
      atom.vx = (aimX / aim) * pace;
      atom.vy = (aimY / aim) * pace;
      atom.delay = Math.floor(i * 2.2);
      atom.entering = true;
      atoms.push(atom);
    }
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const old = side;
    side = canvas.getBoundingClientRect().width;
    if (!side) return;
    radius = side / 2;
    size = Math.max(4.5, Math.min(9, radius / 30));
    canvas.width = canvas.height = Math.round(side * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (old && old !== side) {
      const scale = side / old;
      atoms.forEach((a) => {
        a.x *= scale;
        a.y *= scale;
      });
      history.length = 0; // old snapshots are in the old size
    }
    base = atomCount(radius);
    if (!atoms.length) resetToRest();
    sizeChart();
    draw();
    drawChart();
  }

  /** One frame of the simulation. `k` is the speed: 1 normal, less in slow motion. */
  function simulate(k = speed) {
    time += k / 60;
    simMs += FRAME_MS * k;
    const swirl = Math.max(90, radius * 0.55);
    const c = side / 2;
    if (themeMix < 1) themeMix = Math.min(1, themeMix + 0.03);

    atoms.forEach((a) => {
      if (a.delay > 0) {
        a.delay -= k;
        return;
      }
      if (a.fading) a.alpha -= 0.025 * k;
      if (a.t < 1) a.t = Math.min(1, a.t + 0.04 * k);
      a.spin += 0.01 * k;

      // Reactions. System atoms turn into each other; the two directions run
      // at the same rate until the conditions change. In the push-back,
      // disturbance atoms react away.
      if (!a.fading && a.kind !== "guest" && Math.random() < (a.kind === "b" ? rates.toPeople : rates.toCode) * k) {
        convert(a, a.kind === "b" ? "a" : "b");
      }
      if (!a.fading && a.kind === "guest" && !a.entering && Math.random() < rates.react * k) {
        if (Math.random() < KEPT) {
          convert(a, Math.random() < 0.5 ? "a" : "b");
        } else {
          a.fading = true;
          flashes.push({ x: a.x, y: a.y, r: size, alpha: 0.9, color: theme.guest.light });
        }
      }

      // Motion: drift with the swirling liquid, a little inertia.
      if (a.entering) {
        if (Math.hypot(a.x - c, a.y - c) < radius * 0.55) a.entering = false;
      } else {
        const f = flowAt(a.x, a.y, time, swirl);
        a.vx += (f.x * 0.55 - a.vx) * 0.035 * k;
        a.vy += (f.y * 0.55 - a.vy) * 0.035 * k;
      }
      a.x += a.vx * k;
      a.y += a.vy * k;

      // The lens wall: the liquid turns along it.
      const dx = a.x - c;
      const dy = a.y - c;
      const d = Math.hypot(dx, dy) || 1;
      const edge = radius - size * 1.5;
      if (!a.entering && d > edge) {
        a.x = c + (dx / d) * edge;
        a.y = c + (dy / d) * edge;
        const out = (a.vx * dx + a.vy * dy) / d;
        if (out > 0) {
          a.vx -= (out * dx) / d;
          a.vy -= (out * dy) / d;
        }
      }
    });
    atoms = atoms.filter((a) => a.alpha > 0);

    // A soft nudge apart, so atoms don't overlap.
    const visible = atoms.filter((a) => a.delay <= 0);
    const min = size * 2 + 1.5;
    for (let i = 0; i < visible.length; i += 1) {
      for (let j = i + 1; j < visible.length; j += 1) {
        const a = visible[i];
        const b = visible[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = ((min - d) / 2) * 0.3;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
    }

    flashes.forEach((f) => {
      f.r += 0.9 * k;
      f.alpha -= 0.03 * k;
    });
    // The new conditions: a wave sweeps in from the rim and the lens takes on a new tint.
    const conditionTarget = conditions === "new" ? 1 : 0;
    conditionMix += (conditionTarget - conditionMix) * 0.03 * k;
    if (sweep > 0) sweep = Math.max(0, sweep - 0.01 * k);
    for (let i = flashes.length - 1; i >= 0; i -= 1) if (flashes[i].alpha <= 0) flashes.splice(i, 1);

    sampleClock += k;
    if (sampleClock >= 4) {
      sampleClock -= 4;
      sample();
    }
    if (guided) remember();
  }

  function colorOf(atom) {
    const pick = (kind) => {
      const source = kind === "guest" ? theme.guest : theme.kinds[kind];
      return [source.base, source.light];
    };
    const [toBase, toLight] = pick(atom.kind);
    if (atom.t >= 1) return [toBase, toLight];
    const [fromBase, fromLight] = pick(atom.from);
    return [mix(fromBase, toBase, atom.t), mix(fromLight, toLight, atom.t)];
  }

  /* ---------- Rewind ----------
   * In slow motion every frame is remembered. Going back plays the frames
   * in reverse, quickly, until the start of the chosen stage, then the
   * system carries on from that exact state. */

  function remember() {
    history.push({ step, simMs, startedAt, serial: sampleSerial, atoms: atoms.map((a) => ({ ...a })) });
    if (history.length > MAX_HISTORY) {
      // Keep the whole span, at half the detail.
      for (let i = history.length - 2; i > 0; i -= 2) history.splice(i, 1);
    }
  }

  function restore(snapshot) {
    atoms = snapshot.atoms.map((a) => ({ ...a }));
    simMs = snapshot.simMs;
    startedAt = snapshot.startedAt;
    while (samples.length && samples[samples.length - 1].serial > snapshot.serial) samples.pop();
    if (snapshot.step !== step) {
      applyStep(snapshot.step);
      guideStep.textContent = `⏪ Rewinding · ${stepName()}`;
    }
  }

  function startRewind(target) {
    if (!history.length) return false;
    rewinding = { target };
    flashes.length = 0;
    chips.replaceChildren();
    root.classList.add("is-rewinding");
    setNavBusy(true);
    return true;
  }

  function rewindFrame() {
    for (let i = 0; i < REWIND_PER_FRAME && history.length; i += 1) {
      const previous = history[history.length - 2];
      const snapshot = history.pop();
      restore(snapshot);
      // Stop at the first frame of the target step.
      if (step === rewinding.target && (!previous || previous.step < rewinding.target)) {
        history.push(snapshot);
        finishRewind();
        return;
      }
    }
    if (!history.length) finishRewind();
  }

  function finishRewind() {
    const target = rewinding.target;
    rewinding = null;
    root.classList.remove("is-rewinding");
    setNavBusy(false);
    applyStep(target);
    updateReadout();
  }

  function forwardFrame() {
    for (let i = 0; i < 4; i += 1) {
      simulate(1);
      forwarding.frames += 1;
      if (forwarding.frames >= STEP_FRAMES) {
        forwarding.frames = 0;
        setStep(step + 1);
        if (step === forwarding.target) {
          forwarding = null;
          setNavBusy(false);
          return;
        }
      }
    }
  }

  function setNavBusy(busy) {
    root.classList.toggle("is-busy", busy);
    [backButton, nextButton].forEach((b) => (b.disabled = busy));
    if (!busy) updateGuideButtons();
  }

  /* ---------- Drawing ---------- */

  function draw() {
    if (!side) return;
    const c = side / 2;
    const lens = mix(mix(previousTheme.lens, theme.lens, themeMix), theme.kinds.a.base, conditionMix * 0.16);
    ctx.clearRect(0, 0, side, side);
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, Math.PI * 2);
    ctx.clip();

    const glass = ctx.createRadialGradient(c * 0.8, c * 0.75, radius * 0.1, c, c, radius);
    glass.addColorStop(0, rgba(mix(lens, [255, 255, 255], 0.07), 1));
    glass.addColorStop(1, rgba(lens, 1));
    ctx.fillStyle = glass;
    ctx.fillRect(0, 0, side, side);
    drawOverlay(theme.raw.overlay, c);

    if (sweep > 0) {
      // The wave of new conditions, closing in from the rim.
      const r = radius * sweep;
      ctx.strokeStyle = rgba(theme.kinds.a.base, Math.min(1, sweep * 1.4) * 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
      const wash = ctx.createRadialGradient(c, c, r, c, c, radius);
      wash.addColorStop(0, rgba(theme.kinds.a.base, 0.12 * sweep));
      wash.addColorStop(1, rgba(theme.kinds.a.base, 0));
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, side, side);
    }

    ctx.save();
    ctx.translate(c, c);
    ctx.scale(zoom, zoom);
    ctx.translate(-c, -c);
    flashes.forEach((f) => {
      ctx.strokeStyle = rgba(f.color, Math.max(f.alpha, 0) * 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.stroke();
    });
    atoms.forEach((a) => {
      if (a.delay > 0) return;
      const [baseColor, light] = colorOf(a);
      const shape = a.kind === "guest" ? theme.raw.guest.shape : theme.raw.shape;
      drawShape(shape, a.x, a.y, a.kind === "guest" ? size * 1.2 : size, baseColor, light, a.alpha, a.spin, lens, a.seed);
    });
    ctx.restore();

    // A moving band for the screen-like worlds, and tape lines while rewinding.
    if (theme.raw.overlay === "scan" || rewinding) {
      const y = rewinding ? side - ((time * 600) % (side + 60)) : ((time * 40) % (side + 60)) - 30;
      const band = ctx.createLinearGradient(0, y - 30, 0, y + 30);
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.5, `rgba(255,255,255,${rewinding ? 0.12 : 0.05})`);
      band.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, y - 30, side, 60);
    }
    ctx.restore();
  }

  const grain = makeGrain();
  const seams = makeSeams();

  function drawOverlay(kind, c) {
    if (kind === "scan") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      for (let y = 0; y < side; y += 3) ctx.fillRect(0, y, side, 1);
    } else if (kind === "grid") {
      ctx.strokeStyle = "rgba(190, 215, 255, 0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let v = (c % 24) - 24; v < side; v += 24) {
        ctx.moveTo(v + 0.5, 0);
        ctx.lineTo(v + 0.5, side);
        ctx.moveTo(0, v + 0.5);
        ctx.lineTo(side, v + 0.5);
      }
      ctx.stroke();
    } else if (kind === "cracks") {
      // Gold seams across the glaze, like mended pottery.
      ctx.strokeStyle = "rgba(230, 180, 80, 0.22)";
      ctx.lineWidth = 1.2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      seams.forEach((line) =>
        line.forEach(([px, py], i) => (i ? ctx.lineTo(c + px * radius, c + py * radius) : ctx.moveTo(c + px * radius, c + py * radius))),
      );
      ctx.stroke();
    } else if (kind === "grain" && grain) {
      ctx.fillStyle = ctx.createPattern(grain, "repeat");
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, 0, side, side);
      ctx.globalAlpha = 1;
    }
    // A faint reticle, like an eyepiece.
    ctx.strokeStyle = "rgba(220, 225, 255, 0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c, 0);
    ctx.lineTo(c, side);
    ctx.moveTo(0, c);
    ctx.lineTo(side, c);
    ctx.stroke();
  }

  function drawShape(shape, x, y, r, base, light, alpha, spin, lens, seed = 0.5) {
    const fill = (color, a = alpha) => (ctx.fillStyle = rgba(color, a));
    const stroke = (color, width, a = alpha) => {
      ctx.strokeStyle = rgba(color, a);
      ctx.lineWidth = width;
    };
    ctx.beginPath();
    switch (shape) {
      case "ring": {
        // Neon: a glowing hoop with a bright core.
        fill(base, alpha * 0.14);
        ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        stroke(base, r * 0.38);
        ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        fill(light);
        ctx.arc(x, y, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "square": {
        // Terminal: a pixel with a lit corner.
        const s = Math.round(r * 1.7);
        const left = Math.round(x - s / 2);
        const top = Math.round(y - s / 2);
        fill(base);
        ctx.fillRect(left, top, s, s);
        fill(light);
        ctx.fillRect(left, top, Math.ceil(s / 3), Math.ceil(s / 3));
        break;
      }
      case "gear": {
        // Brass: a turning cog with a hole.
        const teeth = 8;
        for (let i = 0; i < teeth; i += 1) {
          const angle = spin + (i / teeth) * Math.PI * 2;
          [
            [angle - 0.24, 0.74],
            [angle - 0.14, 1.05],
            [angle + 0.14, 1.05],
            [angle + 0.24, 0.74],
          ].forEach(([t, m], j) => {
            const px = x + Math.cos(t) * r * m;
            const py = y + Math.sin(t) * r * m;
            if (i === 0 && j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
        }
        ctx.closePath();
        const metal = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        metal.addColorStop(0, rgba(light, alpha));
        metal.addColorStop(0.5, rgba(base, alpha));
        metal.addColorStop(1, rgba(mix(base, [20, 10, 0], 0.5), alpha));
        ctx.fillStyle = metal;
        ctx.fill();
        ctx.beginPath();
        fill(lens);
        ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "shard": {
        // Kintsugi: a broken piece of pottery, its edges sealed with a seam.
        const corners = 5 + Math.floor(seed * 2);
        for (let i = 0; i < corners; i += 1) {
          const angle = spin * 0.3 + (i / corners) * Math.PI * 2 + Math.sin(seed * 13 + i) * 0.35;
          const m = 0.78 + 0.32 * Math.abs(Math.sin(seed * 29 + i * 1.7));
          const px = x + Math.cos(angle) * r * m * 1.15;
          const py = y + Math.sin(angle) * r * m * 1.15;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const glaze = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        glaze.addColorStop(0, rgba(mix(base, light, 0.35), alpha));
        glaze.addColorStop(1, rgba(mix(base, [10, 8, 6], 0.35), alpha));
        ctx.fillStyle = glaze;
        ctx.fill();
        stroke(light, 1.3);
        ctx.stroke();
        break;
      }
      case "bolt": {
        // The clash: a jagged crack of light.
        fill(base, alpha * 0.12);
        ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(spin * 0.5);
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, -r * 1.3);
        ctx.lineTo(r * 0.35, -r * 0.35);
        ctx.lineTo(-r * 0.3, r * 0.05);
        ctx.lineTo(r * 0.3, r * 0.45);
        ctx.lineTo(-r * 0.1, r * 1.3);
        stroke(base, Math.max(2, r * 0.32));
        ctx.lineJoin = "miter";
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "blob": {
        // Ember: a soft, warm glow.
        const glow = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.5);
        glow.addColorStop(0, rgba(light, alpha));
        glow.addColorStop(0.45, rgba(base, alpha * 0.9));
        glow.addColorStop(1, rgba(base, 0));
        ctx.fillStyle = glow;
        ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "outline": {
        // Blueprint: a drawn circle with a centre mark.
        stroke(base, 1.6);
        ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        stroke(base, 1, alpha * 0.7);
        ctx.moveTo(x - r * 0.4, y);
        ctx.lineTo(x + r * 0.4, y);
        ctx.moveTo(x, y - r * 0.4);
        ctx.lineTo(x, y + r * 0.4);
        ctx.stroke();
        break;
      }
      case "diamond": {
        fill(base, alpha * 0.18);
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.2);
        ctx.lineTo(x + r * 0.9, y);
        ctx.lineTo(x, y + r * 1.2);
        ctx.lineTo(x - r * 0.9, y);
        ctx.closePath();
        fill(base);
        ctx.fill();
        stroke(light, 1.2);
        ctx.stroke();
        break;
      }
      case "cross": {
        const s = Math.round(r * 1.9);
        stroke(base, 1.5);
        ctx.strokeRect(Math.round(x - s / 2) + 0.5, Math.round(y - s / 2) + 0.5, s, s);
        ctx.beginPath();
        stroke(base, Math.max(2, r * 0.35));
        ctx.moveTo(x - r * 0.55, y - r * 0.55);
        ctx.lineTo(x + r * 0.55, y + r * 0.55);
        ctx.moveTo(x + r * 0.55, y - r * 0.55);
        ctx.lineTo(x - r * 0.55, y + r * 0.55);
        ctx.stroke();
        break;
      }
      case "card": {
        // A sheet of paper: the call for proposals.
        const w = r * 1.7;
        const h = r * 2.1;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(spin) * 0.3);
        fill(base);
        ctx.fillRect(-w / 2, -h / 2, w, h);
        stroke(mix(base, [60, 40, 20], 0.6), 1);
        ctx.beginPath();
        for (let line = 0; line < 3; line += 1) {
          const ly = -h / 2 + h * (0.3 + line * 0.2);
          ctx.moveTo(-w * 0.32, ly);
          ctx.lineTo(w * (line === 2 ? 0.1 : 0.32), ly);
        }
        ctx.stroke();
        ctx.restore();
        break;
      }
      case "star": {
        for (let i = 0; i < 10; i += 1) {
          const angle = spin + (i / 10) * Math.PI * 2 - Math.PI / 2;
          const m = i % 2 ? 0.45 : 1.25;
          const px = x + Math.cos(angle) * r * m;
          const py = y + Math.sin(angle) * r * m;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        fill(base);
        ctx.fill();
        break;
      }
      case "triangle": {
        ctx.moveTo(x, y - r * 1.2);
        ctx.lineTo(x + r * 1.1, y + r * 0.8);
        ctx.lineTo(x - r * 1.1, y + r * 0.8);
        ctx.closePath();
        fill(base);
        ctx.fill();
        break;
      }
      default: {
        fill(base);
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---------- The chart: amount of each kind over time ---------- */

  const WINDOW = Math.round(((AUTOPLAY_MS + 2000) / 1000) * 15); // samples, 15 per second of sim time
  const samples = [];
  let sampleSerial = 0;
  let pendingMark = null;
  let chartWidth = 0;
  let chartHeight = 0;

  function sample() {
    let a = 0;
    let b = 0;
    let guest = 0;
    atoms.forEach((atom) => {
      if (atom.fading || atom.delay > 0) return;
      if (atom.kind === "guest") guest += 1;
      else if (atom.kind === "a") a += 1;
      else b += 1;
    });
    sampleSerial += 1;
    samples.push({ a, b, guest, mark: pendingMark, serial: sampleSerial });
    pendingMark = null;
    if (samples.length > WINDOW) samples.shift();
  }

  function sizeChart() {
    const box = chartCanvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    chartWidth = box.width;
    chartHeight = box.height;
    chartCanvas.width = Math.round(chartWidth * ratio);
    chartCanvas.height = Math.round(chartHeight * ratio);
    chart.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawChart() {
    const w = chartWidth;
    const h = chartHeight;
    if (!w) return;
    chart.clearRect(0, 0, w, h);
    const top = 6;
    const bottom = h - 4;
    const max = Math.max(base * 1.05, ...samples.map((s) => Math.max(s.a, s.b, s.guest)));
    const x = (i) => (i / (WINDOW - 1)) * w;
    const y = (v) => bottom - (v / max) * (bottom - top);

    chart.strokeStyle = "rgba(154, 166, 207, 0.25)";
    chart.lineWidth = 1;
    chart.beginPath();
    chart.moveTo(0, bottom + 0.5);
    chart.lineTo(w, bottom + 0.5);
    chart.stroke();

    // Stage changes as dashed lines.
    chart.setLineDash([3, 4]);
    samples.forEach((s, i) => {
      if (!s.mark || s.mark === "equilibrium" || s.mark === "restored") return;
      chart.strokeStyle =
        s.mark === "counter" ? "rgba(255, 107, 94, 0.6)" : s.mark === "conditions" ? rgba(theme.kinds.a.base, 0.9) : rgba(theme.guest.base, 0.6);
      chart.lineWidth = s.mark === "conditions" ? 2 : 1;
      chart.beginPath();
      chart.moveTo(x(i), top);
      chart.lineTo(x(i), bottom);
      chart.stroke();
    });
    chart.setLineDash([]);

    const line = (key, color) => {
      chart.strokeStyle = rgba(color, 1);
      chart.lineWidth = 2;
      chart.lineJoin = "round";
      chart.beginPath();
      samples.forEach((s, i) => (i ? chart.lineTo(x(i), y(s[key])) : chart.moveTo(x(i), y(s[key]))));
      chart.stroke();
    };
    line("b", theme.kinds.b.base);
    line("a", theme.kinds.a.base);
    line("guest", theme.guest.base);
  }

  function updateLegend() {
    const entries = [theme.raw.kinds.a, theme.raw.kinds.b, theme.raw.guest];
    legend.replaceChildren(
      ...entries.map(({ label, base: color }) => {
        const li = document.createElement("li");
        const dot = document.createElement("i");
        dot.className = "lab-dot";
        dot.style.background = color;
        li.append(dot, label);
        return li;
      }),
    );
  }

  /* ---------- Caption, chips and the slow-motion guide ---------- */

  function stepName() {
    if (stage === "equilibrium") return "At rest";
    if (stage === "conditions") return "★ I change the conditions";
    const label = `${String(RING.indexOf(stage) + 1).padStart(2, "0")} · ${STAGE_LABELS[stage]}`;
    return conditions === "new" ? `${label} · new conditions` : label;
  }

  function captionFor(index) {
    return [
      "Atoms turn into each other at the same rate both ways, so the amounts stay level. That balance is set by the conditions. Pick a disturbance.",
      current.disturbance,
      "The system pushes back.",
      "Back to the same balance. Same conditions, same equilibrium.",
      `Now I change the conditions: ${current.theme.raw.condition.toLowerCase()}. Nothing new pours in, and the balance moves.`,
      "The same disturbance again, under the new conditions.",
      "The system still pushes back, but now toward the new balance.",
      current.principle,
    ][index];
  }

  function updateReadout() {
    captionStep.textContent = step === 0 ? "At equilibrium" : stepName();
    captionText.textContent = captionFor(step);
    chips.replaceChildren();
    const kind = step === 2 ? "push" : step === 4 ? "fix" : null;
    if (kind && !guided) {
      current[kind].forEach((text, i) => {
        const chip = document.createElement("li");
        chip.className = `lab-chip lab-chip--${kind}`;
        chip.textContent = text;
        chip.style.transitionDelay = `${200 + i * 220}ms`;
        chips.append(chip);
        requestAnimationFrame(() => requestAnimationFrame(() => chip.classList.add("is-shown")));
      });
    }
    if (guided) updateGuide();
  }

  function updateGuide() {
    guideStep.textContent = stepName();
    guideScience.textContent = scienceFor(stage, conditions, theme.raw);
    const panel = current.panel;
    const say = (text, className) => {
      const p = document.createElement("p");
      p.textContent = text;
      if (className) p.className = className;
      guideBody.append(p);
    };
    const column = (name) => {
      const col = panel.querySelector(`.lab-col[data-step="${name}"]`);
      const heading = document.createElement("h4");
      heading.textContent = col.querySelector("h3").textContent.replace(/^\s*\d+\s*/, "");
      guideBody.append(heading);
      col.querySelectorAll("p, ul").forEach((node) => guideBody.append(node.cloneNode(true)));
    };
    guideBody.replaceChildren();
    switch (step) {
      case 0:
        say("The way things already work, before anything happens.");
        break;
      case 1:
        column("disturbance");
        break;
      case 2:
        column("counter");
        break;
      case 3:
        say("Same conditions, same balance. However hard the system is pushed, it settles where it was.");
        break;
      case 4:
        column("settled");
        break;
      case 5:
        say("The same kind of disturbance, now meeting the new conditions.");
        break;
      case 6:
        say("The push-back is still there. It now pulls toward the new balance.");
        break;
      default:
        say(current.principle, "lab-guide-principle");
    }
    updateGuideButtons();
  }

  function updateGuideButtons() {
    backButton.disabled = step === 0;
    backButton.textContent = "⏪ Rewind a step";
    nextButton.textContent =
      {
        0: "Start the disturbance →",
        3: "★ Change the conditions →",
        4: "Disturb it again →",
        [LAST]: "⏮ Rewind to the start",
      }[step] ?? "Next step →";
  }

  /* ---------- Steps ---------- */

  /** Point every piece of state at a step, without side effects. */
  function applyStep(index) {
    step = index;
    ({ stage, conditions } = STEPS[index]);
    rates = ratesFor(stage, conditions);
    root.dataset.step = String(index);
    root.dataset.stage = stage;
    root.dataset.conditions = conditions;
  }

  /** Begin a step: the burst pours in, or the conditions change. */
  function setStep(index) {
    applyStep(index);
    startedAt = simMs;
    pendingMark = stage;
    // At the end of each played story, offer slow motion; fold it away when the next one starts.
    root.classList.toggle("offer-slow", index === LAST && !guided);
    if (stage === "disturbance") {
      // The first disturbance starts from the old balance; the second keeps the new one.
      if (conditions === "old") resetToRest();
      else trimToBase();
      pour();
    }
    if (stage === "conditions") sweep = 1;
    updateReadout();
    if (reducedMotion.matches) settleNow();
  }

  /** Clear out leftovers from the last burst without touching the balance. */
  function trimToBase() {
    atoms.forEach((a) => {
      if (a.kind === "guest") a.fading = true;
    });
    const system = atoms.filter((a) => a.kind !== "guest" && !a.fading);
    system
      .sort(() => Math.random() - 0.5)
      .slice(base)
      .forEach((a) => (a.fading = true));
  }

  function useExample(id) {
    const example = examples.get(id);
    if (example !== current) {
      previousTheme = theme;
      themeMix = 0;
    }
    current = example;
    theme = example.theme;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === example.button)));
    panels.forEach((p) => (p.hidden = p !== example.panel));
    root.style.setProperty("--active-color", theme.raw.guest.base);
    root.style.setProperty("--condition-color", theme.raw.kinds.a.base);
    gaugeCondition.textContent = `→ ${theme.raw.condition}`;
    updateLegend();
  }

  /** Playing mode: pick a disturbance and run the whole story. */
  function play(id) {
    useExample(id);
    setStep(1);
  }

  /** In playing mode the clock moves the steps; in slow motion the reader does. */
  function advanceClock() {
    if (guided || simMs - startedAt < STEPS[step].ms) return;
    if (step < LAST) setStep(step + 1);
    else if (autoplay) {
      const index = buttons.indexOf(current.button);
      play(buttons[(index + 1) % buttons.length].dataset.id);
    }
  }

  /** Slow motion: start this example over, at rest, with a fresh history. */
  function restartGuided() {
    rewinding = null;
    forwarding = null;
    history.length = 0;
    root.classList.remove("is-rewinding");
    setNavBusy(false);
    resetToRest();
    setStep(0);
  }

  /**
   * Slow motion: go to a step. Earlier steps (or the start of this one)
   * rewind; the next step just begins; steps further on are skipped
   * through quickly.
   */
  function jumpTo(index) {
    if (rewinding || forwarding) return;
    if (index <= step) {
      if (reducedMotion.matches || !startRewind(index)) restartGuided();
      if (reducedMotion.matches) {
        for (let i = 1; i <= index; i += 1) setStep(i);
      }
    } else if (index === step + 1) {
      setStep(index);
    } else {
      setStep(step + 1);
      if (reducedMotion.matches) {
        for (let i = step + 1; i <= index; i += 1) setStep(i);
      } else {
        forwarding = { target: index, frames: 0 };
        setNavBusy(true);
      }
    }
  }

  function enterSlowMotion() {
    stopAutoplay();
    guided = true;
    speed = SLOW;
    root.classList.add("is-guided");
    guide.hidden = false;
    guideNav.hidden = false;
    slowButton.hidden = true;
    restartGuided();
    nextButton.focus();
    requestAnimationFrame(resize);
  }

  function exitSlowMotion() {
    guided = false;
    speed = 1;
    rewinding = null;
    forwarding = null;
    history.length = 0;
    root.classList.remove("is-rewinding", "is-guided", "is-busy");
    guide.hidden = true;
    guideNav.hidden = true;
    slowButton.hidden = false;
    play(current.id);
    slowButton.focus();
    requestAnimationFrame(resize);
  }

  function setZoom(index) {
    zoomIndex = Math.max(0, Math.min(ZOOMS.length - 1, index));
    zoom = ZOOMS[zoomIndex];
    zoomLevel.textContent = `${zoom}×`;
    zoomHint.textContent = zoomIndex === ZOOMS.length - 1 ? "click the lens to zoom out" : "or click the lens";
    canvas.style.cursor = zoomIndex === ZOOMS.length - 1 ? "zoom-out" : "zoom-in";
    if (!frame) draw();
  }

  // The lens is the way in: click it to slow down; in slow motion, click it to zoom.
  canvas.addEventListener("click", () => {
    if (!guided) enterSlowMotion();
    else setZoom(zoomIndex === ZOOMS.length - 1 ? 0 : zoomIndex + 1);
  });

  slowButton.addEventListener("click", enterSlowMotion);
  exitButton.addEventListener("click", exitSlowMotion);
  backButton.addEventListener("click", () => jumpTo(Math.max(0, step - 1)));
  nextButton.addEventListener("click", () => jumpTo(step === LAST ? 0 : step + 1));
  scope.querySelectorAll("[data-zoom]").forEach((button) => {
    button.addEventListener("click", () => setZoom(zoomIndex + Number(button.dataset.zoom)));
  });

  buttons.forEach((button) => {
    const pick = () => {
      if (guided) {
        useExample(button.dataset.id);
        restartGuided();
        return;
      }
      stopAutoplay();
      if (button.dataset.id !== current.id || step === LAST || step === 0) play(button.dataset.id);
    };
    button.addEventListener("click", pick);
    button.addEventListener("pointerenter", () => {
      // Hover previews in playing mode only; slow motion waits for a click.
      if (finePointer.matches && !guided && button.dataset.id !== current.id) pick();
    });
  });

  /* ---------- Autoplay ----------
   * Until someone picks a disturbance, the lab walks through them on its own
   * while it is on screen. */

  let autoplay = false;
  let userTookOver = false;

  function startAutoplay() {
    if (autoplay || userTookOver || guided || reducedMotion.matches) return;
    autoplay = true;
    root.classList.add("is-autoplay");
    if (step === 0) play(current.id);
  }

  function stopAutoplay() {
    userTookOver = true;
    autoplay = false;
    root.classList.remove("is-autoplay");
  }

  /* ---------- Frame loop ---------- */

  let frame = null;
  let visible = false;

  function tick() {
    if (rewinding) {
      time += 1 / 60;
      rewindFrame();
    } else if (forwarding) {
      forwardFrame();
    } else {
      simulate();
      advanceClock();
    }
    draw();
    drawChart();
    moveMarker();
    frame = requestAnimationFrame(tick);
  }

  function run() {
    if (frame || !visible || document.hidden || reducedMotion.matches) return;
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    cancelAnimationFrame(frame);
    frame = null;
  }

  /** Reduced motion: jump straight to each stage's end state and draw it once. */
  function settleNow() {
    for (let i = 0; i < 300; i += 1) simulate(1);
    themeMix = 1;
    draw();
    drawChart();
    markerProgress = ringProgress(stage, 1);
    const rad = ((-90 + markerProgress * 360) * Math.PI) / 180;
    marker.setAttribute("cx", 100 + 89 * Math.cos(rad));
    marker.setAttribute("cy", 100 + 89 * Math.sin(rad));
  }

  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        run();
        // Give people a moment to see the resting state first.
        setTimeout(() => visible && startAutoplay(), 2000);
      } else {
        pause();
      }
    },
    { threshold: 0.35 },
  ).observe(scope);

  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : run()));
  new ResizeObserver(resize).observe(scope);

  // First paint: the first example, the system at rest.
  useExample(current.id);
  applyStep(0);
  updateReadout();
  resize();
  if (reducedMotion.matches) settleNow();
}

/** Theme colours as [r, g, b] for drawing. */
function parseTheme(raw) {
  const pair = ({ base, light }) => ({ base: parseHex(base), light: parseHex(light) });
  return { raw, lens: parseHex(raw.lens), kinds: { a: pair(raw.kinds.a), b: pair(raw.kinds.b) }, guest: pair(raw.guest) };
}

function makeGrain() {
  const tile = document.createElement("canvas");
  tile.width = tile.height = 96;
  const g = tile.getContext("2d");
  if (!g) return null;
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = Math.random() < 0.5 ? "rgba(255, 230, 190, 0.08)" : "rgba(0, 0, 0, 0.18)";
    g.fillRect(Math.random() * 96, Math.random() * 96, 1, 1);
  }
  return tile;
}

/** A few crack lines from the rim inward, in lens units (-1..1). */
function makeSeams() {
  return Array.from({ length: 7 }, () => {
    const angle = Math.random() * Math.PI * 2;
    let x = Math.cos(angle) * 1.02;
    let y = Math.sin(angle) * 1.02;
    const line = [[x, y]];
    for (let i = 0; i < 6; i += 1) {
      const length = 0.08 + Math.random() * 0.14;
      const inward = Math.atan2(-y, -x) + (Math.random() - 0.5) * 1.2;
      x += Math.cos(inward) * length;
      y += Math.sin(inward) * length;
      line.push([x, y]);
    }
    return line;
  });
}

function rgba([r, g, b], alpha) {
  return `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
}
