import { test } from "node:test";
import assert from "node:assert/strict";
import { boundaryGLSL, createPhaseGeometry, glslFloat } from "../js/phase-geometry.js";

function geometryOf(width, height, vertical) {
  const geometry = createPhaseGeometry();
  geometry.resize(width, height, vertical);
  return geometry;
}

test("wide screens: code on the left, people on the right", () => {
  const g = geometryOf(1000, 600, true);
  assert.equal(g.phaseAt(50, 300), "technology");
  assert.equal(g.phaseAt(950, 300), "community");
});

test("narrow screens: code on top, people below", () => {
  const g = geometryOf(400, 800, false);
  assert.equal(g.phaseAt(200, 40), "technology");
  assert.equal(g.phaseAt(200, 760), "community");
});

test("pointOnBoundary and distance agree", () => {
  for (const vertical of [true, false]) {
    const g = geometryOf(900, 700, vertical);
    g.move({ time: 3.7, shift: 0.05, dent: 0.04, dentAlong: 0.3 });
    for (const along of [0.1, 0.3, 0.8]) {
      for (const offset of [-25, 0, 12]) {
        const p = g.pointOnBoundary(along, offset);
        assert.ok(Math.abs(g.distance(p.x, p.y) - offset) < 1e-9);
      }
    }
  }
});

test("shift moves the boundary toward people", () => {
  const g = geometryOf(1000, 600, true);
  const before = g.boundary(0.5);
  g.move({ shift: 0.1 });
  assert.ok(Math.abs(g.boundary(0.5) - before - 0.1) < 1e-12);
});

test("the dent is local and can be left out", () => {
  const g = geometryOf(1000, 600, true);
  const flat = g.boundary(0.4);
  const far = g.boundary(0.95);
  g.move({ dent: 0.075, dentAlong: 0.4 });
  assert.ok(Math.abs(g.boundary(0.4) - flat - 0.075) < 1e-12);
  assert.ok(Math.abs(g.boundary(0.95) - far) < 1e-6);
  assert.equal(g.boundary(0.4, { withDent: false }), flat);
});

test("toLocal and toPixel are inverses", () => {
  for (const vertical of [true, false]) {
    const g = geometryOf(800, 500, vertical);
    const { along, across } = g.toLocal(120, 340);
    assert.deepEqual(g.toPixel(along, across), { x: 120, y: 340 });
  }
});

test("glslFloat always writes a float literal", () => {
  assert.equal(glslFloat(23), "23.0");
  assert.equal(glslFloat(0), "0.0");
  assert.equal(glslFloat(-0.83), "-0.83");
});

test("the shader's boundary matches the JS boundary", () => {
  // Run the generated GLSL as JS: the function body only uses float, sin and exp.
  const source = boundaryGLSL()
    .replace("float boundary(float along, float t)", "function boundary(along, t)")
    .replace(/\bfloat\b/g, "let")
    .replace(/\b(sin|exp)\(/g, "Math.$1(");
  const g = geometryOf(1000, 600, true);
  const motion = { time: 12.4, shift: -0.03, dent: 0.05, dentAlong: 0.62 };
  g.move(motion);
  const shader = new Function("uShift", "uDent", "uDentAlong", `${source}\nreturn boundary;`)(
    motion.shift, motion.dent, motion.dentAlong
  );
  for (let along = 0; along <= 1; along += 0.05) {
    assert.ok(Math.abs(shader(along, motion.time) - g.boundary(along)) < 1e-12, `along ${along}`);
  }
});
