import { useState, useRef, useEffect } from "react";
import {inputStyle,STORAGE_KEYS} from "../lib/constants";
import {Card, CardTitle, Row} from "./ui/shared";
import {saveStorage} from"../lib/storage";
import { messagesAPI, memoriesAPI } from "../lib/api";

const TABS = [
  { id: "connection", label: "Connection" },
  { id: "memory",     label: "Memory" },
  { id: "generation", label: "Generation" },
  { id: "data",       label: "Data" },
];

export default function Settings({
  lmStudioUrl, setLmStudioUrl,
  config, setConfig,
  persistConfig,
  systemPrompt, setSystemPrompt,
  lorebook, setLorebook,
  activeChatId,
  setNodes, setActiveChildren,
  setMemories, graphAPI
}) {
  const [settingsTab, setSettingsTab] = useState("connection");

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 580 }}>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 3, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8 }}>
        {TABS.map(t => (
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
              style={{ ...inputStyle, width: "100%", minHeight: 90, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
            />
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Note: system prompt is overridden when a preset is applied.
            </p>
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
                { label: "Summarise every N turns",    key: "chunkEvery", min: 2,   max: 20,  step: 1 },
                { label: "Top-K memories to retrieve", key: "topK",       min: 1,   max: 12,  step: 1 },
                { label: "Retrieval threshold",        key: "threshold",  min: 0.1, max: 0.9, step: 0.05 },
                { label: "Similarity weight (alpha)",  key: "alpha",      min: 0.1, max: 1.0, step: 0.05 },
                { label: "Recency decay rate",         key: "decayRate",  min: 0.001, max: 0.1, step: 0.001 },
                { label: "Context window (turns, 0=unlimited)", key: "contextWindow", min: 0, max: 50, step: 2 },
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
                  graphAPI.getEntities(activeChatId, activePresetId),
                  graphAPI.getTemplateVars(activePresetId),
                ]);

                // Get all edges for all entities
                const edgeSets = await Promise.all(
                  entities.map(e => graphAPI.getEdges(e.id, "out"))
                );
                const allEdges = edgeSets.flat();

                // Get character cards
                const characters = await graphAPI.getCharacters(activePresetId);

                const exportData = {
                  exportedAt:   new Date().toISOString(),
                  lorebook,
                  entities,
                  edges:        allEdges,
                  characters,
                  templateVars,
                };

                const blob = new Blob(
                  [JSON.stringify(exportData, null, 2)],
                  { type: "application/json" }
                );
                const a    = document.createElement("a");
                a.href     = URL.createObjectURL(blob);
                a.download = `memorylm_export_${new Date().toISOString().slice(0,10)}.json`;
                a.click();
              } catch(e) {
                console.error("Export failed:", e);
              }
            }} style={{ ...inputStyle, cursor: "pointer" }}>Export JSON</button>
            <button onClick={async () => {
              if (confirm("Clear chat history?")) {
                setNodes([]);
                setActiveChildren({});
                await messagesAPI.clear(activeChatId);
              }
            }} style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Clear chat</button>
            <button onClick={async () => {
              if (confirm("Clear all memories?")) {
                await memoriesAPI.clearChat(activeChatId);
                setMemories([]);
              }
            }} style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Clear memories</button>
            <button onClick={() => {
              if (confirm("Clear lorebook?")) {
                setLorebook([]);
                saveStorage(STORAGE_KEYS.lorebook, []);
              }
            }} style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Clear lorebook</button>
          </div>
        </Card>
      )}

    </div>
  );
}