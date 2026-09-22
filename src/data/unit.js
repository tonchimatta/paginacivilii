// The only module that knows which unit is loaded. To point the app at other notes, run
// `node scripts/build-data.mjs --notes <file> --title <name>`; no component changes needed.
import unit from '../generated/unit.json';

export const title = unit.title;
export const rootId = unit.rootId;
export const articles = unit.articles;
export const nodesById = new Map(unit.nodes.map((n) => [n.id, n]));

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

// Each part (top-level branch) gets one pastel; everything under it reuses it.
const TINTS = ['lavender', 'pink', 'peach', 'yellow', 'sky', 'mint'];
const partIndex = new Map(nodesById.get(rootId).children.map((id, i) => [id, i]));

export function tintOf(id) {
  if (id === rootId) return 'ink';
  const chain = [id, ...ancestorsOf(id)];
  const part = chain.find((x) => partIndex.has(x));
  return part ? TINTS[partIndex.get(part) % TINTS.length] : 'lavender';
}
