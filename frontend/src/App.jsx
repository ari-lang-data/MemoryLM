import { useState, useEffect, useRef, useCallback } from "react";
import { memoriesAPI, lorebookAPI, chatsAPI, presetsAPI, messagesAPI, clustersAPI, graphAPI, episodicAPI } from "./lib/api";

import useEmbedder from "./hooks/useEmbedder";
import {parseReasoning} from "./lib/parseReasoning";
import {getActivePath, getSiblings} from "./lib/branching";
import { getRetrievalProfile } from "./lib/retrievalClassifier";
import { resolveTemplate } from "./lib/templateResolver";
import { useTheme }                  from "./hooks/useTheme";
import { useConfirm }                from "./components/useConfirm";
import { useKeyboardShortcuts }      from "./hooks/useKeyboardShortcuts";
import KeyboardShortcutsModal        from "./components/KeyboardShortcutsModal";


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
  import SettingsModal from "./components/SettingsModal"
  import ChatSidebar from "./components/ChatSidebar";
  import InjectionPanel from "./components/InjectionPanel";
  import CharacterTab from "./components/CharacterTab";
  import GraphPanel from "./components/GraphPanel";
  import GroupChatSetupModal from "./components/GroupChatSetupModal";

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [chats,          setChats]          = useState([]);
  const [memories, setMemories] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null); // holds { index, draft }
  const [activeChatId,   setActiveChatId]   = useState(null);
  const [lorebook,       setLorebook]       = useState([]);
  const [loreEdgePanel, setLoreEdgePanel] = useState(null); // { entry, edges }
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [entities,      setEntities]      = useState([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [characters,    setCharacters]    = useState([]);
  const [templateVars,  setTemplateVars]  = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeCharId,  setActiveCharId]  = useState(null);
  const [userCharId,    setUserCharId]    = useState(null);
  const [groupChatMembers,    setGroupChatMembers]    = useState([]);
  const [pendingGroupTurn,    setPendingGroupTurn]    = useState(null); // { charId, reason }
  const [groupSetupOpen,      setGroupSetupOpen]      = useState(false);
  const autoTurnCountRef = useRef(0);
  const [extracting, setExtracting] = useState(false);
  const [nodes,          setNodes]          = useState([]);
  const [activeChildren, setActiveChildren] = useState({});
  const [injectionPanel, setInjectionPanel] = useState({ visible: false, memData: [], loreData: [], inferenceData: [] });
  const [config, setConfig] = useState({
    chunkEvery: 4, topK: 4, threshold: 0.35, temperature: 0.7, repetitionPenalty: 1.0,
    autoSummarise: true, dedupMode: "merge", dedupThreshold: DEDUP_THRESHOLD, modelName: "", alpha: 0.7, decayRate: 0.01,
    style: "none", continuationPrompt: "Advance the narrative.", branchMode: "replace", contextWindow: 10,
  });
  
  const hoverTimerRef = useRef(null);
  const turnsSinceChunk = useRef(0);
  const messagesEndRef  = useRef(null);
  const configRef       = useRef(config);
  const lmUrlRef        = useRef(lmStudioUrl);
  const chatNodesRef          = useRef(nodes);
  const chatActiveChildrenRef = useRef(activeChildren);
  const activeChatIdRef = useRef(activeChatId);
  const nodesChatRef = useRef(null); // tracks which chat the current nodes belong to

  const activeChat = chats.find(c => c.id === activeChatId)?? chats[0];
  const messages = getActivePath(nodes, activeChildren)

  useEffect(() => { configRef.current  = config;      }, [config]);
  useEffect(() => { lmUrlRef.current   = lmStudioUrl; }, [lmStudioUrl]);
  useEffect(() => { chatNodesRef.current          = nodes;          }, [nodes]);
  useEffect(() => { chatActiveChildrenRef.current = activeChildren; }, [activeChildren]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!activeChatId) return;
    memoriesAPI.getByChat(activeChatId).then(setMemories).catch(console.error);
  }, [activeChatId]);
  useEffect(() => {
    if (!activeChatId || nodes.length === 0) return;
    if (nodesChatRef.current !== activeChatId) return; // guard — don't save stale nodes
    messagesAPI.save(activeChatId, nodes, activeChildren).catch(console.error);
  }, [nodes, activeChildren, activeChatId]);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  const { theme, setTheme, themes } = useTheme();
  const { confirm, ConfirmModalRenderer } = useConfirm();

  useKeyboardShortcuts({
    activePanel,
    setActivePanel,
    config,
    onOpenSettings:   () => setSettingsOpen(true),
    onOpenShortcuts:  () => setShortcutsOpen(true),
    onRegenerate:     regenerate,
    onFastForward:    sendMessage,
    loading,
  });


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

        const savedActiveChat   = loadStorage(STORAGE_KEYS.activeChat);
        const savedActivePreset = loadStorage(STORAGE_KEYS.activePreset);
        const savedCfg          = loadStorage(STORAGE_KEYS.config);

        // ── Chats ──────────────────────────────────────────────────────────
        let activeChatResolved = null;
        if (savedChats?.length) {
          setChats(savedChats);
          activeChatResolved = savedActiveChat ?? savedChats[0].id;
          setActiveChatId(activeChatResolved);
        }

        // ── Lorebook ───────────────────────────────────────────────────────
        if (savedLorebook?.length) setLorebook(savedLorebook);

        // ── Presets ────────────────────────────────────────────────────────
        if (savedPresets?.length) {
          const mergedPresets = DEFAULT_PRESETS.map(def => {
            const saved = savedPresets.find(p => p.id === def.id);
            return saved ? { ...def, ...saved, config: { ...def.config, ...saved.config } } : def;
          });
          setPresets(mergedPresets);
        }

        // ── Config ─────────────────────────────────────────────────────────
        if (savedCfg) {
          if (savedCfg.config)       setConfig(c => ({ ...c, ...savedCfg.config }));
          if (savedCfg.systemPrompt) setSystemPrompt(savedCfg.systemPrompt);
          if (savedCfg.lmStudioUrl)  setLmStudioUrl(savedCfg.lmStudioUrl);
        }

        // ── Messages ───────────────────────────────────────────────────────
        if (activeChatResolved) {
          const savedMsgs = await messagesAPI.get(activeChatResolved);
          if (savedMsgs) {
            setNodes(savedMsgs.nodes ?? []);
            setActiveChildren(savedMsgs.activeChildren ?? {});
            nodesChatRef.current = activeChatResolved;
          }
        }

        // ── Characters + bindings ──────────────────────────────────────────
        // Load characters from preset first, then override from chat binding
        if (savedActivePreset) {
          setActivePreset(savedActivePreset);
          const preset = (savedPresets ?? DEFAULT_PRESETS).find(p => p.id === savedActivePreset);
          if (preset?.config?.style === "roleplay" || preset?.config?.style === "creative") {
            const [chars, tvars] = await Promise.all([
              graphAPI.getCharacters(savedActivePreset),
              graphAPI.getTemplateVars(savedActivePreset),
            ]);
            if (chars?.length)  setCharacters(chars);
            if (tvars?.length)  setTemplateVars(tvars);

            // Check chat binding — takes precedence over preset defaults
            const activeChat = savedChats?.find(c => c.id === activeChatResolved);
            const bindings   = activeChat?.character_bindings ?? {};

            if (bindings.chat_type === "group") {
              setActiveCharId(null); // no persistent active char in group chats
            } else if (bindings.active_char_id) {
              setActiveCharId(bindings.active_char_id);
            } else {
              const activeChar = chars?.find(c => c.is_active_char);
              if (activeChar) setActiveCharId(activeChar.id);
            }

            if (bindings.user_char_id) {
              setUserCharId(bindings.user_char_id);
            } else {
              const userChar = chars?.find(c => c.is_user_char);
              if (userChar) setUserCharId(userChar.id);
            }

            // Restore group chat members if applicable
            if (bindings.chat_type === "group" && bindings.members?.length) {
              setGroupChatMembers(bindings.members);
            }
          }
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

  async function extractEntities() {
    if (extracting || messages.length === 0) return;
    setExtracting(true);
    addLog("Entity extraction started…");

    try {
      // Build transcript from active path
      const transcript = messages
        .filter(m => !m.implicit)
        .slice(-20) // last 20 messages — enough context without overloading
        .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");

      // Ask LLM to extract entities and relationships
      const { content: raw } = await lmFetch(
          [{
            role: "user",
            content: `Extract named entities and their relationships from this conversation. Return ONLY valid JSON in this exact format, no preamble, no markdown fences:
        {
          "entities": [
            { "name": "string", "type": "character|concept|location|event|faction|other", "description": "brief description" }
          ],
          "edges": [
            { "source": "entity name", "target": "entity name", "relationship": "verb phrase", "weight": 0.0-1.0 }
          ]
        }

        Extraction rules:
        - Do NOT extract years, dates, numbers, or time periods as entities
        - If multiple authors or people are listed together, create one entity per person
        - Only extract persistent relationships — things that remain true over time
        - Do NOT extract transient actions, single dialogue exchanges, or one-time events as relationships
        - Do NOT extract negations or absence of relationships ("had never met", "unrelated to", "differs from" unless it describes a genuine conceptual distinction)
        - Use verb phrases for relationships ("tutors", "commands", "lives at", "proposed", "introduced by")
        - Weight reflects confidence and persistence: 1.0 for certain persistent facts, lower for implied or uncertain
        - Be conservative — only extract what is clearly and explicitly stated
        - Do NOT hallucinate entities or relationships not present in the text

        Conversation:
        ${transcript}`
          }],
          "You are a conservative entity extraction assistant. Extract only clearly named entities and explicit, persistent relationships. When in doubt, omit. Return only valid JSON with no markdown fences, no preamble, no trailing text.",
          configRef,
          lmUrlRef,
          null,
          2000
      );

      // Parse response
      let extracted;
      try {
        const clean = raw.replace(/```json|```/g, "").trim();
        extracted   = JSON.parse(clean);
      } catch {
        addLog("Entity extraction: failed to parse response");
        return;
      }

      if (!extracted?.entities?.length) {
        addLog("Entity extraction: no entities found");
        return;
      }

      // Build name → id map for edge creation
      const nameToId = {};

      // Create entities
      for (const entity of extracted.entities) {
        const id  = `entity_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        nameToId[entity.name.toLowerCase()] = id;
        await graphAPI.createEntity({
          id,
          name:        entity.name,
          type:        entity.type ?? "other",
          description: entity.description ?? "",
          chat_id:     activeChatId,
        });
      }

      // Create edges
      for (const edge of (extracted.edges ?? [])) {
        const sourceId = nameToId[edge.source?.toLowerCase()];
        const targetId = nameToId[edge.target?.toLowerCase()];
        if (!sourceId || !targetId) continue;
        await graphAPI.createEdge({
          source_id:    sourceId,
          target_id:    targetId,
          relationship: edge.relationship ?? "Related",
          weight:       edge.weight ?? 0.5,
        });
      }

      // Refresh entities
      const updated = await graphAPI.getEntities(activeChatId);
      setEntities(updated ?? []);

      addLog(`Entity extraction: ${extracted.entities.length} entities, ${extracted.edges?.length ?? 0} edges added`);

    } catch(e) {
      addLog(`Entity extraction failed: ${e.message}`);
    } finally {
      setExtracting(false);
    }
  }

  // ── Chat management ─────────────────────────────────────────────────────────
  function addNode(node) {
    nodesChatRef.current = activeChatId; // mark nodes as belonging to this chat
    setNodes(prev => {
      const next = [...prev, node];
      return next;
    });
  }

  function updateNode(id, updater) {
    nodesChatRef.current = activeChatId; // mark nodes as belonging to this chat
    setNodes(prev => {
      const next = prev.map(n => n.id === id ? updater(n) : n);
      return next;
    });
  }

  function removeNode(id) {
    nodesChatRef.current = activeChatId; // mark nodes as belonging to this chat
    setNodes(prev => {
      const next = prev.filter(n => n.id !== id);
      return next;
    });
  }

  function setActiveChild(parentId, childId) {
    setActiveChildren(prev => {
      const next = { ...prev, [parentId]: childId };
      return next;
    });
  }

  async function createNewChat() {
    nodesChatRef.current = null; // invalidate
    setNodes([]);
    setActiveChildren({});
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
    nodesChatRef.current = newChat.id; // mark as valid after creation
  }

  async function switchChat(id) {
    nodesChatRef.current = null; // invalidate before loading
    setNodes([]);
    setActiveChildren({});
    const chat = chats.find(c => c.id === id) ?? (await chatsAPI.getAll()).find(c => c.id === id);
    const bindings = chat?.character_bindings ?? {};
    if (bindings.active_char_id && bindings.active_char_id !== activeCharId) {
        setCharactersLoading(true);
        const [chars, tvars] = await Promise.all([
            graphAPI.getCharacters(activePreset),
            graphAPI.getTemplateVars(activePreset),
        ]);
        setCharacters(chars ?? []);
        setTemplateVars(tvars ?? []);
        setActiveCharId(bindings.active_char_id);
        setUserCharId(bindings.user_char_id ?? null);
        setCharactersLoading(false);
    }
    if (bindings.chat_type === "group" && bindings.members?.length) {
      setGroupChatMembers(bindings.members);
    } else {
      setGroupChatMembers([]);
    }
    setActiveChatId(id);
    saveStorage(STORAGE_KEYS.activeChat, id);
    const savedMsgs = await messagesAPI.get(id);
    setNodes(savedMsgs?.nodes ?? []);
    setActiveChildren(savedMsgs?.activeChildren ?? {});
    nodesChatRef.current = id; // mark as valid
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
      await switchChat(remaining[0].id);
    }
  }

  async function renameChat(id, title) {
    await chatsAPI.update(id, title, new Date().toISOString());
    setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  }

  function showInjectionPanel(memData, loreData, inferenceData = []) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setInjectionPanel({ visible: true, memData, loreData, inferenceData });
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
  const {addManualMemory,summariseAndStore} = useMemory({configRef, lmUrlRef, activeChatIdRef, addLog, setMemories})

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

  async function toggleMemoryPin(id, pinned) {
    await memoriesAPI.pin(id, pinned);
    setMemories(prev => prev.map(m => m.id === id ? { ...m, pinned } : m));
  }

  // ── Lorebook ────────────────────────────────────────────────────────────────
  async function addLorebookEntry(draft) {
    const embedText = `${draft.title} ${draft.tags}`.trim();
    const vec       = await embed(embedText);
    const entry     = {
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
      // Update graph entity too
      await graphAPI.updateEntity(editingLore, {
        name:        draft.title,
        description: draft.content.slice(0, 200),
      });
      setEditingLore(null);
    } else {
      await lorebookAPI.add(entry);
      setLorebook(prev => [...prev, entry]);
      // Create graph entity for this lorebook entry
      await graphAPI.createEntity({
        id:          entry.id,
        name:        draft.title,
        type:        draft.type,
        description: draft.content.slice(0, 200),
        preset_id:   ["roleplay","creative"].includes(config?.style) ? activePreset : null,
        chat_id:     ["roleplay","creative"].includes(config?.style) ? null : activeChatId,
      });
      // Refresh entities
      const updated = await graphAPI.getEntities(activeChatId, activePreset);
      setEntities(updated ?? []);
    }

    setLorebookDraft({ title: "", tags: "", content: "", type: "character" });
    addLog(`Lorebook entry "${draft.title}" saved`);
  }

  async function deleteLorebookEntry(id) {
    await lorebookAPI.delete(id);
    setLorebook(prev => prev.filter(e => e.id !== id));
  }

  async function toggleLorePin(id, pinned) {
    await lorebookAPI.pin(id, pinned);
    setLorebook(prev => prev.map(e => e.id === id ? { ...e, pinned } : e));
  }

  async function openLoreEdges(entry) {
    const rawEdges = await graphAPI.getEdges(entry.id, "both");
    const shaped   = await Promise.all(
      rawEdges.map(async edge => {
        const otherId = edge.source_id === entry.id ? edge.target_id : edge.source_id;
        const entity  = await graphAPI.getEntity(otherId).catch(() => null);
        return { edge, entity };
      })
    );
    setLoreEdgePanel({ entry, edges: shaped });
  }

  // ── Log ─────────────────────────────────────────────────────────────────────
  function addLog(msg) {
    setMemoryLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  }

  // ── Message Management ───────────────────────────────────────────────────────
  async function sendMessageWith(history, parentId, isRegenerated=false, overrideCharId=null) {
    const cfg = configRef.current;
    const effectiveCharId = overrideCharId ?? activeCharId;
    if (overrideCharId && overrideCharId === userCharId) return; // never let model speak as user
    const activeChar = characters.find(c => c.id === effectiveCharId) ?? null;
    const userChar   = characters.find(c => c.id === userCharId) ?? null;
    const resolvedSystemPrompt = resolveTemplate(systemPrompt, activeChar, userChar);
    const last     = history[history.length - 1];
    const window = cfg.contextWindow ?? 0;
    const windowedHistory = window > 0
      ? history.slice(-window * 2)  // *2 because each turn is user+assistant
      : history;

    const queryContent = last.implicit
      ? history.filter(m => !m.implicit).slice(-3).map(m => m.content).join(" ")
      : last.content;

    const queryVec = await embed(queryContent);

    // Get retrieval profile based on context
    const profile = getRetrievalProfile(
      { content: queryContent },
      cfg.style ?? "none",
      { alpha: cfg.alpha, decayRate: cfg.decayRate }
    );

    addLog(`Retrieval context: ${profile.context}`);

    // After character context injection, for non-creative presets:
    if (!["creative", "roleplay"].includes(cfg.style ?? "none") && entities.length > 0) {
      const graphContext = await buildResearchContext(queryContent);
      if (graphContext) injected += `\n\n[KNOWLEDGE GRAPH]\n${graphContext}`;
    }

    // Pinned items — always injected
    const [pinnedMems, pinnedLore] = await Promise.all([
      memoriesAPI.getPinned(activeChatId),
      lorebookAPI.getPinned(),
    ]);

    // Fetch active inferences for this chat
    const activeInferences = await episodicAPI.getInferences(activeChatIdRef.current, "active")
      .catch(() => []);

    // Dynamic retrieval using profile
    let retrievedMems = [];
    if (queryVec) {
      const clusterHits = await clustersAPI.query(
        activeChatId, queryVec, profile.topK, profile.threshold
      );

      if (clusterHits.length > 0) {
        // Get best memory from each cluster
        const allMemberIds = clusterHits.flatMap(c => c.members);
        const allMemories  = await memoriesAPI.getByChat(activeChatId);
        const byId         = Object.fromEntries(allMemories.map(m => [m.id, m]));

        retrievedMems = clusterHits
        .map(cluster => {
          const members = cluster.members
            .map(id => byId[id])
            .filter(Boolean)
            .sort((a, b) => (b.retrieval_count ?? 0) - (a.retrieval_count ?? 0));
          const mem = members[0];
          if (!mem) return null;
          // Attach a score so InjectionPanel has something to display.
          // Cluster similarity isn't returned per-member, so we approximate
          // using the cluster's own score if present, else flag as cluster-retrieved.
          return { ...mem, score: cluster.score ?? null, via_cluster: true };
        })
        .filter(Boolean)
        .slice(0, profile.topK);
      } else {
        // Fall back to direct retrieval if no clusters exist yet
        retrievedMems = await memoriesAPI.query(
          activeChatId, queryVec,
          profile.topK, profile.threshold,
          profile.alpha, profile.decayRate
        );
      }
    }

    const retrievedLore = queryVec && cfg.style !== "roleplay"
      ? await lorebookAPI.query(queryVec, profile.topK, profile.lorebookThreshold ?? profile.threshold)
      : [];

    // Merge pinned + retrieved, deduplicate by ID
    const pinnedMemIds  = new Set(pinnedMems.map(m => m.id));
    const pinnedLoreIds = new Set(pinnedLore.map(l => l.id));

    const relMems = [
      ...pinnedMems,
      ...retrievedMems.filter(m => !pinnedMemIds.has(m.id)),
    ];
    const relLore = [
      ...pinnedLore,
      ...retrievedLore.filter(l => !pinnedLoreIds.has(l.id)),
    ];

    // After merging pinned + retrieved:
    const now = new Date().toISOString();
    if (!isRegenerated) {
      retrievedMems.forEach(m => {
        memoriesAPI.markRetrieved(m.id, now).catch(console.error);
      });
    }

    let injected = resolvedSystemPrompt;
    if (relMems.length > 0)
      injected += `\n\n[RECALLED MEMORIES — use naturally, do not cite directly]\n${relMems.map(m => `• ${m.summary}`).join("\n")}`;
    if (relLore.length > 0)
      injected += `\n\n[LOREBOOK — world/character context]\n${relLore.map(l => `[${(l.type ?? "ENTRY").toUpperCase()}] ${l.title}: ${l.content}`).join("\n")}`;
    if (activeInferences.length > 0)
      injected += `\n\n[ACTIVE STATES — maintain these consequences throughout]\n${activeInferences.map(inf => `• ${inf.state} (confidence: ${inf.confidence.toFixed(2)})`).join("\n")}`;
    if (relMems.length + relLore.length > 0)
      addLog(`Injected ${relMems.length} mem (${pinnedMems.length} pinned) + ${relLore.length} lore (${pinnedLore.length} pinned)`);
    if (activeChar) {
      const charContext = [
        activeChar.appearance     && `Appearance: ${activeChar.appearance}`,
        activeChar.behaviour      && `Behaviour: ${activeChar.behaviour}`,
        activeChar.speech_pattern && `Speech pattern: ${activeChar.speech_pattern}`,
        activeChar.background     && `Background: ${activeChar.background}`,
      ].filter(Boolean).join("\n");
      const refForms = [
        activeChar.narrative_alias  && `Refer to this character in narration as "${activeChar.narrative_alias}".`,
        activeChar.address_formal   && `Characters who know them formally address them as "${activeChar.address_formal}".`,
        activeChar.address_informal && `Characters close to them use "${activeChar.address_informal}".`,
      ].filter(Boolean).join(" ");

      if (charContext || refForms) {
        injected += `\n\n[ACTIVE CHARACTER — embody this persona]\n${refForms ? refForms + "\n" : ""}${charContext}`;
      }

      // Walk character's edges for referenced entities
      if (queryVec) {
        const graphContext = await buildGraphContext(activeChar.id, queryContent);
        if (graphContext) injected += `\n\n[CHARACTER RELATIONSHIPS]\n${graphContext}`;
      }
    }
    // Placeholder node
    const placeholderId = `msg_${Date.now()}`;
    const placeholder   = {
      id: placeholderId, parentId,
      role: "assistant", content: "",
      finishReason: "stop", reasoning: null, injectedInferenceData: activeInferences,
      injectedMems: relMems.length, injectedLore: relLore.length,
      injectedMemData: relMems, injectedLoreData: relLore,
      implicit: false, timestamp: new Date().toISOString(), regenerated: false,
    };

    addNode(placeholder);
    setActiveChildren(prev => ({ ...prev, [parentId]: placeholderId }));

    const { content: rawReply, finishReason } = await lmFetch(
      windowedHistory.map(m => ({ role: m.role, content: m.content })),
      injected,
      configRef,
      lmUrlRef,
      (accumulated) => {
        updateNode(placeholderId, n => ({ ...n, content: accumulated }));
      }
    );

    const { reasoning, content: reply } = parseReasoning(rawReply);

    updateNode(placeholderId, n => ({
      ...n,
      content:      reply ?? "(no response)",
      reasoning,
      finishReason,
    }));

    // Save final state
    const finalNodes = [...chatNodesRef.current, placeholder];
    await messagesAPI.save(activeChatId, finalNodes, chatActiveChildrenRef.current);

    // Auto-summarise using active path
    if(!isRegenerated){
      turnsSinceChunk.current += 1;
      // Bind character on first message
      const activePath = getActivePath(finalNodes, chatActiveChildrenRef.current);
      if (activePath.filter(m => m.role === "user" && !m.implicit).length === 1 && activeCharId && groupChatMembers.length === 0) {
          chatsAPI.bindCharacters(activeChatIdRef.current, {
              active_char_id: activeCharId,
              user_char_id:   userCharId ?? null,
              chat_type:      "standard",
              members:        [],
          }).catch(console.error);
      }
      if (cfg.autoSummarise && turnsSinceChunk.current >= cfg.chunkEvery) {
        turnsSinceChunk.current = 0;
        const activePath = getActivePath(finalNodes, activeChildren);
        summariseAndStore(activePath.slice(-cfg.chunkEvery * 2));
      }
    }
    else{
      if(turnsSinceChunk.current===0)
        turnsSinceChunk.current=2; // to allow for updated memories with the regenerated message instead of from a stale one
    }

    // Group chat routing — only in roleplay mode with members set
    if (!isRegenerated && groupChatMembers.length > 0 && autoTurnCountRef.current < 3) {
      const evaluation = await runGroupEvaluator(reply ?? "", history);
      if (evaluation) {
        if (evaluation.reason === "direct_address") {
          autoTurnCountRef.current += 1;
          // Queue rather than recurse — let React commit current state first
          setTimeout(() => {
            invokeGroupTurn(evaluation.charId);
          }, 50);
        } else {
          setPendingGroupTurn(evaluation);
        }
      }
    }

    // Title generation
    if (activeChat?.title === "New Chat" && history.length >= 2) {
      try {
        const newTitle = await generateChatTitle(history);
        if (newTitle) {
          await chatsAPI.update(activeChatId, newTitle, new Date().toISOString());
          setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, title: newTitle } : c));
        }
      } catch(e) { console.error("title gen failed", e); }
    }
  }

  async function sendMessage() {
    const cfg = configRef.current;
    autoTurnCountRef.current = 0;
    const isImplicitContinuation =
      !input.trim() &&
      (cfg.style === "creative" || cfg.style === "roleplay" ||
      (cfg.style === "technical" && messages[messages.length - 1]?.finishReason === "length"));

    if (!isImplicitContinuation && !input.trim() || loading) return;

    const content = isImplicitContinuation
      ? (cfg.continuationPrompt ?? "Advance the narrative.")
      : input.trim();

    // Parent is either branchFrom or last message in active path
    const lastMsg  = messages[messages.length - 1];
    const parentId = lastMsg?.id ?? null;

    const userMsg = {
      id:        `msg_${Date.now()}`,
      parentId,
      role:      "user",
      content,
      implicit:  isImplicitContinuation,
      timestamp: new Date().toISOString(),
      regenerate: false,
      finishReason: "stop",
      reasoning: null,
      injectedMems: 0, injectedLore: 0,
      injectedMemData: [], injectedLoreData: [],
    };

    if (parentId) {
      setActiveChildren(prev => ({ ...prev, [parentId]: userMsg.id }));
    }

    addNode(userMsg);
    if (!isImplicitContinuation) setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg];
      await sendMessageWith(history, userMsg.id);
    } catch(e) {
      const errMsg = {
        id: `msg_${Date.now()}`, parentId: userMsg.id,
        role: "assistant", content: `Error: ${e.message}`,
        timestamp: new Date().toISOString(),
        finishReason: "stop", reasoning: null,
        injectedMems: 0, injectedLore: 0,
        injectedMemData: [], injectedLoreData: [],
        implicit: false,
      };
      addNode(errMsg);
      setActiveChildren(prev => ({ ...prev, [userMsg.id]: errMsg.id }));
    } finally {
      setLoading(false);
    }
  }

  async function regenerate() {
    if (loading || messages.length < 2) return;
    const lastAssistant = messages[messages.length - 1];
    if (lastAssistant.role !== "assistant") return;

    const cfg      = configRef.current;
    const lastUser = messages[messages.length - 2];

    if (cfg.branchMode === "inline") {
      // Create a new sibling response — don't remove the old one
      setLoading(true);
      try { await sendMessageWith(messages.slice(0, -1), lastUser.id, true); }
      catch(e) {
        const errMsg = {
          id: `msg_${Date.now()}`, parentId: lastUser.id,
          role: "assistant", content: `Error: ${e.message}`,
          timestamp: new Date().toISOString(),
          finishReason: "stop", reasoning: null,
          injectedMems: 0, injectedLore: 0,
          injectedMemData: [], injectedLoreData: [],
          implicit: false,
        };
        addNode(errMsg);
        setActiveChildren(prev => ({ ...prev, [lastUser.id]: errMsg.id }));
      }
      finally { setLoading(false); }
    } else {
      // Replace mode — remove last assistant node and regenerate
      removeNode(lastAssistant.id);
      setActiveChildren(prev => {
        const next = { ...prev };
        delete next[lastAssistant.parentId];
        return next;
      });
      setLoading(true);
      try { await sendMessageWith(messages.slice(0, -1), lastUser.id, true); }
      catch(e) {
        const errMsg = {
          id: `msg_${Date.now()}`, parentId: lastUser.id,
          role: "assistant", content: `Error: ${e.message}`,
          timestamp: new Date().toISOString(),
          finishReason: "stop", reasoning: null,
          injectedMems: 0, injectedLore: 0,
          injectedMemData: [], injectedLoreData: [],
          implicit: false,
        };
        addNode(errMsg);
        setActiveChildren(prev => ({ ...prev, [lastUser.id]: errMsg.id }));
      }
      finally { setLoading(false); }
    }
  }

  function deleteMessage(id) {
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    // If assistant message preceded by implicit, delete both
    let toDelete = [id];
    if (node.role === "assistant") {
      const parent = nodes.find(n => n.id === node.parentId);
      if (parent?.implicit) toDelete.push(parent.id);
    }

    setNodes(prev => {
      const next = prev.filter(n => !toDelete.includes(n.id));
      messagesAPI.save(activeChatId, next, activeChildren).catch(console.error);
      return next;
    });

    // Clean up activeChildren references
    setActiveChildren(prev => {
      const next = { ...prev };
      for (const id of toDelete) {
        delete next[node.parentId];
      }
      return next;
    });
  }

  function editMessage(id, newContent) {
    updateNode(id, n => ({ ...n, content: newContent }));
  }

  function switchBranch(parentId, direction) {
    const siblings = getSiblings(nodes, parentId);
    if (siblings.length <= 1) return;
    const currentId    = activeChildren[parentId] ?? siblings[0].id;
    const currentIndex = siblings.findIndex(s => s.id === currentId);
    const nextIndex    = (currentIndex + direction + siblings.length) % siblings.length;
    setActiveChild(parentId, siblings[nextIndex].id);
  }

  async function forkChat(nodeId) {
    const nodeIndex    = messages.findIndex(m => m.id === nodeId);
    const forkedMsgs   = messages.slice(0, nodeIndex + 1);
    const forkTimestamp = forkedMsgs[forkedMsgs.length - 1]?.timestamp ?? new Date().toISOString();

    // Build linear nodes and activeChildren for forked chat
    const forkedNodes          = forkedMsgs.map(m => ({ ...m }));
    const forkedActiveChildren = {};
    for (let i = 0; i < forkedNodes.length - 1; i++) {
      forkedActiveChildren[forkedNodes[i].id] = forkedNodes[i + 1].id;
    }

    const newChat = {
      id:         crypto.randomUUID(),
      title:      `${activeChat?.title ?? "Chat"} (branch)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages:   [],
    };

    await chatsAPI.create(newChat.id, newChat.title, newChat.created_at, newChat.updated_at);
    await messagesAPI.save(newChat.id, forkedNodes, forkedActiveChildren);
    await memoriesAPI.fork(activeChatId, newChat.id, forkTimestamp);

    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setNodes(forkedNodes);
    setActiveChildren(forkedActiveChildren);
    saveStorage(STORAGE_KEYS.activeChat, newChat.id);
    setSidebarOpen(true);
  }

  async function buildGraphContext(entityId, queryContent) {
    try {
      const edges = await graphAPI.traverse(entityId, 1);
      if (!edges?.length) return null;

      // Filter edges by relevance to query — only inject high-weight edges
      // or edges whose target name appears in the query content
      const relevant = edges.filter(e =>
        e.edge.weight >= 0.7 ||
        queryContent.toLowerCase().includes(e.entity?.name?.toLowerCase() ?? "")
      );

      if (!relevant.length) return null;

      return relevant
        .map(e => `${e.edge.relationship}: ${e.entity.name}${e.entity.description ? ` — ${e.entity.description}` : ""}`)
        .join("\n");
    } catch {
      return null;
    }
  }

  async function buildResearchContext(queryContent) {
    try {
      if (!entities.length) return null;

      // Find entities mentioned in query
      const mentioned = entities.filter(e =>
        queryContent.toLowerCase().includes(e.name.toLowerCase())
      );

      if (!mentioned.length) return null;

      // Traverse each mentioned entity and collect connections
      const results = await Promise.all(
        mentioned.map(e => graphAPI.traverse(e.id, 2))
      );

      const lines = [];
      mentioned.forEach((entity, i) => {
        const connections = results[i] ?? [];
        if (connections.length) {
          lines.push(`${entity.name} (${entity.type}):`);
          connections.forEach(c => {
            lines.push(`  ${c.edge.relationship} → ${c.entity.name}: ${c.entity.description ?? ""}`);
          });
        }
      });

      return lines.length ? lines.join("\n") : null;
    } catch {
      return null;
    }
  }

  async function runGroupEvaluator(lastReply, history) {
    if (groupChatMembers.length < 2) return null;
    const activeChar  = characters.find(c => c.id === activeCharId);
    const memberChars = characters.filter(c => groupChatMembers.includes(c.id) && c.id !== activeCharId);
    if (!memberChars.length) return null;

    const memberList = memberChars.map(c => `${c.name} (id: ${c.id})`).join(", ");
    const transcript = history.slice(-6).map(m => `${m.role === "user" ? "User" : activeChar?.name ?? "Model"}: ${m.content}`).join("\n");

    const { content: raw } = await lmFetch(
      [{
        role: "user",
        content: `Given this conversation and these available characters: ${memberList}
        
  Last reply: "${lastReply.slice(0, 300)}"

  Recent transcript:
  ${transcript}

  Should any of the available characters speak next? Reply ONLY with valid JSON, no preamble:
  { "shouldSpeak": true|false, "charId": "character_id_or_null", "reason": "direct_address|narrative|none" }

  Rules:
  - direct_address: a character was explicitly spoken to by name
  - narrative: a character would naturally respond given the story context
  - Be conservative — default to false if unclear`,
      }],
      "You are a narrative routing assistant. Decide if a character should speak. Return only JSON.",
      configRef, lmUrlRef, null, 200
    );

    try {
      const clean  = raw.replace(/```json|```/g, "").trim();
      const result = JSON.parse(clean);
      if (!result.shouldSpeak || !result.charId) return null;
      // Verify charId is actually a group member
      if (!groupChatMembers.includes(result.charId)) return null;
      return { charId: result.charId, reason: result.reason };
    } catch {
      return null;
    }
  }

  async function invokeGroupTurn(charId) {
    if (!charId || charId === userCharId) return;
    setLoading(true);
    try {
      const history = getActivePath(chatNodesRef.current, chatActiveChildrenRef.current)
        .filter(m => !m.implicit)
        .map(m => ({ role: m.role, content: m.content }));
      const lastId = chatNodesRef.current[chatNodesRef.current.length - 1]?.id ?? null;
      await sendMessageWith(history, lastId, false, charId);
    } finally {
      setLoading(false);
      autoTurnCountRef.current = 0;
    }
  }

  async function startGroupChat(memberIds) {
    setGroupSetupOpen(false);
    await createNewChat();
    setGroupChatMembers(memberIds);
    // Bind immediately since members are known upfront
    const newChatId = activeChatIdRef.current;
    await chatsAPI.bindCharacters(newChatId, {
      active_char_id: null,  // intentionally unbound — rotates per turn
      user_char_id:   userCharId ?? null,
      chat_type:      "group",
      members:        memberIds,
    });
    setSidebarOpen(false);
  }

  // ── Presets ─────────────────────────────────────────────────────────────────
  async function applyPreset(preset) {
    setSystemPrompt(preset.systemPrompt);
    setConfig(c => {
      const next = { ...c, ...preset.config };
      persistConfig(next, preset.systemPrompt, lmStudioUrl);
      return next;
    });
    setActivePreset(preset.id);
    saveStorage(STORAGE_KEYS.activePreset, preset.id);

    if (preset.config?.style === "roleplay" || preset.config?.style === "creative") {
      setCharactersLoading(true);
      const [chars, tvars] = await Promise.all([
        graphAPI.getCharacters(preset.id),
        graphAPI.getTemplateVars(preset.id),
      ]);
      setCharacters(chars ?? []);
      setTemplateVars(tvars ?? []);
      const activeChar = chars?.find(c => c.is_active_char);
      const userChar   = chars?.find(c => c.is_user_char);
      setActiveCharId(activeChar?.id ?? null);
      setUserCharId(userChar?.id ?? null);
      setCharactersLoading(false);
    } else {
      setCharacters([]);
      setTemplateVars([]);
      setActiveCharId(null);
      setUserCharId(null);
    }
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

  async function updatePresetConfig(presetId, key, value) {
    setPresets(prev => {
      const next = prev.map(p => p.id === presetId
        ? { ...p, config: { ...p.config, [key]: value } }
        : p
      );
      presetsAPI.save(next.find(p => p.id === presetId)).catch(console.error);
      return next;
    });
    // If this is the active preset, update live config too
    if (activePreset === presetId) {
      setConfig(c => {
        const next = { ...c, [key]: value };
        persistConfig(next, systemPrompt, lmStudioUrl);
        return next;
      });
    }
  }

  async function updatePresetPrompt(presetId, prompt) {
    setPresets(prev => {
      const next = prev.map(p => p.id === presetId
        ? { ...p, systemPrompt: prompt }
        : p
      );
      presetsAPI.save(next.find(p => p.id === presetId)).catch(console.error);
      return next;
    });
    if (activePreset === presetId) {
      setSystemPrompt(prompt);
      persistConfig(config, prompt, lmStudioUrl);
    }
  }

  const LORE_TYPES  = ["character", "location", "faction", "item", "event", "lore", "rule", "other"];
  const TYPE_COLORS = { character: "#7F77DD", location: "#1D9E75", faction: "#D85A30", item: "#BA7517", event: "#D4537E", lore: "#378ADD", rule: "#639922", other: "#888780" };

  const statusColor     = { ready: "#1D9E75", loading: "#BA7517", error: "#E24B4A", idle: "#888780" }[embedderStatus];
  const statusLabel     = { ready: "Embedder ready", loading: "Loading model…", error: "Embedder error", idle: "Embedder idle" }[embedderStatus];
  const activePresetObj = (presets ?? DEFAULT_PRESETS).find(p => p.id === activePreset);
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
        onOpenSettings={() => setSettingsOpen(true)}
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
          {["chat","memory","lorebook","graph"].map(p => (
            <button key={p} onClick={() => setActivePanel(p)} style={{ padding: "4px 11px", fontSize: 12, borderRadius: "var(--border-radius-md)", border: activePanel === p ? "0.5px solid var(--color-border-primary)" : "0.5px solid transparent", background: activePanel === p ? "var(--color-background-secondary)" : "transparent", color: activePanel === p ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", fontWeight: activePanel === p ? 500 : 400 }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}

          {config?.style === "roleplay" && (
            <button
              key="characters"
              onClick={() => setActivePanel("characters")}
              style={{ padding: "4px 11px", fontSize: 12, borderRadius: "var(--border-radius-md)", border: activePanel === "characters" ? "0.5px solid var(--color-border-primary)" : "0.5px solid transparent", background: activePanel === "characters" ? "var(--color-background-secondary)" : "transparent", color: activePanel === "characters" ? "var(--color-text-primary)" : "var(--color-text-secondary)", cursor: "pointer", fontWeight: activePanel === "characters" ? 500 : 400 }}
            >
              Characters
            </button>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {(() => {
            const activeChar = characters.find(c => c.id === activeCharId);
            const meta       = typeof activeChar?.metadata === "string"
              ? JSON.parse(activeChar.metadata)
              : (activeChar?.metadata ?? {});

            if (activeChar && config?.style === "roleplay") {
              const groupChars = groupChatMembers.length > 0
                ? characters.filter(c => groupChatMembers.includes(c.id))
                : [activeChar];
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                  {groupChars.map(c => {
                    const m = typeof c.metadata === "string" ? JSON.parse(c.metadata) : (c.metadata ?? {});
                    return m.avatar
                      ? <img key={c.id} src={m.avatar} style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} title={c.name} />
                      : <div key={c.id} style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--color-text-tertiary)", flexShrink: 0 }} title={c.name}>{c.name?.charAt(0)?.toUpperCase()}</div>;
                  })}
                  {groupChatMembers.length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 4 }}>{activeChar.name}</span>
                  )}
                </div>
              );
            }

            if (activePresetObj) {
              return (
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                  {activePresetObj.icon} {activePresetObj.name}
                </span>
              );
            }

            return null;
          })()}
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
            nodes={nodes}
            activeChildren={activeChildren}
            switchBranch={switchBranch}
            forkChat={forkChat}
            branchMode={config?.branchMode ?? "inline"}
            getSiblings={getSiblings}
            onExtractEntities={extractEntities}
            extracting={extracting}
            confirm={confirm}
            pendingGroupTurn={pendingGroupTurn}
            characters={characters}
            onInvokeGroupTurn={async () => {
              if (!pendingGroupTurn) return;
              setPendingGroupTurn(null);
              autoTurnCountRef.current += 1;
              await invokeGroupTurn(pendingGroupTurn.charId);
            }}
            onSkipGroupTurn={() => setPendingGroupTurn(null)}
          />
        )}

        {/* ── CHARACTER ── */}
        {activePanel === "characters" && (
          <CharacterTab
            activePresetId={activePreset}
            characters={characters}
            setCharacters={setCharacters}
            templateVars={templateVars}
            setTemplateVars={setTemplateVars}
            activeCharId={activeCharId}
            setActiveCharId={setActiveCharId}
            userCharId={userCharId}
            setUserCharId={setUserCharId}
            entities={entities}
            setEntities={setEntities}
            inputStyle={inputStyle}
            charactersLoading={charactersLoading}
            onStartGroupChat={config?.style === "roleplay" ? () => setGroupSetupOpen(true) : undefined}
          />
        )}

        {/* ── MEMORY ── */}
        {activePanel === "memory" && (
          <Memory 
            memories={memories}
            memoryLog={memoryLog}
            config={config}
            addManualMemory={addManualMemory}
            deleteMemory={deleteMemory} 
            toggleMemoryPin={toggleMemoryPin}       
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
            toggleLorePin={toggleLorePin}
            onOpenEdges={openLoreEdges}
            loreEdgePanel={loreEdgePanel}
            setLoreEdgePanel={setLoreEdgePanel}
            entities={entities}
            graphAPI={graphAPI}
          />
        )}

        {activePanel === "graph" && (
          <GraphPanel
            activeChatId={activeChatId}
            activePresetId={activePreset}
            activePreset={activePreset}
            isRoleplay={config?.style === "roleplay"}
          />
        )}
      </div>
      <InjectionPanel
        visible={injectionPanel.visible}
        memData={injectionPanel.memData}
        loreData={injectionPanel.loreData}
        inferenceData={injectionPanel.inferenceData ?? []}
        onMouseEnter={keepPanelOpen}
        onMouseLeave={hideInjectionPanel}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        lmStudioUrl={lmStudioUrl}
        setLmStudioUrl={setLmStudioUrl}
        config={config}
        setConfig={setConfig}
        persistConfig={persistConfig}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        lorebook={lorebook}
        setLorebook={setLorebook}
        activeChatId={activeChatId}
        setNodes={setNodes}
        setActiveChildren={setActiveChildren}
        setMemories={setMemories}
        graphAPI={graphAPI}
        presets={presets}
        activePreset={activePreset}
        applyPreset={applyPreset}
        updatePresetConfig={updatePresetConfig}
        updatePresetPrompt={updatePresetPrompt}
        theme={theme} 
        setTheme={setTheme} 
        themes={themes}
        confirm={confirm}
      />
      {groupSetupOpen && (
        <GroupChatSetupModal
          characters={characters}
          activeCharId={activeCharId}
          userCharId={userCharId}
          onStart={startGroupChat}
          onCancel={() => setGroupSetupOpen(false)}
        />
      )}
      {ConfirmModalRenderer()}
      {shortcutsOpen && <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}
