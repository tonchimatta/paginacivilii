import dagre from 'dagre';

// Strict left-to-right tree layout. Returns top-left positions keyed by node id.
export function layoutTree(ids, edges, sizes) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 26, ranksep: 110, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of ids) {
    const { w, h } = sizes.get(id);
    g.setNode(id, { width: w, height: h });
  }
  for (const [source, target] of edges) g.setEdge(source, target);
  dagre.layout(g);
  const out = new Map();
  for (const id of ids) {
    const n = g.node(id);
    const { w, h } = sizes.get(id);
    out.set(id, { x: n.x - w / 2, y: n.y - h / 2 });
  }
  return out;
}
