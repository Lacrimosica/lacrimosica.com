import { test } from "node:test";
import assert from "node:assert/strict";
import { createFluidSim } from "../js/fluid-sim.js";
import { createPhaseGeometry } from "../js/phase-geometry.js";

const DT = 1 / 60;
const AT_REST = { shift: 0, flux: 0, buffer: 22 };
const never = () => 0.999; // no random bubbles in any frame

/** A small seeded PRNG (mulberry32), so random runs repeat exactly. */
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setup(random = never) {
  const geometry = createPhaseGeometry();
  geometry.resize(1000, 600, true);
  return { geometry, sim: createFluidSim({ geometry, random }) };
}

function run(sim, seconds, input) {
  let frame;
  for (let t = 0; t < seconds; t += DT) frame = sim.step(DT, input);
  return frame;
}

/** Live blobs in a frame, by source. */
function countBlobs(frame) {
  const counts = { code: 0, people: 0 };
  for (let i = 3; i < frame.blobs.length; i += 4) {
    if (frame.blobs[i] < 0) counts.code++;
    else if (frame.blobs[i] > 0) counts.people++;
  }
  return counts;
}

test("each step advances the geometry's time", () => {
  const { geometry, sim } = setup();
  run(sim, 1, { pointer: null, targets: AT_REST });
  assert.ok(Math.abs(geometry.motion.time - 1) < DT);
});

test("the boundary and buffer settle on the cycle's targets", () => {
  const { geometry, sim } = setup();
  const frame = run(sim, 4, { pointer: null, targets: { shift: 0.1, flux: 1, buffer: 66 } });
  assert.ok(Math.abs(geometry.motion.shift - 0.1) < 0.002, `shift ${geometry.motion.shift}`);
  assert.ok(Math.abs(frame.buffer - 66) < 0.5, `buffer ${frame.buffer}`);
  assert.ok(Math.abs(frame.flux - 1) < 0.01, `flux ${frame.flux}`);
});

test("a present pointer gets full strength; an absent one half", () => {
  const { sim } = setup();
  assert.ok(Math.abs(run(sim, 3, { pointer: { x: 300, y: 300 }, targets: AT_REST }).pointer.strength - 1) < 0.01);
  assert.ok(Math.abs(run(sim, 3, { pointer: null, targets: AT_REST }).pointer.strength - 0.5) < 0.01);
});

test("the boundary is pushed away from a pointer near it", () => {
  const { geometry, sim } = setup();
  // On the code side, just left of the boundary: the dent bulges toward people.
  run(sim, 1, { pointer: { x: 470, y: 300 }, targets: AT_REST });
  assert.ok(geometry.motion.dent > 0.01, `dent ${geometry.motion.dent}`);
  run(sim, 1, { pointer: { x: 560, y: 300 }, targets: AT_REST });
  assert.ok(geometry.motion.dent < -0.01, `dent ${geometry.motion.dent}`);
});

test("crossing the boundary drags a tongue of the old phase", () => {
  const { sim } = setup();
  let frame = run(sim, 1, { pointer: { x: 150, y: 300 }, targets: AT_REST });
  assert.deepEqual(countBlobs(frame), { code: 0, people: 0 });
  frame = run(sim, 0.5, { pointer: { x: 850, y: 300 }, targets: AT_REST });
  const counts = countBlobs(frame);
  assert.ok(counts.code >= 2, `code blobs ${counts.code}`);
  assert.equal(counts.people, 0);
});

test("an absent pointer drags nothing", () => {
  const { sim } = setup();
  const frame = run(sim, 6, { pointer: null, targets: AT_REST });
  assert.deepEqual(countBlobs(frame), { code: 0, people: 0 });
});

test("agitation during a counter-shift runs the exchange mostly one way", () => {
  const { sim } = setup(seeded(7));
  sim.agitate();
  // Counter-shift after adding code: net flux toward people.
  const counts = countBlobs(run(sim, 2.5, { pointer: null, targets: { shift: 0.035, flux: 1, buffer: 66 } }));
  assert.ok(counts.code > counts.people * 2, JSON.stringify(counts));

  const calm = setup(seeded(7));
  const calmCounts = countBlobs(run(calm.sim, 2.5, { pointer: null, targets: AT_REST }));
  assert.ok(calmCounts.code + calmCounts.people < counts.code, JSON.stringify(calmCounts));
});

test("blobs dissolve over time", () => {
  const { sim } = setup();
  run(sim, 1, { pointer: { x: 150, y: 300 }, targets: AT_REST });
  run(sim, 0.5, { pointer: { x: 850, y: 300 }, targets: AT_REST });
  const frame = run(sim, 8, { pointer: { x: 850, y: 300 }, targets: AT_REST });
  assert.deepEqual(countBlobs(frame), { code: 0, people: 0 });
});

test("reset drops every blob", () => {
  const { sim } = setup();
  run(sim, 1, { pointer: { x: 150, y: 300 }, targets: AT_REST });
  run(sim, 0.5, { pointer: { x: 850, y: 300 }, targets: AT_REST });
  sim.reset();
  assert.deepEqual(countBlobs(sim.frame()), { code: 0, people: 0 });
});
