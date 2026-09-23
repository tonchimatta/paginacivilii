// Parses the class-notes markdown into a flat list of nodes forming a tree.
//
// Structure found in the real notes (it does not match "H1 = unit" exactly):
//   H1 "I. Las cosas y los bienes"   -> parte   (six of them; the unit root is synthetic)
//   H2 "3. Derechos reales ..."      -> tema
//   H3 "3.1 Derechos reales"         -> subtema
//   H4 "a) Elementos"                -> sub-subtema (only in some branches)
// Every heading becomes a node; its text is split into a definition (kept on the node) and
// dependent child cards (see "Fragmenting" below). Nodes with text are term cards; nodes
// with only children are navigation cards.
//
// Article citations in the notes are Obsidian wiki-links, e.g.
//   [[Código Civil#^art-565|565]]   [[Código Civil#^art-684\|684]] (inside tables)
//   [[CC - Código Civil#Artículo 565.|565]]
// plus a few plain-text ones ("según el artículo 570", "### 33.1 Formas del art. 684").

import { marked } from 'marked';
import { articleKey } from './parse-codigo.mjs';

marked.setOptions({ gfm: true, breaks: true });

// Bold labels that structure a section ("**Concepto:** ...") rather than name a term.
const GENERIC_LABELS = new Set(
  [
    'concepto', 'definición', 'regla', 'reglas', 'características', 'característica', 'a qué atiende',
    'tesis', 'requisitos', 'requisito', 'por qué importa', 'elementos', 'el problema', 'crítica', 'críticas',
    'alcance', 'función', 'régimen', 'consecuencia', 'consecuencias', 'para qué sirve', 'efectos', 'efecto',
    'fundamento', 'excepción', 'excepciones', 'naturaleza', 'objeto', 'importancia', 'clasificación',
    'sanción', 'sanciones', 'ventajas', 'nota', 'origen', 'historia', 'contexto', 'ejemplo', 'ejemplos',
    'ej', 'hechos', 'decisión', 'la pregunta', 'la regla', 'problema', 'solución', 'causales', 'fuentes',
    'enumeración', 'uso', 'la enumeración no es taxativa', 'las clasificaciones que se estudian',
    'por qué se discute', 'cómo opera', 'objeción', 'respuesta', 'tesis mayoritaria', 'tesis minoritaria',
    'doctrina', 'jurisprudencia', 'resumen', 'en síntesis', 'distinción', 'diferencias', 'caso',
    'además', 'ámbito', 'cuadro', 'definiciones', 'en la práctica', 'contradicción', 'concepto y características', 'ámbito de aplicación', 'concepto y enumeración', 'definición legal',
  ].map((s) => s.normalize('NFC')),
);

// Heading numbers: "IV." parte, "12." tema, "12.3" subtema, "b)" nivel 4, "ii)" nivel 5,
// "(3)" nivel 6.
const NUMBERING = /^((?:[IVXLC]+\.)|(?:\d+(?:\.\d+)*\.?)|(?:[a-z]+\))|(?:\(\d+\)))\s+/;
const PENDING = /\[\s*pendiente\s*\]\s*/i;

const WIKI_LINK = /\[\[([^\]|\\]+?)(?:\\?\|([^\]]+))?\]\]/g;
const PLAIN_ART = /\b(arts?\.|art[íi]culos?)(\s+)(\d+)(º|°)?(\s+(?:bis|ter))?\b/giu;
// Something right after the number that says the article is from another statute.
const FOREIGN_LAW = /^[^.;\n]{0,45}?(?:\bCPR\b|\bCPC\b|\bCP\b|Reglamento|\bDL\b|D\.L\.|\bDFL\b|\bLey\b|C[óo]digo (?!Civil)|Proyecto|Constituci[óo]n|Convenci[óo]n|Tratado)/u;

