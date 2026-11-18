/* ---------- Le Châtelier lab: the rules of the system ----------
 * The lab is a microscope view of a solution in dynamic equilibrium: two
 * kinds of atom keep turning into each other at the same rate, so the
 * amounts stay level. A disturbance pours in a burst of new atoms. The
 * system pushes back by reacting them away and returns to the same balance:
 * same conditions, same equilibrium (the constant K does not move). Then,
 * as a separate act, someone changes the conditions, like the temperature
 * of a reaction: the two directions stop running at the same rate and the
 * balance itself moves. The same disturbance then returns to the new
 * balance. That is the point of the lab.
 *
 * Directions are in degrees on screen: 0 travels right, 90 travels down. */

/**
 * The story, one step at a time. A disturbance never moves the balance: the
 * system pushes back and returns to where it was. Changing the conditions
 * is a separate act, made by people, and it is the only thing that moves
 * the balance. Then the same disturbance comes back, and the system returns
 * to the new balance instead. `ms` is how long a step plays on its own.
 */
export const STEPS = [
  { stage: "equilibrium", conditions: "old", ms: 1200 },
  { stage: "disturbance", conditions: "old", ms: 2600 },
  { stage: "counter", conditions: "old", ms: 3800 },
  { stage: "restored", conditions: "old", ms: 2400 },
  { stage: "conditions", conditions: "new", ms: 4400 },
  { stage: "disturbance", conditions: "new", ms: 2400 },
  { stage: "counter", conditions: "new", ms: 3400 },
  { stage: "restored", conditions: "new", ms: 3000 },
];

/** One full played story, from the first disturbance to the end. */
export const AUTOPLAY_MS = STEPS.slice(1).reduce((sum, step) => sum + step.ms, 0);

/** Share of the base population the disturbance pours in. */
export const BURST = 0.6;
/** Share of the disturbance atoms that become system atoms (the rest dissolve). */
export const KEPT = 0.6;

/**
 * toPeople / toCode: chance per frame that a system atom turns into the
 * other kind. While the two are equal the amounts stay level; their ratio is
 * the balance (people : code = toPeople : toCode), like the equilibrium
 * constant K. Only the conditions set it: disturbances leave it alone.
 */
export const FLIPS = {
  old: { toPeople: 0.0012, toCode: 0.0012 },
  new: { toPeople: 0.006, toCode: 0.0012 },
};

/** react: chance per frame that a disturbance atom reacts away, by stage. */
export const REACT = { equilibrium: 0, disturbance: 0, counter: 0.011, restored: 0.05, conditions: 0.05 };

export function ratesFor(stage, conditions = "old") {
  return { ...(FLIPS[conditions] ?? FLIPS.old), react: REACT[stage] ?? 0 };
}

/** Share of system atoms that are people once the rates have settled. */
export function balanceFor(conditions) {
  const { toPeople, toCode } = ratesFor("equilibrium", conditions);
  return toPeople / (toPeople + toCode);
}

/** The loop drawn on the ring around the lens. Changing the conditions is not on it. */
export const RING = ["disturbance", "counter", "restored"];

/**
 * How far round the ring the marker is, 0..1. Each stage of the loop owns a
 * third; the marker moves through it as the step plays (fraction 0..1).
 * Outside the loop (at rest, or while the conditions change) it waits at the top.
 */
export function ringProgress(stage, fraction) {
  const index = RING.indexOf(stage);
  if (index < 0) return 0;
  return (index + Math.min(1, Math.max(0, fraction))) / 3;
}

/**
 * An SVG arc from one angle to another (degrees, 0 = right, clockwise).
 * `reverse` draws it the other way, so text on the bottom half reads upright.
 */
export function arcPath(cx, cy, r, from, to, reverse = false) {
  const point = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return `${round(cx + r * Math.cos(rad))} ${round(cy + r * Math.sin(rad))}`;
  };
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return reverse
    ? `M ${point(to)} A ${r} ${r} 0 ${large} 0 ${point(from)}`
    : `M ${point(from)} A ${r} ${r} 0 ${large} 1 ${point(to)}`;
}

/**
 * A smooth, divergence-free swirl: the curl of a slowly moving stream
 * function, so atoms circulate like a liquid instead of piling up.
 * Returns a velocity of roughly unit size; `scale` is the swirl size in px.
 */
export function flowAt(x, y, t, scale) {
  const k1 = 1 / scale;
  const k2 = 0.7 / scale;
  const a = x * k1 + t * 0.3;
  const b = y * k1 * 0.8 - t * 0.23;
  const c = (x * 0.6 - y) * k2 + t * 0.17;
  const dPsiDx = k1 * Math.cos(a) * Math.cos(b) + 0.5 * 0.6 * k2 * Math.cos(c);
  const dPsiDy = -0.8 * k1 * Math.sin(a) * Math.sin(b) - 0.5 * k2 * Math.cos(c);
  return { x: dPsiDy * scale, y: -dPsiDx * scale };
}

/** Unit vector for a direction in degrees. */
export function unitFor(degrees) {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

/** Base atom count for a lens of this radius: enough to read, never crowded. */
export function atomCount(radius) {
  return Math.round(clamp((Math.PI * radius * radius) / 2600, 36, 80));
}

export function mix(a, b, t) {
  return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}
