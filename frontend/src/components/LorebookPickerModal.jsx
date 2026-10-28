import { useState } from "react";
import LorebookPicker from "./LorebookPicker";
import { modalBackdropValues } from "../lib/fermiDirac";

const { opacity: backdropOpacity, blur: backdropBlur } = modalBackdropValues();

export default function LorebookPickerModal({ lorebooks, entryCounts, initialIds, suggestedIds, onConfirm, onCancel }) {
  const [ids, setIds] = useState(initialIds ?? []);
  const btn = { padding: "8px 14px", borderRadius: "var(--border-radius-md)", fontSize: 13, cursor: "pointer", border: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position:             "fixed",
        inset:                0,
        zIndex:               200,
        background:           `rgba(0, 0, 0, ${backdropOpacity})`,
        backdropFilter:       `blur(${backdropBlur}px)`,
        WebkitBackdropFilter: `blur(${backdropBlur}px)`,
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "center",
      }}
    >
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(440px, 100%)", maxHeight: "85dvh", display: "flex", flexDirection: "column", gap: 12, padding: 20, borderRadius: "var(--border-radius-lg)", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-primary)" }}>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Lorebooks for this chat</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-tertiary)" }}>Pick any number. Only these books are searched for lore.</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <LorebookPicker lorebooks={lorebooks} entryCounts={entryCounts} selectedIds={ids} onChange={setIds} suggestedIds={suggestedIds} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={btn}>Cancel</button>
          <button onClick={() => onConfirm([])} style={btn}>No lorebook</button>
          <button onClick={() => onConfirm(ids)} disabled={ids.length === 0} style={{ ...btn, borderColor: "var(--color-send-button)", opacity: ids.length ? 1 : 0.4 }}>Continue</button>
        </div>
      </div>
    </div>
    </div>
  );
}