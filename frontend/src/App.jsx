import { useState, useEffect, useRef, useCallback } from "react";
import { memoriesAPI, lorebookAPI, chatsAPI, presetsAPI, messagesAPI } from "./lib/api";

import useEmbedder from "./hooks/useEmbedder";
import {parseReasoning} from "./lib/parseReasoning";
// ── LM fetch ────────────────────────────────────────────────────────────────
import {lmFetch} from "./lib/lmFetch";

// ── Memory import ───────────────────────────────────────────────────────────
import useMemory from "./hooks/useMemory";

// ─── Constants ────────────────────────────────────────────────────────────────
import {EMBED_MODEL} from "./lib/constants";
import {DEFAULT_LM_STUDIO_URL} from "./lib/constants";
import {DEDUP_THRESHOLD} from "./lib/constants";
import {STORAGE_KEYS} from "./lib/constants";

// ─── Default presets ──────────────────────────────────────────────────────────
import {DEFAULT_PRESETS} from "./lib/constants";

// ─── Storage helpers (localStorage) ──────────────────────────────────────────
import {saveStorage,loadStorage} from "./lib/storage";

// ─── Shared styles ────────────────────────────────────────────────────────────
import {inputStyle} from "./lib/constants";

import {Card,CardTitle,Row} from "./components/ui/shared";

