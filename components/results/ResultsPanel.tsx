"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { compareResults } from "@/lib/frameworks/diff";
import { useTable } from "@/lib/store/session";
import type { MatrixSetup, VoteResult } from "@/lib/types";
import { VoteTag } from "@/components/table/VoteTag";
import { FRAMEWORKS } from "@/components/vote/FrameworkSheet";
import { ResultCard } from "./ResultCard";
import { sfx } from "@/lib/audio/engine";
import { useReveal } from "@/lib/store/reveal";
import { speak, stopSpeaking, verdictSpeech, verdictText } from "@/lib/voice/speak";
import { voteLabel } from "@/components/table/VoteTag";
import { useSettings } from "@/lib/settings";
import { useServerConfig } from "@/lib/useServerConfig";

export function headline(r: VoteResult): string {
  const c = r.computed;
  if (c.framework === "gate") return c.verdict;
  if (c.framework === "matrix") return c.ranking[0]?.label ?? "-";
  return c.call.toUpperCase();
}

// ---------- The verdict dialog ----------

const VerdictCtx = createContext<{ open: (resultId: string) => void }>({ open: () => {} });
export const useVerdictDialog = () => useContext(VerdictCtx);

/**
 * Shows each verdict in a dialog over the table. Opens by itself when a new verdict arrives
 * (not for verdicts restored from a previous visit); the feed and the table reopen it.
 */
export function VerdictDialogProvider({ children }: { children: React.ReactNode }) {
  const { state } = useTable();
  const results = state.session?.results ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const reveal = useReveal();
  const pendingReady = pending ? reveal.revealed(`result-${pending}`) : false;

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(results.map((r) => r.id));
      return;
    }
    const fresh = results.find((r) => !seen.current!.has(r.id));
    results.forEach((r) => seen.current!.add(r.id));
    if (fresh) setPending(fresh.id);
  }, [results]);

  useEffect(() => {
    if (!pending || !pendingReady) return;
    setOpenId(pending);
    setPending(null);
    sfx("verdict");
  }, [pending, pendingReady]);

  const open = useCallback((id: string) => setOpenId(id), []);
  const result = results.find((r) => r.id === openId);
  const { settings } = useSettings();
  const { demo } = useTable();
  const config = useServerConfig(demo);
  const [reading, setReading] = useState(false);
  const read = useCallback(
    (r: VoteResult) => {
      setReading(true);
      void speak(verdictSpeech(r), { provider: config?.ttsProvider ?? "browser", rate: settings.voiceRate, volume: settings.voiceVolume, onEnd: () => setReading(false) });
    },
    [config?.ttsProvider, settings.voiceRate, settings.voiceVolume],
  );
  // Read the verdict aloud when it opens, if that's switched on; stop when it closes.
  useEffect(() => {
    if (!result) return;
    if (settings.voiceVerdict && !settings.muted) read(result);
    return () => {
      stopSpeaking();
      setReading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);

  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result]);

  return (
    <VerdictCtx.Provider value={{ open }}>
      {children}
      {result && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpenId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="The verdict"
            onClick={(e) => e.stopPropagation()}
            className="sheet-in flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-bg shadow-2xl sm:max-w-2xl sm:rounded-3xl"
          >
            {/* Header and footer stay put; only the verdict scrolls. */}
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3 sm:px-6">
              <span className="eyebrow">
                {FRAMEWORKS.find((f) => f.id === result.framework)!.name}
                <span className="hidden text-muted/70 sm:inline"> · {FRAMEWORKS.find((f) => f.id === result.framework)!.tech}</span>
                {result.trigger === "rerun" && <span className="text-accent"> · re-run</span>}
              </span>
              <div className="flex items-center gap-2">
              <button
                onClick={() => (reading ? stopSpeaking() : read(result))}
                disabled={settings.muted}
                title={settings.muted ? "Sound is off" : undefined}
                className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm text-muted hover:text-ink disabled:opacity-40"
              >
                {reading ? "■ Stop" : <>▸ Hear<span className="hidden sm:inline"> the verdict</span></>}
              </button>
              <button
                onClick={() => setOpenId(null)}
                aria-label="Close the verdict"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-ink"
              >
                ✕
              </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <VerdictBody result={result} onRerun={() => setOpenId(null)} />
            </div>
            <DialogFooter result={result} onBack={() => setOpenId(null)} />
          </div>
        </div>
      )}
    </VerdictCtx.Provider>
  );
}

