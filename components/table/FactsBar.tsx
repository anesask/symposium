"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * What the table knows about you: facts the moderator picked out of your messages, which you
 * can correct or add to. Every thinker and every vote sees them.
 */
export function FactsBar({ facts, onChange, readOnly = false }: { facts: string[]; onChange: (facts: string[]) => void; readOnly?: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="mx-auto mt-2 flex max-w-[40rem] shrink-0 flex-wrap items-center justify-center gap-1.5 text-[0.9rem]">
      {facts.length > 0 && <span className="text-[0.7rem] uppercase tracking-[0.18em] text-muted">They know</span>}
      {facts.slice(0, 5).map((f) => (
        <span key={f} className="max-w-[16rem] truncate rounded-full border border-gold/25 bg-black/30 px-2.5 py-0.5 text-ink/85" title={f}>
          {f}
        </span>
      ))}
      {facts.length > 5 && <span className="text-muted">+{facts.length - 5}</span>}
      {!readOnly && (
        <button onClick={() => setEditing(true)} className="rounded-full px-2 py-0.5 text-gold underline-offset-4 hover:underline">
          {facts.length ? "Edit" : "+ Add a fact they should know"}
        </button>
      )}
      {editing && createPortal(<FactsDialog facts={facts} onClose={() => setEditing(false)} onSave={onChange} />, document.body)}
    </div>
  );
}

function FactsDialog({ facts, onClose, onSave }: { facts: string[]; onClose: () => void; onSave: (facts: string[]) => void }) {
  const [rows, setRows] = useState<string[]>(facts.length ? facts : [""]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const save = () => {
    onSave(rows.map((r) => r.trim()).filter(Boolean));
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="facts-title"
        onClick={(e) => e.stopPropagation()}
        className="sheet-in max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-gold/30 bg-surface px-5 py-4 shadow-2xl"
      >
        <h2 id="facts-title" className="font-serif text-2xl font-semibold">
          What the table knows
        </h2>
        <p className="mt-0.5 text-sm italic text-muted">The moderator picks these up from what you say. Correct them or add your own; every thinker and every vote uses them.</p>
        <ul className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="flex gap-2">
              <input
                autoFocus={i === rows.length - 1 && !r}
                value={r}
                maxLength={120}
                placeholder="e.g. €5,000 saved"
                onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? e.target.value : x)))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setRows((rs) => [...rs, ""]))}
                className="h-10 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-ink placeholder:text-muted/60 focus:border-gold/60 focus:outline-none"
              />
              <button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove" className="h-10 w-10 shrink-0 rounded-md border border-line text-muted hover:text-ink">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => setRows((rs) => [...rs, ""])} disabled={rows.length >= 12} className="mt-2 text-sm text-gold hover:underline disabled:opacity-40">
          + Add a fact
        </button>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 rounded-md border border-line px-4">
            Cancel
          </button>
          <button onClick={save} className="btn-primary h-10 rounded-md px-5">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
