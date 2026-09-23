#!/usr/bin/env node
// One-off cleanup: the Eyzaguirre y Allende notes arrive as a PDF converted to markdown
// (data/raw/eyzaguirre.md). This turns them into the same shape as data/gandarillas-vergara.md, so the
// same parser builds the map:
//   - drops the cover, the index, page headers ("Apuntes Antonia Larrañaga" + page number);
//   - joins paragraphs, article quotes and tables that a page break cut in two;
//   - footnotes: a footnote that only quotes a cited Código Civil article is dropped (the
//     article opens on click); any other footnote goes inline, in parentheses;
//   - strips <u>, <mark>, inline code and decorative bullets (❖, ➢, a., i., 1)...);
//   - turns "art. 565 cc" citations into [[Código Civil#^art-565|565]] links;
//   - turns paragraphs that are only an underlined or bold phrase into "**Label:**".
// The PDF's heading levels are unreliable, so they come out as-is and the outline (parts,
// temas, subtemas) was then set by hand in data/eyzaguirre-allende.md. That file is the source now:
// this script refuses to overwrite it without --force.
//
// Usage: node scripts/prepare-eyzaguirre.mjs [--out file.md] [--force]

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'data/raw/eyzaguirre.md');
const argOut = process.argv.indexOf('--out');
const out = path.resolve(root, argOut > 0 ? process.argv[argOut + 1] : 'data/eyzaguirre-allende.md');
if (fs.existsSync(out) && !process.argv.includes('--force')) {
  console.error(`[eyzaguirre] ${path.relative(root, out)} ya existe y tiene los encabezados ordenados a mano; usa --out o --force.`);
  process.exit(1);
}

let lines = fs.readFileSync(src, 'utf8').normalize('NFC').split('\n').map((l) => l.replace(/\s+$/, ''));

// ---- Cover and index ------------------------------------------------------------------
const start = lines.findIndex((l) => /^## \*\*Bienes\*\*$/.test(l));
lines = lines.slice(start);

// ---- Page headers -----------------------------------------------------------------------
{
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^_Apuntes Antonia Larrañaga_$/.test(lines[i])) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (/^\d+$/.test(lines[j]?.trim())) i = j;
      kept.push('\u0000PAGE');
      continue;
    }
    kept.push(lines[i]);
  }
  lines = kept;
}

// ---- Footnotes --------------------------------------------------------------------------
// They sit right before a page break: "> 5 **Art. 1437 CC** `...`", sometimes without the
// ">" ("27 Aprender de memoria"), sometimes continued on the next line ("> `Si de hecho...`")
// or even glued to the next footnote on the same line ("...otros”.` 31 El profesor...").
const notes = new Map();
{
  const refs = new Set([...lines.join('\n').matchAll(/<sup>\W*(\d+)\W*<\/sup>/g)].map((m) => Number(m[1])));
  // Every "> ..." line is a footnote: a new one when it opens with an unused number,
  // otherwise the continuation of the last one.
  let last = null;
  const top = () => Math.max(0, ...notes.keys());
  const open = (n, text) => {
    notes.set(n, '');
    last = n;
    add(text);
  };
  const add = (text) => {
    const glued = text.match(new RegExp(`^(.*?)\\s(${top() + 1}) ([A-ZÁÉÍÓÚ¿].*)$`));
    if (glued) {
      notes.set(last, `${notes.get(last)} ${glued[1]}`.trim());
      return open(top() + 1, glued[3]);
    }
    notes.set(last, `${notes.get(last)} ${text}`.trim());
  };
  const kept = [];
  let prevNote = false;
  for (const line of lines) {
    if (!line.trim()) {
      kept.push(line);
      continue;
    }
    const quoted = line.startsWith('>');
    const body = line.replace(/^>\s?/, '');
    const m = body.match(/^(\d{1,2}) (.*)$/);
    const n = m && Number(m[1]);
    const fresh = m && !notes.has(n) && n <= top() + 5 && (quoted || refs.has(n) || n === top() + 1 || prevNote);
    prevNote = true;
    if (fresh) open(n, m[2]);
    else if (quoted && last !== null) add(body);
    else {
      kept.push(line);
      prevNote = false;
    }
  }
  lines = kept;
}

