import { useState } from "react";
import { modalBackdropValues } from "../lib/fermiDirac";

const { opacity: backdropOpacity, blur: backdropBlur } = modalBackdropValues();

export default function GroupChatSetupModal({ characters, activeCharId, userCharId, onStart, onCancel }) {
  const [selected, setSelected] = useState([]); // none selected by default

  function toggle(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: `rgba(0,0,0,${backdropOpacity})`,
        backdropFilter: `blur(${backdropBlur}px)`,
        WebkitBackdropFilter: `blur(${backdropBlur}px)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:    "var(--color-background-primary)",
          border:        "0.5px solid var(--color-border-secondary)",
          borderRadius:  "var(--border-radius-lg)",
          boxShadow:     "0 24px 64px rgba(0,0,0,0.6)",
          width:         "min(480px, 92vw)",
          maxHeight:     "80vh",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
          <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>Start Group Chat</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            Select at least two characters. The director model will route responses between them.
          </p>
        </div>

        {/* Character list */}
        <div style={{ overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {characters.map(char => {
            const meta       = typeof char.metadata === "string" ? JSON.parse(char.metadata) : (char.metadata ?? {});
            const isSelected = selected.includes(char.id);
            const isActive   = char.id === activeCharId;
            const isUser     = char.id === userCharId;
            const bias       = char.bias ?? 0.5;

            return (
              <div
                key={char.id}
                onClick={() => toggle(char.id)}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        12,
                  padding:    "10px 12px",
                  borderRadius: "var(--border-radius-md)",
                  border:     `0.5px solid ${isSelected ? "var(--color-border-primary)" : "var(--color-border-tertiary)"}`,
                  background: isSelected ? "var(--color-background-secondary)" : "transparent",
                  cursor:     "pointer",
                  transition: "background 0.1s, border-color 0.1s",
                }}
              >
                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "var(--color-background-tertiary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {meta.avatar
                    ? <img src={meta.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={char.name} />
                    : <span style={{ fontSize: 14, color: "var(--color-text-tertiary)", fontWeight: 600 }}>{char.name?.charAt(0)?.toUpperCase()}</span>
                  }
                </div>

                {/* Name + badges */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{char.name}</p>
                    {isActive && <span style={{ fontSize: 10, color: "var(--color-text-info)",    flexShrink: 0 }}>model</span>}
                    {isUser   && <span style={{ fontSize: 10, color: "var(--color-text-success)", flexShrink: 0 }}>user</span>}
                  </div>
                  {/* Initiative hint */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: "var(--color-border-tertiary)", overflow: "hidden" }}>
                      <div style={{ width: `${bias * 100}%`, height: "100%", background: "var(--color-text-tertiary)", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", minWidth: 28, textAlign: "right" }}>
                      {bias.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Checkbox */}
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border:      `0.5px solid ${isSelected ? "var(--color-text-info)" : "var(--color-border-tertiary)"}`,
                  background:  isSelected ? "var(--color-text-info)" : "transparent",
                  display:     "flex", alignItems: "center", justifyContent: "center",
                  transition:  "background 0.1s, border-color 0.1s",
                }}>
                  {isSelected && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            {selected.length === 0
              ? "No characters selected"
              : `${selected.length} character${selected.length !== 1 ? "s" : ""} selected`}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCancel}
              style={{ padding: "6px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={() => selected.length >= 2 && onStart(selected)}
              disabled={selected.length < 2}
              style={{ padding: "6px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, cursor: selected.length < 2 ? "not-allowed" : "pointer", opacity: selected.length < 2 ? 0.4 : 1, fontWeight: 500 }}
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}