"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { configureAudio } from "@/lib/audio/engine";

export interface Settings {
  /** Everything silent: the switch in the top bar. */
  muted: boolean;
  /** Read the verdict aloud when it opens. */
  voiceVerdict: boolean;
  /** How fast replies are written out, in characters per second; 0 shows them at once. */
  writeSpeed: number;
  /** Multiplies each thinker's own speaking rate. */
  voiceRate: number;
  voiceVolume: number;
  music: boolean;
  musicVolume: number;
  fire: boolean;
  fireVolume: number;
  effects: boolean;
  effectsVolume: number;
}

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  voiceVerdict: false,
  writeSpeed: 38,
  voiceRate: 1,
  voiceVolume: 1,
  music: false,
  musicVolume: 0.5,
  fire: false,
  fireVolume: 0.5,
  effects: true,
  effectsVolume: 0.6,
};

const KEY = "symposium:settings:v1";
const Ctx = createContext<{ settings: Settings; update: (patch: Partial<Settings>) => void }>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
});

/** Per-browser preferences (voice, music, effects), remembered in localStorage. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch {}
  }, []);

  useEffect(() => {
    configureAudio(settings.muted ? { ...settings, music: false, fire: false, effects: false } : settings);
  }, [settings]);

  const update = (patch: Partial<Settings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
