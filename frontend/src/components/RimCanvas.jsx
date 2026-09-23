import { useEffect, useRef } from "react";
import { readAccentColors } from "../lib/themeColors";

const VERT = `attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Draws only the bubble's rim as a rounded-rect ring: derives a surface
// normal from the ring's own SDF (torus profile across its thickness),
// computes real Fresnel-Schlick reflectance from that normal, and refracts
// a synthetic two-tone "studio" environment through it via Snell's law.
const FRAG = `
precision highp float;
uniform vec2 uResolution; uniform float uRadius; uniform float uRimWidth; uniform float uIOR;
uniform vec3 uAccentPrimary; uniform vec3 uAccentSecondary; uniform vec3 uAccentShadow;

float sdRoundRect(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = gl_FragCoord.xy - uResolution * 0.5;
  vec2 halfSize = uResolution * 0.5;
  float d = sdRoundRect(p, halfSize, uRadius);

  float band = smoothstep(uRimWidth, 0.0, abs(d));
  if (band < 0.01) discard;

  float e = 0.75;
  vec2 grad = vec2(
    sdRoundRect(p + vec2(e,0.0), halfSize, uRadius) - sdRoundRect(p - vec2(e,0.0), halfSize, uRadius),
    sdRoundRect(p + vec2(0.0,e), halfSize, uRadius) - sdRoundRect(p - vec2(0.0,e), halfSize, uRadius)
  );
  vec2 n2d = normalize(grad);
  float t = clamp(1.0 - abs(d) / uRimWidth, 0.0, 1.0);
  float nz = sqrt(max(0.0, 1.0 - t * t));
  vec3 N = normalize(vec3(n2d * sqrt(1.0 - nz * nz), nz));

  vec3 V = vec3(0.0, 0.0, 1.0);
  float cosTheta = clamp(dot(N, V), 0.0, 1.0);

  float R0 = pow((1.0 - uIOR) / (1.0 + uIOR), 2.0);
  float fresnel = R0 + (1.0 - R0) * pow(1.0 - cosTheta, 5.0);

  vec3 refr = refract(-V, N, 1.0 / uIOR);
  float envY = clamp(refr.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 envDark  = uAccentShadow;
  vec3 envLight = mix(uAccentPrimary, vec3(1.0), 0.25);
  vec3 envColor = mix(envDark, envLight, envY);

  vec3 reflectDir = reflect(-V, N);
  vec3 reflDark  = mix(uAccentShadow, uAccentSecondary, 0.4);
  vec3 reflLight = mix(uAccentPrimary, vec3(1.0), 0.5);
  vec3 reflColor = mix(reflDark, reflLight, clamp(reflectDir.y * 0.5 + 0.5, 0.0, 1.0));

  vec3 color = mix(envColor, reflColor, fresnel);
  float alpha = band * mix(0.35, 0.9, fresnel);
  gl_FragColor = vec4(color, alpha);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
  return sh;
}

export default function RimCanvas({ radius = 14, rimWidth = 3, ior = 1.5 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true });
    if (!gl) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uResolution");
    const uRad = gl.getUniformLocation(prog, "uRadius");
    const uRim = gl.getUniformLocation(prog, "uRimWidth");
    const uIOR = gl.getUniformLocation(prog, "uIOR");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uAccentPrimary   = gl.getUniformLocation(prog, "uAccentPrimary");
    const uAccentSecondary = gl.getUniformLocation(prog, "uAccentSecondary");
    const uAccentShadow    = gl.getUniformLocation(prog, "uAccentShadow");

function draw() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = parent.clientWidth, h = parent.clientHeight;
  canvas.width = Math.max(1, w * dpr);
  canvas.height = Math.max(1, h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uRad, radius * dpr);
  gl.uniform1f(uRim, rimWidth * dpr);
  gl.uniform1f(uIOR, ior);

  const { accentPrimary, accentSecondary, accentShadow } = readAccentColors();
  gl.uniform3f(uAccentPrimary, ...accentPrimary);
  gl.uniform3f(uAccentSecondary, ...accentSecondary);
  gl.uniform3f(uAccentShadow, ...accentShadow);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

draw();
const ro = new ResizeObserver(draw);
ro.observe(parent);

const themeObserver = new MutationObserver(draw);
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

return () => { ro.disconnect(); themeObserver.disconnect(); };
  }, [radius, rimWidth, ior]);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit" }} />;
}