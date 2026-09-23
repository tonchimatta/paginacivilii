// Reading-order navigation for the ← / → buttons, within one tab's tree (rooted at rootId).
//
// Forward follows the notes in reading order (pre-order):
//   - a card with branches goes to its first branch;
//   - otherwise to its next sibling;
//   - when a card has no next sibling, the branch it closes is finished: go up to the next
//     subtema / tema / parte, and that finished branch can be folded away.
// Back goes one card back in the hierarchy: the previous sibling, or the parent from the
// first sibling. Neither goes outside the tab's root.

import { nodesById } from '../data/unit.js';

const LEVEL = { subtema: 'Siguiente subtema', tema: 'Siguiente tema', parte: 'Siguiente parte' };

export function nextOf(id, rootId) {
  const node = nodesById.get(id);
  if (!node) return null;
  if (node.children.length) return { target: node.children[0], via: 'child', finished: null };
  let cur = id;
  while (cur !== rootId) {
    const parent = nodesById.get(nodesById.get(cur).parentId);
    if (!parent) return null;
    const i = parent.children.indexOf(cur);
    if (i + 1 < parent.children.length) {
      const target = parent.children[i + 1];
      // `finished` is the branch left behind when climbing (null between plain siblings).
      return { target, via: cur === id ? 'sibling' : 'up', finished: cur === id ? null : cur };
    }
    cur = parent.id;
  }
  return null;
}

export function prevOf(id, rootId) {
  if (id === rootId) return null;
  const parent = nodesById.get(nodesById.get(id)?.parentId);
  if (!parent) return null;
  const i = parent.children.indexOf(id);
  return { target: i > 0 ? parent.children[i - 1] : parent.id };
}

// Button caption: where the step goes. Crossing into the next subtema/tema/parte says so.
export function stepLabel(step, direction) {
  if (!step) return null;
  const node = nodesById.get(step.target);
  const name = node.number ? `${node.number} · ${node.title}` : node.title;
  if (direction === 'back') return { kicker: 'Anterior', name };
  const kicker = step.via === 'up' ? LEVEL[node.kind] ?? 'Siguiente' : step.via === 'child' ? 'Entrar' : 'Siguiente';
  return { kicker, name };
}
