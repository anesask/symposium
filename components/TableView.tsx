"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ROOM_ART } from "@/config/art";
import { useTable } from "@/lib/store/session";
import { useServerConfig } from "@/lib/useServerConfig";
import type { FrameworkId, MatrixSetup, ThinkerId } from "@/lib/types";
import { MatrixSetupEditor } from "@/components/vote/MatrixSetupEditor";
import { Feed } from "@/components/feed/Feed";
import { Composer, type ComposerHandle } from "@/components/composer/Composer";
import { FrameworkSheet } from "@/components/vote/FrameworkSheet";
import { VoteStatus } from "@/components/results/VoteStatus";
import { VerdictDialogProvider } from "@/components/results/ResultsPanel";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { RoundTable } from "@/components/table/RoundTable";
import { Portrait } from "@/components/table/Portrait";
import { ROSTER } from "@/config/roster";
import { TopBar } from "@/components/ui/TopBar";
import { useDemoPlayer } from "@/lib/demo/player";
import { useSpeechInput } from "@/lib/voice/useSpeechInput";
import { MicButton } from "@/components/ui/VoiceButtons";
import { sfx } from "@/lib/audio/engine";
import { RevealContext, usePrefersReducedMotion, useRevealPacer } from "@/lib/store/reveal";
import { useSettings } from "@/lib/settings";
import { Landing } from "@/components/onboarding/Landing";
import { FactsBar } from "@/components/table/FactsBar";

const AVAILABLE: FrameworkId[] = ["gate", "matrix", "premortem"];

