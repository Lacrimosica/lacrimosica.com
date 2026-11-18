/* ---------- Hero palette ----------
 * The colours live only in styles.css as custom properties. The shader and
 * the particle layer read them from there once, when the hero starts. */

export const SHADER_COLORS = {
  TECH_DARK: "--phase-tech-dark",
  TECH_LIGHT: "--phase-tech-light",
  BUFFER_DARK: "--phase-buffer-dark",
  BUFFER_LIGHT: "--phase-buffer-light",
  PEOPLE_DARK: "--phase-people-dark",
  PEOPLE_LIGHT: "--phase-people-light",
  GLOW_TECH: "--phase-glow-tech",
  GLOW_BUFFER: "--phase-glow-buffer",
  GLOW_PEOPLE: "--phase-glow-people",
};

/** From code (first) to people (last), through the buffer. */
export const PARTICLE_COLORS = [1, 2, 3, 4, 5].map((n) => `--phase-particle-${n}`);

/** Parses "#rgb" or "#rrggbb" into [r, g, b] in 0..255. */
export function parseHex(value) {
  let hex = value.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error(`Not a hex colour: "${value}"`);
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function glslVec3([r, g, b]) {
  return `vec3(${(r / 255).toFixed(3)}, ${(g / 255).toFixed(3)}, ${(b / 255).toFixed(3)})`;
}

/**
 * @param {(name: string) => string} readProperty usually
 *   `(name) => getComputedStyle(document.documentElement).getPropertyValue(name)`
 */
export function readPalette(readProperty) {
  const read = (name) => parseHex(readProperty(name));
  return {
    /** GLSL constant declarations, one per shader colour. */
    shaderConstants: Object.entries(SHADER_COLORS)
      .map(([constant, property]) => `const vec3 ${constant} = ${glslVec3(read(property))};`)
      .join("\n"),
    /** "r, g, b" strings for rgba(), from code to people. */
    particles: PARTICLE_COLORS.map((property) => read(property).join(", ")),
  };
}
