import { h, icon, Spring, clamp } from '../ui/kit.js';
import { Pop } from '../ui/pop.js';
import { KNOBS, PALETTES } from './scheme.js';

// Right of the footer: a bead of the gradient you are looking at, to shuffle it, and the sliders behind it.
let pop;
function build(stage) {
  const { kit, scheme } = stage;
  pop = new Pop(stage, kit.root, { label: 'Colours and glass', cls: 'adjust', place: 'above', r: 36, pane: { dim: 0.55 } });
  kit.in(kit.over, () => {
    const sw = h('div', { className: 'swatches', aria: { role: 'radiogroup', label: 'Gradient' } });
    const ids = Object.keys(PALETTES), bs = ids.map((id) => {
      const b = h('button', { type: 'button', className: 'swatch', title: PALETTES[id].name, aria: { role: 'radio', label: PALETTES[id].name } }, h('i'));
      b.addEventListener('click', () => scheme.set('palette', id));
      b.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return; e.preventDefault(); const j = (ids.indexOf(id) + d + ids.length) % ids.length; scheme.set('palette', ids[j]); bs[j].focus();
      });
      sw.append(b);
      return b;
    });
    const sync = () => bs.forEach((b, i) => { const on = ids[i] === scheme.v.palette; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; b.firstChild.style.background = scheme.swatch(ids[i]); });
    const rows = KNOBS.map((q) => {
      const s = kit.slider({ name: q.label, get: () => scheme.v[q.k], set: (v) => scheme.set(q.k, v), min: q.min, max: q.max, step: q.step });
      return h('div', { className: 'krow' }, h('span', { textContent: q.label }), s);
    });
    const reset = h('button', { type: 'button', className: 'reset', textContent: 'Reset' });
    reset.addEventListener('click', () => scheme.reset());
    const rf = kit.fill(reset, { r: 'pill', col: [1, 1, 1, 0.12] });
    pop.body.append(sw, ...rows, reset);
    const mine = kit.over.panes.filter((p) => pop.body.contains(p.el));
    const base = new Map(mine.map((p) => [p, 1]));
    kit.tick(() => {
      const a = pop.el.hidden ? 0 : clamp(+pop.body.style.opacity || 0, 0, 1);
      for (const p of mine) p.a = base.get(p) * a;
      reset.disabled = scheme.home; rf.a *= scheme.home ? 0.45 : 1;
    });
    scheme.fns.push(sync); sync();
  });
}

export function footer(stage, page) {
  const { kit, scheme } = stage, bead = page.querySelector('#bead'), adj = page.querySelector('#adjust');
  if (!bead) return;
  if (!pop) build(stage); else if (pop.on) pop.close(true);
  // the bead, and the sign on it
  const lab = bead.querySelector('.lab'), word = kit.label(lab);
  const b = (stage.bead = { el: bead, s: new Spring(1, 420, 16), spin: new Spring(0, 40, 9), gl: new Spring(0.3, 120, 18), turns: 0, held: false, hov: false });
  bead.addEventListener('pointerenter', () => { b.hov = true; });
  bead.addEventListener('pointerleave', () => { b.hov = false; });
  bead.addEventListener('pointerdown', () => { b.held = true; const up = () => { b.held = false; removeEventListener('pointerup', up); removeEventListener('pointercancel', up); }; addEventListener('pointerup', up); addEventListener('pointercancel', up); });
  bead.addEventListener('click', (e) => {
    scheme.shuffle(); b.turns++;
    const r = bead.getBoundingClientRect();
    kit.burst?.(r.left + r.width / 2, r.top + r.height / 2, 0.9);
    void e;
  });
  // the sliders
  kit.pill(adj);
  adj.setAttribute('aria-haspopup', 'dialog');
  adj.addEventListener('click', () => pop.toggle(adj));
  pop.onopen = () => { document.documentElement.classList.add('adjusting'); kit.quiet.to = 0; stage.hem.open.to = 1; };
  pop.onclose = () => { document.documentElement.classList.remove('adjusting'); kit.quiet.to = 1; stage.hem.open.to = 0; };
  kit.tick(() => {
    if (adj.pane) adj.pane.loud = adj.word.loud = word.loud = !pop.el.hidden;
    const T = `scale(${b.s.x.toFixed(4)})`;
    if (lab.style.transform !== T) lab.style.transform = T;
  });
}
