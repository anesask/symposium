// Sound: background music, a fire, and a few effects. Each uses a recording from /public/sounds
// when it exists (made with ElevenLabs by scripts/generate-music.mjs and generate-sounds.mjs) and
// falls back to a version synthesised in the browser (Web Audio) when it doesn't.

export type Sfx = "seat" | "unseat" | "gong" | "verdict" | "speak";

export interface AudioSettings {
  music: boolean;
  musicVolume: number; // 0..1
  fire: boolean;
  fireVolume: number; // 0..1
  effects: boolean;
  effectsVolume: number; // 0..1
}

// D dorian, lyre register (D4 to D5), plus a low octave for the occasional bass note.
const SCALE = [293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33];
const BASS = [146.83, 196.0, 220.0];

let ctx: AudioContext | null = null;
let musicBus: GainNode;
let fireBus: GainNode;
let sfxBus: GainNode;
let reverb: ConvolverNode;
let settings: AudioSettings = { music: false, musicVolume: 0.5, fire: false, fireVolume: 0.5, effects: true, effectsVolume: 0.6 };
let musicNodes: { stop: () => void; recorded: boolean } | null = null;
let fireNodes: { stop: () => void } | null = null;
const plucks = new Map<number, AudioBuffer>();
const SAMPLE_NAMES = ["music", "fire", "seat", "unseat", "gong", "verdict", "speak"] as const;
const samples = new Map<string, AudioBuffer>();

/** Fetches and decodes the recorded sounds once; missing files are simply skipped. */
// public/sounds/manifest.json lists the recordings that exist, so nothing missing is requested.
let manifest: Promise<Set<string>> | null = null;
function available(): Promise<Set<string>> {
  manifest ??= fetch("/sounds/manifest.json")
    .then((r) => (r.ok ? r.json() : { sounds: [] }))
    .then((m: { sounds: string[] }) => new Set(m.sounds))
    .catch(() => new Set<string>());
  return manifest;
}

const loading = new Map<string, Promise<boolean>>();
/** Fetches and decodes one recording, once. Resolves false if there isn't one. */
function loadSample(name: (typeof SAMPLE_NAMES)[number]): Promise<boolean> {
  let p = loading.get(name);
  if (!p) {
    p = available().then(async (have) => {
      if (!have.has(name) || !ctx) return false;
      try {
        const res = await fetch(`/sounds/${name}.mp3`);
        if (!res.ok) return false;
        samples.set(name, normalise(await ctx.decodeAudioData(await res.arrayBuffer()), name === "fire" ? 0.08 : name === "music" ? 0.1 : 0.16));
        return true;
      } catch {
        return false;
      }
    });
    loading.set(name, p);
  }
  return p;
}

// The context is created only after the first click or key press (browsers block sound before
// one), and the music and fire recordings are only downloaded when they're switched on.
let unlocked = false;
if (typeof window !== "undefined") {
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    configureAudio(settings);
    void ctx?.resume();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

/** Generated clips come out at very different levels: scale each to the same loudness (RMS), never past full scale. */
function normalise(buf: AudioBuffer, targetRms: number): AudioBuffer {
  let sum = 0;
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      sum += d[i] * d[i];
      peak = Math.max(peak, Math.abs(d[i]));
    }
  }
  const rms = Math.sqrt(sum / (buf.length * buf.numberOfChannels));
  if (!rms || !peak) return buf;
  const gain = Math.min(targetRms / rms, 0.95 / peak);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] *= gain;
  }
  return buf;
}

function playSample(name: string, dest: AudioNode, gain = 1): boolean {
  const buf = samples.get(name);
  if (!buf || !ctx) return false;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(dest);
  src.start();
  return true;
}

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);
  reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.8);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  reverb.connect(wet).connect(out);
  musicBus = bus(out);
  fireBus = bus(out);
  sfxBus = bus(out);
  // The effects are small: fetch them up front so the first click already sounds right.
  for (const n of ["seat", "unseat", "gong", "verdict", "speak"] as const) void loadSample(n);
  return ctx;
}

