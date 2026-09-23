// One entry per course, each with its own landing page and set of professors. `path` is the
// hash-route segment for the course's landing ('' keeps Personas y Bienes at the site's root,
// '#/', so existing links keep working); a later course's routes live under '#/<path>'.
import * as personasBienes from './professors.js';
import * as derechoRomanoII from './derecho-romano-ii.js';

export const COURSES = [
  { id: 'personas-bienes', path: '', title: personasBienes.COURSE, siteTitle: personasBienes.SITE_TITLE, professors: personasBienes.PROFESSORS },
  { id: 'derecho-romano-ii', path: 'romano-ii', title: derechoRomanoII.COURSE, siteTitle: derechoRomanoII.SITE_TITLE, professors: derechoRomanoII.PROFESSORS },
];

export const homeRoute = (course) => (course.path ? `#/${course.path}` : '#/');
