// Strict left-to-right tree layout ("tidy tree"). Every node's subtree gets its own vertical
// band, so siblings always sit together and the parent is centred on them; nothing from
// another branch can end up between two siblings (a column-wide layout such as dagre's
// reorders whole ranks to reduce crossings and can push one sibling far from the others).
// Each child column starts a fixed gap to the right of its own parent card.
//
// Returns top-left positions keyed by node id.

const SIBLING_GAP = 22;
const RANK_GAP = 110;

export function layoutTree(ids, edges, sizes) {
  const children = new Map(ids.map((id) => [id, []]));
  const hasParent = new Set();
  for (const [source, target] of edges) {
    children.get(source)?.push(target);
    hasParent.add(target);
  }

  const band = new Map(); // subtree height
  const measure = (id) => {
    const kids = children.get(id);
    const own = sizes.get(id).h;
    const block = kids.reduce((sum, k) => sum + measure(k), 0) + SIBLING_GAP * Math.max(0, kids.length - 1);
    const h = Math.max(own, block);
    band.set(id, h);
    return h;
  };

  const out = new Map();
  const place = (id, x, top) => {
    const { w, h } = sizes.get(id);
    const kids = children.get(id);
    const total = band.get(id);
    out.set(id, { x, y: top + (total - h) / 2 });
    const block = kids.reduce((sum, k) => sum + band.get(k), 0) + SIBLING_GAP * Math.max(0, kids.length - 1);
    let y = top + (total - block) / 2;
    for (const k of kids) {
      place(k, x + w + RANK_GAP, y);
      y += band.get(k) + SIBLING_GAP;
    }
  };

  let top = 0;
  for (const id of ids) {
    if (hasParent.has(id)) continue;
    measure(id);
    place(id, 0, top);
    top += band.get(id) + SIBLING_GAP * 4;
  }
  return out;
}
