"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { readEvents } from "@/lib/sse";
import { ROSTER } from "@/config/roster";
import type { FrameworkId, MatrixSetup, ServerEvent, ThinkerId } from "@/lib/types";
import { initialState, newSession, reducer, sessionBrief, toTranscript, uid, type Action, type Session, type State } from "./reducer";

const STORAGE_KEY = "symposium:session:v1";

interface Api {
  state: State;
  dispatch: (a: Action) => void;
  startSession: (input: Parameters<typeof newSession>[0]) => void;
  send: (text: string, tag?: ThinkerId) => Promise<void>;
  /** Another table turn with no new message from the user. */
  keepArguing: () => Promise<void>;
  /** The moderator sums up: agreements, disagreements, unknowns (and picks up facts). */
  summarize: () => Promise<void>;
  retry: (messageId: string) => Promise<void>;
  callVote: (framework: FrameworkId, opts?: { matrixSetup?: MatrixSetup; whatIf?: string }) => Promise<void>;
  newQuestion: () => void;
  /** Replays a stream of events into the store (used by demo mode). */
  apply: (event: ServerEvent) => void;
  demo: boolean;
}

const Ctx = createContext<Api | null>(null);

export function SessionProvider({ children, demo = false }: { children: ReactNode; demo?: boolean }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const loaded = useRef(false);

  // Restore on mount (not in demo mode: the demo always starts fresh).
  useEffect(() => {
    if (!demo) dispatch({ type: "restore", session: loadSession() });
    loaded.current = true;
  }, [demo]);

  // Debounced save.
  useEffect(() => {
    if (!loaded.current || demo) return;
    const t = setTimeout(() => saveSession(state.session), 400);
    return () => clearTimeout(t);
  }, [state.session, demo]);

  const busyRef = useRef(false);
  const run = useCallback(async (url: string, body: unknown) => {
    busyRef.current = true;
    dispatch({ type: "busy", busy: true });
    try {
      for await (const event of readEvents(url, body)) dispatch({ type: "event", event });
    } catch (err) {
      dispatch({
        type: "event",
        event: { type: "error", code: "failed", message: navigator.onLine ? "Lost the connection to the table." : "You're offline." },
      });
      // Anything still streaming is now a failed bubble with Retry.
      const s = stateRef.current.session;
      s?.messages.filter((m) => m.status === "streaming").forEach((m) =>
        dispatch({ type: "event", event: { type: "speaker_error", messageId: m.id, error: String(err) } }),
      );
    } finally {
      busyRef.current = false;
      dispatch({ type: "busy", busy: false });
    }
  }, []);

  const send = useCallback(
    async (text: string, tag?: ThinkerId) => {
      const s = stateRef.current.session;
      if (!s || !text.trim() || busyRef.current) return;
      const message = { id: uid(), kind: "user" as const, text: text.trim(), status: "done" as const, oneOnOne: s.oneOnOne };
      dispatch({ type: "user_message", message });
      const next = { ...s, messages: [...s.messages, message] };
      await run("/api/talk", { session: sessionBrief(next), transcript: toTranscript(next), ...(s.oneOnOne ? { oneOnOne: s.oneOnOne } : { tag }) });
    },
    [run],
  );

  const keepArguing = useCallback(async () => {
    const s = stateRef.current.session;
    if (!s || busyRef.current) return;
    await run("/api/talk", { session: sessionBrief(s), transcript: toTranscript(s), continueDebate: true });
  }, [run]);

  const summarize = useCallback(async () => {
    const s = stateRef.current.session;
    if (!s || busyRef.current) return;
    busyRef.current = true;
    dispatch({ type: "busy", busy: true });
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionBrief(s), transcript: toTranscript(s) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message ?? "The moderator couldn't sum up.");
      const lines = [
        d.agree.length ? `They agree: ${d.agree.join(" ")}` : "",
        d.disagree.length ? `They disagree: ${d.disagree.join(" ")}` : "",
        d.unknown.length ? `Still unknown: ${d.unknown.join(" ")}` : "",
      ].filter(Boolean);
      dispatch({
        type: "add_message",
        message: { id: uid(), kind: "moderator", text: lines.join("\n"), status: "done", summary: { agree: d.agree, disagree: d.disagree, unknown: d.unknown } },
      });
      if (d.facts?.length) dispatch({ type: "event", event: { type: "facts", facts: d.facts } });
    } catch (err) {
      dispatch({ type: "event", event: { type: "error", code: "failed", message: err instanceof Error ? err.message : "The moderator couldn't sum up." } });
    } finally {
      busyRef.current = false;
      dispatch({ type: "busy", busy: false });
    }
  }, []);

  const retry = useCallback(
    async (messageId: string) => {
      const s = stateRef.current.session;
      const m = s?.messages.find((x) => x.id === messageId);
      if (!s || !m?.speakerId || busyRef.current) return;
      dispatch({ type: "drop_message", messageId });
      const next = { ...s, messages: s.messages.filter((x) => x.id !== messageId) };
      await run("/api/talk", { session: sessionBrief(next), transcript: toTranscript(next), only: m.speakerId });
    },
    [run],
  );

  const callVote = useCallback(
    async (framework: FrameworkId, opts?: { matrixSetup?: MatrixSetup; whatIf?: string }) => {
      const s = stateRef.current.session;
      if (!s || busyRef.current) return;
      const resultId = uid();
      const previous = s.results.find((r) => r.id === s.activeResultId);
      const fact = opts?.whatIf ? { id: uid(), kind: "fact" as const, text: opts.whatIf, status: "done" as const } : null;
      if (fact) dispatch({ type: "fact", message: fact });
      dispatch({ type: "begin_vote", resultId, framework, trigger: opts?.whatIf ? "rerun" : "vote", whatIf: opts?.whatIf });
      const next = fact ? { ...s, messages: [...s.messages, fact] } : s;
      await run("/api/vote", {
        session: sessionBrief(next),
        transcript: toTranscript(next),
        framework,
        resultId,
        matrixSetup: opts?.matrixSetup,
        whatIf: opts?.whatIf,
        previous: opts?.whatIf && previous?.framework === framework ? previous : undefined,
      });
      // If the vote ended without a result, drop the live vote (the reducer sees the latest state).
      dispatch({ type: "end_vote", resultId });
    },
    [run],
  );

  const api = useMemo<Api>(
    () => ({
      state,
      dispatch,
      startSession: (input) => {
        const session = newSession(input);
        dispatch({ type: "start_session", session });
        // The question is the first user message: the table answers it straight away.
        if (!demo) void run("/api/talk", { session: sessionBrief(session), transcript: toTranscript(session) });
      },
      send,
      keepArguing,
      summarize,
      retry,
      callVote,
      newQuestion: () => {
        saveSession(null);
        dispatch({ type: "reset" });
      },
      apply: (event) => dispatch({ type: "event", event }),
      demo,
    }),
    [state, send, keepArguing, summarize, retry, callVote, demo, run],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useTable(): Api {
  const api = useContext(Ctx);
  if (!api) throw new Error("useTable must be used inside <SessionProvider>");
  return api;
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    // Sessions saved with an older roster can't be continued: start fresh.
    if (!s.seats?.every((id) => id in ROSTER)) return null;
    // Anything that was mid-stream when the tab closed comes back as failed with Retry.
    return {
      ...s,
      roomId: "boardroom", // sessions saved before the single-scene change
      vote: undefined,
      mode: s.results.length && s.activeResultId ? "results" : "talk",
      messages: s.messages.map((m) => (m.status === "streaming" ? { ...m, status: "failed" } : m)),
    };
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
