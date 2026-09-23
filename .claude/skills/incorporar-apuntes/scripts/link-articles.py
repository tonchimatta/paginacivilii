#!/usr/bin/env python3
"""Enlaza las citas al Código Civil en un markdown ya ordenado: "art. 565", "arts. 580-581",
"arts. 1813, 1103 y 2339 CC", "artículo 112 del Código Civil" -> [[Código Civil#^art-N|N]].

No enlaza: títulos (líneas #), números tras "N°", "regla" o "inc.", ni artículos de otras
normas: si tras el número (antes del siguiente) aparece CPC, COT, CPR, RCBR, Reglamento,
Ley, Constitución o "Código de ...". Números que el texto atribuye a otra norma sin decirlo
(p. ej. los del Reglamento del CBR citados solo como "art. 52") se excluyen con --skip:
    --skip "arts. 31, 41 y 33" --skip "(art. 52)"   (fragmentos exactos que quedan en texto)

Uso: python3 link-articles.py <entrada.md> <salida.md> [--skip TEXTO ...]
Quita también el front matter YAML y lo anterior al primer "# ".
"""
import re, sys

src, dst = sys.argv[1], sys.argv[2]
skips = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == '--skip']
s = open(src, encoding='utf-8').read()
s = s[s.index('\n# ') + 1:] if not s.startswith('# ') else s
PROT = ''
for k in skips:
    if k not in s:
        sys.exit(f'--skip no aparece: {k!r}')
    s = s.replace(k, k.replace('art', PROT))
OTHER = re.compile(r'^\W{0,3}(?:del?\s+(?:la\s+)?)?(CPC|COT|CPR|RCBR|Reglamento|Ley\b|Constituci|Código (?!Civil))')
CITE = re.compile(r'\b(arts?\.|art[íi]culos?)(\s+)(\d(?:(?!\bart)[^\n()])*?)(?=[():;]|\.\s|\.$|$|\s+\S*\s*\bart)', re.M)
SUB = re.compile(r'(N°|N º|regla|inc\.)\s*$')
n = 0

def link(m):
    global n
    region, out, pos = m.group(3), [], 0
    for d in re.finditer(r'\d+', region):
        before, after = region[max(0, d.start() - 7):d.start()], region[d.end():]
        # this number's own tail: up to the next number that is not a N°/regla/inc. qualifier
        seg = after
        for q in re.finditer(r'\d+', after):
            if not SUB.search(after[:q.start()]) and not re.match(r'\s*[°ºª]', after[q.end():]):
                seg = after[:q.start()]
                break
        if SUB.search(before) or re.match(r'\s*[°ºª]', after) or re.search(OTHER.pattern.replace('^\\W{0,3}', ''), seg):
            continue
        # a number far from the citation start is only a citation if joined by , y - a
        if d.start() and not re.fullmatch(r'[\d\s,y\-–a]*(?:CC)?[\s,y\-–a]*|.*\b(y|,|-|–)\s*', region[:d.start()]):
            continue
        out += [region[pos:d.start()], f'[[Código Civil#^art-{d.group()}|{d.group()}]]']
        pos = d.end()
        n += 1
    return m.group(1) + m.group(2) + ''.join(out) + region[pos:]

lines = [l if l.startswith('#') else CITE.sub(link, l) for l in s.split('\n')]
open(dst, 'w', encoding='utf-8').write('\n'.join(lines).replace(PROT, 'art'))
print('citas enlazadas:', n)
left = sorted(set(re.findall(r'\barts?\.\s+\d[^\n()\]]{0,25}', '\n'.join(l for l in lines if not l.startswith('#')))))
print('sin enlazar (revisar):', *left, sep='\n  ')
