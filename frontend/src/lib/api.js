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
  delete:  (id)                                  => request("DELETE", `/chats/${id}`),
};

// ─── Memories ─────────────────────────────────────────────────────────────────
export const memoriesAPI = {
  add:         (memory)                                          => request("POST",   "/memories/",                    memory),
  query:       (chat_id, embedding, n_results, threshold, alpha, decay_rate) => request("POST", "/memories/query", { chat_id, embedding, n_results, threshold, alpha, decay_rate }),
  update:      (id, summary, embedding, timestamp)              => request("PUT",    `/memories/${id}`,               { summary, embedding, timestamp }),
  delete:      (id)                                             => request("DELETE", `/memories/${id}`),
  clearChat:   (chat_id)                                        => request("DELETE", `/memories/chat/${chat_id}`),
  getByChat:   (chat_id)                                        => request("GET",    `/memories/chat/${chat_id}`),
  getPinned:   (chat_id)                                        => request("GET",    `/memories/pinned/${chat_id}`),
  pin:         (id, pinned)                                     => request("PATCH",  `/memories/${id}/pin`,           { pinned }),
  fork:        (sourceChatId, targetChatId, beforeTimestamp)    => request("POST",   "/memories/fork",                { source_chat_id: sourceChatId, target_chat_id: targetChatId, before_timestamp: beforeTimestamp }),
  markRetrieved: (id, last_retrieved)                           => request("PATCH", `/memories/${id}/retrieved`, { last_retrieved }),
};

// ─── Lorebook ─────────────────────────────────────────────────────────────────
export const lorebookAPI = {
  getAll:     ()              => request("GET",    "/lorebook/"),
  add:        (entry)         => request("POST",   "/lorebook/",          entry),
  query:      (embedding, n_results, threshold) => request("POST", "/lorebook/query", { embedding, n_results, threshold }),
  update:     (id, entry)     => request("PUT",    `/lorebook/${id}`,     entry),
  delete:     (id)            => request("DELETE", `/lorebook/${id}`),
  getPinned:  ()              => request("GET",    "/lorebook/pinned"),
  pin:        (id, pinned)    => request("PATCH",  `/lorebook/${id}/pin`, { pinned }),
};

// ─── Presets ──────────────────────────────────────────────────────────────────
export const presetsAPI = {
  getAll: ()       => request("GET",    "/presets/"),
  save:   (preset) => request("POST",   "/presets/",      preset),
  delete: (id)     => request("DELETE", `/presets/${id}`),
};

// ─── Messages ──────────────────────────────────────────────────────────────────
export const messagesAPI = {
  get:   (chat_id)                    => request("GET",    `/messages/${chat_id}`),
  save:  (chat_id, nodes, activeChildren) => request("POST", `/messages/${chat_id}`, { nodes, activeChildren }),
  clear: (chat_id)                    => request("DELETE", `/messages/${chat_id}`),
};

// ─── Memory clusters ─────────────────────────────────────────────────────────────────
export const clustersAPI = {
  assign: (memory_id, chat_id, embedding, summary, threshold) =>
    request("POST", "/clusters/assign", { memory_id, chat_id, embedding, summary, threshold }),
  query:  (chat_id, embedding, n_results, threshold) =>
    request("POST", "/clusters/query", { chat_id, embedding, n_results, threshold }),
};