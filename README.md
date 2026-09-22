# Civil II · Mapa interactivo

Mapa mental de los apuntes de Derecho Civil II ("Personas y Bienes"), hecho con React + Vite,
React Flow, Framer Motion y dagre. Sitio estático, sin backend.

```bash
npm install
npm run dev      # regenera src/generated/unit.json y levanta Vite
npm run build    # regenera el JSON y compila a dist/
```

## Datos

| Archivo | Qué es |
|---|---|
| `data/notes.md` | Apuntes (antes `SOLEMNE CIVIL II.md`) |
| `data/codigo-civil.md` | Código Civil (antes `CC - Código Civil.md`) |
| `scripts/build-data.mjs` | Preprocesador: markdown -> `src/generated/unit.json` |
| `src/generated/unit.json` | Árbol ya parseado; la app solo lee esto |

Los archivos originales se movieron a `data/` con nombres ASCII: el nombre del Código venía en
Unicode descompuesto (NFD) y no coincidía con la ruta escrita a mano.

Para otra unidad basta con apuntar el script a otros apuntes, sin tocar componentes:

```bash
node scripts/build-data.mjs --notes data/otra-unidad.md --title "Obligaciones"
```

## Cómo se parsean los apuntes (y en qué se aparta del supuesto inicial)

**Jerarquía.** Los apuntes tienen seis H1 (partes I a VI), H2 = tema, H3 = subtema y a veces H4.
No hay un H1 único de unidad, así que la raíz es sintética (`--title`). La regla es por posición,
no por profundidad: un encabezado con subencabezados es un TopicNode; uno sin ellos es un
ConceptNode (el título es el término y el cuerpo, la definición). Si un tema tiene texto propio
antes de su primer subencabezado, ese texto se convierte en una tarjeta "Panorama del tema".

**División en varios términos.** Casi todas las etiquetas en negrita de los apuntes estructuran
un argumento (`**Concepto:**`, `**Crítica:**`, `**Vial:**` para la opinión de un autor), así que
dividir por cualquier `**X:**` fragmentaba secciones enteras. Una sección hoja se divide solo
cuando el encabezado nombra los términos: "Cosa y bien" -> Cosa, Bien; "Título y modo";
"Originarios y derivativos".

**Citas de artículos.** En los apuntes ya son wiki-links de Obsidian
(`[[Código Civil#^art-565|565]]`, también con `\|` dentro de tablas y una variante
`[[CC - Código Civil#Artículo 565.|565]]`). Esos se enlazan siempre. Las citas en texto plano
("según el artículo 570") se enlazan solo si ese número aparece enlazado en otra parte de los
apuntes y no va seguido de otra norma (CPR, CPC, Reglamento, DL, Ley...), porque los apuntes
también citan la Constitución, el borrador de 2022 y la Constitución cubana.

**Código Civil.** Cada artículo es `##### Artículo N.` con cuerpo y marca `^art-N`, salvo los
`bis`/`ter` y los `548-3`, que vienen como párrafo `Artículo 58 bis.- ...`. El parser reconoce los
dos formatos y guarda Libro/Título/Párrafo como contexto. Solo los artículos citados entran al JSON.

**Referencias cruzadas.** Se buscan títulos de otras tarjetas (temas incluidos) en el texto,
primero los más largos, solo la primera aparición por tarjeta y nunca hacia la tarjeta misma o
sus ancestros. Se descartan como destino los títulos repetidos, los genéricos ("Concepto",
"Causales"), las preguntas y los de una sola palabra que son partes enteras ("El dominio"),
porque enlazaban en casi todas las tarjetas.

## Diseño

Plano y claro: tarjetas blancas con borde negro fino, bloques pastel por parte (cada una de las
seis partes tiene su color y lo heredan sus temas y tarjetas) y una grilla tenue de fondo.

- Tipografía por defecto: Inter Light. El botón "Aa" de la barra superior cambia a IBM Plex
  Serif para el texto y Roboto Mono Bold para los títulos; la elección se recuerda en el navegador.
- Al presionar una tarjeta, su fondo pasa a un gradiente en movimiento
  ([shadergradient](https://github.com/ruucm/shadergradient)) con la paleta de su parte. Solo una
  tarjeta a la vez; clic en el fondo lo apaga. three.js se carga recién la primera vez que se
  presiona una tarjeta, para no pesar en la carga inicial.

## Interacción

- Clic en un tema: abre o cierra sus ramas a la derecha. Cada apertura guarda la vista actual
  en una pila; cerrar la recupera.
- Término enlazado (verde): abre la ruta hasta esa tarjeta, mueve la cámara y la hace destellar.
- Artículo enlazado (ámbar): crea una tarjeta efímera con el texto del artículo, unida por un
  cable punteado. Se cierra con la X o volviendo a hacer clic en el mismo enlace.
- Zoom y arrastre manuales siempre disponibles; cualquier gesto interrumpe un movimiento de cámara.

Los cables son curvas bezier con los extremos fijos en las tarjetas y los puntos de control en
un resorte subamortiguado: cuando el layout mueve las tarjetas, el cable se dobla y se asienta.
Las posiciones las decide siempre dagre; nada flota libre.
