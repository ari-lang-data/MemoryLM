import { streamChatCompletion } from "./api";

export async function lmFetch(msgs, sysprompt, configRef, lmUrlRef, onChunk = null, maxTokens = null) {
  const cfg = configRef.current;
  const messages = [{ role: "system", content: sysprompt }, ...msgs];

  let content = "";
  let reasoning = "";
  let finishReason = "stop";

  for await (const chunk of streamChatCompletion({
    messages,
    temperature: cfg.temperature ?? 0.7,
    maxTokens: maxTokens ?? 1000,
    extraParams: { repetition_penalty: cfg.repetitionPenalty ?? 1.0 },
  })) {
    if (chunk.error) throw new Error(chunk.error);
    if (chunk.delta) {
      content += chunk.delta;
      if (onChunk) onChunk(content, reasoning);
    }
    if (chunk.reasoning_delta) {
      reasoning += chunk.reasoning_delta;
      if (onChunk) onChunk(content, reasoning);
    }
    if (chunk.finish_reason) finishReason = chunk.finish_reason;
    if (chunk.done) break;
  }

  return { content, reasoning, finishReason };
}