import { useState, useEffect } from "react";
import { modalBackdropValues } from "../lib/fermiDirac";
import { worldsAPI } from "../lib/api";
import LorebookPicker from "./LorebookPicker";

const { opacity: backdropOpacity, blur: backdropBlur } = modalBackdropValues();

const label = { margin: "0 0 2px", fontSize: 13, fontWeight: 600 };
const hint  = { margin: "0 0 8px", fontSize: 12, color: "var(--color-text-secondary)" };

function WorldRow({ selected, onClick, name, sub, dashed }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 12px", borderRadius: "var(--border-radius-md)", textAlign: "left", cursor: "pointer",
      border: `0.5px ${dashed ? "dashed" : "solid"} ${selected ? "var(--color-border-primary)" : "var(--color-border-tertiary)"}`,
      background: selected ? "var(--color-background-secondary)" : "transparent",
    }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: dashed ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}>{name}</p>
      {sub && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{sub}</span>}
    </button>
  );
}

export default function NewChatModal({
  activePresetId, activeCharId, lorebooks, entryCounts, suggestedIds = [],
  showLorebooks, showWorld, onStart, onCancel,
}) {
  const [worlds, setWorlds]   = useState([]);
  const [loading, setLoading] = useState(!!showWorld);
  const [worldId, setWorldId] = useState(null);
  const [bookIds, setBookIds] = useState(suggestedIds);

  useEffect(() => {
    if (!showWorld) return;
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
  }, [showWorld, activePresetId, activeCharId]);

  const btn = { padding: "8px 16px", borderRadius: "var(--border-radius-md)", fontSize: 13, cursor: "pointer", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)" };

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 300, background: `rgba(0,0,0,${backdropOpacity})`, backdropFilter: `blur(${backdropBlur}px)`, WebkitBackdropFilter: `blur(${backdropBlur}px)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", width: "min(440px, 92vw)", maxHeight: "85dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 12px", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>New chat</p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
          {showLorebooks && (
            <div>
              <p style={label}>Lorebooks</p>
              <p style={hint}>Only these books are searched for lore. Books linked to the character are pre-selected.</p>
              <LorebookPicker lorebooks={lorebooks} entryCounts={entryCounts} selectedIds={bookIds} onChange={setBookIds} suggestedIds={suggestedIds} />
            </div>
          )}

          {showWorld && (
            <div>
              <p style={label}>World</p>
              <p style={hint}>Set this chat's world for time-aware narrative continuity, or skip.</p>
              {loading ? <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Loading…</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {worlds.map(w => (
                    <WorldRow key={w.id} selected={worldId === w.id} onClick={() => setWorldId(w.id)} name={w.name} sub={w.formatted_time} />
                  ))}
                  {worlds.length === 0 && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 12 }}>No worlds yet — create one from the Characters tab.</p>}
                  <WorldRow dashed selected={worldId === null} onClick={() => setWorldId(null)} name="— No world for this chat" />
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 24px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          <button onClick={onCancel} style={btn}>Cancel</button>
          <button
            onClick={() => onStart({ lorebookIds: showLorebooks ? bookIds : [], worldId: showWorld ? worldId : null })}
            style={{ ...btn, color: "var(--color-text-primary)", borderColor: "var(--color-send-button)", fontWeight: 500 }}
          >Start chat</button>
        </div>
      </div>
    </div>
  );
}