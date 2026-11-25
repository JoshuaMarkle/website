// The space bar never moves the page. It still writes a space where there is something to write in, and
// still presses a button that was reached from the keyboard.
let keyed = false;
addEventListener('pointerdown', () => { keyed = false; }, true);
addEventListener('keydown', (e) => {
  if (e.key === 'Tab' || e.key.startsWith('Arrow')) keyed = true;
  if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target.closest?.('input,textarea,select,[contenteditable],video,audio,button,[role=button],summary');
  if (t && (keyed || !t.matches('button,[role=button],summary'))) return;
  e.preventDefault();
}, true);
// a button pressed by hand keeps the focus, and would answer to the key coming up
addEventListener('keyup', (e) => { if (e.key === ' ' && !keyed && e.target.closest?.('button,[role=button],summary')) e.preventDefault(); }, true);
