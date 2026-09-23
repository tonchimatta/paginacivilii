// Parses the Código Civil markdown into { [articleKey]: { number, title, context, paragraphs } }.
//
// The source file (BCN export, Obsidian-flavoured) uses two article formats:
//   1. A heading:            "##### Artículo 565."  followed by body paragraphs, the first
//                            of which ends in a block id "^art-565".
//   2. An inline paragraph:  "Artículo 58 bis.- Nombre es ..." or "Artículo 548-3. El nombre ..."
// Articles end at the next article start or at any structural heading (Libro/Título/Párrafo).
// "Artículo 1º/2º" of the promulgating DFL precede the Código itself and are skipped.

const HEADING_ART = /^#{1,6}\s+Artículo\s+(.+?)\.?\s*$/;
const INLINE_ART = /^Artículo\s+(\d+(?:\s+(?:bis|ter|quáter|quater|quinquies))?(?:-\d+)?|final)\s*\.-?\s*(.*)$/i;
const STRUCTURE = /^#{1,6}\s+(Libro|Título|Párrafo)\s*:?\s*(.*)$/i;

// Some inserted articles are written "Art. 548-1. ..." instead of "Artículo".
const INLINE_ART_DASH = /^Art\.\s+(\d+-\d+)\s*\.-?\s*(.*)$/;

export function articleKey(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[º°.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '-');
}

export function parseCodigoCivil(src) {
  const lines = src.split(/\r?\n/);
  const articles = {};
  const context = { libro: null, titulo: null, parrafo: null };
  let current = null;
  let started = false; // skip the DFL preamble until the first structural heading

  const flush = () => {
    if (!current) return;
    const paragraphs = current.lines
      .join('\n')
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\^art-[\w-]+\s*$/, '').replace(/\s+\n/g, '\n').trim())
      .filter(Boolean);
    articles[current.key] = {
      number: current.number,
      context: [context.libro, context.titulo, context.parrafo].filter(Boolean).join(' · ') || null,
      paragraphs,
    };
    current = null;
  };

  for (const line of lines) {
    const s = line.match(STRUCTURE);
    if (s) {
      started = true;
      flush();
      const kind = s[1].toLowerCase();
      const label = tidyLabel(s[2]);
      if (kind === 'libro') Object.assign(context, { libro: label, titulo: null, parrafo: null });
      else if (kind === 'título') Object.assign(context, { titulo: label, parrafo: null });
      else context.parrafo = label;
      continue;
    }
    if (!started) continue;

    const h = line.match(HEADING_ART);
    if (h) {
      flush();
      current = { key: articleKey(h[1]), number: h[1].trim(), lines: [] };
      continue;
    }
    const inl = line.match(INLINE_ART) ?? line.match(INLINE_ART_DASH);
    if (inl) {
      flush();
      current = { key: articleKey(inl[1]), number: inl[1].trim(), lines: [inl[2]] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();

  if (Object.keys(articles).length < 100) {
    throw new Error(
      `Solo se reconocieron ${Object.keys(articles).length} artículos en el Código Civil: ` +
        'el formato del archivo no coincide con "##### Artículo N." ni "Artículo N bis.-". Revisar el parser.',
    );
  }
  return articles;
}

// "LIBRO SEGUNDO DE LOS BIENES" -> "Libro segundo de los bienes"; keeps roman numerals.
function tidyLabel(raw) {
  return raw
    .trim()
    .split(/\s+/)
    .map((w, i) => {
      if (/^[IVXLC]+$/.test(w) || /^§/.test(w)) return w;
      if (w !== w.toUpperCase()) return w;
      const lower = w.toLowerCase();
      return i === 0 ? lower[0].toUpperCase() + lower.slice(1) : lower;
    })
    .join(' ');
}
