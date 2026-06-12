import { useEffect } from "react";
import { modalBackdropValues } from "../lib/fermiDirac";

const { opacity: backdropOpacity, blur: backdropBlur } = modalBackdropValues();

const SECTIONS = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["Ctrl", "1"],       description: "Chat" },
      { keys: ["Ctrl", "2"],       description: "Memory" },
      { keys: ["Ctrl", "3"],       description: "Lorebook" },
      { keys: ["Ctrl", "6"],       description: "Graph" },
      { keys: ["Ctrl", "7"],       description: "Characters" },
    ],
  },
  {
    title: "Chat",
    shortcuts: [
      { keys: ["Enter"],           description: "Send message" },
      { keys: ["Shift", "Enter"],  description: "New line" },
      { keys: ["Ctrl", "Shift", "F"], description: "Fast-forward" },
      { keys: ["Ctrl", "Shift", "Enter"],       description: "Regenerate" },
    ],
  },
  {
    title: "Search",
    shortcuts: [
      { keys: ["Ctrl", "K"],       description: "Global search" },
      { keys: ["Ctrl", "P"],       description: "Command palette" },
    ],
  },
  {
    title: "Graph",
    shortcuts: [
      { keys: ["R"],               description: "Reset view" },
      { keys: ["F"],               description: "Fit graph" },
      { keys: ["A"],               description: "Show all" },
      { keys: ["C"],               description: "Concepts only" },
      { keys: ["H"],               description: "Characters only" },
    ],
  },
  {
    title: "Characters",
    shortcuts: [
      { keys: ["N"],               description: "New character" },
      { keys: ["E"],               description: "Edit selected" },
      { keys: ["Del"],             description: "Delete selected" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", ","],       description: "Settings" },
      { keys: ["Esc"],             description: "Close modal" },
      { keys: ["F1"],              description: "Keyboard shortcuts" },
    ],
  },
];

function Key({ label }) {
  return (
    <kbd style={{
      display:       "inline-flex",
      alignItems:    "center",
      justifyContent: "center",
      padding:       "2px 7px",
      borderRadius:  "var(--border-radius-sm)",
      background:    "var(--color-background-secondary)",
      border:        "0.5px solid var(--color-border-primary)",
      borderBottom:  "1.5px solid var(--color-border-primary)",
      fontSize:      11,
      fontFamily:    "var(--font-mono)",
      color:         "var(--color-text-secondary)",
      minWidth:      22,
      whiteSpace:    "nowrap",
    }}>
      {label}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
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
          boxShadow:     "0 24px 64px rgba(0,0,0,0.6)",
          width:         "min(680px, 92vw)",
          maxHeight:     "80vh",
          overflowY:     "auto",
          padding:       "24px 28px",
          display:       "flex",
          flexDirection: "column",
          gap:           24,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Keyboard Shortcuts</p>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}
          >×</button>
        </div>

        {/* Sections — two column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 32px" }}>
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-tertiary)" }}>
                {section.title}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {/* Divider line */}
                <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", marginBottom: 8 }} />
                {section.shortcuts.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "5px 0" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{s.description}</span>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                      {s.keys.map((k, j) => (
                        <Key key={j} label={k} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}