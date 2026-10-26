"use client";

import { ROOM_ART } from "@/config/art";
import { useTable } from "@/lib/store/session";
import { Seal } from "./VerdictParts";

/** The verdict: written on an unrolled papyrus scroll, with its rods at top and bottom. */
export function VerdictShell({ children, roomArt = false }: { children: React.ReactNode; roomArt?: boolean }) {
  const { state } = useTable();
  const room = state.session?.roomId ?? "boardroom";
  const art = roomArt && ROOM_ART[room].verdict;
  return (
    <section
      className="scroll-sheet relative mx-2 my-3 px-5 py-6 sm:px-8 sm:py-8"
      style={
        art
          ? { backgroundImage: `linear-gradient(180deg, rgba(20,18,16,.92) 35%, rgba(20,18,16,.55)), url(/rooms/${room}-verdict.jpg)`, backgroundSize: "cover", backgroundPosition: "bottom" }
          : undefined
      }
    >
      {children}
      <Seal />
      <span aria-hidden className="scroll-rod top" />
      <span aria-hidden className="scroll-rod" />
    </section>
  );
}
