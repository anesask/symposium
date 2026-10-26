import type { Station } from "@/lib/types";

const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function StationIcon({ station }: { station: Station }) {
  switch (station) {
    case "finance":
      return (
        <svg {...common} aria-hidden>
          <ellipse cx="12" cy="6" rx="7" ry="2.5" />
          <path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" />
        </svg>
      );
    case "risk":
      return (
        <svg {...common} aria-hidden>
          <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
          <path d="M12 8v4M12 15.5v.5" />
        </svg>
      );
    case "market":
      return (
        <svg {...common} aria-hidden>
          <path d="M4 20V10h4v10M10 20V6h4v14M16 20v-7h4v7M3 20h18" />
        </svg>
      );
    case "personal":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" />
        </svg>
      );
    case "longterm":
      return (
        <svg {...common} aria-hidden>
          <path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" />
        </svg>
      );
  }
}

export function Laurel({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" className={className} aria-hidden fill="currentColor">
      <path d="M8 34 C14 26 20 18 32 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 12 + i * 4.2;
        const y = 29 - i * 4.8;
        return (
          <g key={i}>
            <ellipse cx={x - 3} cy={y - 1} rx="3.6" ry="1.5" transform={`rotate(-70 ${x - 3} ${y - 1})`} />
            <ellipse cx={x + 2} cy={y + 2} rx="3.6" ry="1.5" transform={`rotate(10 ${x + 2} ${y + 2})`} />
          </g>
        );
      })}
    </svg>
  );
}

export function Check() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cond text-[#f3e6c4]">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}
