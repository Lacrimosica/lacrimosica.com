import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PARTICLE_COLORS, SHADER_COLORS, parseHex, readPalette } from "../js/palette.js";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const fromStylesheet = (name) => {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  return match ? ` ${match[1]}` : "";
};

test("parseHex reads long and short hex", () => {
  assert.deepEqual(parseHex(" #132a66"), [19, 42, 102]);
  assert.deepEqual(parseHex("#fff"), [255, 255, 255]);
  assert.throws(() => parseHex(""), /Not a hex colour/);
});

test("styles.css defines every colour the hero reads", () => {
  for (const name of [...Object.values(SHADER_COLORS), ...PARTICLE_COLORS]) {
    assert.notEqual(fromStylesheet(name), "", `${name} missing from styles.css`);
  }
});

test("the palette becomes GLSL constants and rgba components", () => {
  const palette = readPalette(fromStylesheet);
  assert.match(palette.shaderConstants, /const vec3 TECH_DARK = vec3\(0\.075, 0\.165, 0\.400\);/);
  assert.equal(palette.shaderConstants.split("\n").length, 9);
  assert.deepEqual(palette.particles, [
    "214, 226, 255", "205, 210, 255", "224, 204, 255", "255, 205, 224", "255, 216, 230",
  ]);
});
