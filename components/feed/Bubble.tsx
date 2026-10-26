"use client";

import { ROSTER } from "@/config/roster";
import type { Message, TableSummary } from "@/lib/types";
import { Portrait } from "@/components/table/Portrait";
import { VoteTag } from "@/components/table/VoteTag";
import { Ink } from "./Ink";

export function Bubble({
  message,
  showVote,
  onRetry,
  onFinish,
  shown = Infinity,
  writing = false,
}: {
  message: Message;
  showVote: boolean;
  onRetry?: () => void;
  /** Skip the handwriting: show the rest of this message at once. */
  onFinish?: () => void;
  /** Characters written so far (pen and papyrus). */
  shown?: number;
  writing?: boolean;
}) {
  const t = message.speakerId ? ROSTER[message.speakerId] : null;

  if (message.kind === "user" || message.kind === "fact") {
    return (
      <div className="bubble-in col-span-full flex justify-end">
        <div className="max-w-[80%] rounded-lg rounded-br-sm border border-accent/30 bg-accent/10 px-4 py-2.5 text-[1.05rem] leading-snug">
          {message.kind === "fact" && <div className="eyebrow mb-1 !text-accent">What if</div>}
          {message.oneOnOne && <div className="eyebrow mb-1 !text-accent">1:1 with {ROSTER[message.oneOnOne].shortName}</div>}
          {message.text}
        </div>
      </div>
    );
  }

  if (message.summary) return <SummaryCard summary={message.summary} />;

  if (message.kind === "notice" || (message.kind !== "moderator" && !t)) {
    return <div className="bubble-in col-span-full px-6 py-1 text-center text-[0.95rem] italic text-muted">{message.text}</div>;
  }

  if (message.kind === "moderator") {
    // The moderator runs the table: a small mark between two rules, then the line.
    return (
      <div className="bubble-in col-span-full px-6 py-1 text-center">
        <div className="mb-0.5 flex items-center justify-center gap-3 text-[0.7rem] uppercase tracking-[0.2em] text-muted">
          <span aria-hidden className="h-px w-10 bg-gold/30" />
          The moderator
          <span aria-hidden className="h-px w-10 bg-gold/30" />
        </div>
        <p className="font-serif text-[1.15rem] italic leading-snug text-gold/90">{message.text}</p>
      </div>
    );
  }

  const thinker = t!;
  const failed = message.status === "failed";
  const finish = writing && onFinish ? { onClick: onFinish, title: "Click to finish writing", role: "button" as const } : {};

  // Socrates gets one question per session: make it a moment.
  if (thinker.id === "socrates") {
    return (
      <div className="bubble-in col-span-full flex flex-col items-center px-6 py-3 text-center" {...finish}>
        <Portrait id="socrates" size={56} speaking={writing} />
        <div className="mt-2 text-[0.75rem] uppercase tracking-[0.2em] text-gold">Socrates asks</div>
        <p className="mt-1 max-w-xl font-serif text-[1.6rem] italic leading-snug text-ink">
          <Ink text={message.text} shown={shown} writing={writing} />
        </p>
      </div>
    );
  }

  const label =
    message.kind === "poll"
      ? `${thinker.name} · poll`
      : message.oneOnOne
        ? `${thinker.name} · 1:1`
        : message.replyTo
          ? `${thinker.name} → ${ROSTER[message.replyTo].name}`
          : thinker.name;

  return (
    <div className="bubble-in flex items-start gap-3">
      <Portrait id={thinker.id} size={44} speaking={writing} />
      <div
        className={`papyrus-sheet relative min-w-0 flex-1 border-l-2 px-4 pb-3 pt-2 ${writing ? "is-writing cursor-pointer" : ""}`}
        style={{ borderColor: `${thinker.accentColor}66` }}
        {...finish}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[0.8rem] uppercase tracking-[0.14em]" style={{ color: thinker.accentColor }}>
              {label}
              {message.changedVote && <span className="ml-2 font-serif text-[0.85rem] normal-case italic tracking-normal text-gold">changed their vote</span>}
            </div>
            <p className="whitespace-pre-wrap text-[1.08rem] leading-relaxed text-ink">
              <Ink text={message.text} shown={shown} writing={writing} />
            </p>
            {failed && (
              <div className="mt-2 flex items-center gap-3 text-sm text-muted">
                <span className="italic">…lost their train of thought.</span>
                {onRetry && (
                  <button onClick={onRetry} className="rounded-full border border-line px-3 py-0.5 text-ink hover:border-accent">
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
          {showVote && message.voteTag && !writing && <VoteTag vote={message.voteTag} outline={message.kind !== "poll"} />}
        </div>
        {/* Scroll rods: out while the quill writes, rolled away when done. */}
        <span aria-hidden className="scroll-rod top" />
        <span aria-hidden className="scroll-rod" />
      </div>
    </div>
  );
}

/** "Sum up": where the table stands, in three short lists. */
function SummaryCard({ summary }: { summary: TableSummary }) {
  const parts = [
    { title: "They agree", items: summary.agree },
    { title: "They disagree", items: summary.disagree },
    { title: "Still unknown", items: summary.unknown },
  ].filter((p) => p.items.length);
  return (
    <div data-summary className="bubble-in col-span-full rounded-md border border-gold/25 bg-black/25 px-5 py-4">
      <div className="mb-2 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.2em] text-muted">
        The moderator sums up
        <span aria-hidden className="h-px flex-1 bg-gold/20" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {parts.map((p) => (
          <div key={p.title}>
            <div className="font-serif text-lg font-semibold text-gold">{p.title}</div>
            <ul className="mt-1 space-y-1.5 text-[0.98rem] leading-snug text-ink/90">
              {p.items.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