export function TableView() {
  const { state, dispatch, startSession, callVote, newQuestion, demo } = useTable();
  const s = state.session;
  const config = useServerConfig(demo);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [matrixSetup, setMatrixSetup] = useState<MatrixSetup | null>(null);
  const composer = useRef<ComposerHandle>(null);
  const noKey = config !== null && !config.hasKey;
  const player = useDemoPlayer(demo);
  const mic = useSpeechInput((text) => composer.current?.appendText(text));
  const { settings } = useSettings();
  const reducedMotion = usePrefersReducedMotion();
  // People who ask their system for less motion get the text at once.
  const writeSpeed = reducedMotion || settings.writeSpeed === 0 ? 0 : demo ? Math.max(settings.writeSpeed, 70) : settings.writeSpeed;
  const reveal = useRevealPacer(s?.messages ?? [], writeSpeed, s?.id);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    document.body.dataset.room = s?.roomId ?? document.body.dataset.room ?? "boardroom";
  }, [s?.roomId]);

  // Whoever holds the quill is the one speaking.
  const writingMsg = s?.messages.find((m) => m.id === reveal.writingId);
  const speaking = writingMsg && (writingMsg.kind === "thinker" || writingMsg.kind === "poll") ? writingMsg.speakerId : undefined;
  // A soft pluck whenever someone new starts to speak.
  useEffect(() => {
    if (speaking) sfx("speak");
  }, [speaking]);
  const socrates = speaking === "socrates" ? "speaking" : s?.socratesUsed ? "present" : "hidden";
  // In a rebuttal, the thinker being answered stays lit on the table.
  const addressed = writingMsg?.replyTo;
  // Clicking a portrait offers a choice: ask them at the table, or talk privately.
  // During a 1:1 it switches partner; in the demo it does nothing.
  const [picked, setPicked] = useState<ThinkerId | null>(null);
  const tag = (id: ThinkerId) => {
    if (demo) return;
    if (s?.oneOnOne && id !== "socrates") return dispatch({ type: "set_one_on_one", thinkerId: id });
    if (id === "socrates") return composer.current?.insertTag(id);
    setPicked((p) => (p === id ? null : id));
  };

  const topBar = (
    <TopBar
      onNewQuestion={newQuestion}
      onHome={() => (demo ? window.location.assign("/") : setEntered(false))}
      showNew={Boolean(s) && !demo}
      right={
        <>
          {demo && (
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className="whitespace-nowrap rounded-full border border-cond/50 px-2.5 py-1 text-cond">
                Demo<span className="hidden sm:inline"> · sample session</span>
              </span>
              <button onClick={player.replay} disabled={player.playing} className="rounded-full border border-line px-3 py-1 text-ink hover:border-accent disabled:opacity-40">
                Replay
              </button>
            </span>
          )}
        </>
      }
    />
  );

  if (!s && !entered) {
    return (
      <>
        {topBar}
        <Landing onStart={() => setEntered(true)} />
      </>
    );
  }

  if (!s) {
    return (
      <>
        {topBar}
        {noKey && <MissingKeyBanner />}
        {/* One screen, no page scroll: the onboarding fills what the top bar leaves. */}
        <div className="scenery flex h-[calc(100dvh-65px)] flex-col overflow-hidden">
          <Onboarding onStart={startSession} disabled={noKey} />
          <footer className="mx-auto max-w-[1400px] shrink-0 px-4 pb-2 sm:px-6">
            <Disclaimer />
          </footer>
        </div>
      </>
    );
  }

  const scene = ROOM_ART[s.roomId].scene ? "art" : "css";
  const showTags = s.mode !== "talk";

  const alerts = (
    <>
      {state.error && (
        <div role="alert" className="mt-3 flex shrink-0 items-start justify-between gap-3 rounded-xl border border-nogo/50 bg-nogo/10 px-4 py-3 text-sm">
          <span>{state.error.message}</span>
          <button onClick={() => dispatch({ type: "clear_error" })} className="text-muted hover:text-ink" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
      {state.notice && <div className="mt-3 shrink-0 text-sm italic text-muted">{state.notice}</div>}
    </>
  );

  const conversation = (
    <>
      {alerts}
      {s.oneOnOne && (
        <div className="mt-3 flex shrink-0 items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
          <Portrait id={s.oneOnOne} size={30} speaking={speaking === s.oneOnOne} />
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-accent">1:1 with {ROSTER[s.oneOnOne].name}</span>
            <span className="text-muted"> · the table is listening</span>
          </span>
          <button onClick={() => dispatch({ type: "set_one_on_one", thinkerId: undefined })} className="shrink-0 rounded-full border border-line px-3 py-1 text-ink hover:border-accent">
            Back to the table
          </button>
        </div>
      )}
      <Feed />
      {picked && !s.oneOnOne && (
        <div className="bubble-in mb-2 flex shrink-0 flex-wrap items-center gap-2 rounded-md border border-gold/30 bg-black/30 px-3 py-2">
          <Portrait id={picked} size={30} />
          <span className="mr-auto font-serif text-lg">{ROSTER[picked].name}</span>
          <button
            onClick={() => {
              composer.current?.insertTag(picked);
              setPicked(null);
            }}
            className="h-9 rounded-md border border-line px-3 text-sm hover:border-gold/50"
          >
            Ask at the table
          </button>
          <button
            onClick={() => {
              dispatch({ type: "set_one_on_one", thinkerId: picked });
              setPicked(null);
            }}
            className="btn-primary h-9 rounded-md px-3 text-sm"
          >
            Talk privately
          </button>
          <button onClick={() => setPicked(null)} aria-label="Close" className="h-9 w-9 rounded-md text-muted hover:text-ink">
            ✕
          </button>
        </div>
      )}
      <Composer
        ref={composer}
        onCallVote={() => {
          // Re-propose matrix options from the latest conversation each time the sheet opens.
          setMatrixSetup(null);
          setSheetOpen(true);
        }}
        disabled={(noKey && !demo) || demo}
        micSlot={mic.supported && !demo ? <MicButton listening={mic.listening} onToggle={mic.toggle} /> : undefined}
      />
    </>
  );

  return (
    <RevealContext.Provider value={reveal}>
    <VerdictDialogProvider>
      {topBar}
      {noKey && <MissingKeyBanner />}
      {/* One layout: the table (40%) beside the conversation (60%); verdicts open in a dialog. Below lg they stack. */}
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 px-4 sm:px-6 lg:h-[calc(100vh-64px)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:overflow-hidden">
        {/* The stage never scrolls: question, the table sized to the space left, and one status line. */}
        <section
          className="room-scene relative -mx-4 flex min-w-0 flex-col px-4 pb-4 pt-5 text-center sm:-mx-6 sm:px-6 lg:mx-0 lg:h-full lg:overflow-hidden lg:border-r lg:border-line lg:px-4 lg:pt-6"
          data-scene={scene}
        >
          <div className="eyebrow shrink-0">Your question</div>
          <h1 className="mx-auto mt-2 line-clamp-3 max-w-[34ch] shrink-0 font-serif text-[1.5rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-[1.9rem] xl:text-[2.2rem]" title={s.question}>
            {s.question}
          </h1>
          <FactsBar facts={s.facts ?? []} readOnly={demo} onChange={(facts) => dispatch({ type: "set_facts", facts })} />
          <div className="mt-3 flex min-h-0 items-center justify-center sm:mt-8 lg:mt-10 lg:flex-1 lg:[container-type:size]">
            <RoundTable seats={s.seats} speakingId={speaking} focusId={s.oneOnOne} addressedId={addressed} tags={s.voteTags} showTags={showTags} socrates={socrates} onPick={tag} />
          </div>
          <div className="mt-3 shrink-0">
            <VoteStatus />
          </div>
          <div className="mt-3 hidden shrink-0 lg:block">
            <Disclaimer />
          </div>
        </section>
        <div className="flex min-w-0 flex-col border-t border-line lg:min-h-0 lg:border-t-0 lg:pl-6">{conversation}</div>

        <FrameworkSheet
          open={sheetOpen}
          suggested={s.suggestedFramework}
          available={AVAILABLE}
          onClose={() => setSheetOpen(false)}
          onRun={(fw) => {
            setSheetOpen(false);
            sfx("gong");
            callVote(fw, fw === "matrix" && matrixSetup ? { matrixSetup } : undefined);
          }}
        >
          {(fw) => (fw === "matrix" ? <MatrixSetupEditor value={matrixSetup} onChange={setMatrixSetup} /> : null)}
        </FrameworkSheet>
      </main>
      <footer className="mx-auto max-w-[1400px] px-4 pb-6 pt-2 sm:px-6 lg:hidden">
        <Disclaimer />
      </footer>
    </VerdictDialogProvider>
    </RevealContext.Provider>
  );
}

function Disclaimer() {
  return (
    <p className="text-center text-[0.72rem] text-muted/70">
      Symposium is a thinking aid, not financial, legal or medical advice. The philosophers are AI interpretations, not quotations.{" "}
      <Link href="/philosophers" className="underline-offset-2 hover:text-gold hover:underline">
        The philosophers
      </Link>
    </p>
  );
}

function MissingKeyBanner() {
  return (
    <div role="status" className="border-b border-cond/40 bg-cond/10">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-2.5 text-sm sm:px-6">
        <span>
          The table isn't configured: add <code className="rounded bg-black/30 px-1">OPENAI_API_KEY</code> (or{" "}
          <code className="rounded bg-black/30 px-1">ANTHROPIC_API_KEY</code>) to <code className="rounded bg-black/30 px-1">.env.local</code> and restart.
        </span>
        <a href="/?demo=1" className="btn-primary ml-auto rounded-md px-3.5 py-1">
          Try the demo
        </a>
      </div>
    </div>
  );
}
