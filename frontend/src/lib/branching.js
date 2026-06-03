export function getActivePath(nodes, activeChildren) {
  if (!nodes.length) return [];
  
  const byId     = Object.fromEntries(nodes.map(n => [n.id, n]));
  const childMap = {};
  
  for (const node of nodes) {
    if (node.parentId) {
      if (!childMap[node.parentId]) childMap[node.parentId] = [];
      childMap[node.parentId].push(node.id);
    }
  }

  const roots = nodes.filter(n => !n.parentId);
  if (roots.length === 0) return [];

  const path = [];
  let current = roots[0];

  while (current) {
    path.push(current);
    const children = childMap[current.id] ?? [];
    if (children.length === 0) break;
    const nextId = activeChildren[current.id] ?? children[0];
    current = byId[nextId] ?? null;
  }

  return path;
}

export function getSiblings(nodes, parentId) {
  return nodes
    .filter(n => n.parentId === parentId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}