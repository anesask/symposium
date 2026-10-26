import type { MatrixComputed, MatrixSetup, MatrixThinkerScore, ThinkerId } from "@/lib/types";

/** Thinkers' scores on a cell this far apart (max − min) mark it as contested. */
export const CONTESTED_SPREAD = 2;

function totals(setup: MatrixSetup, avg: (o: string, c: string) => number, weights?: Record<string, number>) {
  const sumW = setup.criteria.reduce((s, c) => s + (weights?.[c.id] ?? c.weight), 0) || 1;
  return setup.options
    .map((o) => {
      const total = setup.criteria.reduce((s, c) => s + avg(o.id, c.id) * (weights?.[c.id] ?? c.weight), 0);
      return { optionId: o.id, label: o.label, total: round(total), percent: Math.round((total / (5 * sumW)) * 100) };
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export function computeMatrix(setup: MatrixSetup, scores: MatrixThinkerScore[], abstained: ThinkerId[] = []): MatrixComputed {
  const counted = scores.filter((s) => !abstained.includes(s.thinkerId));
  const cells = setup.options.flatMap((o) =>
    setup.criteria.map((c) => {
      const vals = counted.map((s) => s.cells.find((x) => x.optionId === o.id && x.criterionId === c.id)?.score).filter((v): v is number => typeof v === "number");
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const spread = vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
      return { optionId: o.id, criterionId: c.id, avg: round(avg), spread, contested: spread >= CONTESTED_SPREAD };
    }),
  );
  const avgOf = (o: string, c: string) => cells.find((x) => x.optionId === o && x.criterionId === c)?.avg ?? 0;
  const ranking = totals(setup, avgOf);

  // The criterion that contributes most to the winner's lead over the runner-up.
  let decisiveCriterionId: string | null = null;
  if (ranking.length >= 2) {
    const [a, b] = ranking;
    let best = 0;
    for (const c of setup.criteria) {
      const lead = c.weight * (avgOf(a.optionId, c.id) - avgOf(b.optionId, c.id));
      if (lead > best) {
        best = lead;
        decisiveCriterionId = c.id;
      }
    }
  }

  const sensitivity = sensitivityLine(setup, avgOf, ranking[0]?.optionId);

  // Each thinker names their own winner (by their own scores, the table's weights).
  const thinkerVotes = scores.map((s) => {
    if (abstained.includes(s.thinkerId)) return { thinkerId: s.thinkerId, vote: "ABSTAIN" };
    const own = (o: string, c: string) => s.cells.find((x) => x.optionId === o && x.criterionId === c)?.score ?? 0;
    return { thinkerId: s.thinkerId, vote: totals(setup, own)[0]?.label ?? "ABSTAIN" };
  });
  const winnerLabel = ranking[0]?.label;
  const sumW = setup.criteria.reduce((a, c) => a + c.weight, 0);
  const decisive = setup.criteria.find((c) => c.id === decisiveCriterionId);
  const [first, second] = ranking;
  const trace = [
    `Each option gets the table's average rating (1 to 5) on each of ${setup.criteria.length} things, times how much that thing matters, added up (best possible: ${5 * sumW}).`,
    ...ranking.map((r) => `${r.label}: ${r.total} points (${r.percent}%)`),
    ...(first && second
      ? [`${first.label} leads by ${Math.round((first.total - second.total) * 100) / 100}${decisive ? `, mostly on “${decisive.label}” (×${decisive.weight})` : ""}`]
      : []),
  ];
  return {
    framework: "matrix",
    trace,
    ranking,
    cells,
    decisiveCriterionId,
    sensitivity,
    thinkerVotes: [...thinkerVotes, ...abstained.filter((id) => !scores.some((s) => s.thinkerId === id)).map((id) => ({ thinkerId: id, vote: "ABSTAIN" }))],
    tally: {
      for: thinkerVotes.filter((v) => v.vote === winnerLabel).length,
      against: thinkerVotes.filter((v) => v.vote !== winnerLabel && v.vote !== "ABSTAIN").length,
      abstained: abstained.length,
    },
  };
}

/**
 * Moves each weight by one point (heaviest criteria first, within 1..5) and reports the
 * first move that changes the winner.
 */
export function sensitivityLine(setup: MatrixSetup, avg: (o: string, c: string) => number, winnerId: string | undefined): string {
  if (!winnerId || setup.options.length < 2) return "";
  const byWeight = [...setup.criteria].sort((a, b) => b.weight - a.weight);
  for (const c of byWeight) {
    for (const delta of [-1, 1]) {
      const w = c.weight + delta;
      if (w < 1 || w > 5) continue;
      const weights = Object.fromEntries(setup.criteria.map((x) => [x.id, x.id === c.id ? w : x.weight]));
      const next = totals(setup, avg, weights)[0];
      if (next.optionId !== winnerId) {
        return `If “${c.label}” mattered one point ${delta < 0 ? "less" : "more"}, ${next.label} would win.`;
      }
    }
  }
  return "The ranking holds if any single weight moves by one point.";
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
