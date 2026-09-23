// The only module that knows which unit (professor's notes) is loaded. App calls setUnit()
// before mounting the map; the exports below are live bindings, so every component reads
// the current unit. The JSONs are built by scripts/build-data.mjs.

// Each unit is its own chunk, fetched when its map is opened.
export const UNITS = {
  'gandarillas-vergara': () => import('../generated/gandarillas-vergara.json'),
  'eyzaguirre-allende': () => import('../generated/eyzaguirre-allende.json'),
  'pater-germain': () => import('../generated/pater-germain.json'),
  'cifuentes-dibarrat': () => import('../generated/cifuentes-dibarrat.json'),
  barrientos: () => import('../generated/barrientos.json'),
  'fernandez-fontecilla': () => import('../generated/fernandez-fontecilla.json'), // 2 mapas
};

export let title = '';
export let rootId = 'root';
export let articles = {};
export let nodesById = new Map();
// Roots of the unit's maps: usually just the unit root; a page with several professors'
// notes has one root per map (each opens in its own tab).
export let maps = ['root'];
let partIndex = new Map();

export function setUnit(unit) {
  title = unit.title;
  rootId = unit.rootId;
  articles = unit.articles;
  nodesById = new Map(unit.nodes.map((n) => [n.id, n]));
  maps = unit.maps ?? [unit.rootId];
  // Each part (top-level branch of a map) gets one pastel; everything under it reuses it.
  partIndex = new Map(maps.flatMap((m) => nodesById.get(m).children.map((id, i) => [id, i])));
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

// The map (tab root) a node belongs to.
export function mapOf(id) {
  return [id, ...ancestorsOf(id)].find((x) => maps.includes(x)) ?? rootId;
}

export function tintOf(id) {
  if (id === rootId || maps.includes(id)) return 'ink';
  const chain = [id, ...ancestorsOf(id)];
  const part = chain.find((x) => partIndex.has(x));
  return part ? TINTS[partIndex.get(part) % TINTS.length] : 'lavender';
}
