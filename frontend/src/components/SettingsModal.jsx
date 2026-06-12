import { useState, useEffect, useRef } from "react";
import { inputStyle, STORAGE_KEYS } from "../lib/constants";
import { Card, CardTitle, Row } from "./ui/shared";
import { saveStorage } from "../lib/storage";
import { messagesAPI, memoriesAPI } from "../lib/api";
import { modalBackdropValues } from "../lib/fermiDirac";
import { ChevronRight } from "lucide-react";

const FIXED_PRESET_IDS = ["assistant", "coding", "creative", "roleplay"];

const SETTINGS_TABS = [
  { id: "connection", label: "Connection" },
  { id: "memory",     label: "Memory" },
  { id: "generation", label: "Generation" },
  { id: "data",       label: "Data" },
];

// Parameters always visible in presets
const BASIC_PARAM_KEYS = new Set(["chunkEvery", "contextWindow"]);

const parameterDefs = [
  { label: "Summarise every N turns",  key: "chunkEvery",         min: 2,     max: 20,   step: 1     },
  { label: "Context window (turns)",   key: "contextWindow",      min: 0,     max: 50,   step: 2     },
  { label: "Top-K retrieve",           key: "topK",               min: 1,     max: 12,   step: 1     },
  { label: "Retrieval threshold",      key: "threshold",          min: 0.1,   max: 0.9,  step: 0.05  },
  { label: "Similarity weight (α)",    key: "alpha",              min: 0.1,   max: 1.0,  step: 0.05  },
  { label: "Recency decay rate",       key: "decayRate",          min: 0.001, max: 0.1,  step: 0.001 },
  { label: "Dedup threshold",          key: "dedupThreshold",     min: 0.6,   max: 0.98, step: 0.01  },
  { label: "Temperature",              key: "temperature",        min: 0.1,   max: 2.0,  step: 0.05  },
  { label: "Repetition penalty",       key: "repetitionPenalty",  min: 1.0,   max: 1.5,  step: 0.05  },
];

const { opacity: backdropOpacity, blur: backdropBlur } = modalBackdropValues();

// ── Slider row ────────────────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 55px", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value ?? min} onChange={e => onChange(parseFloat(e.target.value))} />
      <span style={{ fontSize: 12, fontWeight: 600, textAlign: "center", padding: "4px 8px", borderRadius: 6, background: "var(--color-background-secondary)" }}>
        {value ?? min}
      </span>
    </div>
  );
}

