import { useState, useEffect } from "react";
import { modalBackdropValues } from "../lib/fermiDirac";
import { worldsAPI } from "../lib/api";

const { opacity: backdropOpacity, blur: backdropBlur } = modalBackdropValues();

export default function WorldSelectorModal({ activePresetId, activeCharId, onSelect, onSkip }) {
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const all = await worldsAPI.getAll(activePresetId).catch(() => []);
      // Prefer worlds linked to the active character, but show all as fallback
      if (activeCharId) {
        const filtered = [];
        for (const w of all) {
          const chars = await worldsAPI.getCharacters(w.id).catch(() => []);
          if (chars.includes(activeCharId)) filtered.push(w);
        }
        setWorlds(filtered.length ? filtered : all);
      } else {
        setWorlds(all);
      }
      setLoading(false);
    })();
  }, [activePresetId, activeCharId]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: `rgba(0,0,0,${backdropOpacity})`, backdropFilter: `blur(${backdropBlur}px)`, WebkitBackdropFilter: `blur(${backdropBlur}px)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", width: "min(420px, 92vw)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Choose a world</p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>
          Set this chat's world for time-aware narrative continuity, or skip.
        </p>

        {loading && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Loading…</p>}

        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
            {worlds.map(w => (
              <button key={w.id} onClick={() => onSelect(w.id)} style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", cursor: "pointer", textAlign: "left" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{w.name}</p>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{w.formatted_time}</span>
              </button>
            ))}
            {worlds.length === 0 && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 16 }}>No worlds yet — create one from the Characters tab.</p>}
          </div>
        )}

        <button onClick={onSkip} style={{
          padding: "10px 12px", borderRadius: "var(--border-radius-md)",
          border: "0.5px dashed var(--color-border-tertiary)", background: "transparent",
          color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer",
          textAlign: "left", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>—</span> No world for this chat
        </button>
      </div>
    </div>
  );
}