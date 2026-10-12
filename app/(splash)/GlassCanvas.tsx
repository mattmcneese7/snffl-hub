'use client';

import { useEffect, useRef } from 'react';

/**
 * The glass, drawn in WebGL.
 *
 * Built to how glass materials are actually made (Apple's Liquid Glass talk,
 * Microsoft's acrylic recipe, and the published Snell's law reconstructions):
 *
 *   Lensing, not blur   The face is flat and clear and bends nothing. Only the
 *                       bezel, a convex squircle rolling over the edge, bends
 *                       the ground behind it, by Snell's law at n = 1.5, with
 *                       red and blue at slightly different indices.
 *   Thin and flat       A narrow, shallow bezel (3 to 5px) whose tilt is capped
 *                       near 30 degrees, so the edge eases rather than rolls
 *                       and the glass lies flat on the page.
 *   Fog                 A 6% cool near white, even across the sheet.
 *   Fixed light         Two lights set in the scene, a warm key high at the top
 *                       left and a cool fill low at the bottom right. Their
 *                       highlights land only where the curved bezel faces them,
 *                       which is what draws the silhouette. Nothing follows the
 *                       pointer.
 *   Fresnel             Glass reflects about 4% of its surroundings head on and
 *                       far more at a glancing angle, so the face takes the
 *                       faintest lift and the bezel brightens as it turns away.
 *   Adaptive shadow     A tight contact shadow and a faint soft one, lighter
 *                       where the ground is light: just above the page.
 *
 * Buttons (data-glass="button") are a second material: a thick rim round a
 * white face, read from data-bezel, data-body, data-rim and data-disp, and an
 * optional color, data-tint, that lives in the rim and fills the face while
 * the button is pressed. Tracks
 * (data-glass="track") are grooves pressed into the ground for them to sit in.
 *
 * It draws on first paint, scroll, resize and font load, since the ground
 * holds still while the glass moves over it, and for about a second after a
 * button is pressed, while its light turns once round the rim and its color
 * fills and drains. If WebGL is missing or lost, the
 * stage never gets data-webgl="on" and each surface keeps its CSS stand in.
 */

// Twelve surfaces: four vec4 arrays of twelve stay inside the 64 uniform
// vectors older iPhones allow a fragment shader.
const MAX = 12;

const VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform vec4 uRect[${MAX}];
// Per surface: x radius, y kind (0 pane, 1 button, 2 track), z light turn,
// w lift (panes: 0 the locked flat sheet, 1 to 3 standing further off).
uniform vec4 uInfo[${MAX}];
// Buttons only: x bezel width, y body white, z rim dark, w dispersion.
uniform vec4 uMat[${MAX}];
// Buttons only: rgb the button's color, a how far a press has filled it.
uniform vec4 uTint[${MAX}];
uniform int uCount;

vec3 rgb(float r, float g, float b) { return vec3(r, g, b) / 255.0; }

float th(float x) { float e = exp(2.0 * clamp(x, -10.0, 10.0)); return (e - 1.0) / (e + 1.0); }

// A disc softened by a 70px blur, matching the CSS glows.
float orb(vec2 p, vec2 c, float r) {
  return 0.5 - 0.5 * th(1.2 * (length(p - c) - r) / 99.0);
}

// The glow ground: the CSS gradient at 172deg, then its five lights in order.
vec3 ground(vec2 p) {
  float a = radians(172.0);
  vec2 dir = vec2(sin(a), -cos(a));
  float len = abs(uRes.x * sin(a)) + abs(uRes.y * cos(a));
  float t = clamp(dot(p - 0.5 * uRes, dir) / len + 0.5, 0.0, 1.0);
  vec3 c = mix(rgb(179.0, 184.0, 207.0), rgb(199.0, 202.0, 220.0), clamp(t / 0.30, 0.0, 1.0));
  c = mix(c, rgb(195.0, 214.0, 212.0), clamp((t - 0.30) / 0.35, 0.0, 1.0));
  c = mix(c, rgb(170.0, 205.0, 199.0), clamp((t - 0.65) / 0.35, 0.0, 1.0));
  float vw = uRes.x / 100.0;
  float vh = uRes.y / 100.0;
  c = mix(c, rgb(255.0, 246.0, 222.0), 0.60 * orb(p, vec2(72.0 * vw, 4.0 * vh), 40.0 * vw));
  c = mix(c, rgb(255.0, 238.0, 180.0), 0.28 * orb(p, vec2(40.0 * vw, 18.0 * vh), 26.0 * vw));
  c = mix(c, rgb(255.0, 214.0, 170.0), 0.30 * orb(p, vec2(8.0 * vw, 42.0 * vh), 34.0 * vw));
  c = mix(c, rgb(255.0, 180.0, 196.0), 0.22 * orb(p, vec2(92.0 * vw, 70.0 * vh), 32.0 * vw));
  c = mix(c, rgb(150.0, 190.0, 255.0), 0.20 * orb(p, vec2(30.0 * vw, 92.0 * vh), 36.0 * vw));
  return c;
}

