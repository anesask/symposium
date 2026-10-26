import { ROSTER } from "@/config/roster";
import type { VoteResult } from "@/lib/types";

/** "What changed minds": every vote that moved during the debate, with who/what moved it. */
export function ChangedMinds({ result }: { result: VoteResult }) {
  if (!result.changes.length) return null;
  const byThinker = new Map<string, typeof result.changes>();
  for (const c of result.changes) byThinker.set(c.thinkerId, [...(byThinker.get(c.thinkerId) ?? []), c]);
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="eyebrow mb-3">What changed minds</div>
      <ul className="space-y-3 text-sm">
        {[...byThinker.entries()].map(([id, cs]) => (
          <li key={id}>
            <span className="font-semibold">{ROSTER[cs[0].thinkerId].name}</span>{" "}
            <span className="text-muted">
              moved {cs.map((c) => `“${c.what}” ${c.from} → ${c.to}`).join(", ")}
            </span>
            {cs[0].because && <div className="mt-0.5 italic text-ink/85">“{cs[0].because}”</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}
