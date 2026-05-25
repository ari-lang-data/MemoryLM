import { lmFetch } from "../lib/lmFetch";
import { memoriesAPI } from "../lib/api";
import useEmbedder from "./useEmbedder";
import { parseReasoning } from "../lib/parseReasoning";

export default function useMemory({ configRef, lmUrlRef, activeChatId, addLog, setMemories }) {
  const { embed } = useEmbedder();

  async function deduplicateAgainst(newSummary, newVec) {
    const cfg = configRef.current;
    if (cfg.dedupMode === "off") return null;

    // ChromaDB does the similarity search — no local cosineSim needed
    const near = await memoriesAPI.query(
      activeChatId,
      newVec,
      1,                      // only need the closest match
      cfg.dedupThreshold,
      1.0,
      0.0
    );

    if (near.length === 0) return null;

    if (cfg.dedupMode === "discard") {
      addLog(`Dedup: discarded near-duplicate (score ${near[0].score.toFixed(2)})`);
      return { action: "discard" };
    }

    // Merge mode — ask the LLM to combine them
    const {content: merged} = await lmFetch(
      [{ role: "user", content: `Memory A: ${near[0].summary}\n\nMemory B: ${newSummary}` }],
      "Merge two overlapping memory summaries into one concise summary preserving all unique detail. Output only the merged text, no preamble.",
      configRef,
      lmUrlRef
    );
    if (!merged) return null;

    const mergedVec = await embed(merged);
    addLog(`Dedup: merged with #${near[0].id} (score ${near[0].score.toFixed(2)})`);
    return { action: "merge", replaceId: near[0].id, merged, mergedVec };
  }

  async function summariseAndStore(turns) {
    const cfg = configRef.current;
    const transcript = turns
      .map(m => {
        const { content } = parseReasoning(m.content);
        return `${m.role === "user" ? "User" : "Assistant"}: ${content}`;
      })
      .join("\n");

    const {content: summary} = await lmFetch(
      [{ role: "user", content: `Summarise this conversation excerpt for long-term memory:\n\n${transcript}` }],
      "You are a memory extraction assistant. Produce a concise factual summary (3–6 sentences) covering what was discussed, decisions made, character details, and important context. Be specific. Output only the summary, no preamble.",
      configRef,
      lmUrlRef
    );
    if (!summary) return;

    const vec = await embed(summary);
    if (!vec) return;

    const dedup = await deduplicateAgainst(summary, vec);
    if (dedup?.action === "discard") return;

    if (dedup?.action === "merge") {
      await memoriesAPI.update(
        dedup.replaceId,
        dedup.merged,
        dedup.mergedVec,
        new Date().toISOString()
      );
      const updated = await memoriesAPI.getByChat(activeChatId);
      setMemories(updated);
      addLog(`Dedup: updated memory #${dedup.replaceId}`);
      return;
    }

    const entry = {
      id:        `mem_${Date.now()}`,
      chat_id:   activeChatId,
      summary,
      embedding: vec,
      source:    "auto",
      timestamp: new Date().toISOString(),
      turns:     turns.length,
    };
    await memoriesAPI.add(entry);
    const updated = await memoriesAPI.getByChat(activeChatId);
    setMemories(updated);
    addLog(`Auto-summarised ${turns.length} turns → stored #${entry.id}`);
  }

  async function addManualMemory(text) {
    const vec = await embed(text);
    if (!vec) return;
    const entry = {
      id:        `mem_${Date.now()}`,
      chat_id:   activeChatId,
      summary:   text,
      embedding: vec,
      source:    "manual",
      timestamp: new Date().toISOString(),
      turns:     0,
    };
    await memoriesAPI.add(entry);
    const updated = await memoriesAPI.getByChat(activeChatId);
    setMemories(updated);
    addLog(`Manual memory stored #${entry.id}`);
  }

  return { summariseAndStore, addManualMemory };
}