function DialogFooter({ result, onBack }: { result: VoteResult; onBack: () => void }) {
  const { state, newQuestion, demo } = useTable();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<"copied" | "saved" | null>(null);
  const flash = (what: "copied" | "saved") => {
    setDone(what);
    setTimeout(() => setDone(null), 1800);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(verdictText(result, state.session?.question ?? ""));
      flash("copied");
    } catch {}
  };
  // The scroll itself, as a picture to keep or share.
  const saveImage = async () => {
    const node = document.querySelector<HTMLElement>("[role=dialog] .scroll-sheet:not(.scroll-slip)");
    if (!node) return;
    const { toPng } = await import("html-to-image");
    // Capture the finished scroll, not a frame of its writing animation.
    node.classList.add("no-anim");
    // Room around the scroll for its rods and the seal, which reach past its edges.
    const pad = 24;
    let url: string;
    try {
      url = await toPng(node, { pixelRatio: 2, backgroundColor: "#0e0a08", width: node.offsetWidth + pad * 2, height: node.offsetHeight + pad * 2, style: { margin: `${pad}px` } });
    } finally {
      node.classList.remove("no-anim");
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = "symposium-verdict.png";
    a.click();
    flash("saved");
  };
  const quiet = "h-10 rounded-md border border-line px-3.5 text-sm text-ink/85 hover:border-gold/50 hover:text-ink";
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      {confirming ? (
        <>
          <span className="mr-auto text-sm text-muted">Clear this debate and its verdicts?</span>
          <button onClick={() => setConfirming(false)} className="h-10 rounded-xl border border-line px-4 text-sm">
            Keep it
          </button>
          <button onClick={newQuestion} className="h-10 rounded-xl bg-nogo px-4 text-sm font-semibold text-white">
            Start over
          </button>
        </>
      ) : (
        <>
          {!demo && (
            <button onClick={() => setConfirming(true)} className="h-10 rounded-md px-2 text-sm text-muted hover:text-ink">
              New question
            </button>
          )}
          <span className="mr-auto" />
          <button onClick={copy} className={quiet} title="Copy the verdict and its conditions as text">
            {done === "copied" ? "Copied ✓" : "Copy"}
          </button>
          <button onClick={saveImage} className={quiet} title="Save the scroll as an image">
            {done === "saved" ? "Saved ✓" : "Save image"}
          </button>
          <button onClick={onBack} className="btn-primary h-10 rounded-md px-5">
            Back to the table
          </button>
        </>
      )}
    </div>
  );
}

function VerdictBody({ result, onRerun }: { result: VoteResult; onRerun: () => void }) {
  const { state } = useTable();
  const s = state.session!;
  const prev = result.previousResultId ? s.results.find((r) => r.id === result.previousResultId) : undefined;
  const latest = s.results.at(-1)?.id === result.id;
  return (
    <div className="space-y-4">
      {prev && <WasNowStrip prev={prev} next={result} />}
      <ResultCard result={result} />
      {latest && <RerunInput result={result} onRun={onRerun} />}
    </div>
  );
}

/** The verdict's place in the conversation: one line that opens the dialog. */
export function VerdictLine({ resultId }: { resultId: string }) {
  const { state } = useTable();
  const { open } = useVerdictDialog();
  const result = state.session?.results.find((r) => r.id === resultId);
  if (!result) return null;
  const fw = FRAMEWORKS.find((f) => f.id === result.framework)!;
  return (
    <button
      onClick={() => open(result.id)}
      className="bubble-in group flex w-full items-center gap-3 rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3 text-left hover:border-accent"
    >
      <span className="eyebrow !text-accent">{result.trigger === "rerun" ? "New verdict" : "The verdict"}</span>
      <VoteTag vote={headline(result)} />
      <span className="text-sm text-muted">
        {result.computed.tally.for} to {result.computed.tally.against} · {fw.name}
      </span>
      <span className="ml-auto text-sm text-accent group-hover:underline">Open</span>
    </button>
  );
}

function WasNowStrip({ prev, next }: { prev: VoteResult; next: VoteResult }) {
  const d = compareResults(prev, next);
  if (!d) return null;
  return (
    <section className="scroll-sheet scroll-slip relative mx-2 px-5 py-4" aria-label="What changed">
      {next.whatIf && <div className="mb-2 font-serif text-[1.05rem] italic text-ink/85">What if… “{next.whatIf.replace(/^\s*what if\s*/i, "")}”</div>}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-serif text-2xl">
        {d.changed ? (
          <>
            <span className="ink-strike text-muted">{voteLabel(d.was)}</span>
            <span className="text-base text-muted">{d.tallyWas}</span>
            <span aria-hidden className="text-gold">→</span>
            <span className="ink-line font-semibold" style={{ animationDelay: "0.9s" }}>
              {voteLabel(d.now)}
            </span>
            <span className="text-base">{d.tallyNow}</span>
          </>
        ) : (
          <>
            <span className="font-semibold">{voteLabel(d.now)}</span>
            <span className="text-base text-muted">
              {d.tallyWas} → {d.tallyNow}
            </span>
          </>
        )}
      </div>
      {!d.changed && <p className="mt-1 text-sm italic text-muted">The verdict held.</p>}
      {d.flips.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-ink/90">
          {d.flips.slice(0, 4).map((f, i) => (
            <li key={i}>· {f}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RerunInput({ result, onRun }: { result: VoteResult; onRun: () => void }) {
  const { state, callVote, demo } = useTable();
  const [whatIf, setWhatIf] = useState("");
  const run = () => {
    const text = whatIf.trim();
    if (!text || state.busy) return;
    setWhatIf("");
    onRun(); // close the dialog so the re-run's debate is visible
    callVote(result.framework, {
      whatIf: text,
      matrixSetup: result.framework === "matrix" ? (result.setup as MatrixSetup) : undefined,
    });
  };
  return (
    <section className="scroll-sheet scroll-slip relative mx-2 px-5 py-4">
      <label htmlFor="rerun" className="block font-serif text-xl italic">
        What if…?
      </label>
      <p className="text-sm text-muted">Change one fact and the table votes again.</p>
      <div className="mt-2 flex items-end gap-3">
        <input
          id="rerun"
          value={whatIf}
          disabled={demo}
          onChange={(e) => setWhatIf(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="…I had 6 months of savings?"
          className="min-w-0 flex-1 border-0 border-b border-[rgba(90,58,24,.45)] bg-transparent px-1 py-1.5 font-serif text-lg text-ink placeholder:italic placeholder:text-muted/80 focus:border-[var(--color-ink)] focus:outline-none disabled:opacity-50"
        />
        <button onClick={run} disabled={!whatIf.trim() || state.busy || demo} className="btn-primary h-10 rounded-md px-4">
          Vote again
        </button>
      </div>
    </section>
  );
}
