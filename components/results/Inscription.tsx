/**
 * Verdict lettering. The word is drawn stroke by stroke in ink, then filled, as if written on
 * the scroll. The Greek is the formula Athenian decrees opened with: "it was resolved by...".
 */
export function InkWord({ text, className = "" }: { text: string; className?: string }) {
  return (
    <svg role="img" aria-label={text} className={`ink-word block w-full overflow-visible font-caps ${className}`} height="1em">
      <text x="0" y="0.84em" className="ink-draw">
        {text}
      </text>
    </svg>
  );
}

/** "ΕΔΟΞΕ ΤΩΙ ΣΥΜΠΟΣΙΩΙ": it was resolved by the symposium. */
export function Decree({ extra }: { extra?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 pr-20">
      <span lang="grc" className="font-sans text-[1.05rem] tracking-[0.18em] text-gold">
        ΕΔΟΞΕ ΤΩΙ ΣΥΜΠΟΣΙΩΙ
      </span>
      <span className="text-[0.8rem] italic text-muted">
        resolved by the symposium{extra ? ` · ${extra}` : ""}
      </span>
    </div>
  );
}

/** The verdict in ancient Greek, under the English word. */
export function GreekVerdict({ greek, gloss }: { greek: string; gloss: string }) {
  return (
    <div className="ink-line mt-1 flex items-baseline gap-2" style={{ animationDelay: "1.3s" }}>
      <span lang="grc" className="font-sans text-2xl tracking-[0.2em] text-ink/80">
        {greek}
      </span>
      <span className="text-sm italic text-muted">({gloss})</span>
    </div>
  );
}
