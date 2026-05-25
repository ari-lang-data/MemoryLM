import {loadStorage} from "../lib/storage";
import{inputStyle} from "../lib/constants";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
export default function Chat({chats,
        activeChatId,
        switchChat,
        deleteChat,
        createNewChat,

        messages,
        loading,

        input,
        setInput,

        sendMessage,
        regenerate,

        editingMessage,
        setEditingMessage,

        editMessage,
        deleteMessage,

        messagesEndRef,
        }){
    return(
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%", maxWidth: 800 }}>

            {/* FIX #7: chat switcher moved out of the message list into its own bar */}
            <div style={{ display: "flex", gap: 6, padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", overflowX: "auto", flexShrink: 0, alignItems: "center" }}>
              {chats.map(chat => (
                <div
                  key={chat.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0
                  }}>
                  <button
                    onClick={() => switchChat(chat.id)}
                    style={{
                      ...inputStyle,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                      padding: "4px 10px",
                      borderColor:
                        activeChatId === chat.id
                          ? "var(--color-border-primary)"
                          : undefined,
                    }}>
                    {chat.title}
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete "${chat.title}"?`)) {
                        deleteChat(chat.id);
                      }
                    }}
                    style={{
                      ...inputStyle,
                      cursor: "pointer",
                      fontSize: 12,
                      padding: "4px 8px",
                      color: "var(--color-text-danger)",
                      borderColor: "var(--color-border-danger)"
                    }}>
                    ×
                  </button>
                </div>
              ))}
              <button onClick={createNewChat} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "4px 10px", flexShrink: 0 }}>+ New</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ margin: "auto", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14, padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
                  Start a conversation. Memories are retrieved and injected automatically.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", width: "100%" }}>
                  {editingMessage?.index === i ? (
                    <div style={{ maxWidth: 680, width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                      <textarea
                        value={editingMessage.draft}
                        onChange={e => setEditingMessage(em => ({ ...em, draft: e.target.value }))}
                        autoFocus
                        style={{ resize: "vertical", minHeight: 80, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
                      />
                      <div style={{ display: "flex", gap: 6, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                        <button onClick={() => { editMessage(i, editingMessage.draft); setEditingMessage(null); }} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "4px 10px" }}>Save</button>
                        <button onClick={() => setEditingMessage(null)} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "4px 10px" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 3, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ padding: "10px 14px", borderRadius: "var(--border-radius-lg)", background: m.role === "user" ? "var(--color-background-info)" : "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", fontSize: 14, lineHeight: 1.65, color: m.role === "user" ? "var(--color-text-info)" : "var(--color-text-primary)" }}>
                        <ReactMarkdown
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || "");
                              return !inline && match ? (
                                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              ) : (
                                <code style={{ background: "var(--color-background-tertiary)", padding: "2px 6px", borderRadius: "var(--border-radius-sm)", fontSize: 13 }} {...props}>
                                  {children}
                                </code>
                              );
                            },
                            p({ children }) { return <p style={{ margin: "0 0 8px" }}>{children}</p>; },
                            ul({ children }) { return <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ul>; },
                            ol({ children }) { return <ol style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ol>; },
                            li({ children }) { return <li style={{ marginBottom: 4 }}>{children}</li>; },
                            h1({ children }) { return <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>{children}</h1>; },
                            h2({ children }) { return <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>{children}</h2>; },
                            h3({ children }) { return <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>{children}</h3>; },
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                      <div style={{ display: "flex", gap: 8, opacity: 0, transition: "opacity 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                        <button onClick={() => setEditingMessage({ index: i, draft: m.content })} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 13, padding: "2px 4px" }} title="Edit">✎</button>
                        <button onClick={() => { if (confirm("Delete this message?")) deleteMessage(i); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14, padding: "2px 4px" }} title="Delete">×</button>
                      </div>
                      {(m.injectedMems > 0 || m.injectedLore > 0) && (
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                          {[m.injectedMems > 0 && `${m.injectedMems} mem`, m.injectedLore > 0 && `${m.injectedLore} lore`].filter(Boolean).join(" · ")} injected
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: "flex-start", padding: "10px 16px", borderRadius: "var(--border-radius-lg)", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", fontSize: 18, color: "var(--color-text-tertiary)", letterSpacing: 4 }}>···</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", display: "flex", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", width: "100%", maxWidth: 680 }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Message… (Enter to send, Shift+Enter for newline)"
                  style={{ flex: 1, resize: "none", minHeight: 85, maxHeight: 140, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <button onClick={sendMessage} disabled={loading || !input.trim()} title="Send" style={{ padding: "9px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: loading || !input.trim() ? "transparent" : "var(--color-send-button)", cursor: loading || !input.trim() ? "not-allowed" : "pointer", color: "var(--color-text-primary)", fontSize: 16, opacity: loading || !input.trim() ? 0.35 : 1 }}>↑</button>
                  <button onClick={regenerate} disabled={loading || messages.length < 2} title="Regenerate last response" style={{ padding: "9px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", cursor: loading || messages.length < 2 ? "not-allowed" : "pointer", color: "var(--color-text-secondary)", fontSize: 14, opacity: loading || messages.length < 2 ? 0.35 : 1 }}>↺</button>
                </div>
              </div>
            </div>
          </div>
        )}