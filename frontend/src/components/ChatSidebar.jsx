import { useState, useEffect, useRef } from "react";

export default function ChatSidebar({ 
  isOpen, 
  onClose, 
  chats, 
  activeChatId, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat,
  onRenameChat,
}) {
  const [renamingId,    setRenamingId]    = useState(null);
  const [renameDraft,   setRenameDraft]   = useState("");
  const sidebarRef = useRef(null);

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

  function confirmRename(id) {
    if (renameDraft.trim()) onRenameChat(id, renameDraft.trim());
    setRenamingId(null);
    setRenameDraft("");
  }

  const clickTimerRef = useRef(null);

    function handleChatClick(chatId) {
    if (clickTimerRef.current) {
        // second click arrived before timeout — it's a double click, bail
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
    }, 220); // just long enough to detect double-click
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
      {/* Backdrop — subtle, only on narrow screens */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            display: "none",
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 99,
            // show backdrop only on narrow screens
            [`@media (max-width: 900px)`]: { display: "block" },
          }}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{
          position:   "fixed",
          top:        0,
          left:       0,
          bottom:     0,
          width:      260,
          background: "var(--color-background-primary)",
          borderRight: "0.5px solid var(--color-border-tertiary)",
          display:    "flex",
          flexDirection: "column",
          zIndex:     100,
          transform:  isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.5s ease",
          boxShadow:  isOpen ? "4px 0 24px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {/* Sidebar header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
          <span style={{ fontFamily:"Playfair Display",fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>MemoryLM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Chats</span>
          <button
            onClick={onNewChat}
            style={{ background: "transparent", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: "3px 10px" }}
          >+ New</button>
          </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {chats.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: 24 }}>No chats yet.</p>
          )}
          {chats.map(chat => (
            <div
              key={chat.id}
              onDoubleClick={e => handleChatDoubleClick(e, chat)}
              onClick={() => handleChatClick(chat.id)}
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            6,
                padding:        "8px 14px",
                cursor:         "pointer",
                background:     activeChatId === chat.id ? "var(--color-background-secondary)" : "transparent",
                borderLeft:     activeChatId === chat.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
                transition:     "background 0.1s",
              }}
              onMouseEnter={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
              onMouseLeave={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = "transparent"; }}
            >
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
                  style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title="Double-click to rename"
                >
                  {chat.title}
                </span>
              )}
              <button
                onClick={e => { e.stopPropagation(); onDeleteChat(chat.id); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 15, flexShrink: 0, padding: "0 2px", opacity: 0.6 }}
                title="Delete chat"
              >×</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}