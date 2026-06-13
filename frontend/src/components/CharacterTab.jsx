import { useState, useRef } from "react";
import { graphAPI } from "../lib/api";

const RELATIONSHIP_TYPES = [
  "friend of", "parent of", "child of", "step-parent of", "step-child of", "teaches", "knows", "commands", "betrayed", "allies with", "rivals", "spouse of",
  "lives at", "born in", "works for", "seeks", "owns", "household",
  "caused", "witnessed", "related to", "member of", "other"
];

const TYPE_COLORS = {
  character: "#7F77DD", location: "#1D9E75", faction: "#D85A30",
  item: "#BA7517", event: "#D4537E", concept: "#378ADD",
  other: "#888780"
};

function Avatar({ src, name, size = 56, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: onClick ? "pointer" : "default" }}
    >
      {src
        ? <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={name} />
        : <span style={{ fontSize: size * 0.35, color: "var(--color-text-tertiary)", fontWeight: 600 }}>{name?.charAt(0)?.toUpperCase() ?? "?"}</span>
      }
    </div>
  );
}

async function resizeImage(dataUrl, maxSize = 128) {
  return new Promise(resolve => {
    const img    = new Image();
    img.onload   = () => {
      const scale  = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}

const EMPTY_DRAFT = {
  name: "", type: "character", description: "",
  appearance: "", behaviour: "", speech_pattern: "", background: "",
  narrative_alias: "", address_formal: "", address_informal: "", bias: 0.5,
  metadata: {},
};

export default function CharacterTab({
  activePresetId,
  characters,
  setCharacters,
  templateVars,
  setTemplateVars,
  activeCharId,
  setActiveCharId,
  userCharId,
  setUserCharId,
  entities,
  setEntities,
  inputStyle, charactersLoading, onStartGroupChat
}) {
  const [view,          setView]          = useState("list"); // "list" | "edit" | "edges"
  const [draft,         setDraft]         = useState(EMPTY_DRAFT);
  const [editingId,     setEditingId]     = useState(null);
  const [edgeTarget,    setEdgeTarget]    = useState("");
  const [edgeRel,       setEdgeRel]       = useState("Friend");
  const [edgeWeight,    setEdgeWeight]    = useState(1.0);
  const [edges,         setEdges]         = useState([]);
  const [edgesFor,      setEdgesFor]      = useState(null);
  const [saving,        setSaving]        = useState(false);
  const avatarInputRef  = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setView("edit");
  }

  function openEdit(char) {
    setDraft({
      name:             char.name,
      type:             char.type ?? "character",
      description:      char.description ?? "",
      appearance:       char.appearance ?? "",
      behaviour:        char.behaviour ?? "",
      speech_pattern:   char.speech_pattern ?? "",
      background:       char.background ?? "",
      narrative_alias:  char.narrative_alias ?? "",
      address_formal:   char.address_formal ?? "",
      address_informal: char.address_informal ?? "",
      bias:             char.bias ?? 0.5,
      metadata:         typeof char.metadata === "string" ? JSON.parse(char.metadata) : (char.metadata ?? {}),
    });
    setEditingId(char.id);
    setView("edit");
  }

  async function openEdges(char) {
    const rawEdges = await graphAPI.getEdges(char.id, "both");
    // getEdges returns flat edge objects, reshape to { edge, entity } 
    const shaped = await Promise.all(
        rawEdges.map(async edge => {
        const otherId = edge.source_id === char.id ? edge.target_id : edge.source_id;
        const entity  = await graphAPI.getEntity(otherId).catch(() => null);
        return { edge, entity };
        })
    );
    setEdges(shaped);
    setEdgesFor(char);
    setView("edges");
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const resized = await resizeImage(reader.result, 128);
      setDraft(d => ({ ...d, metadata: { ...d.metadata, avatar: resized } }));
    };
    reader.readAsDataURL(file);
  }

  async function saveCharacter() {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      const id = editingId || `char_${Date.now()}`;

      // Upsert entity
      await graphAPI.createEntity({
        id,
        name:        draft.name.trim(),
        type:        "character",
        description: draft.description,
        preset_id:   activePresetId,
        metadata:    draft.metadata,
      });

      // Upsert character card
      await graphAPI.upsertCharacter(id, {
        appearance:       draft.appearance,
        behaviour:        draft.behaviour,
        speech_pattern:   draft.speech_pattern,
        background:       draft.background,
        preset_id:        activePresetId,
        is_active_char:   false,
        is_user_char:     false,
        narrative_alias:  draft.narrative_alias  || null,
        address_formal:   draft.address_formal   || null,
        address_informal: draft.address_informal || null,
        bias:             draft.bias ?? 0.5,
      });

      // Refresh characters list
      const updated = await graphAPI.getCharacters(activePresetId);
      setCharacters(updated ?? []);
      setView("list");
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCharacter(id) {
    if (!confirm("Delete this character?")) return;
    await graphAPI.deleteEntity(id);
    setCharacters(prev => prev.filter(c => c.id !== id));
    if (activeCharId === id) setActiveCharId(null);
    if (userCharId   === id) setUserCharId(null);
  }

  async function activateCharacter(id, isUser = false) {
    if (!isUser && activeCharId === id) {
      // Deselect — clear active character
      await graphAPI.activateCharacter(id, false); // will set FALSE below
      // Set all to false for this preset
      await fetch(`/graph/characters/${id}/deactivate`, { method: "PATCH" }).catch(() => null);
      // Simpler: just update DB to false directly via upsert
      const char = characters.find(c => c.id === id);
      if (char) {
        await graphAPI.upsertCharacter(id, {
          appearance:     char.appearance     ?? "",
          behaviour:      char.behaviour      ?? "",
          speech_pattern: char.speech_pattern ?? "",
          background:     char.background     ?? "",
          preset_id:      activePresetId,
          is_active_char: false,
          is_user_char:   char.id === userCharId,
          narrative_alias:  char.narrative_alias  ?? null,
          address_formal:   char.address_formal   ?? null,
          address_informal: char.address_informal ?? null,
        });
      }
      const [updated, updatedVars] = await Promise.all([
        graphAPI.getCharacters(activePresetId),
        graphAPI.getTemplateVars(activePresetId),
      ]);
      setCharacters(updated ?? []);
      setTemplateVars(updatedVars ?? []);
      setActiveCharId(null);
      return;
    }
    await graphAPI.activateCharacter(id, isUser);

    // Auto-set template var
    await graphAPI.setTemplateVar({
        var_name:  isUser ? "usr" : "char",
        entity_id: id,
        preset_id: activePresetId,
    });

    const [updated, updatedVars] = await Promise.all([
        graphAPI.getCharacters(activePresetId),
        graphAPI.getTemplateVars(activePresetId),
    ]);
    setCharacters(updated ?? []);
    setTemplateVars(updatedVars ?? []);
    if (isUser) setUserCharId(id);
    else        setActiveCharId(id);
  }

  async function addEdge() {
    if (!edgeTarget || !edgesFor) return;
    await graphAPI.createEdge({
        source_id:    edgesFor.id,
        target_id:    edgeTarget,
        relationship: edgeRel,
        weight:       edgeWeight,
    });
    const rawEdges = await graphAPI.getEdges(edgesFor.id, "both");
    const shaped   = await Promise.all(
        rawEdges.map(async edge => {
        const otherId = edge.source_id === edgesFor.id ? edge.target_id : edge.source_id;
        const entity  = await graphAPI.getEntity(otherId).catch(() => null);
        return { edge, entity };
        })
    );
    setEdges(shaped);
    setEdgeTarget("");
  }

  async function deleteEdge(edgeId) {
    await graphAPI.deleteEdge(edgeId);
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  }

  async function setTemplateVar(varName, entityId) {
    await graphAPI.setTemplateVar({ var_name: varName, entity_id: entityId, preset_id: activePresetId });
    const updated = await graphAPI.getTemplateVars(activePresetId);
    setTemplateVars(updated ?? []);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", width: "100%", maxWidth: 800 }}>

      {/* ── CHARACTER LIST ── */}
      {view === "list" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Characters</p>
            <div style={{ display: "flex", gap: 6 }}>
              {onStartGroupChat && (
                <button onClick={onStartGroupChat} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "5px 10px" }}>⬡ Group chat</button>
              )}
              <button onClick={openNew} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "5px 10px" }}>+ New character</button>
            </div>
          </div>

          {/* Template vars */}
          <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Template variables</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", minWidth: 60 }}>{"{$char}"}</span>
              <select
                value={templateVars.find(v => v.var_name === "char")?.entity_id ?? ""}
                onChange={e => setTemplateVar("char", e.target.value || null)}
                style={{ ...inputStyle, flex: 1, fontSize: 12 }}
              >
                <option value="">None</option>
                {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", minWidth: 60 }}>{"{$usr}"}</span>
              <select
                value={templateVars.find(v => v.var_name === "usr")?.entity_id ?? ""}
                onChange={e => setTemplateVar("usr", e.target.value || null)}
                style={{ ...inputStyle, flex: 1, fontSize: 12 }}
              >
                <option value="">None (user is themselves)</option>
                {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {characters.length === 0 && charactersLoading === false
            ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: 32 }}>No characters yet. Add one to get started.</div>
            : charactersLoading === true ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: 32 }}>Loading...</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {characters.map(char => {
                    const meta     = typeof char.metadata === "string" ? JSON.parse(char.metadata) : (char.metadata ?? {});
                    const isActive = char.id === activeCharId;
                    const isUser   = char.id === userCharId;
                    return (
                    <div key={char.id} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: `0.5px solid ${isActive ? "var(--color-text-info)" : isUser ? "var(--color-text-success)" : "var(--color-border-tertiary)"}`, padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        
                        {/* Avatar */}
                        <Avatar src={meta.avatar} name={char.name} size={64} />

                        {/* Name + badges */}
                        <div style={{ textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500 }}>{char.name}</p>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                            {isActive && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-info)", color: "var(--color-text-info)", border: "0.5px solid currentColor" }}>model</span>}
                            {isUser   && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-success)", color: "var(--color-text-success)", border: "0.5px solid currentColor" }}>user</span>}
                        </div>
                        </div>

                        {/* Field indicators */}
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                        {char.appearance     && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>appearance ✓</span>}
                        {char.behaviour      && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>behaviour ✓</span>}
                        {char.speech_pattern && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>speech ✓</span>}
                        {char.background     && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>background ✓</span>}
                        </div>

                        {char.description && (
                        <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.4, textAlign: "center", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{char.description}</p>
                        )}

                        {/* Actions */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", marginTop: "auto" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => activateCharacter(char.id, false)} style={{ ...inputStyle, cursor: "pointer", fontSize: 11, padding: "3px 0", flex: 1, textAlign: "center", borderColor: isActive ? "var(--color-text-info)" : undefined, color: isActive ? "var(--color-text-info)" : "var(--color-text-primary)" }} title= "Activate model persona">
                            {isActive ? "Model ✓" : "Model"}
                            </button>
                            <button onClick={() => activateCharacter(char.id, true)} style={{ ...inputStyle, cursor: "pointer", fontSize: 11, padding: "3px 0", flex: 1, textAlign: "center", borderColor: isUser ? "var(--color-text-success)" : undefined, color: isUser ? "var(--color-text-success)" : "var(--color-text-primary)" }} title= "Choose as your persona">
                            {isUser ? "User ✓" : "User"}
                            </button>
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => openEdges(char)} style={{ ...inputStyle, cursor: "pointer", fontSize: 11, padding: "3px 0", flex: 1, textAlign: "center" }}>Links</button>
                            <button onClick={() => openEdit(char)}  style={{ ...inputStyle, cursor: "pointer", fontSize: 11, padding: "3px 0", flex: 1, textAlign: "center" }}>Edit</button>
                            <button onClick={() => deleteCharacter(char.id)} style={{ ...inputStyle, cursor: "pointer", fontSize: 11, padding: "3px 0", flex: 1, textAlign: "center", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>×</button>
                        </div>
                        </div>
                    </div>
                    );
                })}
            </div>
          }
        </div>
      )}

      {/* ── CHARACTER EDITOR ── */}
      {view === "edit" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <button onClick={() => setView("list")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16, padding: 0 }}>←</button>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{editingId ? "Edit character" : "New character"}</p>
          </div>

          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <input type="file" accept="image/*" style={{ display: "none" }} ref={avatarInputRef} onChange={handleAvatarUpload} />
            <Avatar src={draft.metadata?.avatar} name={draft.name} size={72} onClick={() => avatarInputRef.current?.click()} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>Click avatar to upload image</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>Resized to 128×128, stored locally</p>
            </div>
            {draft.metadata?.avatar && (
              <button onClick={() => setDraft(d => ({ ...d, metadata: { ...d.metadata, avatar: undefined } }))} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 13 }}>Remove</button>
            )}
          </div>

          {/* Basic fields */}
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Name" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
          <textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Brief description…" style={{ ...inputStyle, minHeight: 58, resize: "vertical", lineHeight: 1.5, width: "100%", boxSizing: "border-box" }} />

          {/* Character card fields */}
          {[
            { key: "appearance",     label: "Appearance",     placeholder: "Physical description, clothing, distinguishing features…" },
            { key: "behaviour",      label: "Behaviour",      placeholder: "Personality traits, habits, mannerisms…" },
            { key: "speech_pattern", label: "Speech pattern", placeholder: "How they speak, vocabulary, tone, accent…" },
            { key: "background",     label: "Background",     placeholder: "History, backstory, motivations…" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</p>
              <textarea
                value={draft[key]}
                onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ ...inputStyle, minHeight: 70, resize: "vertical", lineHeight: 1.5, width: "100%", boxSizing: "border-box" }}
              />
            </div>
          ))}

          {[
            { key: "narrative_alias",  label: "Narrative alias",  placeholder: "How the narrator refers to them — e.g. \"Dumbledore\"" },
            { key: "address_formal",   label: "Formal address",   placeholder: "How others address them formally — e.g. \"Professor Dumbledore\"" },
            { key: "address_informal", label: "Informal address", placeholder: "How close characters address them — e.g. \"Albus\"" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</p>
              <input
                value={draft[key]}
                onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              />
            </div>
          ))}

          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>
              Conversational initiative
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range" min={0} max={1} step={0.05}
                value={draft.bias ?? 0.5}
                onChange={e => setDraft(d => ({ ...d, bias: parseFloat(e.target.value) }))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 12, fontWeight: 500, minWidth: 28, textAlign: "right" }}>
                {(draft.bias ?? 0.5).toFixed(2)}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>
              How readily this character speaks unprompted in group chats.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={saveCharacter} disabled={!draft.name.trim() || saving} style={{ ...inputStyle, flex: 1, cursor: "pointer", textAlign: "center", opacity: (!draft.name.trim() || saving) ? 0.4 : 1 }}>
              {saving ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
            <button onClick={() => setView("list")} style={{ ...inputStyle, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── EDGE EDITOR ── */}
      {view === "edges" && edgesFor && (
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <button onClick={() => setView("list")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16, padding: 0 }}>←</button>
            <Avatar src={(typeof edgesFor.metadata === "string" ? JSON.parse(edgesFor.metadata) : edgesFor.metadata)?.avatar} name={edgesFor.name} size={28} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{edgesFor.name} — links</p>
          </div>

          {/* Add edge */}
          <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>Add link</p>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={edgeRel} onChange={e => setEdgeRel(e.target.value)} style={{ ...inputStyle, fontSize: 12, flex: 1 }}>
                {RELATIONSHIP_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={edgeTarget} onChange={e => setEdgeTarget(e.target.value)} style={{ ...inputStyle, fontSize: 12, flex: 1 }}>
                    <option value="">Select target…</option>
                    {characters.filter(c => c.id !== edgesFor.id).length > 0 && (
                        <optgroup label="Characters">
                        {characters.filter(c => c.id !== edgesFor.id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        </optgroup>
                    )}
                    {entities.filter(e => !characters.find(c => c.id === e.id) && e.id !== edgesFor.id).length > 0 && (
                        <optgroup label="Lorebook / Entities">
                        {entities
                            .filter(e => !characters.find(c => c.id === e.id) && e.id !== edgesFor.id)
                            .map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                            ))
                        }
                        </optgroup>
                    )}
                </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Weight</label>
              <input type="range" min={0.1} max={1.0} step={0.1} value={edgeWeight} onChange={e => setEdgeWeight(parseFloat(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 12, fontWeight: 500, minWidth: 28 }}>{edgeWeight.toFixed(1)}</span>
            </div>
            <button onClick={addEdge} disabled={!edgeTarget} style={{ ...inputStyle, cursor: "pointer", opacity: !edgeTarget ? 0.4 : 1 }}>Add link</button>
          </div>

          {/* Existing edges */}
          {edges.length === 0
            ? <div style={{ textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13, padding: 24 }}>No links yet.</div>
            : edges.map(e => {
              const isOutgoing  = e.edge.source_id === edgesFor.id;
              const otherChar   = characters.find(c => c.id === (isOutgoing ? e.edge.target_id : e.edge.source_id));
              const otherMeta   = typeof otherChar?.metadata === "string" ? JSON.parse(otherChar.metadata) : (otherChar?.metadata ?? {});
              return (
                <div key={e.edge.id} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>{e.edge.relationship}</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{isOutgoing ? "→" : "←"}</span>
                  {otherChar && <Avatar src={otherMeta.avatar} name={otherChar.name} size={24} />}
                  <span style={{ fontSize: 13, flex: 1 }}>{e.entity?.name ?? "Unknown"}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>w {e.edge.weight?.toFixed(1)}</span>
                  <button onClick={() => deleteEdge(e.edge.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16 }}>×</button>
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );
}