// `maps`: the notes hold several maps (one per professor's notes on the same page): each
// top-level heading is the root of its own map, and parts start one level down.
export function parseNotes(src, { title, code, maps = false }) {
  const offset = maps ? 1 : 0;
  const warnings = [];
  const sections = splitSections(src, warnings);

  const nodes = [];
  const byId = new Map();
  const usedIds = new Set();

  const makeId = (text) => {
    const base =
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || 'nodo';
    let id = base;
    for (let i = 2; usedIds.has(id); i++) id = `${base}-${i}`;
    usedIds.add(id);
    return id;
  };

  const add = (node) => {
    nodes.push(node);
    byId.set(node.id, node);
    if (node.parentId) byId.get(node.parentId).children.push(node.id);
    return node;
  };

  const root = add({
    id: 'root',
    type: 'topic',
    kind: 'unidad',
    depth: 0,
    title,
    titleHtml: escapeHtml(title),
    number: null,
    parentId: null,
    origin: 'heading',
    children: [],
  });
  usedIds.add('root');

  const KIND_BY_DEPTH = [...(maps ? ['unidad'] : []), 'unidad', 'parte', 'tema', 'subtema', 'subtema'];
  const KIND_BY_ORIGIN = { label: 'apartado', item: 'apartado', case: 'caso' };

  // A node carries only its definition (`markdown`); everything that depends on it is a child.
  // Nodes with text render as term cards, nodes without text as navigation (topic) cards.
  const addSpec = (spec, parentId, depth) => {
    const titlePlain = plainText(spec.title);
    const hasText = Boolean(spec.body.trim() || spec.note);
    const emptyLeaf = !hasText && spec.children.length === 0;
    const node = add({
      id: makeId(titlePlain),
      // Format follows the level: every heading is a topic card (with its definition, if it
      // has one); every dependent (label, list item, case) is a term card.
      type: spec.origin === 'heading' ? 'topic' : 'concept',
      kind: spec.origin === 'heading' ? KIND_BY_DEPTH[depth] ?? 'subtema' : KIND_BY_ORIGIN[spec.origin],
      origin: spec.origin,
      depth,
      title: titlePlain,
      titleHtml: inlineHtml(spec.title),
      number: spec.number ?? null,
      parentId,
      pending: Boolean(spec.pending || emptyLeaf),
      markdown: spec.body,
      note: spec.note ?? null,
      children: [],
    });
    for (const child of spec.children) addSpec(child, node.id, depth + 1);
  };

  for (const s of sections) addSpec(sectionToSpec(s), root.id, 1);

  // ---- Article citations ------------------------------------------------------------
  // Numbers the author explicitly linked somewhere: plain-text "art. N" is only trusted as a
  // Código Civil reference when N is one of these (the notes also cite the CPR, CPC, the
  // Reglamento del CBR, the 2022 draft constitution, the Cuban constitution...).
  const explicit = new Set();
  for (const m of src.matchAll(WIKI_LINK)) {
    const key = wikiArticleKey(m[1]);
    if (key) explicit.add(key);
  }

  const articles = {};
  let articleRefs = 0;
  const missing = new Set();

  const citeArticle = (key, label, node) => {
    const art = code[key];
    if (!art) {
      missing.add(key);
      return escapeHtml(label);
    }
    articles[key] = art;
    articleRefs++;
    node.refs.push({ type: 'article', articleNumber: art.number, articleKey: key, sourceConceptId: node.id });
    return `<a class="ref ref-art" data-art="${key}" href="#art-${key}">${escapeHtml(label)}</a>`;
  };

  const renderMarkdown = (md, node) => {
    md = boldListLeads(md);
    const stash = [];
    const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;

    let text = md.replace(WIKI_LINK, (_, target, alias) => {
      const key = wikiArticleKey(target);
      const label = (alias ?? target).trim();
      return keep(key ? citeArticle(key, label, node) : escapeHtml(label));
    });

    text = text.replace(PLAIN_ART, (m, word, sp, num, ord = '', suffix = '', offset, whole) => {
      const key = articleKey(num + suffix);
      const after = whole.slice(offset + m.length);
      // "art. 12 A" is a lettered article of another text; the Código has none.
      if (!explicit.has(key) || FOREIGN_LAW.test(after) || /^\s+[A-Z]\b/.test(after)) return m;
      return `${word}${sp}${keep(citeArticle(key, num + ord + suffix, node))}`;
    });

    text = text.replace(/==([^=\n]+?)==/g, '<mark>$1</mark>');
    let html = marked.parse(text);
    html = html.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
    html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
    return html;
  };

  for (const node of nodes) {
    node.refs = [];
    const noteHtml = node.note ? `<div class="term-note">${renderMarkdown(node.note, node)}</div>` : '';
    node.body = noteHtml + (node.markdown ? renderMarkdown(node.markdown, node) : '');
    if (!node.body) delete node.body;
    delete node.note;
  }
  for (const key of missing) warnings.push(`artículo citado que no existe en el Código Civil parseado: ${key}`);

  // ---- Cross-links --------------------------------------------------------------------
  // Between two maps only titles that name something on their own link: headings or labels
  // of 2+ words that are not generic ("Naturaleza jurídica", "Las acciones").
  const mapOf = (id) => {
    let n = byId.get(id);
    while (n && n.depth > 1) n = byId.get(n.parentId);
    return n?.id;
  };
  const CROSS_GENERIC = /^(naturaleza jurídica|acciones|concepto y .*|requisitos|efectos|clasificación|características|utilidad)$/;
  const crossMapOk = (t) => normalizeKey(t.title).includes(' ') && !CROSS_GENERIC.test(normalizeKey(t.title)) && !GENERIC_LABELS.has(normalizeKey(t.title));
  const { matcher, keyToId } = buildTitleMatcher(nodes, warnings, offset);
  let conceptRefs = 0;
  if (matcher) {
    for (const node of nodes) {
      if (!node.body) continue;
      const blocked = new Set([node.id, ...ancestors(node, byId)]);
      const linked = new Set();
      node.body = mapTextNodes(node.body, (text) =>
        text.replace(matcher, (m) => {
          const target = keyToId.get(normalizeKey(m));
          if (!target || blocked.has(target) || linked.has(target)) return m;
          if (maps && mapOf(target) !== mapOf(node.id) && !crossMapOk(byId.get(target))) return m;
          linked.add(target);
          conceptRefs++;
          node.refs.push({ type: 'concept-ref', targetNodeId: target });
          return `<a class="ref ref-concept" data-target="${target}" href="#${target}">${m}</a>`;
        }),
      );
    }
  }

  for (const node of nodes) delete node.markdown;

  return {
    title,
    rootId: root.id,
    ...(maps ? { maps: [...root.children] } : {}),
    nodes,
    articles,
    warnings,
    stats: { articleRefs, conceptRefs },
  };
}

