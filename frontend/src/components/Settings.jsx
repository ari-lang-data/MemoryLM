import {inputStyle,STORAGE_KEYS} from "../lib/constants";
import {Card, CardTitle, Row} from "./ui/shared";
import {saveStorage} from"../lib/storage";
export default function Settings({config,lmStudioUrl,setLmStudioUrl,setConfig,systemPrompt,
    setSystemPrompt,persistConfig,chats, lorebook, presets, updateActiveChat, setLorebook}
){
    return(
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 580 }}>
            <Card>
              <CardTitle>LM Studio connection</CardTitle>
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
              <textarea value={systemPrompt} onChange={e => { setSystemPrompt(e.target.value); persistConfig(config, e.target.value, lmStudioUrl); }} style={{ ...inputStyle, width: "100%", minHeight: 90, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} />
            </Card>

            <Card>
              <CardTitle>Memory parameters</CardTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Summarise every N turns",    key: "chunkEvery", min: 2,   max: 20,  step: 1 },
                  { label: "Top-K memories to retrieve", key: "topK",       min: 1,   max: 12,  step: 1 },
                  { label: "Retrieval threshold",        key: "threshold",  min: 0.1, max: 0.9, step: 0.05 },
                ].map(({ label, key, min, max, step }) => (
                  <Row key={key} label={label}>
                    <input type="range" min={min} max={max} step={step} value={config[key]} onChange={e => { const n = { ...config, [key]: parseFloat(e.target.value) }; setConfig(n); persistConfig(n, systemPrompt, lmStudioUrl); }} style={{ flex: 1 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, minWidth: 36, textAlign: "right" }}>{config[key]}</span>
                  </Row>
                ))}
                <Row label="Auto-summarise">
                  <input type="checkbox" checked={config.autoSummarise} onChange={e => { const n = { ...config, autoSummarise: e.target.checked }; setConfig(n); persistConfig(n, systemPrompt, lmStudioUrl); }} style={{ width: 16, height: 16 }} />
                </Row>
              </div>
            </Card>

            <Card>
              <CardTitle>Generation</CardTitle>
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

            <Card>
              <CardTitle>Data</CardTitle>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => { const blob = new Blob([JSON.stringify({ chats, lorebook, presets }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "memorylm_export.json"; a.click(); }} style={{ ...inputStyle, cursor: "pointer" }}>Export JSON</button>
                {/* FIX #9: clear messages/memories via updateActiveChat with no stale reference */}
                <button onClick={() => { if (confirm("Clear chat history?")) updateActiveChat(chat => ({ ...chat, messages: [], updatedAt: new Date().toISOString() }), true); }} style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Clear chat</button>
                <button onClick={() => { if (confirm("Clear all memories?")) updateActiveChat(chat => ({ ...chat, memories: [], updatedAt: new Date().toISOString() })); }} style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Clear memories</button>
                <button onClick={() => { if (confirm("Clear lorebook?")) { setLorebook([]); saveStorage(STORAGE_KEYS.lorebook, []); } }} style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>Clear lorebook</button>
              </div>
            </Card>
          </div>
    );
}