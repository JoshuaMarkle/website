import { h, icon, clamp } from '../ui/kit.js';
import { Pop } from '../ui/pop.js';
import { Peek, media } from './peek.js';

// The projects: names that jump, glass that shows what it is, and a panel beside it once it is open.
const root = document.documentElement;
let pop, peek, parts, page, stage;
const $ = (s, e = page) => e.querySelector(s), $$ = (s, e = page) => [...e.querySelectorAll(s)];

function build() {
  const { kit } = stage;
  if (!stage.plain) peek = new Peek(stage);
  pop = new Pop(stage, kit.root, { label: 'Project', cls: 'beside', place: 'beside', modal: true, r: 44, pane: { dim: 0.6 } });
  pop.loose = true; // the glass beside it is there to be played with
  const back = h('button', { type: 'button', className: 'round close', aria: { label: 'Back' } }, icon('close'));
  const prev = h('button', { type: 'button', className: 'round step', aria: { label: 'Previous project' } }, icon('left'));
  const next = h('button', { type: 'button', className: 'round step', aria: { label: 'Next project' } }, icon('right'));
  parts = { shot: h('div', { className: 'shot' }), title: h('h2'), text: h('p'), links: h('div', { className: 'links' }), count: h('span', { className: 'count' }) };
  pop.body.append(parts.shot, parts.title, parts.text, h('div', { className: 'bar' }, parts.links, h('div', { className: 'steps' }, prev, next)), back);
  const shield = h('div', { className: 'shield' });
  pop.el.prepend(shield);
  kit.in(kit.over, () => {
    const fs = [back, prev, next].map((b) => kit.fill(b, { r: 'pill', col: [1, 1, 1, 0.13], a: 0 }));
    kit.tick(() => { for (const f of fs) f.a = pop.pane.a * +pop.body.style.opacity || 0; });
  });
  back.addEventListener('click', () => pop.close());
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  pop.el.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
  if (stage.plain) shield.addEventListener('click', () => pop.close());
  else stage.handle(shield, { tap: (on) => { if (!on) pop.close(); } });
  pop.onopen = () => { root.classList.add('quiet'); kit.quiet.to = 0; };
  pop.onclose = () => { root.classList.remove('quiet'); kit.quiet.to = 1; stage.opened = null; stage.keyed = false; parts.shot.was?.pause?.(); };
  addEventListener('resize', place);
  // a preview follows the keyboard as it moves, not focus handed back by a closing panel
  addEventListener('keydown', (e) => { if (!pop.on && /^(Tab|Arrow)/.test(e.key)) stage.keyed = true; }, true);
}

// where the glass goes while its panel is open
function place() {
  if (!pop || stage.plain) return;
  const cw = stage.cw, ch = innerHeight, was = pop.el.hidden;
  if (was) return;
  const w = pop.body.offsetWidth, hh = pop.body.offsetHeight;
  if (cw < 900) { const room = Math.max(120, ch - hh - 24); stage.openBox = { x: cw / 2, y: room * 0.56, s: Math.min(room * 0.78, cw * 0.7) }; }
  else { const room = cw - w - parseFloat(getComputedStyle(pop.el).paddingRight); stage.openBox = { x: room * 0.52, y: ch * 0.51, s: Math.min(ch * 0.66, room * 0.74) }; }
}

function fill(p) {
  const big = media(p, stage.calm, p.shot || p.media);
  if (p.light) big.classList.add('light');
  parts.shot.replaceChildren(big);
  const small = peek?.kids.get(p.id);
  parts.shot.was?.pause?.(); parts.shot.was = big;
  if (big.play) { big.autoplay = true; if (small?.currentTime && !p.shot) big.currentTime = small.currentTime; big.play().catch(() => {}); }
  parts.title.textContent = p.name;
  parts.text.textContent = p.text;
  parts.links.replaceChildren(...p.links.map((l) => h('a', { href: l.href, target: '_blank', rel: 'noopener', textContent: l.label })));
  pop.body.setAttribute('aria-label', p.name);
  pop.body.scrollTop = 0;
}

