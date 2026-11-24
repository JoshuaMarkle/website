# Pull real data from ../gecko and ../jaguar into the small JSON files the project pages use.
# Run from the repo root: python3 -I src/data/build.py
import json, collections, os

P = "/home/josh/projects"
OUT = f"{P}/joshuamarkle/src/data"
os.makedirs(OUT, exist_ok=True)
r = lambda v, n=2: round(v, n)

# ---------- GECKO ----------
bench = json.load(open(f"{P}/gecko/bench/english-layout-2026-10-24/data.json"))
pick = ["GECKO prose (apos)", "Gallium", "Graphite", "Dhorf", "Hands Down (ref)", "Sturdy",
        "Canary", "Dvorak", "Colemak-DH", "Colemak", "Workman", "QWERTY"]
by = {l["name"]: l for l in bench["layouts"]}
layouts = []
for n in pick:
    l = by[n]
    layouts.append({"name": "GECKO optimum" if n.startswith("GECKO") else n, "chars": l["chars"],
                    "kind": l["kind"], "score": r(l["scores"]["prose"]),
                    "rank": l["robust"]["rank"] if l.get("robust") else None})

# letter and in-word bigram counts from the 90M-word web sample
uni, bi = collections.Counter(), collections.Counter()
with open(f"{P}/gecko/data/corpora/prose-web.words.tsv") as f:
    for line in f:
        if line.startswith("#"):
            continue
        w, c = line.rstrip("\n").split("\t")
        c = int(c)
        w = w.lower()
        for ch in w:
            uni[ch] += c
        for a, b in zip(w, w[1:]):
            bi[a + b] += c
keys = set("abcdefghijklmnopqrstuvwxyz")
uni = {k: v for k, v in uni.items() if k in keys}
tot = sum(uni.values())
bigr = [[k, v] for k, v in bi.most_common() if k[0] in keys and k[1] in keys and k[0] != k[1]][:500]
btot = sum(v for k, v in bi.items() if k[0] in keys and k[1] in keys)
json.dump({"layouts": layouts,
           "freq": {k: r(v / tot, 5) for k, v in sorted(uni.items())},
           "bigrams": [[k, r(v / btot, 6)] for k, v in bigr]},
          open(f"{OUT}/gecko.json", "w"), separators=(",", ":"))

# ---------- JAGUAR ----------
J = f"{P}/jaguar/promo/data"
path = json.load(open(f"{J}/search_path_hulls.json"))

def outline(h):
    xs, hb, z = h["x"], h["half_breadth"], h["z"]
    plan, keel = [], []
    for i, x in enumerate(xs):
        row = hb[i]
        plan.append([r(x, 1), r(max(row), 2)])
        k = next((z[j] for j, v in enumerate(row) if v > 0.05), z[-1])
        keel.append([r(x, 1), r(k, 2)])
    mid = max(range(len(xs)), key=lambda i: max(hb[i]))
    sec = [[r(hb[mid][j], 2), r(z[j], 2)] for j in range(len(z))]
    return {"L": r(h["length"], 1), "T": r(h["draft_design"], 2), "plan": plan, "keel": keel, "section": sec}

inc = []
for s in path["incumbents"]:
    o = outline(s["hull"])
    o.update({"i": s["index"], "phase": s["phase"], "lb": r(s["hull_weight_lb"]),
              "B": r(s["shape"]["beam_in"], 1), "t": s["thickness_in"], "pcf": s["density_pcf"],
              "depth": s["depth_in"]})
    inc.append(o)

def race(fname):
    d = json.load(open(f"{J}/{fname}"))
    courses = {c["name"]: c for c in d["params"]["course"]}
    want = {"slalom_200": None, "sprint_400": None, "endurance_600": None}
    evs = []
    for e in d["events"]:
        if e["course"] in want and want[e["course"]] is None:
            want[e["course"]] = 1
            step = max(1, len(e["path_m"]) // 220)
            sp = e["speed_m"]
            evs.append({"name": e["name"], "course": e["course"], "crew": e["crew_lb"],
                        "time": r(e["time_s"], 1), "dist": r(e["distance_m"], 1),
                        "straight_s": r(e["straight_s"], 1), "turn_s": r(e["turn_s"], 1),
                        "top": r(e["top_mps"]), "mean": r(e["mean_mps"]),
                        "marks": [[m["x_m"], m["y_m"], m["keep"]] for m in courses[e["course"]]["marks"]],
                        "path": [[r(p[0], 2), r(p[1], 2)] for p in e["path_m"][::step]] + [[r(v, 2) for v in e["path_m"][-1]]],
                        "speed": [[r(s[0], 1), r(s[1], 2), r(s[2], 2)] for s in sp[::max(1, len(sp) // 220)]] + [[r(v, 2) for v in sp[-1]]]})
    evs.sort(key=lambda e: list(want).index(e["course"]))
    return {"weighted": r(d["weighted_time_s"], 1), "hull_lb": r(d["hull_lb"]), "events": evs}

json.dump({"shapes": path["shapes_evaluated"], "lhs": path["latin_hypercube_samples"],
           "incumbents": inc, "race": race("race_off1.json")},
          open(f"{OUT}/jaguar.json", "w"), separators=(",", ":"))

for f in os.listdir(OUT):
    print(f, os.path.getsize(f"{OUT}/{f}"))
