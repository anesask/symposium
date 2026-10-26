"use client";

import { ROSTER } from "@/config/roster";
import type { ThinkerId, VoteTag as Tag } from "@/lib/types";
import { Portrait } from "./Portrait";
import { VoteTag } from "./VoteTag";

/** Seat positions on the table's rim, as % of the stage, starting at the top and going round. */
function seatPositions(n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: 50 + Math.cos(a) * 34, y: 47 + Math.sin(a) * 34 };
  });
}

export function RoundTable({
  seats,
  speakingId,
  tags,
  showTags,
  socrates,
  onPick,
  focusId,
  addressedId,
}: {
  seats: ThinkerId[];
  speakingId?: ThinkerId;
  /** The 1:1 partner: stays lit while everyone else steps back. */
  focusId?: ThinkerId;
  /** The thinker being answered in a rebuttal: stays lit, with a gold ring. */
  addressedId?: ThinkerId;
  tags: Partial<Record<ThinkerId, Tag>>;
  showTags: boolean;
  /** "hidden" | "present" (summoned, at the edge) | "speaking" */
  socrates: "hidden" | "present" | "speaking";
  onPick: (id: ThinkerId) => void;
}) {
  const pos = seatPositions(seats.length);
  const lit = speakingId ?? focusId;
  const speakerAt = lit ? seats.indexOf(lit) : -1;
  return (
    <>
      {/* Desktop / tablet: the table from above */}
      {/* Sized to the space it has: the parent is a size container on desktop (cqh), capped by --table-max. */}
      <div
        className="relative mx-auto hidden aspect-[1.15] [--table-max:440px] sm:block lg:[--table-max:640px]"
        style={{ width: "min(100%, var(--table-max), calc(100cqh * 1.15))" }}
        aria-label="The table"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scenes/table.webp" alt="" className="pointer-events-none absolute left-1/2 top-[47%] aspect-square w-[80%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_30px_50px_rgba(0,0,0,.7)]" />
        {/* A pool of lamplight on whoever is speaking. */}
        <div
          aria-hidden
          className="spotlight pointer-events-none absolute aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500"
          style={speakerAt >= 0 ? { left: `${pos[speakerAt].x}%`, top: `${pos[speakerAt].y}%`, opacity: 1 } : { left: "50%", top: "47%", opacity: 0 }}
        />
        {seats.map((id, i) => (
          <Seat
            key={id}
            id={id}
            x={pos[i].x}
            y={pos[i].y}
            speaking={speakingId === id}
            dim={Boolean(lit) && lit !== id && addressedId !== id}
            addressed={addressedId === id && lit !== id}
            tag={showTags ? tags[id] : undefined}
            onPick={onPick}
            size="22%"
          />
        ))}
        {socrates !== "hidden" && (
          <div className="bubble-in absolute right-0 top-[8%] flex flex-col items-center" title="Socrates, the guest">
            <Portrait id="socrates" size={64} speaking={socrates === "speaking"} />
            <span className="mt-1 rounded-full bg-black/70 px-2 py-0.5 text-[0.7rem]">Socrates</span>
          </div>
        )}
      </div>

      {/* Mobile: a row of portraits */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:hidden" aria-label="The table">
        {seats.map((id) => (
          <button key={id} onClick={() => onPick(id)} className="flex w-[72px] shrink-0 flex-col items-center gap-1">
            <Portrait id={id} size={60} speaking={speakingId === id} dim={Boolean(lit) && lit !== id && addressedId !== id} className={addressedId === id && lit !== id ? "addressed-ring" : ""} />
            <span className="w-full truncate text-center text-[0.7rem]">{ROSTER[id].shortName}</span>
            {showTags && tags[id] ? <VoteTag vote={tags[id]!} className="!px-1.5 !text-[0.6rem]" /> : <span className="h-[18px]" />}
          </button>
        ))}
        {socrates !== "hidden" && (
          <div className="flex w-[72px] shrink-0 flex-col items-center gap-1 opacity-90">
            <Portrait id="socrates" size={60} speaking={socrates === "speaking"} />
            <span className="text-[0.7rem]">Socrates</span>
          </div>
        )}
      </div>
    </>
  );
}

function Seat({
  id,
  x,
  y,
  speaking,
  dim,
  addressed,
  tag,
  onPick,
  size,
}: {
  id: ThinkerId;
  x: number;
  y: number;
  speaking: boolean;
  /** Someone else is speaking: step back. */
  dim: boolean;
  addressed?: boolean;
  tag?: Tag;
  onPick: (id: ThinkerId) => void;
  size: string;
}) {
  const t = ROSTER[id];
  return (
    <button
      onClick={() => onPick(id)}
      title={`Address ${t.name}`}
      className={`group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[scale,opacity,filter] duration-300 focus:outline-none ${
        speaking ? "z-10 scale-[1.16]" : dim ? "scale-95 opacity-45 saturate-[.35]" : ""
      }`}
      style={{ left: `${x}%`, top: `${y}%`, width: size }}
    >
      <span
        className={`block aspect-square w-full rounded-full p-[3px] transition ${speaking ? "speaking-ring" : addressed ? "addressed-ring" : "group-hover:ring-2 group-hover:ring-accent/60"}`}
        style={{ background: "linear-gradient(145deg,#c9a45c,#5a3d1c 55%,#2a1a0e)" }}
      >
        <Portrait id={id} size="fill" />
      </span>
      <span
        className={`-mt-2.5 whitespace-nowrap rounded-sm border px-3 py-0.5 font-caps text-[0.9rem] tracking-[0.08em] shadow-lg transition-colors ${
          speaking ? "border-gold bg-[#2a1b10] text-gold" : "border-gold/30 bg-[#0e0a08]/90 text-ink"
        }`}
      >
        {t.name}
      </span>
      <span className="mt-1.5 h-6">{tag && <VoteTag vote={tag} className="!px-3 !py-1 !text-[0.75rem]" />}</span>
    </button>
  );
}
