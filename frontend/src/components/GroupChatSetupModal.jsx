import { useState } from "react";
import { modalBackdropValues } from "../lib/fermiDirac";

const { opacity: backdropOpacity, blur: backdropBlur } = modalBackdropValues();

export default function GroupChatSetupModal({ characters, activeCharId, userCharId, onStart, onCancel }) {
  const [selected, setSelected] = useState(
    characters.map(c => c.id) // all selected by default
  );

  function toggle(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleStart() {
    if (selected.length < 2) return;
    onStart(selected);
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
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-lg)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          width: "min(480px, 92vw)",
          padding: "24px 28px",
          display: "flex", flexDirection: "column", gap: 20,
        }}
      >
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Start Group Chat</p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          Select the characters participating in this conversation. The model will route responses between them automatically.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {characters.map(char => {
            const meta = typeof char.metadata === "string" ? JSON.parse(char.metadata) : (char.metadata ?? {});
            const isSelected = selected.includes(char.id);
            const isActive   = char.id === activeCharId;
            const isUser     = char.id === userCharId;
            return (
              <div
                key={char.id}
                onClick={() => toggle(char.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px",
                  borderRadius: "var(--border-radius-md)",
                  border: `0.5px solid ${isSelected ? "var(--color-border-primary)" : "var(--color-border-tertiary)"}`,
                  background: isSelected ? "var(--color-background-secondary)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {/* Avatar */}
                <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: "var(--color-background-tertiary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {meta.avatar
                    ? <img src={meta.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 13, color: "var(--color-text-tertiary)", fontWeight: 600 }}>{char.name?.charAt(0)?.toUpperCase()}</span>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{char.name}</p>
                  <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                    {isActive && <span style={{ fontSize: 10, color: "var(--color-text-info)" }}>model</span>}
                    {isUser   && <span style={{ fontSize: 10, color: "var(--color-text-success)" }}>user</span>}
                  </div>
                </div>

                <div style={{ width: 16, height: 16, borderRadius: 4, border: `0.5px solid ${isSelected ? "var(--color-border-primary)" : "var(--color-border-tertiary)"}`, background: isSelected ? "var(--color-text-info)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isSelected && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
          {selected.length} character{selected.length !== 1 ? "s" : ""} selected — minimum 2 to start.
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "6px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={selected.length < 2}
            style={{ padding: "6px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, cursor: selected.length < 2 ? "not-allowed" : "pointer", opacity: selected.length < 2 ? 0.4 : 1, fontWeight: 500 }}
          >
            Start Group Chat
          </button>
        </div>
      </div>
    </div>
  );
}