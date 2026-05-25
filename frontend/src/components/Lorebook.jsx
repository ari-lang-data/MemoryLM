import{inputStyle, STORAGE_KEYS} from "../lib/constants";
import {saveStorage} from "../lib/storage";
import {Card} from "./ui/shared";
export default function Lorebook({lorebook,lorebookDraft,editingLore, setEditingLore, TYPE_COLORS,LORE_TYPES, setLorebookDraft, addLorebookEntry, deleteLorebookEntry}){
    return(
        <div style={{ flex: 1, display: "flex", overflow: "hidden", width: "100%", maxWidth: 800 }}>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 10 }}>
              {lorebook.length === 0
                ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: 32 }}>No lorebook entries yet. Add characters, locations, factions, world rules…</div>
                : lorebook.slice().reverse().map(e => (
                  <Card key={e.id}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: TYPE_COLORS[e.type] + "22", color: TYPE_COLORS[e.type], border: `0.5px solid ${TYPE_COLORS[e.type]}66`, fontWeight: 500 }}>{e.type}</span>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{e.title}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{e.content.slice(0, 160)}{e.content.length > 160 ? "…" : ""}</p>
                        {e.tags && <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>Tags: {e.tags}</p>}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => { setEditingLore(e.id); setLorebookDraft({ title: e.title, tags: e.tags ?? "", content: e.content, type: e.type ?? "character" }); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14 }}>✎</button>
                        <button
                          onClick={() => deleteLorebookEntry(e.id)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 17 }}
                        >×</button>
                      </div>
                    </div>
                  </Card>
                ))
              }
            </div>
            <div style={{ width: 280, flexShrink: 0, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{editingLore ? "Edit entry" : "New entry"}</p>
              <input value={lorebookDraft.title} onChange={e => setLorebookDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              <select value={lorebookDraft.type} onChange={e => setLorebookDraft(d => ({ ...d, type: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}>
                {LORE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={lorebookDraft.tags} onChange={e => setLorebookDraft(d => ({ ...d, tags: e.target.value }))} placeholder="Tags (comma-separated)" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              <textarea value={lorebookDraft.content} onChange={e => setLorebookDraft(d => ({ ...d, content: e.target.value }))} placeholder="Description, traits, history…" style={{ ...inputStyle, minHeight: 130, resize: "vertical", lineHeight: 1.5, width: "100%", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { if (lorebookDraft.title && lorebookDraft.content) addLorebookEntry(lorebookDraft); }} disabled={!lorebookDraft.title || !lorebookDraft.content} style={{ ...inputStyle, flex: 1, cursor: "pointer", textAlign: "center", opacity: (!lorebookDraft.title || !lorebookDraft.content) ? 0.4 : 1 }}>{editingLore ? "Update" : "Add entry"}</button>
                {editingLore && <button onClick={() => { setEditingLore(null); setLorebookDraft({ title: "", tags: "", content: "", type: "character" }); }} style={{ ...inputStyle, cursor: "pointer" }}>Cancel</button>}
              </div>
            </div>
          </div>
    );
}