  // ---- order: name glitches in → nav glitches in → tags glitch in → entries fade in with their dates glitching

  import { onLeave, arrivedAtTop } from "./handoff.js";

  // glitch (same as site)
  const START_DELAY = 250; // pause before the nav comes in
  const STAGGER = 120; // gap between items coming in
  const GLITCH_MS = 450; // how long each item scrambles before it settles
  const GLITCH_FRAME = 100; // ms between glyph swaps
  const GLYPHS = "█▓▒░▚▞▙▟▛▜■□▪◆◇◊¤§¶#%&@∆Ø╳╱╲┼╬▲▼◐◑⌘∑";

  // dock (as site, plus the tags docking under the nav)
  const DOCK_MS = 900; // the whole flight, once triggered
  const DOCK_AT = 60; // scrolling down past this px sends the nav to the dock
  const UNDOCK_AT = 30; // scrolling back up above this px sends it home
  const MAX_DOCK_STAGGER = 0.09; // per-item delay, as a fraction of the flight (less with many tags)
  const MARKER_GAP = 10; // px between the glyph and the item it points at

  // filtering
  const FADE_MS = 300; // leaving entries fade out (same as the .entry transition)
  const MOVE_MS = 450; // staying entries slide to their new spots
  const ENTER_STAGGER = 60; // gap between entries coming back in

  const MONTHS = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ");

  const reduceMotion = matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const root = document.documentElement;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

  // split text into per-char spans that can be glitched in ("\n" breaks the line)
  function chars(el, text) {
    el.textContent = "";
    el.setAttribute("aria-label", text.replace("\n", " "));
    for (const c of text) {
      if (c === "\n") {
        el.appendChild(document.createElement("br"));
        continue;
      }
      const s = document.createElement("span");
      s.className = "ch hidden";
      s.textContent = c;
      el.appendChild(s);
    }
  }

  // every char scrambles, then they lock in left to right over GLITCH_MS
  function glitch(el, ms = GLITCH_MS) {
    const cs = [...el.querySelectorAll(".ch")];
    const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0;
      cs.forEach((s, k) => {
        const settleAt = ms * (0.4 + (0.6 * (k + 1)) / cs.length);
        if (t >= settleAt) {
          s.className = "ch";
        } else {
          s.className = "ch scramble";
          s.dataset.g = rand();
        }
      });
      if (t < ms) setTimeout(tick, GLITCH_FRAME);
    };
    tick();
  }

  // ---------------------------------------------------------------- entries + tags

  const main = document.querySelector("main");
  const entries = [...document.querySelectorAll(".entry")];
  const tagsOf = new Map(entries.map((e) => [e, e.dataset.tags.split(" ")]));

  // every tag, most used first
  const counts = new Map();
  for (const ts of tagsOf.values())
    for (const t of ts) counts.set(t, (counts.get(t) || 0) + 1);
  const tags = [...counts.keys()].sort(
    (a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b),
  );

  const dateText = (e) => {
    const [y, m, d] = e.dataset.date.split("-");
    return `${+d} ${MONTHS[m - 1]} ${y}`;
  };

  // the date beside each entry (fixed, rides like site's project names), and an inline
  // copy for narrow screens; each entry gets its tag buttons
  const dates = entries.map((e) => {
    const h = document.createElement("h2");
    h.className = "side-title";
    const d = document.createElement("span");
    const min = document.createElement("span");
    min.className = "min";
    chars(d, dateText(e));
    chars(min, `${e.dataset.min} MIN`);
    h.append(d, document.createElement("br"), min);
    h.setAttribute("aria-hidden", "true");
    document.body.appendChild(h);

    const when = document.createElement("p");
    when.className = "when";
    when.textContent = `${dateText(e)} · ${e.dataset.min} MIN`;
    e.prepend(when);

    const row = document.createElement("div");
    row.className = "tags";
    for (const t of tagsOf.get(e)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tag-item";
      b.dataset.tag = t;
      b.textContent = t.toUpperCase();
      row.append(b);
    }
    e.append(row);
    return h;
  });

  // header slots (hidden, measured) and their flying copies: nav first, then ALL + tags
  const navSlots = [...document.querySelectorAll("nav a")];
  const tagRow = document.querySelector(".tag-row");
  const tagSlots = ["all", ...tags].map((t) => {
    const s = document.createElement("span");
    s.className = "tag-item";
    s.innerHTML = `<span>${t.toUpperCase()}</span><span class="count">${t === "all" ? entries.length : counts.get(t)}</span>`;
    tagRow.append(s);
    return s;
  });
  const slots = [...navSlots, ...tagSlots];

  // the name at the top glitches in line by line too, unless we came from a page left at the
  // top: then it and the nav are already where they were, so they just appear
  const quiet = arrivedAtTop();
  const nameLines = [...document.querySelectorAll("h1 span")];
  for (const l of nameLines) chars(l, l.textContent);
  if (quiet)
    for (const l of nameLines)
      for (const c of l.querySelectorAll(".ch")) c.className = "ch";

  const flies = navSlots.map((s) => {
    const a = document.createElement("a");
    a.className = "fly nav";
    a.href =
      { BLOG: "#", ABOUT: "/about/", PROJECTS: "/", LIBRARY: "/library/", RESUME: "/JoshuaMarkleResume.pdf" }[
        s.textContent
      ] ?? "/";
    if (s.textContent === "RESUME") a.target = "_blank";
    if (s.hasAttribute("aria-current")) a.setAttribute("aria-current", "page");
    chars(a, s.textContent);
    document.body.appendChild(a);
    return a;
  });
  const blogFly = flies[navSlots.findIndex((s) => s.textContent === "BLOG")];
  blogFly.addEventListener("click", (e) => {
    e.preventDefault();
    scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
  const tagFlies = ["all", ...tags].map((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "fly tag-item";
    b.dataset.tag = t;
    const label = document.createElement("span");
    const count = document.createElement("span");
    count.className = "count";
    chars(label, t.toUpperCase());
    chars(count, String(t === "all" ? entries.length : counts.get(t)));
    b.append(label, count);
    b.setAttribute("aria-label", `${t} (${count.textContent})`);
    document.body.appendChild(b);
    return b;
  });
  flies.push(...tagFlies);
  const navCount = navSlots.length;

  const marker = document.createElement("div");
  marker.className = "marker";
  marker.innerHTML = "<span>→</span>";
  document.body.appendChild(marker);

  // ---------------------------------------------------------------- filter

  // selected tags live in the hash (#code+art) so a filter can be shared;
  // an entry shows if it has any of them, everything shows with none
  const selected = new Set(
    decodeURIComponent(location.hash.slice(1))
      .split("+")
      .filter((t) => counts.has(t)),
  );
  const wanted = (e) =>
    !selected.size || tagsOf.get(e).some((t) => selected.has(t));

  function paintTags() {
    for (const b of document.querySelectorAll("[data-tag]")) {
      const t = b.dataset.tag;
      const on = t === "all" ? !selected.size : selected.has(t);
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
    }
    const hash = [...selected].join("+");
    history.replaceState(null, "", hash ? "#" + hash : location.pathname);
  }

  function setHidden(i, hide) {
    entries[i].hidden = hide;
    dates[i].hidden = hide;
  }

  function show(i, on) {
    entries[i].classList.toggle("on", on);
    dates[i].classList.toggle("on", on);
  }

  // leaving entries fade out, then the rest slide (FLIP) to where they now sit,
  // then the ones coming back fade in one after another, their dates glitching
  let filterRun = 0;
  async function applyFilter() {
    const run = ++filterRun;
    paintTags();
    const want = entries.map(wanted);
    if (reduceMotion) {
      entries.forEach((e, i) => {
        setHidden(i, !want[i]);
        show(i, want[i]);
      });
      return render();
    }

    const leaving = entries.filter((e, i) => !e.hidden && !want[i]);
    leaving.forEach((e) => show(entries.indexOf(e), false));
    if (leaving.length) await wait(FADE_MS);
    if (run !== filterRun) return;

    const staying = entries.filter(
      (e, i) => want[i] && !e.hidden && e.classList.contains("on"),
    );
    const before = new Map(
      staying.map((e) => [e, e.getBoundingClientRect().top]),
    );
    entries.forEach((e, i) => setHidden(i, !want[i]));
    measure(); // dates that were hidden had no width to place them by
    for (const e of staying) {
      const dy = before.get(e) - e.getBoundingClientRect().top;
      if (dy)
        e.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
          { duration: MOVE_MS, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
        );
    }
    settleFor(MOVE_MS);

    const entering = entries.filter(
      (e, i) => want[i] && !staying.includes(e),
    );
    entering.forEach((e, k) =>
      setTimeout(() => {
        if (run !== filterRun) return;
        const i = entries.indexOf(e);
        show(i, true);
        glitch(dates[i]);
      }, (staying.length ? MOVE_MS * 0.5 : 0) + k * ENTER_STAGGER),
    );
  }

  function toggleTag(t) {
    if (t === "all") selected.clear();
    else if (selected.has(t)) selected.delete(t);
    else selected.add(t);
    applyFilter();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tag]");
    if (b) toggleTag(b.dataset.tag);
  });

  // ---------------------------------------------------------------- dock

  let starts = [];
  let ends = [];
  let pos = [];
  let roomy = false; // room beside the content for the dock and the dates
  let dockTop = 0;
  let entryPad = 0; // space under each entry's text, so a date leaves with the text

  function measure() {
    const css = getComputedStyle(root);
    const px = (name) => parseFloat(css.getPropertyValue(name));
    const gutter = px("--gutter");
    const pad = px("--pad");
    dockTop = px("--dock-top");

    starts = slots.map((s) => {
      const r = s.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY };
    });

    const m = main.getBoundingClientRect();
    const ms = getComputedStyle(main);
    const contentLeft = m.left + parseFloat(ms.paddingLeft);
    const contentRight = m.right - parseFloat(ms.paddingRight);
    const widest = Math.max(...flies.map((f) => f.offsetWidth));
    const widestDate = Math.max(...dates.map((d) => d.offsetWidth));
    roomy =
      contentRight + pad + widest <= innerWidth - gutter &&
      contentLeft - pad - widestDate >= gutter;
    root.classList.toggle("roomy", roomy);

    // end: nav stacked just right of the content, the tags in a second stack under it
    let y = 0;
    ends = slots.map((s, i) => {
      if (i === navCount) y += px("--group-gap") - px("--dock-gap");
      const at = { x: contentRight + pad, y };
      y += s.offsetHeight + px(i < navCount ? "--dock-gap" : "--tag-gap");
      return at;
    });

    entryPad = parseFloat(getComputedStyle(entries[0]).paddingBottom);
    dates.forEach((d) => {
      d.style.left = contentLeft - pad - d.offsetWidth + "px";
    });
  }

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  let docked = false; // toggled by scroll; the flight follows it
  let dockP = 0; // flight progress, 0 at the bar to 1 at the dock
  let dockRun = 0;
  let dockLast = 0;

  function render() {
    // too narrow to dock: everything just rides with the header
    const p = roomy ? dockP : 0;
    const dockStagger = Math.min(
      MAX_DOCK_STAGGER,
      0.8 / Math.max(1, flies.length - 1),
    );
    const span = 1 - dockStagger * (flies.length - 1);
    const list = main.getBoundingClientRect();
    const first = entries.find((e) => !e.hidden);
    const last = entries.findLast((e) => !e.hidden);
    // the stack rides with the top of the first entry, then sticks at --dock-top
    const stackTop = Math.max(
      dockTop,
      first ? first.getBoundingClientRect().top : list.top,
    );

    flies.forEach((el, i) => {
      const t = ease(clamp((p - i * dockStagger) / span));
      const s = { x: starts[i].x, y: starts[i].y - scrollY };
      const e = { x: ends[i].x, y: stackTop + ends[i].y };
      const c = { x: s.x + (e.x - s.x) * 0.85, y: s.y - 24 };
      const u = 1 - t;
      const x = u * u * s.x + 2 * u * t * c.x + t * t * e.x;
      const y = u * u * s.y + 2 * u * t * c.y + t * t * e.y;
      el.style.transform = `translate(${x}px, ${y}px)`;
      pos[i] = { x, y };
    });

    // each date starts level with its entry, sticks level with docked ABOUT,
    // and is carried off by the bottom of its entry
    dates.forEach((d, i) => {
      if (entries[i].hidden) return;
      const r = entries[i].getBoundingClientRect();
      const y = Math.min(
        Math.max(dockTop, r.top),
        r.bottom - entryPad - d.offsetHeight,
      );
      d.style.transform = `translateY(${y}px)`;
    });

    // → beside BLOG while the entries pass the dock line
    const on =
      roomy &&
      first &&
      first.getBoundingClientRect().top <= dockTop &&
      last.getBoundingClientRect().bottom > dockTop;
    marker.classList.toggle("on", !!on);
    const at = pos[flies.indexOf(blogFly)];
    marker.style.transform = `translate(${at.x - marker.offsetWidth - MARKER_GAP}px, ${at.y}px)`;
  }

  // dates and the dock follow entries while they slide
  let settle = 0;
  function settleFor(ms) {
    const start = settle < performance.now();
    settle = performance.now() + ms + 50;
    if (start) requestAnimationFrame(settling);
  }
  function settling() {
    render();
    if (performance.now() < settle) requestAnimationFrame(settling);
  }

  // the nav is a toggle: past a threshold it flies the whole way, whatever the scroll does after
  function updateDock() {
    const goal = roomy && (docked ? scrollY >= UNDOCK_AT : scrollY > DOCK_AT);
    if (goal === docked) return;
    docked = goal;
    if (reduceMotion) dockP = docked ? 1 : 0;
    else if (!dockRun) {
      dockLast = performance.now();
      dockRun = requestAnimationFrame(dockStep);
    }
  }

  // eases the flight toward wherever the toggle points, reversing smoothly from mid-flight
  function dockStep(now) {
    const dir = docked ? 1 : -1;
    dockP = clamp(dockP + (dir * Math.max(0, now - dockLast)) / DOCK_MS);
    dockLast = now;
    render();
    dockRun = dockP === (docked ? 1 : 0) ? 0 : requestAnimationFrame(dockStep);
  }

  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateDock();
      render();
    });
  }

  function refresh() {
    measure();
    updateDock();
    render();
  }

  // ---------------------------------------------------------------- intro

  async function intro() {
    const want = entries.map(wanted);
    entries.forEach((e, i) => setHidden(i, !want[i]));
    paintTags();
    refresh();
    const visible = entries.filter((e) => !e.hidden);
    if (reduceMotion) {
      for (const c of document.querySelectorAll(".ch")) c.className = "ch";
      for (const e of visible) show(entries.indexOf(e), true);
      return;
    }
    // back from a post: the entries are just there, only the nav glitches in
    const nav = performance.getEntriesByType("navigation")[0];
    const fromPost =
      nav?.type === "back_forward" ||
      /^\/blog\/.+/.test(
        document.referrer.startsWith(location.origin)
          ? new URL(document.referrer).pathname
          : "",
      );
    if (fromPost) {
      root.classList.add("instant");
      for (const d of dates)
        for (const c of d.querySelectorAll(".ch")) c.className = "ch";
      for (const e of visible) show(entries.indexOf(e), true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => root.classList.remove("instant")),
      );
    }
    // quiet: the nav is just there, only the tags glitch in
    const coming = quiet ? flies.slice(navCount) : flies;
    if (quiet)
      for (const a of flies.slice(0, navCount))
        for (const c of a.querySelectorAll(".ch")) c.className = "ch";
    else {
      await wait(START_DELAY);
      nameLines.forEach((l, i) => setTimeout(() => glitch(l), i * STAGGER));
      await wait(nameLines.length * STAGGER);
    }
    coming.forEach((a, i) => setTimeout(() => glitch(a), i * STAGGER * 0.5));
    if (fromPost) return;
    await wait((quiet ? 0 : navCount) * STAGGER * 0.5 + GLITCH_MS * 0.5);
    visible.forEach((e, k) =>
      setTimeout(() => {
        const i = entries.indexOf(e);
        show(i, true);
        glitch(dates[i]);
      }, k * STAGGER),
    );
  }

  addEventListener("scroll", onScroll, { passive: true });
  onLeave(() => !docked);
  addEventListener("resize", refresh);
  // the list shrinking or growing on a filter can clamp the scroll; keep dates in step
  new ResizeObserver(() => starts.length && render()).observe(main);
  addEventListener("hashchange", () => {
    selected.clear();
    for (const t of decodeURIComponent(location.hash.slice(1)).split("+"))
      if (counts.has(t)) selected.add(t);
    applyFilter();
  });

  // wait for the font so measurements are right (fall back after 2s if offline)
  Promise.race([
    document.fonts.load('500 14px "Inter Tight"').then(() => document.fonts.ready),
    wait(2000),
  ]).then(intro);
