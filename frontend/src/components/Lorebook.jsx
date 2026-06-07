import{inputStyle, STORAGE_KEYS} from "../lib/constants";
import {saveStorage} from "../lib/storage";
import {Card} from "./ui/shared";
import { Link, Pin, PinOff, X } from "lucide-react";
export default function Lorebook({lorebook,lorebookDraft,editingLore, setEditingLore, TYPE_COLORS,LORE_TYPES, setLorebookDraft, addLorebookEntry, deleteLorebookEntry, toggleLorePin,onOpenEdges, loreEdgePanel, setLoreEdgePanel, entities, graphAPI}){
    return(
        <div style={{ flex: 1, display: "flex", overflow: "hidden", width: "100%", maxWidth: 800 }}>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 10 }}>
              {lorebook.length === 0
                ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: 32 }}>No lorebook entries yet. Add characters, locations, factions, world rules…</div>
                : lorebook.slice().reverse().map(e => (
                  <Card key={e.id} style={{ borderLeft: e.pinned ? "2px solid var(--color-text-info)" : undefined }}>
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
                          onClick={() => onOpenEdges(e)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14 }}
                          title="Manage links"
                        ><Link size={14}/></button>
                        <button
                          onClick={() => toggleLorePin(e.id, !e.pinned)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: e.pinned ? "var(--color-text-info)" : "var(--color-text-tertiary)", fontSize: 14 }}
                          title={e.pinned ? "Unpin" : "Pin — always inject"}
                        >{e.pinned?<PinOff size={14}/>:<Pin size={14}/>}</button>
                        <button
                          onClick={() => deleteLorebookEntry(e.id)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 17 }}
                        ><X size={17}/></button>
                      </div>
                    </div>
                  </Card>
                ))
              }
            </div>
            {!loreEdgePanel?
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
            : loreEdgePanel && (
              <div style={{ width: 280, flexShrink: 0, overflowY: "auto", padding: 16, borderLeft: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => setLoreEdgePanel(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16 }}>←</button>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{loreEdgePanel.entry.title} — links</p>
                </div>

                {/* Add edge */}
                <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>Add link</p>
                  <select id="loreEdgeRel" style={{ ...inputStyle, fontSize: 12 }}>
                    {["relates to", "part of", "located in", "caused by", "involves", "precedes", "follows", "other"].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <select id="loreEdgeTarget" style={{ ...inputStyle, fontSize: 12 }}>
                    <option value="">Select target…</option>
                    {/* Lorebook entries */}
                    {lorebook.filter(l => l.id !== loreEdgePanel.entry.id).length > 0 && (
                      <optgroup label="Lorebook">
                        {lorebook.filter(l => l.id !== loreEdgePanel.entry.id).map(l => (
                          <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
                        ))}
                      </optgroup>
                    )}
                    {/* Characters and other entities */}
                    {entities.filter(e => !lorebook.find(l => l.id === e.id) && e.id !== loreEdgePanel.entry.id).length > 0 && (
                      <optgroup label="Characters / Entities">
                        {entities
                          .filter(e => !lorebook.find(l => l.id === e.id) && e.id !== loreEdgePanel.entry.id)
                          .map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)
                        }
                      </optgroup>
                    )}
                  </select>
                  <button onClick={async () => {
                    const rel    = document.getElementById("loreEdgeRel").value;
                    const target = document.getElementById("loreEdgeTarget").value;
                    if (!target) return;
                    await graphAPI.createEdge({
                      source_id:    loreEdgePanel.entry.id,
                      target_id:    target,
                      relationship: rel,
                      weight:       1.0,
                    });
                    const rawEdges = await graphAPI.getEdges(loreEdgePanel.entry.id, "both");
                    const shaped   = await Promise.all(
                      rawEdges.map(async edge => {
                        const otherId = edge.source_id === loreEdgePanel.entry.id ? edge.target_id : edge.source_id;
                        const entity  = await graphAPI.getEntity(otherId).catch(() => null);
                        return { edge, entity };
                      })
                    );
                    setLoreEdgePanel(prev => ({ ...prev, edges: shaped }));
                  }} style={{ ...inputStyle, cursor: "pointer" }}>Add link</button>
                </div>

                {/* Existing edges */}
                {loreEdgePanel.edges.length === 0
                  ? <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 16 }}>No links yet.</p>
                  : loreEdgePanel.edges.map(e => (
                    <div key={e.edge.id} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>{e.edge.relationship}</span>
                      <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{e.edge.source_id === loreEdgePanel.entry.id ? "→" : "←"}</span>
                      <span style={{ fontSize: 13, flex: 1 }}>{e.entity?.name ?? "Unknown"}</span>
                      <button onClick={async () => {
                        await graphAPI.deleteEdge(e.edge.id);
                        setLoreEdgePanel(prev => ({ ...prev, edges: prev.edges.filter(x => x.edge.id !== e.edge.id) }));
                      }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16 }}>×</button>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
    );
}