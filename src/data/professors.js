// Landing page: one card per professor's notes. Only professors with notes (`route`) open a
// map; the rest show as "Próximamente" until their notes are added (see README).
// Themes are the same pastels as the six parts of the maps (tint-* classes in styles.css).

export const COURSE = 'Personas y Bienes';
export const SITE_TITLE = 'mapas civil II AVZ';

export const PROFESSORS = [
  { id: 'gandarillas-vergara', name: 'Gandarillas y Vergara', route: '#/apuntes/gandarillas-vergara', theme: 'lavender' },
  { id: 'eyzaguirre-allende', name: 'Eyzaguirre y Allende', route: '#/apuntes/eyzaguirre-allende', theme: 'pink' },
  { id: 'cifuentes-dibarrat', name: 'Cifuentes y Dibarrat', route: '#/apuntes/cifuentes-dibarrat', theme: 'peach' },
  { id: 'pater-germain', name: 'Pater y Germain', route: '#/apuntes/pater-germain', theme: 'yellow' },
  { id: 'fernandez-fontecilla', name: 'Fernández y Fontecilla', route: '#/apuntes/fernandez-fontecilla', theme: 'sky' },
  { id: 'barrientos', name: 'Barrientos', route: '#/apuntes/barrientos', theme: 'mint' },
];
