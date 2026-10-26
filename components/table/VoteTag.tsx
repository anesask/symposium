import type { VoteTag as Tag } from "@/lib/types";

export function voteColor(vote: Tag): "go" | "nogo" | "cond" | "muted" {
  const v = vote.toUpperCase();
  if (v === "NO-GO" || v === "STOP") return "nogo";
  if (v === "GO" || v === "PROCEED") return "go";
  if (v === "ABSTAIN" || v === "RISK") return "muted";
  return "cond";
}

/** Plain words for the vote codes, matching the verdict scroll. Option names pass through. */
const LABELS: Record<string, string> = {
  GO: "Yes",
  "GO, IF": "Yes, if",
  CONDITIONAL: "Maybe",
  "NO-GO": "Not yet",
  ABSTAIN: "Abstained",
  PROCEED: "Go ahead",
  REVISE: "Rethink",
  STOP: "Stop",
  RISK: "Risk",
};
export const voteLabel = (vote: string) => LABELS[vote.toUpperCase()] ?? vote;

const FILLED = {
  go: "bg-go text-[#1d140b]",
  nogo: "bg-nogo text-white",
  cond: "bg-cond text-[#2a1d05]",
  muted: "bg-surface-2 text-muted",
};
const OUTLINE = {
  go: "border border-go/70 text-go",
  nogo: "border border-nogo/70 text-nogo",
  cond: "border border-cond/70 text-cond",
  muted: "border border-line text-muted",
};

export function VoteTag({ vote, outline = false, className = "" }: { vote: Tag; outline?: boolean; className?: string }) {
  const c = voteColor(vote);
  return (
    <span
      className={`vote-pop inline-block max-w-[11rem] shrink-0 truncate whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wide ${
        outline ? OUTLINE[c] : FILLED[c]
      } ${className}`}
    >
      {voteLabel(vote)}
    </span>
  );
}
