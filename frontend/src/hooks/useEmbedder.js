import { useState,useRef,useEffect,useCallback } from "react";
import {EMBED_MODEL} from "../lib/constants"
export default function useEmbedder() {
  const [embedderStatus, setEmbedderStatus] = useState("idle");
  const pipelineRef = useRef(null);

  const initEmbedder = useCallback(async () => {
    if (pipelineRef.current) return pipelineRef.current;
    setEmbedderStatus("loading");
    try {
      const { pipeline, env } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js");
      env.allowLocalModels = false;
      const pipe = await pipeline("feature-extraction", EMBED_MODEL, { quantized: true });
      pipelineRef.current = pipe;
      setEmbedderStatus("ready");
      return pipe;
    } catch(e) {
      setEmbedderStatus("error");
      console.error(e);
      return null;
    }
  }, []);

  useEffect(() => { initEmbedder(); }, [initEmbedder]);

  async function embed(text) {
    const pipe = pipelineRef.current || await initEmbedder();
    if (!pipe) return null;
    const out = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data);
  }

  return { status: embedderStatus, embed };
}