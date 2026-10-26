import "server-only";
import type { z } from "zod";
import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";
import { StructuredError, type CallInput, type Provider } from "./types";

export { StructuredError };

/** AI_PROVIDER=openai (default) | anthropic */
function provider(): Provider {
  return process.env.AI_PROVIDER === "anthropic" ? anthropicProvider : openaiProvider;
}

export function providerName() {
  return provider().name;
}

export function hasKey(): boolean {
  return provider().hasKey();
}

/**
 * One structured call on the fast model, validated against the Zod schema. Retries once on
 * a parse/validation failure, then throws StructuredError. API errors are thrown as-is.
 */
export async function structured<S extends z.ZodType>(schema: S, input: CallInput): Promise<z.infer<S>> {
  const p = provider();
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await p.structuredOnce(schema, input);
    } catch (err) {
      // Auth, billing and rate-limit errors aren't fixed by a retry here; the SDK already retried.
      if (p.isApiError(err)) throw err;
      lastErr = err;
    }
  }
  throw lastErr instanceof StructuredError ? lastErr : new StructuredError(String(lastErr));
}

/** Streams one in-character speech from the speech model. */
export function speak(input: CallInput & { signal?: AbortSignal }): AsyncGenerator<string> {
  return provider().speak(input);
}

export function describeError(err: unknown): { code: "no_key" | "rate_limited" | "failed"; message: string } {
  return (
    provider().describe(err) ?? { code: "failed", message: err instanceof Error ? err.message : "Something went wrong." }
  );
}
