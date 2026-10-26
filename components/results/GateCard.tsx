"use client";

import { useState } from "react";
import { STATION_LABELS } from "@/config/gate";
import { ROSTER } from "@/config/roster";
import type { GateComputed, VoteResult } from "@/lib/types";
import { CountUp } from "./CountUp";
import { Check, StationIcon } from "./icons";
import { VerdictShell } from "./VerdictShell";
import { ChangedMinds } from "./ChangedMinds";
import { HowDecided } from "./HowDecided";
import { VerdictDetails, VotersRow } from "./VerdictParts";
import { Decree, GreekVerdict, InkWord } from "./Inscription";
import { GATE_WORDS } from "@/lib/voice/speak";

const STATUS_TEXT = { GO: "Yes", "NO-GO": "No", CONDITIONAL: "Maybe", ABSTAIN: "Abstained" } as const;
const STATUS_COLOR = { GO: "text-go", "NO-GO": "text-nogo", CONDITIONAL: "text-cond", ABSTAIN: "text-muted" } as const;

export function GateCard({ result }: { result: VoteResult }) {
  const c = result.computed as GateComputed;
  const w = GATE_WORDS[c.verdict];
  return (
    <div className="space-y-4">
      <VerdictShell roomArt>
        <Decree />
        <InkWord
          key={result.id}
          text={w.word}
          className={`mt-3 ${c.verdict === "NO-GO" ? "text-nogo" : "text-go"} ${c.verdict === "GO" ? "text-[6.5rem] sm:text-[8rem]" : "text-[4.2rem] sm:text-[5.2rem]"}`}
        />
        <GreekVerdict greek={w.greek} gloss={w.gloss} />
        <div className="mt-2 font-serif text-2xl sm:text-[1.9rem]">
          {w.line} ·{" "}
          <CountUp to={c.tally.for} /> to <CountUp to={c.tally.against} />
          {c.tally.abstained > 0 && <span className="text-lg text-muted"> ({c.tally.abstained} abstained)</span>}
        </div>
        <VotersRow votes={c.thinkerVotes} />
        <HowDecided trace={c.trace} />
        {c.verdict === "NO-GO" && c.flipCondition && (
          <div className="mt-5 rounded-xl border border-nogo/40 bg-nogo/10 px-4 py-3 text-[0.95rem]">
            <div className="eyebrow mb-1 !text-nogo">What would flip it</div>
            {c.flipCondition}
          </div>
        )}
        {c.conditions.length > 0 && (
          <>
            <hr className="my-5 border-line" />
            <ul className="space-y-3.5">
              {c.conditions.map((x, i) => (
                <li key={i} className="ink-line flex items-start gap-3 text-[1.05rem] leading-snug" style={{ animationDelay: `${1700 + i * 450}ms` }}>
                  <Check />
                  <span className="pt-0.5">{x}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </VerdictShell>

      <VerdictDetails label={[ "how each question was answered", result.changes.length ? "who changed their mind" : "", c.openRisks.length ? "open risks" : ""].filter(Boolean).join(", ")}>
        <Scorecard computed={c} />
        <ChangedMinds result={result} />
        {c.openRisks.length > 0 && (
          <section>
            <div className="eyebrow mb-2">Open risks</div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink/90">
              {c.openRisks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        )}
      </VerdictDetails>
    </div>
  );
}

function Scorecard({ computed }: { computed: GateComputed }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section>
      <div className="eyebrow mb-2">How each question was answered</div>
      <div className="overflow-hidden rounded-xl border border-line">
        {computed.scorecard.map((s) => {
          const isOpen = open === s.station;
          return (
            <div key={s.station} className="border-b border-line last:border-b-0">
              <button
                onClick={() => setOpen(isOpen ? null : s.station)}
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[1fr_1fr] items-center text-left hover:bg-surface-2"
              >
                <span className="flex items-center gap-3 border-r border-line px-4 py-3 text-ink/90">
                  <StationIcon station={s.station} />
                  <span>
                    {STATION_LABELS[s.station]}
                    <span className="block text-[0.7rem] text-muted">
                      {ROSTER[s.ownerId].name}
                      {s.covering && " · covering"}
                    </span>
                  </span>
                </span>
                <span className="flex items-center justify-between px-4 py-3">
                  <span className={`font-medium ${STATUS_COLOR[s.status]}`}>{STATUS_TEXT[s.status]}</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" className={`text-muted transition ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              {isOpen && (
                <ul className="space-y-2 bg-bg/50 px-4 py-3 text-sm">
                  {s.criteria.map((c) => (
                    <li key={c.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-ink">
                          {c.label}
                          {c.mustPass && <span className="ml-1.5 text-[0.65rem] uppercase tracking-wider text-muted">must pass</span>}
                        </span>
                        <span className={`shrink-0 text-xs font-semibold ${STATUS_COLOR[c.vote]}`}>{STATUS_TEXT[c.vote]}</span>
                      </div>
                      <div className="text-muted">{c.reason}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
