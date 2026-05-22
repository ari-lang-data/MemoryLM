import{Card} from "./ui/shared";
import { inputStyle } from "../lib/constants";
import{DEFAULT_PRESETS} from "../lib/constants";
export default function Presets({presets, activePreset, editingPreset,setEditingPreset,
systemPrompt, config, applyPreset,savePreset,deletePreset, presetDraft, setPresetDraft
}){
    return(
          <div style={{ flex: 1, display: "flex", overflow: "hidden", width: "100%", maxWidth: 800 }}>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, borderRight: editingPreset ? "0.5px solid var(--color-border-tertiary)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>Personas</p>
                <button onClick={() => { setPresetDraft({ id: `preset_${Date.now()}`, name: "", icon: "✨", systemPrompt: systemPrompt, config: { ...config } }); setEditingPreset("__new__"); }} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "5px 10px" }}>+ New preset</button>
              </div>
              {presets.map(preset => (
                <Card key={preset.id} style={{ borderColor: activePreset === preset.id ? "var(--color-border-primary)" : undefined }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 22, lineHeight: 1.2, flexShrink: 0 }}>{preset.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{preset.name}</span>
                        {activePreset === preset.id && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-success)", color: "var(--color-text-success)", border: "0.5px solid currentColor", opacity: 0.8 }}>active</span>}
                      </div>
                      <p style={{ margin: "0 0 5px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preset.systemPrompt}</p>
                      <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                        <span>chunk/{preset.config.chunkEvery}</span>
                        <span>top-{preset.config.topK}</span>
                        <span>thresh {preset.config.threshold}</span>
                        <span>temp {preset.config.temperature}</span>
                        <span>Rep {preset.config.repetitionPenalty}</span>
                        <span>{preset.config.dedupMode}</span>
                        {preset.config.modelName && <span>"{preset.config.modelName}"</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                      <button onClick={() => applyPreset(preset)} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "5px 10px" }}>Apply</button>
                      <button onClick={() => { setPresetDraft({ ...preset }); setEditingPreset(preset.id); }} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "5px 10px" }}>Edit</button>
                      {!DEFAULT_PRESETS.find(d => d.id === preset.id) && (
                        <button onClick={() => { if (confirm(`Delete "${preset.name}"?`)) deletePreset(preset.id); }} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "5px 10px", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Delete</button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {editingPreset && presetDraft && (
              <div style={{ width: 300, flexShrink: 0, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{editingPreset === "__new__" ? "New preset" : "Edit preset"}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={presetDraft.icon} onChange={e => setPresetDraft(d => ({ ...d, icon: e.target.value }))} placeholder="🤖" maxLength={2} style={{ ...inputStyle, width: 48, textAlign: "center", fontSize: 18 }} />
                  <input value={presetDraft.name} onChange={e => setPresetDraft(d => ({ ...d, name: e.target.value }))} placeholder="Name" style={{ ...inputStyle, flex: 1 }} />
                </div>
                <textarea value={presetDraft.systemPrompt} onChange={e => setPresetDraft(d => ({ ...d, systemPrompt: e.target.value }))} placeholder="System prompt…" style={{ ...inputStyle, minHeight: 90, resize: "vertical", lineHeight: 1.5, width: "100%", boxSizing: "border-box" }} />
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-tertiary)" }}>Parameters</p>
                {[
                  { label: "Summarise every N turns", key: "chunkEvery",     min: 2,   max: 20,   step: 1 },
                  { label: "Top-K retrieve",          key: "topK",           min: 1,   max: 12,   step: 1 },
                  { label: "Retrieval threshold",     key: "threshold",      min: 0.1, max: 0.9,  step: 0.05 },
                  { label: "Dedup threshold",         key: "dedupThreshold", min: 0.6, max: 0.98, step: 0.01 },
                  { label: "Temperature",             key: "temperature",    min: 0.1, max: 2.0,  step: 0.05 },
                  { label: "Repetition penalty",      key: "repetitionPenalty", min: 1.0, max: 1.5, step: 0.05 },
                ].map(({ label, key, min, max, step }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1 }}>{label}</label>
                    <input type="range" min={min} max={max} step={step} value={presetDraft.config[key] ?? min} onChange={e => setPresetDraft(d => ({ ...d, config: { ...d.config, [key]: parseFloat(e.target.value) } }))} style={{ width: 80 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, minWidth: 32, textAlign: "right" }}>{presetDraft.config[key] ?? min}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1 }}>Dedup mode</label>
                  <select value={presetDraft.config.dedupMode} onChange={e => setPresetDraft(d => ({ ...d, config: { ...d.config, dedupMode: e.target.value } }))} style={{ ...inputStyle, fontSize: 12 }}>
                    <option value="merge">Merge</option>
                    <option value="discard">Discard</option>
                    <option value="off">Off</option>
                  </select>
                </div>
                <input value={presetDraft.config.modelName ?? ""} onChange={e => setPresetDraft(d => ({ ...d, config: { ...d.config, modelName: e.target.value } }))} placeholder="Model name (optional)" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => { if (presetDraft.name) savePreset(presetDraft); }} disabled={!presetDraft.name} style={{ ...inputStyle, flex: 1, cursor: "pointer", textAlign: "center", opacity: !presetDraft.name ? 0.4 : 1 }}>Save</button>
                  <button onClick={() => { setEditingPreset(null); setPresetDraft(null); }} style={{ ...inputStyle, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
    );
}