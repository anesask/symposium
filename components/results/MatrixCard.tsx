"use client";

import { ROSTER } from "@/config/roster";
import type { MatrixComputed, MatrixSetup, VoteResult } from "@/lib/types";
import { CountUp } from "./CountUp";
import { VerdictShell } from "./VerdictShell";
import { Decree } from "./Inscription";
import { VerdictDetails, VotersRow } from "./VerdictParts";
import { ChangedMinds } from "./ChangedMinds";
import { HowDecided } from "./HowDecided";

export function MatrixCard({ result }: { result: VoteResult }) {
  const c = result.computed as MatrixComputed;
  const setup = result.setup as MatrixSetup;
  const winner = c.ranking[0];
  const decisive = setup.criteria.find((x) => x.id === c.decisiveCriterionId);

  return (
    <div className="space-y-4">
      <VerdictShell roomArt>
        <Decree />
        <div key={result.id} className="ink-line mt-3 font-caps text-[3rem] leading-[0.95] text-go sm:text-[3.8rem]">
          {winner?.label}
        </div>
        <div className="mt-2 font-serif text-xl sm:text-2xl">
          <CountUp to={winner?.percent ?? 0} />% fit · {c.tally.for} of {c.tally.for + c.tally.against} back it
        </div>
        <VotersRow votes={c.thinkerVotes} colorOf={(v) => (v === winner?.label ? "go" : v === "ABSTAIN" ? "muted" : "cond")} />

        <ul className="mt-5 space-y-3">
          {c.ranking.map((r, i) => (
            <li key={r.optionId}>
              <div className="flex items-baseline justify-between text-sm">
                <span className={i === 0 ? "font-semibold" : "text-ink/85"}>
                  {i + 1}. {r.label}
                </span>
                <span className="tabular-nums text-muted">{r.percent}%</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className={`tally-fill h-full rounded-full ${i === 0 ? "bg-go" : "bg-muted/50"}`} style={{ width: `${r.percent}%`, animationDelay: `${300 + i * 150}ms` }} />
              </div>
            </li>
          ))}
        </ul>

        <HowDecided trace={c.trace} />
        <hr className="my-5 border-line" />
        {decisive && (
          <p className="text-[0.98rem]">
            <span className="text-muted">Decided by </span>
            <span className="font-semibold">{decisive.label}</span>
            <span className="text-muted"> (weight {decisive.weight}).</span>
          </p>
        )}
        {c.sensitivity && (
          <p className="mt-2 rounded-xl border border-cond/40 bg-cond/10 px-4 py-3 text-[0.98rem]">
            <span className="eyebrow mb-1 block !text-cond">Sensitivity</span>
            {c.sensitivity}
          </p>
        )}
      </VerdictShell>

      <VerdictDetails label={["the full matrix", result.changes.length ? "who changed their mind" : ""].filter(Boolean).join(", ")}>
      <section>
        <div className="eyebrow mb-2">The matrix</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="text-left font-normal text-muted">Criterion</th>
                {setup.options.map((o) => (
                  <th key={o.id} className="px-1 text-center font-semibold">
                    {o.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {setup.criteria.map((cr) => (
                <tr key={cr.id}>
                  <td className="pr-2 text-ink/90">
                    {cr.label} <span className="text-[0.7rem] text-muted">×{cr.weight}</span>
                  </td>
                  {setup.options.map((o) => {
                    const cell = c.cells.find((x) => x.optionId === o.id && x.criterionId === cr.id);
                    const v = cell?.avg ?? 0;
                    return (
                      <td
                        key={o.id}
                        title={cell?.contested ? `Contested: scores spread by ${cell.spread}` : undefined}
                        className={`rounded-md px-2 py-1.5 text-center tabular-nums ${cell?.contested ? "outline outline-1 outline-cond" : ""}`}
                        style={{ background: `color-mix(in srgb, var(--color-go) ${Math.round((v / 5) * 45)}%, var(--color-surface-2))` }}
                      >
                        {v.toFixed(1)}
                        {cell?.contested && <span className="ml-1 text-cond">⚡</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {c.cells.some((x) => x.contested) && <p className="mt-2 text-xs text-muted">⚡ contested: the table disagreed by 2+ points</p>}
      </section>
      <ChangedMinds result={result} />
      </VerdictDetails>
    </div>
  );
}
