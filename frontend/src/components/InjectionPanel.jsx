import { useState, useRef, useEffect } from "react";

const TYPE_COLORS = {
  character: "#7F77DD", location: "#1D9E75", faction: "#D85A30",
  item: "#BA7517", event: "#D4537E", lore: "#378ADD",
  rule: "#639922", other: "#888780"
};

export default function InjectionPanel({ memData = [], loreData = [], visible, onMouseEnter, onMouseLeave }) {
  return (
    <div onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{
      position:   "fixed",
      top:        44,   // below header
      right:      0,
      bottom:     0,
      width:      300,
      background: "var(--color-background-primary)",
      borderLeft: "0.5px solid var(--color-border-tertiary)",
      display:    "flex",
      flexDirection: "column",
      zIndex:     90,
      transform:  visible ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.2s ease",
      boxShadow:  visible ? "-4px 0 24px rgba(0,0,0,0.3)" : "none",
      overflowY:  "auto",
    }}>
      <div style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Injected context</span>
      </div>

      {memData.length > 0 && (
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Memories</p>
          {memData.map((m, i) => (
            <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", border: "0.5px solid var(--color-border-tertiary)" }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, lineHeight: 1.55, color: "var(--color-text-primary)" }}>{m.summary?.slice(0, 400)}{m.summary?.length > 400 ? "…" : ""}</p>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{m.pinned ? "pinned" : `score ${m.score?.toFixed(3)}`}</span>
            </div>
          ))}
        </div>
      )}

      {loreData.length > 0 && (
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Lorebook</p>
          {loreData.map((l, i) => (
            <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px", border: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: "var(--border-radius-md)", background: (TYPE_COLORS[l.type] ?? TYPE_COLORS.other) + "22", color: TYPE_COLORS[l.type] ?? TYPE_COLORS.other, border: `0.5px solid ${(TYPE_COLORS[l.type] ?? TYPE_COLORS.other)}66`, fontWeight: 500 }}>{l.type}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{l.title}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{l.content?.slice(0, 120)}{l.content?.length > 120 ? "…" : ""}</p>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{l.pinned ? "pinned" : `score ${l.score?.toFixed(3)}`}</span>
            </div>
          ))}
        </div>
      )}

      {memData.length === 0 && loreData.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 24 }}>Nothing injected.</p>
      )}
    </div>
  );
}