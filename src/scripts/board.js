import { LABELS, keyOfChar, keyOfCode } from '../gl/keyboard.js';

// The keyboard at the end of About. What you type goes down on the glass keys and across the screen. Once
// all of it can be seen it asks you to, by typing that itself.
const ASK = 'Type something';

export function board(stage, page, after) {
  const bd = stage.board;
  if (!bd || !page.contains(bd.el)) return;
  const it = stage.items.find((i) => i.role === 'type'), down = new Map();

  const put = (ch, wait) => {
    const x = it.plate.type(ch, wait);
    if (x === null || !it.unit) return;
    const b = it.el.getBoundingClientRect();
    stage.fluid.burst((b.left + b.width / 2 + x * it.unit) / stage.ch, 1 - (b.top + b.height / 2) / stage.ch, 0.16 * stage.kit.give);
  };
  /* asking: once each time you come to it, and no longer once your hands are on the keys */
  const ask = { todo: null, at: 0, wait: 0, done: false };
  const yours = () => { if (ask.todo) { ask.todo = null; it.plate.fresh(); } ask.done = true; };
  // every letter and when it goes down, as a hand would: not quite even, and a breath between the words
  const script = () => {
    const out = [];
    let t = 0, x = 0;
    ASK.split(' ').forEach((w, n) => {
      const wide = it.plate.span(w);
      if (n) {
        if (x + it.plate.span(' ') + wide > it.plate.bw) { t += 0.75; out.push({ t, ch: 'fresh' }); x = 0; } else { out.push({ t, ch: ' ' }); x += it.plate.span(' '); t += 0.09; }
      }
      [...w].forEach((ch, i) => { out.push({ t, ch }); t += 0.085 + 0.035 * Math.sin(i * 2.7 + n * 1.9); });
      x += wide;
    });
    // none of them goes before the last is down, and then they go in order; a line that gives way to another need not wait
    for (const s of out) s.wait = 0.75 * (t - s.t);
    return out;
  };
  after.push((dt) => {
    const b = bd.b;
    if (!bd.kb || !b) return;
    if (bd.seen < 0.05) { if (ask.todo) it.plate.fresh(); Object.assign(ask, { todo: null, wait: 0, done: false }); return; }
    if (ask.todo) {
      ask.at += dt;
      while (ask.todo.length && ask.todo[0].t <= ask.at) {
        const s = ask.todo.shift();
        if (s.ch === 'fresh') { it.plate.fresh(); continue; }
        bd.kb.corne.tap(keyOfChar(s.ch)); bd.kb.flash = Math.max(bd.kb.flash, 0.22);
        put(s.ch, s.wait);
      }
      if (!ask.todo.length) ask.todo = null;
      return;
    }
    if (ask.done) return;
    // the whole of it, and it has stopped moving for a moment
    const whole = b.top >= 0 && b.bottom <= stage.ch + 2 && bd.a.x > 0.6;
    ask.wait = whole ? ask.wait + dt : 0;
    if (ask.wait > 0.4 && it.plate.w) { ask.done = true; ask.todo = script(); ask.at = 0; }
  });

  // a key pressed on the glass itself
  bd.tap = (i) => {
    const l = LABELS[i];
    yours();
    bd.kb.corne.tap(i); bd.kb.flash = Math.max(bd.kb.flash, 0.3);
    if (l === 'space') put(' '); else if (l === 'Bksp') it.plate.back(); else if (l.length === 1) put(l);
  };

  const mine = (e) => bd.kb && bd.seen > 0.5 && !e.isComposing && !e.target.closest?.('input,textarea,[contenteditable],.pop');
  const press = (e) => {
    const alt = e.getModifierState?.('AltGraph');
    if (!mine(e) || ((e.ctrlKey || e.metaKey || e.altKey) && !alt && e.key.length === 1)) return;
    const letter = e.key.length === 1;
    if (letter && e.key !== ' ') e.preventDefault(); // quick find, and the like
    if (letter || e.key === 'Backspace') yours();
    if (e.key === 'Backspace') it.plate.back();
    if (e.repeat) return;
    // the key that says what was typed, whatever the layout; failing that, the one in the same place
    let k = letter ? keyOfChar(e.key) : -1;
    if (k < 0) k = keyOfCode(e.code);
    if (k >= 0) { bd.kb.corne.down(k); down.set(e.code, k); bd.kb.flash = Math.max(bd.kb.flash, 0.22); }
    if (letter) put(e.key);
  };
  const lift = (e) => { if (down.has(e.code)) { bd.kb?.corne.up(down.get(e.code)); down.delete(e.code); } };
  const drop = () => { bd.kb?.corne.release(); down.clear(); };
  addEventListener('keydown', press); addEventListener('keyup', lift); addEventListener('blur', drop);
  document.addEventListener('astro:before-swap', () => { drop(); removeEventListener('keydown', press); removeEventListener('keyup', lift); removeEventListener('blur', drop); }, { once: true });
}
