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
No hay un H1 único de unidad, así que la raíz es sintética (`--title`). Cada encabezado es una
tarjeta.

**Una cosa por tarjeta.** Cada tarjeta guarda solo su definición; lo que depende de ella va en
tarjetas hijas:

- La definición es el texto antes de la primera etiqueta en negrita o, si no hay, el primer
  párrafo etiquetado. Un `**Concepto:**` o `**Definición:**` posterior también se suma a ella.
- Cada otro párrafo `**Etiqueta:** texto` (Características, Elementos, Crítica...) abre una
  tarjeta hija, con las listas, tablas y párrafos que le siguen hasta la próxima etiqueta.
- Una lista cuyos ítems empiezan todos con un término en negrita (`1. **Simples.**`,
  `- **De goce:**`) se convierte en una tarjeta por ítem. Si a una tarjeta le queda más de ~650
  caracteres, también se separan sus listas simples, con el título tomado de las primeras palabras.
- Cada caso (`> **Caso ...**`) es su propia tarjeta.
- Un subtema hoja titulado "Concepto" o "Definición" se funde con su padre, cuya definición es.

**Reglas contra duplicados.** Dentro de un mismo padre no puede haber dos tarjetas para la misma
idea:

- Hijos con el mismo título son una sola tarjeta. Si uno es subtema (encabezado), sobrevive él,
  con su número, y el texto del otro pasa a ser su definición. Ej: "**Clasificación:** -
  **Modos absolutos:** ..." y "15.1 Modos absolutos".
- Un ítem que nombra a un subtema hermano también se funde con él: "**Dos partes** ..." con
  "29.1 Primer requisito: dos partes". Un ítem de una sola palabra solo se funde si el subtema
  es exactamente "X: esa palabra".
- Un hijo con el mismo título que su padre se funde en el padre.
- Una etiqueta que queda sola porque su lista pasó a tarjetas hijas ("**Clasificación:**") se
  elimina, salvo que sea una cita ("**Art. 2312:**").

**Formato por nivel.** Todo encabezado de los apuntes (unidad, parte, tema, subtema) usa la
misma tarjeta, con bloque de color y número, tenga o no definición. Todo lo que depende de un
encabezado (bloques etiquetados, ítems, casos) usa la tarjeta de término con la "D".

Ejemplo: "Singulares" muestra su concepto y de ella cuelgan Simples, Complejas y Universales.
Lo que sigue siendo largo son tablas y párrafos de prosa, que no se cortan para no alterar el texto.

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
- Al presionar una tarjeta, su fondo toma el color de su encabezado: el pastel completo en los
  temas y una versión atenuada en las tarjetas de texto. Solo una tarjeta a la vez; clic en el
  fondo lo apaga.

## Interacción

- Clic en un tema, o en el título o el pie "N ramas" de una tarjeta de término: abre o
  cierra sus ramas a la derecha.
- Doble tap en una tarjeta: zoom hasta encuadrarla. Si el primer tap abrió o cerró ramas, se
  deshace.
- Barra superior: "Plegar última capa" cierra el nivel abierto más profundo (o los artículos
  abiertos, si hay); "Plegar todo" vuelve a las seis partes; "Encuadrar" muestra todo lo abierto. Cada apertura guarda la vista actual
  en una pila; cerrar la recupera.
- Término enlazado (subrayado): abre la ruta hasta esa tarjeta, mueve la cámara y la hace destellar.
- Artículo enlazado (resaltado en amarillo): crea una tarjeta efímera con el texto del artículo, unida por un
  cable punteado. Se cierra con la X o volviendo a hacer clic en el mismo enlace.
- Zoom y arrastre manuales siempre disponibles; cualquier gesto interrumpe un movimiento de cámara.
- Las tarjetas no tienen scroll interno: muestran todo su texto. En pantallas táctiles un scroll
  dentro de la tarjeta competía con el arrastre del mapa.

Los cables son curvas bezier con los extremos fijos en las tarjetas y los puntos de control en
un resorte subamortiguado: cuando el layout mueve las tarjetas, el cable se dobla y se asienta.
Las posiciones las decide siempre dagre; nada flota libre.
