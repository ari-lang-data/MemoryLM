import { useState } from "react";
import { inputStyle, DEFAULT_PRESETS } from "../lib/constants";

const FIXED_PRESET_IDS = ["assistant", "coding", "creative", "roleplay"];

export default function Presets({
  presets,
  activePreset,
  applyPreset,
  updatePresetConfig,
  updatePresetPrompt,
}) {
  const [selectedId, setSelectedId] = useState(activePreset ?? "assistant");
  const selected = presets.find(p => p.id === selectedId) ?? presets[0];

  if (!selected) return null;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", width: "100%", maxWidth: 800 }}>

      {/* Preset selector */}
      <div style={{ width: 160, flexShrink: 0, borderRight: "0.5px solid var(--color-border-tertiary)", padding: "12px 0", display: "flex", flexDirection: "column", gap: 2 }}>
        {FIXED_PRESET_IDS.map(id => {
          const preset = presets.find(p => p.id === id);
          if (!preset) return null;
          const isActive   = activePreset === id;
          const isSelected = selectedId   === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: isSelected ? "var(--color-background-secondary)" : "transparent", border: "none", borderLeft: isSelected ? "2px solid var(--color-text-primary)" : "2px solid transparent", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ fontSize: 16 }}>{preset.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-primary)", fontWeight: isSelected ? 500 : 400 }}>{preset.name}</p>
                {isActive && <p style={{ margin: 0, fontSize: 10, color: "var(--color-text-info)" }}>active</p>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Parameter editor */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{selected.icon} {selected.name}</p>
          <button
            onClick={() => applyPreset(selected)}
            style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "5px 12px", borderColor: activePreset === selected.id ? "var(--color-text-info)" : undefined, color: activePreset === selected.id ? "var(--color-text-info)" : undefined }}
          >
            {activePreset === selected.id ? "Active ✓" : "Apply"}
          </button>
        </div>

        {/* System prompt */}
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>System prompt</p>
          <textarea
            value={selected.systemPrompt}
            onChange={e => updatePresetPrompt(selected.id, e.target.value)}
            style={{ ...inputStyle, width: "100%", minHeight: 90, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
          />
        </div>

        {/* Parameters */}
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-tertiary)" }}>Parameters</p>
        {[
          { label: "Summarise every N turns", key: "chunkEvery",        min: 2,   max: 20,   step: 1 },
          { label: "Top-K retrieve",          key: "topK",              min: 1,   max: 12,   step: 1 },
          { label: "Retrieval threshold",     key: "threshold",         min: 0.1, max: 0.9,  step: 0.05 },
          { label: "Similarity weight (α)",   key: "alpha",             min: 0.1, max: 1.0,  step: 0.05 },
          { label: "Recency decay rate",      key: "decayRate",         min: 0.001, max: 0.1, step: 0.001 },
          { label: "Dedup threshold",         key: "dedupThreshold",    min: 0.6, max: 0.98, step: 0.01 },
          { label: "Temperature",             key: "temperature",       min: 0.1, max: 2.0,  step: 0.05 },
          { label: "Repetition penalty",      key: "repetitionPenalty", min: 1.0, max: 1.5,  step: 0.05 },
          { label: "Context window (turns)",  key: "contextWindow",     min: 0,   max: 50,   step: 2 },
        ].map(({ label, key, min, max, step }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1 }}>{label}</label>
            <input
              type="range" min={min} max={max} step={step}
              value={selected.config[key] ?? min}
              onChange={e => updatePresetConfig(selected.id, key, parseFloat(e.target.value))}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: 12, fontWeight: 500, minWidth: 36, textAlign: "right" }}>
              {selected.config[key] ?? min}
            </span>
          </div>
        ))}

        {/* Dedup mode */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1 }}>Dedup mode</label>
          <select
            value={selected.config.dedupMode ?? "merge"}
            onChange={e => updatePresetConfig(selected.id, "dedupMode", e.target.value)}
            style={{ ...inputStyle, fontSize: 12 }}
          >
            <option value="merge">Merge</option>
            <option value="discard">Discard</option>
            <option value="off">Off</option>
          </select>
        </div>

        {/* Regenerate mode */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1 }}>Regenerate mode</label>
          <select
            value={selected.config.branchMode ?? "replace"}
            onChange={e => updatePresetConfig(selected.id, "branchMode", e.target.value)}
            style={{ ...inputStyle, fontSize: 12 }}
          >
            <option value="replace">Replace</option>
            <option value="inline">Branch (inline)</option>
          </select>
        </div>

        {/* Continuation prompt — creative/roleplay only */}
        {["creative","roleplay"].includes(selected.config.style) && (
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>Continuation prompt</p>
            <input
              value={selected.config.continuationPrompt ?? ""}
              onChange={e => updatePresetConfig(selected.id, "continuationPrompt", e.target.value)}
              placeholder="Advance the narrative."
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
            />
          </div>
        )}

        {/* Model name */}
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--color-text-secondary)" }}>Model name <span style={{ fontSize: 11, opacity: 0.6 }}>(optional)</span></p>
          <input
            value={selected.config.modelName ?? ""}
            onChange={e => updatePresetConfig(selected.id, "modelName", e.target.value)}
            placeholder="Leave blank to use loaded model"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          />
        </div>

      </div>
    </div>
  );
}