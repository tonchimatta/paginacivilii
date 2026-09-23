# Personas y Bienes · Mapas de apuntes

Página de inicio con los profesores del curso y, para cada uno con apuntes, un mapa mental de
Derecho Civil II ("Personas y Bienes"), hecho con React + Vite,
React Flow y Framer Motion, con un layout de árbol propio. Sitio estático, sin backend.

```bash
npm install
npm run dev      # regenera src/generated/*.json y levanta Vite
npm run build    # regenera los JSON y compila a dist/
```

## Rutas

- `#/`: página de inicio "Personas y Bienes", con un carrusel de tarjetas de profesores
  (← →, teclado o deslizando). Datos en `src/data/professors.js`.
- `#/apuntes/<id>`: el mapa de los apuntes de un profesor (`gandarillas-vergara`,
  `eyzaguirre-allende`). En la barra del mapa, "Personas y Bienes" vuelve al inicio. Cada mapa
  se descarga aparte, recién cuando se abre.

Por ahora tienen apuntes Gandarillas y Vergara, Eyzaguirre y Allende, y Pater y Germain; Cifuentes y Dibarrat,
Fernández y Fontecilla, y Barrientos aparecen como "Próximamente". Las
ilustraciones de cada profesor van donde está el "!" de cada tarjeta.

## Datos

| Archivo | Qué es |
|---|---|
| `data/gandarillas-vergara.md` | Apuntes de Gandarillas y Vergara (antes `SOLEMNE CIVIL II.md`) |
| `data/eyzaguirre-allende.md` | Apuntes de Eyzaguirre y Allende, ya ordenados (ver abajo) |
| `data/raw/eyzaguirre.md` | Los mismos apuntes tal como llegaron (PDF convertido a markdown) |
| `data/codigo-civil.md` | Código Civil (antes `CC - Código Civil.md`) |
| `scripts/build-data.mjs` | Preprocesador: cada apunte -> `src/generated/<id>.json` |
| `scripts/prepare-eyzaguirre.mjs` | Limpieza única del PDF convertido de Eyzaguirre y Allende |
| `src/generated/*.json` | Árboles ya parseados (no se versionan); la app solo lee esto |

Los archivos originales se movieron a `data/` con nombres ASCII: el nombre del Código venía en
Unicode descompuesto (NFD) y no coincidía con la ruta escrita a mano.

Para sumar un profesor: agregar sus apuntes en `data/`, una línea en `UNITS` de
`scripts/build-data.mjs` y de `src/data/unit.js`, y `route` en `src/data/professors.js`. Sin
tocar componentes.

## Apuntes de Eyzaguirre y Allende

Llegaron como un PDF convertido a markdown, con los niveles de título desordenados.
`scripts/prepare-eyzaguirre.mjs` hizo la limpieza mecánica: sacó portada, índice y encabezados
de página; unió párrafos, citas y tablas cortadas por un salto de página; pasó las notas al pie
al texto, entre paréntesis (las que solo copiaban el artículo citado se eliminaron, porque el
artículo se abre al tocarlo); quitó subrayados y resaltados; y convirtió "art. 565 cc" en enlaces.
Después, a mano, en `data/eyzaguirre-allende.md`:

- La jerarquía sigue las mismas seis partes que Gandarillas y Vergara: I. Bienes, II. El
  dominio, III. La copropiedad, IV. Modos de adquirir el dominio, V. La tradición y VI. La
  posesión. Ocupación y accesión pasaron a la parte IV (en el PDF venían después de la
  inscripción conservatoria) y la copropiedad salió de "Limitaciones del dominio" a su propia parte.
- Temas numerados de corrido (1 a 47), subtemas 1.1 y letras a), como en Gandarillas.
- Se armaron a mano tres tablas que el PDF desarmó en columnas (universalidades, doctrina romanista
  y germánica, posesión regular e irregular) y las listas cuyo anidado se perdió.
