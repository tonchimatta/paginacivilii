# Formato de los apuntes y cómo lo lee el parser

Referencia para `data/<id>.md`. Todo esto lo implementa `scripts/lib/parse-notes.mjs`; aquí
está descrito desde el lado de quien escribe el markdown. El modelo es
`data/gandarillas-vergara.md`.

## Árbol

```markdown
# I. Las cosas y los bienes            ← parte: tarjeta de color (6 pasteles, uno por parte)
## 1. Objeto del Derecho de Bienes     ← tema (numeración de corrido en todo el archivo)
### 1.1 Qué estudia                     ← subtema
#### a) Elementos                       ← nivel 4
##### i) Sujeto                          ← nivel 5
###### (1) Persona natural              ← nivel 6
```

- Se usan tantos niveles como tenga el apunte (hasta 6, el máximo de markdown). Todos son
  tarjetas "tema"; más abajo siguen las etiquetas y listas.
- Las partes y su cantidad salen de cada apunte; los nombres de arriba son solo el ejemplo
  de Gandarillas.

- La raíz del mapa es sintética: su título es el nombre del profesor (`title` en `UNITS`).
  No pongas un `#` con el nombre del curso.
- Todo encabezado es una tarjeta "tema" (bloque de color, tipo y número), tenga texto o no.
- El número que muestra la tarjeta es el que está al comienzo del título (`I.`, `12.`,
  `12.3`, `b)`, `ii)`, `(3)`): por eso se numera en el markdown (`renumber.py`).
- `[Pendiente]` al inicio del título (después del número) marca un tema sin desarrollar.
- Texto antes del primer encabezado se ignora (el build avisa).
- Subtema hoja titulado "Concepto...", "Definición..." o "Noción..." se funde en su padre y
  pasa a ser su definición.
- Hijo con el mismo título que su padre se funde en el padre. Dos hermanos con el mismo
  título son una tarjeta (si uno es encabezado, sobrevive el encabezado con su número).

## Dentro de una sección: definición e hijas

Cada sección guarda solo su **definición**; lo demás son tarjetas hijas, en este orden de
lectura:

```markdown
## 3. Derechos reales y derechos personales

Texto antes de la primera etiqueta.        ← definición de la tarjeta "3."

**Elementos:**                              ← etiqueta: abre una tarjeta hija "Elementos"
- **Sujeto:** el titular.                   ← lista donde todas las viñetas abren en negrita:
- **Objeto:** la cosa.                         una tarjeta nieta por viñeta
Párrafos, listas y tablas que siguen...     ← van en "Elementos" hasta la próxima etiqueta

**Crítica:** texto...                       ← otra tarjeta hija, "Crítica"

> **Caso Hotel Hanga Roa (Corte Suprema)**  ← todo blockquote es una tarjeta "caso"
> **Hechos.** ...
```

- **Etiqueta** = párrafo que empieza con `**Algo:**`, `**Algo**:`, `**¿Pregunta?**` o una
  oración corta en negrita terminada en punto seguida de más texto
  (`**Límite: los derechos personalísimos.** No pueden...`). No cuentan: `***...***`,
  `**Ej...**`, ni `**Art. 565 CC** “...”` (sin dos puntos).
- Si **no hay texto antes** de la primera etiqueta, esa etiqueta pasa a ser la definición
  (no una hija). Una `**Concepto:**` o `**Definición:**` posterior también se suma a la
  definición.
- Una etiqueta que queda vacía porque su lista se fue a tarjetas hijas se elimina, salvo
  que sea una cita (`**Art. 2312:**`).
- Nota entre paréntesis al final de la etiqueta (`**Bien (art. 565):**`) se muestra aparte
  del título.
- Etiquetas genéricas ("Concepto", "Causales", "Diferencias", "Ej"...) no son destino de
  referencias cruzadas; la lista está en `GENERIC_LABELS`.

## Listas

- Lista con **2 o más viñetas y todas abren con término en negrita** (`- **De goce:** ...`,
  `1. **Simples.** ...`): una tarjeta por viñeta, también en sub-listas.
- Si la tarjeta sigue teniendo más de ~650 caracteres, también se parten sus listas simples:
  una tarjeta por viñeta, con título tomado de lo anterior a los dos puntos o de las primeras
  8 palabras. Por eso conviene que cada viñeta abra con su término.
  - `- P. ej. ...` no se vuelve tarjeta: se agrega a la viñeta anterior. Una lista que empieza
    con "P. ej." no se parte.
- En cada viñeta, el término con que abre se pone en negrita si no lo estaba: lo anterior a
  los dos puntos, una frase corta antes de un paréntesis, o la primera oración si tiene hasta
  10 palabras. Los ejemplos, citas y oraciones largas no se tocan.
- Sub-viñetas con 3 o 4 espacios de sangría.

## Citas de artículos

```markdown
El CC los distingue (***arts. [[Código Civil#^art-1444|1444]] y [[Código Civil#^art-582|582]]***).

***Art. [[Código Civil#^art-565|565]]***: *"Los bienes consisten en cosas corporales o incorporales..."*

| Criterio | Norma |
|---|---|
| Inscripción | ***art. [[Código Civil#^art-686\|686]]*** |      ← en tablas, \| dentro del link
```

- Wiki-link = artículo enlazado (resaltado amarillo; al tocarlo abre el texto del Código).
  También se acepta `[[CC - Código Civil#Artículo 565.|565]]`.
- `art. 570` en texto plano se enlaza solo si ese número aparece enlazado en otra parte de
  los mismos apuntes y no le sigue otra norma (CPR, CPC, Ley, DL, Reglamento, Código de...).
- Solo los artículos citados entran al JSON; `data/codigo-civil.md` trae el texto, incluidos
  los `bis` y los `548-3`.

## Otros

- Tablas GFM; sin scroll: la tarjeta se ensancha.
- `==texto==` → resaltado. `*cursiva*` para latín y citas textuales.
- `---` se ignora.
- Referencias cruzadas automáticas: el título de otra tarjeta que aparece en el texto se
  subraya y lleva a esa tarjeta (primero los títulos más largos; nunca títulos repetidos,
  genéricos, preguntas ni partes de una palabra). Títulos específicos = mejores enlaces.
