export function loadStorage(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function saveStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.error("storage err", e); }
}