#!/usr/bin/env python3
"""Aplica reemplazos exactos a un markdown. Cada bloque del archivo de parche es:

<<<
texto viejo (puede ocupar varias líneas)
===
texto nuevo
>>>

Cada texto viejo tiene que aparecer exactamente una vez; si alguno no, no se escribe nada y
se listan los fallidos. Guarda los parches en el scratchpad: son el registro de lo que se
cambió a mano y se pueden volver a aplicar.

Uso: python3 patch.py <archivo.md> <parche.txt>
"""
import re, sys

path, patch = sys.argv[1], sys.argv[2]
s = open(path, encoding='utf-8').read()
blocks = re.findall(r'<<<\n(.*?)\n===\n(.*?)\n?>>>', open(patch, encoding='utf-8').read(), re.S)
bad = 0
for old, new in blocks:
    n = s.count(old)
    if n != 1:
        print(f'aparece {n} veces :: {old[:90]!r}')
        bad += 1
        continue
    s = s.replace(old, new)
if bad:
    sys.exit('No se escribió nada.')
open(path, 'w', encoding='utf-8').write(s)
print(f'ok, {len(blocks)} reemplazos')
