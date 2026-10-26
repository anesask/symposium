"use client";

import { useEffect, useRef, useState } from "react";
import { useTable } from "@/lib/store/session";
import { uid } from "@/lib/store/reducer";
import { DEMO_SESSION, DEMO_SETUP, demoScript, demoTag } from "./script";

const WORD_MS = 55;
const POLL_GAP_MS = 900;

/** Plays the scripted demo through the same store and UI as live mode. No network. */
export function useDemoPlayer(enabled: boolean) {
  const api = useTable();
  // The store API is rebuilt on every render; the player must not restart because of that.
  const apiRef = useRef(api);
  apiRef.current = api;
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Per-run token: strict mode runs effects twice, and each run must stop its own loop.
    const cancelled = { current: false };
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const dispatch: typeof api.dispatch = (a) => apiRef.current.dispatch(a);
    const apply: typeof api.apply = (e) => apiRef.current.apply(e);
    const startSession: typeof api.startSession = (i) => apiRef.current.startSession(i);

    (async () => {
      setPlaying(true);
      dispatch({ type: "reset" });
      await sleep(50);
      startSession(DEMO_SESSION);
      for (const step of demoScript()) {
        // A recording can hold the demo between steps (window.__demoPause), so the narration keeps up.
        while ((window as unknown as { __demoPause?: boolean }).__demoPause && !cancelled.current) await sleep(100);
        if (cancelled.current) return;
        switch (step.kind) {
          case "wait":
            await sleep(step.ms);
            break;
          case "type":
            dispatch({ type: "user_message", message: { id: uid(), kind: "user", text: step.text, status: "done" } });
            await sleep(500);
            break;
          case "events":
            step.events.forEach(apply);
            break;
          case "summary":
            dispatch({ type: "add_message", message: { id: uid(), kind: "moderator", text: "", status: "done", summary: step.summary } });
            break;
          case "speak": {
            const messageId = uid();
            apply({ type: "speaker_start", messageId, speakerId: step.speakerId, resultId: step.resultId, replyTo: step.replyTo });
            await sleep(450);
            const words = step.text.split(/(?<=\s)/);
            for (const w of words) {
              if (cancelled.current) return;
              apply({ type: "delta", messageId, text: w });
              await sleep(WORD_MS);
            }
            apply({ type: "speaker_end", messageId });
            await sleep(700);
            break;
          }
          case "vote": {
            if (step.whatIf) dispatch({ type: "fact", message: { id: uid(), kind: "fact", text: step.whatIf, status: "done" } });
            dispatch({ type: "begin_vote", resultId: step.resultId, framework: "gate", trigger: step.whatIf ? "rerun" : "vote", whatIf: step.whatIf });
            apply({ type: "phase", resultId: step.resultId, phase: "setup", framework: "gate" });
            await sleep(900);
            apply({ type: "setup", resultId: step.resultId, setup: DEMO_SETUP });
            apply({ type: "phase", resultId: step.resultId, phase: "scores", framework: "gate" });
            for (const s of step.initial) {
              await sleep(450);
              apply({ type: "score", resultId: step.resultId, score: s, voteTag: demoTag(s) });
            }
            await sleep(800);
            apply({ type: "phase", resultId: step.resultId, phase: "debate", framework: "gate" });
            break;
          }
          case "revise":
            apply({
              type: "score_changed",
              resultId: step.resultId,
              thinkerId: step.score.thinkerId,
              score: step.score,
              voteTag: demoTag(step.score),
              changes: step.changes,
            });
            await sleep(600);
            break;
          case "poll":
            apply({ type: "phase", resultId: step.resultId, phase: "poll", framework: "gate" });
            for (const l of step.lines) {
              if (cancelled.current) return;
              const s = step.scores.find((x) => x.thinkerId === l.thinkerId);
              apply({ type: "poll_line", resultId: step.resultId, messageId: uid(), thinkerId: l.thinkerId, text: l.text, voteTag: demoTag(s!) });
              await sleep(POLL_GAP_MS);
            }
            break;
          case "result":
            apply({ type: "phase", resultId: step.result.id, phase: "result", framework: "gate" });
            await sleep(400);
            apply({ type: "result", result: { ...step.result, createdAt: Date.now() } });
            break;
        }
      }
      setPlaying(false);
    })();

    return () => {
      cancelled.current = true;
    };
  }, [enabled, run]);

  return { playing, replay: () => setRun((r) => r + 1) };
}