//─── Panels ──────────────────────────────────────────────────────────────────────
  import Chat from "./components/Chat";
  import Memory from "./components/Memory";
  import Lorebook from "./components/Lorebook";
  import Presets from "./components/Presets";
  import Settings from "./components/Settings";
  import ChatSidebar from "./components/ChatSidebar";
  import InjectionPanel from "./components/InjectionPanel";

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // FIX #1: consistent casing — activeChatId everywhere
  const [chats,          setChats]          = useState([]);
  const [memories, setMemories] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null); // holds { index, draft }
  const [activeChatId,   setActiveChatId]   = useState(null);
  const [lorebook,       setLorebook]       = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [activePanel,    setActivePanel]    = useState("chat");
  const [systemPrompt,   setSystemPrompt]   = useState("You are a helpful assistant.");
  const [lorebookDraft,  setLorebookDraft]  = useState({ title: "", tags: "", content: "", type: "character" });
  const [editingLore,    setEditingLore]    = useState(null);
  const [memoryLog,      setMemoryLog]      = useState([]);
  const [presets,        setPresets]        = useState(DEFAULT_PRESETS);
  const [activePreset,   setActivePreset]   = useState(null);
  const [editingPreset,  setEditingPreset]  = useState(null);
  const [presetDraft,    setPresetDraft]    = useState(null);
  const [lmStudioUrl,    setLmStudioUrl]    = useState(DEFAULT_LM_STUDIO_URL);
  const [config, setConfig] = useState({
    chunkEvery: 4, topK: 4, threshold: 0.35, temperature: 0.7, repetitionPenalty: 1.0,
    autoSummarise: true, dedupMode: "merge", dedupThreshold: DEDUP_THRESHOLD, modelName: "",
  });

  const turnsSinceChunk = useRef(0);
  const messagesEndRef  = useRef(null);
  const configRef       = useRef(config);
  const lmUrlRef        = useRef(lmStudioUrl);

  const activeChat = chats.find(c => c.id === activeChatId)?? chats[0];
  const messages   = activeChat?.messages ?? [];
  const [injectionPanel, setInjectionPanel] = useState({ visible: false, memData: [], loreData: [] });
  const hoverTimerRef = useRef(null);

  useEffect(() => { configRef.current  = config;      }, [config]);
  useEffect(() => { lmUrlRef.current   = lmStudioUrl; }, [lmStudioUrl]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!activeChatId) return;
    memoriesAPI.getByChat(activeChatId).then(setMemories).catch(console.error);
  }, [activeChatId]);

  // ── Boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await migrateMessagesFromLocalStorage();
      try {
        const [savedChats, savedPresets, savedLorebook] = await Promise.all([
          chatsAPI.getAll(),
          presetsAPI.getAll(),
          lorebookAPI.getAll(),
        ]);

        console.log("chats from API:", savedChats);
        console.log("presets from API:", savedPresets);
        console.log("lorebook from API:", savedLorebook);

        const savedActiveChat   = loadStorage(STORAGE_KEYS.activeChat);
        const savedActivePreset = loadStorage(STORAGE_KEYS.activePreset);
        const savedCfg          = loadStorage(STORAGE_KEYS.config);

        console.log("activeChat from localStorage:", savedActiveChat);

        if (savedChats?.length) {
          const rehydrated = await Promise.all(
            savedChats.map(async chat => ({
              ...chat,
              messages: await messagesAPI.get(chat.id).catch(() => []),
            }))
          );
          setChats(rehydrated);
          setActiveChatId(savedActiveChat ?? rehydrated[0].id);
        }

        if (savedLorebook?.length) setLorebook(savedLorebook);

        if (savedPresets?.length) setPresets(current => {
          const backendIds = new Set(savedPresets.map(preset => preset.id));
          const defaults   = DEFAULT_PRESETS.filter(preset => !backendIds.has(preset.id));
          return [...defaults, ...savedPresets];
        });

        if (savedActivePreset) setActivePreset(savedActivePreset);

        if (savedCfg) {
          if (savedCfg.config)       setConfig(c => ({ ...c, ...savedCfg.config }));
          if (savedCfg.systemPrompt) setSystemPrompt(savedCfg.systemPrompt);
          if (savedCfg.lmStudioUrl)  setLmStudioUrl(savedCfg.lmStudioUrl);
        }
      } catch(e) {
        console.error("Boot error:", e);
      }
    })();
  }, []);

  // ── Persist combined config ─────────────────────────────────────────────────
  function persistConfig(cfg, sysprompt, url) {
    saveStorage(STORAGE_KEYS.config, { config: cfg, systemPrompt: sysprompt, lmStudioUrl: url });
  }

  // ── Chat management ─────────────────────────────────────────────────────────
  function updateActiveChat(updater, force = false) {
    setChats(prev => {
      const next = prev.map(chat => {
        if (chat.id !== activeChatId) return chat;
        const updated = updater(chat);
        const existingMessages = chat.messages ?? [];
        const messagesToSave = force || updated.messages?.length > 0
          ? updated.messages
          : existingMessages;
        messagesAPI.save(activeChatId, messagesToSave).catch(console.error);
        return { ...updated, messages: messagesToSave };
      });
      return next;
    });
  }

  async function createNewChat() {
    const newChat = {
      id:         crypto.randomUUID(),
      title:      "New Chat",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages:   [],
    };
    await chatsAPI.create(newChat.id, newChat.title, newChat.created_at, newChat.updated_at);
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    saveStorage(`mem_messages_${newChat.id}`, []);
  }

  function switchChat(id) {
    setActiveChatId(id);
    saveStorage(STORAGE_KEYS.activeChat, id);
  }

  async function deleteChat(id) {
    await chatsAPI.delete(id); // also wipes ChromaDB memories for this chat
    await messagesAPI.clear(id);
    const remaining = chats.filter(chat => chat.id !== id);

    if (remaining.length === 0) {
      const fresh = {
        id:         crypto.randomUUID(),
        title:      "New Chat",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages:   [],
      };
      await chatsAPI.create(fresh.id, fresh.title, fresh.created_at, fresh.updated_at);

      setChats([fresh]);
      setActiveChatId(fresh.id);
      saveStorage(STORAGE_KEYS.activeChat, fresh.id);
      return;
    }

    setChats(remaining);

    if (activeChatId === id) {
      setActiveChatId(remaining[0].id);
      saveStorage(STORAGE_KEYS.activeChat, remaining[0].id);
    }
  }

  async function renameChat(id, title) {
    await chatsAPI.update(id, title, new Date().toISOString());
    setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  }

  function showInjectionPanel(memData, loreData) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setInjectionPanel({ visible: true, memData, loreData });
    }, 500);
  }

  function hideInjectionPanel() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setInjectionPanel(p => ({ ...p, visible: false }));
    }, 300); // small delay so moving to the panel itself doesn't close it
  }

  function keepPanelOpen() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }

  //――― Migration ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
  async function migrateMessagesFromLocalStorage() {
    const keysToMigrate = Object.keys(localStorage)
      .filter(k => k.startsWith("mem_messages_"));

    if (keysToMigrate.length === 0) return;

    console.log(`Migrating ${keysToMigrate.length} chats from localStorage...`);

    for (const key of keysToMigrate) {
      const chatId  = key.replace("mem_messages_", "");
      const messages = loadStorage(key);
      if (!messages?.length) {
        localStorage.removeItem(key);
        continue;
      }
      try {
        await messagesAPI.save(chatId, messages);
        localStorage.removeItem(key);
        console.log(`Migrated ${messages.length} messages for chat ${chatId}`);
      } catch(e) {
        console.error(`Failed to migrate ${chatId}:`, e);
        // leave the key intact so it can retry next boot
      }
    }
  }

  // ── Embedder ────────────────────────────────────────────────────────────────
  const {status: embedderStatus, embed} = useEmbedder();

  // ── Summarise & store ───────────────────────────────────────────────────────
  const {addManualMemory,summariseAndStore} = useMemory({configRef, lmUrlRef, activeChatId,addLog, setMemories})

  async function deleteMemory(id) {
    await memoriesAPI.delete(id);
    setMemories(prev => prev.filter(m => m.id !== id));
  }

  async function generateChatTitle(messages) {
    const sample = messages
      .slice(0, 6)
      .map(m =>
        `${m.role}: ${m.content}`
      )
      .join("\n");

    const {content: title} = await lmFetch(
      [
        {
          role: "user",
          content:
            `Generate a short title (3-6 words) for this conversation:\n\n${sample}`
        }
      ],
      "You generate concise conversation titles. Output ONLY the title.",
      configRef,
      lmUrlRef
    );

    return title
      ?.replace(/^["']|["']$/g, "")
      ?.trim()
      ?.slice(0, 60);
  }

  // ── Lorebook ────────────────────────────────────────────────────────────────
  async function addLorebookEntry(draft) {
  // Embed only title + tags for better retrieval matching
    const embedText = `${draft.title} ${draft.tags}`.trim();
    const vec  = await embed(embedText);
    const entry = {
      id:        `lore_${Date.now()}`,
      title:     draft.title,
      type:      draft.type,
      tags:      draft.tags,
      content:   draft.content,
      embedding: vec,
      timestamp: new Date().toISOString(),
    };
    if (editingLore) {
      await lorebookAPI.update(editingLore, entry);
      setLorebook(prev => prev.map(e => e.id === editingLore ? entry : e));
      setEditingLore(null);
    } else {
      await lorebookAPI.add(entry);
      setLorebook(prev => [...prev, entry]);
    }
    setLorebookDraft({ title: "", tags: "", content: "", type: "character" });
    addLog(`Lorebook entry "${draft.title}" saved`);
  }

  async function deleteLorebookEntry(id) {
    await lorebookAPI.delete(id);
    setLorebook(prev => prev.filter(e => e.id !== id));
  }

  // ── Log ─────────────────────────────────────────────────────────────────────
  function addLog(msg) {
    setMemoryLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  }

  // ── Send / Regenerate ───────────────────────────────────────────────────────
  async function sendMessageWith(history) {
    const cfg      = configRef.current;
    const last     = history[history.length - 1];
    const queryContent = last.implicit
    ? history
        .filter(m => !m.implicit)
        .slice(-3)
        .map(m => m.content)
        .join(" ")
    : last.content;

  const queryVec = await embed(queryContent);

    const relMems = queryVec
      ? await memoriesAPI.query(activeChatId, queryVec, cfg.topK, cfg.threshold, cfg.alpha ?? 0.7, cfg.decayRate ?? 0.01)
      : [];
    const relLore = queryVec
      ? await lorebookAPI.query(queryVec, cfg.topK, cfg.threshold)
      : [];

    let injected = systemPrompt;
    if (relMems.length > 0)
      injected += `\n\n[RECALLED MEMORIES — use naturally, do not cite directly]\n${relMems.map(m => `• ${m.summary}`).join("\n")}`;
    if (relLore.length > 0)
      injected += `\n\n[LOREBOOK — world/character context]\n${relLore.map(l => `[${(l.type ?? "ENTRY").toUpperCase()}] ${l.title}: ${l.content}`).join("\n")}`;
    if (relMems.length + relLore.length > 0)
      addLog(`Injected ${relMems.length} mem + ${relLore.length} lore`);

    // Create placeholder message immediately
    const placeholderMsg = {
      role:         "assistant",
      content:      "",
      finishReason: "stop",
      reasoning:    null,
      injectedMems: relMems.length,
      injectedLore: relLore.length,
      injectedMemData: relMems,
      injectedLoreData: relLore,
    };

    const historyWithPlaceholder = [...history, placeholderMsg];
    updateActiveChat(chat => ({ ...chat, messages: historyWithPlaceholder, updatedAt: new Date().toISOString() }));

    // Stream — update placeholder in place as chunks arrive
    const { content: rawReply, finishReason } = await lmFetch(
      history.map(m => ({ role: m.role, content: m.content })),
      injected,
      configRef,
      lmUrlRef,
      (accumulated) => {
        updateActiveChat(chat => ({
          ...chat,
          messages: chat.messages.map((m, i) =>
            i === chat.messages.length - 1
              ? { ...m, content: accumulated }
              : m
          ),
          updatedAt: new Date().toISOString(),
        }));
      }
    );

    const { reasoning, content: reply } = parseReasoning(rawReply);

    // Final update with complete content and metadata
    const finalMsg = {
      role:         "assistant",
      content:      reply ?? "(no response)",
      reasoning,
      finishReason,
      injectedMems: relMems.length,
      injectedLore: relLore.length,
      injectedMemData:  relMems,   // full arrays
      injectedLoreData: relLore,
    };

    const finalHistory = [...history, finalMsg];
    updateActiveChat(chat => ({
      ...chat,
      messages: finalHistory,
      updatedAt: new Date().toISOString(),
    }));

    // Save final messages
    await messagesAPI.save(activeChatId, finalHistory);

    // Auto-summarise
    turnsSinceChunk.current += 1;
    if (cfg.autoSummarise && turnsSinceChunk.current >= cfg.chunkEvery) {
      turnsSinceChunk.current = 0;
      summariseAndStore(finalHistory.slice(-cfg.chunkEvery * 2));
    }

    // Title generation
    if (activeChat?.title === "New Chat" && finalHistory.length >= 2) {
      try {
        const newTitle = await generateChatTitle(finalHistory);
        if (newTitle) await chatsAPI.update(activeChatId, newTitle, new Date().toISOString());
        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, title: newTitle || c.title } : c));
      } catch(e) { console.error("title gen failed", e); }
    }
  }

  async function sendMessage() {
    const cfg = configRef.current;
    const isImplicitContinuation =
      !input.trim() &&
      (cfg.style === "creative" || cfg.style === "roleplay" ||
      (cfg.style === "technical" && messages[messages.length - 1]?.finishReason === "length"));

    if (!isImplicitContinuation && !input.trim() || loading) return;

    const content  = isImplicitContinuation
      ? (cfg.continuationPrompt ?? "Advance the narrative.")
      : input.trim();

    // Mark implicit continuations so they don't show in the chat UI
    const userMsg = {
      role:     "user",
      content,
      implicit: isImplicitContinuation,
    };

    const history = [...messages, userMsg];
    updateActiveChat(chat => ({ ...chat, messages: history, updatedAt: new Date().toISOString() }));
    if (!isImplicitContinuation) setInput("");
    setLoading(true);
    try { await sendMessageWith(history); }
    catch(e) { updateActiveChat(chat => ({ ...chat, messages: [...chat.messages, { role: "assistant", content: `Error: ${e.message}` }], updatedAt: new Date().toISOString() })); }
    finally  { setLoading(false); }
  }

  async function regenerate() {
    if (loading || messages.length < 2) return;
    const trimmed = messages.slice(0, -1);
    updateActiveChat(chat => ({ ...chat, messages: trimmed, updatedAt: new Date().toISOString() }));
    setLoading(true);
    try { await sendMessageWith(trimmed); }
    catch(e) { updateActiveChat(chat => ({ ...chat, messages: [...chat.messages, { role: "assistant", content: `Error: ${e.message}` }], updatedAt: new Date().toISOString() })); }
    finally  { setLoading(false); }
  }

  function deleteMessage(index) {
    let indicesToRemove =[index];
    
    // if message before this one is an implicit prompt, remove it too
    if (index > 0 && messages[index-1]?.implicit){
      indicesToRemove.push(index-1);
    }
    
    const next = messages.filter((_, i) => !indicesToRemove.includes(i));
    updateActiveChat(chat => ({ ...chat, messages: next, updatedAt: new Date().toISOString() }));
  }

  function editMessage(index, newContent) {
    const next = messages.map((m, i) => i === index ? { ...m, content: newContent } : m);
    updateActiveChat(chat => ({ ...chat, messages: next, updatedAt: new Date().toISOString() }));
  }

  // ── Presets ─────────────────────────────────────────────────────────────────
 function applyPreset(preset) {
    setSystemPrompt(preset.systemPrompt);
    setConfig(c => {
      const next = { ...c, ...preset.config };
      persistConfig(next, preset.systemPrompt, lmStudioUrl);
      return next;
    });
    setActivePreset(preset.id);
    saveStorage(STORAGE_KEYS.activePreset, preset.id);
  }

  async function savePreset(draft) {
    await presetsAPI.save(draft);
    const isNew = !presets.find(p => p.id === draft.id);
    const next  = isNew
      ? [...presets, draft]
      : presets.map(p => p.id === draft.id ? draft : p);
    setPresets(next);
    setEditingPreset(null);
    setPresetDraft(null);

    // Auto-apply if this is the active preset
    if (draft.id === activePreset) {
    applyPreset(draft);
    }
  }

  async function deletePreset(id) {
    await presetsAPI.delete(id);
    const next = presets.filter(p => p.id !== id);
    setPresets(next);
    if (activePreset === id) {
      setActivePreset(null);
      saveStorage(STORAGE_KEYS.activePreset, null);
    }
  }

  const LORE_TYPES  = ["character", "location", "faction", "item", "event", "lore", "rule", "other"];
  const TYPE_COLORS = { character: "#7F77DD", location: "#1D9E75", faction: "#D85A30", item: "#BA7517", event: "#D4537E", lore: "#378ADD", rule: "#639922", other: "#888780" };

  const statusColor     = { ready: "#1D9E75", loading: "#BA7517", error: "#E24B4A", idle: "#888780" }[embedderStatus];
  const statusLabel     = { ready: "Embedder ready", loading: "Loading model…", error: "Embedder error", idle: "Embedder idle" }[embedderStatus];
  const activePresetObj = presets.find(p => p.id === activePreset);
  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", height: "100vh", background: "var(--color-background-tertiary)" }}>
    
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={switchChat}
        onNewChat={() => { createNewChat(); setSidebarOpen(false); }}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
      />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", flexShrink: 0 }}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ fontFamily: "Playfair Display",fontWeight: 650, fontSize: 17, letterSpacing: "-0.3px", background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-primary)", padding: 0 }}
        >
          MemoryLM
        </button>
        <div style={{ display: "flex", gap: 3, marginLeft: 6 }}>
          {["chat","memory","lorebook","presets","settings"].map(p => (
            <button key={p} onClick={() => setActivePanel(p)} style={{ padding: "4px 11px", fontSize: 12, borderRadius: "var(--border-radius-md)", border: activePanel === p ? "0.5px solid var(--color-border-primary)" : "0.5px solid transparent", background: activePanel === p ? "var(--color-background-secondary)" : "transparent", color: activePanel === p ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", fontWeight: activePanel === p ? 500 : 400 }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {activePresetObj && (
            <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
              {activePresetObj.icon} {activePresetObj.name}
            </span>
          )}
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{statusLabel}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{memories.length} mem · {lorebook.length} lore</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* ── CHAT ── */}
        {activePanel === "chat" && (
          <Chat
            chats={chats}
            activeChatId={activeChatId}
            switchChat={switchChat}
            deleteChat={deleteChat}
            createNewChat={createNewChat}

            messages={messages}
            loading={loading}

            input={input}
            setInput={setInput}

            sendMessage={sendMessage}
            regenerate={regenerate}

            editingMessage={editingMessage}
            setEditingMessage={setEditingMessage}

            editMessage={editMessage}
            deleteMessage={deleteMessage}

            messagesEndRef={messagesEndRef}

            config={config}
            onInjectionHover={showInjectionPanel}
            onInjectionLeave={hideInjectionPanel}
          />
        )}

        {/* ── MEMORY ── */}
        {activePanel === "memory" && (
          <Memory 
            memories={memories}
            memoryLog={memoryLog}
            config={config}
            addManualMemory={addManualMemory}
            updateActiveChat={updateActiveChat}  
            deleteMemory={deleteMemory}        
          />
        )}

        {/* ── LOREBOOK ── */}
        {activePanel === "lorebook" && (
          <Lorebook
            lorebook={lorebook}
            lorebookDraft={lorebookDraft}
            editingLore={editingLore}
            setEditingLore={setEditingLore}
            TYPE_COLORS={TYPE_COLORS}
            LORE_TYPES={LORE_TYPES}
            setLorebookDraft={setLorebookDraft}
            addLorebookEntry={addLorebookEntry}
            deleteLorebookEntry={deleteLorebookEntry}
          />
        )}

        {/* ── PRESETS ── */}
        {activePanel === "presets" && (
          <Presets
            presets={presets}
            editingPreset={editingPreset}
            activePreset={activePreset}
            setEditingPreset={setEditingPreset}
            systemPrompt={systemPrompt}
            config={config}
            applyPreset={applyPreset}
            savePreset={savePreset}
            deletePreset={deletePreset}
            presetDraft={presetDraft}
            setPresetDraft={setPresetDraft}
          />
        )}

        {/* ── SETTINGS ── */}
        {activePanel === "settings" && (
          <Settings
            config={config}
            lmStudioUrl={lmStudioUrl}
            setLmStudioUrl={setLmStudioUrl}
            setConfig={setConfig}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            persistConfig={persistConfig}
            chats={chats}
            lorebook={lorebook}
            presets={presets}
            updateActiveChat={updateActiveChat}
            setLorebook={setLorebook}
          />
        )}

      </div>
      <InjectionPanel
        visible={injectionPanel.visible}
        memData={injectionPanel.memData}
        loreData={injectionPanel.loreData}
        onMouseEnter={keepPanelOpen}
        onMouseLeave={hideInjectionPanel}
      />
    </div>
  );
}
