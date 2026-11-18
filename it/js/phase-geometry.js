/* ---------- Phase geometry ----------
 * Where the two liquid phases meet. On wide screens the phase boundary runs
 * top to bottom (code on the left); on narrow screens it runs left to right
 * (code on top). "Along" is the position along the boundary and "across" the
 * position through it, both 0..1.
 *
 * The boundary is a sum of travelling waves, plus a dent where the pointer
 * pushes it. The same formula is emitted as GLSL for the shader, so the
 * particles, blobs and cursor always agree with the pixels. */

const WAVES = [
  // amplitude, frequency along, speed, phase
  [0.034, 5.2, 0.55, 0],
  [0.018, 11.3, -0.83, 1.3],
  [0.008, 23.0, 1.6, 0.4],
];
const DENT_WIDTH = 0.11;

export function createPhaseGeometry() {
  let width = 1;
  let height = 1;
  let vertical = true;
  const motion = { time: 0, shift: 0, dent: 0, dentAlong: 0.5 };

  function boundary(along, { withDent = true } = {}) {
    let b = 0.5 + motion.shift;
    for (const [amplitude, frequency, speed, phase] of WAVES) {
      b += amplitude * Math.sin(along * frequency + motion.time * speed + phase);
    }
    if (withDent) {
      const g = (along - motion.dentAlong) / DENT_WIDTH;
      b += motion.dent * Math.exp(-g * g);
    }
    return b;
  }

  function toLocal(x, y) {
    return vertical
      ? { along: y / height, across: x / width }
      : { along: x / width, across: y / height };
  }

  function toPixel(along, across) {
    return vertical
      ? { x: across * width, y: along * height }
      : { x: along * width, y: across * height };
  }

  const acrossSize = () => (vertical ? width : height);

  return {
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get vertical() {
      return vertical;
    },
    get motion() {
      return motion;
    },
    resize(w, h, isVertical) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      vertical = isVertical;
    },
    /** Sets any of time, shift, dent, dentAlong. */
    move(changes) {
      Object.assign(motion, changes);
    },
    boundary,
    toLocal,
    /** The inverse of toLocal: along/across (0..1) to px. */
    toPixel,
    /** Signed distance in px from the boundary; negative = technology phase. */
    distance(x, y) {
      const { along, across } = toLocal(x, y);
      return (across - boundary(along)) * acrossSize();
    },
    phaseAt(x, y) {
      return this.distance(x, y) < 0 ? "technology" : "community";
    },
    /** A point on the boundary, moved offsetPx through it (positive = toward people). */
    pointOnBoundary(along, offsetPx = 0) {
      return toPixel(along, boundary(along) + offsetPx / acrossSize());
    },
    /** The along/across axes as unit vectors in pixel space. */
    axes() {
      return vertical
        ? { along: { x: 0, y: 1 }, across: { x: 1, y: 0 } }
        : { along: { x: 1, y: 0 }, across: { x: 0, y: 1 } };
    },
  };
}

/** Formats a number as a GLSL float literal. */
export function glslFloat(n) {
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

/**
 * GLSL for `float boundary(float along, float t)`, identical to the JS one.
 * Expects uniforms uShift, uDent and uDentAlong.
 */
export function boundaryGLSL() {
  const terms = WAVES.map(
    ([a, f, s, p]) =>
      `\n    + ${glslFloat(a)} * sin(along * ${glslFloat(f)} + t * ${glslFloat(s)} + ${glslFloat(p)})`
  ).join("");
  return `float boundary(float along, float t) {
  float b = 0.5 + uShift${terms};
  float g = (along - uDentAlong) / ${glslFloat(DENT_WIDTH)};
  return b + uDent * exp(-g * g);
}`;
}
