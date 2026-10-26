"use client";

import { useEffect, useState } from "react";
import type { FrameworkId } from "@/lib/types";

/** People-first names; the method's technical name is shown small beside them. */
export const FRAMEWORKS: { id: FrameworkId; name: string; tech: string; when: string; output: string }[] = [
  { id: "gate", name: "Should I?", tech: "Go / No-Go gate", when: "A yes or no: “should I do X?”", output: "Yes · Yes, if · Not yet, with the conditions" },
  { id: "matrix", name: "Which one?", tech: "Decision matrix", when: "A choice: “A, B or C?”", output: "The options ranked, and what would flip it" },
  { id: "premortem", name: "What could go wrong?", tech: "Pre-mortem", when: "You've decided; stress-test it", output: "The top 5 ways it fails, each with a fix" },
];

export function FrameworkSheet({
  open,
  suggested,
  available,
  onClose,
  onRun,
  children,
}: {
  open: boolean;
  suggested: FrameworkId;
  available: FrameworkId[];
  onClose: () => void;
  onRun: (framework: FrameworkId) => void;
  /** Extra controls for the selected framework (the matrix setup editor). */
  children?: (framework: FrameworkId) => React.ReactNode;
}) {
  const [picked, setPicked] = useState<FrameworkId>(suggested);
  useEffect(() => {
    if (open) setPicked(available.includes(suggested) ? suggested : available[0]);
  }, [open, suggested, available]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fw-title"
        onClick={(e) => e.stopPropagation()}
        className="sheet-in max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 sm:max-w-xl sm:rounded-3xl sm:p-6"
      >
        <div className="eyebrow">Call the vote</div>
        <h2 id="fw-title" className="mt-1 font-serif text-2xl font-semibold">How should the table decide?</h2>
        <div className="mt-4 grid gap-2">
          {FRAMEWORKS.map((f) => {
            const disabled = !available.includes(f.id);
            const selected = picked === f.id;
            return (
              <button
                key={f.id}
                disabled={disabled}
                onClick={() => setPicked(f.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  selected ? "border-accent bg-accent/10" : "border-line hover:border-muted"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg font-semibold">{f.name}</span>
                  <span className="text-[0.7rem] uppercase tracking-[0.14em] text-muted">{f.tech}</span>
                  {f.id === suggested && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">Suggested</span>}
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  {f.when} → {f.output}
                </div>
              </button>
            );
          })}
        </div>
        {children?.(picked)}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="h-11 rounded-xl border border-line px-4 text-sm">
            Cancel
          </button>
          <button onClick={() => onRun(picked)} className="btn-primary h-11 rounded-md px-5">
            Run the vote
          </button>
        </div>
      </div>
    </div>
  );
}
