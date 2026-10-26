"use client";

import { ROSTER } from "@/config/roster";
import type { PremortemComputed, PremortemSetup, VoteResult } from "@/lib/types";
import { CountUp } from "./CountUp";
import { VerdictShell } from "./VerdictShell";
import { HowDecided } from "./HowDecided";
import { Decree, GreekVerdict, InkWord } from "./Inscription";
import { VerdictDetails, VotersRow } from "./VerdictParts";
import { PREMORTEM_WORDS } from "@/lib/voice/speak";

const COLOR = { proceed: "text-go", revise: "text-cond", stop: "text-nogo" } as const;

export function PremortemCard({ result }: { result: VoteResult }) {
  const c = result.computed as PremortemComputed;
  const setup = result.setup as PremortemSetup;
  const call = { ...PREMORTEM_WORDS[c.call], color: COLOR[c.call] };
  return (
    <div className="space-y-4">
      <VerdictShell roomArt>
        <Decree />
        <p className="mt-2 font-serif text-lg italic text-ink/85">“{setup.premise}”</p>
        <InkWord key={result.id} text={call.word} className={`mt-3 text-[3.4rem] sm:text-[4.4rem] ${call.color}`} />
        <GreekVerdict greek={call.greek} gloss={call.gloss} />
        <div className="mt-2 font-serif text-xl">
          <CountUp to={c.tally.for} /> say go ahead · <CountUp to={c.tally.against} /> say rethink or stop
        </div>
        <p className="mt-1 text-sm text-muted">{call.note}</p>
        <VotersRow votes={c.thinkerVotes} />
        <HowDecided trace={c.trace} />
        <hr className="my-5 border-line" />
        <ol className="space-y-4">
          {c.ranked.map((r, i) => (
            <li key={r.id} className="ink-line" style={{ animationDelay: `${1500 + i * 400}ms` }}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${r.critical ? "bg-nogo text-white" : "bg-surface-2 text-ink"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.97rem] leading-snug">{r.cause}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                      <span className={`tally-fill block h-full ${r.critical ? "bg-nogo" : "bg-cond"}`} style={{ width: `${(r.risk / 25) * 100}%` }} />
                    </span>
                    <span>
                      L{r.likelihood.toFixed(1)} × D{r.damage.toFixed(1)} = {r.risk.toFixed(1)}
                    </span>
                    <span>· {ROSTER[r.thinkerId].shortName}</span>
                    {r.critical && <span className="font-semibold text-nogo">critical</span>}
                  </div>
                  <p className="mt-1.5 text-sm">
                    <span className="font-semibold text-go">Fix: </span>
                    {r.mitigation}
                    <span className="text-muted"> (credibility {r.mitigationCredible.toFixed(1)}/5)</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </VerdictShell>
      {c.warningChecklist.length > 0 && (
        <VerdictDetails label="the early-warning checklist">
        <section>
          <div className="eyebrow mb-3">Early-warning checklist</div>
          <ul className="space-y-2.5 text-sm">
            {c.warningChecklist.map((w, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-cond" aria-hidden />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
        </VerdictDetails>
      )}
    </div>
  );
}
