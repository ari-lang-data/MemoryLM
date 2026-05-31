import{Card} from "./ui/shared";
import{inputStyle} from "../lib/constants";
export default function Memory({memories, memoryLog, config, addManualMemory, updateActiveChat, deleteMemory}){
    return(<div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 800 }}>
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
                <Card key={m.id}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, flex: 1 }}>{m.summary}</p>
                    {/* FIX #8: delete memory via updateActiveChat, not setMemories */}
                    <button onClick={() => deleteMemory(m.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 17, flexShrink: 0, alignSelf: "flex-start" }}>×</button>
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: m.source === "auto" ? "var(--color-background-info)" : "var(--color-background-success)", color: m.source === "auto" ? "var(--color-text-info)" : "var(--color-text-success)", border: "0.5px solid currentColor", opacity: 0.8 }}>{m.source}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </Card>
              ))
            }
          </div>
    );
}