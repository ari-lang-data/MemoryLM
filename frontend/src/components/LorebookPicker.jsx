import { Check } from "lucide-react";
import { coverBackground } from "../lib/lorebookCover";

export default function LorebookPicker({ lorebooks, entryCounts, selectedIds, onChange, suggestedIds = [] }) {
  const toggle = id => onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lorebooks.map(b => {
        const on = selectedIds.includes(b.id);
        const n  = entryCounts[b.id] ?? 0;
        return (
          <button key={b.id} onClick={() => toggle(b.id)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", textAlign: "left", cursor: "pointer",
            borderRadius: "var(--border-radius-md)", color: "var(--color-text-primary)",
            background: on ? "var(--color-background-secondary)" : "transparent",
            border: `0.5px solid ${on ? "var(--color-border-primary)" : "var(--color-border-tertiary)"}`,
          }}>
            <span style={{ width: 26, height: 32, borderRadius: 3, flexShrink: 0, ...coverBackground(b.cover) }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                {n} {n === 1 ? "entry" : "entries"}{suggestedIds.includes(b.id) ? " · linked to this character" : ""}
              </span>
            </span>
            <span style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--color-border-primary)", background: on ? "var(--color-send-button)" : "transparent",
            }}>{on && <Check size={12} color="#fff" />}</span>
          </button>
        );
      })}
    </div>
  );
}