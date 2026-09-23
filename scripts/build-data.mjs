#!/usr/bin/env node
// Build-time preprocessing: each professor's notes markdown + Código Civil markdown -> one
// JSON tree per unit (src/generated/<id>.json). The React app only ever reads those JSONs.
//
// Usage:
//   node scripts/build-data.mjs                 builds every unit in UNITS
//   node scripts/build-data.mjs --notes <md> --out <json> [--title <name>] [--code <md>]

import fs from 'node:fs';
import path from 'node:path';
import { parseCodigoCivil } from './lib/parse-codigo.mjs';
import { parseNotes } from './lib/parse-notes.mjs';

// One entry per professor with notes; `id` must match src/data/professors.js.
const UNITS = [
  { id: 'gandarillas-vergara', notes: 'data/gandarillas-vergara.md', title: 'Gandarillas y Vergara' },
  { id: 'eyzaguirre-allende', notes: 'data/eyzaguirre-allende.md', title: 'Eyzaguirre y Allende' },
];

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const codePath = path.resolve(root, args.code ?? 'data/codigo-civil.md');
const code = parseCodigoCivil(fs.readFileSync(codePath, 'utf8').normalize('NFC'));

const jobs = args.notes
  ? [{ notes: args.notes, title: args.title ?? path.basename(args.notes, '.md'), out: args.out ?? 'src/generated/unit.json' }]
  : UNITS.map((u) => ({ ...u, out: `src/generated/${u.id}.json` }));

for (const job of jobs) {
  const notesPath = path.resolve(root, job.notes);
  const outPath = path.resolve(root, job.out);
  const unit = parseNotes(fs.readFileSync(notesPath, 'utf8').normalize('NFC'), { title: job.title, code });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(unit, null, 1));

  const counts = unit.nodes.reduce((c, n) => ((c[n.type] = (c[n.type] ?? 0) + 1), c), {});
  console.log(
    `[data] ${path.relative(root, outPath)}: ${unit.nodes.length} nodos ` +
      `(${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}), ` +
      `${Object.keys(unit.articles).length} artículos citados, ` +
      `${unit.stats.articleRefs} citas, ${unit.stats.conceptRefs} referencias cruzadas`,
  );
  for (const w of unit.warnings) console.warn(`[data] aviso (${job.title}): ${w}`);
}
