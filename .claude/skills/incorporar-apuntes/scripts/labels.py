#!/usr/bin/env python3
"""Fragmenta más: en listas mezcladas (algunas viñetas abren con un término en negrita y otras
no, o una sola viñeta con negrita), cada viñeta "- **Término:** texto" pasa a ser el párrafo
etiqueta "**Término:** texto" y sus sub-viñetas quedan como lista debajo. El parser convierte
cada etiqueta en una tarjeta hija. Las listas donde TODAS las viñetas (2 o más) abren con
término en negrita no se tocan: el parser ya hace una tarjeta por ítem.

Ojo: si la etiqueta queda al comienzo de una sección sin texto antes, el parser la toma como
definición de la sección, no como hija. Revisa con section.py.

Uso: python3 labels.py <archivo.md>
"""
import re, sys

path = sys.argv[1]
LAB = re.compile(r'^- (\*\*[^*]+?(?::\*\*|\*\*:|\?\*\*)\s*.*)$')
out, conv = [], 0
for b in open(path, encoding='utf-8').read().split('\n\n'):
    lines = b.split('\n')
    if not lines[0].startswith('- ') or any(not re.match(r'^(\s*- |\s*\d+\. )', l) for l in lines):
        out.append(b)
        continue
    tops = [l for l in lines if l.startswith('- ')]
    if (len(tops) >= 2 and all(LAB.match(l) for l in tops)) or not any(LAB.match(l) for l in tops):
        out.append(b)
        continue
    chunks, cur = [], None
    for l in lines:
        m = LAB.match(l)
        if m:
            if cur:
                chunks.append(cur)
            cur = {'para': m.group(1), 'list': []}
            conv += 1
        else:
            if cur is None:
                cur = {'para': None, 'list': []}
            keep = l.startswith('- ') or cur['para'] is None
            cur['list'].append(l if keep else (l[3:] if l.startswith('   ') else l))
    chunks.append(cur)
    parts = []
    for c in chunks:
        if c['para']:
            parts.append(c['para'])
        if c['list']:
            parts.append('\n'.join(c['list']))
    out.append('\n\n'.join(parts))
open(path, 'w', encoding='utf-8').write('\n\n'.join(out))
print('viñetas convertidas en etiquetas:', conv)
