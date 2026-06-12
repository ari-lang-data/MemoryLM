/**
 * Fermi-Dirac function for UI effect intensities.
 *
 * f(E, mu, T) = 1 / (1 + exp((E - mu) / T))
 *
 * At T → 0⁺  : step function — below mu gives 1, above gives 0
 * At T → ∞   : f → 0.5 everywhere (fully spread, no contrast)
 * At E = mu  : always returns 0.5 regardless of T
 *
 * For UI use, pick E as a fixed "fully open" energy level,
 * mu as the transition midpoint, and T as the spread.
 *
 * Example — modal backdrop at full open:
 *   fermiDirac(0, 1, 2)  →  ~0.62  (opacity)
 *   fermiDirac(0, 3, 2)  →  ~0.82
 *
 * Convenience wrappers below cover the two current use cases:
 *   - modalBackdrop   → { opacity, blur (px) }
 *   - frostedGlass    → { background string with rgba }
 */

export function fermiDirac(E, mu, T) {
  if (T <= 0) return E < mu ? 1 : E === mu ? 0.5 : 0;
  return 1 / (1 + Math.exp((E - mu) / T));
}

/**
 * Modal backdrop values.
 * Returns opacity (0–1) and blur radius (px) for the dim/mist layer.
 *
 * Tuned so the backdrop feels like light mist rather than heavy dim.
 *   E=0, mu=3, T=2  →  opacity ≈ 0.82,  blur scaled to ~5px
 */
export function modalBackdropValues() {
  const f       = fermiDirac(0, 3, 2);
  const opacity = f * 0.45;          // max ~0.37 — dark but not black
  const blur    = f * 6;             // max ~5px — misty, not frosted
  return { opacity, blur };
}

/**
 * Frosted glass background for side panels.
 * Returns a CSS background value string using rgba + a suggested
 * backdrop-filter blur.
 *
 * E=0, mu=2, T=1.5  →  f ≈ 0.88
 */
export function frostedGlassValues() {
  const f            = fermiDirac(0, 2, 1.5);
  const bgAlpha      = f * 0.72;     // ~0.63 — semi-transparent
  const blurPx       = f * 12;       // ~10.6px blur
  const saturate     = 1 + f * 0.4;  // ~1.35 — slight colour boost
  return { bgAlpha, blurPx, saturate };
}
