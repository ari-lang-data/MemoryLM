import{Card} from "./ui/shared";
import{inputStyle} from "../lib/constants";
import { Pin, PinOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { frostedGlassValues } from "../lib/fermiDirac";

const { bgAlpha, blurPx, saturate } = frostedGlassValues();

export default function Memory({memories, memoryLog, config, addManualMemory, updateActiveChat, deleteMemory, toggleMemoryPin, activeWorld, worldTime}){
    return(<div style={{flex: 1, overflowY: "auto", width: "100%"}}>
          <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 10, width: "100%", margin: "0 auto", maxWidth: 800 }}>

            {/* World setting card — only when the active chat has a world */}
            {activeWorld && (
              <div style={{
                background:           `rgba(var(--glass-rgb), ${bgAlpha})`,
                backdropFilter:       `blur(${blurPx}px) saturate(${saturate})`,
                WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturate})`,
                border:               "0.5px solid var(--color-border-tertiary)",
                borderRadius:         "var(--border-radius-lg)",
                padding:              "14px 18px",
                display:              "flex",
                flexDirection:        "column",
                gap:                  6,
              }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{activeWorld.name}</p>
                  {worldTime && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{worldTime}</span>}
                </div>
                {activeWorld.llm_context && (
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
                    <ReactMarkdown
                      components={{
                        p({ children })  { return <p style={{ margin: "0 0 6px" }}>{children}</p>; },
                        ul({ children })  { return <ul style={{ margin: "0 0 6px", paddingLeft: 18 }}>{children}</ul>; },
                        li({ children })  { return <li style={{ marginBottom: 2 }}>{children}</li>; },
                        h1({ children }) { return <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>{children}</h1>; },
                        h2({ children }) { return <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>{children}</h2>; },
                        h3({ children }) { return <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>{children}</h3>; },
                      }}
                    >
                      {activeWorld.llm_context}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <textarea id="manualMem" placeholder="Add a manual memory entry…" style={{ ...inputStyle, flex: 1, minHeight: 58, resize: "vertical" }} />
              <button onClick={() => { const el = document.getElementById("manualMem"); if (el?.value.trim()) { addManualMemory(el.value.trim()); el.value = ""; } }} style={{ ...inputStyle, cursor: "pointer", alignSelf: "flex-end", whiteSpace: "nowrap" }}>Add memory</button>
            </div>
            
            {memoryLog.length > 0 && (
              <div style={{ ...inputStyle, fontSize: 11, fontFamily: "var(--font-mono)", minHeight: 65, maxHeight: 95, overflowY: "auto", lineHeight: 1.6 }}>
                {memoryLog.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
            {memories.length === 0
              ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: 32 }}>No memories yet. Created automatically every {config.chunkEvery} turns.</div>
              : memories.slice().reverse().map(m => (
                <Card key={m.id} style={{ borderLeft: m.pinned ? "2px solid var(--color-text-info)" : undefined }}>
                  <div style={{ display: "flex", gap: 8, }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, flex: 1 }}>{m.summary}</p>
                    <button onClick={() => deleteMemory(m.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 17, flexShrink: 0, alignSelf: "flex-start" }}>×</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                    <button
                      onClick={() => toggleMemoryPin(m.id, !m.pinned)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: m.pinned ? "var(--color-text-info)" : "var(--color-text-tertiary)", alignSelf: "flex-end" }}
                      title={m.pinned ? "Unpin" : "Pin — always inject"}
                    >{m.pinned? <PinOff size={16}/>:<Pin size={16}/>}</button>
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: m.source === "auto" ? "var(--color-background-info)" : "var(--color-background-success)", color: m.source === "auto" ? "var(--color-text-info)" : "var(--color-text-success)", border: "0.5px solid currentColor", opacity: 0.8 }}>{m.source}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </Card>
              ))
            }
          </div></div>
    );
}