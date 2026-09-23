// The only module that knows which unit (professor's notes) is loaded. App calls setUnit()
// before mounting the map; the exports below are live bindings, so every component reads
// the current unit. The JSONs are built by scripts/build-data.mjs.

// Each unit is its own chunk, fetched when its map is opened.
export const UNITS = {
  'gandarillas-vergara': () => import('../generated/gandarillas-vergara.json'),
  'eyzaguirre-allende': () => import('../generated/eyzaguirre-allende.json'),
  'pater-germain': () => import('../generated/pater-germain.json'),
  'cifuentes-dibarrat': () => import('../generated/cifuentes-dibarrat.json'),
  'fernandez-fontecilla': () => import('../generated/fernandez-fontecilla.json'),
};

export let title = '';
export let rootId = 'root';
export let articles = {};
export let nodesById = new Map();
let partIndex = new Map();

export function setUnit(unit) {
  title = unit.title;
  rootId = unit.rootId;
  articles = unit.articles;
  nodesById = new Map(unit.nodes.map((n) => [n.id, n]));
  // Each part (top-level branch) gets one pastel; everything under it reuses it.
  partIndex = new Map(nodesById.get(rootId).children.map((id, i) => [id, i]));
}

export function ancestorsOf(id) {
  const out = [];
  for (let p = nodesById.get(id)?.parentId; p; p = nodesById.get(p)?.parentId) out.push(p);
  return out;
}

export function descendantsOf(id) {
  const out = [];
  const stack = [...(nodesById.get(id)?.children ?? [])];
  while (stack.length) {
    const cur = stack.pop();
    out.push(cur);
    stack.push(...(nodesById.get(cur)?.children ?? []));
  }
  return out;
}

const TINTS = ['lavender', 'pink', 'peach', 'yellow', 'sky', 'mint'];

export function tintOf(id) {
  if (id === rootId) return 'ink';
  const chain = [id, ...ancestorsOf(id)];
  const part = chain.find((x) => partIndex.has(x));
  return part ? TINTS[partIndex.get(part) % TINTS.length] : 'lavender';
}
