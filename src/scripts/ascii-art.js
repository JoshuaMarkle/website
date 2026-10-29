// <ascii-art>: plays an ascii piece (the vendored ascii.rest planet, or our ringed planet) into a <pre>
// in the element's colour and font size.
// A trimmed-down version of ascii.rest's mount (text pieces only): runs only while on screen,
// and holds still on one frame under reduced motion. Pieces that export a `sun` light toward the
// cursor (anywhere on the page), trailing it through two lerps so it drifts after the mouse.
import * as planet from "../vendor/ascii/planet.js";
import * as ringed from "./ringed-planet.js";

const pieces = { planet, ringed };

const FOLLOW = 2.6; // per second, each of the two lerps between the cursor and the sun
const unit = (v) => v.map((c) => c / Math.hypot(...v));
const luma = (css) => {
  const [r, g, b] = css.match(/[\d.]+/g).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

class AsciiArt extends HTMLElement {
  #stop = null;

  connectedCallback() {
    const piece = pieces[this.getAttribute("piece")];
    if (!piece) return;
    const { fps } = piece.meta;
    const frame = piece.default();
    const pre = document.createElement("pre");
    pre.setAttribute("role", "img");
    pre.setAttribute("aria-label", piece.meta.name);
    pre.style.cssText =
      'margin:0;font:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;' +
      "line-height:1.2;letter-spacing:0;white-space:pre;font-variant-ligatures:none";
    this.style.display = "block";
    this.replaceChildren(pre);

    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let t = 0;
    // the sun eases toward `aim`, which eases toward the cursor (or back home when it leaves)
    const home = piece.sun;
    let mouse = null;
    let aim = home && [...home];
    let sun = home && [...home];
    const onMove = (e) => (mouse = [e.clientX, e.clientY]);
    const onLeave = () => (mouse = null);
    if (home) {
      addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      addEventListener("blur", onLeave);
    }
    // the cursor's direction from the middle of the art, in half-heights of the art
    const target = () => {
      if (!mouse) return home;
      const r = pre.getBoundingClientRect();
      const u = r.height / 2 || 1;
      return unit([(mouse[0] - r.left - r.width / 2) / u, -(mouse[1] - r.top - r.height / 2) / u, 1]);
    };
    const ease = (from, to, k) => from.map((c, i) => c + (to[i] - c) * k);

    // the piece shades for dark ink on light paper or the reverse, judged from the ink against
    // the nearest opaque background (white if there is none)
    const draw = () => {
      let el = this;
      while (el && /^rgba\(.*, 0\)$|^transparent$/.test(getComputedStyle(el).backgroundColor)) el = el.parentElement;
      const bg = el ? getComputedStyle(el).backgroundColor : "rgb(255, 255, 255)";
      const paper = luma(getComputedStyle(pre).color) < luma(bg);
      pre.textContent = frame(t, { paper, sun });
    };
    draw();

    let raf = 0;
    let last = 0;
    let seen = false;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      if (dt < 1000 / fps - 2) return;
      last = now;
      const s = Math.min(dt, 100) / 1000;
      t += s;
      if (home) {
        const k = 1 - Math.exp(-FOLLOW * s);
        aim = ease(aim, target(), k);
        sun = ease(sun, aim, k);
      }
      draw();
    };
    const run = () => {
      const go = seen && !document.hidden && !still.matches;
      if (go && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!go && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const io = new IntersectionObserver((entries) => {
      seen = entries[entries.length - 1].isIntersecting;
      run();
    });
    io.observe(pre);
    document.addEventListener("visibilitychange", run);
    still.addEventListener("change", run);
    this.#stop = () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      raf = 0;
      document.removeEventListener("visibilitychange", run);
      still.removeEventListener("change", run);
      removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      removeEventListener("blur", onLeave);
    };
  }

  disconnectedCallback() {
    this.#stop?.();
    this.#stop = null;
  }
}

customElements.define("ascii-art", AsciiArt);
