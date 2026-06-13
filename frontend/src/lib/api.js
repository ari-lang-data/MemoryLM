const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

// ─── Chats ────────────────────────────────────────────────────────────────────
export const chatsAPI = {
  getAll:  ()                                    => request("GET",    "/chats/"),
  create:  (id, title, created_at, updated_at)   => request("POST",   "/chats/",        { id, title, created_at, updated_at }),
  update:  (id, title, updated_at)               => request("PATCH",  `/chats/${id}`,   { title, updated_at }),
  bindCharacters: (id, body)                     => request("PATCH", `/chats/${id}/bind`, body),
  delete:  (id)                                  => request("DELETE", `/chats/${id}`),
};

// ─── Memories ─────────────────────────────────────────────────────────────────
export const memoriesAPI = {
  add:           (memory)                                                      => request("POST",   "/memories/",                  memory),
  query:         (chat_id, embedding, n_results, threshold, alpha, decay_rate) => request("POST",   "/memories/query",             { chat_id, embedding, n_results, threshold, alpha, decay_rate }),
  update:        (id, summary, embedding, timestamp)                           => request("PUT",    `/memories/${id}`,             { summary, embedding, timestamp }),
  delete:        (id)                                                          => request("DELETE", `/memories/${id}`),
  clearChat:     (chat_id)                                                     => request("DELETE", `/memories/chat/${chat_id}`),
  getByChat:     (chat_id)                                                     => request("GET",    `/memories/chat/${chat_id}`),
  getPinned:     (chat_id)                                                     => request("GET",    `/memories/pinned/${chat_id}`),
  pin:           (id, pinned)                                                  => request("PATCH",  `/memories/${id}/pin`,         { pinned }),
  fork:          (sourceChatId, targetChatId, beforeTimestamp)                 => request("POST",   "/memories/fork",              { source_chat_id: sourceChatId, target_chat_id: targetChatId, before_timestamp: beforeTimestamp }),
  markRetrieved: (id, last_retrieved)                                          => request("PATCH",  `/memories/${id}/retrieved`,   { last_retrieved }),
};

// ─── Lorebook ─────────────────────────────────────────────────────────────────
export const lorebookAPI = {
  getAll:    ()                                => request("GET",    "/lorebook/"),
  add:       (entry)                           => request("POST",   "/lorebook/",          entry),
  query:     (embedding, n_results, threshold) => request("POST",   "/lorebook/query",     { embedding, n_results, threshold }),
  update:    (id, entry)                       => request("PUT",    `/lorebook/${id}`,     entry),
  delete:    (id)                              => request("DELETE", `/lorebook/${id}`),
  getPinned: ()                                => request("GET",    "/lorebook/pinned"),
  pin:       (id, pinned)                      => request("PATCH",  `/lorebook/${id}/pin`, { pinned }),
};

