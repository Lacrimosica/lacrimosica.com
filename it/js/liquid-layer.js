/* ---------- Liquid layer ----------
 * The WebGL adapter for the fluid hero: it draws a frame from the fluid
 * simulation. The boundary formula and the colours are written into the
 * shader from the phase geometry and the palette. */

import { MAX_BLOBS } from "./fluid-sim.js";
import { boundaryGLSL } from "./phase-geometry.js";

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const fragmentShader = (palette) => `
precision highp float;
uniform vec2 uRes;
uniform float uScale;
uniform float uTime;
uniform float uVertical;
uniform float uShift;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uDent;
uniform float uDentAlong;
uniform float uBuffer;
#define MAX_BLOBS ${MAX_BLOBS}
uniform vec4 uBlobs[MAX_BLOBS];

${palette.shaderConstants}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

${boundaryGLSL()}

// Three-stop indicator: blue (0) -> violet buffer (0.5) -> rose (1).
vec3 threeStop(float p, vec3 a, vec3 b, vec3 c) {
  return p < 0.5 ? mix(a, b, p * 2.0) : mix(b, c, p * 2.0 - 1.0);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y * uScale - gl_FragCoord.y) / uScale;
  vec2 uv = px / uRes;
  float along = mix(uv.x, uv.y, uVertical);
  float across = mix(uv.y, uv.x, uVertical);
  float acrossPx = mix(uRes.y, uRes.x, uVertical);
  float t = uTime;

  vec2 q = px / 340.0;
  vec2 w = vec2(fbm(q + vec2(0.0, t * 0.05)), fbm(q + vec2(5.2, 1.3) - t * 0.04));
  float liquid = fbm(q + 1.7 * w + t * 0.03);

  vec2 dp = px - uPointer;
  float r = length(dp);
  float field = exp(-r * r / (2.0 * 170.0 * 170.0)) * uPointerStrength;
  float ripple = sin(r * 0.05 - t * 2.4) * exp(-r / 240.0) * uPointerStrength;

  float d = (across - boundary(along, t)) * acrossPx;

  // The buffer band breathes along the boundary and widens under stress.
  float band = uBuffer * (0.75 + 0.5 * fbm(vec2(along * 4.0, t * 0.15)));
  float p = 0.5 * smoothstep(-band, -0.25 * band, d) + 0.5 * smoothstep(0.25 * band, band, d);

  vec3 tech = mix(TECH_DARK, TECH_LIGHT, liquid);
  vec3 buf = mix(BUFFER_DARK, BUFFER_LIGHT, liquid);
  vec3 people = mix(PEOPLE_DARK, PEOPLE_LIGHT, liquid);
  vec3 color = threeStop(p, tech, buf, people);

  // Blobs of one phase inside the other, as metaballs so nearby drops merge.
  float fieldCode = 0.0;
  float fieldPeople = 0.0;
  for (int i = 0; i < MAX_BLOBS; i++) {
    vec4 b = uBlobs[i];
    if (b.w == 0.0) continue;
    vec2 o = px - b.xy;
    float k = abs(b.w) * b.z * b.z / (dot(o, o) + 1.0);
    if (b.w < 0.0) fieldCode += k;
    else fieldPeople += k;
  }
  // A blob shows only in the other phase; in its own phase it is invisible.
  float side = smoothstep(-2.0, 2.0, d);
  float inkCode = smoothstep(0.85, 1.15, fieldCode) * side;
  float inkPeople = smoothstep(0.85, 1.15, fieldPeople) * (1.0 - side);
  // The core keeps its phase colour; the edge turns to the buffer colour.
  color = mix(color, mix(buf, tech, smoothstep(1.4, 3.5, fieldCode)), inkCode);
  color = mix(color, mix(buf, people, smoothstep(1.4, 3.5, fieldPeople)), inkPeople);
  float rim = exp(-abs(fieldCode - 1.0) * 10.0) * side
    + exp(-abs(fieldPeople - 1.0) * 10.0) * (1.0 - side);
  color += GLOW_BUFFER * rim * 0.12;

  vec3 glow = threeStop(p, GLOW_TECH, GLOW_BUFFER, GLOW_PEOPLE);
  color += glow * smoothstep(0.6, 0.9, liquid) * 0.06;

  // A thin meniscus at the centre of the band.
  color += GLOW_BUFFER * exp(-abs(d) / 1.8) * 0.3 * (0.7 + 0.8 * field);

  color += glow * field * 0.14;
  color += glow * ripple * 0.03;

  // Interference near the boundary: the pointer and its mirror image across
  // the boundary act as two coherent sources.
  float pAlong = mix(uPointer.x / uRes.x, uPointer.y / uRes.y, uVertical);
  float bAcross = boundary(pAlong, t) * acrossPx;
  vec2 mirror = mix(vec2(uPointer.x, 2.0 * bAcross - uPointer.y),
                    vec2(2.0 * bAcross - uPointer.x, uPointer.y), uVertical);
  float r2 = length(px - mirror);
  float wave = cos(r * 0.11 - t * 3.0) + cos(r2 * 0.11 - t * 3.0);
  float fringes = wave * wave * 0.25;
  color += glow * fringes * exp(-abs(d) / 110.0) * exp(-r / 220.0) * uPointerStrength * 0.08;

  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Draws the two liquid phases, the buffer band and the blobs with WebGL.
 * Returns null when WebGL or the shader is unavailable.
 */
export function createLiquidLayer(canvas, { geometry, palette }) {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) return null;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentShader(palette));
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {};
  [
    "uRes", "uScale", "uTime", "uVertical", "uShift",
    "uPointer", "uPointerStrength", "uDent", "uDentAlong", "uBuffer", "uBlobs",
  ].forEach((name) => {
    uniforms[name] = gl.getUniformLocation(program, name);
  });

  let scale = 1;

  return {
    resize(width, height) {
      scale = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    draw({ pointer, buffer: bufferWidth, blobs }) {
      const { motion } = geometry;
      gl.uniform2f(uniforms.uRes, geometry.width, geometry.height);
      gl.uniform1f(uniforms.uScale, canvas.width / geometry.width);
      gl.uniform1f(uniforms.uTime, motion.time);
      gl.uniform1f(uniforms.uVertical, geometry.vertical ? 1 : 0);
      gl.uniform1f(uniforms.uShift, motion.shift);
      gl.uniform2f(uniforms.uPointer, pointer.x, pointer.y);
      gl.uniform1f(uniforms.uPointerStrength, pointer.strength);
      gl.uniform1f(uniforms.uDent, motion.dent);
      gl.uniform1f(uniforms.uDentAlong, motion.dentAlong);
      gl.uniform1f(uniforms.uBuffer, bufferWidth);
      gl.uniform4fv(uniforms.uBlobs, blobs);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

