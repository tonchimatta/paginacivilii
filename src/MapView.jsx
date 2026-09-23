import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import MindMap from './graph/MindMap.jsx';
import Finder from './search/Finder.jsx';
import { title, nodesById, rootId, maps, mapOf, tintOf } from './data/unit.js';
import { COURSE } from './data/professors.js';
import avanzarLogo from './assets/avanzar-uc-logo.png';

const FONTS = {
  sans: { label: 'Inter', next: 'serif' },
  serif: { label: 'Plex Serif + Mono', next: 'sans' },
};

// Home tabs: one per map of the unit (a single one, unless the page joins several
// professors' notes). They open together and are reopened by the home icon.
const homeTabs = () => maps.map((id, i) => ({ key: i ? `map:${id}` : 'home', rootId: id }));

function readTitlesOnly() {
  try {
    return localStorage.getItem('titlesOnly') === '1';
  } catch {
    return false;
  }
}

function readFont() {
  try {
    return localStorage.getItem('font') === 'serif' ? 'serif' : 'sans';
  } catch {
    return 'sans';
  }
}

function tabLabel(tab) {
  if (tab.rootId === rootId) return title;
  const node = nodesById.get(tab.rootId);
  return node.number ? `${node.number} · ${node.title}` : node.title;
}

// The map of one professor's notes: top bar, in-page tabs, one mind map per tab.
export default function MapView() {
  const [font, setFont] = useState(readFont);
  const [titlesOnly, setTitlesOnly] = useState(readTitlesOnly);
  // In-page tabs: the home tab shows the whole unit; each other tab one isolated branch.
  // Every tab keeps its own map (open branches, camera) while it stays open.
  const [homes] = useState(homeTabs);
  const HOME = homes[0];
  const [tabs, setTabs] = useState(homes);
  const [activeKey, setActiveKey] = useState(HOME.key);
  const [menu, setMenu] = useState(null); // { nodeId, x, y }
  const [finderOpen, setFinderOpen] = useState(false);
  const controls = useRef(new Map()); // tab key -> { fitAll, collapseAll, collapseLast, focusNode }

  useEffect(() => {
    document.documentElement.dataset.font = font;
    try {
      localStorage.setItem('font', font);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  }, [font]);

  // "Solo títulos": cards show just their title (and branch count), no definitions.
  useEffect(() => {
    document.documentElement.classList.toggle('titles-only', titlesOnly);
    try {
      localStorage.setItem('titlesOnly', titlesOnly ? '1' : '0');
    } catch {
      /* private mode */
    }
  }, [titlesOnly]);

  const active = () => controls.current.get(activeKey);

  const openBranch = useCallback((nodeId) => {
    const key = `branch:${nodeId}`;
    setTabs((prev) => (prev.some((t) => t.key === key) ? prev : [...prev, { key, rootId: nodeId }]));
    setActiveKey(key);
  }, []);

  const closeTab = (key) => {
    const i = tabs.findIndex((t) => t.key === key);
    const next = tabs.filter((t) => t.key !== key);
    controls.current.delete(key);
    if (!next.length) {
      setTabs(homes);
      setActiveKey(HOME.key);
      return;
    }
    setTabs(next);
    if (key === activeKey) setActiveKey(next[Math.max(0, i - 1)].key);
  };

  // A cross-reference that points outside the tab's tree opens on the home tab of the map
  // that holds it (the other map, when the page has two).
  const focusOnHome = useCallback(
    (nodeId) => {
      const home = homes.find((h) => h.rootId === mapOf(nodeId)) ?? HOME;
      setTabs((prev) => (prev.some((t) => t.key === home.key) ? prev : [home, ...prev]));
      setActiveKey(home.key);
      // The home map may be mounting right now; give it a frame to register its controls.
      requestAnimationFrame(() => requestAnimationFrame(() => controls.current.get(home.key)?.focusNode(nodeId)));
    },
    [homes, HOME],
  );

  // Cmd/Ctrl+F opens the card finder instead of the browser's (the map isn't page text).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setMenu(null);
        setFinderOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openMenu = useCallback((nodeId, x, y) => setMenu({ nodeId, x, y }), []);

  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.target.closest?.('.menu')) return;
      setMenu(null);
    };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('keydown', close);
    };
  }, [menu]);

  return (
    <main className="app">
      {tabs.map((tab) => (
        <div key={tab.key} className={`pane${tab.key === activeKey ? ' is-active' : ''}`} aria-hidden={tab.key !== activeKey}>
          <ReactFlowProvider>
            <MindMap
              rootId={tab.rootId}
              active={tab.key === activeKey}
              controlsRef={{
                set current(value) {
                  controls.current.set(tab.key, value);
                },
              }}
              onOpenMenu={openMenu}
              onOutside={focusOnHome}
            />
          </ReactFlowProvider>
        </div>
      ))}

      <header className="bar">
        <a className="bar__home" href="#/" aria-label="Volver al inicio" title="Volver al inicio">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
            <path d="M3 9.5 10 3.5l7 6M5 8v8.5h3.5V12h3v4.5H15V8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </a>
        <a className="bar__title title-font" href="#/" title="Volver al inicio">
          {COURSE}
        </a>
        <span className="bar__meta">
          {title} · {nodesById.size} tarjetas
        </span>
        <span className="bar__spacer" />
        <button type="button" className="pill bar__search" onClick={() => setFinderOpen(true)} aria-label="Buscar tarjetas" title="Buscar tarjetas (⌘F / Ctrl+F)">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden>
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="bar__search-label">Buscar</span>
        </button>
        <span className="bar__hint">
          <span className="bar__key bar__key--concept">término</span> salta a su tarjeta ·{' '}
          <span className="bar__key bar__key--art">art.</span> abre el Código
        </span>
        <button type="button" className="pill" onClick={() => setFont(FONTS[font].next)} aria-label="Cambiar tipografía">
          <span className="pill__aa" aria-hidden>
            Aa
          </span>
          {FONTS[font].label}
        </button>
        <button
          type="button"
          className={`pill${titlesOnly ? ' is-on' : ''}`}
          aria-pressed={titlesOnly}
          onClick={() => setTitlesOnly((v) => !v)}
        >
          Solo títulos
        </button>
        <button type="button" className="pill" onClick={() => active()?.collapseLast()}>
          Plegar última capa
        </button>
        <button type="button" className="pill" onClick={() => active()?.collapseAll()}>
          Plegar todo
        </button>
        <button type="button" className="pill" onClick={() => active()?.fitAll()}>
          Encuadrar
        </button>
      </header>

      <nav className="tabs" role="tablist">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            role="tab"
            aria-selected={tab.key === activeKey}
            className={`tab tint-${tintOf(tab.rootId)}${tab.key === activeKey ? ' is-active' : ''}`}
            onClick={() => setActiveKey(tab.key)}
          >
            <span className="tab__dot" aria-hidden />
            <span className="tab__label">{tabLabel(tab)}</span>
            <button
              type="button"
              className="tab__close"
              aria-label={`Cerrar ${tabLabel(tab)}`}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.key);
              }}
            >
              <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      <footer className="map-foot">
        <span className="map-foot__label">Proyecto de CT Derecho</span>
        <a className="map-foot__logo" href="#/" aria-label="Volver al inicio" title="Volver al inicio">
          <img src={avanzarLogo} alt="Avanzar UC" />
        </a>
      </footer>

      <Finder open={finderOpen} onClose={() => setFinderOpen(false)} onPick={(id) => active()?.focusNode(id)} />

      {menu ? (
        <div
          className="menu"
          style={{ left: Math.min(menu.x, window.innerWidth - 250), top: Math.min(menu.y, window.innerHeight - 60) }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="menu__item"
            onClick={() => {
              openBranch(menu.nodeId);
              setMenu(null);
            }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
              <path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M11.5 9.5v4h-9v-9h4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Abrir en una nueva pestaña
          </button>
        </div>
      ) : null}
    </main>
  );
}
