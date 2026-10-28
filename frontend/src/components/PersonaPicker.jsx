import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, UserRound } from "lucide-react";
import { frostedGlassValues } from "../lib/fermiDirac";

const { bgAlpha, blurPx, saturate } = frostedGlassValues();

function parseMeta(c) {
  try { return typeof c?.metadata === "string" ? JSON.parse(c.metadata) : (c?.metadata ?? {}); }
  catch { return {}; }
}

function MiniAvatar({ char, size = 24 }) {
  const meta = parseMeta(char);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--color-background-tertiary)", color: "var(--color-text-secondary)",
      fontSize: size * 0.45, fontWeight: 600,
    }}>
      {!char ? <UserRound size={size * 0.6} />
        : meta.avatar ? <img src={meta.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : char.name?.charAt(0)?.toUpperCase()}
    </div>
  );
}

export default function PersonaPicker({ characters, userCharId, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = characters.find(c => c.id === userCharId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKeyDown     = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(id) {
    setOpen(false);
    if (id !== (userCharId ?? null)) onSelect(id);
  }

  const options = [{ id: null, name: "No persona" }, ...characters];

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        title="Your persona"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          height: 36, display: "flex", alignItems: "center", gap: 8,
          padding: "0 12px 0 6px", borderRadius: 999,
          border: "0.5px solid var(--color-border-secondary)",
          background: "var(--color-background-secondary)",
          color: "var(--color-text-primary)", fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        }}
      >
        <MiniAvatar char={current} size={24} />
        <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current?.name ?? "No persona"}
        </span>
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute", bottom: "calc(100% + 8px)", right: 0, zIndex: 30,
            width: "min(260px, 78vw)", maxHeight: 280, overflowY: "auto", padding: 4,
             background:           `rgba(var(--glass-rgb), ${bgAlpha})`,
                backdropFilter:       `blur(${blurPx}px) saturate(${saturate})`,
                WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturate})`,
            border: "0.5px solid var(--color-border-primary)",
            borderRadius: "var(--border-radius-lg)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          }}
        >
          {options.map(o => {
            const selected = (o.id ?? null) === (userCharId ?? null);
            return (
              <button
                key={o.id ?? "none"}
                role="option"
                aria-selected={selected}
                onClick={() => choose(o.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", border: "none", textAlign: "left", cursor: "pointer",
                  borderRadius: "var(--border-radius-md)",
                  background: selected ? "var(--color-background-tertiary)" : "transparent",
                  color: o.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  fontSize: 13,
                }}
              >
                <MiniAvatar char={o.id ? o : null} size={26} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</span>
                {selected && <Check size={14} style={{ color: "var(--color-text-info)", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}