// ─── Presets ──────────────────────────────────────────────────────────────────
export const presetsAPI = {
  getAll: ()       => request("GET",    "/presets/"),
  save:   (preset) => request("POST",   "/presets/",      preset),
  delete: (id)     => request("DELETE", `/presets/${id}`),
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messagesAPI = {
  get:   (chat_id)                        => request("GET",    `/messages/${chat_id}`),
  save:  (chat_id, nodes, activeChildren) => request("POST",   `/messages/${chat_id}`, { nodes, activeChildren }),
  clear: (chat_id)                        => request("DELETE", `/messages/${chat_id}`),
};

// ─── Memory clusters ──────────────────────────────────────────────────────────
export const clustersAPI = {
  assign: (memory_id, chat_id, embedding, summary, threshold) =>
    request("POST", "/clusters/assign", { memory_id, chat_id, embedding, summary, threshold }),
  query:  (chat_id, embedding, n_results, threshold) =>
    request("POST", "/clusters/query", { chat_id, embedding, n_results, threshold }),
};

// ─── Entity graphs ────────────────────────────────────────────────────────────
export const graphAPI = {
  // Entities
  createEntity:  (entity)                         => request("POST",   "/graph/entities",          entity),
  getEntities:   (chat_id, preset_id, type)        => request("GET",    `/graph/entities?${new URLSearchParams({ ...(chat_id && { chat_id }), ...(preset_id && { preset_id }), ...(type && { type }) })}`),
  getEntity:     (id)                             => request("GET",    `/graph/entities/${id}`),
  updateEntity:  (id, body)                       => request("PATCH",  `/graph/entities/${id}`,    body),
  deleteEntity:  (id)                             => request("DELETE", `/graph/entities/${id}`),

  // Edges
  createEdge:    (edge)                           => request("POST",   "/graph/edges",             edge),
  getEdges:      (entity_id, direction)           => request("GET",    `/graph/edges/${entity_id}?direction=${direction ?? "both"}`),
  updateEdge:    (id, body)                       => request("PATCH",  `/graph/edges/${id}`,       body),
  deleteEdge:    (id)                             => request("DELETE", `/graph/edges/${id}`),

  // Characters
  upsertCharacter:   (id, body)                   => request("PUT",    `/graph/characters/${id}`,  body),
  getCharacters:     (preset_id)                  => request("GET",    `/graph/characters?${preset_id ? `preset_id=${preset_id}` : ""}`),
  getCharacter:      (id)                         => request("GET",    `/graph/characters/${id}`),
  activateCharacter: (id, is_user)                => request("PATCH",  `/graph/characters/${id}/activate?is_user=${!!is_user}`),

  // Template vars
  setTemplateVar:    (body)                       => request("POST",   "/graph/template-vars",     body),
  getTemplateVars:   (preset_id)                  => request("GET",    `/graph/template-vars?${preset_id ? `preset_id=${preset_id}` : ""}`),

  // Traversal
  traverse: (entity_id, depth, relationship)      => request("GET",    `/graph/traverse/${entity_id}?depth=${depth ?? 1}${relationship ? `&relationship=${relationship}` : ""}`),
};

// ─── Episodic ─────────────────────────────────────────────────────────────────
export const episodicAPI = {
  // Inferences
  createInference:    (body)          => request("POST",   "/episodic/inferences",                    body),
  getInferences:      (chat_id, status) => {
    const params = new URLSearchParams({ chat_id, ...(status && { status }) });
    return request("GET", `/episodic/inferences?${params}`);
  },
  getInference:       (id)            => request("GET",    `/episodic/inferences/${id}`),
  resolveInference:   (id, body)      => request("PATCH",  `/episodic/inferences/${id}/resolve`,      body),
  updateConfidence:   (id, confidence) => request("PATCH", `/episodic/inferences/${id}/confidence`,   { confidence }),
  deleteInference:    (id)            => request("DELETE", `/episodic/inferences/${id}`),

  // Facts
  createFact:  (body)    => request("POST",   "/episodic/facts",       body),
  getFacts:    (chat_id) => request("GET",    `/episodic/facts?chat_id=${chat_id}`),
  getFact:     (id)      => request("GET",    `/episodic/facts/${id}`),
  deleteFact:  (id)      => request("DELETE", `/episodic/facts/${id}`),
};

// ─── Events ─────────────────────────────────────────────────────────────────
export const eventsAPI = {
  enqueue: (body) => request("POST", "/events/enqueue", body),
  // SSE connection is handled directly via EventSource, not fetch
  connect: (chat_id, since, handlers) => {
    const url = `${BASE_URL}/events/stream/${chat_id}${since ? `?since=${since}` : ""}`;
    const es  = new EventSource(url);
    Object.entries(handlers).forEach(([event, handler]) => {
      es.addEventListener(event, e => handler(JSON.parse(e.data)));
    });
    es.onerror = () => {
      // Reconnect handled automatically by EventSource
    };
    return es; // caller holds reference and calls es.close() on unmount
  },
};