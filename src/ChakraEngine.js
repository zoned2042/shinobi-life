/* ============================================================
   CHAKRA ENGINE — raw WebGL, no libraries, no dependencies.

   One canvas, three passes, all on the GPU:
     1. the field   — domain-warped fbm noise, tinted live to whatever
                      village/era/fight you are currently in
     2. the motes   — additive particles animated entirely in the vertex
                      shader, so the CPU never touches a single one
     3. the rings   — shockwaves fired by the game: every button press,
                      every hit landed, every year that turns over

   Everything the game wants to say visually goes through tone()/heat()/
   ripple()/burst(). If WebGL is missing or the context dies, create()
   returns null and the caller just carries on without it.
   ============================================================ */

const MAX_RIPPLES = 10;

const FIELD_VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FIELD_FS = `
precision highp float;
varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uTone;
uniform vec3  uTone2;
uniform float uHeat;
uniform float uFade;
uniform vec4  uRipples[${MAX_RIPPLES}];

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 asp = vec2(uRes.x / max(uRes.y, 1.0), 1.0);
  vec2 p = (vUv - 0.5) * asp * 2.4;
  float t = uTime * 0.06;

  /* Domain warp: noise sampled through noise, which is what stops it reading as
     "a plasma screensaver" and starts it reading as chakra. Four fbm calls, not
     the textbook five — the second warp reuses the first's two components rather
     than sampling a fresh pair, which is visually near-identical and a whole
     octave-stack cheaper on every single pixel. */
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t * 0.8)));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.4), q.x - q.y);
  float f = fbm(p + 2.6 * r);

  float band = smoothstep(0.28, 0.84, f);
  vec3 col = mix(uTone * 0.46, uTone2 * 1.15, band);
  col += uTone2 * pow(band, 2.2) * (0.95 + uHeat * 1.60);

  /* filaments — the thin bright threads where the warp folds back through
     itself. this is the bit that reads as chakra rather than as fog. */
  float fil = smoothstep(0.58, 0.69, f) - smoothstep(0.69, 0.83, f);
  col += uTone2 * fil * (1.45 + uHeat * 1.2);
  /* a second, finer thread taken off the warp we already computed — free,
     because it reuses r rather than sampling the noise again */
  float fine = smoothstep(0.42, 0.47, r.x) - smoothstep(0.47, 0.56, r.x);
  col += uTone * fine * 0.80;

  /* the fight leans on it: hotter, faster, brighter toward the middle */
  float mid = 1.0 - length((vUv - 0.5) * asp) * 1.15;
  col += uTone2 * max(mid, 0.0) * uHeat * 0.75;

  /* shockwaves — expanding rings, one per live ripple */
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 rp = uRipples[i];
    if (rp.w <= 0.0) continue;
    float age = uTime - rp.z;
    if (age < 0.0 || age > 1.6) continue;
    vec2 d = (vUv - rp.xy) * asp;
    float dist = length(d);
    float rad = age * 0.85;
    float ring = exp(-pow((dist - rad) * 13.0, 2.0));
    float decay = 1.0 - age / 1.6;
    col += uTone2 * ring * decay * decay * rp.w * 2.4;
    /* a softer disc inside the ring so a press lights the area, not just a line */
    col += uTone * exp(-pow(dist * 3.4, 2.0)) * decay * decay * rp.w * 0.45;
  }

  /* vignette, but never all the way to black — the corners are where this is
     most visible between the cards, so crushing them defeats the point */
  float vig = 1.0 - pow(length((vUv - 0.5) * 1.30), 2.4);
  col *= clamp(vig, 0.34, 1.0);

  gl_FragColor = vec4(col * uFade, 1.0);
}`;

const MOTE_VS = `
attribute vec3 aSeed;   /* x: lane, y: rate, z: size */
uniform float uTime;
uniform float uDpr;
uniform float uHeat;
varying float vA;
void main() {
  float life = fract(uTime * aSeed.y + aSeed.x * 7.13);
  float sway = sin(uTime * 0.7 + aSeed.x * 34.0) * 0.05;
  float x = aSeed.x * 2.0 - 1.0 + sway;
  float y = -1.15 + life * 2.4;
  gl_Position = vec4(x, y, 0.0, 1.0);
  gl_PointSize = aSeed.z * uDpr * (1.0 + uHeat * 0.8) * (1.0 - life * 0.45);
  vA = sin(life * 3.14159) * (0.72 + uHeat * 0.6);
}`;

