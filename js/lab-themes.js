/* ---------- Le Châtelier lab: one look per disturbance ----------
 * Each disturbance gets its own world under the lens: the lens colour, an
 * overlay, the two kinds of atom that make up the system, and the atom the
 * disturbance pours in. The two kinds name the balance at stake: kind a is
 * the one the new conditions favour, kind b the one the old conditions keep.
 *
 * condition: the new condition the last stage brings in, in a few words.
 * shape: how system atoms are drawn; guest.shape: how disturbance atoms are.
 * overlay: "scan" (scanlines), "grid" (blueprint grid), "grain" (old paper),
 * "cracks" (gold seams, like mended pottery), or "none". */

export const THEMES = {
  ai: {
    condition: "Every source has an owner",
    name: "Neon",
    lens: "#0a0420",
    overlay: "scan",
    shape: "ring",
    kinds: {
      a: { label: "Owned knowledge", base: "#00e5ff", light: "#c4fbff" },
      b: { label: "Stale knowledge", base: "#ff2bd6", light: "#ffc2f3" },
    },
    guest: { label: "AI", base: "#f5ff3b", light: "#fdffc4", shape: "diamond" },
  },
  security: {
    condition: "The safe path is the easy one",
    name: "Terminal",
    lens: "#030d07",
    overlay: "scan",
    shape: "square",
    kinds: {
      a: { label: "Safe by default", base: "#39ff88", light: "#c8ffdf" },
      b: { label: "Workarounds", base: "#1f8f7f", light: "#a5e8dd" },
    },
    guest: { label: "Threat", base: "#ff3b3b", light: "#ffc4c4", shape: "cross" },
  },
  bando: {
    condition: "Projects start from the need",
    name: "Brass",
    lens: "#1c140c",
    overlay: "grain",
    shape: "gear",
    kinds: {
      a: { label: "Led by the need", base: "#d9a441", light: "#ffe7a8" },
      b: { label: "Led by the money", base: "#a85a34", light: "#f2b896" },
    },
    guest: { label: "Funding call", base: "#efe2c2", light: "#ffffff", shape: "card" },
  },
  conflict: {
    condition: "A shared way to resolve conflict",
    name: "Kintsugi",
    lens: "#14161c",
    overlay: "cracks",
    shape: "shard",
    kinds: {
      a: { label: "Talked through", base: "#e6b450", light: "#fff0c2" },
      b: { label: "Taken sides", base: "#b8694c", light: "#e9b6a2" },
    },
    guest: { label: "Clash", base: "#f2f4f8", light: "#ffffff", shape: "bolt" },
  },
  tools: {
    condition: "One place for each kind of information",
    name: "Blueprint",
    lens: "#0b2545",
    overlay: "grid",
    shape: "outline",
    kinds: {
      a: { label: "Shared tools", base: "#d4ef6a", light: "#f3ffc4" },
      b: { label: "Old habits", base: "#e8f1ff", light: "#ffffff" },
    },
    guest: { label: "New tools", base: "#ff9f43", light: "#ffd9b0", shape: "triangle" },
  },
};

/** A plain look for a disturbance that has no theme of its own yet. */
export const FALLBACK = {
  condition: "The conditions change",
  name: "Plain",
  lens: "#101a3d",
  overlay: "none",
  shape: "outline",
  kinds: {
    a: { label: "New balance", base: "#d4ef6a", light: "#f3ffc4" },
    b: { label: "Old balance", base: "#9aa6cf", light: "#e2e6ff" },
  },
  guest: { label: "Disturbance", base: "#b99cff", light: "#e8dcff", shape: "diamond" },
};

export function themeFor(id) {
  return THEMES[id] ?? FALLBACK;
}

export const SHAPES = ["ring", "square", "gear", "shard", "outline"];
export const GUEST_SHAPES = ["diamond", "cross", "card", "bolt", "triangle"];
export const OVERLAYS = ["scan", "grid", "grain", "cracks", "none"];

/**
 * What the atoms are doing at each step, in that world's words. This is the
 * chemistry; what it means in practice comes from the example's panel.
 * Disturbances never move the balance; only the conditions do.
 */
export function scienceFor(stage, conditions, theme) {
  const a = lower(theme.kinds.a.label);
  const b = lower(theme.kinds.b.label);
  const guest = lower(theme.guest.label);
  const fresh = conditions === "new";
  switch (stage) {
    case "disturbance":
      return fresh
        ? `The same ${guest} again, now under the new conditions.`
        : `${capitalize(guest)} pours in. The system is out of balance, and the ${guest} line on the chart jumps.`;
    case "counter":
      return fresh
        ? `Push-back again. The ${guest} atoms react away, but now the system heads for the new balance.`
        : `Push-back. The ${guest} atoms react away, one by one, and the ${guest} line falls.`;
    case "restored":
      return fresh
        ? `Back to balance, but the new one. The disturbance didn't move the system. The conditions did.`
        : `Back to the same balance: the lines meet where they were. Under the same conditions, any disturbance ends here.`;
    case "conditions":
      return `The conditions change. Nothing is added. Atoms now turn into ${a} faster than back into ${b}, so the balance itself moves. Someone chose this. The disturbance didn't cause it.`;
    default:
      return `Dynamic equilibrium. ${capitalize(a)} and ${b} keep turning into each other at the same rate, so the amounts stay level. The conditions set that balance.`;
  }
}

/** Lower case, except for acronyms like "AI". */
function lower(text) {
  return text === text.toUpperCase() ? text : text.toLowerCase();
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
