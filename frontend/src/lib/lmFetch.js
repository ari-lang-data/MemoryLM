export async function lmFetch(msgs, sysprompt, configRef, lmUrlRef, onChunk = null) {
  const cfg  = configRef.current;
  const base = lmUrlRef.current.replace(/\/$/, "");
  const body = {
    messages:           [{ role: "system", content: sysprompt }, ...msgs],
    max_tokens:         1000,
    temperature:        cfg.temperature ?? 0.7,
    repetition_penalty: cfg.repetitionPenalty ?? 1.0,
    stream:             !!onChunk,  // only stream if callback provided
  };
  if (cfg.modelName) body.model = cfg.modelName;

  const res = await fetch(`${base}/v1/chat/completions`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  // Non-streaming path — unchanged
  if (!onChunk) {
    const data = await res.json();
    const choice = data.choices?.[0];
    return {
      content:      choice?.message?.content ?? null,
      finishReason: choice?.finish_reason ?? "stop",
    };
  }

  // Streaming path
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer      = "";
  let content     = "";
  let finishReason = "stop";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data);
        const delta  = parsed.choices?.[0]?.delta?.content;
        const reason = parsed.choices?.[0]?.finish_reason;
        if (delta) {
          content += delta;
          onChunk(content);  // call with accumulated content so far
        }
        if (reason) finishReason = reason;
      } catch { /* malformed chunk, skip */ }
    }
  }

  return { content, finishReason };
}