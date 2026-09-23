#!/usr/bin/env node
// Largo de las tarjetas de uno o más mapas ya generados (src/generated/<id>.json), para
// comparar la densidad con los apuntes que ya están aprobados y encontrar qué partir.
//
// Uso: node card-stats.mjs <id> [<id>...] [--top 25]
// Imprime por mapa: nº de tarjetas, largo medio del cuerpo, cuántas pasan 2500, las más
// largas (con su padre) y títulos sospechosos ("P. ej.", minúscula, "Art." suelto...).

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const argv = process.argv.slice(2);
const topIdx = argv.indexOf('--top');
const top = topIdx >= 0 ? Number(argv[topIdx + 1]) : 25;
const ids = argv.filter((a, i) => !a.startsWith('--') && i !== topIdx + 1);

for (const id of ids) {
  const unit = JSON.parse(fs.readFileSync(path.join(root, 'src/generated', `${id}.json`), 'utf8'));
  const byId = new Map(unit.nodes.map((n) => [n.id, n]));
  const sized = unit.nodes.map((n) => ({ n, len: (n.body ?? '').length })).sort((a, b) => b.len - a.len);
  const avg = Math.round(sized.reduce((s, x) => s + x.len, 0) / sized.length);
  console.log(`\n== ${id}: ${unit.nodes.length} tarjetas, cuerpo medio ${avg}, >2500: ${sized.filter((x) => x.len > 2500).length}`);
  for (const { n, len } of sized.slice(0, top)) {
    console.log(`${String(len).padStart(6)}  ${n.title.slice(0, 60)}  <  ${(byId.get(n.parentId)?.title ?? '').slice(0, 40)}`);
  }
  const odd = unit.nodes.filter((n) => /^(P\. ?ej|Ej\b|Art\b|[a-zé]|y |o |Y |O |→|\(|“)/.test(n.title) || n.title.length < 3 || n.title.length > 90);
  if (odd.length) console.log(`-- títulos sospechosos (${odd.length}):\n${odd.map((n) => `   ${n.kind} | ${n.title.slice(0, 90)}`).join('\n')}`);
}
