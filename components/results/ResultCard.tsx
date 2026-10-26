"use client";

import type { VoteResult } from "@/lib/types";
import { GateCard } from "./GateCard";
import { MatrixCard } from "./MatrixCard";
import { PremortemCard } from "./PremortemCard";

export function ResultCard({ result }: { result: VoteResult }) {
  switch (result.framework) {
    case "gate":
      return <GateCard result={result} />;
    case "matrix":
      return <MatrixCard result={result} />;
    case "premortem":
      return <PremortemCard result={result} />;
    default:
      return null;
  }
}
