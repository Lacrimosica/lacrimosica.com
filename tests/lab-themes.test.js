import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHex } from "../js/palette.js";
import { FALLBACK, GUEST_SHAPES, OVERLAYS, SHAPES, THEMES, scienceFor, themeFor } from "../js/lab-themes.js";

test("every disturbance has a complete look", () => {
  for (const [id, theme] of Object.entries({ ...THEMES, fallback: FALLBACK })) {
    assert.ok(SHAPES.includes(theme.shape), `${id} shape`);
    assert.ok(GUEST_SHAPES.includes(theme.guest.shape), `${id} guest shape`);
    assert.ok(OVERLAYS.includes(theme.overlay), `${id} overlay`);
    assert.ok(theme.condition, `${id} names its new condition`);
    for (const part of [theme.kinds.a, theme.kinds.b, theme.guest]) {
      assert.ok(part.label, `${id} label`);
      parseHex(part.base);
      parseHex(part.light);
    }
    parseHex(theme.lens);
  }
});

test("the science names the world's own atoms, and keeps acronyms", () => {
  const ai = THEMES.ai;
  assert.match(scienceFor("equilibrium", "old", ai), /Owned knowledge and stale knowledge/);
  assert.match(scienceFor("disturbance", "old", ai), /^AI pours in.*the AI line/);
  assert.match(scienceFor("restored", "old", ai), /same balance/);
  assert.match(scienceFor("conditions", "new", ai), /Nothing is added.*owned knowledge faster.*didn't cause it/);
  assert.match(scienceFor("restored", "new", ai), /The conditions did/);
});

test("a disturbance without a theme of its own gets the plain look", () => {
  assert.equal(themeFor("something-new"), FALLBACK);
  assert.equal(themeFor("ai"), THEMES.ai);
});
