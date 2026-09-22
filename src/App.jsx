import { ReactFlowProvider } from 'reactflow';
import MindMap from './graph/MindMap.jsx';
import { title } from './data/unit.js';

export default function App() {
  return (
    <ReactFlowProvider>
      <main className="app">
        <MindMap />
        <header className="hud">
          <div className="hud__eyebrow">Derecho Civil II</div>
          <h1 className="hud__title">{title}</h1>
          <p className="hud__hint">
            Clic en un tema para abrirlo. Los <span className="hud__key hud__key--concept">términos</span> llevan a su
            tarjeta; los <span className="hud__key hud__key--art">artículos</span> abren el texto del Código.
          </p>
        </header>
        <div className="grain" aria-hidden />
      </main>
    </ReactFlowProvider>
  );
}
