// Landing page: one card per professor's notes. Only professors with notes (`route`) open a
// map; the rest show as "Próximamente" until their notes are added (see README).

export const COURSE = 'Personas y Bienes';

export const PROFESSORS = [
  { id: 'gandarillas-vergara', name: 'Gandarillas y Vergara', route: '#/apuntes/gandarillas-vergara', theme: 'lavender' },
  { id: 'eyzaguirre-allende', name: 'Eyzaguirre y Allende', theme: 'peach' },
  { id: 'cifuentes-dibarrat', name: 'Cifuentes y Dibarrat', theme: 'indigo' },
  { id: 'pater-germain', name: 'Pater y Germain', theme: 'olive' },
  { id: 'fernandez-fontecilla', name: 'Fernández y Fontecilla', theme: 'sky' },
  { id: 'barrientos', name: 'Barrientos', theme: 'navy' },
];
