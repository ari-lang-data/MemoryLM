export function hexToRgb01(hex) {
  const clean = (hex || "").trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const n = parseInt(full || "808080", 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function readAccentColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    accentPrimary:   hexToRgb01(styles.getPropertyValue("--color-rim-accent-1").trim()),
    accentSecondary: hexToRgb01(styles.getPropertyValue("--color-rim-accent-2").trim()),
    accentShadow:    hexToRgb01(styles.getPropertyValue("--color-rim-accent-3").trim()),
  };
}