float box(vec2 p, vec4 r, float rad) {
  vec2 q = abs(p - (r.xy + 0.5 * r.zw)) - 0.5 * r.zw + rad;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Where a ray straight down through the glass meets the ground, for a surface
// normal N and height z, through glass of the given refractive index.
vec2 bent(vec2 p, vec3 N, float z, float ior) {
  vec3 R = refract(vec3(0.0, 0.0, -1.0), N, 1.0 / ior);
  return p + R.xy * z / max(-R.z, 0.2);
}

// A point light orbiting a button, caught by its rim. Each color sees the
// light from a slightly different place, so a glint splits at its edges the
// way a thick glass rim does.
float glint(vec3 N, vec2 p, vec2 at) {
  vec3 L = normalize(vec3(at - p, 26.0));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  return pow(max(dot(N, H), 0.0), 220.0);
}
vec3 spectral(vec3 N, vec2 p, vec2 c, vec2 reach, float a) {
  vec2 dir = vec2(cos(a), sin(a));
  vec2 side = vec2(-dir.y, dir.x) * 4.0;
  vec2 at = c + dir * reach;
  return vec3(glint(N, p, at - side), glint(N, p, at), glint(N, p, at + side));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec3 col = ground(p);
  float shadow = 0.0;

  // Screen y runs down, so up and to the left is negative x and y.
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 keyH = normalize(normalize(vec3(-0.5, -0.75, 0.75)) + V);
  vec3 fillH = normalize(normalize(vec3(0.6, 0.7, 0.9)) + V);

  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uCount) break;
    vec4 r = uRect[i];
    float rad = uInfo[i].x;
    float kind = uInfo[i].y;
    float d = box(p, r, rad);

    if (kind > 1.5) {
      // A track: a shallow groove pressed into the ground. Shade falls from
      // its top edge and a thin lip catches the light along the bottom.
      if (d > 0.0) continue;
      vec2 e2 = normalize(vec2(
        box(p + vec2(1.0, 0.0), r, rad) - box(p - vec2(1.0, 0.0), r, rad),
        box(p + vec2(0.0, 1.0), r, rad) - box(p - vec2(0.0, 1.0), r, rad)) + 1e-6);
      float inner = 1.0 - smoothstep(-1.0, 6.0, -box(p - vec2(0.0, 2.5), r, rad));
      col *= 0.975;
      col *= 1.0 - inner * 0.09;
      float lip = 1.0 - smoothstep(0.0, 1.3, -d);
      col = mix(col, vec3(1.0), lip * (0.25 + 0.45 * clamp(e2.y, 0.0, 1.0)));
      col = mix(col, vec3(0.1, 0.13, 0.2), lip * 0.18 * clamp(-e2.y, 0.0, 1.0));
      continue;
    }

    if (kind > 0.5) {
      // A button: a thick, clear rim around a white face, after a pill of
      // optical glass. The rim bends hard, reads dark through its middle, and
      // catches two glints that only travel when the button is used.
      if (d > 0.0) {
        float soften = mix(1.0, 0.6, smoothstep(0.4, 0.8, luma(col)));
        float contact = 1.0 - smoothstep(-0.5, 2.0, box(p - vec2(0.0, 1.0), r, rad));
        float soft = 1.0 - smoothstep(0.0, 10.0, box(p - vec2(0.0, 3.0), r, rad));
        shadow = max(shadow, (contact * 0.10 + soft * 0.04) * soften);
        continue;
      }
      vec4 m = uMat[i];
      vec2 b2 = normalize(vec2(
        box(p + vec2(1.0, 0.0), r, rad) - box(p - vec2(1.0, 0.0), r, rad),
        box(p + vec2(0.0, 1.0), r, rad) - box(p - vec2(0.0, 1.0), r, rad)) + 1e-6);
      float bx = clamp(-d / m.x, 0.0, 1.0);
      float bu = 1.0 - max(bx, 0.015);
      float bk = max(1.0 - bu * bu * bu * bu, 1e-4);
      float bh = pow(bk, 0.25);
      float bdh = bx < 1.0 ? bu * bu * bu * pow(bk, -0.75) : 0.0;
      float BT = m.x * 0.7;
      vec3 BN = normalize(vec3(b2 * min(bdh * BT / m.x, 1.2), 1.0));
      vec3 g = col;
      if (bx < 1.0) {
        float z = bh * BT * 3.0;
        g = ground(bent(p, BN, z, 1.5));
        g.r = ground(bent(p, BN, z, 1.5 - m.w)).r;
        g.b = ground(bent(p, BN, z, 1.5 + m.w)).b;
      }
      float face = smoothstep(0.6, 1.0, bx);
      g = mix(g, vec3(0.957, 0.96, 0.966), m.y * mix(0.45, 1.0, face));
      // Color: carried in the rim, where the glass is thickest, a breath of
      // it on the face, and the face fills with it while pressed.
      vec4 tint = uTint[i];
      float hasTint = step(0.001, tint.r + tint.g + tint.b);
      float inRim = bx < 1.0 ? smoothstep(0.0, 0.35, bx) * (1.0 - smoothstep(0.55, 1.0, bx)) : 0.0;
      g = mix(g, tint.rgb, hasTint * (inRim * 0.42 + face * (0.07 + 0.33 * tint.a)));
      float band = bx < 1.0 ? exp(-pow((bx - 0.52) / 0.11, 2.0)) : 0.0;
      g *= 1.0 - m.z * band;
      g = mix(g, vec3(1.0), (1.0 - smoothstep(0.0, 0.25, bx)) * 0.6);
      float BF = 0.04 + 0.96 * pow(1.0 - BN.z, 5.0);
      g = mix(g, vec3(1.0, 0.995, 0.985), BF * 0.5);
      vec2 c = r.xy + 0.5 * r.zw;
      vec2 reach = 0.5 * r.zw + vec2(10.0);
      float a = -2.3 + uInfo[i].z;
      vec3 glow = mix(vec3(1.0), 0.45 + 0.9 * tint.rgb, hasTint * 0.6);
      g += spectral(BN, p, c, reach, a) * 1.8 * glow;
      g += spectral(BN, p, c, reach, a + 3.14159) * 1.1 * glow;
      col = g;
      continue;
    }

    // Thin, flat glass: a narrow, shallow bezel, a little deeper on bigger sheets.
    float bezel = clamp(min(r.z, r.w) * 0.02, 3.0, 5.0);
    float T = bezel * 0.35;

    float lift = uInfo[i].w;

    if (d > 0.0) {
      float soften = mix(1.0, 0.55, smoothstep(0.4, 0.8, luma(col)));
      float contact = 1.0 - smoothstep(-0.5, 2.0, box(p - vec2(0.0, 1.0), r, rad));
      float soft = 1.0 - smoothstep(0.0, 8.0, box(p - vec2(0.0, 2.0), r, rad));
      float s = (contact * 0.07 + soft * 0.02) * soften;
      if (lift > 0.5) {
        // Lifted: the sheet stands off the ground, so its shadow drops lower
        // and spreads wider the higher it is, and is no longer softened on
        // the light ground. A tight contact line keeps the edge crisp.
        float off = 3.0 + 5.0 * lift;
        float R = 8.0 + 8.0 * lift;
        float amb = exp(-2.2 * max(box(p - vec2(0.0, off), r, rad), 0.0) / R);
        float key = exp(-3.0 * max(box(p - vec2(0.0, 0.4 * off), r, rad), 0.0) / (0.4 * R));
        s = contact * (0.08 + 0.02 * lift) + key * (0.03 + 0.03 * lift) + amb * (0.05 + 0.055 * lift);
      }
      shadow = max(shadow, s);
      continue;
    }

    vec2 dx = vec2(1.0, 0.0);
    vec2 n2 = normalize(vec2(
      box(p + dx.xy, r, rad) - box(p - dx.xy, r, rad),
      box(p + dx.yx, r, rad) - box(p - dx.yx, r, rad)) + 1e-6);

    // The bezel: a convex squircle, h = (1 - (1 - x)^4)^(1/4), x = 0 at the
    // edge and 1 where the flat face begins.
    float x = clamp(-d / bezel, 0.0, 1.0);
    float u = 1.0 - max(x, 0.015);
    float k = max(1.0 - u * u * u * u, 1e-4);
    float h = pow(k, 0.25);
    float dh = x < 1.0 ? u * u * u * pow(k, -0.75) : 0.0;
    // Capped so even the outermost pixel tilts no more than about 30 degrees:
    // an eased edge, not a rolled one, so the rim never flares white.
    vec3 N = normalize(vec3(n2 * min(dh * T / bezel, 0.58), 1.0));
    float z = h * T;

    vec3 g;
    if (x < 1.0) {
      vec2 q = bent(p, N, z, 1.5);
      g = 0.25 * (ground(q) + ground(q + vec2(0.8, 0.4)) + ground(q + vec2(-0.4, 0.8)) + ground(q + vec2(-0.6, -0.7)));
      g.r = ground(bent(p, N, z, 1.49)).r;
      g.b = ground(bent(p, N, z, 1.52)).b;
    } else {
      g = col;
    }

    // Fresnel (Schlick): about 4% head on, rising sharply at a glancing angle,
    // reflecting a bright sky.
    float F = 0.04 + 0.96 * pow(1.0 - N.z, 5.0);
    g = mix(g, vec3(1.0, 0.995, 0.985), F);

    // The two scene lights, caught only by the curved bezel.
    g += vec3(1.0, 0.985, 0.95) * pow(max(dot(N, keyH), 0.0), 50.0) * 0.18 * (1.0 + 0.4 * lift);
    g += vec3(0.9, 0.95, 1.0) * pow(max(dot(N, fillH), 0.0), 40.0) * 0.06 * (1.0 + 0.4 * lift);

    // Fog: 6% of a cool near white, evenly across the whole sheet, so the
    // glass reads as a faint frosted plane rather than an empty outline. A
    // lifted sheet carries a little more, catching more light than the ground.
    g = mix(g, vec3(0.972, 0.978, 0.988), 0.06 + 0.07 * lift);
    // Lifted, its top edge catches the light from above in one clean line.
    float top = (1.0 - smoothstep(0.0, 1.4, -d)) * clamp(-n2.y, 0.0, 1.0);
    g = mix(g, vec3(1.0), top * 0.22 * lift);

    col = g;
  }

  col *= 1.0 - shadow;
  col += (hash(p) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

function shader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

export default function GlassCanvas({ className }: { className: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const stage = canvas?.closest<HTMLElement>('[data-stage]');
    if (!canvas || !stage) return;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;

    const vs = shader(gl, gl.VERTEX_SHADER, VERT);
    const fs = shader(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // One triangle that covers the screen.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const attr = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, 'uRes'),
      dpr: gl.getUniformLocation(prog, 'uDpr'),
      rect: gl.getUniformLocation(prog, 'uRect[0]'),
      info: gl.getUniformLocation(prog, 'uInfo[0]'),
      mat: gl.getUniformLocation(prog, 'uMat[0]'),
      tint: gl.getUniformLocation(prog, 'uTint[0]'),
      count: gl.getUniformLocation(prog, 'uCount'),
    };

    const rects = new Float32Array(MAX * 4);
    const info = new Float32Array(MAX * 4);
    const mats = new Float32Array(MAX * 4);
    const tints = new Float32Array(MAX * 4);
    let frame = 0;

    const hex = (h: string | undefined): [number, number, number] => {
      const m = /^#?([0-9a-f]{6})$/i.exec(h ?? '');
      if (!m) return [0, 0, 0];
      const n = parseInt(m[1], 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    };

    // A press fills the face with the button's color in 120ms and lets it
    // drain over 420ms after release.
    const FILL_IN = 120;
    const FILL_OUT = 420;
    const presses = new WeakMap<Element, { down: number; up: number | null; from: number }>();
    const held = new Set<Element>();
    const fillOf = (el: Element, now: number) => {
      const p = presses.get(el);
      if (!p) return 0;
      const inAt = Math.min(1, (now - p.down) / FILL_IN);
      if (p.up == null) return inAt;
      return Math.max(0, p.from * (1 - (now - p.up) / FILL_OUT));
    };

    // A button's light turns once round its rim when it is pressed. Nothing
    // runs at rest or on hover.
    const SPIN = 1100;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const spins = new WeakMap<Element, number>();
    let busyUntil = 0;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const turnOf = (el: Element, now: number) => {
      const start = spins.get(el);
      if (start == null || still.matches) return 0;
      const t = (now - start) / SPIN;
      return t >= 1 ? 0 : ease(t) * Math.PI * 2;
    };

    const draw = () => {
      frame = 0;
      const now = performance.now();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      gl.viewport(0, 0, canvas.width, canvas.height);

      const panes = Array.from(stage.querySelectorAll<HTMLElement>('[data-glass]')).slice(0, MAX);
      panes.forEach((pane, i) => {
        const b = pane.getBoundingClientRect();
        rects.set([b.left, b.top, b.width, b.height], i * 4);
        const radius = Math.min(parseFloat(getComputedStyle(pane).borderTopLeftRadius) || 0, b.height / 2, b.width / 2);
        const kind = pane.dataset.glass === 'button' ? 1 : pane.dataset.glass === 'track' ? 2 : 0;
        const ds = pane.dataset;
        info.set([radius, kind, kind === 1 ? turnOf(pane, now) : 0, kind === 0 ? Number(ds.lift ?? 0) : 0], i * 4);
        tints.set([...hex(ds.tint), kind === 1 ? fillOf(pane, now) : 0], i * 4);
        mats.set(
          [Number(ds.bezel ?? 7), Number(ds.body ?? 0.8), Number(ds.rim ?? 0.5), Number(ds.disp ?? 0.04)],
          i * 4,
        );
      });

      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.dpr, dpr);
      gl.uniform4fv(u.rect, rects);
      gl.uniform4fv(u.info, info);
      gl.uniform4fv(u.mat, mats);
      gl.uniform4fv(u.tint, tints);
      gl.uniform1i(u.count, panes.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (now < busyUntil) schedule();
    };

    function schedule() {
      if (!frame) frame = requestAnimationFrame(draw);
    }
    // Keeps drawing while a light turns or a fill drains, then stops.
    const press = (e: PointerEvent) => {
      const el = (e.target as Element).closest?.('[data-glass="button"]');
      if (!el) return;
      const now = performance.now();
      if (!(turnOf(el, now) > 0)) spins.set(el, now);
      presses.set(el, { down: now, up: null, from: 0 });
      held.add(el);
      busyUntil = Math.max(busyUntil, now + SPIN + 50);
      schedule();
    };
    // A release anywhere lets go of every held button, so a finger that
    // slides off one still lets it drain.
    const release = () => {
      const now = performance.now();
      held.forEach((el) => {
        const p = presses.get(el);
        if (p && p.up == null) presses.set(el, { ...p, up: now, from: fillOf(el, now) });
      });
      held.clear();
      busyUntil = Math.max(busyUntil, now + FILL_OUT + 50);
      schedule();
    };
    const lost = (e: Event) => {
      e.preventDefault();
      delete stage.dataset.webgl;
    };

    draw();
    stage.dataset.webgl = 'on';
    stage.addEventListener('scroll', schedule, { passive: true });
    stage.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('resize', schedule);
    canvas.addEventListener('webglcontextlost', lost);
    const ro = new ResizeObserver(schedule);
    stage.querySelectorAll('[data-glass]').forEach((pane) => ro.observe(pane));
    document.fonts?.ready.then(schedule);
    // A surface's settings can change without its size changing (a new lift
    // after client navigation), so watch those attributes too.
    const mo = new MutationObserver(schedule);
    mo.observe(stage, { subtree: true, attributes: true, attributeFilter: ['data-lift', 'data-tint', 'data-glass'] });

    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener('scroll', schedule);
      stage.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('resize', schedule);
      canvas.removeEventListener('webglcontextlost', lost);
      ro.disconnect();
      mo.disconnect();
      delete stage.dataset.webgl;
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
