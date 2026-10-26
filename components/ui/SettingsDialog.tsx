"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/audio/engine";
import { useSettings, type Settings } from "@/lib/settings";

/** Gear button in the top bar; opens voice, music and effects settings. */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Settings"
        title="Settings"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:border-gold/50 hover:text-ink"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </button>
      {open && createPortal(<SettingsDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const testVoice = () => {
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance("Aristotle here. Let us find the mean between too much and too little.");
    u.rate = 0.92 * settings.voiceRate;
    u.volume = settings.voiceVolume;
    u.pitch = 0.85;
    speechSynthesis.speak(u);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        className="sheet-in max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-lg border border-gold/30 bg-surface px-5 py-4 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h2 id="settings-title" className="font-serif text-2xl font-semibold">
            Settings
          </h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <Section title="Writing" hint="Replies are written out by quill, one after another.">
          <div className="flex gap-1.5" role="radiogroup" aria-label="Writing speed">
            {([["Slow", 22], ["Normal", 38], ["Fast", 70], ["Instant", 0]] as const).map(([label, v]) => (
              <button
                key={label}
                role="radio"
                aria-checked={settings.writeSpeed === v}
                onClick={() => update({ writeSpeed: v })}
                className={`h-9 flex-1 rounded-md border text-sm transition ${settings.writeSpeed === v ? "border-gold/70 bg-[#3b2919] text-ink" : "border-line text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="The herald" hint="A voice that reads the verdict aloud. The debate itself stays quiet.">
          <Toggle label="Read the verdict when it opens" on={settings.voiceVerdict} onChange={(on) => update({ voiceVerdict: on })} />
          <Slider label="Speed" min={0.7} max={1.4} step={0.05} value={settings.voiceRate} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => update({ voiceRate: v })} />
          <Slider label="Volume" value={settings.voiceVolume} onChange={(v) => update({ voiceVolume: v })} />
          <button onClick={testVoice} className="mt-1 text-sm text-gold underline-offset-4 hover:underline">
            ▸ Hear a sample
          </button>
        </Section>

        <Section title="Music" hint="A lyre playing softly in an old Greek mode.">
          <Toggle label="Background music" on={settings.music} onChange={(on) => update({ music: on })} />
          <Slider label="Volume" value={settings.musicVolume} disabled={!settings.music} onChange={(v) => update({ musicVolume: v })} />
        </Section>

        <Section title="Fire" hint="A wood fire crackling in the hearth.">
          <Toggle label="Fire crackling" on={settings.fire} onChange={(on) => update({ fire: on })} />
          <Slider label="Volume" value={settings.fireVolume} disabled={!settings.fire} onChange={(v) => update({ fireVolume: v })} />
        </Section>

        <Section title="Sound effects" hint="A pluck when you seat someone, a gong when the vote is called, a chord for the verdict.">
          <Toggle label="Effects" on={settings.effects} onChange={(on) => update({ effects: on })} />
          <Slider
            label="Volume"
            value={settings.effectsVolume}
            disabled={!settings.effects}
            onChange={(v) => update({ effectsVolume: v })}
            onRelease={() => sfx("seat")}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 border-t border-line pt-3">
      <h3 className="text-[0.8rem] uppercase tracking-[0.18em] text-gold">{title}</h3>
      <p className="mb-1.5 text-sm italic leading-snug text-muted">{hint}</p>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Toggle({ label, on, disabled, onChange }: { label: string; on: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between gap-4 ${disabled ? "opacity-45" : "cursor-pointer"}`}>
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 rounded-full border transition ${on ? "border-gold/60 bg-[#4a321d]" : "border-line bg-bg"}`}
      >
        <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all ${on ? "left-[22px] bg-gold" : "left-0.5 bg-muted"}`} />
      </button>
    </label>
  );
}

function Slider({
  label,
  value,
  onChange,
  onRelease,
  disabled,
  min = 0,
  max = 1,
  step = 0.05,
  format = (v) => `${Math.round(v * 100)}%`,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onRelease?: () => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <label className={`flex items-center gap-3 ${disabled ? "opacity-45" : ""}`}>
      <span className="w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onRelease}
        className="h-1 flex-1 accent-[var(--color-gold)]"
      />
      <span className="w-12 text-right text-sm tabular-nums text-muted">{format(value)}</span>
    </label>
  );
}

export type { Settings };