// ---- Sections ---------------------------------------------------------------------------

function splitSections(src, warnings) {
  const lines = src.replace(/^---\n[\s\S]*?\n---\n/, '').split(/\r?\n/);
  const top = [];
  const stack = []; // open sections, by increasing level
  let preamble = [];
  let inFence = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h = !inFence && line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) {
      const level = h[1].length;
      const section = { level, title: h[2], body: '', children: [] };
      while (stack.length && stack.at(-1).level >= level) stack.pop();
      const parent = stack.at(-1);
      if (parent && level > parent.level + 1) {
        warnings.push(`salto de nivel de encabezado (H${parent.level} -> H${level}) en "${h[2]}"; se trata como hijo directo`);
      }
      (parent ? parent.children : top).push(section);
      stack.push(section);
      continue;
    }
    if (stack.length) stack.at(-1).body += line + '\n';
    else preamble.push(line);
  }
  if (preamble.join('').trim()) warnings.push('hay texto antes del primer encabezado; se ignora');
  if (!top.length) throw new Error('Las notas no tienen encabezados markdown: no se puede construir el árbol.');
  return top;
}

function splitTitle(raw) {
  let text = raw.trim();
  const pending = PENDING.test(text);
  text = text.replace(PENDING, '');
  const m = text.match(NUMBERING);
  const number = m ? (m[1].startsWith('(') ? m[1] : m[1].replace(/[.)]$/, '')) : null;
  if (m) text = text.slice(m[0].length);
  return { number, text: text.replace(PENDING, '').trim(), pending };
}

