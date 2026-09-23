#!/usr/bin/env python3
"""Muestra una sección (desde el encabezado que contiene TEXTO hasta el siguiente del mismo
nivel o superior), una línea por párrafo, con número de línea.

Uso: python3 section.py <archivo.md> "TEXTO del encabezado" [ancho=100]
"""
import sys

path, key = sys.argv[1], sys.argv[2]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 100
lines = open(path, encoding='utf-8').read().split('\n')
start = level = None
for i, l in enumerate(lines):
    if start is None:
        if l.startswith('#') and key in l:
            start, level = i, len(l.split(' ')[0])
            print(i + 1, l)
        continue
    if l.startswith('#') and len(l.split(' ')[0]) <= level:
        break
    if l.strip():
        print(i + 1, l[:width])
if start is None:
    sys.exit(f'No hay encabezado con "{key}"')
