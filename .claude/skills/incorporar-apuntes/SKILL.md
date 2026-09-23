---
name: incorporar-apuntes
description: Incorpora los apuntes de un nuevo profesor de Personas y Bienes (Derecho Civil II) al sitio de mapas mentales. Convierte un markdown de apuntes (limpio o convertido desde PDF) al formato jerárquico del repo (partes, temas, subtemas, etiquetas, citas de artículos), lo conecta a la app y lo verifica. Usar cuando llegan apuntes nuevos de un profesor, o cuando piden reordenar o fragmentar los apuntes de uno que ya está.
---

# Incorporar apuntes de un profesor

El sitio muestra un mapa mental por profesor. Cada mapa sale de un markdown en
`data/<id>.md` que `scripts/build-data.mjs` (con `scripts/lib/parse-notes.mjs`) convierte en
`src/generated/<id>.json`. **El parser no se toca para un profesor nuevo**: el trabajo es
dejar el markdown en el formato que el parser ya entiende. El formato de referencia (cómo se
escriben etiquetas, listas, citas y numeración; no qué partes lleva) son los apuntes de
Gandarillas y Vergara (`data/gandarillas-vergara.md`), que la usuaria aprobó;
Eyzaguirre y Allende (`data/eyzaguirre-allende.md`) es el ejemplo de apuntes que llegaron
como PDF convertido y hubo que limpiar.

Lee `formato.md` (en esta carpeta) antes de editar: explica qué hace el parser con cada
construcción markdown y cómo se ve eso en el mapa.

Scripts auxiliares en `scripts/` de esta skill (todos reciben la ruta del markdown):

| Script | Para qué |
|---|---|
| `outline.py <md> [--context N]` | Esquema de encabezados, con N líneas de contexto |
| `section.py <md> "título" [ancho]` | Una sección, una línea por párrafo, con número de línea |
| `patch.py <md> <parche.txt>` | Reemplazos exactos (`<<<` viejo `===` nuevo `>>>`); falla si algo no calza |
| `renumber.py <md>` | Numera los 6 niveles: I. / 1. (de corrido) / 1.1 / a) / i) / (1) |
| `link-articles.py <in> <out> [--skip TXT]` | Quita el front matter y enlaza las citas al Código Civil (no las de CPC, COT, CPR, leyes, reglamentos) |
| `labels.py <md>` | En listas mezcladas, cada viñeta `- **Término:** ...` pasa a etiqueta |
| `card-stats.mjs <id>...` | Largo de tarjetas y títulos sospechosos del JSON generado |
| `check-map.mjs <id> "<Nombre>" <carpeta>` | Prueba en navegador desde el inicio, con capturas |

## Principios (lo que la usuaria pidió y aprobó)

- **No reescribir el texto de los apuntes.** Sí se puede: unir líneas cortadas, mover
  límites de negrita, convertir viñetas en etiquetas, quitar ruido de conversión, y agregar
  títulos de tema o subtema cortos donde una sección cambia de tema. Si un título es tuyo,
  que use las palabras del apunte ("Tradición bajo condición", no una paráfrasis).
- **Una idea por tarjeta.** Cada encabezado guarda solo su definición; lo que depende de ella
  (características, elementos, clasificaciones, casos) va en tarjetas hijas. Mejor más
  fragmentado que tarjetas largas, pero sin tarjetas sin sentido ("¿Cuáles son?", "P. ej. ...").
- **Las divisiones salen de cada apunte.** Las partes, temas y subtemas siguen la organización
  del propio apunte (su índice, sus títulos, cómo el profesor ordena la materia), no el
  esqueleto de otro profesor. Lo que se comparte entre profesores es la forma: numeración,
  convenciones de etiquetas y citas, y una idea por tarjeta.
- **Tantos niveles como el apunte necesite.** Si la materia se subdivide en cinco o seis
  niveles, se usan cinco o seis niveles de encabezado; no se aplana para caber en cuatro.
- **Los otros mapas no cambian.** Si tocas el parser, el JSON de los demás profesores tiene
  que salir idéntico (ver Verificación).
