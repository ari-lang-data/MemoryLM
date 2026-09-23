import { useEffect, useState } from "react";
import { Brain, BookOpen, Share2, Users, Clock } from "lucide-react";

const NODES = [
  { label: "Memory",     angle: -90, Icon: Brain    },
  { label: "Lorebook",   angle: -18, Icon: BookOpen },
  { label: "Graph",      angle: 54,  Icon: Share2   },
  { label: "Roleplay",   angle: 126, Icon: Users    },
  { label: "World-Time", angle: 198, Icon: Clock    },
];

export default function CapabilitiesDiagram({ graphAPI }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    graphAPI.getStats().then(setStats).catch(() => setStats(null));
  }, [graphAPI]);

  const hasData = stats && (stats.entityCount > 0 || stats.edgeCount > 0);
  const cx = 140, cy = 130, r = 92, nodeR = 22;

  return (
    <div>
      <svg viewBox="0 0 280 260" style={{ width: "100%", height: "auto" }}>
        <defs>
          <filter id="capnode-icon-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" floodColor="#000" floodOpacity="0.45" />
          </filter>
          {NODES.map(n => {
            const rad = (n.angle * Math.PI) / 180;
            const x = cx + r * Math.cos(rad);
            const y = cy + r * Math.sin(rad);
            return (
              // Gradient runs hub → node, along that node's own spoke — each
              // direction is different, but all obey the same "light radiates
              // outward from centre" rule, so the set reads as one coherent
              // scheme rather than five arbitrary angles.
              <linearGradient
                key={`grad-${n.label}`}
                id={`capnode-grad-${n.label}`}
                gradientUnits="userSpaceOnUse"
                x1={cx} y1={cy} x2={x} y2={y}
              >
                <stop offset="0%" stopColor="var(--color-rim-accent-1)" />
                <stop offset="100%" stopColor="var(--color-rim-accent-2)" />
              </linearGradient>
            );
          })}
        </defs>

        {NODES.map(n => {
          const rad = (n.angle * Math.PI) / 180;
          const x = cx + r * Math.cos(rad);
          const y = cy + r * Math.sin(rad);
          return <line key={`line-${n.label}`} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border-secondary)" strokeWidth="1" />;
        })}

        <circle cx={cx} cy={cy} r="26" fill="var(--color-background-secondary)" stroke="var(--color-border-primary)" strokeWidth="1" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="var(--color-text-primary)" fontFamily="var(--font-sans)">MemoryLM</text>

        {NODES.map(n => {
          const rad = (n.angle * Math.PI) / 180;
          const x = cx + r * Math.cos(rad);
          const y = cy + r * Math.sin(rad);
          const iconSize = 18;
          return (
            <g key={n.label}>
              <circle cx={x} cy={y} r={nodeR} fill={`url(#capnode-grad-${n.label})`} stroke="var(--color-border-tertiary)" strokeWidth="1" />
              <n.Icon
                x={x - iconSize / 2} y={y - iconSize / 2}
                width={iconSize} height={iconSize}
                color="#ffffff" strokeWidth={2}
                style={{ filter: "url(#capnode-icon-shadow)" }}
              />
              <text x={x} y={y + nodeR + 14} textAnchor="middle" fontSize="10.5" fill="var(--color-text-secondary)" fontFamily="var(--font-sans)">{n.label}</text>
            </g>
          );
        })}
      </svg>

      <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--color-text-tertiary)", marginTop: 4 }}>
        {hasData
          ? `${stats.entityCount} entities · ${stats.edgeCount} connections across your world`
          : "Characters, lore, and their relationships will show up here as you build your world."}
      </p>
    </div>
  );
}