function bus(out: AudioNode): GainNode {
  const g = ctx!.createGain();
  g.gain.value = 0;
  g.connect(out);
  g.connect(reverb);
  return g;
}

function impulse(c: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

/** Karplus-Strong plucked string, cached per pitch. */
function pluckBuffer(freq: number): AudioBuffer {
  const cached = plucks.get(freq);
  if (cached) return cached;
  const c = ctx!;
  const len = Math.floor(c.sampleRate * 3);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  const n = Math.max(2, Math.round(c.sampleRate / freq));
  const ring = new Float32Array(n);
  for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % n;
    d[i] = ring[idx];
    ring[idx] = 0.996 * 0.5 * (ring[idx] + ring[next]);
    idx = next;
  }
  plucks.set(freq, buf);
  return buf;
}

function pluck(freq: number, dest: AudioNode, gain: number, when = 0) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = pluckBuffer(freq);
  const g = c.createGain();
  g.gain.value = gain;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2600;
  src.connect(lp).connect(g).connect(dest);
  src.start(c.currentTime + when);
}

// ---------- Music ----------

/** Loops a long recording with a slow crossfade, so the seam is never heard. */
function crossfadeLoop(buf: AudioBuffer, dest: AudioNode, fade = 4): { stop: () => void } {
  const c = ctx!;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const playing = new Set<AudioBufferSourceNode>();
  const play = () => {
    if (stopped) return;
    const now = c.currentTime;
    const end = now + buf.duration;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(1, now + fade);
    g.gain.setValueAtTime(1, end - fade);
    g.gain.linearRampToValueAtTime(0, end);
    src.connect(g).connect(dest);
    src.start(now);
    src.stop(end);
    playing.add(src);
    src.onended = () => playing.delete(src);
    timer = setTimeout(play, (buf.duration - fade) * 1000);
  };
  play();
  return {
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      for (const s of playing) s.stop();
    },
  };
}

function startMusic() {
  const c = ensure();
  if (!c || musicNodes) return;
  const recorded = samples.get("music");
  if (recorded) {
    musicNodes = { ...crossfadeLoop(recorded, musicBus), recorded: true };
    return;
  }
  // Download the recording now that music is wanted; synthesise only if there isn't one.
  void loadSample("music").then((ok) => {
    if (!settings.music || musicNodes) return;
    if (ok) startMusic();
    else startSynthMusic();
  });
}