- **Las decisiones de clasificación se le cuentan a la usuaria.** Tomas una decisión
  razonable, la aplicas y al final la explicas en una lista corta, marcando las que conviene
  que ella confirme. Pregunta antes solo si la decisión cambia todo el árbol.

## Procedimiento

### 1. Inspeccionar antes de tocar

1. Copia el original tal cual a `data/raw/<id>.md` (nunca se edita; es la fuente para
   reconstruir tablas o frases dañadas).
2. `python3 outline.py data/raw/<id>.md --context 2`, y lee el comienzo, un tramo del medio
   y el final del archivo.
3. Diagnostica qué tipo de archivo es:
   - **Markdown limpio** (como Gandarillas): encabezados con niveles coherentes, citas ya
     como wiki-links `[[Código Civil#^art-565|565]]`. Pasa directo al paso 3.
   - **PDF convertido** (como Eyzaguirre): repite un encabezado de página ("Apuntes X" más
     número de página), tiene índice en tablas, notas al pie como `> 5 texto` o `5 texto`,
     marcas `<sup>5</sup>`, citas de artículos partidas entre texto con `` ` `` y bloques
     ```` ``` ````, `<u>`, `<mark>`, viñetas decorativas (❖ ➢ ▪ a. i. 1)), tablas cortadas
     por el salto de página y niveles de título sin lógica. Necesita el paso 2.
4. Cuenta el ruido para dimensionar: `grep -c` de encabezado de página, `<sup>`, ```` ``` ````,
   `<mark>`, `^>`, `^|`.

### 2. Limpieza mecánica (solo si es un PDF convertido)

Parte de `scripts/prepare-eyzaguirre.mjs` (cópialo a `scripts/prepare-<id>.mjs` y ajusta la
línea del encabezado de página y el primer encabezado real). Hace, en este orden:

1. Corta la portada y el índice (todo antes del primer encabezado real).
2. Quita los encabezados de página y el número que los sigue, y deja una marca de salto.
3. Notas al pie: toda línea `> N texto` (o `N texto` justo antes de un salto) con N nuevo
   abre una nota; una línea `>` sin número continúa la última; una nota puede venir pegada a
   la anterior en la misma línea ("...otros”. 31 El profesor..."). Después:
   - si la nota solo copia el artículo que el texto ya cita ("art. 565 cc<sup>1</sup>" con
     nota "Art. 565 CC ..."), se elimina: el artículo se abre al tocar la cita;
   - cualquier otra nota se inserta en el texto entre paréntesis: "Herencia (se origina por el
     fallecimiento...)";
   - dentro de citas de artículos el PDF deja la marca como dígitos pegados ("social,37 con",
     "legales36."): se reemplazan por la nota entre paréntesis.
4. Párrafo que es solo una frase subrayada o en negrita (≤ 14 palabras, sin "art.") → etiqueta
   `**Frase:**` (o `**¿Pregunta?**` sin dos puntos si termina en "?").
5. Enumeraciones escritas como párrafos sueltos ("i. Contratos", "ii ) Tradición") → viñetas.
6. Quita `<u>`, `<mark>`, backticks y `` `o` `` (viñeta de Word).
7. Pega cada bloque ```` ``` ```` al párrafo anterior: siempre es la continuación de una
   cita de artículo.
8. Une párrafos cortados por un salto de página: el anterior no termina en puntuación y el
   siguiente empieza en minúscula. Une tablas consecutivas con el mismo número de columnas.
   Une listas consecutivas.
9. Arregla espacios: `**X** :` → `**X:**`, `“ texto` → `“texto`, espacio antes de `.,;)`,
   `P ej.` → `P. ej.`, `**X** →` → `**X:**`, `<br>` en tablas → espacio, y espacio alrededor
   de negritas pegadas ("un**vínculo**hay" → "un **vínculo** hay").
10. Quita marcadores al comienzo de viñetas (❖ ➢ ▪ → a. b) i. ii) (a) 1) 1.1.), respetando
    la sangría. Ojo: primero quitar marcadores y después normalizar "P ej.", o "P. ej." se
    confunde con el marcador "P.".
11. Citas: "art. 565 cc", "Art. 1489 inc 1 CC", "arts. 570 y 571 cc", "artículo 1830 del
    Código Civil" → cada número como `[[Código Civil#^art-565|565]]` (en tablas, `\|`). Solo
    cuando la cita dice CC o Código Civil: los artículos de la CPR, leyes o reglamentos no se
    enlazan.
