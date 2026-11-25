#!/usr/bin/env python3
"""The site icon: JM in the display face, filled with the Ember gradient. Needs fonttools, rsvg-convert and
ImageMagick, and npm install for the font. Writes favicon.svg, favicon.ico and apple-touch-icon.png to public/."""
import subprocess, tempfile
from pathlib import Path
from fontTools.ttLib import TTFont; from fontTools.pens.svgPathPen import SVGPathPen; from fontTools.pens.boundsPen import BoundsPen; from fontTools.pens.transformPen import TransformPen
ROOT=Path(__file__).parent.parent
f=TTFont(ROOT/'node_modules/@fontsource/special-gothic-expanded-one/files/special-gothic-expanded-one-latin-400-normal.woff'); gs=f.getGlyphSet(); cm=f.getBestCmap()
def icon(text,fit,rad=14,track=-10,maxh=40):
    x=0; parts=[]; B=None
    for ch in text:
        g=gs[cm[ord(ch)]]; bp=BoundsPen(gs); g.draw(bp); b=bp.bounds; parts.append((g,x)); b=(b[0]+x,b[1],b[2]+x,b[3]); B=b if B is None else (min(B[0],b[0]),min(B[1],b[1]),max(B[2],b[2]),max(B[3],b[3])); x+=g.width+track
    k=min(fit/(B[2]-B[0]),maxh/(B[3]-B[1])); ox=32-k*(B[0]+B[2])/2; oy=32+k*(B[1]+B[3])/2; d=''
    for g,gx in parts:
        p=SVGPathPen(gs,ntos=lambda v:f'{v:.2f}'.rstrip('0').rstrip('.')); g.draw(TransformPen(p,(k,0,0,-k,ox+k*gx,oy))); d+=p.getCommands()
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse"><stop stop-color="#7a2cff"/><stop offset=".38" stop-color="#b63db0"/><stop offset=".58" stop-color="#ff2a1a"/><stop offset=".8" stop-color="#ff8d1f"/><stop offset="1" stop-color="#ffe6a3"/></linearGradient></defs><rect width="64" height="64" rx="{rad}"/><path fill="url(#g)" d="{d}"/></svg>\n'
if __name__ == '__main__':
    out = ROOT / 'public'
    (out / 'favicon.svg').write_text(icon('JM', 57))
    def png(svg, size, to): subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), svg, '-o', to], check=True)
    with tempfile.TemporaryDirectory() as t:
        sizes = [f'{t}/{n}.png' for n in (16, 32, 48)]
        for n, p in zip((16, 32, 48), sizes): png(out / 'favicon.svg', n, p)
        subprocess.run(['magick', *sizes, out / 'favicon.ico'], check=True)
        square = f'{t}/square.svg'; open(square, 'w').write(icon('JM', 48, rad=0)) # iOS rounds it itself
        png(square, 180, out / 'apple-touch-icon.png')
