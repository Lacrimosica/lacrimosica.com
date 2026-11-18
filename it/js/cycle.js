/* ---------- The Le Châtelier cycle ----------
 * Each new focus is a disturbance. The system first moves toward the added
 * side, then pushes back, then settles in a new equilibrium that keeps a
 * small part of the change.
 *
 * Stages: equilibrium → disturbance → counter → settled. A new disturbance
 * restarts the cycle from any stage, including the middle of another
 * disturbance. */

export const LABELS = { technology: "codice", community: "persone" };
export const STAGE_TIMES = { counter: 750, settled: 2700 };

export function otherSide(side) {
  return side === "technology" ? "community" : "technology";
}

/** +1 for technology, -1 for community, 0 before the first disturbance. */
function signOf(side) {
  return side === "technology" ? 1 : side === "community" ? -1 : 0;
}

/**
 * @param {object} [options]
 * @param {(fn: () => void, ms: number) => unknown} [options.schedule]
 * @param {(handle: unknown) => void} [options.cancel]
 */
export function createCycle({ schedule = setTimeout, cancel = clearTimeout, times = STAGE_TIMES } = {}) {
  let state = { side: null, stage: "equilibrium" };
  let timers = [];
  const listeners = new Set();

  function enter(stage) {
    state = { side: state.side, stage };
    listeners.forEach((listener) => listener(state));
  }

  return {
    get state() {
      return state;
    },
    /** Adds a side to the system. Returns false if that side is already active. */
    disturb(side) {
      if (side === state.side) return false;
      timers.forEach(cancel);
      state = { side, stage: state.stage };
      enter("disturbance");
      timers = [
        schedule(() => enter("counter"), times.counter),
        schedule(() => enter("settled"), times.settled),
      ];
      return true;
    },
    /** Calls the listener on every stage entry, including each new disturbance. */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function statusFor({ side, stage }) {
  if (stage === "disturbance") return `Disturbo: + ${LABELS[side]}`;
  if (stage === "counter") return `Reazione → ${LABELS[otherSide(side)]}`;
  if (stage === "settled") return "Nuovo equilibrio";
  return "All'equilibrio";
}

/** Text for the live region, or null when the stage needs no announcement. */
export function announcementFor({ side, stage }) {
  return stage === "settled" ? `Nuovo equilibrio, con un po' più di ${LABELS[side]}.` : null;
}

/**
 * The physical response the fluid moves toward in each stage: jump toward the
 * added side, push back with a net flux, then settle at a small offset.
 * shift: fraction of the hero; flux: -1..1, positive pushes toward people;
 * buffer: width of the violet band in px.
 */
export function targetsFor({ side, stage }) {
  const sign = signOf(side);
  const offset = stage === "disturbance" ? 0.1 : stage === "equilibrium" ? 0 : 0.035;
  return {
    shift: sign * offset,
    flux: stage === "counter" ? sign : 0,
    buffer: 22 + (stage === "counter" ? 44 : stage === "disturbance" ? 16 : 0),
  };
}