- Para que cada tarjeta tenga una sola idea: las preguntas que abren un párrafo en secciones
  largas ("¿Qué pasa con la partición?") y las viñetas que abren con un término en negrita
  dentro de listas mezcladas son etiquetas, o sea tarjetas propias. Los "P. ej." de una lista
  se quedan en la tarjeta del ítem anterior, en vez de ser tarjetas sueltas.

El texto no se reescribió: solo se movieron límites de negrita, se unieron líneas cortadas y se
agregaron títulos de subtema donde una sección cambiaba de tema (p. ej. "Tradición bajo condición").

## Cómo se parsean los apuntes (y en qué se aparta del supuesto inicial)

**Jerarquía.** Cada apunte trae sus propias divisiones. En Gandarillas y Vergara: seis H1 (partes I a VI), H2 = tema, H3 = subtema y a veces H4; el parser acepta hasta H6 (numerados `i)` y `(1)` en los niveles 5 y 6).
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
encabezado (bloques etiquetados, ítems, casos) usa la tarjeta de término. Su círculo muestra
su posición entre sus hermanas (1, 2, 3...); si es la única, no lleva círculo.

**Enumeraciones.** En toda lista, el término con que abre cada ítem va en negrita si no lo
estaba: lo anterior a los dos puntos ("**Uso inocuo:** ..."), una frase corta antes de un
paréntesis ("**Ciertos derechos de acceso forzoso** (...)") o la primera oración si es corta
(hasta 10 palabras). Los ejemplos ("Ej: ..."), citas y oraciones largas no se tocan.

**Tablas.** Una tarjeta con una tabla se ensancha hasta el ancho natural de la tabla: no hay
scroll horizontal dentro de las tarjetas.

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
- Doble tap en una tarjeta: zoom hasta dejarla centrada. En pantallas táctiles el tap simple
  espera ~0,3 s antes de abrir o cerrar ramas, para que la tarjeta no se mueva bajo el dedo
  entre el primer y el segundo toque; con mouse, un doble clic deshace lo que hizo el primero.
- Mantener presionada una parte o un tema (clic derecho en computador) muestra "Abrir en una
  nueva pestaña": abre, dentro de la misma página, una pestaña con solo esa rama, sin lo que
  está por encima de ella. Cada pestaña guarda su propio estado mientras está abierta y se cierra
  con su X. Un término enlazado que apunta fuera de la rama se abre en el esquema general.
- Ícono de casa (arriba a la izquierda): vuelve al esquema general; si esa pestaña estaba
  cerrada, la reabre como primera pestaña.
- Flechas ← → a los lados (o las flechas del teclado): recorren las tarjetas en el orden de
  lectura de los apuntes, desde la tarjeta actual (la última tocada o alcanzada, marcada con su
  color). → entra a la primera rama de la tarjeta; si no tiene, pasa a la siguiente hermana; al
  terminar una rama sube al siguiente subtema, tema o parte, lo anuncia en amarillo ("Siguiente
  tema · ...") y pliega la rama terminada. ← va a la hermana anterior o, desde la primera, al
  padre. Cada flecha dice a dónde va y desaparece cuando no hay a dónde ir (← en la raíz de la
  pestaña, → después de la última tarjeta). Las ramas de una tarjeta se abren solo al apretar →
  para entrar en ellas, no al llegar a la tarjeta.
- "Solo títulos" (barra superior): las tarjetas ocultan su definición y muestran solo título,
  número y "N ramas"; el mapa se reacomoda más compacto. La elección se recuerda.
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
Las posiciones las decide siempre el layout de árbol (`src/graph/layout.js`); nada flota libre.
Cada rama ocupa su propia franja vertical, así las tarjetas hermanas quedan siempre juntas y el
padre centrado frente a ellas. Empezó con dagre, pero dagre reordena columnas enteras para
reducir cruces y podía dejar una hermana lejos de las otras.