function open(id, from) {
  const p = stage.projects.find((q) => q.id === id);
  if (!p || pop.on) return;
  fill(p);
  pop.back = $(`.wall [data-open="${id}"]`) || $('.words [data-open]');
  // the view box, if it is out, becomes the panel
  const box = peek?.on && peek.id === id ? peek.el : from;
  pop.open(box);
  place();
  stage.lift?.(id);
  stage.opened = id;
  peek?.drop();
}

function step(d) {
  const L = stage.projects, i = L.findIndex((p) => p.id === stage.opened), p = L[(i + d + L.length) % L.length];
  if (!pop.on || i < 0) return;
  stage.opened = p.id;
  fill(p); place();
  // the page turns to it behind the panel, so Back lands in the right place
  const at = stage.placeOf(p.id), el = $(`.wall [data-open="${p.id}"]`);
  if (at >= 0) stage.goTo(at);
  else if (el) { el.scrollIntoView({ block: 'center', behavior: 'instant' }); }
  pop.back = el || $('.words [data-open]');
  pop.from = pop.back;
}

export function work(st, pg, after) {
  stage = st; page = pg;
  const data = page.querySelector('#projects');
  if (!data) { peek?.drop(); return; }
  stage.projects ||= JSON.parse(data.textContent);
  if (!pop) build(); else pop.close(true);
  for (const b of $$('[data-open]')) {
    b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', () => open(b.dataset.open, b));
  }
  if (stage.plain) return;
  stage.onTap = (id) => open(id, $('.words [data-open]'));

  const names = $$('.names a'), arts = $$('.words article'), btn = $('.words [data-open]'), model = $('[data-model]'), ids = stage.reel.ids;
  names.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    if (a.dataset.go === 'more') $('#more').scrollIntoView({ behavior: stage.calm ? 'instant' : 'smooth', block: 'center' });
    else stage.goTo(+a.dataset.go);
  }));
  // the wall's own arrows
  const tiles = $$('.wall button');
  tiles.forEach((b, i) => b.addEventListener('keydown', (e) => {
    const cols = getComputedStyle($('.wall')).gridTemplateColumns.split(' ').length, d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (!d || !tiles[i + d]) return;
    e.preventDefault(); tiles[i + d].focus();
  }));
  let was = -1, near = false;
  after.push(() => {
    const i = Math.round(stage.reading.p);
    if (i !== was) {
      was = i;
      names.forEach((a, j) => (j === i ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      arts.forEach((a, j) => { a.classList.toggle('on', j === i); a.inert = j !== i; });
      btn.dataset.open = ids[i]; btn.setAttribute('aria-label', `Open ${stage.projects.find((p) => p.id === ids[i]).name}`);
    }
    for (const t of stage.tiles) { const on = t.hov || (t.foc && stage.keyed); if (t.on !== on) { t.on = on; t.btn.classList.toggle('on', on); } }
    // clips come in as their projects do
    if (!near && stage.reel.d !== undefined && Math.abs(stage.reel.d) < 1.2) { near = true; if (matchMedia('(hover: hover)').matches) stage.projects.filter((p) => p.main).forEach((p) => peek.load(p)); }
    const hov = stage.tiles.find((q) => q.hov), key = stage.keyed && document.activeElement?.matches?.('[data-open]:focus-visible') && !pop.on ? document.activeElement : null;
    const on = pop.on || stage.models.dragging ? null : hov ? hov.id : stage.one.over;
    model.style.cursor = stage.models.dragging ? 'grabbing' : stage.one.over ? 'pointer' : '';
    if (on) peek.set(on);
    else if (key) { const s = stage.tiles.find((q) => q.btn === key) || stage.one; peek.set(key.dataset.open, { x: clamp(s.x + s.s * 0.3, 0, stage.cw), y: s.y + s.s * 0.1 }); }
    else peek.set(null);
  });
}
