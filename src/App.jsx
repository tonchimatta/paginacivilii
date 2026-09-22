import { useEffect, useRef, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import MindMap from './graph/MindMap.jsx';
import { title, nodesById } from './data/unit.js';

const FONTS = {
  sans: { label: 'Inter', next: 'serif' },
  serif: { label: 'Plex Serif + Mono', next: 'sans' },
};

function readFont() {
  try {
    return localStorage.getItem('font') === 'serif' ? 'serif' : 'sans';
  } catch {
    return 'sans';
  }
}

export default function App() {
  const [font, setFont] = useState(readFont);
  const controlsRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.font = font;
    try {
      localStorage.setItem('font', font);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  }, [font]);

  return (
    <ReactFlowProvider>
      <main className="app">
        <MindMap controlsRef={controlsRef} />
        <header className="bar">
          <span className="bar__mark" aria-hidden />
          <span className="bar__title title-font">{title}</span>
          <span className="bar__meta">Derecho Civil II · {nodesById.size} tarjetas</span>
          <span className="bar__spacer" />
          <span className="bar__hint">
            <span className="bar__key bar__key--concept">término</span> salta a su tarjeta ·{' '}
            <span className="bar__key bar__key--art">art.</span> abre el Código
          </span>
          <button
            type="button"
            className="pill"
            onClick={() => setFont(FONTS[font].next)}
            aria-label="Cambiar tipografía"
          >
            <span className="pill__aa" aria-hidden>
              Aa
            </span>
            {FONTS[font].label}
          </button>
          <button type="button" className="pill" onClick={() => controlsRef.current?.collapseLast()}>
            Plegar última capa
          </button>
          <button type="button" className="pill" onClick={() => controlsRef.current?.collapseAll()}>
            Plegar todo
          </button>
          <button type="button" className="pill" onClick={() => controlsRef.current?.fitAll()}>
            Encuadrar
          </button>
        </header>
      </main>
    </ReactFlowProvider>
  );
}
