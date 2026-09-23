import { useMemo } from "react";
import { formatRelativeChatTime } from "../lib/formatRelativeChatTime";
import { useIsMobile } from "../hooks/useIsMobile";
import CapabilitiesDiagram from "./CapabilitiesDiagram";
import LogoMonogram from "./icons/LogoMonogram";

const TAGLINES = [
  "It remembers so you don't have to pretend you do.",
  "Your characters have better memories than you do.",
  "Context is temporary. Grudges are forever.",
  "The only AI here with object permanence.",
  "Somewhere, a chat log is very grateful this exists.",
];

export default function Home({ chats, switchChat, setActivePanel, graphAPI }) {
  const tagline = useMemo(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)], []);
  const isMobile = useIsMobile();

  const recentChats = chats
    .filter(c => !c.archived)
    .slice()
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6);

  const RecentChats = (
    <div style={{ flex: 1, minWidth: 280 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 10 }}>Recent chats</p>
      {recentChats.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>No chats yet — start one from the sidebar.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {recentChats.map(c => (
            <button
              key={c.id}
              onClick={() => { switchChat(c.id); setActivePanel("chat"); }}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left",
                padding: "10px 14px", borderRadius: "var(--border-radius-md)",
                border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)",
                cursor: "pointer", color: "var(--color-text-primary)",
              }}
            >
              <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.title.replace(/\s*\(branch\)$/, "")}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", flexShrink: 0, marginLeft: 10 }}>
                {formatRelativeChatTime(c.updated_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const Capabilities = (
    <div style={{ flex: 1, minWidth: 280 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 10 }}>What MemoryLM does</p>
      <CapabilitiesDiagram graphAPI={graphAPI} />
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px" }}>
      <img src="/logo.png" alt="MemoryLM" style={{ width: 88, height: 88, flexShrink: 0 }} />
      <h1 style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 32, margin: "16px 0 4px", letterSpacing: "-0.5px", color: "var(--color-text-primary)" }}>
        MemoryLM
      </h1>
      <p style={{ fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 15, color: "var(--color-text-secondary)", margin: 0, textAlign: "center" }}>
        {tagline}
      </p>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 32, width: "100%", maxWidth: 960, marginTop: 48 }}>
        {RecentChats}
        {Capabilities}
      </div>
    </div>
  );
}