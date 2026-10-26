"use client";

import { PORTRAIT_FORMAT } from "@/config/art";
import { ROSTER } from "@/config/roster";
import type { ThinkerId } from "@/lib/types";
import { voteColor, voteLabel } from "@/components/table/VoteTag";

/** A red wax seal stamped with the kylix, pressed onto the scroll once the verdict is written. */
export function Seal() {
  return (
    <span className="wax-seal" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/scenes/logo.webp" alt="" />
    </span>
  );
}

const INK = { go: "text-go", nogo: "text-nogo", cond: "text-cond", muted: "text-muted" } as const;
const STROKE = { go: "bg-go", nogo: "bg-nogo", cond: "bg-cond", muted: "bg-line" } as const;

/** Who voted what: each thinker's portrait, an ink stroke, and their vote in plain words. */
export function VotersRow({
  votes,
  colorOf = (v) => voteColor(v),
}: {
  votes: { thinkerId: ThinkerId; vote: string }[];
  colorOf?: (vote: string) => keyof typeof INK;
}) {
  return (
    <ul className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(votes.length, 3)}, minmax(0, 1fr))` }} aria-label="How each thinker voted">
      {votes.map((v, i) => {
        const c = colorOf(v.vote);
        return (
          <li key={v.thinkerId} className="ink-line flex min-w-0 flex-col items-center text-center" style={{ animationDelay: `${900 + i * 150}ms` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/portraits/${v.thinkerId}.${PORTRAIT_FORMAT}`}
              alt=""
              className="h-11 w-11 rounded-full object-cover ring-1 ring-[rgba(90,58,24,.45)] sepia-[.35]"
            />
            <span className={`ink-stroke mt-1.5 block h-1.5 w-4/5 ${STROKE[c]}`} />
            <span className="mt-1 w-full truncate text-[0.72rem] uppercase tracking-[0.1em] text-muted">{ROSTER[v.thinkerId].shortName}</span>
            <span className={`w-full truncate font-serif text-[1rem] font-semibold leading-tight ${INK[c]}`} title={voteLabel(v.vote)}>
              {voteLabel(v.vote)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Everything behind the verdict (scorecard, changed minds, risks), folded away under the scroll. */
export function VerdictDetails({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="verdict-details group mt-4 rounded-md border border-line bg-surface/50">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-ink/85 hover:text-ink">
        <span>
          <span className="font-serif text-lg">Details</span>
          <span className="ml-2 text-sm text-muted">{label}</span>
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" className="text-muted transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="space-y-5 border-t border-line px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}
