"use client";

import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import type { Message } from "@/lib/types";

/**
 * Pen and papyrus: replies are written out at a steady handwriting pace, one message after
 * another, however fast the model streams them. Messages already on screen when the table
 * opens (a restored session) appear in full.
 */

export interface Reveal {
  /** Characters of this message to show, or null if it hasn't been reached yet. */
  shown: (id: string) => number | null;
  /** The message the quill is on right now. */
  writingId?: string;
  revealed: (id: string) => boolean;
  /** Skip the handwriting for this message: show it in full as it arrives. */
  finish: (id: string) => void;
}

const PACED = new Set<Message["kind"]>(["thinker", "poll"]);
const Ctx = createContext<Reveal>({ shown: () => Infinity, revealed: () => true, finish: () => {} });
export const RevealContext = Ctx;
export const useReveal = () => useContext(Ctx);

/** `cps` is characters per second; 0 shows everything at once. */
export function useRevealPacer(messages: Message[], cps: number, sessionId?: string): Reveal {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const progress = useRef<Map<string, number> | null>(null);
  const latest = useRef(messages);
  latest.current = messages;
  const speed = useRef(cps);
  speed.current = cps;
  const skipped = useRef(new Set<string>());

  const forSession = useRef<string | undefined>(undefined);
  if (progress.current === null || forSession.current !== sessionId) {
    if (progress.current === null) progress.current = new Map();
    progress.current.clear();
    for (const m of messages) progress.current.set(m.id, Infinity);
    forSession.current = sessionId;
  }
  const p = progress.current;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let changed = false;
      // Advance the first message that isn't fully written; everything after it waits.
      for (const m of latest.current) {
        const seen = p.get(m.id);
        if (seen === Infinity) continue;
        const at = seen ?? 0;
        const finished = m.status !== "streaming";
        // Fully written (or empty, like the verdict line): mark it done and move on.
        if (at >= m.text.length && finished) {
          p.set(m.id, Infinity);
          changed = true;
          continue;
        }
        if (seen === undefined) {
          p.set(m.id, 0);
          changed = true;
        }
        if (!PACED.has(m.kind) || speed.current <= 0 || skipped.current.has(m.id)) {
          p.set(m.id, finished ? Infinity : m.text.length);
        } else {
          // Write faster when far behind, so long speeches never lag by more than a few seconds.
          const behind = m.text.length - at;
          const rate = speed.current * (behind > 500 ? 3 : behind > 250 ? 1.8 : 1);
          const next = Math.min(m.text.length, at + rate * dt);
          if (Math.floor(next) !== Math.floor(at)) changed = true;
          p.set(m.id, next >= m.text.length && finished ? Infinity : next);
        }
        if (p.get(m.id) === Infinity) changed = true;
        break;
      }
      if (changed) tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [p]);

  const writing = messages.find((m) => {
    const at = p.get(m.id);
    return at !== undefined && at !== Infinity;
  });
  return {
    shown: (id) => {
      const at = p.get(id);
      return at === undefined ? null : Math.floor(at);
    },
    writingId: writing?.id,
    revealed: (id) => p.get(id) === Infinity,
    finish: (id) => skipped.current.add(id),
  };
}

/** True when the operating system asks for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
