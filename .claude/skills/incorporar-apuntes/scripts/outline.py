#!/usr/bin/env python3
"""Esquema de un markdown de apuntes: cada encabezado con las líneas de contexto.

Uso: python3 outline.py <archivo.md> [--context N]
Sirve para decidir la jerarquía antes de tocar nada, y para revisar el resultado.
"""
import re, sys

path = sys.argv[1]
ctx = int(sys.argv[sys.argv.index('--context') + 1]) if '--context' in sys.argv else 0
lines = open(path, encoding='utf-8').read().split('\n')
for i, l in enumerate(lines):
    if re.match(r'^#{1,6} ', l):
        print(f'{i + 1:>5}: {l}')
        shown = 0
        for j in range(i + 1, len(lines)):
            if shown >= ctx or re.match(r'^#{1,6} ', lines[j]):
                break
            if lines[j].strip():
                print(f'{j + 1:>5}    {lines[j][:110]}')
                shown += 1
