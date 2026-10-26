// Long dashes (em \u2014 and en \u2013) never reach the screen.
const DASH = /[\u2013\u2014]/;

/** Removes long dashes from text shown to the user: a number range becomes "2-3", any other dash becomes a comma. */
export function stripDashes(s: string): string {
  if (!DASH.test(s)) return s;
  return s
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1-$2")
    .replace(/^\s*[\u2013\u2014]+\s*/, "")
    .replace(/\s*[\u2013\u2014]+\s*/g, ", ")
    .replace(/,\s*([.,;:!?])/g, "$1")
    .replace(/ {2,}/g, " ");
}

/** stripDashes over every string inside a JSON-like value. */
export function stripDashesDeep<T>(v: T): T {
  if (typeof v === "string") return stripDashes(v) as T;
  if (Array.isArray(v)) return v.map(stripDashesDeep) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, stripDashesDeep(x)])) as T;
  return v;
}
