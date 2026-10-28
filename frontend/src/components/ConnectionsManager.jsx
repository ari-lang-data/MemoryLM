import { useState, useEffect } from "react";
import { connectionsAPI } from "../lib/api";
import { inputStyle } from "../lib/constants";
import { Trash2, Star } from "lucide-react";

const PROVIDER_PRESETS = [
  { id: "lmstudio",   label: "LM Studio (local)",         type: "openai-compatible", base_url: "http://localhost:1234/v1", needsKey: false },
  { id: "ollama",     label: "Ollama (local)",            type: "openai-compatible", base_url: "http://localhost:11434/v1", needsKey: false },
  { id: "llamacpp",   label: "llama.cpp server (local)",  type: "openai-compatible", base_url: "http://localhost:8080/v1", needsKey: false },
  { id: "custom-oai", label: "Custom OpenAI-compatible",  type: "openai-compatible", base_url: "", needsKey: true },
  { id: "openai",     label: "OpenAI (cloud)",            type: "openai-compatible", base_url: "https://api.openai.com/v1", needsKey: true },
  { id: "anthropic",  label: "Anthropic (cloud)",         type: "anthropic",         base_url: "https://api.anthropic.com/v1", needsKey: true },
];

export default function ConnectionsManager() {
  const [connections, setConnections] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [presetId, setPresetId] = useState(PROVIDER_PRESETS[0].id);
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState(PROVIDER_PRESETS[0].base_url);
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState("medium");
  const [reasoningBudget, setReasoningBudget] = useState("");

  function refresh() { connectionsAPI.getAll().then(setConnections).catch(() => setConnections([])); }
  useEffect(() => { refresh(); }, []);

  function handlePresetChange(id) {
    setPresetId(id);
    setBaseUrl(PROVIDER_PRESETS.find(p => p.id === id).base_url);
  }

  async function handleCreate() {
    const preset = PROVIDER_PRESETS.find(p => p.id === presetId);
    if (!label.trim() || !baseUrl.trim() || !modelName.trim()) return;
    const wasEmpty = connections.length === 0;
    const result = await connectionsAPI.create({
      label: label.trim(), provider: preset.type, base_url: baseUrl.trim(),
      api_key: apiKey.trim() || null, model_name: modelName.trim(),
      reasoning_enabled: reasoningEnabled, reasoning_effort: reasoningEffort,
      reasoning_budget_tokens: reasoningBudget ? parseInt(reasoningBudget, 10) : null,
    });
    if (wasEmpty && result?.id) {
      await connectionsAPI.setDefault(result.id);
    }
    setLabel(""); setApiKey(""); setModelName(""); setReasoningEnabled(false); setReasoningBudget("");
    setFormOpen(false);
    refresh();
  }

  const [tests, setTests] = useState({});

  async function runTest(id) {
    setTests(t => ({ ...t, [id]: { pending: true } }));
    try { const r = await connectionsAPI.test(id); setTests(t => ({ ...t, [id]: r })); }
    catch (e) { setTests(t => ({ ...t, [id]: { ok: false, detail: e.message } })); }
  }

  const activePreset = PROVIDER_PRESETS.find(p => p.id === presetId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {connections.length === 0 && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>No connections yet — add one below.</p>}
      {connections.map(c => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-tertiary)", border: "0.5px solid var(--color-border-tertiary)" }}>
          <button onClick={() => connectionsAPI.setDefault(c.id).then(refresh)} title={c.is_default ? "Default" : "Set as default"} style={{ background: "transparent", border: "none", cursor: "pointer", color: c.is_default ? "var(--color-text-info)" : "var(--color-text-tertiary)", display: "flex" }}>
            <Star size={14} fill={c.is_default ? "currentColor" : "none"} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{c.label}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>{c.provider} · {c.model_name}{c.has_key ? ` · ${c.api_key_masked}` : ""}</p>
            {tests[c.id] && (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: tests[c.id].pending ? "var(--color-text-tertiary)" : tests[c.id].ok ? "var(--color-text-success)" : "var(--color-text-danger)" }}>
                {tests[c.id].pending ? "Testing…" : tests[c.id].detail}
              </p>
            )}
          </div>
          <button onClick={() => connectionsAPI.delete(c.id).then(refresh)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}><Trash2 size={14} /></button>
          <button onClick={() => runTest(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--color-text-info)" }}>Test</button>
        </div>
      ))}

      {!formOpen ? (
        <button onClick={() => setFormOpen(true)} style={{ ...inputStyle, cursor: "pointer", textAlign: "center" }}>+ Add connection</button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          <select value={presetId} onChange={e => handlePresetChange(e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
            {PROVIDER_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label, e.g. 'Main local model'" style={{ ...inputStyle, fontSize: 12 }} />
          <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="Base URL" style={{ ...inputStyle, fontSize: 12 }} />
          <input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Model name" style={{ ...inputStyle, fontSize: 12 }} />
          {activePreset.needsKey && <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API key" type="password" style={{ ...inputStyle, fontSize: 12, fontFamily: "var(--font-mono)" }} />}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input type="checkbox" checked={reasoningEnabled} onChange={e => setReasoningEnabled(e.target.checked)} style={{ width: 14, height: 14 }} />
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Enable reasoning</label>
          </div>

          {reasoningEnabled && (
            <>
              <select value={reasoningEffort} onChange={e => setReasoningEffort(e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
                <option value="low">Effort: Low</option>
                <option value="medium">Effort: Medium</option>
                <option value="high">Effort: High</option>
              </select>

              {activePreset.type === "anthropic" ? (
                <input
                  value={reasoningBudget}
                  onChange={e => setReasoningBudget(e.target.value)}
                  placeholder="Thinking budget (tokens, e.g. 4096)"
                  type="number"
                  style={{ ...inputStyle, fontSize: 12 }}
                />
              ) : (
                <p style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
                  Effort is forwarded to the model's chat template — actual behavior depends on whether the loaded model's template defines it. No separate token budget for this provider type; overall response length is still governed by the generation's max tokens.
                </p>
              )}
            </>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} style={{ ...inputStyle, flex: 1, cursor: "pointer", textAlign: "center" }}>Save</button>
            <button onClick={() => setFormOpen(false)} style={{ ...inputStyle, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}