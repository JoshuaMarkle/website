import { h, icon, Spring, clamp } from '../ui/kit.js';
import { Pop } from '../ui/pop.js';

// The list: search and filter live in a bar of glass the titles slide under, and one lens rides
// between the rows.
let pop, state, current;
const TOPICS = [['all', 'All'], ['notes', 'Notes'], ['code', 'Code'], ['hardware', 'Hardware']];

function build(stage) {
  const { kit } = stage;
  state = { topic: 'all', sort: 'new', q: '' };
  pop = new Pop(stage, kit.root, { label: 'Filter posts', cls: 'filter-menu', place: 'above', r: 34, pane: { col: [0, 0, 0, 0.9] } });
  kit.in(kit.over, () => {
    const topic = kit.choice({ name: 'Topic', items: TOPICS.map(([v, label]) => ({ v, label })), get: () => state.topic, set: (v) => { state.topic = v; current?.(); } });
    const sort = kit.choice({ name: 'Order', items: [{ v: 'new', label: 'Newest' }, { v: 'old', label: 'Oldest' }], get: () => state.sort, set: (v) => { state.sort = v; current?.(); } });
    pop.body.append(h('span', { className: 'cap', textContent: 'Topic' }), topic, h('span', { className: 'cap', textContent: 'Order' }), sort);
    const mine = kit.over.panes.filter((p) => pop.body.contains(p.el));
    kit.tick(() => { const a = pop.el.hidden ? 0 : clamp(+pop.body.style.opacity || 0, 0, 1); for (const p of mine) p.a = a; });
  });
}

