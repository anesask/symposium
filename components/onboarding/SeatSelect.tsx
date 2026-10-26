"use client";

import { useRef, useState } from "react";
import { PORTRAIT_FORMAT } from "@/config/art";
import { ROSTER, SEATABLE } from "@/config/roster";
import type { ThinkerId } from "@/lib/types";
import { sfx } from "@/lib/audio/engine";

const COLS = 3;
const STAT_LABELS = { boldness: "Boldness", rigor: "Rigor", heart: "Heart" } as const;

/** Character-select screen: a portrait grid, a featured fighter card and the seat slots. */
export function SeatSelect({
  seats,
  onToggle,
  onPlace,
  socrates,
  onSocrates,
  min,
  max,
  onDone,
}: {
  seats: ThinkerId[];
  onToggle: (id: ThinkerId) => void;
  onPlace: (id: ThinkerId, seat: number) => void;
  socrates: boolean;
  onSocrates: (on: boolean) => void;
  min: number;
  max: number;
  onDone: () => void;
}) {
  const [hover, setHover] = useState<ThinkerId>(seats[0] ?? SEATABLE[0]);
  const [flash, setFlash] = useState<ThinkerId | null>(null);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const [drag, setDrag] = useState<{ id: ThinkerId; fromSeat: boolean } | null>(null);
  const [overSeat, setOverSeat] = useState<number | null>(null);

  const startDrag = (e: React.DragEvent, id: ThinkerId, fromSeat: boolean) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDrag({ id, fromSeat });
    setHover(id);
  };
  const endDrag = () => {
    setDrag(null);
    setOverSeat(null);
  };
  const dropOnSeat = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (!drag) return;
    const isNew = !seats.includes(drag.id);
    onPlace(drag.id, i);
    sfx("seat");
    if (isNew) {
      setFlash(drag.id);
      setTimeout(() => setFlash((f) => (f === drag.id ? null : f)), 450);
    }
    endDrag();
  };
  const featured = ROSTER[hover];
  const featuredSeat = seats.indexOf(hover);

  const pick = (id: ThinkerId) => {
    setHover(id);
    if (!seats.includes(id) && seats.length >= max) return;
    onToggle(id);
    sfx(seats.includes(id) ? "unseat" : "seat");
    if (!seats.includes(id)) {
      setFlash(id);
      setTimeout(() => setFlash((f) => (f === id ? null : f)), 450);
    }
  };

  // Arrow keys move the cursor around the grid, like a fighting-game select screen.
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = SEATABLE.length;
    if ((e.key === "Delete" || e.key === "Backspace") && seats.includes(SEATABLE[i])) {
      e.preventDefault();
      onToggle(SEATABLE[i]);
      sfx("unseat");
      return;
    }
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + COLS, ArrowUp: i - COLS }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const j = (next + n) % n;
    tiles.current[j]?.focus();
    setHover(SEATABLE[j]);
  };

  return (
    <section className="bubble-in relative flex min-h-0 flex-1 flex-col py-2 sm:py-3">
      <div className="shrink-0 text-center">
        <div className="eyebrow hidden sm:block">Seat three to five</div>
        <h1 className="font-serif text-2xl font-semibold sm:text-4xl lg:text-[2.6rem]">Who sits at the table tonight?</h1>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-6 lg:gap-y-3">
        {/* Featured fighter */}
        <div key={hover} className="fighter-in flex shrink-0 items-center gap-3 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:flex-col lg:items-stretch lg:gap-1" aria-live="polite">
          <div className="w-16 shrink-0 self-start sm:w-32 lg:flex lg:min-h-0 lg:w-full lg:flex-1 lg:justify-center lg:self-auto lg:[container-type:size]">
          <div className="feather relative aspect-square w-full lg:w-[min(100cqw,100cqh)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/portraits/${hover}.${PORTRAIT_FORMAT}`} alt="" className="h-full w-full object-cover" />
                      </div>
          </div>
          <div className="min-w-0 flex-1 lg:flex-none lg:text-center">
            <div className="text-[0.75rem] uppercase tracking-[0.2em] text-gold">
              {featured.archetype}
              {featuredSeat >= 0 && <span className="text-muted"> · seat {featuredSeat + 1}</span>}
            </div>
            <div className="truncate font-serif text-2xl font-semibold leading-tight sm:text-4xl">{featured.name}</div>
            <div className="font-serif text-[1.05rem] italic text-ink/80 max-sm:hidden">
              {featured.move.name}: {featured.move.line.charAt(0).toLowerCase() + featured.move.line.slice(1)}
            </div>
            <dl className="mx-auto mt-1 max-w-xs space-y-0.5 max-sm:[@media(max-height:700px)]:hidden sm:mt-2">
              {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <dt className="w-16 text-left text-[0.65rem] uppercase tracking-[0.15em] text-muted">{STAT_LABELS[k]}</dt>
                  <dd className="flex flex-1 gap-1" aria-label={`${featured.stats[k]} of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className="stat-pip h-[3px] flex-1"
                        style={{ background: n <= featured.stats[k] ? "var(--color-gold)" : "var(--color-line)", animationDelay: `${n * 40}ms` }}
                      />
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mx-auto mt-1 max-w-xs text-[0.75rem] italic text-muted max-sm:hidden">Our playful reading of them, not history.</p>
          </div>
        </div>

        {/* Grid and guest */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center [container-type:size] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div
            onDragOver={(e) => drag?.fromSeat && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (drag?.fromSeat) {
                onToggle(drag.id);
                sfx("unseat");
              }
              endDrag();
            }}
            className="grid w-[min(100cqw,100cqh-4rem)] grid-cols-3 gap-2 sm:w-[min(100cqw,100cqh-4.75rem)] sm:gap-3"
            role="group"
            aria-label="Thinkers"
          >
            {SEATABLE.map((id, i) => {
              const t = ROSTER[id];
              const seat = seats.indexOf(id);
              const on = seat >= 0;
              const full = !on && seats.length >= max;
              return (
                <button
                  key={id}
                  ref={(el) => {
                    tiles.current[i] = el;
                  }}
                  onClick={() => pick(id)}
                  onMouseEnter={() => setHover(id)}
                  onFocus={() => setHover(id)}
                  onKeyDown={(e) => onKey(e, i)}
                  draggable
                  onDragStart={(e) => startDrag(e, id, false)}
                  onDragEnd={endDrag}
                  aria-pressed={on}
                  aria-label={`${t.name}, ${t.archetype}${on ? `, seat ${seat + 1}` : ""}`}
                  title={full ? `The table seats at most ${max}` : undefined}
                  className={`select-tile group relative aspect-square overflow-hidden rounded-md outline-none transition ${
                    on ? "ring-1 ring-gold/70" : hover === id ? "ring-1 ring-gold/30" : "ring-1 ring-white/5"
                  } ${flash === id ? "lock-flash" : ""} ${full ? "opacity-50" : ""}`}
                  style={{ ["--tile" as string]: t.accentColor }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/portraits/${id}.${PORTRAIT_FORMAT}`}
                    alt=""
                    draggable={false}
                    className={`h-full w-full object-cover transition duration-500 ease-out ${on ? "" : hover === id ? "brightness-90 saturate-[.7]" : "brightness-[.45] saturate-[.35]"}`}
                  />
                  <span className={`absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-1 pb-1.5 pt-6 text-center text-[0.65rem] uppercase tracking-[0.12em] min-[400px]:text-[0.72rem] sm:text-[0.8rem] ${on ? "text-ink" : "text-ink/60"}`}>
                    {t.name}
                  </span>
                  {on && (
                    <span className="vote-pop absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-gold/70 bg-black/70 font-caps text-xs text-gold">
                      {seat + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onSocrates(!socrates)}
            aria-pressed={socrates}
            className={`guest-card mt-2 flex w-[min(100cqw,100cqh-4rem)] shrink-0 items-center gap-3 rounded-md border p-1.5 text-left transition sm:mt-3 sm:w-[min(100cqw,100cqh-4.75rem)] sm:p-2 ${socrates ? "is-invited border-gold/50" : "border-dashed border-gold/25 hover:border-gold/45"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/portraits/socrates.${PORTRAIT_FORMAT}`} alt="" className={`h-9 w-9 rounded-full object-cover ring-2 sm:h-11 sm:w-11 ${socrates ? "ring-gold/70" : "ring-transparent grayscale opacity-60"}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-gold">Special guest</span>
              <span className="font-serif text-[1.1rem] font-semibold leading-tight">Socrates</span>
              <span className="ml-2 hidden text-sm italic text-muted sm:inline">one question per evening, never a vote</span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm ${socrates ? "text-gold" : "border border-line text-muted"}`}>{socrates ? "Invited ✓" : "Invite"}</span>
          </button>

        </div>

        {/* Seats */}
        <div className="shrink-0 lg:col-start-1 lg:row-start-2">
          <div className="hidden text-center text-[0.65rem] uppercase tracking-[0.15em] text-muted sm:block">{drag ? "Drop on a seat" : "Drag to a seat or click · keys: arrows, Enter, Delete"}</div>
          <div className="mt-1.5 hidden items-center justify-center gap-2 sm:flex" aria-label="Seats">
            {Array.from({ length: max }, (_, i) => {
              const id = seats[i];
              const target = {
                onDragOver: (e: React.DragEvent) => {
                  if (!drag) return;
                  e.preventDefault();
                  setOverSeat(i);
                },
                onDragLeave: () => setOverSeat((o) => (o === i ? null : o)),
                onDrop: (e: React.DragEvent) => dropOnSeat(e, i),
              };
              const ring = overSeat === i ? "seat-over" : drag ? "seat-ready" : "";
              return id ? (
                <button
                  key={id}
                  {...target}
                  draggable
                  onDragStart={(e) => startDrag(e, id, true)}
                  onDragEnd={endDrag}
                  onClick={() => {
                    onToggle(id);
                    sfx("unseat");
                  }}
                  onMouseEnter={() => setHover(id)}
                  title={`Unseat ${ROSTER[id].name}`}
                  className={`vote-pop relative aspect-square min-w-0 max-w-12 flex-1 cursor-grab overflow-hidden rounded-full border border-gold/70 transition sm:max-w-14 ${ring} ${drag?.id === id ? "opacity-40" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/portraits/${id}.${PORTRAIT_FORMAT}`} alt={ROSTER[id].name} draggable={false} className="h-full w-full object-cover" />
                </button>
              ) : (
                <div
                  key={`empty-${i}`}
                  {...target}
                  className={`flex aspect-square min-w-0 max-w-12 flex-1 items-center justify-center rounded-full border border-dashed border-gold/30 font-caps text-xs text-muted transition sm:max-w-14 ${ring}`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>

          <p className="mb-1.5 text-center text-sm text-muted sm:hidden">
            {seats.length} of {max} seated · tap a portrait to seat or unseat
          </p>
          <button
            onClick={onDone}
            disabled={seats.length < min || seats.length > max}
            className="btn-primary h-11 w-full rounded-md text-base sm:mt-3 sm:h-12"
          >
            {seats.length < min ? `Pick ${min - seats.length} more` : "Seat them"}
          </button>
        </div>
      </div>
    </section>
  );
}
