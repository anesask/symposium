import type { GateComputed, MatrixComputed, PremortemComputed, VoteResult } from "@/lib/types";

export interface WasNow {
  was: string;
  now: string;
  changed: boolean;
  tallyWas: string;
  tallyNow: string;
  /** Short lines naming what flipped between the two results. */
  flips: string[];
}

const STATUS = { GO: "Yes", "NO-GO": "No", CONDITIONAL: "Maybe", ABSTAIN: "Abstained" } as const;
const tally = (t: { for: number; against: number }) => `${t.for} to ${t.against}`;

/** What moved between two results of the same framework. */
export function compareResults(prev: VoteResult, next: VoteResult): WasNow | null {
  if (prev.framework !== next.framework) return null;

  if (next.framework === "gate") {
    const a = prev.computed as GateComputed;
    const b = next.computed as GateComputed;
    const flips: string[] = [];
    for (const st of b.scorecard) {
      for (const c of st.criteria) {
        const before = a.scorecard.find((x) => x.station === st.station)?.criteria.find((x) => x.id === c.id);
        if (before && before.vote !== c.vote) flips.push(`${c.label}: ${STATUS[before.vote]} → ${STATUS[c.vote]}`);
      }
    }
    return { was: a.verdict, now: b.verdict, changed: a.verdict !== b.verdict, tallyWas: tally(a.tally), tallyNow: tally(b.tally), flips };
  }

  if (next.framework === "matrix") {
    const a = prev.computed as MatrixComputed;
    const b = next.computed as MatrixComputed;
    const flips = b.ranking
      .map((r, i) => {
        const j = a.ranking.findIndex((x) => x.optionId === r.optionId);
        if (j === -1) return null;
        return j !== i ? `${r.label}: #${j + 1} → #${i + 1} (${a.ranking[j].percent}% → ${r.percent}%)` : r.percent !== a.ranking[j].percent ? `${r.label}: ${a.ranking[j].percent}% → ${r.percent}%` : null;
      })
      .filter((x): x is string => Boolean(x));
    const was = a.ranking[0]?.label ?? "";
    const now = b.ranking[0]?.label ?? "";
    return { was, now, changed: was !== now, tallyWas: tally(a.tally), tallyNow: tally(b.tally), flips };
  }

  const a = prev.computed as PremortemComputed;
  const b = next.computed as PremortemComputed;
  const top = (c: PremortemComputed) => c.ranked[0]?.cause;
  const flips: string[] = [];
  const critA = a.ranked.filter((r) => r.critical).length;
  const critB = b.ranked.filter((r) => r.critical).length;
  if (critA !== critB) flips.push(`Critical risks: ${critA} → ${critB}`);
  if (top(a) !== top(b) && top(b)) flips.push(`New top risk: ${top(b)}`);
  return { was: a.call.toUpperCase(), now: b.call.toUpperCase(), changed: a.call !== b.call, tallyWas: tally(a.tally), tallyNow: tally(b.tally), flips };
}
