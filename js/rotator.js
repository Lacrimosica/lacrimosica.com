/* ---------- Story headline rotator: a scroll-driven clock ----------
 * The subjects stack in a one-line window, each followed by a full stop.
 * Scrolling is wind: it pushes them along, they keep rolling and slow under
 * friction. When the page is still, the rotator ticks on by itself, one
 * subject every few seconds, easing into place like a clock. Subjects live
 * in data-subjects; the heading keeps a fixed aria-label so screen readers
 * hear one stable sentence. */

const WIND = 0.012; // subject steps per px scrolled, as an impulse
const FRICTION = 1.6; // how fast the roll slows, per second
const IDLE_MS = 400; // no scrolling for this long and the clock takes over
const TICK_MS = 3500; // time between ticks when the page is still
const SETTLE = 6; // how strongly each tick eases into place
const DAMP = 4.9; // about critical damping, so a tick lands without wobble

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const roots = document.querySelectorAll(".story-rotator, .identity-concept-rotator");
if (!reducedMotion.matches) roots.forEach(start);

function start(el) {
  const subjects = el.dataset.subjects.split("|");
  const n = subjects.length;
  const suffix = el.dataset.suffix ?? ".";
  const label = (text) => `${text}${suffix}`;
  const first = Math.max(0, subjects.indexOf(el.textContent.trim().replace(/\.$/, "")));

  // Measure every phrase so the rotator fits the widest one in the current font.
  el.textContent = "";
  const sizer = document.createElement("span");
  sizer.className = "story-rotator-sizer";
  subjects.forEach((text) => {
    const measure = document.createElement("span");
    measure.textContent = label(text);
    sizer.append(measure);
  });
  el.append(sizer);
  const items = subjects.map((text) => {
    const item = document.createElement("span");
    item.className = "story-rotator-item";
    item.textContent = label(text);
    el.append(item);
    return item;
  });

  let pos = first; // position in steps, continuous
  let target = first; // the subject the drum is easing towards
  let vel = 0; // steps per second
  let lastY = window.scrollY;
  let lastScroll = -Infinity;
  let lastTick = 0;
  let visible = false;
  let frame = 0;
  let last = 0;

  const render = () => {
    items.forEach((item, i) => {
      let d = (((i - pos) % n) + n) % n; // wrap so the list loops
      if (d > n / 2) d -= n;
      item.style.transform = `translateY(${d * 1.3}em)`;
      item.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 1.2));
    });
  };

  const tick = (now) => {
    if (!visible) {
      frame = 0;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (now - lastScroll > IDLE_MS) {
      // Still page: the clock ticks on one subject at a time.
      if (now - lastTick > TICK_MS) {
        target += 1;
        lastTick = now;
      }
      vel += ((target - pos) * SETTLE - vel * DAMP) * dt;
    } else {
      // Wind: the roll slows under friction, and the next tick starts from wherever it lands.
      vel *= Math.exp(-FRICTION * dt);
      target = Math.round(pos);
      lastTick = now;
    }
    pos += vel * dt;
    render();
    frame = requestAnimationFrame(tick);
  };

  const wake = () => {
    if (!frame) {
      last = performance.now();
      lastTick = last;
      frame = requestAnimationFrame(tick);
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (!visible || !delta) return;
      lastScroll = performance.now();
      vel += delta * WIND;
      wake();
    },
    { passive: true },
  );

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  }).observe(el);

  render();
}
