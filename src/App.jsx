import { useEffect, useState } from 'react';
import Landing from './landing/Landing.jsx';
import MapView from './MapView.jsx';
import { COURSES, homeRoute } from './data/courses.js';
import { UNITS, setUnit } from './data/unit.js';

// Hash routes, so reloads and the browser's back button work on GitHub Pages:
//   #/                        landing page of the default course (Personas y Bienes)
//   #/<course.path>           landing page of another course (see src/data/courses.js)
//   #/apuntes/<id>            the notes map of a professor of the default course
//   #/<course.path>/apuntes/<id>   the notes map of a professor of another course
// Professor ids live in each course's professors file (e.g. src/data/professors.js).
const readRoute = () => window.location.hash.replace(/^#/, '') || '/';

const courseOf = (route) =>
  COURSES.find((c) => c.path && (route === `/${c.path}` || route.startsWith(`/${c.path}/`))) ??
  COURSES.find((c) => !c.path);

const unitIdOf = (route, course) => {
  const rest = course.path ? route.slice(course.path.length + 1) || '/' : route;
  const id = rest.match(/^\/apuntes\/([\w-]+)/)?.[1];
  return id && UNITS[id] ? id : null;
};

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [loaded, setLoaded] = useState(null); // id of the unit whose data is in unit.js
  const course = courseOf(route);
  const unitId = unitIdOf(route, course);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const name = course.professors.find((p) => p.id === unitId)?.name;
    document.title = name ? `${name} · ${course.siteTitle}` : course.siteTitle;
  }, [course, unitId]);

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

  // key: switching courses starts a fresh carousel (index, keyboard listener).
  if (!unitId) return <Landing key={course.id} course={course} />;
  // key: a different professor starts a fresh map (tabs, open branches, camera).
  return unitId === loaded ? (
    <MapView key={unitId} course={course} homeRoute={homeRoute(course)} />
  ) : (
    <div className="loading">Cargando apuntes…</div>
  );
}