/** Fallback: a lyre improvising over a drone of D2 and A2, slowly breathing. */
function startSynthMusic() {
  const c = ctx!;
  const drone: AudioScheduledSourceNode[] = [];
  let timer: ReturnType<typeof setTimeout>;
  for (const [f, v] of [[73.42, 0.05], [110, 0.03]] as const) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = v;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07 + Math.random() * 0.05;
    const depth = c.createGain();
    depth.gain.value = v * 0.6;
    lfo.connect(depth).connect(g.gain);
    o.connect(g).connect(musicBus);
    o.start();
    lfo.start();
    drone.push(o, lfo);
  }
  let pos = 3;
  const phrase = () => {
    if (!ctx) return;
    // A small random walk through the scale, sometimes a rest, sometimes a bass note under it.
    if (Math.random() < 0.82) {
      pos = Math.max(0, Math.min(SCALE.length - 1, pos + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      pluck(SCALE[pos], musicBus, 0.32 + Math.random() * 0.15);
      if (Math.random() < 0.2) pluck(BASS[Math.floor(Math.random() * BASS.length)], musicBus, 0.3, 0.02);
      if (Math.random() < 0.12) pluck(SCALE[Math.min(SCALE.length - 1, pos + 2)], musicBus, 0.2, 0.18);
    }
    timer = setTimeout(phrase, 550 + Math.random() * 1300);
  };
  phrase();
  musicNodes = {
    recorded: false,
    stop: () => {
      clearTimeout(timer);
      for (const n of drone) n.stop();
    },
  };
}

function stopMusic() {
  musicNodes?.stop();
  musicNodes = null;
}

// ---------- Fire ----------

function startFire() {
  const c = ensure();
  if (!c || fireNodes) return;
  const recorded = samples.get("fire");
  if (recorded) {
    fireNodes = crossfadeLoop(recorded, fireBus, 2.5);
    return;
  }
  if (!loading.has("fire")) {
    void loadSample("fire").then((ok) => {
      if (!settings.fire || fireNodes) return;
      if (ok) startFire();
      else startSynthFire();
    });
    return;
  }
  startSynthFire();
}

function startSynthFire() {
  const c = ctx!;
  if (fireNodes) return;
  const len = c.sampleRate * 2;
  const noise = c.createBuffer(1, len, c.sampleRate);
  const d = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) d[i] = last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown noise
  const bed = c.createBufferSource();
  bed.buffer = noise;
  bed.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = "lowpass";
  bp.frequency.value = 500;
  const bedGain = c.createGain();
  bedGain.gain.value = 1.6;
  bed.connect(bp).connect(bedGain).connect(fireBus);
  bed.start();
  let timer: ReturnType<typeof setTimeout>;
  const crackle = () => {
    const src = c.createBufferSource();
    const n = Math.floor(c.sampleRate * 0.02);
    const b = c.createBuffer(1, n, c.sampleRate);
    const x = b.getChannelData(0);
    for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
    src.buffer = b;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1500 + Math.random() * 2500;
    const g = c.createGain();
    g.gain.value = 0.15 + Math.random() * 0.35;
    src.connect(hp).connect(g).connect(fireBus);
    src.start();
    timer = setTimeout(crackle, 40 + Math.random() * (Math.random() < 0.3 ? 900 : 250));
  };
  crackle();
  fireNodes = {
    stop: () => {
      clearTimeout(timer);
      bed.stop();
    },
  };
}

function stopFire() {
  fireNodes?.stop();
  fireNodes = null;
}

// ---------- Public API ----------

/** Applies the current settings: starts or stops the music and fire, sets volumes. */
export function configureAudio(next: AudioSettings) {
  settings = next;
  if (!unlocked) return;
  const wantsSound = next.music || next.fire || next.effects;
  if (!wantsSound && !ctx) return;
  const c = ensure();
  if (!c) return;
  const t = c.currentTime;
  musicBus.gain.setTargetAtTime(next.music ? 0.35 * next.musicVolume : 0, t, 0.4);
  fireBus.gain.setTargetAtTime(next.fire ? 0.6 * next.fireVolume : 0, t, 0.6);
  sfxBus.gain.setTargetAtTime(next.effects ? 0.8 * next.effectsVolume : 0, t, 0.05);
  if (next.music) startMusic();
  else stopMusic();
  if (next.fire) startFire();
  else stopFire();
}

/** Plays a short effect, if effects are on. */
export function sfx(name: Sfx) {
  if (!settings.effects || !unlocked) return;
  const c = ensure();
  if (!c) return;
  void c.resume();
  if (playSample(name, sfxBus, name === "speak" ? 0.6 : 1)) return;
  switch (name) {
    case "seat":
      pluck(SCALE[3 + Math.floor(Math.random() * 4)], sfxBus, 0.5);
      break;
    case "unseat":
      pluck(SCALE[1], sfxBus, 0.35);
      break;
    case "speak":
      pluck(SCALE[7], sfxBus, 0.12);
      break;
    case "verdict":
      [293.66, 369.99, 440, 587.33].forEach((f, i) => pluck(f, sfxBus, 0.45, i * 0.09));
      break;
    case "gong": {
      // Inharmonic partials with long decays: a small bronze gong.
      const now = c.currentTime;
      for (const [ratio, amp, decay] of [[1, 0.5, 4.5], [2.76, 0.25, 3], [5.4, 0.12, 2], [8.93, 0.06, 1.2]] as const) {
        const o = c.createOscillator();
        o.frequency.value = 98 * ratio;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(amp, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        o.connect(g).connect(sfxBus);
        o.start(now);
        o.stop(now + decay);
      }
      break;
    }
  }
}