export function blog(stage, page, after) {
  const { kit } = stage, list = page.querySelector('.posts');
  if (!list) return;
  if (!pop) build(stage); else if (pop.on) pop.close(true);
  const rows = [...list.querySelectorAll('.row')].map((el) => ({ el, link: el.querySelector('a'), on: true, a: new Spring(1, 180, 24), y: new Spring(0, 220, 26), tags: el.dataset.tags.split(' '), t: +el.dataset.date, hay: el.dataset.search.toLowerCase() }));
  for (const r of rows) r.word = kit.label(r.link.querySelector('.in')); // the link itself is left whole, to be pressed
  const bar = page.querySelector('.finder'), inp = bar.querySelector('input'), clr = bar.querySelector('.clr'), fb = bar.querySelector('.filter'), box = bar.querySelector('.field'), none = page.querySelector('.none');
  inp.value = state.q;

  /* the bar: glass over the titles, so it goes on top of them */
  const F = kit.lens(box, { r: 'pill', dim: 1.2, bez: 0.9, dep: 1.1, col: [0, 0, 0, 0.62], stay: true, loud: true });
  const B = kit.lens(fb, { r: 'pill', dim: 1.2, bez: 0.9, dep: 1.1, col: [0, 0, 0, 0.62], stay: true, loud: true });
  fb.pane = B;
  kit.pressable(fb, B);
  const gl = new Spring(0, 240, 26), fi = new Spring(0, 260, 26);
  kit.tick((dt) => {
    const on = document.activeElement === inp;
    gl.to = on ? 1 : 0; gl.step(dt); F.glow = gl.x * 0.4; F.rim = 1 + gl.x * 0.7; kit.mid(F);
    fi.to = state.topic !== 'all' || state.sort !== 'new' ? 1 : 0; fi.step(dt);
    const v = clamp(fi.x, 0, 1);
    B.solid = v; B.col = [v * 0.985, v * 0.985, v, 0.62 + 0.38 * v];
    fb.classList.toggle('on', v > 0.5);
  });

  /* rows fold away and slide */
  const still = stage.calm;
  function apply(quick) {
    const words = state.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let n = 0;
    const before = new Map(rows.map((r) => [r, r.el.offsetTop]));
    const sorted = [...rows].sort((a, b) => (state.sort === 'new' ? b.t - a.t : a.t - b.t));
    for (const r of sorted) {
      r.on = (state.topic === 'all' || r.tags.includes(state.topic)) && words.every((w) => r.hay.includes(w));
      r.el.hidden = !r.on; if (r.on) n++;
      list.append(r.el);
    }
    for (const r of rows) if (r.on) {
      const d = before.get(r) - r.el.offsetTop;
      if (quick || still) { r.y.set(0); r.a.set(1); continue; }
      if (r.was === false) { r.a.set(0); r.y.set(14); } else if (d) { r.y.x += d; }
      r.y.to = 0; r.a.to = 1;
    }
    for (const r of rows) r.was = r.on;
    none.hidden = n > 0;
    clr.hidden = !inp.value;
    list.setAttribute('aria-label', `${n} post${n === 1 ? '' : 's'}`);
    hov = null;
  }
  kit.tick((dt) => {
    for (const r of rows) {
      r.a.step(dt); r.y.step(dt); r.word.a = r.on ? clamp(r.a.x, 0, 1) : 0;
      const T = Math.abs(r.y.x) < 0.05 ? '' : `translateY(${r.y.x.toFixed(2)}px)`;
      if (r.el.style.transform !== T) r.el.style.transform = T;
    }
  });

  /* the lens */
  let hov = null;
  const glide = h('i', { className: 'glide' });
  list.before(glide);
  const L = kit.lens(glide, { r: 30, a: 0, bez: 0.85, dep: 1.15, dim: -1.5, rim: 0.9 });
  const ly = new Spring(0, 300, 25), lh = new Spring(60, 300, 26), la = new Spring(0, 160, 22), sq = new Spring(0, 260, 18);
  for (const r of rows) {
    r.link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hov = r; });
    r.link.addEventListener('focus', () => { if (r.link.matches(':focus-visible')) hov = r; });
    r.link.addEventListener('blur', () => { if (hov === r) hov = null; });
  }
  list.addEventListener('pointerleave', () => { hov = null; });
  kit.tick((dt) => {
    if (hov && !hov.on) hov = null;
    la.to = hov ? 1 : 0; la.step(dt);
    if (hov) {
      const y = hov.el.offsetTop + hov.link.offsetTop, hh = hov.link.offsetHeight;
      if (la.x < 0.03) { ly.set(y); lh.set(hh); } else { ly.to = y; lh.to = hh; }
    }
    ly.step(dt); lh.step(dt);
    sq.to = Math.min(0.12, Math.abs(ly.v) * 0.00007) * kit.give; sq.step(dt);
    glide.style.height = `${lh.x.toFixed(1)}px`;
    glide.style.transform = `translateY(${ly.x.toFixed(2)}px) scale(${(1 - sq.x * 0.5).toFixed(4)},${(1 + sq.x).toFixed(4)})`;
    L.a = clamp(la.x, 0, 1);
  });

  /* typing */
  inp.addEventListener('input', () => { state.q = inp.value; apply(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (inp.value) { e.preventDefault(); inp.value = state.q = ''; apply(); } else inp.blur(); }
    if (e.key === 'Enter') { const r = rows.filter((x) => x.on).sort((a, b) => a.el.offsetTop - b.el.offsetTop)[0]; if (r && state.q.trim()) r.link.click(); }
  });
  clr.addEventListener('click', () => { inp.value = state.q = ''; apply(); inp.focus(); });
  fb.setAttribute('aria-haspopup', 'dialog');
  fb.addEventListener('click', () => pop.toggle(fb));
  const slash = (e) => { if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.target.closest?.('input')) { e.preventDefault(); inp.focus(); } };
  addEventListener('keydown', slash);
  // ride above a phone keyboard
  const vv = window.visualViewport, up = () => bar.style.setProperty('--kb', `${Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop))}px`);
  vv?.addEventListener('resize', up); vv?.addEventListener('scroll', up);
  document.addEventListener('astro:before-swap', () => { removeEventListener('keydown', slash); vv?.removeEventListener('resize', up); vv?.removeEventListener('scroll', up); current = null; }, { once: true });
  current = () => apply();
  apply(true);
  void after; void icon;
}
