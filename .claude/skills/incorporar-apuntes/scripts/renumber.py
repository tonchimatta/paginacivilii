#!/usr/bin/env python3
"""Numera los encabezados como en los demás apuntes y borra la numeración anterior:

    # I. Parte          (romanos)
    ## 1. Tema          (de corrido en todo el documento, no se reinicia por parte)
    ### 1.1 Subtema
    #### a) Apartado
    ##### i) Nivel 5    (romanos en minúscula)
    ###### (1) Nivel 6

Así se pueden insertar o mover encabezados sin número y renumerar al final. Markdown no
tiene nivel 7: más abajo, usa etiquetas (**Término:**) y listas, que también son tarjetas.

Uso: python3 renumber.py <archivo.md>
"""
import re, sys

path = sys.argv[1]
romans = 'I II III IV V VI VII VIII IX X XI XII'.split()
ROMAN_LOW = 'i ii iii iv v vi vii viii ix x xi xii xiii xiv xv xvi xvii xviii xix xx'.split()
part = tema = sub = h4 = h5 = h6 = 0
out = []
for l in open(path, encoding='utf-8').read().split('\n'):
    m = re.match(r'^(#{1,6}) (.*)$', l)
    if not m:
        out.append(l)
        continue
    lvl = len(m.group(1))
    t = re.sub(r'^([IVX]+\.|\d+(\.\d+)*\.?|[a-z]+\)|\(\d+\))\s+', '', m.group(2)).strip()
    t = t[:1].upper() + t[1:]
    if lvl == 1:
        part += 1
        out.append(f'# {romans[part - 1]}. {t}')
    elif lvl == 2:
        tema += 1; sub = h4 = h5 = h6 = 0
        out.append(f'## {tema}. {t}')
    elif lvl == 3:
        sub += 1; h4 = h5 = h6 = 0
        out.append(f'### {tema}.{sub} {t}')
    elif lvl == 4:
        h4 += 1; h5 = h6 = 0
        out.append(f'#### {chr(96 + h4)}) {t}')
    elif lvl == 5:
        h5 += 1; h6 = 0
        out.append(f'##### {ROMAN_LOW[h5 - 1]}) {t}')
    else:
        h6 += 1
        out.append(f'###### ({h6}) {t}')
open(path, 'w', encoding='utf-8').write('\n'.join(out))
print(f'{part} partes, {tema} temas')
