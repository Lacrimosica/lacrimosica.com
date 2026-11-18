import { test } from "node:test";
import assert from "node:assert/strict";
import {
  announcementFor,
  createCycle,
  otherSide,
  statusFor,
  targetsFor,
} from "../js/cycle.js";

/** A clock the test advances by hand. */
function fakeClock() {
  let now = 0;
  let timers = [];
  return {
    schedule(fn, ms) {
      const timer = { at: now + ms, fn };
      timers.push(timer);
      return timer;
    },
    cancel(timer) {
      timers = timers.filter((t) => t !== timer);
    },
    advance(ms) {
      now += ms;
      const due = timers.filter((t) => t.at <= now).sort((a, b) => a.at - b.at);
      timers = timers.filter((t) => t.at > now);
      due.forEach((t) => t.fn());
    },
  };
}

function recordedCycle() {
  const clock = fakeClock();
  const cycle = createCycle(clock);
  const seen = [];
  cycle.subscribe((state) => seen.push(`${state.side}:${state.stage}`));
  return { clock, cycle, seen };
}

test("starts at equilibrium with no side", () => {
  const { cycle } = recordedCycle();
  assert.deepEqual(cycle.state, { side: null, stage: "equilibrium" });
});

test("a disturbance runs disturbance → counter → settled on schedule", () => {
  const { clock, cycle, seen } = recordedCycle();
  cycle.disturb("technology");
  assert.deepEqual(seen, ["technology:disturbance"]);
  clock.advance(749);
  assert.equal(cycle.state.stage, "disturbance");
  clock.advance(1);
  assert.equal(cycle.state.stage, "counter");
  clock.advance(1950);
  assert.deepEqual(seen, ["technology:disturbance", "technology:counter", "technology:settled"]);
});

test("disturbing the active side again does nothing", () => {
  const { cycle, seen } = recordedCycle();
  assert.equal(cycle.disturb("community"), true);
  assert.equal(cycle.disturb("community"), false);
  assert.deepEqual(seen, ["community:disturbance"]);
});

test("a new side mid-disturbance notifies again and restarts the timing", () => {
  const { clock, cycle, seen } = recordedCycle();
  cycle.disturb("technology");
  clock.advance(500);
  cycle.disturb("community");
  assert.deepEqual(seen, ["technology:disturbance", "community:disturbance"]);
  clock.advance(500); // the first cycle's counter would have fired here
  assert.equal(cycle.state.stage, "disturbance");
  clock.advance(250);
  assert.deepEqual(cycle.state, { side: "community", stage: "counter" });
});

test("unsubscribe stops notifications", () => {
  const cycle = createCycle(fakeClock());
  let calls = 0;
  const off = cycle.subscribe(() => calls++);
  off();
  cycle.disturb("technology");
  assert.equal(calls, 0);
});

test("otherSide flips, and starts from technology", () => {
  assert.equal(otherSide("technology"), "community");
  assert.equal(otherSide("community"), "technology");
  assert.equal(otherSide(null), "technology");
});

test("status and announcement text", () => {
  assert.equal(statusFor({ side: null, stage: "equilibrium" }), "At equilibrium");
  assert.equal(statusFor({ side: "technology", stage: "disturbance" }), "Disturbance: + code");
  assert.equal(statusFor({ side: "technology", stage: "counter" }), "Pushes back → people");
  assert.equal(statusFor({ side: "community", stage: "counter" }), "Pushes back → code");
  assert.equal(statusFor({ side: "community", stage: "settled" }), "New equilibrium");
  assert.equal(announcementFor({ side: "community", stage: "counter" }), null);
  assert.equal(
    announcementFor({ side: "community", stage: "settled" }),
    "New equilibrium, with a little more people."
  );
});

test("physical targets per stage", () => {
  assert.deepEqual(targetsFor({ side: null, stage: "equilibrium" }), { shift: 0, flux: 0, buffer: 22 });
  assert.deepEqual(targetsFor({ side: "technology", stage: "disturbance" }), { shift: 0.1, flux: 0, buffer: 38 });
  assert.deepEqual(targetsFor({ side: "technology", stage: "counter" }), { shift: 0.035, flux: 1, buffer: 66 });
  assert.deepEqual(targetsFor({ side: "community", stage: "counter" }), { shift: -0.035, flux: -1, buffer: 66 });
  assert.deepEqual(targetsFor({ side: "community", stage: "settled" }), { shift: -0.035, flux: 0, buffer: 22 });
});
