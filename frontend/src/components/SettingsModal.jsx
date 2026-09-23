import { useState, useEffect, useRef } from "react";
import { inputStyle, STORAGE_KEYS } from "../lib/constants";
import { Card, CardTitle, Row } from "./ui/shared";
import { saveStorage } from "../lib/storage";
import { messagesAPI, memoriesAPI } from "../lib/api";
import { modalBackdropValues } from "../lib/fermiDirac";
import { getRimMode, setRimMode } from "../lib/glassRim";
import { useIsMobile } from "../hooks/useIsMobile";
import { authAPI, getApiToken, setApiToken } from "../lib/api";
import { ChevronRight, X, Plus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const FIXED_PRESET_IDS = ["assistant", "coding", "creative", "roleplay"];

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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</label>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 8px", borderRadius: 6, background: "var(--color-background-secondary)" }}>
            {value ?? min}
          </span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value ?? min} onChange={e => onChange(parseFloat(e.target.value))} style={{ width: "100%" }} />
      </div>
    );
  }

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
function PresetsPane({ presets, activePreset, applyPreset, updatePresetConfig, updatePresetPrompt, isMobile }) {
  const [selectedId,    setSelectedId]    = useState(activePreset ?? "assistant");
  const [advancedOpen,  setAdvancedOpen]  = useState(false);

  const selected = presets.find(p => p.id === selectedId) ?? presets[0];
  if (!selected) return null;

  const basicParams    = parameterDefs.filter(p => BASIC_PARAM_KEYS.has(p.key));
  const advancedParams = parameterDefs.filter(p => !BASIC_PARAM_KEYS.has(p.key));

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flex: 1, overflow: "hidden", minHeight: 0 }}>
      {/* Preset selector — sidebar on desktop, scrolling chip strip on mobile */}
      <div style={{
        width: isMobile ? "100%" : 160,
        flexShrink: 0,
        borderRight: isMobile ? "none" : "0.5px solid var(--color-border-tertiary)",
        borderBottom: isMobile ? "0.5px solid var(--color-border-tertiary)" : "none",
        padding: isMobile ? "10px 12px" : 12,
        display: "flex",
        flexDirection: isMobile ? "row" : "column",
        gap: isMobile ? 8 : 4,
        overflowX: isMobile ? "auto" : "visible",
      }}>
        {FIXED_PRESET_IDS.map(id => {
          const preset     = presets.find(p => p.id === id);
          if (!preset) return null;
          const isActive   = activePreset === id;
          const isSelected = selectedId   === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: isMobile ? "8px 12px" : "10px 12px",
                borderRadius: 8,
                background: isSelected ? "var(--color-background-tertiary)" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
                color: "var(--color-text-primary)",
                flexShrink: isMobile ? 0 : undefined,
                whiteSpace: isMobile ? "nowrap" : "normal",
              }}
            >
              <span style={{ fontSize: 16 }}>{preset.icon}</span>
              <div style={{ minWidth: 0, flex: isMobile ? "0 0 auto" : 1 }}>
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
  // User props
  powerUser, setPowerUser,
  // group chat handling props
  directorUrl, directorModel, setDirectorUrl, setDirectorModel
}) {
  const [activeTab,    setActiveTab]    = useState("presets");
  const [settingsTab,  setSettingsTab]  = useState("connection");
  const [powerUserPending, setPowerUserPending] = useState(false);
  const [rimMode, setRimModeState] = useState(() => getRimMode());

  const [tokens, setTokens] = useState([]);
const [newLabel, setNewLabel] = useState("");
const [justCreated, setJustCreated] = useState(null); // raw token, shown once
const [pastedToken, setPastedToken] = useState(() => getApiToken());

useEffect(() => {
  if (!isOpen) return;
  authAPI.getTokens().then(setTokens).catch(() => setTokens([])); // fails harmlessly on a device with no admin access — expected on the phone
}, [isOpen]);

  const SETTINGS_TABS = [
    { id: "connection", label: "Connection" },
    { id: "memory",     label: "Memory"     },
    { id: "generation", label: "Generation" },
    ...(config?.style === "roleplay" ? [{ id: "groupchat", label: "Group Chat" }] : []),
    { id: "data",       label: "Data"       },
  ];

  const modalRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const isMobile = useIsMobile();

  async function handleSaveToken() {
    const trimmed = pastedToken.trim();
    setApiToken(trimmed);
    const ok = await checkAuth();
    if (ok) {
      window.location.reload();
    } else {
      setApiToken("");
      alert("Token rejected — double check it was copied correctly.");
    }
  }

  async function handleCreateToken() {
  if (!newLabel.trim()) return;
  const { token } = await authAPI.createToken(newLabel.trim());
  setJustCreated(token);
  setNewLabel("");
  authAPI.getTokens().then(setTokens);
}

async function handleRevoke(id) {
  await authAPI.revokeToken(id);
  authAPI.getTokens().then(setTokens);
}

  // Close on backdrop click
  function handleBackdropClick(e) {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  }

  if (!isOpen) return null;

  const TOP_TABS = [
    { id: "presets",   label: "Presets"   },
    { id: "settings",  label: "Settings"  },
  ];

  function handleSetRimMode(mode) {
    setRimMode(mode);
    setRimModeState(mode);
  }

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
          width:           isMobile ? "100vw" : "min(820px, 92vw)",
          height:          isMobile ? "100dvh" : "min(640px, 88vh)",
          background:      "var(--color-background-primary)",
          border:          isMobile ? "none" : "0.5px solid var(--color-border-secondary)",
          borderRadius:    isMobile ? 0 : "var(--border-radius-lg)",
          boxShadow:       isMobile ? "none" : "0 24px 64px rgba(0,0,0,0.6)",
          display:         "flex",
          flexDirection:   "column",
          overflow:        "hidden",
        }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", 
          padding: isMobile ? "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px" : "12px 16px", 
          borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
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
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: isMobile ? 22 : 18, lineHeight: 1, padding: isMobile ? "6px 10px" : "2px 6px" }}
            title="Close"
          ><X size={22}/></button>
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
              isMobile={isMobile}
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
                    <CardTitle>Devices</CardTitle>

                    {/* Only meaningful when this Settings panel is open on the laptop itself
                        — a phone hitting authAPI.getTokens() gets a 401 and just sees an
                        empty list, since minting/listing tokens is itself loopback-gated. */}
                    {tokens.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                        {tokens.map(t => (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                            <span style={{ color: "var(--color-text-secondary)" }}>{t.label}</span>
                            <button onClick={() => handleRevoke(t.id)} style={{ background: "transparent", border: "none", color: "var(--color-text-danger)", cursor: "pointer", fontSize: 12 }}>Revoke</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        placeholder="e.g. Colin's phone"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button onClick={handleCreateToken} style={{ padding: "6px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)", fontSize: 12, cursor: "pointer", alignItems: "center", gap: 6 }}>
                        <Plus size={12}/> New device
                      </button>
                    </div>

                    {justCreated && (
                      <div style={{ marginTop: 10, padding: 10, borderRadius: "var(--border-radius-md)", background: "var(--color-background-tertiary)", border: "0.5px solid var(--color-border-primary)" }}>
                        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 4px" }}>
                          Shown once — copy it onto the device now.
                        </p>
                        <div style={{ background: "#ffffff", padding: 10, borderRadius: "var(--border-radius-md)" }}>
                          <QRCodeSVG value={justCreated} size={160} />
                        </div>
                        <code style={{ fontSize: 11, wordBreak: "break-all", color: "var(--color-text-primary)" }}>{justCreated}</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(justCreated); setJustCreated(null); }}
                          style={{ display: "block", marginTop: 6, fontSize: 11, background: "transparent", border: "none", color: "var(--color-text-info)", cursor: "pointer", padding: 0 }}
                        >
                          Copy & dismiss
                        </button>
                      </div>
                    )}

                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                      <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 6px" }}>
                        On a device other than this computer, paste the token you were given:
                      </p>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={pastedToken}
                          onChange={e => setPastedToken(e.target.value)}
                          placeholder="Paste device token"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button onClick={handleSaveToken} style={{ padding: "6px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)", fontSize: 12, cursor: "pointer" }}>
                          Save
                        </button>
                      </div>
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
                  <Card>
                    <CardTitle>Chat bubble rim</CardTitle>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { id: "auto",  label: "Auto"    },
                        { id: "webgl", label: "Crystal" },
                        { id: "svg",   label: "Flat"    },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => handleSetRimMode(opt.id)}
                          style={{
                            flex: 1, padding: "6px 0", borderRadius: "var(--border-radius-md)",
                            border: rimMode === opt.id ? "0.5px solid var(--color-border-primary)" : "0.5px solid var(--color-border-tertiary)",
                            background: rimMode === opt.id ? "var(--color-background-secondary)" : "transparent",
                            color: rimMode === opt.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                            fontSize: 12, cursor: "pointer", fontWeight: rimMode === opt.id ? 500 : 400,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                        Auto picks based on your GPU. Crystal is the real Fresnel/Snell WebGL render; Flat is the cheaper SVG-filter approximation for CPU/iGPU systems.
                      </p>
                    </Card>
                  <Card>
                    <CardTitle>Mode</CardTitle>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--color-text-primary)" }}>
                          {powerUser ? "Power User" : "Standard"}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                          {powerUser
                            ? "Advanced configuration options are enabled."
                            : "Simplified interface with sensible defaults."}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!powerUser) {
                            // Switching to power user — show neutral confirmation
                            setPowerUserPending(true);
                          } else {
                            setPowerUser(false);
                          }
                        }}
                        style={{
                          ...inputStyle,
                          cursor:  "pointer",
                          fontSize: 12,
                          padding: "5px 14px",
                          flexShrink: 0,
                          borderColor: powerUser ? "var(--color-border-primary)" : undefined,
                          color:       powerUser ? "var(--color-text-primary)"   : "var(--color-text-secondary)",
                        }}
                      >
                        {powerUser ? "Switch to Standard" : "Enable Power User"}
                      </button>
                    </div>

                    {/* Inline confirmation — not a modal, not danger-styled */}
                    {powerUserPending && (
                      <div style={{
                        marginTop:    12,
                        padding:      "10px 12px",
                        borderRadius: "var(--border-radius-md)",
                        border:       "0.5px solid var(--color-border-secondary)",
                        background:   "var(--color-background-secondary)",
                        display:      "flex",
                        alignItems:   "center",
                        justifyContent: "space-between",
                        gap:          12,
                      }}>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                          Power user mode exposes advanced configuration options that can potentially break things. Switch anyway?
                        </p>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => { setPowerUser(true); setPowerUserPending(false); }}
                            style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "4px 12px" }}
                          >
                            Switch anyway
                          </button>
                          <button
                            onClick={() => setPowerUserPending(false)}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 12, padding: "4px 8px" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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

              {/* ── GROUP CHAT ── */}
              {settingsTab === "groupchat" && (
                <Card>
                  <CardTitle>Director model</CardTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Row label="Server URL">
                      <input
                        value={directorUrl}
                        onChange={e => { setDirectorUrl(e.target.value); persistConfig(config, systemPrompt, lmStudioUrl); }}
                        placeholder="http://localhost:1234"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </Row>
                    <Row label={<>Model name <span style={{ fontSize: 11, opacity: 0.6 }}>(optional)</span></>}>
                      <input
                        value={directorModel}
                        onChange={e => setDirectorModel(e.target.value)}
                        placeholder="Leave blank to use loaded model"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </Row>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                      The director model evaluates turn order in group chats. Defaults to the main LM Studio server. A smaller, faster model is recommended.
                    </p>
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
