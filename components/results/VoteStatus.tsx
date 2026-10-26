"use client";

import { useTable } from "@/lib/store/session";
import type { VotePhase } from "@/lib/types";
import { VoteTag } from "@/components/table/VoteTag";
import { FRAMEWORKS } from "@/components/vote/FrameworkSheet";
import { headline, useVerdictDialog } from "./ResultsPanel";

const STEPS: { phase: VotePhase; label: string }[] = [
  { phase: "setup", label: "Framing" },
  { phase: "scores", label: "Scoring" },
  { phase: "debate", label: "Debate" },
  { phase: "poll", label: "Poll" },
  { phase: "result", label: "Verdict" },
];

/** One line under the table: vote progress while voting, the latest verdict after, a hint before. */
export function VoteStatus() {
  const { state } = useTable();
  const s = state.session!;
  const latest = s.results.at(-1);
  const { open } = useVerdictDialog();

  if (s.vote) {
    const at = STEPS.findIndex((x) => x.phase === s.vote!.phase);
    const fw = FRAMEWORKS.find((f) => f.id === s.vote!.framework)!;
    return (
      <div className="mx-auto w-full max-w-md" aria-live="polite">
        <div className="eyebrow mb-2 text-center">
          {s.vote.trigger === "rerun" ? "Re-running" : "Calling the vote"} · <span className="text-accent">{fw.name}</span>
        </div>
        <ol className="flex gap-1.5">
          {STEPS.map((x, i) => (
            <li key={x.phase} className="flex flex-1 flex-col gap-1">
              <span className={`h-1.5 rounded-full ${i < at ? "bg-accent" : i === at ? "animate-pulse bg-accent" : "bg-surface-2"}`} />
              <span className={`text-center text-[0.62rem] uppercase tracking-wider ${i <= at ? "text-ink" : "text-muted"}`}>{x.label}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (latest) {
    return (
      <button
        onClick={() => open(latest.id)}
        className="mx-auto flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-1.5 text-sm hover:border-accent"
      >
        <span className="text-muted">Verdict</span>
        <VoteTag vote={headline(latest)} />
        <span className="text-muted">
          {latest.computed.tally.for} to {latest.computed.tally.against}
        </span>
        <span className="text-accent">Open</span>
      </button>
    );
  }

  return <p className="text-center text-sm text-muted">Tap a thinker to address them. When you're ready, call the vote.</p>;
}
