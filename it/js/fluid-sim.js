/* ---------- Fluid simulation ----------
 * Everything that moves in the fluid hero except the decorative particles:
 * the smoothed pointer, the phase boundary's response to the Le Châtelier
 * cycle and to the pointer, and the exchange of blobs between the phases.
 * It advances the phase geometry's time and motion, and returns a frame for
 * the renderers to draw. It never touches the DOM.
 *
 * Exchange: blobs are small volumes of one phase inside the other. They come
 * from two sources: the pointer drags a tongue of fluid across the phase
 * boundary, and bubbles leave the boundary on their own. At equilibrium the
 * exchange is slow and equal in both directions (a dynamic equilibrium).
 * After a disturbance it speeds up and runs mostly one way, then calms down.
 * Each blob dissolves: its core keeps the colour of its phase, its edge turns
 * to the buffer colour, and then it fades. Source: -1 = code, +1 = people. */

export const MAX_BLOBS = 32;
const POINTER_REACH = 170;
const IDLE_BUFFER = 22;

function spring(value, velocity, target, dt, stiffness, damping) {
  velocity += (target - value) * stiffness * dt;
  velocity *= Math.exp(-damping * dt);
  return [value + velocity * dt, velocity];
}

/**
 * @param {object} options
 * @param {ReturnType<import("./phase-geometry.js").createPhaseGeometry>} options.geometry
 * @param {() => number} [options.random] returns 0..1, like Math.random
 */
