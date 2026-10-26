"use client";

import type { GateComputed, MatrixComputed, PremortemComputed, VoteResult } from "@/lib/types";

// The table speaks once: the herald reads the verdict aloud. ElevenLabs when the server has it
// configured, the browser's own voice otherwise.

let current: { stop: () => void } | null = null;
const cache = new Map<string, string>();

export function stopSpeaking() {
  current?.stop();
  current = null;
}

export async function speak(
  text: string,
  opts: { provider: "browser" | "elevenlabs"; rate: number; volume: number; onEnd?: () => void },
): Promise<void> {
  stopSpeaking();
  const done = () => {
    current = null;
    opts.onEnd?.();
  };
  if (opts.provider === "elevenlabs") {
    try {
      let url = cache.get(text);
      if (!url) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speakerId: "moderator" }),
        });
        if (!res.ok) throw new Error(String(res.status));
        url = URL.createObjectURL(await res.blob());
        cache.set(text, url); // Same verdict again costs nothing.
      }
      const a = new Audio(url);
      a.playbackRate = opts.rate;
      a.volume = opts.volume;
      a.onended = done;
      current = {
        stop: () => {
          a.pause();
          done();
        },
      };
      await a.play();
      return;
    } catch {
      // Fall through to the browser voice.
    }
  }
  if (typeof speechSynthesis === "undefined") return done();
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  u.voice = voices.find((v) => /natural|online|neural/i.test(v.name) && /male|guy|david|ryan|thomas|daniel/i.test(v.name)) ?? voices.find((v) => /natural|online/i.test(v.name)) ?? voices[0] ?? null;
  u.rate = 0.92 * opts.rate;
  u.pitch = 0.9;
  u.volume = opts.volume;
  u.onend = done;
  u.onerror = done;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  current = {
    stop: () => {
      speechSynthesis.cancel();
      done();
    },
  };
}

export const GATE_WORDS = {
  GO: { word: "Yes", greek: "ΝΑΙ", gloss: "yes", line: "all clear" },
  "GO, IF": { word: "Yes, if…", greek: "ΝΑΙ, ΕΑΝ…", gloss: "yes, if…", line: "if you meet the conditions below" },
  "NO-GO": { word: "Not yet", greek: "ΟΥΠΩ", gloss: "not yet", line: "until this changes" },
} as const;

export const PREMORTEM_WORDS = {
  proceed: { word: "Go ahead", greek: "ΙΘΙ", gloss: "go!", note: "No critical risk is left without a fix." },
  revise: { word: "Rethink first", greek: "ΑΥΘΙΣ ΣΚΟΠΕΙ", gloss: "look again", note: "One critical risk has no believable fix yet." },
  stop: { word: "Stop", greek: "ΠΑΥΕ", gloss: "stop!", note: "Two or more critical risks have no believable fix." },
} as const;

/** What the herald says for a verdict. */
export function verdictSpeech(result: VoteResult): string {
  const c = result.computed;
  const n = (t: { for: number; against: number }) => `${t.for} to ${t.against}.`;
  if (c.framework === "gate") {
    const g = c as GateComputed;
    const w = GATE_WORDS[g.verdict];
    const parts = [`The symposium has resolved. ${w.word.replace("…", "")}. ${n(g.tally)}`];
    if (g.verdict === "NO-GO" && g.flipCondition) parts.push(`What would change it: ${g.flipCondition}.`);
    if (g.conditions.length) parts.push(`The conditions. ${g.conditions.map((x, i) => `${i + 1}: ${x}.`).join(" ")}`);
    return parts.join(" ");
  }
  if (c.framework === "matrix") {
    const m = c as MatrixComputed;
    return `The symposium has resolved. ${m.ranking[0]?.label ?? "No winner"} comes first. ${m.sensitivity}`;
  }
  const p = c as PremortemComputed;
  const top = p.ranked.slice(0, 3).map((r, i) => `${i + 1}: ${r.cause}. The fix: ${r.mitigation}.`);
  return `The symposium has resolved: ${PREMORTEM_WORDS[p.call].word}. The biggest risks. ${top.join(" ")}`;
}

/** The verdict as plain text, for copying into notes or a message. */
export function verdictText(result: VoteResult, question: string): string {
  const c = result.computed;
  const lines = [`Symposium: ${question}`, ""];
  if (c.framework === "gate") {
    const g = c as GateComputed;
    lines.push(`Verdict: ${GATE_WORDS[g.verdict].word.replace("…", "")} (${g.tally.for} to ${g.tally.against})`);
    if (g.verdict === "NO-GO" && g.flipCondition) lines.push(`What would change it: ${g.flipCondition}`);
    if (g.conditions.length) lines.push("", "Conditions:", ...g.conditions.map((x) => `- ${x}`));
  } else if (c.framework === "matrix") {
    const m = c as MatrixComputed;
    lines.push(`Verdict: ${m.ranking[0]?.label ?? "No winner"}`, "", ...m.ranking.map((r, i) => `${i + 1}. ${r.label}: ${r.percent}%`), "", m.sensitivity);
  } else {
    const p = c as PremortemComputed;
    lines.push(`Verdict: ${PREMORTEM_WORDS[p.call].word}`, "", "Biggest risks:", ...p.ranked.map((r, i) => `${i + 1}. ${r.cause}\n   Fix: ${r.mitigation}`));
  }
  return lines.join("\n").trim();
}
