"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { SettingsButton } from "./SettingsDialog";
import { SoundToggle } from "./VoiceButtons";

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      {/* A kylix in a laurel wreath: the drinking cup of the symposium. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/scenes/logo.webp" alt="" width={44} height={44} className="h-11 w-11 object-contain saturate-[.7] brightness-90" />
      {/* On narrow phones the cup alone is the logo, so the top bar never crowds. */}
      <span className="hidden font-serif text-[1.65rem] font-semibold leading-none tracking-wide min-[480px]:inline">Symposium</span>
    </span>
  );
}

export function TopBar({
  onNewQuestion,
  onHome,
  showNew,
  right,
}: {
  onNewQuestion?: () => void;
  /** The logo goes back to the landing page (after the start-over check during a debate). */
  onHome?: () => void;
  showNew: boolean;
  right?: React.ReactNode;
}) {
  // Which button asked to start over: the logo also goes home afterwards.
  const [confirming, setConfirming] = useState<false | "logo" | "new">(false);
  return (
    <header className="sticky top-0 z-30 border-b border-gold/25 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        {showNew && onNewQuestion ? (
          // The logo is a way home too: same confirmation as New question.
          <button onClick={() => setConfirming("logo")} aria-label="Symposium home" className="rounded-full focus-visible:outline-2 focus-visible:outline-accent">
            <Logo />
          </button>
        ) : onHome ? (
          <button onClick={onHome} aria-label="Symposium home" className="rounded-full focus-visible:outline-2 focus-visible:outline-accent">
            <Logo />
          </button>
        ) : (
          <Link href="/" aria-label="Symposium home">
            <Logo />
          </Link>
        )}
        <nav className="ml-2 hidden items-center gap-5 text-[0.8rem] uppercase tracking-[0.16em] text-muted sm:flex">
          <Link href="/philosophers" className="hover:text-gold">
            The philosophers
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {right}
          <SoundToggle />
          <SettingsButton />
          {showNew && onNewQuestion && (
            <div className="relative">
              <button onClick={() => setConfirming("new")} className="h-9 rounded-full border border-line px-3.5 text-sm hover:border-accent">
                New question
              </button>
            </div>
          )}
          {/* Portal: the header's backdrop blur would otherwise trap a fixed overlay inside the header. */}
          {confirming && onNewQuestion && createPortal(
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md" onClick={() => setConfirming(false)}>
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="start-over-title"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === "Escape" && setConfirming(false)}
                className="sheet-in w-full max-w-sm rounded-lg border border-gold/30 bg-surface p-6 shadow-2xl"
              >
                <h2 id="start-over-title" className="font-serif text-2xl font-semibold">
                  Start a new question?
                </h2>
                <p className="mt-1 text-sm text-muted">This clears the current debate and its verdicts.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button autoFocus onClick={() => setConfirming(false)} className="h-10 rounded-md border border-line px-4 hover:border-gold/50">
                    Keep it
                  </button>
                  <button
                    onClick={() => {
                      const home = confirming === "logo";
                      setConfirming(false);
                      onNewQuestion();
                      if (home) onHome?.();
                    }}
                    className="btn-primary h-10 rounded-md px-4"
                  >
                    Start over
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
        </div>
      </div>
    </header>
  );
}
