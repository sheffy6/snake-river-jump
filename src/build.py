"""Pack the art and the two source files into one playable index.html at the repo root.

Run from anywhere:  python3 src/build.py   (needs Pillow)
"""
import base64, io, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); ART = os.path.join(ROOT, 'art')

def b64(path, maxw=None):
    im = Image.open(path).convert('RGBA')
    if maxw and im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

A = {
    'bg1': 'canyon/bg_1.png', 'bg2': 'canyon/bg_2.png', 'bg3': 'canyon/bg_3.png', 'bg4': 'canyon/bg_4.png',
    'bg5': 'canyon/bg_5.png', 'bg6': 'canyon/bg_6.png', 'bg7': 'canyon/bg_7_flat.png', 'bg8': 'canyon/bg_8_flat.png',
    'rep1': 'canyon/repeat1_flat.png', 'rep2': 'canyon/repeat2_flat.png', 'rep3': 'canyon/repeat3_flat.png', 'rep4': 'canyon/repeat4_flat.png',
    'sign': 'canyon/sign.png', 'bike': 'scooter/bike.png', 'rider': 'scooter/rider.png', 'bwheel': 'scooter/backwheel.png', 'fwheel': 'scooter/frontwheel.png',
    'frame': 'launcher/meterframe.png', 'red': 'launcher/red_squares.png',
}
js = 'const ART = {\n' + ',\n'.join('  %s: "%s"' % (k, b64(os.path.join(ART, v))) for k, v in A.items())
js += ',\n  icon: "%s"\n};\n' % b64(os.path.join(ART, 'icon.png'), 260)
core = open(os.path.join(HERE, 'core.js')).read().replace("if (typeof module !== 'undefined') module.exports = SRJ;", '')
body = open(os.path.join(HERE, 'page.html')).read().replace('/*__ART__*/', js).replace('/*__CORE__*/', core)
HEAD = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
open(os.path.join(ROOT, 'index.html'), 'w').write(HEAD + body + '</body></html>')
print('built index.html', round(len(body) / 1e6, 2), 'MB')
