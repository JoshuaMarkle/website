// ---- leaving a page with the nav still at the top: the next page's name and nav are in about the
// same spot, so they just appear there instead of glitching in again

const KEY = "leftAtTop";
const FRESH_MS = 10000; // older than this and it's not the click that brought us here

// atTop: called as the page goes away, says whether the nav is still home
export function onLeave(atTop) {
  addEventListener("pagehide", () => {
    if (atTop()) sessionStorage.setItem(KEY, String(Date.now()));
    else sessionStorage.removeItem(KEY);
  });
}

// read once at load: true if we came straight from a page left at the top (a reload always replays)
export function arrivedAtTop() {
  const at = Number(sessionStorage.getItem(KEY));
  sessionStorage.removeItem(KEY);
  const type = performance.getEntriesByType("navigation")[0]?.type;
  return type !== "reload" && at > 0 && Date.now() - at < FRESH_MS;
}
