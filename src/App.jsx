import { useEffect, useState } from 'react';
import Landing from './landing/Landing.jsx';
import MapView from './MapView.jsx';
import { COURSE, PROFESSORS } from './data/professors.js';
import { UNITS, setUnit } from './data/unit.js';

// Hash routes, so reloads and the browser's back button work on GitHub Pages:
//   #/                   landing page (professors)
//   #/apuntes/<id>       the notes map of one professor (ids in src/data/professors.js)
const readRoute = () => window.location.hash.replace(/^#/, '') || '/';
const unitIdOf = (route) => {
  const id = route.match(/^\/apuntes\/([\w-]+)/)?.[1];
  return id && UNITS[id] ? id : null;
};

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [loaded, setLoaded] = useState(null); // id of the unit whose data is in unit.js
  const unitId = unitIdOf(route);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const name = PROFESSORS.find((p) => p.id === unitId)?.name;
    document.title = name ? `${name} · ${COURSE}` : COURSE;
  }, [unitId]);

  useEffect(() => {
    if (!unitId || unitId === loaded) return;
    let cancelled = false;
    UNITS[unitId]().then((mod) => {
      if (cancelled) return;
      setUnit(mod.default);
      setLoaded(unitId);
    });
    return () => {
      cancelled = true;
    };
  }, [unitId, loaded]);

  if (!unitId) return <Landing />;
  // key: a different professor starts a fresh map (tabs, open branches, camera).
  return unitId === loaded ? <MapView key={unitId} /> : <div className="loading">Cargando apuntes…</div>;
}
