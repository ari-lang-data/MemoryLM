import { useState, useCallback, useRef } from "react";
import { modalBackdropValues } from "../lib/fermiDirac";

const { opacity: backdropOpacity, blur: backdropBlur } = modalBackdropValues();

// ── Modal component ────────────────────────────────────────────────────────────
export function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Confirm", danger = true }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position:             "fixed",
        inset:                0,
        zIndex:               300,
        background:           `rgba(0,0,0,${backdropOpacity})`,
        backdropFilter:       `blur(${backdropBlur}px)`,
        WebkitBackdropFilter: `blur(${backdropBlur}px)`,
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:    "var(--color-background-primary)",
          border:        "0.5px solid var(--color-border-secondary)",
          borderRadius:  "var(--border-radius-lg)",
          boxShadow:     "0 16px 48px rgba(0,0,0,0.5)",
          padding:       "24px 28px",
          maxWidth:      380,
          width:         "90vw",
          display:       "flex",
          flexDirection: "column",
          gap:           20,
        }}
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--color-text-primary)" }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding:      "6px 16px",
              borderRadius: "var(--border-radius-md)",
              border:       "0.5px solid var(--color-border-secondary)",
              background:   "transparent",
              color:        "var(--color-text-secondary)",
              fontSize:     13,
              cursor:       "pointer",
            }}
          >
            Cancel
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            style={{
              padding:      "6px 16px",
              borderRadius: "var(--border-radius-md)",
              border:       `0.5px solid ${danger ? "var(--color-border-danger)" : "var(--color-border-primary)"}`,
              background:   danger ? "var(--color-background-danger)" : "var(--color-background-secondary)",
              color:        danger ? "var(--color-text-danger)" : "var(--color-text-primary)",
              fontSize:     13,
              cursor:       "pointer",
              fontWeight:   500,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
// Usage:
//   const { confirm, ConfirmModalRenderer } = useConfirm();
//   ...
//   if (await confirm("Delete this message?")) deleteMessage(id);
//   ...
//   return <>{ConfirmModalRenderer()}</>
export function useConfirm() {
  const [state, setState] = useState(null); // { message, confirmLabel, danger, resolve }

  const confirm = useCallback((message, { confirmLabel = "Confirm", danger = true } = {}) => {
    return new Promise(resolve => {
      setState({ message, confirmLabel, danger, resolve });
    });
  }, []);

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  function ConfirmModalRenderer() {
    if (!state) return null;
    return (
      <ConfirmModal
        message={state.message}
        confirmLabel={state.confirmLabel}
        danger={state.danger}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  return { confirm, ConfirmModalRenderer };
}