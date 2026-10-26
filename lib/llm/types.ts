import type { z } from "zod";

export interface CallInput {
  system: string;
  user: string;
  maxTokens?: number;
}

export class StructuredError extends Error {}

export interface Provider {
  name: "openai" | "anthropic";
  hasKey(): boolean;
  /** One structured attempt; throws StructuredError on unparseable output. */
  structuredOnce<S extends z.ZodType>(schema: S, input: CallInput): Promise<z.infer<S>>;
  speak(input: CallInput & { signal?: AbortSignal }): AsyncGenerator<string>;
  isApiError(err: unknown): boolean;
  describe(err: unknown): { code: "no_key" | "rate_limited" | "failed"; message: string } | null;
}
