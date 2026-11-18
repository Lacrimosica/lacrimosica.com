import {
  announcementFor,
  createCycle,
  targetsFor,
} from "./js/cycle.js";
import { preserveLanguageScroll } from "/js/language-scroll.js";
import { createFluidSim } from "./js/fluid-sim.js";
import { createLiquidLayer } from "./js/liquid-layer.js";
import { readPalette } from "./js/palette.js";
import { createParticleLayer } from "./js/particle-layer.js";
import { createPhaseGeometry } from "./js/phase-geometry.js";

document.getElementById("year").textContent = new Date().getFullYear();
preserveLanguageScroll();

const split = document.querySelector(".identity-split");
const panels = Array.from(split.querySelectorAll(".identity-panel"));
const announce = document.getElementById("equilibrium-announce");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const narrow = window.matchMedia("(max-width: 700px)");

/* ---------- Identity panels ----------
 * The panels and the switch disturb the Le Châtelier cycle; the cycle's
 * stages are mirrored into data attributes for the CSS and into text for
 * people using a screen reader. */

const cycle = createCycle();

cycle.subscribe((state) => {
  split.dataset.active = state.side;
  split.dataset.stage = state.stage;
  const message = announcementFor(state);
  if (message) announce.textContent = message;
});

function activatePanel(panel) {
  panels.forEach((item) => item.setAttribute("aria-pressed", String(item === panel)));
  cycle.disturb(panel.dataset.side);
}

panels.forEach((panel) => {
  panel.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") activatePanel(panel);
  });
  panel.addEventListener("focus", () => activatePanel(panel));
  panel.addEventListener("click", () => activatePanel(panel));
});

/* ---------- Fluid equilibrium hero ----------
 * Two liquid phases coloured like the cobalt chloride equilibrium, the classic
 * Le Châtelier demonstration: cobalt blue for code, rose for people, and a
 * violet buffer band where they meet. The pointer pushes the phase boundary
 * away (the system opposing a disturbance), and when you cross it the
 * boundary springs through behind you.
 *
 * Here the hero is only wired up: the phase geometry knows where the phases
 * are, the fluid simulation moves everything, and the liquid and particle
 * layers draw each frame. */

const POINTER_IDLE_MS = 4000;
const geometry = createPhaseGeometry();

function startFluidHero() {
  let palette;
  try {
    const rootStyle = getComputedStyle(document.documentElement);
    palette = readPalette((name) => rootStyle.getPropertyValue(name));
  } catch (error) {
    console.warn(error);
    return false; // keep the SVG wave as the fallback
  }

  const liquidCanvas = document.createElement("canvas");
  const particleCanvas = document.createElement("canvas");
  liquidCanvas.className = "fluid-layer fluid-layer--liquid";
  particleCanvas.className = "fluid-layer fluid-layer--particles";
  liquidCanvas.setAttribute("aria-hidden", "true");
  particleCanvas.setAttribute("aria-hidden", "true");

  const liquid = createLiquidLayer(liquidCanvas, { geometry, palette });
  if (!liquid) return false; // keep the SVG wave as the fallback
  const particles = createParticleLayer(particleCanvas, { geometry, palette });
  const sim = createFluidSim({ geometry });

  split.prepend(particleCanvas);
  split.prepend(liquidCanvas);
  split.classList.add("is-fluid");

  // Every disturbance agitates the exchange, even one that interrupts another.
  cycle.subscribe(({ stage }) => {
    if (stage === "disturbance") sim.agitate();
  });

  const real = { x: 0, y: 0, inside: false, lastMove: -Infinity };
  let running = false;
  let visible = true;
  let frame = 0;
  let last = 0;

  split.addEventListener("pointermove", (event) => {
    const rect = split.getBoundingClientRect();
    real.x = event.clientX - rect.left;
    real.y = event.clientY - rect.top;
    real.inside = true;
    real.lastMove = performance.now();
  });
  split.addEventListener("pointerleave", () => {
    real.inside = false;
  });

  function resize() {
    const rect = split.getBoundingClientRect();
    geometry.resize(rect.width, rect.height, !narrow.matches);
    sim.reset();
    liquid.resize(geometry.width, geometry.height);
    particles.resize(geometry.width, geometry.height);
    if (!running) liquid.draw(sim.frame());
  }

  function tick(now) {
    // rAF timestamps can precede the performance.now() taken when starting.
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = Math.max(last, now);
    if (dt > 0) {
      const present = real.inside && now - real.lastMove <= POINTER_IDLE_MS;
      const next = sim.step(dt, { pointer: present ? real : null, targets: targetsFor(cycle.state) });
      liquid.draw(next);
      particles.step(dt, next);
    }
    frame = requestAnimationFrame(tick);
  }

  function updateRunning() {
    const shouldRun = visible && !document.hidden && !reducedMotion.matches;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(frame);
      if (reducedMotion.matches) {
        particles.clear();
        liquid.draw(sim.frame());
      }
    }
  }

  new ResizeObserver(resize).observe(split);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateRunning();
  }).observe(split);
  document.addEventListener("visibilitychange", updateRunning);
  reducedMotion.addEventListener("change", updateRunning);

  resize();
  updateRunning();
  return true;
}

