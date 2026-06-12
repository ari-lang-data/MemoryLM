// ─── Retrieval profiles ───────────────────────────────────────────────────────
export const RETRIEVAL_PROFILES = {
  creative: {
    alpha:      0.4,   // recency heavily weighted
    decayRate:  0.003, // slow decay — old events still matter
    threshold:  0.3,
    lorebookThreshold: 0.3,
    topK:       6,
  },
  factual: {
    alpha:      0.9,   // similarity dominates
    decayRate:  0.02,
    threshold:  0.45,  // precise retrieval
    lorebookThreshold: 0.4,
    topK:       3,
  },
  technical: {
    alpha:      1.0,   // pure similarity, no recency
    decayRate:  0.0,
    threshold:  0.5,
    lorebookThreshold: 0.5,
    topK:       2,
  },
  conversational: {
    alpha:      0.6,
    decayRate:  0.01,
    threshold:  0.3,
    lorebookThreshold: 0.3,
    topK:       3,
  },
  assistant: {
    alpha:      0.7,
    decayRate:  0.01,
    threshold:  0.35,
    lorebookThreshold: 0.35,
    topK:       4,
  },
};

// ─── Heuristic classifier ─────────────────────────────────────────────────────
const QUESTION_STARTERS = /^(who|what|when|where|why|how|is|are|was|were|does|did|can|could|would|should|will)\b/i;
const CODE_BLOCK        = /```[\s\S]*?```|`[^`]+`/;
const NARRATIVE_MARKERS = /\b(suddenly|meanwhile|slowly|quietly|whispered|replied|said|asked|turned|walked|stood|felt|looked)\b/i;

export function classifyContext(message, presetStyle) {
  // Preset style overrides classifier entirely
  if (presetStyle === "creative" || presetStyle === "roleplay") {
    return "creative";
  }
  if (presetStyle === "technical") {
    return "technical";
  }

  const text  = message.content ?? "";
  const words = text.trim().split(/\s+/).length;

  // Technical — code blocks or technical keywords
  if (CODE_BLOCK.test(text)) return "technical";

  // Factual — direct question
  if (text.trim().endsWith("?") || QUESTION_STARTERS.test(text.trim())) {
    return "factual";
  }

  // Creative continuation — narrative prose markers
  if (NARRATIVE_MARKERS.test(text) && words > 15) return "creative";

  // Conversational — short message, no question
  if (words < 20) return "conversational";

  // Default
  return "assistant";
}

export function getRetrievalProfile(message, presetStyle, configOverrides = {}) {
  const context = classifyContext(message, presetStyle);
  const profile = { ...RETRIEVAL_PROFILES[context] };

  // Config overrides from preset take precedence for alpha and decayRate
    if (configOverrides.alpha    !== undefined) profile.alpha    = configOverrides.alpha;
    if (configOverrides.decayRate !== undefined) profile.decayRate = configOverrides.decayRate;

  return { ...profile, context };
}