// ---- Inline noise -----------------------------------------------------------------------
const inline = (s) =>
  s
    .replace(/<\/?(u|mark)>/g, '')
    .replace(/`o`\s*/g, '')
    .replace(/`/g, '')
    .replace(/\*\*\s*\*\*/g, ' ')
    .replace(/_\s*_/g, ' ');

// A paragraph that is only an underlined or bold phrase is a sub-heading of the notes:
// "<u>Paralelo entre los derechos</u>" becomes the label "**Paralelo entre los derechos:**".
const asLabel = (l) => {
  const bare = l.replace(/<\/?mark>/g, '').replace(/`/g, '').replace(/<sup>.*?<\/sup>/g, '').trim();
  if (!bare || /^[-*|#>]|^\d+\. /.test(bare) || bare.length > 110) return null;
  const inner = bare.replace(/<\/?u>/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  const wrapped = /^(\*\*)?\s*<u>.*<\/u>\s*(\*\*)?\s*[:.]?\s*$/.test(bare.replace(/<\/u>\s*(\*\*)?\s*(\*\*)?\s*<u>/g, '')) || /^\*\*[^*]+\*\*\s*[:.]?$/.test(bare);
  if (!wrapped || /\bart[íi]?c?\.?\s*\d/i.test(inner) || inner.split(' ').length > 14) return null;
  const note = l.match(/<sup>.*?<\/sup>/)?.[0] ?? '';
  const text = inner.replace(/\s*[:.]$/, '');
  return `**${text}${/\?$/.test(text) ? '' : ':'}**${note}`;
};
let labels = 0;
lines = lines.filter((l) => !/<!--.*-->/.test(l));
lines = lines.map((l) => {
  if (l.startsWith('```')) return l;
  const label = asLabel(l);
  if (label) labels++;
  return inline(label ?? l);
});
// Enumerations typed as loose paragraphs ("i. Contratos", "ii. Cuasicontratos") are lists.
lines = lines.map((l) => l.replace(/^([ivx]{1,4}|[a-h])\s?[.)] (?=\S)/, '- ').replace(/^[▪❖➢•○]\s*/, '   - '));

// ---- Blocks -----------------------------------------------------------------------------
// Group lines into blocks (paragraphs, list runs, tables, fenced code, headings).
let blocks = [];
{
  let cur = null;
  let fence = null;
  const flush = () => {
    if (cur) blocks.push(cur);
    cur = null;
  };
  for (const line of lines) {
    if (fence) {
      if (line.startsWith('```')) {
        blocks.push({ type: 'code', lines: fence });
        fence = null;
      } else fence.push(line);
      continue;
    }
    if (line.startsWith('```')) {
      flush();
      fence = [];
      continue;
    }
    if (line === '\u0000PAGE') {
      flush();
      blocks.push({ type: 'page' });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const type = /^#{1,6} /.test(line) ? 'heading' : line.startsWith('|') ? 'table' : /^\s*[-*] |^\s*\d+\. /.test(line) ? 'list' : 'para';
    if (cur && (cur.type === type) && type !== 'heading' && type !== 'para') cur.lines.push(line);
    else {
      flush();
      cur = { type, lines: [line] };
    }
  }
  flush();
}

// Lists: consecutive list blocks (separated only by blank lines) are one list.
{
  const merged = [];
  for (const b of blocks) {
    const prev = merged[merged.length - 1];
    if (b.type === 'list' && prev?.type === 'list') prev.lines.push(...b.lines);
    else merged.push(b);
  }
  blocks = merged;
}

// Fenced code is always the rest of an article quote that a page break (or the PDF's
// layout) pushed out of its paragraph: glue it back, as prose.
const lastLineOf = (b) => b.lines.length - 1;
const endsOpen = (s) => !/[.:;?!”")»]\**\s*$/.test(s.trim());
const startsLower = (s) => /^[a-záéíóúñü(“"]/.test(s.trim()) && !/^([ivx]+|[a-z])[.)]\s/.test(s.trim());
{
  const merged = [];
  let pendingPage = false;
  for (const b of blocks) {
    if (b.type === 'page') {
      pendingPage = true;
      continue;
    }
    const prev = merged[merged.length - 1];
    if (b.type === 'code' && prev && prev.type !== 'heading') {
      // Inside quoted articles the PDF left footnote marks as bare digits: "social,37 con".
      const text = inline(b.lines.map((l) => l.trim()).join(' ')).replace(/([\p{L},.;:”])(\d{1,2})(?=[\s.,”]|$)/gu, (all, p, n) =>
        notes.has(Number(n)) ? `${p} (${inline(notes.get(Number(n))).replace(/\.$/, '')})` : all,
      );
      prev.lines[lastLineOf(prev)] = `${prev.lines[lastLineOf(prev)]} ${text}`;
      pendingPage = false;
      continue;
    }
    if (b.type === 'code') b.type = 'para';
    // A paragraph cut by a page break continues in lower case.
    if (prev && pendingPage && (b.type === 'para') && prev.type !== 'heading' && prev.type !== 'table' && startsLower(b.lines[0]) && endsOpen(prev.lines[lastLineOf(prev)])) {
      prev.lines[lastLineOf(prev)] = `${prev.lines[lastLineOf(prev)]} ${b.lines.join(' ')}`;
      pendingPage = false;
      continue;
    }
    // A table cut by a page break: same number of columns, the "header" is really a row.
    if (prev?.type === 'table' && b.type === 'table' && cols(prev.lines[0]) === cols(b.lines[0])) {
      prev.lines.push(...b.lines.filter((l) => !/^\|[-|\s:]+\|$/.test(l)));
      pendingPage = false;
      continue;
    }
    // A list cut by a page break.
    if (prev?.type === 'list' && b.type === 'list') {
      prev.lines.push(...b.lines);
      pendingPage = false;
      continue;
    }
    pendingPage = false;
    merged.push(b);
  }
  blocks = merged;
}
function cols(row) {
  return row.split('|').length;
}

// ---- Text cleanup -----------------------------------------------------------------------
const tidy = (s) =>
  s
    .replace(/<br>/g, ' ')
    .replace(/^(\s*)\s*/, '$1')
    .replace(/\*\*([^*]+?)\*\*\s*→\s*/g, '**$1:** ')
    .replace(/\*\*([^*]+?)\*\*\s+\*\*([^*]+?)\*\*/g, '**$1 $2**')
    .replace(/\*\*([^*]+?)\*\*\s+\*\*([^*]+?)\*\*/g, '**$1 $2**')
    .replace(/\*\*([^*]*?)\s+\*\*/g, '**$1**')
    .replace(/\*\*\s+([^*]*?)\*\*/g, '**$1**')
    .replace(/\*\*([^*]+?)\*\*\s*:/g, '**$1:**')
    .replace(/\*\*([^*]+?)\*\*\s+\./g, '**$1**.')
    .replace(/\*\*“/g, '** “')
    .replace(/“\s+/g, '“')
    .replace(/\s+”/g, '”')
    .replace(/\(\s+/g, '(')
    .replace(/\s+([,;)])/g, '$1')
    .replace(/(\S)\s+\.(\s|$)/g, '$1.$2')
    .replace(/(\S)\s+:(\s|$)/g, '$1:$2')
    .replace(/\bP ej\./g, 'P. ej.')
    .replace(/(\S)[ \t]{2,}/g, '$1 ')
    .replace(/\s+$/, '');

// The PDF lost the spaces around bold runs inside table cells: "un**vínculo**hay".
const spaceBold = (l) =>
  l.replace(/(\S?)\*\*([^*|]+?)\*\*(\S?)/g, (all, a, inner, b) => {
    const pre = a && /[\p{L}\d,.;:)]/u.test(a) ? `${a} ` : a;
    const post = b && /[\p{L}\d(]/u.test(b) ? ` ${b}` : b;
    const t = inner.trim();
    const trail = /[,.;:]$/.test(t) ? '' : '';
    return `${pre}**${t}**${trail}${post}`;
  });

// Decorative markers at the start of a list item.
const MARKER = /^(\s*[-*] )(?:\d+(?:\.\d+)+\.?\s+|[❖➢✓○●▪•→⮚➔]\s*|\(?[a-zA-Z]\s?\)\s+|\(?[ivxIVX]{1,4}\s?\)\s+|[a-zA-Z]\.\s+|[ivxIVX]{1,4}\.\s+|\(?\d{1,2}\)\s+)/;
const unmark = (l) => {
  let prev;
  do {
    prev = l;
    l = l.replace(MARKER, '$1');
  } while (l !== prev);
  return l;
};

// Footnotes: inline, or dropped when they only quote the article the text already cites.
const CITE_BEFORE = /(?:arts?\.?|art[íi]culos?)\s*(?:N°\s*)?\d[\d\s,y°º]*(?:\s*(?:inc(?:iso)?\.?|N°)\s*[\d°º\-–]+)*\s*(?:del\s+)?(?:cc|c\.c\.|código civil)\W*$/i;
const withNotes = (s) =>
  s.replace(/\s*<sup>\W*(\d+)\W*<\/sup>/g, (all, n, offset, whole) => {
    const note = tidy(inline(notes.get(Number(n)) ?? ''));
    if (!note) return '';
    const before = whole.slice(Math.max(0, offset - 60), offset).replace(/\*/g, '');
    const quotesArticle = /^\**\s*(art\.|“|")/i.test(note) || /^\**art/i.test(note);
    if (CITE_BEFORE.test(before) && quotesArticle) return '';
    return ` (${note.replace(/^[“"]|[”"]$/g, '').replace(/\.$/, '')})`;
  });

for (const b of blocks) {
  b.lines = b.lines.map((l) => {
    if (b.type === 'list') l = unmark(l);
    l = tidy(withNotes(l));
    if (b.type === 'table') l = spaceBold(l);
    return l;
  });
}

// ---- Article links ----------------------------------------------------------------------
// "art. 565 cc", "Art. 1489 inc 1 CC", "arts. 570 y 571 cc", "artículo 1830 del Código Civil".
const CITE = /\b(arts?\.?|art[íi]culos?)(\s*(?:N°\s*)?)(\d+(?:\s*(?:,|y|e|-|al?)\s*\d+)*)((?:\s*(?:inc(?:iso)?\.?|N°)\s*[\d°º]+(?:\s*[-–y]\s*\d+)?)*\s*(?:del\s+)?(?:cc|c\.c\.|código civil)\b)/gi;
const link = (text, inTable) =>
  text.replace(CITE, (all, word, gap, nums, tail) => {
    const sep = inTable ? '\\|' : '|';
    const linked = nums.replace(/\d+/g, (n) => `[[Código Civil#^art-${n}${sep}${n}]]`);
    return `${word}${gap}${linked}${tail}`;
  });
for (const b of blocks) {
  if (b.type === 'heading') continue;
  b.lines = b.lines.map((l) => link(l, b.type === 'table'));
}

// ---- Headings ---------------------------------------------------------------------------
const plainHeading = (l) =>
  l
    .replace(/^#+\s*/, '')
    .replace(/[*_]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*$/, '')
    .trim();

let md = '';
for (const b of blocks) {
  if (b.type === 'heading') {
    const level = b.lines[0].match(/^#+/)[0].length;
    md += `${'#'.repeat(level)} ${plainHeading(b.lines[0])}\n\n`;
    continue;
  }
  md += `${b.lines.join('\n')}\n\n`;
}

fs.writeFileSync(out, md.replace(/\n{3,}/g, '\n\n'));
console.log(`[eyzaguirre] ${path.relative(root, out)}: ${notes.size} notas al pie, ${md.length} caracteres`);
