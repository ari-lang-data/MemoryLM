import { useEffect, useState } from "react";
import { ChevronDown, Database } from "lucide-react";
import { getConnectedGraph } from "../lib/connectedGraph";
import ReactMarkdown from "react-markdown";
import { frostedGlassValues } from "../lib/fermiDirac";

function parseMeta(c) {
  return typeof c?.metadata === "string" ? JSON.parse(c.metadata) : (c?.metadata ?? {});
}

export default function CharacterProfileCard({
  open, onClose, activeChar, groupChars, memories, characters, entities, graphAPI,
}) {
  const [graphState, setGraphState] = useState({ characterIds: new Set(), loreIds: new Set() });
  const [charsExpanded, setCharsExpanded] = useState(false);
  const isGroup = groupChars && groupChars.length > 1;

  useEffect(() => {
    if (!open || !activeChar) return;
    let cancelled = false;
    getConnectedGraph(activeChar.id, { characters, entities, graphAPI }).then(result => {
      if (!cancelled) setGraphState(result);
    });
    return () => { cancelled = true; };
  }, [open, activeChar?.id, characters, entities, graphAPI]);

  useEffect(() => { setCharsExpanded(false); }, [activeChar?.id]);

  const connectedChars = characters.filter(c => graphState.characterIds.has(c.id));

  const { bgAlpha, blurPx, saturate } = frostedGlassValues();

  return (
    <div
      style={{
        position: "absolute", top: "120%", right: 16, zIndex: 90,
        width: 320, transformOrigin: "top",
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0)" : "translateY(-8px)",
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.18s ease-out, transform 0.2s ease-out",
        background:           `rgba(var(--glass-rgb), ${bgAlpha})`,
        backdropFilter:       `blur(${blurPx}px) saturate(${saturate})`,
        WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturate})`,
        border: "0.5px solid var(--color-border-primary)",
        borderRadius: "var(--border-radius-lg)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        padding: 18,
      }}
    >
      {open && (
        <>
          {isGroup ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {groupChars.map(c => {
                const meta = parseMeta(c);
                return meta.avatar
                  ? <img key={c.id} src={meta.avatar} title={c.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                  : <div key={c.id} title={c.name} style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "var(--color-text-tertiary)" }}>{c.name?.charAt(0)?.toUpperCase()}</div>;
              })}
            </div>
          ) : activeChar ? (() => {
            const meta = parseMeta(activeChar);
            return (
              <>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {meta.avatar
                    ? <img src={meta.avatar} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "var(--color-text-tertiary)" }}>{activeChar.name?.charAt(0)?.toUpperCase()}</div>
                  }
                  <div>
                    <p style={{ margin: 0, fontSize: 17, fontFamily: "var(--font-serif)", fontWeight: 600 }}>{activeChar.name}</p>
                    {activeChar.description && (
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-tertiary)", fontStyle: "italic" }}>{activeChar.description}</p>
                    )}
                  </div>
                </div>
                {activeChar.background && (
                  <div style={{ fontSize: 12.5, fontFamily: "var(--font-serif)", lineHeight: 1.6, color: "var(--color-text-secondary)", marginTop: 12, borderTop: "1px solid var(--color-border-primary)", borderBottom: "1px solid var(--color-border-primary)", padding: "4px 5px 8px" }}>
                    <ReactMarkdown
                        components={{
                        p({ children })  { return <p style={{ margin: "0 0 6px" }}>{children}</p>; },
                        ul({ children })  { return <ul style={{ margin: "0 0 6px", paddingLeft: 18 }}>{children}</ul>; },
                        li({ children })  { return <li style={{ marginBottom: 2 }}>{children}</li>; },
                        }}
                        >
                    {activeChar.background}</ReactMarkdown></div>
                )}
              </>
            );
          })() : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "6px 10px", background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
              <Database size={13}/> {memories.length} memories · {graphState.loreIds.size} connected lore
            </div>

            <div style={{display: "flex", background: "var(--color-background-primary)", 
                flexDirection: "column", 
                border: "0.5px solid var(--border-color-tertiary)", 
                borderRadius: "var(--border-radius-md)"}}>
                <button
                onClick={() => setCharsExpanded(e => !e)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", fontSize: 12, color: "var(--color-text-secondary)", padding: "6px 10px", background: "transparent",  cursor: "pointer", border: "none", borderRadius: "var(--border-radius-md)" }}
                >
                <span>Connected characters ({graphState.characterIds.size})</span>
                <ChevronDown size={13} style={{ transform: charsExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>

                {charsExpanded && (
                    <div style={{ display: "flex", flexDirection: "row", gap: 6, padding: "4px 2px 0" }}>
                        {connectedChars.length === 0 ? (
                        <span style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", padding: "0 6px" }}>None yet.</span>
                        ) : connectedChars.map(c => {
                        const meta = parseMeta(c);
                        return (
                            <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", padding: "2px 6px 4px", justifyContent: "space-between", overflowX: "auto" }}>
                            {meta.avatar
                                ? <img src={meta.avatar} style={{ width: 33, height: 33, borderRadius: "50%", objectFit: "cover" }} />
                                : <div style={{ width: 33, height: 33, borderRadius: "50%", border: "1px solid var(--color-text-tertiary)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-text-tertiary)" }}>{c.name?.charAt(0)?.toUpperCase()}</div>
                            }
                            <span style={{ fontSize: 12.5 }}>{c.name}</span>
                            </div>
                        );
                        })}
                    </div>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}