// ---- Fragmenting a section into a definition and its dependents ------------------------
//
// The notes pack several things under one heading: "**Concepto:** ...", then
// "**Características:**" with a list, "**Elementos:**", a court case in a blockquote...
// Each section keeps only its definition; the rest become child cards:
//   - the definition is the text before the first bold label, or, if there is none, the
//     first labelled paragraph (a later "**Concepto:**"/"**Definición:**" joins it too);
//   - every other "**Label:** text" paragraph opens a child card, and the paragraphs,
//     lists and tables after it belong to that card until the next label;
//   - a list whose items all start with a bold term ("1. **Simples.**", "- **De goce:**")
//     becomes one child card per item (one level deeper inside those items too);
//   - a blockquote ("> **Caso ...**") is its own card.
// A leaf sub-section titled "Concepto"/"Definición" is lifted into its parent, whose
// definition it is.

const DEFINITIONAL = /^(concepto|definici[óo]n|noci[óo]n)\b/i;

function sectionToSpec(section) {
  const { number, text, pending } = splitTitle(section.title);
  const frag = fragment(section.body);
  let body = frag.definition;
  const demoted = [];
  const lifted = [];
  const sub = section.children.map(sectionToSpec);
  const canLift =
    sub.length &&
    section.children[0].children.length === 0 &&
    DEFINITIONAL.test(normalizeKey(plainText(sub[0].title))) &&
    sub[0].body.trim();
  // The section's own text only counts as its definition if it is not merely a labelled
  // aside ("**Las clasificaciones que se estudian:** ..."); then the Concepto wins.
  if (canLift && (!body.trim() || (frag.definitionLabel && !DEFINITIONAL.test(frag.definitionLabel.title)))) {
    if (body.trim()) {
      demoted.push({ ...frag.definitionLabel, body: capitalize(frag.definitionRest.trim()), origin: 'label', children: frag.definitionChildren });
      frag.children.splice(0, frag.definitionChildren.length);
    }
    const first = sub.shift();
    body = first.body;
    lifted.push(...first.children);
  }
  const spec = { title: text, number, pending, body: dropBareLabel(body), origin: 'heading', children: [...lifted, ...demoted, ...frag.children, ...sub] };
  return mergeDuplicates(spec);
}

