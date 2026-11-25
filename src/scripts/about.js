// The paragraph you are reading comes up to white, all of it together; everything else waits in grey.
export function about(stage, page, after) {
  const el = page.querySelector('[data-liquid]');
  if (!el) return;
  const it = stage.items.find((i) => i.el === el);
  el.addEventListener('pointerdown', () => it?.plate.skip());

  const all = [...page.querySelectorAll('[data-say]')].map((p) => ({ p, box: p.closest('.is') || p }));
  let on = null;
  after.push(() => {
    const H = innerHeight;
    let best = null, bd = 0.42;
    for (const s of all) {
      const b = s.box.getBoundingClientRect();
      // nearest the middle of the screen; the one you are on lets go late
      const d = Math.max(0, Math.abs(b.top + b.height / 2 - H * 0.5) - b.height * 0.2) / H - (s === on ? 0.06 : 0);
      if (d < bd) { bd = d; best = s; }
    }
    if (best === on) return;
    on?.p.classList.remove('lit');
    best?.p.classList.add('lit');
    on = best;
  });
}
