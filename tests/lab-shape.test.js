import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTOPLAY_MS,
  RING,
  STEPS,
  arcPath,
  atomCount,
  balanceFor,
  flowAt,
  mix,
  ratesFor,
  ringProgress,
  unitFor,
} from "../js/lab-shape.js";

test("disturbances and push-back never move the balance; only new conditions do", () => {
  assert.equal(balanceFor("old"), 0.5);
  assert.ok(balanceFor("new") > 0.6, "the new conditions favour one side");
  for (const stage of ["equilibrium", "disturbance", "counter", "restored"]) {
    const { toPeople, toCode } = ratesFor(stage, "old");
    assert.equal(toPeople, toCode, `${stage} under old conditions keeps the balance`);
  }
});

test("disturbance atoms only react away once the push-back starts", () => {
  assert.equal(ratesFor("equilibrium").react, 0);
  assert.equal(ratesFor("disturbance").react, 0, "the burst arrives before the push-back");
  assert.ok(ratesFor("counter").react > 0);
  assert.ok(ratesFor("restored").react > ratesFor("counter").react, "leftovers clear out");
  assert.deepEqual(ratesFor("nope"), { ...ratesFor("equilibrium"), react: 0 });
});

test("the story: back to the same balance, then a separate change of conditions, then the same disturbance again", () => {
  const story = STEPS.map((s) => `${s.stage}/${s.conditions}`);
  assert.deepEqual(story, [
    "equilibrium/old",
    "disturbance/old",
    "counter/old",
    "restored/old",
    "conditions/new",
    "disturbance/new",
    "counter/new",
    "restored/new",
  ]);
  assert.ok(!RING.includes("conditions"), "changing the conditions is not part of the push-back loop");
  assert.equal(AUTOPLAY_MS, STEPS.slice(1).reduce((sum, s) => sum + s.ms, 0));
});

test("the ring marker moves through one third per stage of the loop", () => {
  assert.equal(ringProgress("disturbance", 0), 0);
  assert.ok(Math.abs(ringProgress("counter", 0) - 1 / 3) < 1e-9);
  assert.ok(Math.abs(ringProgress("restored", 0.5) - 5 / 6) < 1e-9);
  assert.equal(ringProgress("restored", 3), 1, "it stops at the end");
  assert.equal(ringProgress("conditions", 0.5), 0, "off the loop it waits at the top");
  assert.equal(ringProgress("equilibrium", 0.5), 0);
});

test("arcPath draws clockwise, or reversed for upright text", () => {
  assert.equal(arcPath(0, 0, 10, 0, 90), "M 10 0 A 10 10 0 0 1 0 10");
  assert.equal(arcPath(0, 0, 10, 0, 90, true), "M 0 10 A 10 10 0 0 0 10 0");
});

test("the flow is a liquid: it neither piles up nor drains (zero divergence)", () => {
  const h = 0.01;
  for (const [x, y, t] of [[10, 20, 0], [300, 140, 2.5], [812, 433, 9]]) {
    const dx = (flowAt(x + h, y, t, 160).x - flowAt(x - h, y, t, 160).x) / (2 * h);
    const dy = (flowAt(x, y + h, t, 160).y - flowAt(x, y - h, t, 160).y) / (2 * h);
    assert.ok(Math.abs(dx + dy) < 1e-6, `divergence ${dx + dy}`);
  }
});

test("unitFor gives screen directions", () => {
  const right = unitFor(0);
  const down = unitFor(90);
  assert.ok(Math.abs(right.x - 1) < 1e-9 && Math.abs(right.y) < 1e-9);
  assert.ok(Math.abs(down.y - 1) < 1e-9 && Math.abs(down.x) < 1e-9);
});

test("atom count grows with the lens but stays readable", () => {
  assert.equal(atomCount(10), 36);
  assert.equal(atomCount(2000), 80);
  const mid = atomCount(220);
  assert.ok(mid > 36 && mid < 80);
});

test("mix blends colours", () => {
  assert.deepEqual(mix([0, 0, 0], [10, 20, 30], 0.5), [5, 10, 15]);
});
