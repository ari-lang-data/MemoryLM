// ─── Constants ────────────────────────────────────────────────────────────────
export const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";
export const DEFAULT_LM_STUDIO_URL = "http://localhost:1234";
export const DEDUP_THRESHOLD = 0.85;

export const STORAGE_KEYS = {
  chats:        "mem_chats",
  activeChat:   "mem_active_chat",
  memories:     "mem_memories",
  lorebook:     "mem_lorebook",
  config:       "mem_config",
  messages:     "mem_messages",
  presets:      "mem_presets",
  activePreset: "mem_active_preset",
};

// ─── Default presets ──────────────────────────────────────────────────────────
export const DEFAULT_PRESETS = [
  {
    id: "assistant",
    name: "Assistant",
    icon: "🤖",
    systemPrompt: "You are a helpful, precise assistant.",
    config: {
      chunkEvery: 6, topK: 3, threshold: 0.4, temperature: 0.5,
      autoSummarise: true, dedupMode: "discard", dedupThreshold: 0.85,
      modelName: "", alpha: 0.7, decayRate: 0.01,
      style: "none", continuationPrompt: "Advance the narrative.", branchMode: "replace", contextWindow: 10
    },
  },
  {
    id: "creative",
    name: "Creative / RP",
    icon: "🪶",
    systemPrompt: "You are a creative collaborator and storyteller. Stay in character, write vividly, and maintain narrative continuity.",
    config: {
      chunkEvery: 3, topK: 6, threshold: 0.3, temperature: 0.7,
      repetitionPenalty: 1.1, autoSummarise: true, dedupMode: "merge",
      dedupThreshold: 0.88, modelName: "", alpha: 0.5, decayRate: 0.005,
      style: "creative", continuationPrompt: "Advance the narrative.", branchMode: "inline", contextWindow: 20
    },
  },
  {
    id: "roleplay",
    name: "Roleplay",
    icon: "🎭",
    systemPrompt: "You are {$char}. Stay in character at all times. Respond only as {$char} would, maintaining their personality, speech patterns, and worldview.",
    config: {
      chunkEvery: 3, topK: 6, threshold: 0.2, temperature: 0.8,
      repetitionPenalty: 1.05, autoSummarise: true, dedupMode: "merge",
      dedupThreshold: 0.88, modelName: "", alpha: 0.4, decayRate: 0.003,
      style: "roleplay", continuationPrompt: "Continue the scene.",
      branchMode: "inline", contextWindow: 20,
    },
  },
  {
    id: "coding",
    name: "Coding",
    icon: "💻",
    systemPrompt: "You are an expert programmer. Be concise, correct, and prefer working code over explanation unless asked.",
    config: {
      chunkEvery: 8, topK: 2, threshold: 0.5, temperature: 0.5,
      repetitionPenalty: 1.1, autoSummarise: true, dedupMode: "discard",
      dedupThreshold: 0.9, modelName: "", alpha: 0.8, decayRate: 0.02,
      style: "technical", continuationPrompt: "Continue.", branchMode: "replace", contextWindow: 6
    },
  },
];

export const inputStyle = {
  padding: "7px 10px",
  borderRadius: "var(--border-radius-md)",
  border: "0.5px solid var(--color-border-tertiary)",
  background: "var(--color-background-secondary)",
  color: "var(--color-text-primary)",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
};