// ── Presets pane ──────────────────────────────────────────────────────────────
function PresetsPane({ presets, activePreset, applyPreset, updatePresetConfig, updatePresetPrompt }) {
  const [selectedId,    setSelectedId]    = useState(activePreset ?? "assistant");
  const [advancedOpen,  setAdvancedOpen]  = useState(false);

  const selected = presets.find(p => p.id === selectedId) ?? presets[0];
  if (!selected) return null;

  const basicParams    = parameterDefs.filter(p => BASIC_PARAM_KEYS.has(p.key));
  const advancedParams = parameterDefs.filter(p => !BASIC_PARAM_KEYS.has(p.key));

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
      {/* Preset selector */}
      <div style={{ width: 160, flexShrink: 0, borderRight: "0.5px solid var(--color-border-tertiary)", padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {FIXED_PRESET_IDS.map(id => {
          const preset     = presets.find(p => p.id === id);
          if (!preset) return null;
          const isActive   = activePreset === id;
          const isSelected = selectedId   === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: isSelected ? "var(--color-background-tertiary)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "var(--color-text-primary)" }}
            >
              <span style={{ fontSize: 16 }}>{preset.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>{preset.name}</p>
                {isActive && <p style={{ margin: 0, fontSize: 10, color: "var(--color-text-info)" }}>active</p>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{selected.icon} {selected.name}</p>
          <button
            onClick={() => applyPreset(selected)}
            style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "5px 12px", borderColor: activePreset === selected.id ? "var(--color-text-info)" : undefined, color: activePreset === selected.id ? "var(--color-text-info)" : undefined }}
          >
            {activePreset === selected.id ? "Active ✓" : "Apply"}
          </button>
        </div>

        {/* System prompt */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>System Prompt</p>
          <textarea
            value={selected.systemPrompt}
            onChange={e => updatePresetPrompt(selected.id, e.target.value)}
            style={{ ...inputStyle, width: "100%", minHeight: 100, resize: "vertical", lineHeight: 1.6, padding: 12, boxSizing: "border-box" }}
          />
        </div>

        {/* Basic parameters */}
        <div style={{ paddingTop: 14, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600 }}>Parameters</p>
          {basicParams.map(({ label, key, min, max, step }) => (
            <SliderRow
              key={key} label={label} min={min} max={max} step={step}
              value={selected.config[key]}
              onChange={v => updatePresetConfig(selected.id, key, v)}
            />
          ))}

          {/* Advanced dropdown */}
          <button
            onClick={() => setAdvancedOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 12, padding: "4px 0", marginBottom: advancedOpen ? 12 : 0 }}
          >
            <span style={{ display: "inline-block", transform: advancedOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", fontSize: 10 }}><ChevronRight size={13}/></span>
            Advanced
          </button>

          {advancedOpen && advancedParams.map(({ label, key, min, max, step }) => (
            <SliderRow
              key={key} label={label} min={min} max={max} step={step}
              value={selected.config[key]}
              onChange={v => updatePresetConfig(selected.id, key, v)}
            />
          ))}
        </div>

        {/* Behaviour */}
        <div style={{ paddingTop: 14, borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Behaviour</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ flex: 1, fontSize: 12, color: "var(--color-text-secondary)" }}>Dedup mode</label>
            <select value={selected.config.dedupMode ?? "merge"} onChange={e => updatePresetConfig(selected.id, "dedupMode", e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
              <option value="merge">Merge</option>
              <option value="discard">Discard</option>
              <option value="off">Off</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ flex: 1, fontSize: 12, color: "var(--color-text-secondary)" }}>Regenerate mode</label>
            <select value={selected.config.branchMode ?? "replace"} onChange={e => updatePresetConfig(selected.id, "branchMode", e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
              <option value="replace">Replace</option>
              <option value="inline">Branch (inline)</option>
            </select>
          </div>
        </div>

        {/* Creative options */}
        {["creative", "roleplay"].includes(selected.config.style) && (
          <div style={{ paddingTop: 14, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>Continuation Prompt</p>
            <input
              value={selected.config.continuationPrompt ?? ""}
              onChange={e => updatePresetConfig(selected.id, "continuationPrompt", e.target.value)}
              placeholder="Advance the narrative."
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
            />
          </div>
        )}

        {/* Model */}
        <div style={{ paddingTop: 14, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>Model</p>
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

// ── Main modal ────────────────────────────────────────────────────────────────
export default function SettingsModal({
  isOpen,
  onClose,
  // Settings props
  lmStudioUrl, setLmStudioUrl,
  config, setConfig,
  persistConfig,
  systemPrompt, setSystemPrompt,
  lorebook, setLorebook,
  activeChatId,
  setNodes, setActiveChildren,
  setMemories, graphAPI,confirm,
  // Presets props
  presets,
  activePreset,
  applyPreset,
  updatePresetConfig,
  updatePresetPrompt,
  // Theme props
  theme,
  setTheme,
  themes,
}) {
  const [activeTab,    setActiveTab]    = useState("presets");
  const [settingsTab,  setSettingsTab]  = useState("connection");
  const modalRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Close on backdrop click
  function handleBackdropClick(e) {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  }

  if (!isOpen) return null;

  const TOP_TABS = [
    { id: "presets",   label: "Presets"   },
    { id: "settings",  label: "Settings"  },
  ];

  return (
    /* Backdrop */
    <div
      onClick={handleBackdropClick}
      style={{
        position:             "fixed",
        inset:                0,
        zIndex:               200,
        background:           `rgba(0, 0, 0, ${backdropOpacity})`,
        backdropFilter:       `blur(${backdropBlur}px)`,
        WebkitBackdropFilter: `blur(${backdropBlur}px)`,
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "center",
      }}
    >
      {/* Modal */}
      <div
        ref={modalRef}
        style={{
          width:           "min(820px, 92vw)",
          height:          "min(640px, 88vh)",
          background:      "var(--color-background-primary)",
          border:          "0.5px solid var(--color-border-secondary)",
          borderRadius:    "var(--border-radius-lg)",
          boxShadow:       "0 24px 64px rgba(0,0,0,0.6)",
          display:         "flex",
          flexDirection:   "column",
          overflow:        "hidden",
        }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {TOP_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{ padding: "4px 12px", fontSize: 13, borderRadius: "var(--border-radius-md)", border: activeTab === t.id ? "0.5px solid var(--color-border-primary)" : "0.5px solid transparent", background: activeTab === t.id ? "var(--color-background-secondary)" : "transparent", color: activeTab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", fontWeight: activeTab === t.id ? 500 : 400 }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}
            title="Close"
          >×</button>
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* ── PRESETS tab ── */}
          {activeTab === "presets" && (
            <PresetsPane
              presets={presets}
              activePreset={activePreset}
              applyPreset={applyPreset}
              updatePresetConfig={updatePresetConfig}
              updatePresetPrompt={updatePresetPrompt}
            />
          )}

          {/* ── SETTINGS tab ── */}
          {activeTab === "settings" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Inner tab bar */}
              <div style={{ display: "flex", gap: 3, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8 }}>
                {SETTINGS_TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSettingsTab(t.id)}
                    style={{ padding: "4px 12px", fontSize: 12, borderRadius: "var(--border-radius-md)", border: settingsTab === t.id ? "0.5px solid var(--color-border-primary)" : "0.5px solid transparent", background: settingsTab === t.id ? "var(--color-background-secondary)" : "transparent", color: settingsTab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", fontWeight: settingsTab === t.id ? 500 : 400 }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── CONNECTION ── */}
              {settingsTab === "connection" && (
                <>
                  <Card>
                    <CardTitle>LM Studio</CardTitle>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Row label="Server URL">
                        <input value={lmStudioUrl} onChange={e => { setLmStudioUrl(e.target.value); persistConfig(config, systemPrompt, e.target.value); }} placeholder="http://localhost:1234" style={{ ...inputStyle, flex: 1 }} />
                      </Row>
                      <Row label={<>Model name <span style={{ fontSize: 11, opacity: 0.6 }}>(optional)</span></>}>
                        <input value={config.modelName} onChange={e => { const n = { ...config, modelName: e.target.value }; setConfig(n); persistConfig(n, systemPrompt, lmStudioUrl); }} placeholder="Leave blank to use loaded model" style={{ ...inputStyle, flex: 1 }} />
                      </Row>
                    </div>
                  </Card>
                  <Card>
                    <CardTitle>System prompt</CardTitle>
                    <textarea
                      value={systemPrompt}
                      onChange={e => { setSystemPrompt(e.target.value); persistConfig(config, e.target.value, lmStudioUrl); }}
                      style={{ ...inputStyle, width: "100%", minHeight: 175, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
                    />
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                      Note: system prompt is overridden when a preset is applied.
                    </p>
                  </Card>
                  <Card>
                    <CardTitle>Appearance</CardTitle>
                    <div style={{ display: "flex", gap: 6 }}>
                      {themes.map(t => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          style={{
                            flex:         1,
                            padding:      "6px 0",
                            borderRadius: "var(--border-radius-md)",
                            border:       theme === t
                              ? "0.5px solid var(--color-border-primary)"
                              : "0.5px solid var(--color-border-tertiary)",
                            background:   theme === t
                              ? "var(--color-background-secondary)"
                              : "transparent",
                            color:        theme === t
                              ? "var(--color-text-primary)"
                              : "var(--color-text-secondary)",
                            fontSize:     12,
                            cursor:       "pointer",
                            fontWeight:   theme === t ? 500 : 400,
                            textTransform: "capitalize",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Card>
                </>
              )}

              {/* ── MEMORY ── */}
              {settingsTab === "memory" && (
                <>
                  <Card>
                    <CardTitle>Retrieval</CardTitle>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { label: "Summarise every N turns",           key: "chunkEvery",    min: 2,     max: 20,  step: 1     },
                        { label: "Top-K memories to retrieve",        key: "topK",          min: 1,     max: 12,  step: 1     },
                        { label: "Retrieval threshold",               key: "threshold",     min: 0.1,   max: 0.9, step: 0.05  },
                        { label: "Similarity weight (alpha)",         key: "alpha",         min: 0.1,   max: 1.0, step: 0.05  },
                        { label: "Recency decay rate",                key: "decayRate",     min: 0.001, max: 0.1, step: 0.001 },
                        { label: "Context window (turns, 0=unlimited)", key: "contextWindow", min: 0,   max: 50,  step: 2     },
                      ].map(({ label, key, min, max, step }) => (
                        <Row key={key} label={label}>
                          <input type="range" min={min} max={max} step={step} value={config[key] ?? min} onChange={e => { const n = { ...config, [key]: parseFloat(e.target.value) }; setConfig(n); persistConfig(n, systemPrompt, lmStudioUrl); }} style={{ flex: 1 }} />
                          <span style={{ fontSize: 13, fontWeight: 500, minWidth: 36, textAlign: "right" }}>{config[key] ?? min}</span>
                        </Row>
                      ))}
                      <Row label="Auto-summarise">
                        <input type="checkbox" checked={config.autoSummarise} onChange={e => { const n = { ...config, autoSummarise: e.target.checked }; setConfig(n); persistConfig(n, systemPrompt, lmStudioUrl); }} style={{ width: 16, height: 16 }} />
                      </Row>
                    </div>
                  </Card>
                  <Card>
                    <CardTitle>Deduplication</CardTitle>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <Row label="Mode">
                        <select value={config.dedupMode} onChange={e => { const n = { ...config, dedupMode: e.target.value }; setConfig(n); persistConfig(n, systemPrompt, lmStudioUrl); }} style={{ ...inputStyle, flex: 1 }}>
                          <option value="merge">Merge (LLM combines both)</option>
                          <option value="discard">Discard (keep existing)</option>
                          <option value="off">Off (always store)</option>
                        </select>
                      </Row>
                      <Row label="Similarity threshold">
                        <input type="range" min={0.6} max={0.98} step={0.01} value={config.dedupThreshold} onChange={e => { const n = { ...config, dedupThreshold: parseFloat(e.target.value) }; setConfig(n); persistConfig(n, systemPrompt, lmStudioUrl); }} style={{ flex: 1 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, minWidth: 36, textAlign: "right" }}>{config.dedupThreshold.toFixed(2)}</span>
                      </Row>
                    </div>
                  </Card>
                </>
              )}

              {/* ── GENERATION ── */}
              {settingsTab === "generation" && (
                <Card>
                  <CardTitle>Generation parameters</CardTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { label: "Temperature",        key: "temperature",       min: 0.1, max: 2.0, step: 0.05 },
                      { label: "Repetition penalty", key: "repetitionPenalty", min: 1.0, max: 1.5, step: 0.05 },
                    ].map(({ label, key, min, max, step }) => (
                      <Row key={key} label={label}>
                        <input type="range" min={min} max={max} step={step} value={config[key] ?? min} onChange={e => { const n = { ...config, [key]: parseFloat(e.target.value) }; setConfig(n); persistConfig(n, systemPrompt, lmStudioUrl); }} style={{ flex: 1 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, minWidth: 36, textAlign: "right" }}>{(config[key] ?? min).toFixed(2)}</span>
                      </Row>
                    ))}
                  </div>
                </Card>
              )}

              {/* ── DATA ── */}
              {settingsTab === "data" && (
                <Card>
                  <CardTitle>Data management</CardTitle>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={async () => {
                      try {
                        const [entities, templateVars] = await Promise.all([
                          graphAPI.getEntities(activeChatId),
                          graphAPI.getTemplateVars(activePreset),
                        ]);
                        const edgeSets    = await Promise.all(entities.map(e => graphAPI.getEdges(e.id, "out")));
                        const allEdges    = edgeSets.flat();
                        const characters  = await graphAPI.getCharacters(activePreset);
                        const exportData  = { exportedAt: new Date().toISOString(), lorebook, entities, edges: allEdges, characters, templateVars };
                        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                        const a    = document.createElement("a");
                        a.href     = URL.createObjectURL(blob);
                        a.download = `memorylm_export_${new Date().toISOString().slice(0,10)}.json`;
                        a.click();
                      } catch(e) { console.error("Export failed:", e); }
                    }} style={{ ...inputStyle, cursor: "pointer" }}>Export JSON</button>
                    <button onClick={async () => {
                      if (await confirm("Clear chat history?")) {
                        setNodes([]); setActiveChildren({});
                        await messagesAPI.clear(activeChatId);
                      }
                    }} style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Clear chat</button>
                    <button onClick={async () => {
                      if (await confirm("Clear all memories?")) {
                        await memoriesAPI.clearChat(activeChatId); setMemories([]);
                      }
                    }} style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Clear memories</button>
                    <button onClick={async () => {
                      if (await confirm("Clear lorebook?")) {
                        setLorebook([]); saveStorage(STORAGE_KEYS.lorebook, []);
                      }
                    }} style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Clear lorebook</button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
