#!/usr/bin/env python3
"""Extract one illustration per race from the Races PDF into public/img/races/<id>.jpg.

Usage: python3 scripts/extract_race_images.py path/to/Races.pdf   (needs poppler-utils + Pillow)
"""
import sys, os, glob, subprocess, tempfile, pathlib
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
PDF = sys.argv[1]
TMP = tempfile.mkdtemp()
os.chdir(TMP)
os.makedirs('img')
subprocess.run(['pdfimages', '-f', '11', '-l', '94', '-png', '-p', PDF, 'img/r'], check=True)
open('imglist.txt', 'w').write('\n'.join(' '.join(l.split()[:5]) for l in subprocess.run(['pdfimages', '-f', '11', '-l', '94', '-list', PDF], capture_output=True, text=True).stdout.splitlines()[2:]))
ns = {'__file__': str(HERE / 'build_races.py')}
src = open(ns['__file__']).read()
exec(src.split('# ---------------------------------------------------------------- parsing')[0], ns)
L = [l.split() for l in open('imglist.txt') if l.strip()]
info = {int(n): (int(p), t, int(w), int(h)) for p, n, t, w, h in L}
OVR = {'dragonborn': 12, 'dhampir': 112}
CROP = {'plasmoid': (0.55, 0, 1, 1), 'dhampir': (0.47, 0.02, 1, 0.98)}
out = str(HERE.parent / 'public/img/races'); os.makedirs(out, exist_ok=True)
def f(n): return glob.glob(f'img/r-{info[n][0]:03d}-{n:03d}.png')[0]
for rid, name, dp, tp, _ in ns['RACES']:
    pages = set(dp + tp)
    cands = [n for n, (p, t, w, h) in info.items() if p in pages and t == 'image']
    n = OVR.get(rid) or max(cands, key=lambda n: info[n][2] * info[n][3])
    im = Image.open(f(n)).convert('RGB')
    m = info.get(n + 1)
    if m and m[1] == 'smask':
        mask = Image.open(f(n + 1)).convert('L').resize(im.size)
        bg = Image.new('RGB', im.size, (37, 30, 25)); bg.paste(im, mask=mask); im = bg
    if rid in CROP:
        x0, y0, x1, y1 = CROP[rid]; W, H = im.size; im = im.crop((int(x0*W), int(y0*H), int(x1*W), int(y1*H)))
    im.thumbnail((560, 720))
    im.save(f'{out}/{rid}.jpg', quality=80, optimize=True)