// Hierarchy rules that keep one card per idea:
//   - within a parent, children with the same title are one card: "**Clasificación:** -
//     **Modos absolutos:** ..." and the sub-heading "15.1 Modos absolutos" merge, the
//     heading survives (it keeps its number) and the list text becomes its definition;
//   - a child titled like its parent is folded into the parent.
function mergeDuplicates(spec) {
  const key = (x) => normalizeKey(plainText(x.title));
  const own = key(spec);
  const groups = new Map();
  for (const child of spec.children) {
    mergeDuplicates(child);
    if (key(child) === own) {
      spec.body = joinBodies(spec.body, child.body);
      spec.children.push(...child.children.filter((c) => !spec.children.includes(c)));
      child.folded = true;
      continue;
    }
    if (!groups.has(key(child))) groups.set(key(child), []);
    groups.get(key(child)).push(child);
  }
  // A list item or label that names a sibling sub-heading ("**Dos partes** ..." next to
  // "29.1 Primer requisito: dos partes") is the same idea: fold it into that heading.
  const headings = spec.children.filter((c) => c.origin === 'heading' && !c.folded);
  for (const [k, list] of groups) {
    if (list.some((c) => c.origin === 'heading')) continue;
    const words = contentWords(k);
    if (!words.length) continue;
    const hits = headings.filter((h) => {
      // One-word items only match "Segundo requisito: consentimiento"-style headings.
      if (words.length === 1) return contentWords(key(h).split(':').pop()).join(' ') === words[0];
      const hw = new Set(contentWords(key(h)));
      return words.filter((w) => hw.has(w)).length / words.length >= 0.6;
    });
    if (hits.length !== 1) continue;
    const target = hits[0];
    groups.get(key(target)).unshift(...list);
    groups.delete(k);
  }

  const survivors = new Set();
  for (const list of groups.values()) {
    const keep = list.find((c) => c.origin === 'heading') ?? list[0];
    for (const other of list) {
      if (other === keep) continue;
      if (process.env.DEBUG_MERGE) console.log(`[merge] ${spec.title} > "${other.title}" -> "${keep.title}"`);
      // Folded into a sub-heading, the item keeps its full sentence ("**Dos partes** con
      // facultad..."), unless it was only the term itself ("**La tenencia** (*corpus*).").
      const intoHeading = keep.origin === 'heading' && other.origin !== 'heading';
      const text = intoHeading ? (other.body.trim() ? other.full ?? other.body : '') : other.body;
      keep.body = joinBodies(text, keep.body);
      if (!intoHeading) keep.note = keep.note ?? other.note;
      keep.children = [...other.children, ...keep.children];
    }
    survivors.add(keep);
  }
  spec.children = spec.children.filter((c) => !c.folded && survivors.has(c));
  return spec;
}

const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'en', 'a', 'al', 'por', 'para', 'con', 'sin', 'su', 'sus', 'un', 'una', 'que', 'se', 'lo']);
function contentWords(k) {
  return k.split(/[^\p{L}\p{N}]+/u).filter((w) => w && !STOPWORDS.has(w));
}

function joinBodies(a, b) {
  const x = (a ?? '').trim();
  const y = (b ?? '').trim();
  if (!x || x === y) return y;
  if (!y) return x;
  return `${x}\n\n${y}`;
}

