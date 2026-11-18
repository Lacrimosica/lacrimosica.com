/* ---------- Particle layer ----------
 * The 2D-canvas adapter for the fluid hero. The particles are decoration:
 * they move with their own simple physics, read the phase geometry and the
 * frame, and never feed back into the simulation. */

/** Draws streaks that drift with the current and change colour across the phase boundary. */
export function createParticleLayer(canvas, { geometry, palette }) {
  const ctx = canvas.getContext("2d");
  let particles = [];
  let scale = 1;
  const POINTER_RADIUS = 170;
  // Particle colours follow the indicator: pale blue in code, lilac in the
  // buffer, pale rose in people.
  const COLORS = palette.particles;
  const ALPHAS = [0.22, 0.42, 0.72];
  const LEVELS = COLORS.length;

  function phaseOf(p) {
    return geometry.distance(p.x, p.y) < 0 ? 0 : 1;
  }

  function seed() {
    const { width, height } = geometry;
    // A phone has fewer pixels and less GPU headroom than a desktop. Keep
    // enough particles for the effect to read, but avoid turning every
    // animation frame into a large 2D-canvas redraw on mobile Safari.
    const compact = width < 700;
    const count = compact
      ? Math.max(140, Math.min(320, Math.round((width * height) / 1800)))
      : Math.max(320, Math.min(1500, Math.round((width * height) / 1100)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      k: Math.random() * 2 - 1,
      c: 0,
      near: false,
    }));
    particles.forEach((p) => {
      p.c = phaseOf(p);
    });
  }

  return {
    resize(width, height) {
      scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      seed();
    },
    step(dt, { pointer, flux }) {
      const { width, height } = geometry;
      const { along, across } = geometry.axes();
      const t = geometry.motion.time;
      const ease = 1 - Math.exp(-dt * 1.4);
      const blend = 1 - Math.exp(-dt * 0.9);
      const buckets = Array.from({ length: LEVELS * 3 }, () => []);

      for (const p of particles) {
        const angle =
          (Math.sin(p.x * 0.0021 + t * 0.13) +
            Math.cos(p.y * 0.0027 - t * 0.11) +
            Math.sin((p.x + p.y) * 0.0013 + t * 0.07)) *
          Math.PI * 0.66;

        // A current runs along the boundary. Near it, particles also cross
        // in both directions (exchange), and during a counter-shift a net
        // flux carries them away from the side that was added.
        const d = geometry.distance(p.x, p.y);
        const current = 46 * Math.exp(-Math.abs(d) / 80);
        const crossing =
          18 * p.k * Math.exp(-Math.abs(d) / 60) +
          85 * flux * Math.exp(-Math.abs(d) / 240);
        const targetX = Math.cos(angle) * 16 + along.x * current + across.x * crossing;
        const targetY = Math.sin(angle) * 16 + along.y * current + across.y * crossing;

        p.vx += (targetX - p.vx) * ease;
        p.vy += (targetY - p.vy) * ease;

        // The pointer field: a swirl, a gentle push, and a stir from its motion.
        // The simulation deliberately has an idle wandering pointer when no
        // real pointer is present. The particle layer receives null in that
        // state, so the pointer field must be optional too.
        const dx = p.x - (pointer?.x ?? 0);
        const dy = p.y - (pointer?.y ?? 0);
        const r = Math.hypot(dx, dy);
        const pointerStrength = pointer?.strength ?? 0;
        p.near = r < POINTER_RADIUS * 0.6 && pointerStrength > 0.6;
        if (r < POINTER_RADIUS && r > 0.5) {
          const f = (1 - r / POINTER_RADIUS) ** 2 * pointerStrength;
          p.vx += ((-dy / r) * 950 + (dx / r) * 520 + (pointer?.vx ?? 0) * 5) * f * dt;
          p.vy += ((dx / r) * 950 + (dy / r) * 520 + (pointer?.vy ?? 0) * 5) * f * dt;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        let wrapped = true;
        if (p.x < -10) p.x += width + 20;
        else if (p.x > width + 10) p.x -= width + 20;
        else if (p.y < -10) p.y += height + 20;
        else if (p.y > height + 10) p.y -= height + 20;
        else wrapped = false;

        // The colour changes slowly, so a particle carries its old phase
        // across the boundary and turns violet on the way.
        if (wrapped) p.c = phaseOf(p);
        else p.c += ((d < 0 ? 0 : 1) - p.c) * blend;

        const speed = Math.hypot(p.vx, p.vy);
        const level = speed > 140 ? 2 : speed > 55 ? 1 : 0;
        const tone = Math.min(LEVELS - 1, Math.floor(p.c * LEVELS));
        buckets[tone * 3 + level].push(p, speed);
      }

      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineWidth = 1.15;

      buckets.forEach((bucket, index) => {
        if (!bucket.length) return;
        ctx.strokeStyle = `rgba(${COLORS[Math.floor(index / 3)]}, ${ALPHAS[index % 3]})`;
        ctx.beginPath();
        for (let i = 0; i < bucket.length; i += 2) {
          const p = bucket[i];
          const speed = bucket[i + 1] || 1;
          if (p.near) {
            // Close to the pointer, streaks become uncertain dots.
            const jx = p.x + (Math.random() - 0.5) * 3;
            const jy = p.y + (Math.random() - 0.5) * 3;
            ctx.moveTo(jx - (p.vx / speed) * 0.8, jy - (p.vy / speed) * 0.8);
            ctx.lineTo(jx, jy);
            continue;
          }
          const length = Math.min(14, Math.max(1.6, speed * 0.055));
          ctx.moveTo(p.x - (p.vx / speed) * length, p.y - (p.vy / speed) * length);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });
    },
    clear() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}

