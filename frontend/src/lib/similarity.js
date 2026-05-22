export function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]**2; nb += b[i]**2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}