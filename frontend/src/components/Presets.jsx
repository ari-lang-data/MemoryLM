import { useState } from "react";
import { inputStyle } from "../lib/constants";

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

  const parameterDefs = [
    { label: "Summarise every N turns", key: "chunkEvery", min: 2, max: 20, step: 1 },
    { label: "Top-K retrieve", key: "topK", min: 1, max: 12, step: 1 },
    { label: "Retrieval threshold", key: "threshold", min: 0.1, max: 0.9, step: 0.05 },
    { label: "Similarity weight (α)", key: "alpha", min: 0.1, max: 1.0, step: 0.05 },
    { label: "Recency decay rate", key: "decayRate", min: 0.001, max: 0.1, step: 0.001 },
    { label: "Dedup threshold", key: "dedupThreshold", min: 0.6, max: 0.98, step: 0.01 },
    { label: "Temperature", key: "temperature", min: 0.1, max: 2.0, step: 0.05 },
    { label: "Repetition penalty", key: "repetitionPenalty", min: 1.0, max: 1.5, step: 0.05 },
    { label: "Context window (turns)", key: "contextWindow", min: 0, max: 50, step: 2 },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
        width: "100%",
        maxWidth: 900,
        borderRadius: 12,
      }}
    >
      {/* Preset selector */}
      <div
        style={{
          width: 180,
          flexShrink: 0,
          borderRight: "1px solid var(--color-border-tertiary)",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6, 
        }}
      >
        {FIXED_PRESET_IDS.map(id => {
          const preset = presets.find(p => p.id === id);
          if (!preset) return null;

          const isActive = activePreset === id;
          const isSelected = selectedId === id;

          return (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                background: isSelected
                  ? "var(--color-background-secondary)"
                  : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left", color: "var(--color-text-primary)"
              }}
            >
              <span style={{ fontSize: 16 }}>{preset.icon}</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0, fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {preset.name}
                </p>

                {isActive && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      color: "var(--color-text-info)",
                    }}
                  >
                    active
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 12,
            borderBottom: "1px solid var(--color-border-tertiary)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {selected.icon} {selected.name}
          </p>

          <button
            onClick={() => applyPreset(selected)}
            style={{
              ...inputStyle,
              cursor: "pointer",
              fontSize: 12,
              padding: "5px 12px",
              borderColor:
                activePreset === selected.id
                  ? "var(--color-text-info)"
                  : undefined,
              color:
                activePreset === selected.id
                  ? "var(--color-text-info)"
                  : undefined,
            }}
          >
            {activePreset === selected.id ? "Active ✓" : "Apply"}
          </button>
        </div>

        {/* System prompt */}
        <div>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            System Prompt
          </p>

          <textarea
            value={selected.systemPrompt}
            onChange={e => updatePresetPrompt(selected.id, e.target.value)}
            style={{
              ...inputStyle,
              width: "100%",
              minHeight: 120,
              resize: "vertical",
              lineHeight: 1.6,
              padding: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Parameters */}
        <div
          style={{
            paddingTop: 16,
            borderTop: "1px solid var(--color-border-tertiary)",
          }}
        >
          <p
            style={{
              margin: "0 0 18px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Parameters
          </p>

          {parameterDefs.map(({ label, key, min, max, step }) => (
            <div
              key={key}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 55px",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <label
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                }}
              >
                {label}
              </label>

              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={selected.config[key] ?? min}
                onChange={e =>
                  updatePresetConfig(
                    selected.id,
                    key,
                    parseFloat(e.target.value)
                  )
                }
              />

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: "center",
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "var(--color-background-secondary)",
                }}
              >
                {selected.config[key] ?? min}
              </span>
            </div>
          ))}
        </div>

        {/* Behaviour */}
        <div
          style={{
            paddingTop: 16,
            borderTop: "1px solid var(--color-border-tertiary)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Behaviour
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label
              style={{
                flex: 1,
                fontSize: 12,
                color: "var(--color-text-secondary)",
              }}
            >
              Dedup mode
            </label>

            <select
              value={selected.config.dedupMode ?? "merge"}
              onChange={e =>
                updatePresetConfig(selected.id, "dedupMode", e.target.value)
              }
              style={{ ...inputStyle, fontSize: 12 }}
            >
              <option value="merge">Merge</option>
              <option value="discard">Discard</option>
              <option value="off">Off</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label
              style={{
                flex: 1,
                fontSize: 12,
                color: "var(--color-text-secondary)",
              }}
            >
              Regenerate mode
            </label>

            <select
              value={selected.config.branchMode ?? "replace"}
              onChange={e =>
                updatePresetConfig(selected.id, "branchMode", e.target.value)
              }
              style={{ ...inputStyle, fontSize: 12 }}
            >
              <option value="replace">Replace</option>
              <option value="inline">Branch (inline)</option>
            </select>
          </div>
        </div>

        {/* Creative options */}
        {["creative", "roleplay"].includes(selected.config.style) && (
          <div
            style={{
              paddingTop: 16,
              borderTop: "1px solid var(--color-border-tertiary)",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Continuation Prompt
            </p>

            <input
              value={selected.config.continuationPrompt ?? ""}
              onChange={e =>
                updatePresetConfig(
                  selected.id,
                  "continuationPrompt",
                  e.target.value
                )
              }
              placeholder="Advance the narrative."
              style={{
                ...inputStyle,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* Model */}
        <div
          style={{
            paddingTop: 16,
            borderTop: "1px solid var(--color-border-tertiary)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Model
          </p>

          <input
            value={selected.config.modelName ?? ""}
            onChange={e =>
              updatePresetConfig(selected.id, "modelName", e.target.value)
            }
            placeholder="Leave blank to use loaded model"
            style={{
              ...inputStyle,
              width: "100%",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>
    </div>
  );
}