// After the lists under "**Clasificación:**" move to child cards, the label alone would
// dangle as the whole definition. Drop it, unless it is itself a citation ("**Art. 2312:**").
function dropBareLabel(md) {
  return md
    .split(/\n{2,}/)
    .filter((p) => {
      const m = p.trim().match(/^\*\*([^*]+?):?\*\*:?$/);
      return !m || /\[\[/.test(m[1]);
    })
    .join('\n\n');
}

function fragment(md) {
  if (!md.trim()) return { definition: '', children: [], definitionLabel: null, definitionRest: '', definitionChildren: [] };
  const groups = [{ label: null, tokens: [] }];
  let current = groups[0];
  for (const t of marked.lexer(md)) {
    if (t.type === 'hr') continue;
    if (t.type === 'blockquote') {
      groups.push({ quote: t });
      continue;
    }
    const label = t.type === 'paragraph' ? readLabel(t.raw) : null;
    if (label) {
      current = { label, raw: t.raw, tokens: [{ raw: label.rest }] };
      groups.push(current);
      continue;
    }
    current.tokens.push(t);
  }

  const [pre, ...rest] = groups;
  const def = [...pre.tokens];
  const hasPreamble = pre.tokens.some((t) => t.raw.trim());
  const firstIdx = rest.findIndex((g) => g.label);
  let definitionLabel = null;
  let labelTokens = [];
  const takeIntoDefinition = (i) => {
    const g = rest.splice(i, 1)[0];
    def.push({ raw: g.raw + '\n\n' }, ...g.tokens.slice(1));
    if (!hasPreamble) {
      definitionLabel = { title: g.label.title, note: g.label.note };
      labelTokens = g.tokens;
    }
  };
  if (firstIdx === 0 && (!hasPreamble || DEFINITIONAL.test(plainText(rest[0].label.title)))) takeIntoDefinition(0);

  const defSplit = splitLists(def, 2);
  const labelSplit = definitionLabel ? splitLists(labelTokens, 2) : null;
  const children = [...defSplit.children];
  for (const g of rest) {
    if (g.quote) {
      children.push(quoteSpec(g.quote));
      continue;
    }
    const split = splitLists(g.tokens, 2);
    children.push({
      title: g.label.title,
      note: g.label.note,
      body: capitalize(split.md.trim()),
      origin: 'label',
      children: split.children,
    });
  }
  return {
    definition: defSplit.md.trim(),
    children,
    definitionLabel,
    definitionRest: labelSplit?.md ?? '',
    definitionChildren: defSplit.children,
  };
}

// "**Término (art. 565):** resto" -> { title, note, rest }. Only labels that end in ":" or
// "?" count; bold-italic citations ("***Art. 565***: ...") and "**Ej:**" do not.
function readLabel(raw) {
  if (raw.startsWith('***')) return null;
  const m = raw.match(/^\*\*(.+?)\*\*[ \t]*(:?)[ \t]*/s);
  if (!m) return null;
  let inner = m[1].trim();
  const rest = raw.slice(m[0].length);
  // "**Límite de la tradición: los derechos personalísimos.** No pueden..." also opens a card.
  const sentence = /\.$/.test(inner) && rest.trim() && inner.length <= 90;
  if (!(m[2] || /[:?]$/.test(inner) || sentence)) return null;
  inner = inner.replace(/[:.]$/, '').trim();
  if (/^ej\b/i.test(inner) || inner.startsWith('*')) return null;
  return { ...splitNote(inner), rest };
}

function splitNote(label) {
  const m = label.match(/\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/);
  if (!m || m.index === 0) return { title: label, note: null };
  return { title: label.slice(0, m.index).trim(), note: `(${m[1].trim()})` };
}

// Cards whose remaining text is longer than this also get their plain lists split, one
// card per item, with a title taken from the item's opening words.
const LONG = 650;

function splitLists(tokens, depth) {
  const run = (loose) => {
    let md = '';
    const children = [];
    for (const t of tokens) {
      const items = t.type === 'list' ? listSpecs(t.items, depth, loose) : null;
      if (items && items.length >= 2 && items.every(Boolean)) children.push(...items);
      else md += t.raw;
    }
    return { md, children };
  };
  const strict = run(false);
  return plainText(strict.md).length > LONG ? run(true) : strict;
}

// "P. ej. ..." items illustrate the item before them: when a list is split, each one goes
// into the previous item's card instead of making a card of its own. (Gandarillas y Vergara
// writes "Ej: ..." and is unaffected.)
const EXAMPLE = /^p\. ?ej\b/i;

function listSpecs(items, depth, loose) {
  const specs = [];
  for (const it of items) {
    const text = dedentItem(it.raw);
    if (loose && EXAMPLE.test(plainText(text))) {
      // A list that opens with an example stays as text.
      const prev = specs[specs.length - 1];
      if (!prev) return null;
      prev.body = `${prev.body}\n\n- ${text.replace(/\n/g, '\n  ')}`.trim();
      continue;
    }
    specs.push(itemSpec(it, depth, loose));
  }
  return specs;
}

function itemSpec(item, depth, loose) {
  const text = dedentItem(item.raw);
  const m = text.match(/^\*\*(?!\*)(.+?)\*\*([ \t]*[:.])?[ \t]*/s);
  let title, note, bodyMd;
  let labelled = true;
  if (m) {
    const inner = m[1].trim();
    labelled = Boolean(m[2]) || /[:.]$/.test(inner);
    ({ title, note } = splitNote(inner.replace(/[:.]$/, '').trim()));
    let rest = text.slice(m[0].length).trim().replace(/^[,;]\s*/, '');
    // "**Destrucción de la cosa** (voluntaria o involuntaria). Jurídicamente..." -> the
    // parenthetical becomes the note, the rest the body; the term is not repeated.
    const paren = !m[2] && rest.match(/^\(([^()]*)\)[.:,]?\s*/);
    if (paren) {
      note = note ?? `(${paren[1].trim()})`;
      rest = rest.slice(paren[0].length);
    }
    bodyMd = capitalize(rest);
  } else {
    if (!loose || plainText(text).length < 3) return null;
    ({ title, bodyMd } = deriveTitle(text));
    note = null;
  }
  const split = depth > 1 ? splitLists(marked.lexer(bodyMd), depth - 1) : { md: bodyMd, children: [] };
  // `full` keeps the term in the sentence, for when the item is folded into a sub-heading.
  return { title, note, body: split.md.trim(), full: m && !labelled ? text : null, origin: 'item', children: split.children };
}

// Title for an item that has no bold term: the words before a colon, or the opening clause.
function deriveTitle(text) {
  const first = text.split('\n')[0];
  const colon = first.search(/:\s/);
  const plainBefore = colon > 0 ? plainText(first.slice(0, colon)) : '';
  if (colon > 0 && plainBefore.length >= 3 && plainBefore.length <= 70 && !/\[\[/.test(first.slice(0, colon))) {
    return { title: first.slice(0, colon).replace(/\*+/g, '').trim(), bodyMd: capitalize(text.slice(colon + 1).trim()) };
  }
  const plain = plainText(first).replace(/\s*\([^)]*\)?/g, '');
  const clause = plain.split(/(?<=.{12})[.;,:]\s/)[0];
  const words = clause.split(/\s+/);
  const title = words.length > 8 ? `${words.slice(0, 8).join(' ')}…` : clause.replace(/[.;,:]$/, '');
  return { title, bodyMd: text };
}

function dedentItem(raw) {
  const lines = raw.replace(/\s+$/, '').split('\n');
  lines[0] = lines[0].replace(/^\s*(?:\d+[.)]|[-*+])\s+/, '');
  const indents = lines.slice(1).filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return [lines[0], ...lines.slice(1).map((l) => l.slice(Math.min(cut, l.match(/^ */)[0].length)))].join('\n');
}

function quoteSpec(token) {
  const lines = token.text.trim().split('\n');
  const head = lines[0].match(/^\*\*(.+?)\*\*\s*$/);
  const { title, note } = splitNote(head ? head[1].trim() : 'Caso');
  return {
    title,
    note,
    body: (head ? lines.slice(1) : lines).join('\n\n').trim(),
    origin: 'case',
    children: [],
  };
}

// ---- List formatting ---------------------------------------------------------------------
//
// In an enumeration (elements, characteristics, requirements...) the term each item opens
// with is set in bold, as the notes already do in most lists:
//   "Uso inocuo: el que no causa daño..."             -> "**Uso inocuo:** el que..."
//   "Ciertos derechos de acceso forzoso (distintos...)" -> "**Ciertos derechos...** (distintos...)"
//   "Coexistencia con otros derechos reales sobre la misma cosa." -> whole short sentence
// Items that already open in bold, examples ("Ej: ..."), quotes, citations and long first
// sentences are left alone.

const LIST_ITEM = /^(\s*(?:\d+[.)]|[-*+])\s+)(.+)$/;
const LEAD_MAX = 70;
const SENTENCE_MAX_WORDS = 10;

function boldListLeads(md) {
  let fenced = false;
  return md
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
      const m = !fenced && line.match(LIST_ITEM);
      if (!m) return line;
      const lead = listLead(m[2]);
      return lead ? `${m[1]}**${lead.text}**${m[2].slice(lead.text.length)}` : line;
    })
    .join('\n');
}

