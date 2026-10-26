"use client";

import { useEffect, useState } from "react";
import { ROOM } from "@/config/rooms";
import type { RoomId, ThinkerId } from "@/lib/types";
import { Portrait } from "@/components/table/Portrait";
import { SeatSelect } from "./SeatSelect";
import { pickExamples, suggestTable } from "@/config/questions";
import { ROSTER } from "@/config/roster";

export const MIN_SEATS = 3;
export const MAX_SEATS = 5;

export function Onboarding({
  onStart,
  disabled,
}: {
  onStart: (input: { roomId: RoomId; seats: ThinkerId[]; question: string; socratesEnabled: boolean }) => void;
  disabled?: boolean;
}) {
  const [step, setStep] = useState<0 | 1>(0);
  const [seats, setSeats] = useState<ThinkerId[]>(ROOM.defaultSeats);
  const [socrates, setSocrates] = useState(true);
  const [question, setQuestion] = useState("");
  const topics = useTopics(step === 1);
  // Three fresh example questions per visit, one of each kind (picked after mount, so the server and browser agree).
  const [examples, setExamples] = useState<string[]>(ROOM.examples);
  useEffect(() => setExamples(pickExamples()), []);
  // Who would suit this question, if they aren't seated yet.
  const suggestion = suggestTable(question);
  const missing = suggestion ? suggestion.ids.filter((id) => !seats.includes(id)) : [];
  const seatSuggested = () => {
    if (!suggestion) return;
    const next = [...seats];
    for (const id of missing) {
      if (next.length < MAX_SEATS) next.push(id);
      else {
        const j = next.map((x, k) => [x, k] as const).reverse().find(([x]) => !suggestion.ids.includes(x))?.[1];
        if (j !== undefined) next[j] = id;
      }
    }
    setSeats(next);
  };

  const toggleSeat = (id: ThinkerId) =>
    setSeats((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_SEATS ? [...s, id] : s));

  // Drag and drop: put a thinker in seat i (moving them if seated, replacing the occupant if the table is full).
  const placeSeat = (id: ThinkerId, i: number) =>
    setSeats((s) => {
      const next = s.filter((x) => x !== id);
      if (next.length >= MAX_SEATS) next[Math.min(i, MAX_SEATS - 1)] = id;
      else next.splice(Math.min(i, next.length), 0, id);
      return next;
    });

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto px-3 py-2 sm:px-6 sm:py-4">
      <ol className="mb-2 flex shrink-0 gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-muted" aria-label="Steps">
        {["Seats", "Question"].map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button onClick={() => i < step && setStep(i as 0 | 1)} className={`${i === step ? "text-accent" : i < step ? "text-ink hover:text-accent" : ""}`} disabled={i > step}>
              {i + 1}. {label}
            </button>
            {i < 1 && <span aria-hidden>›</span>}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <SeatSelect seats={seats} onToggle={toggleSeat} onPlace={placeSeat} socrates={socrates} onSocrates={setSocrates} min={MIN_SEATS} max={MAX_SEATS} onDone={() => setStep(1)} />
      )}

      {step === 1 && (
        <section className="bubble-in">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <ul className="flex flex-wrap gap-1" aria-label="Your table">
              {seats.map((id) => (
                <li key={id} className="flex w-[4.75rem] flex-col items-center text-center">
                  <Portrait id={id} size={56} />
                  <span className="mt-1 w-full truncate text-[0.72rem] uppercase tracking-[0.1em] text-muted">{ROSTER[id].shortName}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setStep(0)} className="mb-5 text-sm text-gold underline-offset-4 hover:underline">
              Change the table
            </button>
          </div>
          <div className="eyebrow mt-4">Ask them anything</div>
          <h1 className="mt-1 font-serif text-4xl font-bold leading-tight sm:text-5xl">What should the table argue about?</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim() && !disabled) onStart({ roomId: ROOM.id, seats, question: question.trim(), socratesEnabled: socrates });
            }}
          >
            <textarea
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={3}
              placeholder="Should I…"
              className="mt-6 w-full resize-none rounded-2xl border border-line bg-surface px-5 py-4 font-serif text-2xl text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  type="button"
                  key={ex}
                  onClick={() => setQuestion(ex)}
                  className="rounded-full border border-line px-3.5 py-1.5 text-left text-sm text-ink/90 hover:border-accent"
                >
                  {ex}
                </button>
              ))}
            </div>
            {suggestion && missing.length > 0 && (
              <div className="bubble-in mt-4 flex flex-wrap items-center gap-3 rounded-md border border-gold/25 bg-black/25 px-3 py-2">
                <div className="flex -space-x-2">
                  {missing.map((id) => (
                    <Portrait key={id} id={id} size={32} className="ring-2 ring-bg" />
                  ))}
                </div>
                <span className="mr-auto text-[0.95rem] text-ink/85">
                  For a question about {suggestion.topic}, {missing.map((id) => ROSTER[id].name).join(" and ")} would bring a lot.
                </span>
                <button type="button" onClick={seatSuggested} className="h-9 rounded-md border border-gold/40 px-3 text-sm text-gold hover:bg-gold/10">
                  Seat {missing.length > 1 ? "them" : ROSTER[missing[0]].shortName}
                </button>
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="submit"
                disabled={!question.trim() || disabled}
                className="btn-primary h-11 rounded-md px-6"
              >
                Take it to the table
              </button>
            </div>
            {topics.length > 0 && (
              <div className="mt-8">
                <div className="eyebrow">From today&apos;s news</div>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {topics.map((t) => (
                    <li key={t.link} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setQuestion(t.question)}
                        className="w-full rounded-md border border-line bg-black/20 px-3.5 py-2 text-left transition hover:border-gold/50"
                      >
                        <span className="block text-[1.02rem] leading-snug text-ink">{t.question}</span>
                        <span className="mt-0.5 block truncate text-[0.8rem] text-muted">
                          {t.source}: {t.headline}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        </section>
      )}
    </div>
  );
}

interface Topic {
  question: string;
  headline: string;
  source: string;
  link: string;
}

/** Personal questions drawn from today's headlines (/api/topics); empty if the feeds or the model are unavailable. */
function useTopics(active: boolean): Topic[] {
  const [topics, setTopics] = useState<Topic[]>([]);
  useEffect(() => {
    if (!active || topics.length) return;
    const ctrl = new AbortController();
    fetch("/api/topics", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { topics: [] }))
      .then((d: { topics: Topic[] }) => setTopics(d.topics ?? []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [active, topics.length]);
  return topics;
}