const MOTE_FS = `
precision mediump float;
varying float vA;
uniform vec3 uTone2;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float m = 1.0 - smoothstep(0.0, 0.5, length(d));
  gl_FragColor = vec4(uTone2, m * m * vA);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
  return s;
}

function link(gl, vsSrc, fsSrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { gl.deleteProgram(p); return null; }
  return p;
}

/* "#e2b24a" -> [0.886, 0.698, 0.290] */
function hexRgb(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length < 6) return [0.55, 0.42, 0.9];
  const n = parseInt(h.slice(0, 6), 16);
  if (isNaN(n)) return [0.55, 0.42, 0.9];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createChakraEngine(canvas) {
  if (!canvas) return null;
  let gl;
  try {
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false };
    gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
  } catch (e) { return null; }
  if (!gl) return null;

  const fieldProg = link(gl, FIELD_VS, FIELD_FS);
  const moteProg = link(gl, MOTE_VS, MOTE_FS);
  if (!fieldProg || !moteProg) return null;

  /* fullscreen triangle pair */
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const MOTES = 360;
  const seeds = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) {
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = 0.018 + Math.random() * 0.06;
    seeds[i * 3 + 2] = 2.2 + Math.random() * 6.0;
  }
  const moteBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moteBuf);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

  const fl = {
    aPos: gl.getAttribLocation(fieldProg, "aPos"),
    uRes: gl.getUniformLocation(fieldProg, "uRes"),
    uTime: gl.getUniformLocation(fieldProg, "uTime"),
    uTone: gl.getUniformLocation(fieldProg, "uTone"),
    uTone2: gl.getUniformLocation(fieldProg, "uTone2"),
    uHeat: gl.getUniformLocation(fieldProg, "uHeat"),
    uFade: gl.getUniformLocation(fieldProg, "uFade"),
    uRipples: gl.getUniformLocation(fieldProg, "uRipples[0]"),
  };
  const ml = {
    aSeed: gl.getAttribLocation(moteProg, "aSeed"),
    uTime: gl.getUniformLocation(moteProg, "uTime"),
    uDpr: gl.getUniformLocation(moteProg, "uDpr"),
    uHeat: gl.getUniformLocation(moteProg, "uHeat"),
    uTone2: gl.getUniformLocation(moteProg, "uTone2"),
  };

  const ripples = new Float32Array(MAX_RIPPLES * 4);
  let ripHead = 0;
  let tone = [0.32, 0.45, 0.85];
  let tone2 = [0.85, 0.66, 0.28];
  let toneT = tone.slice(), tone2T = tone2.slice();
  let heat = 0, heatT = 0;
  let fade = 0;
  let dpr = 1;
  let start = 0;
  let raf = 0;
  let dead = false;
  let lost = false;
  /* adaptive resolution: a machine with no GPU (software GL, an old laptop, a
     cheap phone) should get a quieter version of this rather than eight frames a
     second. Measured over whole seconds so one stutter never triggers it. */
  let quality = 1;
  let winStart = 0, winFrames = 0;

  /* The field costs ~35 noise evaluations a pixel. Rendering that at a phone's
     native density is throwing frames away for detail nobody can see — it is a
     soft, flowing thing. So cap the backbuffer to a pixel budget and let CSS
     stretch it back to full size. Motes scale with the same number, so they
     stay the right size on screen either way. */
  const PIXEL_BUDGET = 1280 * 720;
  function resize() {
    const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight);
    const budget = PIXEL_BUDGET * quality;
    let s = Math.min(window.devicePixelRatio || 1, 2) * 0.72 * Math.sqrt(quality);
    if (cw * ch * s * s > budget) s = Math.sqrt(budget / (cw * ch));
    dpr = Math.max(0.34, s);
    const w = Math.max(1, Math.round(cw * dpr));
    const h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (lost) return;
    if (!start) { start = now; winStart = now; }
    const t = (now - start) / 1000;

    winFrames++;
    if (now - winStart >= 1000) {
      const fps = (winFrames * 1000) / (now - winStart);
      if (fps < 34 && quality > 0.26) quality = Math.max(0.26, quality * 0.62);
      else if (fps > 56 && quality < 1) quality = Math.min(1, quality * 1.25);
      winStart = now; winFrames = 0;
    }

    /* ease every driven value so nothing ever snaps */
    for (let i = 0; i < 3; i++) {
      tone[i] += (toneT[i] - tone[i]) * 0.045;
      tone2[i] += (tone2T[i] - tone2[i]) * 0.045;
    }
    heat += (heatT - heat) * 0.05;
    fade += (1 - fade) * 0.03;

    resize();
    gl.disable(gl.DEPTH_TEST);

    gl.useProgram(fieldProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(fl.aPos);
    gl.vertexAttribPointer(fl.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(fl.uRes, canvas.width, canvas.height);
    gl.uniform1f(fl.uTime, t);
    gl.uniform3fv(fl.uTone, tone);
    gl.uniform3fv(fl.uTone2, tone2);
    gl.uniform1f(fl.uHeat, heat);
    gl.uniform1f(fl.uFade, fade);
    gl.uniform4fv(fl.uRipples, ripples);
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(moteProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, moteBuf);
    gl.enableVertexAttribArray(ml.aSeed);
    gl.vertexAttribPointer(ml.aSeed, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(ml.uTime, t);
    gl.uniform1f(ml.uDpr, dpr);
    gl.uniform1f(ml.uHeat, heat);
    gl.uniform3fv(ml.uTone2, tone2);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, MOTES);

    engine.now = t;
  }

  function onLost(e) { e.preventDefault(); lost = true; }
  function onRestored() { lost = false; }
  canvas.addEventListener("webglcontextlost", onLost, false);
  canvas.addEventListener("webglcontextrestored", onRestored, false);

  const engine = {
    now: 0,
    /* the two colours everything is drawn in */
    tone(a, b) {
      if (a) toneT = hexRgb(a);
      if (b) tone2T = hexRgb(b);
    },
    /* 0 idle, 1 mid-fight */
    heat(v) { heatT = Math.max(0, Math.min(1, v || 0)); },
    /* x/y in 0..1 screen space (top-left origin) */
    ripple(x, y, strength) {
      const i = ripHead % MAX_RIPPLES;
      ripHead++;
      ripples[i * 4] = Math.max(0, Math.min(1, x));
      ripples[i * 4 + 1] = 1 - Math.max(0, Math.min(1, y));
      ripples[i * 4 + 2] = engine.now;
      ripples[i * 4 + 3] = strength == null ? 1 : strength;
    },
    /* one big one from the middle */
    burst(strength) { engine.ripple(0.5, 0.5, strength == null ? 1.6 : strength); },
    resize,
    destroy() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      try {
        gl.deleteProgram(fieldProg); gl.deleteProgram(moteProg);
        gl.deleteBuffer(quad); gl.deleteBuffer(moteBuf);
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
      } catch (e) { /* tearing down a dead context is not worth throwing over */ }
    },
  };

  resize();
  raf = requestAnimationFrame(frame);
  return engine;
}