export function createFluidSim({ geometry, random = Math.random }) {
  const pointer = { x: 0, y: 0, vx: 0, vy: 0, strength: 0 };
  const response = { shiftVelocity: 0, dentVelocity: 0, flux: 0, agitation: 0, bias: 0, buffer: IDLE_BUFFER };
  const blobs = [];
  const blobData = new Float32Array(MAX_BLOBS * 4);
  const dragged = { lastSide: 0, source: 0, until: 0, radius: 0, x: 0, y: 0, crossedAt: -Infinity };

  function frame() {
    return { pointer, buffer: response.buffer, flux: response.flux, blobs: blobData };
  }

  function addBlob(x, y, radius, source, vx, vy, lifetime) {
    if (blobs.length >= MAX_BLOBS) {
      let weakest = 0;
      for (let i = 1; i < blobs.length; i++) {
        if (blobs[i].life < blobs[weakest].life) weakest = i;
      }
      blobs.splice(weakest, 1);
    }
    blobs.push({ x, y, radius, source, vx, vy, life: 1, lifetime });
  }

  /** A bubble leaves the boundary and travels into the other phase. */
  function emitBubble(source) {
    const start = geometry.pointOnBoundary(0.06 + random() * 0.88, source * 4);
    const speed = -source * (22 + random() * 30);
    const drift = (random() - 0.5) * 24;
    const radius = 6 + random() * 10;
    const lifetime = 3 + random() * 2.5;
    const { along, across } = geometry.axes();
    addBlob(
      start.x, start.y, radius, source,
      across.x * speed + along.x * drift,
      across.y * speed + along.y * drift,
      lifetime
    );
  }

  function movePointer(dt, real) {
    const { width, height, vertical } = geometry;
    const t = geometry.motion.time;
    // With no pointer present, a slow wanderer keeps the field alive.
    const target = real
      ? real
      : vertical
        ? { x: width * (0.5 + 0.2 * Math.sin(t * 0.23)), y: height * (0.5 + 0.32 * Math.sin(t * 0.17 + 1)) }
        : { x: width * (0.5 + 0.34 * Math.sin(t * 0.21)), y: height * (0.5 + 0.12 * Math.sin(t * 0.27 + 1)) };
    const follow = 1 - Math.exp(-dt * (real ? 14 : 3));
    const nx = pointer.x + (target.x - pointer.x) * follow;
    const ny = pointer.y + (target.y - pointer.y) * follow;
    pointer.vx += ((nx - pointer.x) / dt - pointer.vx) * 0.3;
    pointer.vy += ((ny - pointer.y) / dt - pointer.vy) * 0.3;
    pointer.x = nx;
    pointer.y = ny;
    pointer.strength += ((real ? 1 : 0.5) - pointer.strength) * (1 - Math.exp(-dt * 3));
  }

  function moveBoundary(dt, targets) {
    const { motion } = geometry;
    // Follow the Le Châtelier cycle toward its targets for the current stage.
    let shift;
    [shift, response.shiftVelocity] = spring(motion.shift, response.shiftVelocity, targets.shift, dt, 34, 7);
    response.flux += (targets.flux - response.flux) * (1 - Math.exp(-dt * 3));
    response.buffer += (targets.buffer - response.buffer) * (1 - Math.exp(-dt * 2.5));

    // The membrane: pushed away from the pointer, snapping through when crossed.
    const local = geometry.toLocal(pointer.x, pointer.y);
    const gap = local.across - geometry.boundary(local.along, { withDent: false });
    const dentTarget = -Math.sign(gap) * 0.075 * Math.exp(-Math.abs(gap) / 0.12) * pointer.strength;
    const dentAlong = motion.dentAlong + (local.along - motion.dentAlong) * (1 - Math.exp(-dt * 10));
    let dent;
    [dent, response.dentVelocity] = spring(motion.dent, response.dentVelocity, dentTarget, dt, 90, 6);
    geometry.move({ shift, dent, dentAlong });
  }

  function exchange(dt, targets, pointerPresent) {
    const t = geometry.motion.time;
    // A disturbance agitates the system; the agitation and the one-way bias
    // decay slowly, so the exchange calms down over several seconds.
    response.agitation *= Math.exp(-dt / 6);
    response.bias += (targets.flux - response.bias) * (1 - Math.exp(-dt * 0.6));
    const codeToPeople = 0.35 + response.agitation * (1.2 + 5 * Math.max(0, response.bias));
    const peopleToCode = 0.35 + response.agitation * (1.2 + 5 * Math.max(0, -response.bias));
    if (random() < codeToPeople * dt) emitBubble(-1);
    if (random() < peopleToCode * dt) emitBubble(1);

    // Dragged fluid: when the pointer crosses the boundary, it pulls a
    // tongue of the old phase into the new one.
    if (!pointerPresent) {
      dragged.lastSide = 0;
      return;
    }
    const sideNow = geometry.distance(pointer.x, pointer.y) < 0 ? -1 : 1;
    if (dragged.lastSide && sideNow !== dragged.lastSide && t - dragged.crossedAt > 0.35) {
      dragged.crossedAt = t;
      dragged.source = dragged.lastSide;
      dragged.until = t + 0.8;
      dragged.radius = 24;
      dragged.x = pointer.x;
      dragged.y = pointer.y;
      addBlob(pointer.x, pointer.y, 26, dragged.source, pointer.vx * 0.15, pointer.vy * 0.15, 2.6);
    }
    dragged.lastSide = sideNow;
    if (
      t < dragged.until &&
      dragged.radius > 7 &&
      Math.hypot(pointer.x - dragged.x, pointer.y - dragged.y) > 14
    ) {
      dragged.radius *= 0.86;
      dragged.x = pointer.x;
      dragged.y = pointer.y;
      addBlob(
        pointer.x, pointer.y, dragged.radius, dragged.source,
        pointer.vx * 0.15, pointer.vy * 0.15, 2.2 + random()
      );
    }
  }

  function moveBlobs(dt) {
    const drag = Math.exp(-dt * 0.9);
    const { along } = geometry.axes();
    for (let i = blobs.length - 1; i >= 0; i--) {
      const b = blobs[i];
      const d = geometry.distance(b.x, b.y);
      const current = 46 * Math.exp(-Math.abs(d) / 80);
      b.vx *= drag;
      b.vy *= drag;
      b.x += along.x * current * dt;
      b.y += along.y * current * dt;

      const dx = b.x - pointer.x;
      const dy = b.y - pointer.y;
      const r = Math.hypot(dx, dy);
      if (r < POINTER_REACH && r > 0.5) {
        const f = (1 - r / POINTER_REACH) ** 2 * pointer.strength;
        b.vx += ((-dy / r) * 380 + (dx / r) * 200) * f * dt;
        b.vy += ((dx / r) * 380 + (dy / r) * 200) * f * dt;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // A blob back in its own phase merges quickly; in the other phase it
      // dissolves slowly.
      const inOtherPhase = d * b.source < 0;
      b.life -= (dt / b.lifetime) * (inOtherPhase ? 1 : 3);
      if (b.life <= 0) blobs.splice(i, 1);
    }

    blobData.fill(0);
    blobs.forEach((b, i) => {
      blobData[i * 4] = b.x;
      blobData[i * 4 + 1] = b.y;
      blobData[i * 4 + 2] = b.radius * (1 + 0.4 * (1 - b.life));
      blobData[i * 4 + 3] = b.source * b.life;
    });
  }

  return {
    /** A new disturbance: the exchange speeds up, then calms down. */
    agitate() {
      response.agitation = 1;
    },
    /** Drops all blobs, e.g. after a resize. */
    reset() {
      blobs.length = 0;
      blobData.fill(0);
      dragged.lastSide = 0;
    },
    /** The current frame, without advancing. */
    frame,
    /**
     * Advances by dt seconds (> 0).
     * @param {{x: number, y: number} | null} input.pointer px inside the hero, or null when absent or idle
     * @param {{shift: number, flux: number, buffer: number}} input.targets from the cycle's targetsFor
     */
    step(dt, { pointer: real, targets }) {
      geometry.move({ time: geometry.motion.time + dt });
      movePointer(dt, real);
      moveBoundary(dt, targets);
      exchange(dt, targets, Boolean(real));
      moveBlobs(dt);
      return frame();
    },
  };
}
