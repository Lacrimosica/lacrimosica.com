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
    condition: "Ogni fonte ha un responsabile",
    name: "Neon",
    lens: "#0a0420",
    overlay: "scan",
    shape: "ring",
    kinds: {
      a: { label: "Conoscenza curata", base: "#00e5ff", light: "#c4fbff" },
      b: { label: "Conoscenza obsoleta", base: "#ff2bd6", light: "#ffc2f3" },
    },
    guest: { label: "IA", base: "#f5ff3b", light: "#fdffc4", shape: "diamond" },
  },
  security: {
    condition: "La strada sicura è la più semplice",
    name: "Terminal",
    lens: "#030d07",
    overlay: "scan",
    shape: "square",
    kinds: {
      a: { label: "Sicuro per impostazione", base: "#39ff88", light: "#c8ffdf" },
      b: { label: "Soluzioni alternative", base: "#1f8f7f", light: "#a5e8dd" },
    },
    guest: { label: "Minaccia", base: "#ff3b3b", light: "#ffc4c4", shape: "cross" },
  },
  bando: {
    condition: "I progetti partono dal bisogno",
    name: "Brass",
    lens: "#1c140c",
    overlay: "grain",
    shape: "gear",
    kinds: {
      a: { label: "Guidato dal bisogno", base: "#d9a441", light: "#ffe7a8" },
      b: { label: "Guidato dai soldi", base: "#a85a34", light: "#f2b896" },
    },
    guest: { label: "Bando", base: "#efe2c2", light: "#ffffff", shape: "card" },
  },
  conflict: {
    condition: "Un modo condiviso per risolvere i conflitti",
    name: "Kintsugi",
    lens: "#14161c",
    overlay: "cracks",
    shape: "shard",
    kinds: {
      a: { label: "Confronto", base: "#e6b450", light: "#fff0c2" },
      b: { label: "Schieramenti", base: "#b8694c", light: "#e9b6a2" },
    },
    guest: { label: "Conflitto", base: "#f2f4f8", light: "#ffffff", shape: "bolt" },
  },
  tools: {
    condition: "Un luogo per ogni tipo di informazione",
    name: "Blueprint",
    lens: "#0b2545",
    overlay: "grid",
    shape: "outline",
    kinds: {
      a: { label: "Strumenti condivisi", base: "#d4ef6a", light: "#f3ffc4" },
      b: { label: "Vecchie abitudini", base: "#e8f1ff", light: "#ffffff" },
    },
    guest: { label: "Nuovi strumenti", base: "#ff9f43", light: "#ffd9b0", shape: "triangle" },
  },
};

/** A plain look for a disturbance that has no theme of its own yet. */
export const FALLBACK = {
  condition: "Cambiano le condizioni",
  name: "Semplice",
  lens: "#101a3d",
  overlay: "none",
  shape: "outline",
  kinds: {
    a: { label: "Nuovo equilibrio", base: "#d4ef6a", light: "#f3ffc4" },
    b: { label: "Vecchio equilibrio", base: "#9aa6cf", light: "#e2e6ff" },
  },
  guest: { label: "Disturbo", base: "#b99cff", light: "#e8dcff", shape: "diamond" },
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
  // Guest labels are quoted («…») so the sentences need no article for them.
  switch (stage) {
    case "disturbance":
      return fresh
        ? `Di nuovo «${guest}», ora sotto le nuove condizioni.`
        : `Entra «${guest}». Il sistema esce dall'equilibrio e la linea «${guest}» sul grafico sale.`;
    case "counter":
      return fresh
        ? `La reazione torna. «${guest}» si dissolve, ma ora il sistema punta al nuovo equilibrio.`
        : `Il sistema reagisce. «${guest}» si dissolve un pezzo alla volta e la sua linea scende.`;
    case "restored":
      return fresh
        ? `Di nuovo equilibrio, ma quello nuovo. Il disturbo non ha spostato il sistema: lo hanno fatto le condizioni.`
        : `Di nuovo lo stesso equilibrio: le linee si incontrano dove erano. Nelle stesse condizioni, ogni disturbo finisce qui.`;
    case "conditions":
      return `Cambiano le condizioni. Non si aggiunge nulla. Ora gli atomi si trasformano in «${a}» più in fretta di quanto tornino a «${b}», quindi l'equilibrio stesso si sposta. Qualcuno l'ha scelto. Il disturbo non l'ha causato.`;
    default:
      return `Equilibrio dinamico. «${capitalize(a)}» e «${b}» continuano a trasformarsi l'una nell'altra alla stessa velocità, quindi le quantità restano stabili. Le condizioni fissano quell'equilibrio.`;
  }
}

/** Lower case, except for acronyms like "AI". */
function lower(text) {
  return text === text.toUpperCase() ? text : text.toLowerCase();
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