12. Encabezados: quita formato, dos puntos finales y espacios; mantén el nivel original
    (se corrige a mano en el paso 3).

El script se niega a sobrescribir `data/<id>.md` sin `--force`, porque desde ahí en adelante
ese archivo se edita a mano. Mientras sigas ajustando el script, puedes regenerar y volver a
aplicar tus parches del paso 3 (por eso los parches van en archivos). Cuando empieces a hacer
cambios a mano que no están en parches, deja de regenerar.

Después de limpiar, busca restos:

```bash
grep -c '`' data/<id>.md                       # backticks
grep -n '<' data/<id>.md | head                # html
grep -nE '^\s*- (\(?[ivxIVX]{1,4}|\(?[a-hA-H]|[0-9]{1,2})[.)] ' data/<id>.md   # marcadores
grep -n '^\*\*[a-záéíóúñ]' data/<id>.md        # "etiquetas" que son continuación de frase
grep -oE '\b[a-záéíóúñ]{17,}\b' data/<id>.md | sort | uniq -c   # palabras pegadas
grep -n '\*\*' data/<id>.md | awk -F'\\*\\*' 'NF%2==0'          # negritas sin cerrar
```

### 3. Jerarquía: partes, temas, subtemas

Arma el árbol a mano sobre `data/<id>.md`, con parches (`patch.py`) guardados en el scratchpad.

1. **Lee la organización del propio apunte** antes de decidir niveles, en este orden de
   confianza:
   - el índice o tabla de contenidos, si trae uno (en un PDF convertido, la sangría o el largo
     de los puntos suspensivos delata el nivel de cada entrada);
   - lo que el apunte anuncia ("Las clasificaciones que se estudian son...", "Esta materia se
     divide en...");
   - los títulos y su formato (en un PDF convertido el nivel `#` no sirve, pero sí el estilo:
     negrita subrayada, cursiva, numeración propia I. / 1. / a));
   - los cambios de profesor o de unidad que el apunte marca.
   El resultado puede tener tres, seis o diez partes: las que tenga el apunte.
2. **Partes (`#`)**: las grandes unidades del apunte, en su orden. Cada parte toma un color
   (hay seis pasteles; desde la séptima se repiten). Si el apunte no tiene divisiones de ese
   nivel, las partes pueden ser sus temas principales.
3. **Temas (`##`)** numerados de corrido en todo el documento (1, 2... hasta el final, no se
   reinicia por parte), como en los apuntes ya incorporados.
4. **Niveles siguientes**, tantos como use el apunte: `###` 1.1, `####` a), `#####` i),
   `######` (1). Cada nivel cuelga del inmediatamente superior (un `####` bajo un `##` se
   sube a `###`). Markdown no tiene nivel 7: más abajo, la estructura sigue con etiquetas
   `**Término:**` y listas con término en negrita, que el parser también convierte en tarjetas
   anidadas.
5. **Mover o no mover.** Respeta el orden del apunte. Mueve una sección entera solo si en el
   apunte está claramente fuera de lugar (un encabezado que el PDF puso en el nivel
   equivocado, un tema repetido). Reordenar párrafos dentro de una sección, nunca. Si la
   organización del apunte te parece discutible (p. ej. un tema que en otros apuntes es una
   parte propia), respétala y menciónalo en la entrega como pregunta.
6. Títulos: en minúscula salvo nombres propios ("Características del derecho de dominio", no
   "Características del Derecho de Dominio"); sin dos puntos finales; sin marcadores.
7. Borra encabezados que no son contenido ("Profesor Allende", "Evaluaciones") y encabezados
   falsos que el PDF inventó: un ítem de lista promovido ("ii. Legado de carruaje") vuelve a
   ser viñeta o etiqueta; una frase partida en dos ("¿Qué pasa si uno de tres herederos..." /
   "**decide vender su cuota parte?**") se une.
