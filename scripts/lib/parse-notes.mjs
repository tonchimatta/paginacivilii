// Parses the class-notes markdown into a flat list of nodes forming a tree.
//
// Structure found in the real notes (it does not match "H1 = unit" exactly):
//   H1 "I. Las cosas y los bienes"   -> parte   (six of them; the unit root is synthetic)
//   H2 "3. Derechos reales ..."      -> tema
//   H3 "3.1 Derechos reales"         -> subtema
//   H4 "a) Elementos"                -> sub-subtema (only in some branches)
// So the rule is by position, not by heading depth: any heading with sub-headings is a
// TopicNode, any heading without them is a ConceptNode. A topic that also has its own
// text before its first sub-heading gets that text as a leading "intro" concept child.
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

const NUMBERING = /^((?:[IVXLC]+\.)|(?:\d+(?:\.\d+)*\.?)|(?:[a-z]\)))\s+/;
const PENDING = /\[\s*pendiente\s*\]\s*/i;

const WIKI_LINK = /\[\[([^\]|\\]+?)(?:\\?\|([^\]]+))?\]\]/g;
const PLAIN_ART = /\b(arts?\.|art[íi]culos?)(\s+)(\d+)(º|°)?(\s+(?:bis|ter))?\b/giu;
// Something right after the number that says the article is from another statute.
const FOREIGN_LAW = /^[^.;\n]{0,45}?(?:\bCPR\b|\bCPC\b|\bCP\b|Reglamento|\bDL\b|D\.L\.|\bDFL\b|\bLey\b|C[óo]digo (?!Civil)|Proyecto|Constituci[óo]n|Convenci[óo]n|Tratado)/u;

