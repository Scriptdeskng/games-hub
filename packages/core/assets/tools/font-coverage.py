#!/usr/bin/env python3
"""Per-language glyph coverage of the shipped fonts.
Usage: python3 -I -m pip install fonttools brotli  (once), then
       python3 -I packages/core/assets/tools/font-coverage.py
Checks each required codepoint set against the display stack (Bungee -> Fallback -> Nunito) and the
UI stack (Nunito -> Fallback). Anything reported under "NOT in any shipped font" renders in the system font.
Exit code 1 if a required set has a hole the fallback should have covered."""
import os, sys
from fontTools.ttLib import TTFont

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
def cmap(n): return set(TTFont(os.path.join(D, n)).getBestCmap())
F = {'Bungee': cmap('bungee-subset.woff2'), 'Nunito': cmap('nunito-subset.woff2'), 'Fallback': cmap('fallback-subset.woff2')}

BASE = set(range(0x20, 0x7F)) | set(map(ord, '’‘“”–—…•₦×'))
MARKS = {0x300, 0x301, 0x304, 0x323}  # grave, acute, macron, dot below (tone and vowel marks)
SETS = {
 'en':  BASE,
 'pcm': BASE | set(map(ord, 'éèêáàóòúùíìñ')),
 'yo':  BASE | set(map(ord, 'ẹọṣẸỌṢàáèéìíòóùúńǹŃǸ')) | MARKS,
 'ig':  BASE | set(map(ord, 'ịọụỊỌỤṅṄàáèéìíòóùúńŃ')) | MARKS | {0x307},
 'ha':  BASE | set(map(ord, 'ɓɗƙƴŋƁƊƘƳŊ’ʼ')) | set(map(ord, 'àáâèéêìíîòóôùúûāēīōū')) | {0x2BC},
}
STACKS = {'display (Bungee > Fallback > Nunito)': ['Bungee', 'Fallback', 'Nunito'], 'ui (Nunito > Fallback)': ['Nunito', 'Fallback']}
bad = 0
for sn, order in STACKS.items():
    print(f'\n== {sn}')
    for lang, need in SETS.items():
        own = need - F[order[0]]  # glyphs the primary face lacks
        missing = sorted(c for c in need if not any(c in F[f] for f in order))
        viafb = sorted(c for c in own if c not in missing)
        show = lambda cs: ''.join(chr(c) if c < 0x300 or c > 0x36F else f'<U+{c:04X}>' for c in cs) or '-'
        print(f'{lang:4} primary lacks: {show(sorted(own))}  | rescued by fallback: {show(viafb)}  | NOT in any shipped font: {show(missing)}')
        bad += len(missing)
sys.exit(1 if bad else 0)
