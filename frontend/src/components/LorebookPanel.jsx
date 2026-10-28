import { useState } from "react";
import { inputStyle } from "../lib/constants";
import { X, Link, Pin, PinOff, Trash2 } from "lucide-react";

export default function LorebookPanel({
  open, onClose, bookId, lorebook, lorebookDraft, setLorebookDraft,
  editingLore, setEditingLore, addLorebookEntry, deleteLorebookEntry, toggleLorePin, onOpenEdges,
  LORE_TYPES, loreEdgePanel, setLoreEdgePanel, entities, graphAPI, confirm,
}) {
  const [error, setError] = useState("");
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => onClose()}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 70 }}
        />
      )}

      {/* Slide-in panel — entry form or edge manager */}
      <div
        style={{
          position: "fixed", top: 0, bottom: 0, right: 0, zIndex: 71,
          width: "min(360px, 92vw)",
          background: "var(--color-background-primary)",
          borderLeft: "0.5px solid var(--color-border-tertiary)",
          boxShadow: "-6px 0 24px rgba(0,0,0,0.4)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          overflowY: "auto", padding: 16,
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {!loreEdgePanel ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{editingLore ? "Edit entry" : "New entry"}</p>
              <button onClick={() => setopen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}><X size={16} /></button>
              {editingLore && (() => {
                const entry = lorebook.find(l => l.id === editingLore);
                if (!entry) return null;
                const iconBtn = { background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", display: "flex" };
                return (
                    <>
                    <button style={iconBtn} title="Manage links" onClick={() => onOpenEdges(entry)}><Link size={15} /></button>
                    <button style={iconBtn} title={entry.pinned ? "Unpin" : "Pin — always inject"} onClick={() => toggleLorePin(entry.id, !entry.pinned)}>{entry.pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>
                    <button style={iconBtn} title="Delete entry" onClick={async () => { if (await confirm("Delete this entry?")) { await deleteLorebookEntry(entry.id); setEditingLore(null); onClose(); } }}><Trash2 size={15} /></button>
                    </>
                );
                })()}
            </div>
            <input value={lorebookDraft.title} onChange={e => setLorebookDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            <select value={lorebookDraft.type} onChange={e => setLorebookDraft(d => ({ ...d, type: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}>
              {LORE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={lorebookDraft.tags} onChange={e => setLorebookDraft(d => ({ ...d, tags: e.target.value }))} placeholder="Tags (comma-separated)" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            <textarea value={lorebookDraft.content} onChange={e => setLorebookDraft(d => ({ ...d, content: e.target.value }))} placeholder="Description, traits, history…" style={{ ...inputStyle, minHeight: 130, resize: "vertical", lineHeight: 1.5, width: "100%", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={async () => {
                            if (!lorebookDraft.title || !lorebookDraft.content) return;
                            try { setError(""); await addLorebookEntry(lorebookDraft, bookId); onClose(); }
                            catch (e) { setError(e.message); }
                        }}
                disabled={!lorebookDraft.title || !lorebookDraft.content}
                style={{ ...inputStyle, flex: 1, cursor: "pointer", textAlign: "center", opacity: (!lorebookDraft.title || !lorebookDraft.content) ? 0.4 : 1 }}
              >{editingLore ? "Update" : "Add entry"}</button>
              {editingLore && <button onClick={() => { setEditingLore(null); setLorebookDraft({ title: "", tags: "", content: "", type: "character" }); setopen(false); }} style={{ ...inputStyle, cursor: "pointer" }}>Cancel</button>}
              {error && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-danger)" }}>{error}</p>}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setLoreEdgePanel(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16 }}>←</button>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, flex: 1 }}>{loreEdgePanel.entry.title} — links</p>
              <button onClick={() => setopen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}><X size={16} /></button>
            </div>

            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>Add link</p>
              <select id="loreEdgeRel" style={{ ...inputStyle, fontSize: 12 }}>
                {["relates to", "part of", "located in", "caused by", "involves", "precedes", "follows", "other"].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select id="loreEdgeTarget" style={{ ...inputStyle, fontSize: 12 }}>
                <option value="">Select target…</option>
                {lorebook.filter(l => l.id !== loreEdgePanel.entry.id).length > 0 && (
                  <optgroup label="Lorebook">
                    {lorebook.filter(l => l.id !== loreEdgePanel.entry.id).map(l => (
                      <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
                    ))}
                  </optgroup>
                )}
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
                const rel = document.getElementById("loreEdgeRel").value;
                const target = document.getElementById("loreEdgeTarget").value;
                if (!target) return;
                await graphAPI.createEdge({ source_id: loreEdgePanel.entry.id, target_id: target, relationship: rel, weight: 1.0 });
                const rawEdges = await graphAPI.getEdges(loreEdgePanel.entry.id, "both");
                const shaped = await Promise.all(
                  rawEdges.map(async edge => {
                    const otherId = edge.source_id === loreEdgePanel.entry.id ? edge.target_id : edge.source_id;
                    const entity = await graphAPI.getEntity(otherId).catch(() => null);
                    return { edge, entity };
                  })
                );
                setLoreEdgePanel(prev => ({ ...prev, edges: shaped }));
              }} style={{ ...inputStyle, cursor: "pointer" }}>Add link</button>
            </div>

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
          </>
        )}
        </div>
    </>
  );
}