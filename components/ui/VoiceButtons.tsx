"use client";

import { useSettings } from "@/lib/settings";
import { sfx as sfxUnlock } from "@/lib/audio/engine";

/** All sound on or off: music, fire, effects and the herald. */
export function SoundToggle() {
  const { settings, update } = useSettings();
  const enabled = !settings.muted;
  return (
    <button
      onClick={() => {
        if (!enabled) sfxUnlock("speak");
        update({ muted: enabled });
      }}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn all sound off" : "Turn sound on"}
      title={enabled ? "Sound on" : "Sound off"}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
        enabled ? "border-gold/50 text-gold" : "border-line text-muted hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" fill="currentColor" fillOpacity=".15" />
        {enabled ? <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
      </svg>
    </button>
  );
}

export function MicButton({ listening, onToggle }: { listening: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={listening}
      aria-label={listening ? "Stop dictation" : "Dictate"}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
        listening ? "speaking-ring border-accent text-accent" : "border-line text-muted hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <rect x="9" y="3.5" width="6" height="11" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
      </svg>
    </button>
  );
}
