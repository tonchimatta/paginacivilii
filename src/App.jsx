import { useEffect, useState } from 'react';
import Landing from './landing/Landing.jsx';
import MapView from './MapView.jsx';

// Hash routes, so reloads and the browser's back button work on GitHub Pages:
//   #/                              landing page (professors)
//   #/apuntes/gandarillas-vergara   the notes map
const readRoute = () => window.location.hash.replace(/^#/, '') || '/';

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.title = route.startsWith('/apuntes/') ? 'Gandarillas y Vergara · Personas y Bienes' : 'Personas y Bienes';
  }, [route]);

  return route.startsWith('/apuntes/gandarillas-vergara') ? <MapView /> : <Landing />;
}
