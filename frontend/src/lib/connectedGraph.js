export async function getConnectedGraph(charId, { characters, entities, graphAPI }) {
  const characterIds = new Set();
  const loreIds = new Set();
  if (!charId) return { characterIds, loreIds };

  const isCharacter = id => characters.some(c => c.id === id);

  async function neighboursOf(id) {
    const edges = await graphAPI.getEdges(id, "both").catch(() => []);
    return edges.map(e => (e.source_id === id ? e.target_id : e.source_id));
  }

  const firstHop = await neighboursOf(charId);
  for (const id of firstHop) {
    if (isCharacter(id)) characterIds.add(id);
    else loreIds.add(id);
  }

  for (const cid of characterIds) {
    const secondHop = await neighboursOf(cid);
    for (const id of secondHop) {
      if (!isCharacter(id)) loreIds.add(id);
    }
  }

  return { characterIds, loreIds };
}