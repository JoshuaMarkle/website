import './space.js';
import { navigate } from 'astro:transitions/client';
import { Stage } from './stage.js';
import { Scheme } from './scheme.js';
import { Kit, Spring, clamp } from '../ui/kit.js';
import { work } from './work.js';
import { about } from './about.js';
import { blog } from './blog.js';
import { post } from './post.js';
import { board } from './board.js';
import { footer } from './footer.js';

const root = document.documentElement, $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => [...e.querySelectorAll(s)];
const calm = (matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('calm'));
const tabOf = (p) => (p.startsWith('/about') ? 0 : p.startsWith('/blog') ? 2 : p === '/' ? 1 : -1);
let stage, want = tabOf(location.pathname), mounted = null, after = [];

// No WebGL: the same page and the same controls, drawn with CSS.
class Plain {
  constructor(over) {
    this.plain = true; this.scheme = new Scheme(); this.calm = calm; this.shows = []; this.items = [];
    this.kit = new Kit({ root: over, calm, burst() {} });
    this.kit.k = 1; this.kit.ch = innerHeight; this.hem = { open: new Spring() }; this.models = {};
    let prev = performance.now();
    const f = (t) => { requestAnimationFrame(f); const dt = Math.min(0.04, (t - prev) / 1000); prev = t; this.scheme.update(dt); this.kit.frame(dt, this.scheme.glass, t / 1000); this.after?.(dt); };
    requestAnimationFrame(f);
  }
  mount() { this.kit.reset(); } unmount() { this.kit.reset(); } start() {} layout() {}
}

function nav() {
  const el = $('#nav'), row = $('.items', el), items = $$('a', el);
  stage.kit.in(stage.kit.chrome, () => stage.kit.tabs(el, row, items, {
    get: () => want,
    pick: (i) => { want = i; navigate(items[i].getAttribute('href')); },
  }));
  items.forEach((a, i) => a.addEventListener('click', () => { want = i; }));
}

function mount() {
  const page = $('#page');
  if (!stage || !page || mounted === page) return;
  mounted = page;
  want = tabOf(location.pathname);
  $$('#nav a').forEach((a, i) => (i === want ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  root.classList.add(stage.plain ? 'nogl' : 'gl');
  root.classList.remove('locked', 'quiet');
  after = [];
  stage.kit.quiet.to = 1;
  stage.mount(page);
  stage.kit.in(stage.kit.page, () => {
    for (const el of $$('[data-pill]', page)) stage.kit.pill(el, 'stay' in el.dataset ? { stay: true, label: false } : {});
    footer(stage, page);
    work(stage, page, after);
    about(stage, page, after);
    board(stage, page, after);
    blog(stage, page, after);
    post(stage, page);
  });
  topFade(page);
  stage.kit.stale = true;
  requestAnimationFrame(() => page.classList.add('here'));
}

// text gives way before it reaches the glass at the top
function topFade(page) {
  const near = new Set(), els = $$('[data-fade], .prose > *', page);
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) near.add(e.target); else { near.delete(e.target); e.target.style.maskImage = ''; } }), { rootMargin: '0px 0px -80% 0px' });
  els.forEach((e) => io.observe(e));
  const bar = $('#nav').getBoundingClientRect();
  stage.kit.top = [bar.bottom - 6, bar.bottom + 44];
  const [a, b] = stage.kit.top;
  after.push(() => {
    for (const e of near) {
      if (!e.isConnected) { near.delete(e); continue; }
      const t = e.getBoundingClientRect().top;
      e.style.maskImage = t > b ? '' : `linear-gradient(transparent ${(a - t).toFixed(1)}px, #000 ${(b - t).toFixed(1)}px)`;
    }
  });
  document.addEventListener('astro:before-swap', () => io.disconnect(), { once: true });
}

async function boot() {
  const canvas = $('#gl'), over = $('#over');
  try { if (new URLSearchParams(location.search).has('plain')) throw new Error('asked for'); stage = new Stage(canvas, over); } catch (e) { console.warn('Drawing without WebGL:', e.message); canvas.hidden = true; stage = new Plain(over); }
  stage.after = (dt) => { for (const f of after) f(dt); };
  nav();
  mount();
  await stage.start();
  stage.fontsIn = true;
  stage.layout(); stage.kit.stale = true;
  document.fonts.ready.then(() => { stage.layout(); stage.kit.stale = true; });
  if (import.meta.env.DEV) window.__site = stage;
}

// pages change under one canvas: the words go first, the light follows
document.addEventListener('astro:before-preparation', (e) => {
  want = tabOf(e.to.pathname);
  const load = e.loader;
  e.loader = async () => { $('#page')?.classList.add('gone'); for (const it of stage?.items || []) it.ready = false; await Promise.all([load(), new Promise((r) => setTimeout(r, calm ? 0 : 200))]); };
});
document.addEventListener('astro:before-swap', (e) => {
  for (const c of ['gl', 'nogl']) if (root.classList.contains(c)) e.newDocument.documentElement.classList.add(c);
  stage?.unmount(); mounted = null;
});
document.addEventListener('astro:page-load', mount);
boot();

void clamp;