function listLead(text) {
  if (/^[*_"“«\[=`>(|]/.test(text) || /^(ej\b|ojo\b|art[íi]?c?u?l?o?s?\.?\s*\d)/i.test(text)) return null;
  const clean = (lead) => {
    const t = lead.trimEnd();
    if (t.length < 2 || plainText(t).length > LEAD_MAX || /\[\[|\*|`|==/.test(t)) return null;
    return { text: t };
  };
  const colon = text.search(/:(\s|$)/);
  const paren = text.indexOf(' (');
  if (colon > 0 && (paren < 0 || colon < paren)) return clean(text.slice(0, colon + 1));
  // Before a parenthesis only a short noun phrase counts, not the start of a long sentence.
  if (paren > 0) {
    const before = text.slice(0, paren);
    return before.split(/\s+/).length <= 7 && !before.includes(',') ? clean(before) : null;
  }
  const sentence = text.match(/^[^.;]+[.;]?(?=\s|$)/);
  if (sentence && sentence[0].trim().split(/\s+/).length <= SENTENCE_MAX_WORDS) return clean(sentence[0]);
  return null;
}

// ---- Cross-link matching ----------------------------------------------------------------

const STOP_STARTS = /^(qu[ée]|c[óo]mo|d[óo]nde|por qu[ée]|para qu[ée]|es un|es una|solo|las dos|los dos|el mismo|la misma|otras|primer|segundo|tercer|cuarto|quinto)\b/i;

function normalizeKey(s) {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[*_`"“”«»]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(el|la|los|las|un|una)\s+/, '')
    .replace(/[\s.:;,]+$/, '')
    .trim();
}

function buildTitleMatcher(nodes, warnings, offset = 0) {
  const counts = new Map();
  const keyToId = new Map();
  const eligible = new Map();
  for (const n of nodes) {
    if (n.id === 'root' || n.pending || n.depth < 1 + offset) continue;
    const key = normalizeKey(n.title);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    keyToId.set(key, n.id);
    // One-word titles ("dominio", "tradición") are only link targets when they name a
    // specific tema or subtema: part titles and one-word labels ("Objetiva") would link
    // everywhere. Court cases are never targets.
    eligible.set(key, n.origin !== 'case' && (key.includes(' ') || (n.depth - offset >= 2 && n.origin === 'heading')));
  }
  const keys = [];
  for (const [key, count] of counts) {
    const words = key.split(' ');
    const ok =
      count === 1 &&
      eligible.get(key) &&
      key.length >= 5 &&
      words.length <= 5 &&
      !/[?¿:!]/.test(key) &&
      !/\d/.test(key) &&
      !GENERIC_LABELS.has(key) &&
      !STOP_STARTS.test(key);
    if (ok) keys.push(key);
    else keyToId.delete(key);
  }
  if (!keys.length) {
    warnings.push('no hay títulos aptos para referencias cruzadas');
    return { matcher: null, keyToId };
  }
  keys.sort((a, b) => b.length - a.length); // longest first: "persona jurídica" before "persona"
  const alt = keys.map((k) => escapeRegExp(k).replace(/ /g, '\\s+')).join('|');
  return { matcher: new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`, 'giu'), keyToId };
}

// Applies fn to the text between tags, skipping text inside <a>, <code> and headings.
function mapTextNodes(html, fn) {
  let skip = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) {
        const m = part.match(/^<(\/?)(a|code|h[1-6])\b/i);
        if (m) skip += m[1] ? -1 : 1;
        return part;
      }
      return skip > 0 || !part ? part : fn(part);
    })
    .join('');
}

function ancestors(node, byId) {
  const out = [];
  for (let p = node.parentId; p; p = byId.get(p)?.parentId) out.push(p);
  return out;
}

// ---- Small helpers ----------------------------------------------------------------------

function wikiArticleKey(target) {
  const t = target.normalize('NFC');
  if (!/c[óo]digo civil/i.test(t)) return null;
  const m = t.match(/#\^art-([\w-]+)/i) ?? t.match(/#Art[íi]culo\s+([^|\]]+?)\.?$/i);
  return m ? articleKey(m[1].replace(/-/g, ' ')) : null;
}

function inlineHtml(md) {
  const stripped = md.replace(WIKI_LINK, (_, target, alias) => (alias ?? target).trim());
  return marked.parseInline(stripped).trim();
}

function plainText(md) {
  return md
    .replace(WIKI_LINK, (_, target, alias) => (alias ?? target).trim())
    .replace(/[*_=`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
