# Every shape JAGUAR's shape search tried, in the order it tried them, for the hull search replay on the
# JAGUAR page (src/components/project/HullSearch.astro). Reads ../jaguar/promo/data/shape_opt_result.json
# (the `jaguar run examples/shape_opt.toml` result: 508 candidates, 96 Latin-hypercube samples, then
# pattern search) and regenerates each hull with the real `jaguar gen-hull` on the search's own 41 x 21 grid,
# the same way ../jaguar/promo/scripts/export-data.mjs builds the promo's search path.
# Run from the repo root (after `cargo build --release` in ../jaguar): python3 -I src/data/build-jaguar-search.py
import json, os, subprocess, tempfile

P = "/home/josh/projects"
J = f"{P}/jaguar"
BIN = f"{J}/target/release/jaguar"
OUT = f"{P}/joshuamarkle/public/data/jaguar-search.json"
FIELDS = ["length_in", "beam_in", "draft_in", "fore_wp", "section", "fore_rocker", "aft_wp", "aft_rocker",
          "fore_len_frac", "aft_len_frac"]

r = json.load(open(f"{J}/promo/data/shape_opt_result.json"))
cands = r["candidates"]
samples = r["params"]["shape_search"]["samples"]
tmp = tempfile.mkdtemp(prefix="jaguar-search-")

shapes = []
for i, c in enumerate(cands):
    s = c["shape"]
    toml = "\n".join(f"{k} = {s[k]}" for k in FIELDS)
    if s.get("gunwale_radius_in"):
        toml += f"\ngunwale_radius_in = {s['gunwale_radius_in']}"
    t, o = f"{tmp}/opt-{i}.toml", f"{tmp}/opt-{i}.json"
    open(t, "w").write(toml + "\n")
    subprocess.run([BIN, "gen-hull", t, "-o", o, "--stations", "41", "--waterlines", "21", "--name", f"opt-{i}"],
                   cwd=J, check=True, capture_output=True)
    h = json.load(open(o))
    hb, z = h["half_breadth"], h["z"]
    # stations and waterlines are evenly spaced, so a hull is its length, its draft and three outlines:
    # plan (widest half-breadth at each station, 0.1 in), keel (lowest wetted waterline at each station,
    # 0.01 in) and the midship section (half-breadth at each waterline, 0.1 in); every other station/line
    st = range(0, 41, 2)
    plan = [round(max(hb[k]) * 10) for k in st]
    keel = [round(next((z[j] for j, v in enumerate(hb[k]) if v > 0.05), z[-1]) * 100) for k in st]
    mid = max(range(41), key=lambda k: max(hb[k]))
    sec = [round(hb[mid][j] * 10) for j in range(0, 21, 2)]
    v = c.get("verdict") or {}
    shapes.append({
        "lb": round(c["hull_weight_lb"], 2),
        "ok": 1 if c["passes"] else 0,
        "why": None if c["passes"] else (v.get("governing_check") or c.get("error") or "fails"),
        "L": round(h["length"], 1),
        "B": round(s["beam_in"], 1),
        "T": round(h["draft_design"], 2),
        "t": c["thickness_in"],
        "pcf": c["density_pcf"],
        "plan": plan, "keel": keel, "sec": sec,
    })
    if i % 50 == 0:
        print(i, "/", len(cands))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({"source": "jaguar run examples/shape_opt.toml (2026-10-16); hulls from jaguar gen-hull 41x21",
           "lhs": samples, "shapes": shapes}, open(OUT, "w"), separators=(",", ":"))
print("wrote", OUT, os.path.getsize(OUT), "bytes")
