import { useState, useEffect, useRef } from "react";
import { Settings as GearIcon, MoreVertical, Archive, Trash2, Plus, GitBranch, MessageSquare, Brain, BookOpen, Share2, Users, Home as HomeIcon } from "lucide-react";
import { frostedGlassValues } from "../lib/fermiDirac";
import { formatRelativeChatTime } from "../lib/formatRelativeChatTime";
import { useHasHover } from "../hooks/useHasHover";

const { bgAlpha, blurPx, saturate } = frostedGlassValues();
const PANEL_ICONS = { chat: MessageSquare, memory: Brain, lorebook: BookOpen, graph: Share2, characters: Users };

export default function ChatSidebar({
  isOpen, onClose, chats, activeChatId, onSelectChat, onNewChat,
  onDeleteChat, onArchiveChat, onRenameChat, onOpenSettings,
  isMobile, activePanel, setActivePanel, config, confirm
}) {
  const [renamingId,  setRenamingId]  = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [menuOpenId,  setMenuOpenId]  = useState(null);
  const sidebarRef   = useRef(null);
  const menuRef      = useRef(null);
  const clickTimerRef = useRef(null);
  const [showArchived, setShowArchived] = useState(false);

  const hasHover = useHasHover();

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!menuOpenId) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  function confirmRename(id) {
    if (renameDraft.trim()) onRenameChat(id, renameDraft.trim());
    setRenamingId(null);
    setRenameDraft("");
  }

  function handleChatClick(chatId) {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (renamingId !== chatId) {
        onSelectChat(chatId);
        onClose();
      }
    }, 220);
  }

  function handleChatDoubleClick(e, chat) {
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setRenamingId(chat.id);
    setRenameDraft(chat.title);
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "transparent",
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{
          position:        "fixed",
          top:             44.35,
          left:            0,
          bottom:          0,
          width:           260,
          background:      `rgba(var(--glass-rgb), ${bgAlpha})`,
          backdropFilter:  `blur(${blurPx}px) saturate(${saturate})`,
          WebkitBackdropFilter: `blur(${blurPx}px) saturate(${saturate})`,
          borderRight:     "0.5px solid rgba(255,255,255,0.07)",
          display:         "flex",
          flexDirection:   "column",
          zIndex:          100,
          transform:       isOpen ? "translateX(0)" : "translateX(-100%)",
          transition:      "transform 0.5s ease",
          boxShadow:       isOpen ? "4px 0 32px rgba(0,0,0,0.4)" : "none",
        }}
      >

        {/* Archived + new button */}
        <div style={{ display: "flex",  flexDirection: "column", padding: "12px 14px", flexShrink: 0 }}>
          <button 
            onClick={onNewChat} 
            style={{ 
              display: "flex", background: "transparent", fontFamily: "var(--font-stylized)",
              border: "0.5px solid rgba(255,255,255,0.1)", 
              borderRadius: "var(--border-radius-md)", margin: "4px 8px",
              cursor: "pointer", color: "var(--color-text-secondary)", 
              fontSize: 13, padding: "10px 14px", flexDirection: "row", 
              lineHeight: 1.5, alignItems: "center", gap: 6 
            }}>
              <Plus size={15}/> New Chat
          </button>
          <button
            onClick={() => { setActivePanel("home"); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", margin: "4px 8px", fontFamily: "var(--font-stylized)",
              borderRadius: "var(--border-radius-md)",
              background: activePanel === "home" ? "var(--color-background-secondary)" : "transparent",
              border: "none", cursor: "pointer",
              color: activePanel === "home" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontSize: 13, fontWeight: activePanel === "home" ? 500 : 400, textAlign: "left",
            }}
          >
            <HomeIcon size={15} />
            Home
          </button>
          {/* Mobile-only panel nav — desktop keeps these in the header */}
          {isMobile && (
            <div style={{ display: "flex", flexDirection: "column", padding: "6px 8px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              {["chat","memory","lorebook","graph", ...(config?.style === "roleplay" ? ["characters"] : [])].map(p => {
                const Icon = PANEL_ICONS[p];
                return (
                  <button
                    key={p}
                    onClick={() => { setActivePanel(p); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: "var(--border-radius-md)",
                      background: activePanel === p ? `rgba(var(--glass-rgb),0.7)` : "transparent",
                      border: "none", borderLeft: activePanel === p ? "2px solid var(--color-border-select)" : "2px solid transparent",
                      cursor: "pointer", fontFamily: "var(--font-stylized)",
                      color: activePanel === p ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      fontSize: 13, fontWeight: activePanel === p ? 500 : 400, textAlign: "left",
                    }}
                  >
                    <Icon size={15} />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                );
              })}
            </div>
          )}
            <button
              onClick={() => setShowArchived(true)}
               style={{ 
                  display: "flex", fontSize: 13, fontWeight: 500, background: "transparent", 
                  border: "none", cursor: "pointer", padding: "10px 14px 2px", margin: "4px 8px",
                  color: showArchived ? "var(--color-text-primary)" : "var(--color-text-secondary)", 
                  alignItems: "center", gap: 10, fontFamily: "var(--font-stylized)" }}
            > <Archive size={15}/> Archived
            </button>
        </div>

        {/* Chat list */}
        <div style={{ display: "flex", gap: 6, padding: "8px 14px 2px", borderTop: "2px solid var(--color-border-secondary)" }}>
              <button
                onClick={() => setShowArchived(false)}
                style={{ fontSize: 13, fontWeight: 500, background: "transparent", border: "none", cursor: "pointer", color: !showArchived ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}
              >Chats</button>
            </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {chats.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 24 }}>No chats yet.</p>
          )}
          {chats.filter(c => showArchived ? c.archived : !c.archived)
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
          .length === 0 && (
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 24 }}>
              {showArchived ? "No archived chats." : "No chats yet."}
            </p>
          )}
          {chats.filter(c => showArchived ? c.archived : !c.archived)
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
          .map(chat => {
            const isBranch    = /\(branch\)$/.test(chat.title);
            const displayTitle = isBranch ? chat.title.replace(/\s*\(branch\)$/, "") : chat.title;

            return (
              <div
                key={chat.id}
                onDoubleClick={e => handleChatDoubleClick(e, chat)}
                onClick={() => handleChatClick(chat.id)}
                style={{
                  display: "flex", flexDirection: "column", gap: 2,
                  padding: "8px 14px", cursor: "pointer",
                  background: activeChatId === chat.id ? "rgba(255,255,255,0.06)" : "transparent",
                  borderLeft: activeChatId === chat.id ? "2px solid var(--color-border-select)" : "2px solid transparent",
                  borderRadius: "var(--border-radius-md)",
                  width: "96%",
                  margin: "0 auto",
                  transition: "background 0.1s",
                }}
                onMouseEnter={hasHover ? (e => { if (activeChatId !== chat.id) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }) : undefined}
                onMouseLeave={hasHover ? (e => { if (activeChatId !== chat.id) e.currentTarget.style.background = "transparent"; }) : undefined}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {renamingId === chat.id ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={e => setRenameDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter")  { e.stopPropagation(); confirmRename(chat.id); }
                        if (e.key === "Escape") { setRenamingId(null); setRenameDraft(""); }
                      }}
                      onBlur={() => confirmRename(chat.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ flex: 1, fontSize: 13, background: "var(--color-background-tertiary)", border: "0.5px solid var(--color-border-primary)", borderRadius: "var(--border-radius-sm)", padding: "2px 6px", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
                    />
                  ) : (
                    <span
                      style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title="Double-click to rename"
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{displayTitle}</span>
                    </span>
                  )}

                  <div style={{ position: "relative", flexShrink: 0 }} ref={menuOpenId === chat.id ? menuRef : null}>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === chat.id ? null : chat.id); }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", display: "flex", padding: 2, opacity: 0.6 }}
                      title="Chat options"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {menuOpenId === chat.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 110,
                          background: "var(--color-background-secondary)",
                          border: "0.5px solid var(--color-border-primary)",
                          borderRadius: "var(--border-radius-md)",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                          minWidth: 140, overflow: "hidden",
                        }}
                      >
                        {[
                          { icon: <Archive size={13} />, label: chat.archived ? "Unarchive" : "Archive", act: () => onArchiveChat(chat.id), colour: "var(--color-text-primary)", confirmMessage: "Archive this chat?" },
                          { icon: <Trash2 size={13} />,  label: "Delete",   act: () => onDeleteChat(chat.id), colour: "#e5726c", confirmMessage: "Delete this chat?" },
                        ].map(item => (
                          <button
                            key={item.label}
                            onClick={async () => { setMenuOpenId(null); if ( await confirm(item.confirmMessage)) item.act();} }
                            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", color: item.colour, fontSize: 12.5, textAlign: "left" }}
                            onMouseEnter={hasHover ? (e => e.currentTarget.style.background = "rgba(255,255,255,0.05)") : undefined}
                            onMouseLeave={hasHover ? (e => e.currentTarget.style.background = "transparent") : undefined}
                          >
                            {item.icon}{item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <span
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--color-text-primary)", overflow: "hidden" }}
                  >
                  {isBranch && <GitBranch size={11} style={{ flexShrink: 0, opacity: 0.55 }} />} 
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", paddingLeft: isBranch ? 16 : 0 }}>
                    {formatRelativeChatTime(chat.updated_at)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer — pinned gear icon */}
        <div style={{
          flexShrink:   0,
          padding:      "10px 14px",
          borderTop:    "0.5px solid rgba(255,255,255,0.06)",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "flex-end",
        }}>
          <button
            onClick={() => { onClose(); onOpenSettings(); }}
            title="Settings"
            style={{
              background:   "transparent",
              border:       "none",
              cursor:       "pointer",
              color:        "var(--color-text-tertiary)",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              padding:      6,
              borderRadius: "var(--border-radius-md)",
              transition:   "color 0.15s",
            }}
            onMouseEnter={hasHover ? (e => e.currentTarget.style.color = "var(--color-text-secondary)") : undefined}
            onMouseLeave={hasHover ? (e => e.currentTarget.style.color = "var(--color-text-tertiary)") : undefined}
          >
            <GearIcon size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
