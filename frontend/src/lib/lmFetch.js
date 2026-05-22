export async function lmFetch(msgs, sysprompt, config, lmUrl) {
    const cfg  = config.current;
    const base = lmUrl.current.replace(/\/$/, "");
    const body = {
      messages: [{ role: "system", content: sysprompt }, ...msgs],
      max_tokens: 1000,
      temperature: cfg.temperature ?? 0.7,
      repetition_penalty: cfg.repetitionPenalty ?? 1.0,
    };
    if (cfg.modelName) body.model = cfg.modelName;
    const res  = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  }