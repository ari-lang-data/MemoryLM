import { useState, useEffect, useRef, useCallback } from "react";
import { graphAPI } from "../lib/api";

const TYPE_COLORS = {
  character: "#7F77DD", location: "#1D9E75", faction: "#D85A30",
  item: "#BA7517", event: "#D4537E", concept: "#378ADD",
  lore: "#378ADD", rule: "#639922", other: "#888780"
};

const SPRING_LENGTH   = 120;
const SPRING_STRENGTH = 0.05;
const REPULSION       = 3000;
const DAMPING         = 0.85;
const MIN_ENERGY      = 0.01;
const HOVER_DELAY_MS  = 600;

function useDimensions(ref) {
  const [dims, setDims] = useState({ width: 600, height: 400 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return dims;
}

// Convert canvas-space coords to screen-space
function canvasToScreen(cx, cy, transform, canvasRect) {
  return {
    x: cx * transform.scale + transform.x + canvasRect.left,
    y: cy * transform.scale + transform.y + canvasRect.top,
  };
}

export default function GraphPanel({ activeChatId, activePresetId, activePreset, isRoleplay }) {
  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const animRef       = useRef(null);
  const settledRef = useRef(false);
  const nodesRef      = useRef([]);
  const edgesRef      = useRef([]);
  const draggingRef   = useRef(null);
  const offsetRef     = useRef({ x: 0, y: 0 });
  const transformRef  = useRef({ x: 0, y: 0, scale: 1 });
  const isPanningRef  = useRef(false);
  const panStartRef   = useRef({ x: 0, y: 0 });
  const hoverTimerRef = useRef(null);

  const dims          = useDimensions(containerRef);
  const [selected,    setSelected]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("all");

  // Hover card state: { node, screenX, screenY, card } | null
  const [hoverCard,   setHoverCard]   = useState(null);
  const hoverCardRef  = useRef(null); // for mouseenter guard

  // ── Load graph data ────────────────────────────────────────────────────────
  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const ents = await graphAPI.getEntities(activeChatId, activePresetId);
      const edgeSets = await Promise.all(ents.map(e => graphAPI.getEdges(e.id, "out")));
      const allEdges = edgeSets.flat();

      const seen = new Set();
      const uniqueEdges = allEdges.filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

      const canvas = canvasRef.current;
      const cw = canvas?.width  ?? 600;
      const ch = canvas?.height ?? 400;
      const cx = cw / 2;
      const cy = ch / 2;
      const r  = Math.min(cw, ch) * 0.3;

      nodesRef.current = ents.map((e, i) => {
        const angle = (i / ents.length) * Math.PI * 2;
        const meta  = typeof e.metadata === "string" ? JSON.parse(e.metadata) : (e.metadata ?? {});
        return {
          id: e.id, name: e.name, type: e.type, meta,
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          vx: 0, vy: 0,
        };
      });

      edgesRef.current = uniqueEdges.map(e => ({
        id: e.id, source: e.source_id, target: e.target_id,
        relationship: e.relationship, weight: e.weight ?? 1.0,
      }));

      settledRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [activeChatId, activePresetId]);

  useEffect(() => { loadGraph(); }, [activeChatId, activePresetId]);

  // ── Keyboard shortcuts (graph-scoped) ─────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      // Only fire when no input/textarea is focused
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case "r": case "R":
          transformRef.current = { x: 0, y: 0, scale: 1 };
          break;
        case "f": case "F":
          fitGraph();
          break;
        case "a": case "A":
          setFilter("all");
          break;
        case "c": case "C":
          setFilter("concept");
          break;
        case "h": case "H":
          setFilter("character");
          break;
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function fitGraph() {
    const nodes = nodesRef.current;
    if (!nodes.length) return;
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const padX = dims.width  * 0.1;
    const padY = dims.height * 0.1;
    const scaleX = (dims.width  - padX * 2) / (maxX - minX || 1);
    const scaleY = (dims.height - padY * 2) / (maxY - minY || 1);
    const scale  = Math.min(scaleX, scaleY, 2);
    transformRef.current = {
      scale,
      x: padX - minX * scale,
      y: padY - minY * scale,
    };
  }

  // ── Physics simulation ─────────────────────────────────────────────────────
  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (!nodes.length) return 0;

    let totalEnergy = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist  = Math.sqrt(dx*dx + dy*dy) || 1;
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx; nodes[i].vy -= fy;
        nodes[j].vx += fx; nodes[j].vy += fy;
      }
    }

    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    for (const edge of edges) {
      const src = nodeMap[edge.source];
      const tgt = nodeMap[edge.target];
      if (!src || !tgt) continue;
      const dx   = tgt.x - src.x;
      const dy   = tgt.y - src.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const force = (dist - SPRING_LENGTH * (1 / edge.weight)) * SPRING_STRENGTH;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      src.vx += fx; src.vy += fy;
      tgt.vx -= fx; tgt.vy -= fy;
    }

    const cx = dims.width / 2, cy = dims.height / 2;
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.001;
      n.vy += (cy - n.y) * 0.001;
    }

    for (const n of nodes) {
      if (n.pinned) continue;
      n.vx *= DAMPING; n.vy *= DAMPING;
      n.x  += n.vx;   n.y  += n.vy;
      totalEnergy += Math.abs(n.vx) + Math.abs(n.vy);
    }

    return totalEnergy;
  }, [dims]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x: tx, y: ty, scale } = transformRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    const nodeMap  = Object.fromEntries(nodesRef.current.map(n => [n.id, n]));
    const filtered = filter === "all"
      ? nodesRef.current
      : nodesRef.current.filter(n => n.type === filter);
    const filteredIds = new Set(filtered.map(n => n.id));

    for (const edge of edgesRef.current) {
      const src = nodeMap[edge.source];
      const tgt = nodeMap[edge.target];
      if (!src || !tgt) continue;
      if (!filteredIds.has(src.id) && !filteredIds.has(tgt.id)) continue;

      const hasReverse = edgesRef.current.some(e => e.source === edge.target && e.target === edge.source);
      const dx = tgt.x - src.x, dy = tgt.y - src.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const curveOffset = hasReverse ? 30 : 0;
      const px = -dy / dist * curveOffset, py = dx / dist * curveOffset;
      const cx = (src.x + tgt.x) / 2 + px, cy = (src.y + tgt.y) / 2 + py;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.quadraticCurveTo(cx, cy, tgt.x, tgt.y);
      ctx.strokeStyle = `rgba(255,255,255,${0.1 + edge.weight * 0.2})`;
      ctx.lineWidth   = edge.weight * 1.5;
      ctx.stroke();

      const arrowAngle = Math.atan2(tgt.y - cy, tgt.x - cx);
      const arrowX = tgt.x - Math.cos(arrowAngle) * 14;
      const arrowY = tgt.y - Math.sin(arrowAngle) * 14;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - Math.cos(arrowAngle - 0.4) * 8, arrowY - Math.sin(arrowAngle - 0.4) * 8);
      ctx.lineTo(arrowX - Math.cos(arrowAngle + 0.4) * 8, arrowY - Math.sin(arrowAngle + 0.4) * 8);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,255,255,${0.2 + edge.weight * 0.2})`;
      ctx.fill();

      ctx.font = "10px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.textAlign = "center";
      ctx.fillText(edge.relationship, cx, cy - 4);
    }

    for (const node of filtered) {
      const isSelected = selected?.id === node.id;
      const color      = TYPE_COLORS[node.type] ?? TYPE_COLORS.other;
      const radius     = isSelected ? 14 : 11;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = color + "33";
        ctx.fill();
      }

      if (node.meta?.avatar) {
        const img = new Image();
        img.src   = node.meta.avatar;
        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, node.x - radius, node.y - radius, radius * 2, radius * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = `${radius * 0.9}px system-ui`;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.name.charAt(0).toUpperCase(), node.x, node.y);
      }

      ctx.font      = isSelected ? "bold 11px system-ui" : "11px system-ui";
      ctx.fillStyle = isSelected ? "#fff" : "rgba(255,255,255,0.75)";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(node.name, node.x, node.y + radius + 13);
    }

    ctx.restore();
  }, [selected, filter]);

  // ── Animation loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    function loop() {
      if (!settledRef.current) {
        const energy = simulate();
        if (energy < MIN_ENERGY) settledRef.current = true;
      }
      draw();
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [simulate, draw]);

  // ── Node hit test ──────────────────────────────────────────────────────────
  function getNodeAt(clientX, clientY) {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const { x: tx, y: ty, scale } = transformRef.current;
    const mx = (clientX - rect.left - tx) / scale;
    const my = (clientY - rect.top  - ty) / scale;
    return nodesRef.current.find(n => {
      const dx = n.x - mx, dy = n.y - my;
      return Math.sqrt(dx*dx + dy*dy) < 14;
    }) ?? null;
  }

  // ── Hover card logic (roleplay only) ──────────────────────────────────────
  async function triggerHoverCard(node, clientX, clientY) {
    if (!isRoleplay) return;
    try {
      // Try to fetch character card first, fall back to entity
      let card = null;
      try {
        card = await graphAPI.getCharacter(node.id);
      } catch {
        card = await graphAPI.getEntity(node.id).catch(() => null);
      }
      if (!card) return;

      const canvas = canvasRef.current;
      const rect   = canvas.getBoundingClientRect();
      // Position card near the node in screen space, offset right
      const screen = canvasToScreen(node.x, node.y, transformRef.current, rect);

      setHoverCard({ node, screenX: screen.x + 20, screenY: screen.y - 10, card });
    } catch { /* ignore */ }
  }

  function scheduleHoverCard(node, clientX, clientY) {
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => triggerHoverCard(node, clientX, clientY), HOVER_DELAY_MS);
  }

  function clearHoverTimer() {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
  }

  function dismissHoverCard() {
    clearHoverTimer();
    setHoverCard(null);
  }

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  function onMouseDown(e) {
    dismissHoverCard();
    const node = getNodeAt(e.clientX, e.clientY);
    if (node) {
      draggingRef.current = node;
      node.pinned = true;
      const canvas = canvasRef.current;
      const rect   = canvas.getBoundingClientRect();
      const { x: tx, y: ty, scale } = transformRef.current;
      offsetRef.current = {
        x: (e.clientX - rect.left - tx) / scale - node.x,
        y: (e.clientY - rect.top  - ty) / scale - node.y,
      };
      setSelected(node);
    } else {
      isPanningRef.current = true;
      panStartRef.current  = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
    }
  }

  function onMouseMove(e) {
    if (draggingRef.current) {
      clearHoverTimer();
      const canvas = canvasRef.current;
      const rect   = canvas.getBoundingClientRect();
      const { x: tx, y: ty, scale } = transformRef.current;
      draggingRef.current.x = (e.clientX - rect.left - tx) / scale - offsetRef.current.x;
      draggingRef.current.y = (e.clientY - rect.top  - ty) / scale - offsetRef.current.y;
      return;
    }
    if (isPanningRef.current) {
      clearHoverTimer();
      transformRef.current.x = e.clientX - panStartRef.current.x;
      transformRef.current.y = e.clientY - panStartRef.current.y;
      return;
    }
    // Hover detection
    const node = getNodeAt(e.clientX, e.clientY);
    if (node && isRoleplay) {
      if (!hoverCard || hoverCard.node.id !== node.id) {
        scheduleHoverCard(node, e.clientX, e.clientY);
      }
    } else {
      clearHoverTimer();
    }
  }

  function onMouseUp() {
    if (draggingRef.current) draggingRef.current = null;
    isPanningRef.current = false;
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    transformRef.current.scale = Math.min(3, Math.max(0.2, transformRef.current.scale * delta));
  }

  const types = ["all", ...new Set(nodesRef.current.map(n => n.type))];

  const inputStyle = {
    padding: "5px 10px", borderRadius: "var(--border-radius-md)",
    border: "0.5px solid var(--color-border-tertiary)",
    background: "var(--color-background-secondary)",
    color: "var(--color-text-primary)", fontSize: 12,
    fontFamily: "var(--font-sans)",
  };

  return (
    <div ref={containerRef} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%", position: "relative" }}>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Filter:</span>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ ...inputStyle, cursor: "pointer", borderColor: filter === t ? "var(--color-border-primary)" : undefined, color: filter === t ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
            {t}
          </button>
        ))}
        <button onClick={loadGraph}  style={{ ...inputStyle, cursor: "pointer", marginLeft: "auto" }}>↺ Refresh</button>
        <button onClick={() => { transformRef.current = { x: 0, y: 0, scale: 1 }; }} style={{ ...inputStyle, cursor: "pointer" }}>Reset view</button>
      </div>

      {/* Canvas */}
      {loading
        ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>Loading graph…</div>
        : nodesRef.current.length === 0
          ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>No entities yet. Start a conversation or add characters to build the graph.</div>
          : <canvas
              ref={canvasRef}
              width={dims.width}
              height={dims.height - 44}
              style={{ flex: 1, cursor: "grab" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => { onMouseUp(); clearHoverTimer(); }}
              onWheel={onWheel}
            />
      }

      {/* Selected node info panel */}
      {selected && (
        <div style={{ position: "absolute", bottom: 16, left: 16, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "10px 14px", maxWidth: 240, zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500 }}>{selected.name}</p>
              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: "var(--border-radius-md)", background: (TYPE_COLORS[selected.type] ?? TYPE_COLORS.other) + "22", color: TYPE_COLORS[selected.type] ?? TYPE_COLORS.other, border: `0.5px solid ${(TYPE_COLORS[selected.type] ?? TYPE_COLORS.other)}66` }}>{selected.type}</span>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 16 }}>×</button>
          </div>
        </div>
      )}

      {/* Hover character/lore card — roleplay mode only */}
      {hoverCard && (
        <div
          ref={hoverCardRef}
          onMouseEnter={clearHoverTimer}
          onMouseLeave={dismissHoverCard}
          style={{
            position:      "fixed",
            left:          Math.min(hoverCard.screenX, window.innerWidth - 280),
            top:           Math.max(hoverCard.screenY, 8),
            zIndex:        50,
            width:         260,
            background:    "var(--color-background-primary)",
            border:        "0.5px solid var(--color-border-secondary)",
            borderRadius:  "var(--border-radius-lg)",
            boxShadow:     "0 8px 32px rgba(0,0,0,0.4)",
            padding:       "12px 14px",
            display:       "flex",
            flexDirection: "column",
            gap:           8,
            pointerEvents: "auto",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {hoverCard.card.metadata && (() => {
              const meta = typeof hoverCard.card.metadata === "string"
                ? JSON.parse(hoverCard.card.metadata) : hoverCard.card.metadata;
              return meta?.avatar
                ? <img src={meta.avatar} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                : null;
            })()}
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{hoverCard.card.name}</p>
              <span style={{ fontSize: 11, color: TYPE_COLORS[hoverCard.card.type] ?? TYPE_COLORS.other }}>
                {hoverCard.card.type}
              </span>
            </div>
          </div>

          {/* Card fields — show whichever are populated */}
          {hoverCard.card.description && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {hoverCard.card.description.slice(0, 160)}{hoverCard.card.description.length > 160 ? "…" : ""}
            </p>
          )}
          {[
            { key: "appearance",       label: "Appearance" },
            { key: "behaviour",        label: "Behaviour" },
            { key: "speech_pattern",   label: "Speech" },
            { key: "narrative_alias",  label: "Known as" },
          ].map(({ key, label }) => hoverCard.card[key] ? (
            <div key={key}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-tertiary)" }}>{label}</span>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.45 }}>
                {hoverCard.card[key].slice(0, 100)}{hoverCard.card[key].length > 100 ? "…" : ""}
              </p>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}