8. Al final: `python3 renumber.py data/<id>.md`. Inserta encabezados sin número y renumera.
9. Ojo con "Concepto": un subtema **hoja** cuyo título empieza con Concepto, Definición o
   Noción se funde en su padre (su texto pasa a ser la definición del padre) y su número
   desaparece. Si es tema directo de una parte, la parte se queda con ese texto. Está bien
   para textos cortos (Gandarillas lo hace en La copropiedad y La tradición); si el texto es
   largo, ponle otro título ("El dominio en el Código Civil").

### 4. Fragmentar: una idea por tarjeta

Primero genera y mide:

```bash
node scripts/build-data.mjs
node .claude/skills/incorporar-apuntes/scripts/card-stats.mjs gandarillas-vergara <id>
```

Referencia: Gandarillas tiene ~330 caracteres de cuerpo medio por tarjeta y 1 tarjeta sobre
3000. Para bajar las más largas, en este orden:

1. **Etiquetas.** Un párrafo `**Término:** texto` abre una tarjeta hija con todo lo que sigue
   hasta la próxima etiqueta. Úsalas donde el apunte ya marca un subtema en negrita.
2. **`labels.py`**: en listas mezcladas, cada viñeta `- **Término:** ...` pasa a etiqueta.
3. **Preguntas que abren párrafo** en secciones largas (> 1800 caracteres): `¿Pregunta
   concreta? respuesta...` → `**¿Pregunta concreta?** respuesta...`. Solo si la pregunta sirve
   de título fuera de contexto (≥ 4 palabras y ≤ 16): no "¿Cuáles son?", "¿Funciona?",
   "¿Qué es?", "¿Qué prevalece?", "¿Por qué es relevante?".
4. **Subtemas nuevos** (`###`/`####`) donde la sección cambia de tema: "Expropiación",
   "Recurso de protección", "Adquisición / Conservación / Pérdida".
5. Una oración corta en negrita que termina en punto y sigue texto (`**Límite de la
   tradición: los derechos personalísimos.** No pueden...`) también abre tarjeta.

Cuidado:
- Una etiqueta sin texto antes en su sección pasa a ser la **definición** de la sección, no
  una hija. Si eso no corresponde, deja una frase antes o usa un subtema.
- Los párrafos que siguen a una etiqueta quedan en su tarjeta hasta la próxima etiqueta:
  revisa que no se cuelen comentarios que eran de la sección.
- Revisa los títulos sospechosos que lista `card-stats.mjs` (minúscula inicial, "P. ej.",
  "Art." suelto, más de 90 caracteres).
- Si aun así quedan tarjetas largas porque el apunte cita artículos completos, **no los
  saques ni los conviertas en tarjetas por tu cuenta**: pregúntale a la usuaria.

### 5. Citas de artículos

Si el apunte trae citas en texto plano ("art. 565", "arts. 580-581"), úsalo primero:
`python3 link-articles.py data/raw/<id>.md data/<id>.md`, y revisa la lista "sin enlazar" que
imprime. Los artículos de otra norma citados sin nombrarla (el Reglamento del CBR citado como
"art. 52") se protegen con `--skip "(art. 52)"`. Con apuntes ya limpios, los pasos son solo:
`link-articles.py`, `renumber.py`, conectar a la app (paso 7) y verificar (paso 8).


- Todo artículo del Código Civil citado debe ser wiki-link: `[[Código Civil#^art-565|565]]`
  (dentro de tablas, `[[Código Civil#^art-565\|565]]`). Al tocarlo se abre una tarjeta con
  el texto del artículo, sacado de `data/codigo-civil.md`.
- Estilo de Gandarillas (preferido si reescribes el formato de una cita):
  `***art. [[Código Civil#^art-577|577]]***` en el texto y, para citar el texto legal,
  `***Art. [[Código Civil#^art-565|565]]***: *"Los bienes consisten..."*`.
  Estilo de Eyzaguirre (se respeta como vino): `**Art. [[Código Civil#^art-565|565]] CC** “...”`.
  Los dos funcionan.
- Normas que no son del Código (CPR, COT, Reg. CBR, leyes): texto plano, sin enlace
  (`***art. 19 Nº 24 CPR***`). El parser además ignora "art. N" seguido de CPR, Ley, DL, etc.
- Una cita en texto plano sin link ("según el artículo 570") solo se enlaza si ese número
  aparece enlazado en otra parte de los mismos apuntes.