export function parseNotes(src, { title, code }) {
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
    children: [],
  });
  usedIds.add('root');

  const KIND_BY_DEPTH = ['unidad', 'parte', 'tema', 'subtema', 'subtema'];

  const walk = (section, parentId, depth) => {
    const { number, text, pending } = splitTitle(section.title);
    const titlePlain = plainText(text);
    const body = section.body.trim();
    const base = {
      depth,
      title: titlePlain,
      titleHtml: inlineHtml(text),
      number,
      parentId,
    };

    if (section.children.length > 0) {
      const topic = add({ ...base, id: makeId(titlePlain), type: 'topic', kind: KIND_BY_DEPTH[depth] ?? 'subtema', pending, children: [] });
      if (body) addIntro(topic, body, depth + 1);
      for (const child of section.children) walk(child, topic.id, depth + 1);
      return;
    }

    const split = splitTerms(body, titlePlain);
    if (split) {
      const topic = add({ ...base, id: makeId(titlePlain), type: 'topic', kind: KIND_BY_DEPTH[depth] ?? 'subtema', pending, split: true, children: [] });
      if (split.preamble) addIntro(topic, split.preamble, depth + 1);
      for (const term of split.terms) {
        add({
          id: makeId(term.title),
          type: 'concept',
          kind: 'concepto',
          depth: depth + 1,
          title: plainText(term.title),
          titleHtml: inlineHtml(term.title),
          number: null,
          parentId: topic.id,
          fromSplit: true,
          note: term.note ? inlineHtml(term.note) : null,
          markdown: term.body,
        });
      }
      return;
    }

    add({ ...base, id: makeId(titlePlain), type: 'concept', kind: 'concepto', pending: pending || !body, markdown: body });
  };

  const addIntro = (topic, markdown, depth) =>
    add({
      id: makeId(`${topic.title} intro`),
      type: 'concept',
      kind: 'concepto',
      intro: true,
      depth,
      title: topic.title,
      titleHtml: topic.titleHtml,
      number: null,
      parentId: topic.id,
      markdown,
    });

  for (const s of sections) walk(s, root.id, 1);

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
    if (node.type !== 'concept') continue;
    node.refs = [];
    const noteHtml = node.note ? `<p class="term-note">${node.note}</p>` : '';
    node.body = noteHtml + (node.markdown ? renderMarkdown(node.markdown, node) : '');
    delete node.note;
  }
  for (const key of missing) warnings.push(`artículo citado que no existe en el Código Civil parseado: ${key}`);

  // ---- Cross-links --------------------------------------------------------------------
  const { matcher, keyToId } = buildTitleMatcher(nodes, warnings);
  let conceptRefs = 0;
  if (matcher) {
    for (const node of nodes) {
      if (node.type !== 'concept' || !node.body) continue;
      const blocked = new Set([node.id, ...ancestors(node, byId)]);
      if (node.intro) blocked.add(node.parentId);
      const linked = new Set();
      node.body = mapTextNodes(node.body, (text) =>
        text.replace(matcher, (m) => {
          const target = keyToId.get(normalizeKey(m));
          if (!target || blocked.has(target) || linked.has(target)) return m;
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
  const number = m ? m[1].replace(/[.)]$/, '') : null;
  if (m) text = text.slice(m[0].length);
  return { number, text: text.replace(PENDING, '').trim(), pending };
}

// Fallback from the spec: a leaf section that holds several distinct terms, each introduced
// as a paragraph "**Término:** definición", becomes a topic with one concept per term.
// In these notes most bold labels structure an argument ("**Concepto:**", "**Crítica:**",
// "**Vial:**" for an author's view), so a label only counts as a term when the heading
// itself names it: "Cosa y bien" -> Cosa, Bien; "Originarios y derivativos" -> both.
// Other labelled paragraphs stay inside the term they follow. Needs two or more terms.
function splitTerms(body, sectionTitle) {
  if (!body) return null;
  const titleKey = ` ${normalizeKey(sectionTitle)} `;
  const lines = body.split('\n');
  const TERM_LINE = /^\*\*(.+?)\*\*\s*(:?)\s*(.*)$/;
  const hits = [];
  lines.forEach((line, i) => {
    const m = line.match(TERM_LINE);
    if (!m) return;
    let label = m[1].trim();
    const hasColon = m[2] === ':' || label.endsWith(':');
    if (!hasColon) return;
    label = label.replace(/:$/, '').trim();
    const noteMatch = label.match(/\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/);
    const term = (noteMatch ? label.slice(0, noteMatch.index) : label).trim();
    const note = noteMatch ? `(${noteMatch[1].trim()})` : null;
    if (!isTermLabel(term)) return;
    const key = normalizeKey(plainText(term));
    if (!titleKey.includes(` ${key} `)) return;
    hits.push({ i, term, key, note, rest: m[3] });
  });
  const distinct = new Set(hits.map((h) => h.key));
  if (hits.length < 2 || distinct.size < 2) return null;

  const preamble = lines.slice(0, hits[0].i).join('\n').trim();
  const terms = hits.map((h, k) => {
    const end = k + 1 < hits.length ? hits[k + 1].i : lines.length;
    const rest = [h.rest, ...lines.slice(h.i + 1, end)].join('\n').trim();
    return { title: h.term, note: h.note, body: capitalize(rest) };
  });
  return { preamble, terms };
}

function isTermLabel(label) {
  const plain = plainText(label);
  const key = normalizeKey(plain);
  if (!key || GENERIC_LABELS.has(key)) return false;
  if (/[?¿]/.test(plain)) return false;
  if (/^ej\b/i.test(plain)) return false;
  if (/\bart[íi]?c?u?l?o?s?\.?\s*\d/i.test(plain)) return false;
  if (plain.split(/\s+/).length > 6) return false;
  return true;
}

// ---- Cross-link matching ----------------------------------------------------------------

const STOP_STARTS = /^(qu[ée]|c[óo]mo|d[óo]nde|por qu[ée]|para qu[ée]|es un|es una|solo|las dos|los dos|el mismo|la misma|otras|primer|segundo|tercer|cuarto|quinto)\b/i;

function normalizeKey(s) {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(el|la|los|las|un|una)\s+/, '')
    .replace(/[\s.:;,]+$/, '')
    .trim();
}

function buildTitleMatcher(nodes, warnings) {
  const counts = new Map();
  const keyToId = new Map();
  const eligible = new Map();
  for (const n of nodes) {
    if (n.intro || n.id === 'root' || n.pending) continue;
    const key = normalizeKey(n.title);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    keyToId.set(key, n.id);
    // One-word titles ("dominio", "tradición") are only link targets when they name a
    // specific tema or subtema: the part titles and split-off terms would link everywhere.
    eligible.set(key, key.includes(' ') || (n.depth >= 2 && !n.fromSplit));
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
