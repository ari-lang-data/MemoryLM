/**
 * Splits a model response into reasoning and content.
 * Handles <think>...</think> blocks (DeepSeek-R1, QwQ)
 * and any other common reasoning delimiters.
 */
export function parseReasoning(raw) {
  if (!raw) return { reasoning: null, content: raw };

  // Match <think>...</think> blocks (greedy, handles multiline)
  const thinkMatch = raw.match(/^<think>([\s\S]*?)<\/think>\s*/i);
  if (thinkMatch) {
    return {
      reasoning: thinkMatch[1].trim(),
      content:   raw.slice(thinkMatch[0].length).trim(),
    };
  }

  // Some models use <reasoning>...</reasoning>
  const reasoningMatch = raw.match(/^<reasoning>([\s\S]*?)<\/reasoning>\s*/i);
  if (reasoningMatch) {
    return {
      reasoning: reasoningMatch[1].trim(),
      content:   raw.slice(reasoningMatch[0].length).trim(),
    };
  }

  // Gemma 4 — <|channel> thought ... <channel|>
  const gemmaMatch = raw.match(/^<\|channel\s*>\s*([\s\S]*?)\s*<channel\|>\s*/i);
  if (gemmaMatch) {
    return {
      reasoning: gemmaMatch[1].trim(),
      content:   raw.slice(gemmaMatch[0].length).trim(),
    };
  }

  // No reasoning block found
  return { reasoning: null, content: raw };
}