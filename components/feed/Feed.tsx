"use client";

import { useEffect, useRef } from "react";
import { useTable } from "@/lib/store/session";
import { Bubble } from "./Bubble";
import { VerdictLine } from "@/components/results/ResultsPanel";
import { useReveal } from "@/lib/store/reveal";

/** The debate as one chat column, newest at the bottom. Scrolls inside its own box on desktop. */
export function Feed() {
  const { state, retry } = useTable();
  const s = state.session!;
  const box = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const reveal = useReveal();
  const visible = s.messages.filter((m) => reveal.shown(m.id) !== null);
  const lastText = (reveal.writingId && reveal.shown(reveal.writingId)) || 0;
  const pinned = useRef(true);

  // Follow the conversation unless the user has scrolled up to read something.
  useEffect(() => {
    const el = box.current;
    if (!el || !pinned.current) return;
    if (el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== "visible") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [visible.length, lastText]);

  const showVote = s.mode !== "talk";
  return (
    <section aria-label="The debate" className="flex min-h-0 flex-1 flex-col">
      <div
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="feed-scroll min-h-0 flex-1 lg:overflow-y-auto"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3 py-4 lg:pr-2">
          {visible.map((m) =>
            m.kind === "result" && m.resultId ? (
              <VerdictLine key={m.id} resultId={m.resultId} />
            ) : (
              <Bubble key={m.id} message={m} shown={reveal.shown(m.id) ?? 0} writing={reveal.writingId === m.id} onFinish={() => reveal.finish(m.id)} showVote={showVote} onRetry={m.status === "failed" ? () => retry(m.id) : undefined} />
            ),
          )}
        </div>
        <div ref={end} className="h-1" />
      </div>
    </section>
  );
}
