#!/usr/bin/env python3
"""Project logos: one flat white cutout each, on a 512 square, black behind. Needs shapely.

House rules, so they extrude the same: fill only, every white part at least MIN wide, every cut at
least GAP wide, every corner rounded by the same two radii (out for tips, in for inside corners).
"""
import math, sys
from pathlib import Path
from shapely.geometry import Point, Polygon, LineString, box
from shapely.ops import unary_union as U
from shapely import affinity as A

MIN, GAP, OUT, IN = 34, 24, 15, 9
HERE = Path(__file__).parent
Q = 48
def dot(x, y, r): return Point(x, y).buffer(r, Q)
def rr(x, y, w, h, r=OUT): r = min(r, w / 2, h / 2); return box(x + r, y + r, x + w - r, y + h - r).buffer(r, Q) if w > 2 * r and h > 2 * r else LineString([(x + r, y + r), (x + w - r, y + h - r)]).buffer(r, Q)
def poly(*p): return Polygon(p)
def line(p, w): return LineString(p).buffer(w / 2, Q)
def curve(pts, closed=False, n=24):  # centripetal-ish Catmull-Rom through the points
    P = list(pts); out = []; m = len(P)
    for i in range(m if closed else m - 1):
        g = (lambda k: P[k % m]) if closed else (lambda k: P[max(0, min(m - 1, k))])
        a, b, c, d = g(i - 1), g(i), g(i + 1), g(i + 2)
        for s in range(n):
            t = s / n
            out.append(tuple(.5 * (2 * b[j] + (c[j] - a[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t * t + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t ** 3) for j in range(len(b))))
    if not closed: out.append(tuple(P[-1]))
    return out
def taper(pts):  # (x, y, r) points: a tube whose width changes along it
    c = curve(pts); return U([U([dot(*a), dot(*b)]).convex_hull for a, b in zip(c, c[1:])])
def blob(*p): return Polygon(curve(p, True))
def bspline(p, n=24):  # closed and very smooth; passes near its points, not through them
    m = len(p); o = []
    for i in range(m):
        a, b, c, d = (p[(i + k) % m] for k in range(4))
        for s in range(n):
            t = s / n; w = ((1 - t) ** 3, 3 * t ** 3 - 6 * t * t + 4, -3 * t ** 3 + 3 * t * t + 3 * t + 1, t ** 3)
            o.append(tuple(sum(k * q[j] for k, q in zip(w, (a, b, c, d))) / 6 for j in (0, 1)))
    return Polygon(o)
def soft(g, out=OUT, inn=IN): return g.buffer(-out, Q).buffer(out, Q).buffer(inn, Q).buffer(-inn, Q)
def mid(g):
    a, b, c, d = g.bounds; return A.translate(g, 256 - (a + c) / 2, 256 - (b + d) / 2)

L, ALT = {}, {}
def logo(name, alt=False):
    def deco(f): (ALT if alt else L)[name] = mid(f()); return f
    return deco

@logo('gecko')
def _():
    body = taper([(150, 120, 24), (192, 172, 30), (236, 226, 46), (282, 286, 46), (312, 346, 33), (338, 408, 26), (380, 446, 22), (424, 430, 19), (432, 390, 18), (404, 372, 17)])
    head = taper([(98, 62, 24), (116, 84, 42), (138, 110, 50), (164, 142, 38), (192, 172, 30)])
    def leg(a, b, c, dirs, w=36):
        k = [line(curve([a, b, c]), w)]
        for d in dirs:
            t = math.radians(d); k.append(line([c, (c[0] + 42 * math.cos(t), c[1] + 44 * math.sin(t))], 34))
        return U(k)
    legs = [leg((225, 200), (278, 180), (286, 124), (-140, -90, -40)),
            leg((214, 236), (176, 282), (118, 276), (135, 185, 238)),
            leg((300, 290), (346, 246), (398, 256), (-55, 0, 55)),
            leg((284, 326), (232, 352), (222, 408), (150, 98, 45))]
    return soft(U([body, head, *legs]), 14, 12)

@logo('algotype')
def _():
    l = line([(200, 130), (74, 256), (200, 382)], 66)
    return U([l, A.scale(l, -1, 1, origin=(256, 256))])

def canoe(y=0):
    top = curve([(36, 176), (106, 240), (256, 264), (406, 240), (476, 176)])
    bot = curve([(476, 176), (472, 290), (392, 358), (256, 370), (120, 358), (40, 290), (36, 176)])
    return soft(A.translate(Polygon(top + bot), 0, y))
@logo('jaguar')
def _():  # the paddle in front, blade down in the water
    p = taper([(300, 50, 18), (270, 130, 18), (220, 262, 18), (200, 316, 19), (176, 376, 38), (156, 432, 36)])
    return U([soft(canoe().difference(p.buffer(GAP, Q))), p])

@logo('corne')
def _():  # one half, five columns of the six
    p, w = 82, 58; st = [.34, .1, 0, .12, .24]
    k = [rr(46 + c * p, 60 + (r + s * 1.1) * p, w, w, 16) for c, s in enumerate(st) for r in range(3)]
    th = [A.rotate(rr(x, y, w, h, 16), a) for x, y, h, a in [(212, 342, w, 4), (296, 356, w, 16), (382, 370, 84, 28)]]
    return U(k + th)

@logo('opengym')
def _():
    return U([rr(40, 238, 110, 36, 15), rr(100, 196, 38, 120, 15), rr(162, 62, 78, 388, 20), rr(264, 62, 78, 388, 20), rr(366, 130, 78, 252, 20), rr(420, 238, 54, 36, 15)]).difference(box(138, 0, 162, 512))

@logo('milestone')  # its own mark: driver, belt, wheel
def _():
    head = dot(256, 118, 76)
    torso = Polygon([(130, 226)] + curve([(130, 226), (190, 210), (256, 206), (322, 210), (382, 226)]) + [(462, 372), (430, 450), (82, 450), (50, 372)])
    wheel = dot(256, 450, 84).intersection(box(0, 0, 512, 450)); ring = dot(256, 450, 84 + 40)
    belt = line([(228, 380), (356, 180)], 40)
    return U([head, soft(torso.difference(ring).difference(belt)), soft(wheel)])

@logo('uva-chatbot')
def _():
    dome = dot(256, 236, 186).intersection(box(0, 0, 512, 172)); n, w = 4, 60
    xs = [68 + i * (376 - w) / (n - 1) for i in range(n)]
    return U([soft(dome, 18), rr(46, 196, 420, 50), *[rr(x, 270, w, 128) for x in xs], rr(46, 422, 420, 50)])

@logo('midi2furnace')
def _():
    shell = rr(32, 96, 448, 320, 46); win = line([(176, 220), (336, 220)], 116)
    foot = poly((160, 420), (190, 336), (322, 336), (352, 420))
    return U([soft(shell.difference(U([win, foot.buffer(GAP, Q)]))), soft(foot.intersection(shell)), dot(176, 220, 32), dot(336, 220, 32)])

@logo('fluid-simulation')
def _():  # an open tank, sloshing
    tank = rr(46, 40, 420, 432, 96).difference(U([rr(90, -80, 332, 508, 54), box(0, 0, 512, 160)])); inner = rr(114, 0, 284, 404, 32)
    top = curve([(60, 330), (114, 330), (180, 322), (240, 284), (300, 222), (350, 196), (400, 214), (450, 250)])
    return U([soft(tank, 20), soft(inner.intersection(Polygon(top + [(450, 440), (60, 440)])), 18), dot(186, 214, 38), dot(262, 112, 26)])

@logo('evolution-simulation')
def _():
    b = bspline([(150, 96), (216, 72), (256, 120), (300, 150), (346, 70), (440, 20), (510, 80), (450, 170), (416, 220), (440, 290), (510, 350), (470, 430), (380, 410), (320, 390), (270, 420), (240, 500), (150, 520), (120, 430), (110, 370), (10, 350), (0, 250), (80, 220), (110, 170)])
    return soft(A.scale(b, .94, .94), 24, 24).difference(U([dot(206, 274, 62), dot(330, 232, 25)]))

@logo('drone-ai')
def _():
    c = [(256 + sx * 128, 256 + sy * 128) for sx in (-1, 1) for sy in (-1, 1)]
    arms = U([line([c[0], c[3]], 44), line([c[1], c[2]], 44)])
    rings = U([dot(*p, 86) for p in c]).difference(U([dot(*p, 48) for p in c]))
    arms = arms.difference(U([dot(*p, 60) for p in c]))
    return soft(U([rings, arms, rr(192, 192, 128, 128, 40)]), 14, 26)

@logo('pigedex')
def _():
    body = bspline([(150, 96), (250, 96), (292, 190), (372, 250), (500, 330), (490, 392), (390, 372), (310, 404), (196, 408), (116, 330), (112, 200)])
    head = dot(192, 148, 74); beak = poly((136, 124), (70, 160), (136, 182))
    legs = U([line([(222, 350), (222, 446)], 36), line([(300, 350), (300, 446)], 36)])
    wing = line(curve([(258, 236), (272, 284), (322, 312), (392, 318)]), GAP)
    return soft(U([body, head, beak, legs]), 15, 16).difference(U([dot(178, 136, 18), wing]))

@logo('sandwich')
def _():  # bread, leaf, filling, bread
    top = Polygon(curve([(48, 198), (44, 144), (84, 104), (170, 94), (256, 98), (342, 94), (428, 104), (468, 144), (464, 198)]))
    leaf = line([(54 + x, 258 + 14 * math.sin(x / 404 * math.pi * 6 + .5)) for x in range(0, 405, 4)], 40)
    return U([soft(top), leaf, rr(48, 318, 416, 40, 20), rr(48, 382, 416, 78, 26)])

@logo('dotfiles')
def _():  # ~
    arc = [(104 * math.cos(math.radians(t)), 104 * math.sin(math.radians(t))) for t in range(-172, -47)]
    ex, ey = arc[-1]; return A.rotate(line(arc + [(2 * ex - x, 2 * ey - y) for x, y in reversed(arc)][1:], 92), 20)

def path(g):
    g = g.simplify(.12); parts = getattr(g, 'geoms', [g]); d = ''
    for p in parts:
        for ring in [p.exterior, *p.interiors]:
            d += 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in list(ring.coords)[:-1]) + 'Z'
    return d
def svg(g, bg=True): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{"<path d=%sM0 0H512V512H0Z%s/>" % (chr(34), chr(34)) if bg else ""}<path fill="#fff" fill-rule="evenodd" d="{path(g)}"/></svg>\n'

if __name__ == '__main__':
    for name, g, suf in [(n, g, '') for n, g in L.items()] + [(n, g, '-alt') for n, g in ALT.items()]:
        (HERE / 'svg' / f'{name}{suf}.svg').write_text(svg(g))
        b = g.bounds; thin = g.area - g.buffer(-MIN / 2 + 1, Q).buffer(MIN / 2 - 1, Q).area; cut = g.buffer(GAP / 2 - 2, Q).buffer(-GAP / 2 + 2, Q).area - g.area
        print(f'{name + suf:24s} {b[2]-b[0]:4.0f}x{b[3]-b[1]:<4.0f} ink {g.area/512**2:.2f}  thin {thin/g.area:.3f}  tight {cut/g.area:.3f}  parts {len(getattr(g,"geoms",[g]))}')
