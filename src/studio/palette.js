// ---- a cover's palette: k-means on a thumbnail, biggest cluster first

const SIZE = 64; // px the cover is shrunk to before sampling
const K = 6;
const ROUNDS = 12;

const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export async function palette(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = Object.assign(document.createElement("canvas"), { width: SIZE, height: SIZE });
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, SIZE, SIZE);
  const px = g.getImageData(0, 0, SIZE, SIZE).data;
  const points = [];
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 128) points.push([px[i], px[i + 1], px[i + 2]]);

  // start from points spread through the image, then settle
  let centers = Array.from({ length: K }, (_, k) => points[Math.floor(((k + 0.5) * points.length) / K)]);
  let groups;
  for (let round = 0; round < ROUNDS; round++) {
    groups = centers.map(() => []);
    for (const p of points) {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, k) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bestD) [best, bestD] = [k, d];
      });
      groups[best].push(p);
    }
    centers = groups.map((g, k) =>
      g.length ? [0, 1, 2].map((i) => g.reduce((s, p) => s + p[i], 0) / g.length) : centers[k],
    );
  }
  const seen = new Set();
  return centers
    .map((c, k) => ({ c: hex(c), n: groups[k].length }))
    .sort((a, b) => b.n - a.n)
    .map((x) => x.c)
    .filter((c) => !seen.has(c) && seen.add(c));
}

// wcag contrast between two hex colors
function lum(h) {
  const [r, g, b] = rgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// spine from the main color, ink the most prominent palette color that reads on it (else near-white / near-black)
export function suggest(colors) {
  const spine = colors[0] ?? "#2a2a2a";
  const neutral = ["#f5f1e8", "#111111"].sort((a, b) => contrast(b, spine) - contrast(a, spine))[0];
  return { color: spine, ink: colors.slice(1).find((c) => contrast(c, spine) >= 4.5) ?? neutral };
}
