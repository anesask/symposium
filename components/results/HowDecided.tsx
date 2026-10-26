/** The rule the code applied, step by step: makes "computed, not guessed" visible. */
export function HowDecided({ trace }: { trace?: string[] }) {
  if (!trace?.length) return null; // results saved before the trace existed
  return (
    <section className="mt-5 rounded-xl border border-line bg-bg/60 px-4 py-3" aria-label="How this was decided">
      <div className="eyebrow mb-2">How this was decided</div>
      <ol className="space-y-1.5">
        {trace.map((line, i) => (
          <li key={i} className="flex gap-2.5 text-[0.86rem] leading-snug text-ink/90">
            <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-line text-[0.62rem] text-muted tabular-nums">
              {i + 1}
            </span>
            <span className="tabular-nums">{line}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
