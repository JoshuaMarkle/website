// A ringed ascii planet, ported from the kinetic ideas board (vol. 2, "Ringed planet"): a lit sphere
// with drifting cloud bands, a banded ring with a gap that passes in front and behind, wobbles on its
// axis and catches the globe's shadow, and twinkling stars behind it all. The sun can be moved.
export const meta = {
  name: "ringed planet",
  cols: 64,
  rows: 18,
  fps: 20,
};

const RAMP = " .:-=+*#%@";
const R = 6.5; // the globe's radius, in rows
const ASPECT = 0.5; // a cell's width over its height
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const unit = (v) => v.map((c) => c / Math.hypot(...v));

// the resting sun, in picture space (x right, y up, z toward the eye)
export const sun = unit([-0.42, 0.34, 0.84]);

// seeded, so every copy has the same sky
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function ringedPlanet() {
  const { cols, rows } = meta;
  const rand = mulberry32(7);
  const stars = Array.from({ length: Math.round(cols * rows * 0.012) }, () => [(rand() * cols) | 0, (rand() * rows) | 0, rand() * 6]);
  const g = Array.from({ length: rows }, () => Array(cols).fill(" "));

  return (t, { paper = false, sun: L = sun } = {}) => {
    L = unit(L);
    const N = unit([0.18 * Math.sin(t * 0.25), 0.94, 0.32]); // the ring plane's normal, wobbling
    for (const r of g) r.fill(" ");
    for (const [x, y, ph] of stars) g[y][x] = Math.sin(t * 2 + ph * 3) > 0.6 ? "*" : "·";
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = ((i + 0.5 - cols / 2) * ASPECT) / R, y = -(j + 0.5 - rows / 2) / R;
        const r2 = x * x + y * y;
        const zs = r2 < 1 ? Math.sqrt(1 - r2) : null;
        const z0 = -(N[0] * x + N[1] * y) / N[2]; // where this line of sight meets the ring plane
        const rr = Math.sqrt(r2 + z0 * z0);
        let lum = -1;
        if (rr > 1.35 && rr < 2.25 && Math.abs(rr - 1.82) > 0.05 && !(zs != null && z0 < zs)) {
          // the ring, dark where the globe stands between it and the sun
          const pl = x * L[0] + y * L[1] + z0 * L[2];
          const px = x - pl * L[0], py = y - pl * L[1], pz = z0 - pl * L[2];
          const shade = pl < 0 && px * px + py * py + pz * pz < 1 ? 0.1 : 0.75;
          lum = (0.55 + 0.45 * Math.sin(rr * 22)) * shade;
        } else if (zs != null) {
          const lat = Math.asin(clamp(y, -1, 1)), lon = Math.atan2(x, zs) + t * 0.5;
          const tex = 0.12 * Math.sin(lat * 9 + Math.sin(lon * 2) * 0.8) + 0.06 * Math.sin(lon * 5 + lat * 3);
          lum = Math.max(0.1, clamp(Math.max(0, x * L[0] + y * L[1] + zs * L[2]) * 0.95 + 0.05 + tex, 0, 1));
        }
        if (lum < 0) continue;
        const k = Math.min(9, Math.round(lum * 9));
        g[j][i] = RAMP[paper ? 10 - Math.max(1, k) : k]; // on paper, bright is light ink
      }
    }
    return g.map((r) => r.join("")).join("\n");
  };
}
