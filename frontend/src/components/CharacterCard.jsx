import { useState } from "react";
import { MessageCircle, Link as LinkIcon, Pencil, X } from "lucide-react";

const FIELDS = [
  ["appearance", "appearance"],
  ["behaviour", "behaviour"],
  ["speech_pattern", "speech"],
  ["background", "background"],
];

function Sparkle({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z" fill="currentColor" />
    </svg>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", color: "var(--color-rim-accent-2)" }}>
      <span style={{ flex: 1, height: 1, opacity: 0.55, background: "linear-gradient(to right, transparent, currentColor)" }} />
      <Sparkle />
      <span style={{ flex: 1, height: 1, opacity: 0.55, background: "linear-gradient(to left, transparent, currentColor)" }} />
    </div>
  );
}

const badge = (bg, fg) => ({
  fontSize: 10, padding: "1px 6px", borderRadius: "var(--border-radius-md)",
  background: bg, color: fg, border: "0.5px solid currentColor",
});

const secondaryBtn = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "8px 0", fontSize: 12, cursor: "pointer",
  borderRadius: "var(--border-radius-md)",
  color: "var(--color-text-secondary)",
  background: "var(--color-background-secondary)",
  border: "0.5px solid var(--color-border-tertiary)",
};

export default function CharacterCard({ char, isActive, isUser, onChat, onLinks, onEdit, onDelete }) {
  const [delHover, setDelHover] = useState(false);
  const meta = typeof char.metadata === "string" ? JSON.parse(char.metadata) : (char.metadata ?? {});
  const accent = "var(--color-send-button)";

  // Two per row: stays tidy at any card width and never wraps with a stray separator.
  const present = FIELDS.filter(([key]) => char[key]).map(([, label]) => label);
  const rows = [];
  for (let i = 0; i < present.length; i += 2) rows.push(present.slice(i, i + 2));

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      padding: "18px 14px 14px",
      background: "var(--color-background-primary)",
      borderRadius: "var(--border-radius-lg)",
      border: `0.5px solid ${isActive ? "var(--color-text-info)" : isUser ? "var(--color-text-success)" : "var(--color-border-tertiary)"}`,
    }}>
      <button
        onClick={onDelete}
        onMouseEnter={() => setDelHover(true)}
        onMouseLeave={() => setDelHover(false)}
        title="Delete character"
        style={{
          position: "absolute", top: 10, right: 10, display: "flex", padding: 4,
          background: "transparent", border: "none", cursor: "pointer", borderRadius: "50%",
          color: delHover ? "var(--color-text-danger)" : "var(--color-text-tertiary)",
          transition: "color 0.15s",
        }}
      ><X size={15} /></button>

      <div style={{
        width: 72, height: 72, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--color-background-secondary)",
        border: "1.5px solid var(--color-border-primary)",
      }}>
        {meta.avatar
          ? <img src={meta.avatar} alt={char.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 26, fontWeight: 600, color: "var(--color-text-tertiary)" }}>{char.name?.charAt(0)?.toUpperCase() ?? "?"}</span>}
      </div>

      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, textAlign: "center" }}>{char.name}</p>

      {(isActive || isUser) && (
        <div style={{ display: "flex", gap: 4 }}>
          {isActive && <span style={badge("var(--color-background-info)", "var(--color-text-info)")}>model</span>}
          {isUser   && <span style={badge("var(--color-background-success)", "var(--color-text-success)")}>user</span>}
        </div>
      )}

      <Divider />

      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          {rows.map((row, r) => (
            <div key={r} style={{ display: "flex", justifyContent: "center" }}>
              {row.map((label, i) => (
                <span key={label} style={{
                  fontSize: 11, color: "var(--color-text-tertiary)", padding: "0 8px",
                  borderLeft: i > 0 ? "1px solid var(--color-border-secondary)" : "none",
                }}>{label} ✓</span>
              ))}
            </div>
          ))}
        </div>
      )}

      {char.description && (
        <p style={{
          margin: 0, fontSize: 12, lineHeight: 1.45, textAlign: "center", color: "var(--color-text-secondary)",
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>{char.description}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: "auto", paddingTop: 4 }}>
        <button onClick={onChat} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "9px 0", fontSize: 13, fontWeight: 500, cursor: "pointer",
          color: "var(--color-text-primary)", borderRadius: "var(--border-radius-md)",
          border: `1px solid ${accent}`,
          background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 26%, transparent), color-mix(in srgb, ${accent} 10%, transparent))`,
          boxShadow: `0 0 16px color-mix(in srgb, ${accent} 28%, transparent)`,
        }}>
          <MessageCircle size={15} /> Chat
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onLinks} style={secondaryBtn}><LinkIcon size={13} /> Links</button>
          <button onClick={onEdit}  style={secondaryBtn}><Pencil size={13} /> Edit</button>
        </div>
      </div>
    </div>
  );
}