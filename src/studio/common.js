// ---- shared by the studio pages: the file api, the entry list, drop zones, form <-> data

export async function api(path, body) {
  const res = await fetch(
    `/__studio/${path}`,
    body && { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
  );
  const out = await res.json();
  if (!res.ok) throw new Error(out.error ?? res.statusText);
  return out;
}

export const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// a slug not already taken by another entry
export function freeSlug(base, entries) {
  const taken = new Set(entries.map((e) => e.slug));
  let slug = base || "untitled";
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export const today = () => new Date().toISOString().slice(0, 10);

export const readAsURL = (file) =>
  new Promise((done, fail) => {
    const r = new FileReader();
    r.onload = () => done(r.result);
    r.onerror = fail;
    r.readAsDataURL(file);
  });
export const readAsText = (file) => file.text();

// el takes a dropped file, or a click opens the picker; onFile(file)
export function dropzone(el, accept, onFile) {
  const input = Object.assign(document.createElement("input"), { type: "file", accept, hidden: true });
  el.after(input);
  el.addEventListener("click", () => input.click());
  input.addEventListener("change", () => input.files[0] && onFile(input.files[0]));
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("over");
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  });
}

// the left column: one button per entry, current one marked
export function drawList(ul, entries, current, label, onPick) {
  ul.replaceChildren(
    ...entries.map((e) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      const [main, sub] = label(e);
      b.textContent = main;
      const small = document.createElement("small");
      small.textContent = sub;
      b.append(small);
      if (e.slug === current) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => onPick(e));
      li.append(b);
      return li;
    }),
  );
}

// form fields named "a" or "a.b" <-> a plain object. numbers and checkboxes come back typed
export function readForm(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name || el.name === "body") continue;
    let v = el.type === "checkbox" ? el.checked : el.value.trim();
    if (el.type === "number" || el.dataset.number != null) v = v === "" ? undefined : Number(v);
    if (v === "") v = undefined;
    const [a, b] = el.name.split(".");
    if (b) (data[a] ??= {})[b] = v;
    else data[a] = v;
  }
  return data;
}
export function fillForm(form, data) {
  for (const el of form.elements) {
    if (!el.name || el.name === "body") continue;
    const [a, b] = el.name.split(".");
    const v = b ? data[a]?.[b] : data[a];
    if (el.type === "checkbox") el.checked = Boolean(v);
    else el.value = v ?? el.dataset.default ?? "";
  }
}

// a line of text for saving / errors; dirty marks unsaved changes
export function statusLine(el) {
  return {
    set(text, kind = "") {
      el.textContent = text;
      el.className = `status ${kind}`;
    },
  };
}

// cmd/ctrl+s saves
export function onSaveKey(fn) {
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      fn();
    }
  });
}