- Si el build avisa de un artículo que no existe en el Código, revisa el número en el original.

### 6. Tablas, casos, notas

- Tablas GFM normales; la tarjeta se ensancha hasta el ancho de la tabla. Una tabla que el PDF
  partió en columnas corridas ("Permite g | anar el | dominio") se reconstruye a mano leyendo
  `data/raw/<id>.md` fila por fila; no inventes texto que no esté ahí.
- Casos: blockquote que empieza con `> **Caso ...**` (una tarjeta por caso, con
  `**Hechos.**`, `**La pregunta.**`, `**La regla.**`, `**Decisión.**`...).
- `==texto==` se muestra resaltado. `[Pendiente]` al comienzo de un título marca un tema sin
  desarrollar.
- Ejemplos: `- Ej: ...` (Gandarillas) o `- P. ej. ...` (Eyzaguirre) como sub-viñeta del
  ítem que ilustran. Los "P. ej." de una lista partida se quedan en la tarjeta del ítem
  anterior.

### 7. Conectar a la app

1. `scripts/build-data.mjs`: agrega `{ id, notes: 'data/<id>.md', title: 'Nombre y Nombre' }`
   a `UNITS`.
2. `src/data/unit.js`: agrega `'<id>': () => import('../generated/<id>.json')` a `UNITS`.
3. `src/data/professors.js`: agrega `route: '#/apuntes/<id>'` a su tarjeta (el `id` ya existe
   ahí; sin `route` la tarjeta dice "Próximamente").
4. `README.md`: tabla de datos, rutas, y una sección corta con lo particular de estos apuntes
   (qué se limpió, qué se movió, qué tablas se rearmaron).
5. **Dos apuntes en la misma página** (dos profesores en una tarjeta del inicio, p. ej.
   Fernández y Fontecilla): en `UNITS` de `build-data.mjs` usa `maps: [{ notes, title }, ...]`
   en vez de `notes`. Cada archivo queda como un mapa propio, con su numeración, en una pestaña
   fija; las referencias cruzadas corren entre ambos (solo títulos de 2 o más palabras que no
   sean genéricos) y al tocar una del otro mapa se cambia de pestaña.
6. `src/generated/` no se versiona; el deploy regenera los JSON (`prebuild`).

### 8. Verificación

1. `node scripts/build-data.mjs` sin avisos. Revisa el esquema final con
   `outline.py data/<id>.md`.
2. Si tocaste `scripts/lib/`, compara los otros mapas con el parser de `HEAD`:
   ```bash
   T=<scratchpad>/old; mkdir -p $T/scripts/lib $T/data
   git show HEAD:scripts/lib/parse-notes.mjs > $T/scripts/lib/parse-notes.mjs
   cp scripts/lib/parse-codigo.mjs $T/scripts/lib/; cp scripts/build-data.mjs $T/scripts/
   cp data/<otro>.md data/codigo-civil.md $T/data/; ln -sfn $PWD/node_modules $T/node_modules
   (cd $T && node scripts/build-data.mjs --notes data/<otro>.md --out o.json --title "<Título>")
   cmp $T/o.json src/generated/<otro>.json && echo IDENTICO
   ```
   Si no sale idéntico, restringe tu cambio para que solo afecte al profesor nuevo.
3. `npx vite build`.
4. Con `npx vite --port 5173 --strictPort` corriendo (en segundo plano):
   `node .claude/skills/incorporar-apuntes/scripts/check-map.mjs <id> "<Nombre>" <scratchpad>`
   y mira las capturas (iPad y teléfono, normal y "Solo títulos"). Los errores de
   certificado de Google Fonts en el sandbox no son de la app.

### 9. Entrega

- Commit en la rama de desarrollo y push a la rama y a `main` (GitHub Pages publica desde
  `main` con Actions; tarda 1 a 2 minutos).
- Mensaje a la usuaria en español neutro, sin emojis ni rayas: qué quedó, cómo se verificó y
  la lista de decisiones de clasificación (cómo se leyeron las divisiones del apunte, secciones
  movidas, tablas rearmadas, criterio de fragmentación), más cualquier pregunta abierta que
  cambie el resultado.
