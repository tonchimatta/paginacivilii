// Landing page: one card per professor's notes, same shape as src/data/professors.js. A
// professor gets a `route: '#/romano-ii/apuntes/<id>'` (this course's path, from
// src/data/courses.js, plus the professor's id) once their notes are incorporated; until then
// the card shows "Próximamente" (see src/landing/Landing.jsx). Themes are the same pastels as
// the parts of the maps (tint-* classes in styles.css).

export const COURSE = 'Derecho Romano II';
export const SITE_TITLE = 'mapas romano II AVZ';

export const PROFESSORS = [
  { id: 'schiele', name: 'Schiele', theme: 'lavender' },
  { id: 'amunategui', name: 'Amunátegui', theme: 'pink' },
  { id: 'correa-bascunan-pater', name: 'Correa Bascuñán (pater)', theme: 'peach' },
  { id: 'correa-manriquez', name: 'Correa Manríquez', theme: 'yellow' },
  { id: 'wegman', name: 'Wegman', theme: 'sky' },
  { id: 'carvajal', name: 'Carvajal', theme: 'mint' },
  { id: 'rodriguez', name: 'Rodríguez', theme: 'lavender' },
  { id: 'musso', name: 'Musso', theme: 'pink' },
];
