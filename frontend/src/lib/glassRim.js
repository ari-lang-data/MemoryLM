// One-time hardware probe deciding how the chat-bubble rim is rendered:
// a real Fresnel/Snell ring (WebGL) on capable GPUs, a baked SVG-filter
// approximation on CPU/iGPU boxes. Cached so the probe runs once per session.

let cachedTier = null;

function probeWebGLTier() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return "svg";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
    const isSoftware = /swiftshader|llvmpipe|software|basic render/i.test(renderer || "");
    const lowCores  = (navigator.hardwareConcurrency ?? 8) <= 4;
    const lowMemory = (navigator.deviceMemory ?? 8) <= 4;
    return (isSoftware || (lowCores && lowMemory)) ? "svg" : "webgl";
  } catch {
    return "svg";
  }
}

export function getRimMode() {
  return localStorage.getItem("memlm:rimMode") ?? "auto";
}

export function getRimTier() {
  if (cachedTier) return cachedTier;
  const mode = getRimMode();
  cachedTier = (mode === "webgl" || mode === "svg") ? mode : probeWebGLTier();
  return cachedTier;
}

export function setRimMode(mode) {
  cachedTier = null;
  localStorage.setItem("memlm:rimMode", mode); // "auto" | "webgl" | "svg"
  window.dispatchEvent(new Event("memlm:rimModeChanged"));
}