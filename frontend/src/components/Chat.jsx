import {loadStorage} from "../lib/storage";
import{inputStyle} from "../lib/constants";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";
import InjectionPanel from "./InjectionPanel";
import { ArrowUp, FastForward } from "lucide-react";

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
        config,
        onInjectionHover,
        onInjectionLeave,
        
        nodes,
        activeChildren,
        switchBranch,
        forkChat,
        branchMode,
        getSiblings,onExtractEntities,
        extracting, confirm, characters, pendingGroupTurn, onInvokeGroupTurn, onSkipGroupTurn
        }){

          const lastMsg         = messages[messages.length - 1];
          const lastFinishReason = lastMsg?.role === "assistant" ? lastMsg.finishReason : null;
          const style           = config.style ?? "none";

          const showContinuation =
            messages.length > 0 && (
              style === "creative" ||
              style === "roleplay" ||
              (style === "technical" && lastFinishReason === "length")
            );
          function getBranchInfo(nodeId) {
            const siblings = getSiblings(nodes, nodeId);
            if (siblings.length <= 1) return null;
            const currentId = activeChildren[nodeId] ?? siblings[0].id;
            const currentIndex = siblings.findIndex(s => s.id === currentId);
            return {
              total:        siblings.length,
              currentIndex: currentIndex + 1,
              parentId:     nodeId,
            };
          }
          const RegenerateIcon = ({ size = 24, strokeWidth = 2.2, color = "var(--color-text-primary)", ...props }) => (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="-2 -1 24 24"
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              {...props}
            >
              <path d="M12 4a8 8 0 1 1-11.5 3" />
            <polyline points="10,8 10,2 15.5,2" />
            </svg>
          );
    return(
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
            <div style={{flex: 1, overflowY: "auto", width: "100%"}}>
            <div style={{padding: 16, display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 800, margin: "0 auto", minHeight: "100%"}}>
              {messages.length === 0 && (
                <div style={{ margin: "auto", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 14, padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
                  Start a conversation. Memories are retrieved and injected automatically.
                </div>
              )}
              {messages
                .map((m, originalIndex) => ({ ...m, originalIndex }))
                .filter(m => !m.implicit)
                .map((m, i) => {
                  const branchInfo = m.parentId ? getBranchInfo(m.parentId) : null;
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", width: "100%" }}>

                      {/* Branch navigator — shown at fork points */}
                      {branchInfo && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, alignSelf: "flex-start" }}>
                          <button
                            onClick={() => switchBranch(branchInfo.parentId, -1)}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 13, padding: "2px 4px" }}
                          >‹</button>
                          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                            {branchInfo.currentIndex}/{branchInfo.total}
                          </span>
                          <button
                            onClick={() => switchBranch(branchInfo.parentId, 1)}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 13, padding: "2px 4px" }}
                          >›</button>
                        </div>
                      )}

                      {/* Reasoning block */}
                      {m.reasoning && (
                        <details style={{ maxWidth: 680, marginBottom: 4 }}>
                          <summary style={{ fontSize: 11, color: "var(--color-text-tertiary)", cursor: "pointer", userSelect: "none" }}>
                            reasoning
                          </summary>
                          <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-tertiary)", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)" }}>
                            {m.reasoning}
                          </div>
                        </details>
                      )}

                      {editingMessage?.index === m.originalIndex ? (
                        <div style={{ maxWidth: 680, width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                          <textarea
                            value={editingMessage.draft}
                            onChange={e => setEditingMessage(em => ({ ...em, draft: e.target.value }))}
                            autoFocus
                            style={{ resize: "vertical", minHeight: 80, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
                          />
                          <div style={{ display: "flex", gap: 6, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                            <button onClick={() => { editMessage(m.id, editingMessage.draft); setEditingMessage(null); }} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "4px 10px" }}>Save</button>
                            <button onClick={() => setEditingMessage(null)} style={{ ...inputStyle, cursor: "pointer", fontSize: 12, padding: "4px 10px" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 3, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                          <div style={{ padding: "10px 14px", borderRadius: "var(--border-radius-lg)", background: m.role === "user" ? "var(--color-bubble-user)" : "var(--color-bubble-model)", border: "0.5px solid var(--color-border-tertiary)", fontSize: 14, lineHeight: 1.65, color: m.role === "user" ? "var(--color-bubble-user-text)" : "var(--color-text-primary)" }}>
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
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

                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 8, opacity: 0, transition: "opacity 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                            <button
                              onClick={() => setEditingMessage({ index: m.originalIndex, draft: m.content })}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 13, padding: "2px 4px" }}
                              title="Edit"
                            >✎</button>
                            {m.role === "assistant" && (
                                <button
                                  onClick={() => forkChat(m.id)}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 13, padding: "2px 4px" }}
                                  title="Fork to new chat"
                                >⎇</button>
                            )}
                            <button
                              onClick={async () => { if (await confirm("Delete this message?")) deleteMessage(m.id); }}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 14, padding: "2px 4px" }}
                              title="Delete"
                            >×</button>
                          </div>

                          {(m.injectedMems > 0 || m.injectedLore > 0) && (
                            <span
                              onMouseEnter={() => onInjectionHover(m.injectedMemData ?? [], m.injectedLoreData ?? [], m.injectedInferenceData ?? [])}
                              onMouseLeave={onInjectionLeave}
                              style={{ fontSize: 11, color: "var(--color-text-tertiary)", cursor: "default" }}
                            >
                              {[m.injectedMems > 0 && `${m.injectedMems} mem`, m.injectedLore > 0 && `${m.injectedLore} lore`].filter(Boolean).join(" · ")} injected
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>
            </div>

            <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", display: "flex", justifyContent: "center", borderTopLeftRadius: "var(--border-radius-lg)", borderTopRightRadius: "var(--border-radius-lg)", borderBottomLeftRadius: (config.style ==="roleplay" ? "var(--border-radius-lg)" : 0), borderBottomRightRadius: (config.style ==="roleplay" ? "var(--border-radius-lg)" : 0), alignSelf: "center",width: "100%", maxWidth: 800}}>
              {pendingGroupTurn && (() => {
                const char = characters?.find(c => c.id === pendingGroupTurn.charId);
                return (
                  <div style={{ padding: "8px 16px", background: "var(--color-background-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{char?.name ?? "A character"}</span> might want to respond
                    </span>
                    <button onClick={onInvokeGroupTurn} style={{ fontSize: 12, padding: "3px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-primary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer" }}>Invoke</button>
                    <button onClick={onSkipGroupTurn}   style={{ fontSize: 12, padding: "3px 10px", borderRadius: "var(--border-radius-md)", border: "none", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer" }}>Skip</button>
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", width: "100%", maxWidth: 680 }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Message… (Enter to send, Shift+Enter for newline)"
                  style={{ flex: 1, resize: "none", minHeight: 90, maxHeight: 140, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <button
                    onClick={sendMessage}
                    disabled={loading || (!input.trim() && !showContinuation)}
                    title={showContinuation && !input.trim() ? "Continue" : "Send"}
                    style={{ padding: "9px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: loading || !input.trim() ? "transparent": "var(--color-send-button)", cursor: loading || (!input.trim() && !showContinuation) ? "not-allowed" : "pointer", color: "var(--color-text-primary)", fontSize: 16, opacity: loading || (!input.trim() && !showContinuation) ? 0.35 : 1 }}
                  >
                    {showContinuation && !input.trim() ? <FastForward size={16}/> : <ArrowUp size={16}/>}
                  </button>
                  <button
                    onClick={regenerate}
                    disabled={loading || messages.length < 2}
                    title="Regenerate last response"
                    style={{ padding: "9px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", cursor: loading || messages.length < 2 ? "not-allowed" : "pointer", color: "var(--color-text-secondary)", fontSize: 14, opacity: loading || messages.length < 2 ? 0.35 : 1 }}
                  ><RegenerateIcon size={16} color="var(--color-text-primary)" /></button>
                </div>
              </div>
            </div>
            <div style={{ padding: "0px 2px", background: "var(--color-background-primary)", display: "flex", justifyContent: "center", borderBottomLeftRadius:"var(--border-radius-md)",borderBottomRightRadius: "var(--border-radius-md)"}}>
            {(config?.style === "none" || config?.style === "technical" || config?.style==="creative") && messages.length > 0 && (
              <div style={{ paddingTop: 1, paddingBottom: 1 }}>
                <button
                  onClick={onExtractEntities}
                  disabled={extracting}
                  style={{ background: "transparent", border: "none", cursor: extracting ? "not-allowed" : "pointer", color: "var(--color-text-tertiary)", fontSize: 11, padding: 0, opacity: extracting ? 0.5 : 1 }}
                  >
                  {extracting ? "Extracting…" : "⊕ Extract entities from conversation"}
                </button>
              </div>
            )}
            </div>
          </div>
        )}
