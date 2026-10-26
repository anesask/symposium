import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { StructuredError, type CallInput, type Provider } from "./types";

const MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || process.env.MODEL_FAST || "claude-haiku-5-5";
const MODEL_SPEECH = process.env.ANTHROPIC_MODEL_SPEECH || process.env.MODEL_SPEECH || "claude-sonnet-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 2 });
  return client;
}

export const anthropicProvider: Provider = {
  name: "anthropic",
  hasKey: () => Boolean(process.env.ANTHROPIC_API_KEY),

  async structuredOnce<S extends z.ZodType>(schema: S, input: CallInput): Promise<z.infer<S>> {
    const res = await getClient().messages.parse({
      model: MODEL_FAST,
      max_tokens: input.maxTokens ?? 4096,
      system: input.system,
      messages: [{ role: "user", content: input.user }],
      output_config: { format: zodOutputFormat(schema), effort: "low" },
    });
    if (res.stop_reason === "refusal") throw new StructuredError("refused");
    if (res.parsed_output == null) throw new StructuredError("unparseable output");
    return res.parsed_output as z.infer<S>;
  },

  async *speak(input) {
    const stream = getClient().beta.messages.stream(
      {
        model: MODEL_SPEECH,
        max_tokens: input.maxTokens ?? 1024,
        system: input.system,
        messages: [{ role: "user", content: input.user }],
        output_config: { effort: "low" },
        // If a safety classifier declines an in-character line, retry server-side on a fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal: input.signal },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") yield "\n\n*(declines to answer)*";
  },

  isApiError: (err) => err instanceof Anthropic.APIError,

  describe(err) {
    if (err instanceof Anthropic.AuthenticationError) return { code: "no_key", message: "The Anthropic API key was rejected." };
    if (err instanceof Anthropic.RateLimitError) return { code: "rate_limited", message: "The table needs a breath. Try again in a moment." };
    if (err instanceof Anthropic.APIError) {
      const detail = (err.error as { error?: { message?: string } } | undefined)?.error?.message;
      return { code: "failed", message: detail ? `Claude API: ${detail}` : `Claude API error (${err.status ?? "network"}).` };
    }
    return null;
  },
};
