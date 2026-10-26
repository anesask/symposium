import { ROSTER } from "@/config/roster";
import { PORTRAIT_FORMAT } from "@/config/art";
import type { ThinkerId } from "@/lib/types";

/** Circular portrait from /public/portraits/{id}.{svg|png}. */
export function Portrait({
  id,
  size = 56,
  speaking = false,
  dim = false,
  className = "",
}: {
  id: ThinkerId;
  /** Pixels, or "fill" to take the parent's size. */
  size?: number | "fill";
  speaking?: boolean;
  dim?: boolean;
  className?: string;
}) {
  const t = ROSTER[id];
  const px = size === "fill" ? "100%" : size;
  return (
    <span
      className={`relative inline-block shrink-0 rounded-full ${speaking ? "speaking-ring" : ""} ${dim ? "opacity-50" : ""} ${className}`}
      style={{ width: px, height: px }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/portraits/${id}.${PORTRAIT_FORMAT}`}
        alt={t.name}
        width={size === "fill" ? 512 : size}
        height={size === "fill" ? 512 : size}
        className="h-full w-full rounded-full object-cover ring-1 ring-[#5a4a3a]"
      />
    </span>
  );
}
