"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTable } from "@/lib/store/session";
import type { ThinkerId } from "@/lib/types";
import { ROSTER } from "@/config/roster";
import { Portrait } from "@/components/table/Portrait";

/** Finds an "@Name" tag anywhere in the text and returns the matching thinker id. */
export function parseTag(text: string, candidates: ThinkerId[]): ThinkerId | undefined {
  const m = text.match(/@([\p{L}.]+(?:\s[\p{L}.]+)?)/u);
  if (!m) return undefined;
  const needle = m[1].toLowerCase();
  // Longest names first so a longer name wins over a shorter one it starts with.
  const names = candidates
    .flatMap((id) => [ROSTER[id].name, ROSTER[id].shortName, id].map((n) => ({ id, n: n.toLowerCase() })))
    .sort((a, b) => b.n.length - a.n.length);
  return names.find(({ n }) => needle.startsWith(n))?.id ?? names.find(({ n }) => n.startsWith(needle.split(" ")[0]))?.id;
}

export interface ComposerHandle {
  insertTag: (id: ThinkerId) => void;
  /** Appends dictated text to the draft. */
  appendText: (text: string) => void;
}

export const Composer = forwardRef<ComposerHandle, { onCallVote: () => void; disabled?: boolean; micSlot?: React.ReactNode }>(
  function Composer({ onCallVote, disabled, micSlot }, ref) {
    const { state, send, keepArguing, summarize, demo, dispatch } = useTable();
    const [toOpen, setToOpen] = useState(false);
    const partner = state.session?.oneOnOne;
    const s = state.session!;
    const [draft, setDraft] = useState("");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerIndex, setPickerIndex] = useState(0);
    const input = useRef<HTMLTextAreaElement>(null);

    const taggable = useMemo<ThinkerId[]>(
      () => [...s.seats, ...(s.socratesEnabled && !s.socratesUsed ? (["socrates"] as ThinkerId[]) : [])],
      [s.seats, s.socratesEnabled, s.socratesUsed],
    );

    // The "@query" right before the caret, if any.
    const query = useMemo(() => {
      const m = draft.match(/@([\p{L}.]*)$/u);
      return m ? m[1].toLowerCase() : null;
    }, [draft]);
    const matches = query === null ? [] : taggable.filter((id) => [ROSTER[id].name, ROSTER[id].shortName].some((n) => n.toLowerCase().startsWith(query) || n.toLowerCase().includes(" " + query)));

    const insert = (id: ThinkerId) => {
      const name = ROSTER[id].shortName;
      setDraft((d) => (/@[\p{L}.]*$/u.test(d) ? d.replace(/@[\p{L}.]*$/u, `@${name} `) : `${d}${d && !d.endsWith(" ") ? " " : ""}@${name} `));
      setPickerOpen(false);
      requestAnimationFrame(() => input.current?.focus());
    };
    useImperativeHandle(ref, () => ({
      insertTag: insert,
      appendText: (t: string) => setDraft((d) => (d ? `${d.trimEnd()} ${t}` : t)),
    }));

    const submit = async () => {
      const text = draft.trim();
      if (!text || state.busy || disabled) return;
      const tag = parseTag(text, [...s.seats, "socrates"]);
      setDraft("");
      await send(text, tag);
    };

    const showPicker = pickerOpen && matches.length > 0 && !partner;
    return (
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-bg/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {showPicker && (
          <ul role="listbox" aria-label="Address a thinker" className="absolute bottom-full left-4 mb-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl sm:left-6">
            {matches.map((id, i) => (
              <li key={id}>
                <button
                  role="option"
                  aria-selected={i === pickerIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insert(id);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${i === pickerIndex ? "bg-surface-2" : ""}`}
                >
                  <Portrait id={id} size={28} />
                  <span className="flex-1">{ROSTER[id].name}</span>
                  {id === "socrates" && <span className="text-[0.65rem] text-muted">one question</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setToOpen((o) => !o)}
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={toOpen}
              title="Who are you talking to?"
              className={`flex h-11 items-center gap-1.5 rounded-xl border px-2.5 text-sm disabled:opacity-40 ${partner ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-ink"}`}
            >
              {partner ? <Portrait id={partner} size={26} /> : <span aria-hidden>◎</span>}
              <span className="hidden sm:inline">{partner ? `1:1 ${ROSTER[partner].shortName}` : "Table"}</span>
              <span aria-hidden className="text-[0.6rem]">▲</span>
            </button>
            {toOpen && (
              <ul role="listbox" aria-label="Talk to" className="absolute bottom-full left-0 z-30 mb-2 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
                <li>
                  <button
                    role="option"
                    aria-selected={!partner}
                    onClick={() => { dispatch({ type: "set_one_on_one", thinkerId: undefined }); setToOpen(false); }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-surface-2 ${!partner ? "text-accent" : ""}`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line">◎</span>
                    <span className="flex-1">Whole table</span>
                  </button>
                </li>
                <li className="eyebrow px-3 pb-1 pt-2">Talk 1:1 with</li>
                {s.seats.map((id) => (
                  <li key={id}>
                    <button
                      role="option"
                      aria-selected={partner === id}
                      onClick={() => { dispatch({ type: "set_one_on_one", thinkerId: id }); setToOpen(false); requestAnimationFrame(() => input.current?.focus()); }}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2 ${partner === id ? "text-accent" : ""}`}
                    >
                      <Portrait id={id} size={28} />
                      <span className="flex-1">{ROSTER[id].name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <textarea
            ref={input}
            value={draft}
            disabled={disabled}
            onChange={(e) => {
              setDraft(e.target.value);
              setPickerOpen(/@[\p{L}.]*$/u.test(e.target.value));
              setPickerIndex(0);
            }}
            onKeyDown={(e) => {
              if (showPicker) {
                if (e.key === "ArrowDown") return e.preventDefault(), setPickerIndex((i) => (i + 1) % matches.length);
                if (e.key === "ArrowUp") return e.preventDefault(), setPickerIndex((i) => (i - 1 + matches.length) % matches.length);
                if (e.key === "Enter" || e.key === "Tab") return e.preventDefault(), insert(matches[pickerIndex]);
                if (e.key === "Escape") return setPickerOpen(false);
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            aria-label="Message the table"
            placeholder={demo ? "Demo mode: a scripted session plays by itself." : disabled ? "The table needs an API key, or try the demo." : partner ? `Talk privately with ${ROSTER[partner].shortName}…` : "Message the table… (@ to address)"}
            className="max-h-40 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border border-line bg-surface px-4 py-2.5 text-[0.95rem] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none disabled:opacity-50"
          />
          {micSlot}
          <button
            onClick={submit}
            disabled={!draft.trim() || state.busy || disabled}
            className="hidden h-11 rounded-xl border border-line px-4 text-sm font-medium text-ink hover:border-accent disabled:opacity-40 sm:block"
          >
            Send
          </button>
          {!partner && s.messages.filter((m) => m.kind === "thinker").length >= 2 && (
            <button
              onClick={summarize}
              disabled={state.busy || disabled}
              title="The moderator sums up: where they agree, where they don't, what's unknown"
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-medium text-ink/85 hover:border-gold/50 disabled:opacity-40"
            >
              <span aria-hidden>≡</span>
              <span className="hidden md:inline">Sum up</span>
            </button>
          )}
          {!partner && s.messages.some((m) => m.kind === "thinker") && (
            <button
              onClick={keepArguing}
              disabled={state.busy || disabled}
              title="Let the table keep arguing without you"
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-accent/50 px-3 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
            >
              <span aria-hidden>↻</span>
              <span className="hidden md:inline">Let them argue</span>
            </button>
          )}
          <button
            onClick={onCallVote}
            disabled={state.busy || disabled}
            className={`btn-primary h-11 shrink-0 rounded-md px-4 ${
              s.decisionDetected && s.mode === "talk" && !state.busy ? "pulse-accent" : ""
            }`}
          >
            Call the vote
          </button>
        </div>
      </div>
    );
  },
);
