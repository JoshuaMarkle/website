import { h, icon, swap, Spring, clamp } from '../ui/kit.js';

// A post: pictures that are no longer there leave no hole, code can be taken away, and the same lens
// as on the list waits over what comes next.
export function post(stage, page) {
  const prose = page.querySelector('.prose');
  if (!prose) return;
  const { kit } = stage;

  for (const img of page.querySelectorAll('.cover img, .prose img')) {
    const holder = img.closest('.cover') || (img.parentElement !== prose && img.parentElement.children.length === 1 && !img.parentElement.textContent.trim() ? img.parentElement : img);
    const gone = () => holder.remove(), here = () => img.classList.add('in');
    if (img.complete) { if (img.naturalWidth) here(); else gone(); continue; }
    img.addEventListener('load', here, { once: true });
    img.addEventListener('error', gone, { once: true });
  }

  for (const pre of prose.querySelectorAll('pre')) {
    const box = h('div', { className: 'code' });
    if (pre.querySelectorAll('.line').length < 30) pre.removeAttribute('tabindex'); // nothing in it to scroll
    pre.replaceWith(box);
    box.append(pre);
    if (!navigator.clipboard) continue;
    const ic = icon('copy'), b = h('button', { type: 'button', className: 'copy', aria: { label: 'Copy code' } }, ic);
    let t = 0;
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(pre.textContent.replace(/\n$/, '')); } catch { return; }
      swap(ic, 'check'); b.setAttribute('aria-label', 'Copied');
      clearTimeout(t); t = setTimeout(() => { swap(ic, 'copy'); b.setAttribute('aria-label', 'Copy code'); }, 1600);
    });
    box.append(b);
  }

  const next = page.querySelector('.next .row');
  if (!next) return;
  const a = next.querySelector('a'), L = kit.lens(next.querySelector('.glide'), { r: 30, a: 0, bez: 0.85, dep: 1.15, dim: -1.5, rim: 0.9 }), on = new Spring(0, 160, 22);
  kit.label(a.querySelector('.in'));
  let hov = false;
  a.addEventListener('pointerenter', (e) => { hov = e.pointerType === 'mouse'; });
  a.addEventListener('pointerleave', () => { hov = false; });
  a.addEventListener('focus', () => { hov = a.matches(':focus-visible'); });
  a.addEventListener('blur', () => { hov = false; });
  kit.tick((dt) => { on.to = hov ? 1 : 0; on.step(dt); L.a = clamp(on.x, 0, 1); });
}
