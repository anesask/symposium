"use client";

import { useEffect, useState } from "react";
import { useTable } from "@/lib/store/session";
import { sessionBrief, toTranscript } from "@/lib/store/reducer";
import type { MatrixSetup } from "@/lib/types";

/** Fetches the proposed options + weighted criteria and lets the user edit them before the vote. */
export function MatrixSetupEditor({ value, onChange }: { value: MatrixSetup | null; onChange: (v: MatrixSetup | null) => void }) {
  const { state } = useTable();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (value || !state.session) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/vote/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionBrief(state.session), transcript: toTranscript(state.session) }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message ?? "Couldn't propose options.");
        if (!cancelled) onChange(data);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (loading) return <div className="mt-4 animate-pulse rounded-2xl border border-line p-4 text-sm text-muted">The moderator is laying out the options…</div>;
  if (error)
    return (
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-nogo/40 bg-nogo/10 p-4 text-sm">
        <span>{error}</span>
        <button onClick={() => setAttempt((a) => a + 1)} className="rounded-full border border-line px-3 py-1">
          Retry
        </button>
      </div>
    );
  if (!value) return null;

  const set = (patch: Partial<MatrixSetup>) => onChange({ ...value, ...patch });
  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-line p-4">
      <div>
        <div className="eyebrow mb-2">Options</div>
        <div className="flex flex-wrap gap-2">
          {value.options.map((o, i) => (
            <span key={o.id} className="flex items-center gap-1 rounded-full border border-line bg-surface-2 pl-3 pr-1">
              <input
                value={o.label}
                aria-label={`Option ${i + 1}`}
                onChange={(e) => set({ options: value.options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })}
                className="w-28 bg-transparent py-1 text-sm focus:outline-none"
              />
              {value.options.length > 2 && (
                <button onClick={() => set({ options: value.options.filter((x) => x.id !== o.id) })} aria-label={`Remove ${o.label}`} className="px-1.5 text-muted hover:text-ink">
                  ×
                </button>
              )}
            </span>
          ))}
          {value.options.length < 4 && (
            <button
              onClick={() => set({ options: [...value.options, { id: `option-${Date.now()}`, label: "New option" }] })}
              className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted hover:text-ink"
            >
              + option
            </button>
          )}
        </div>
      </div>
      <div>
        <div className="eyebrow mb-2">Criteria · weight</div>
        <ul className="space-y-1.5">
          {value.criteria.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <input
                value={c.label}
                aria-label="Criterion"
                onChange={(e) => set({ criteria: value.criteria.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) })}
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm hover:border-line focus:border-accent focus:outline-none"
              />
              <span className="flex gap-1" role="radiogroup" aria-label={`Weight for ${c.label}`}>
                {[1, 2, 3, 4, 5].map((w) => (
                  <button
                    key={w}
                    role="radio"
                    aria-checked={c.weight === w}
                    aria-label={`${w}`}
                    onClick={() => set({ criteria: value.criteria.map((x) => (x.id === c.id ? { ...x, weight: w } : x)) })}
                    className={`h-5 w-5 rounded-full border text-[0.6rem] ${w <= c.weight ? "border-accent bg-accent text-[#1a1208]" : "border-line text-muted"}`}
                  >
                    {w === c.weight ? w : ""}
                  </button>
                ))}
              </span>
              {value.criteria.length > 2 && (
                <button onClick={() => set({ criteria: value.criteria.filter((x) => x.id !== c.id) })} aria-label={`Remove ${c.label}`} className="text-muted hover:text-ink">
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
