import { useEffect, useMemo, useRef, useState } from 'react';
import { nodesById, maps, rootId, ancestorsOf, tintOf } from '../data/unit.js';

const MAX_RESULTS = 40;
const SNIPPET_RADIUS = 60;

// Lowercase, no accents: "posesión" and "posesion" match the same cards.
const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const stripHtml = (html) => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
};

// One entry per card of the loaded unit (map roots aside): what is shown and what is matched.
function buildIndex() {
  const out = [];
  for (const node of nodesById.values()) {
    if (node.id === rootId || maps.includes(node.id)) continue;
    const label = node.number ? `${node.number} · ${node.title}` : node.title;
    const body = node.body ? stripHtml(node.body) : '';
    const path = ancestorsOf(node.id)
      .filter((id) => id !== rootId)
      .reverse()
      .map((id) => nodesById.get(id).title);
    out.push({ id: node.id, label, body, path, title: fold(label), text: fold(body) });
  }
  return out;
}

// Every word of the query must appear in the card. Title hits rank above body hits.
function search(index, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits = [];
  for (const entry of index) {
    let score = 0;
    let ok = true;
    for (const w of words) {
      const t = entry.title.indexOf(w);
      if (t >= 0) score += t === 0 ? 30 : /\s/.test(entry.title[t - 1]) ? 20 : 10;
      else if (entry.text.includes(w)) score += 2;
      else {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (entry.title === words.join(' ')) score += 50;
    hits.push({ entry, score, words });
  }
  hits.sort((a, b) => b.score - a.score || a.entry.path.length - b.entry.path.length);
  return hits.slice(0, MAX_RESULTS);
}

// The part of the body around the first matched word, when the title alone doesn't match.
function snippetOf(entry, words) {
  if (!entry.body) return '';
  const w = words.find((x) => !entry.title.includes(x) && entry.text.includes(x));
  if (!w) return '';
  // Folding keeps the length of Spanish text, so indexes line up with the original body.
  const at = entry.text.indexOf(w);
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(entry.body.length, at + w.length + SNIPPET_RADIUS);
  return {
    before: (start ? '…' : '') + entry.body.slice(start, at),
    match: entry.body.slice(at, at + w.length),
    after: entry.body.slice(at + w.length, end) + (end < entry.body.length ? '…' : ''),
  };
}

// Search box over every card of the map. Picking a result calls onPick(nodeId).
export default function Finder({ open, onClose, onPick }) {
  const index = useMemo(buildIndex, []);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const results = useMemo(() => search(index, query), [index, query]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  useEffect(() => {
    listRef.current?.children[selected]?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  const pick = (hit) => {
    if (!hit) return;
    onClose();
    onPick(hit.entry.id);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') setSelected((i) => Math.min(i + 1, results.length - 1));
    else if (e.key === 'ArrowUp') setSelected((i) => Math.max(i - 1, 0));
    else if (e.key === 'Enter') pick(results[selected]);
    else if (e.key === 'Escape') onClose();
    else return;
    e.preventDefault();
  };

  return (
    <div className="finder" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="finder__box" role="dialog" aria-label="Buscar tarjetas">
        <label className="finder__field">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="finder__input"
            type="search"
            placeholder="Buscar un concepto, tema o artículo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-controls="finder-results"
            aria-activedescendant={results[selected] ? `finder-${results[selected].entry.id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="finder__esc">esc</kbd>
        </label>

        {query.trim() ? (
          results.length ? (
            <ul className="finder__list" id="finder-results" role="listbox" ref={listRef}>
              {results.map((hit, i) => {
                const snip = snippetOf(hit.entry, hit.words);
                return (
                  <li
                    key={hit.entry.id}
                    id={`finder-${hit.entry.id}`}
                    role="option"
                    aria-selected={i === selected}
                    className={`finder__item tint-${tintOf(hit.entry.id)}${i === selected ? ' is-selected' : ''}`}
                    onPointerMove={() => setSelected(i)}
                    onClick={() => pick(hit)}
                  >
                    <span className="finder__dot" aria-hidden />
                    <span className="finder__main">
                      <span className="finder__title">{hit.entry.label}</span>
                      {hit.entry.path.length ? <span className="finder__path">{hit.entry.path.join(' › ')}</span> : null}
                      {snip ? (
                        <span className="finder__snippet">
                          {snip.before}
                          <mark>{snip.match}</mark>
                          {snip.after}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="finder__empty">Ninguna tarjeta coincide con “{query.trim()}”.</p>
          )
        ) : (
          <p className="finder__empty">
            {index.length} tarjetas. Usa ↑ ↓ para moverte y Enter para ir a la tarjeta.
          </p>
        )}
      </div>
    </div>
  );
}