// Phones get the same fluid hero as desktop (the layout turns vertical on
// narrow screens). The SVG wave stays as the fallback when WebGL is missing
// and under reduced motion.
if (!reducedMotion.matches) startFluidHero();

/* ---------- Custom cursor ----------
 * Each part of the page declares its cursor zone in markup with data-cursor
 * (the innermost one wins; "paper" when none). The "phase" zone resolves to
 * the phase under the pointer. */

if (finePointer.matches && !reducedMotion.matches) {
  const cursorDot = document.querySelector(".custom-cursor-dot");
  const cursorRing = document.querySelector(".custom-cursor-ring");
  const target = { x: -100, y: -100 };
  const ring = { x: -100, y: -100 };
  let ringFrame = 0;
  let last = 0;

  document.body.classList.add("custom-cursor-enabled");

  function zoneAt(element, clientX, clientY) {
    const zone = element?.closest("[data-cursor]")?.dataset.cursor ?? "paper";
    if (zone !== "phase") return zone;
    const rect = split.getBoundingClientRect();
    return geometry.phaseAt(clientX - rect.left, clientY - rect.top);
  }

  function moveRing(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = Math.max(last, now);
    const follow = 1 - Math.exp(-dt * 16);
    ring.x += (target.x - ring.x) * follow;
    ring.y += (target.y - ring.y) * follow;
    const dx = target.x - ring.x;
    const dy = target.y - ring.y;
    const speed = Math.hypot(dx, dy) / dt;
    const stretch = 1 + Math.min(speed / 3000, 0.35);
    const angle = Math.atan2(dy, dx);
    cursorRing.style.transform =
      `translate3d(${ring.x}px, ${ring.y}px, 0) rotate(${angle}rad) scale(${stretch}, ${1 / stretch})`;
    if (Math.abs(target.x - ring.x) + Math.abs(target.y - ring.y) > 0.2) {
      ringFrame = requestAnimationFrame(moveRing);
    } else {
      ringFrame = 0;
    }
  }

  window.addEventListener("pointermove", (event) => {
    const element = event.target instanceof Element ? event.target : null;
    target.x = event.clientX;
    target.y = event.clientY;
    cursorDot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
    document.body.classList.add("cursor-active");
    document.body.dataset.cursorZone = zoneAt(element, event.clientX, event.clientY);
    document.body.classList.toggle(
      "cursor-hover",
      Boolean(element?.closest("a, button:not(.identity-panel)"))
    );
    if (!ringFrame) {
      last = performance.now();
      ringFrame = requestAnimationFrame(moveRing);
    }
  });

  window.addEventListener("scroll", () => {
    if (target.x < 0) return;
    const element = document.elementFromPoint(target.x, target.y);
    if (element) document.body.dataset.cursorZone = zoneAt(element, target.x, target.y);
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => {
    document.body.classList.add("cursor-outside");
  });
  document.documentElement.addEventListener("pointerenter", () => {
    document.body.classList.remove("cursor-outside");
  });
}
