import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { StructuredError, type CallInput, type Provider } from "./types";

const MODEL_FAST = process.env.OPENAI_MODEL_FAST || "gpt-5.4-mini";
const MODEL_SPEECH = process.env.OPENAI_MODEL_SPEECH || "gpt-5.5";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ maxRetries: 2 });
  return client;
}

export const openaiProvider: Provider = {
  name: "openai",
  hasKey: () => Boolean(process.env.OPENAI_API_KEY),

  async structuredOnce<S extends z.ZodType>(schema: S, input: CallInput): Promise<z.infer<S>> {
    const res = await getClient().responses.parse({
      model: MODEL_FAST,
      reasoning: { effort: "low" },
      max_output_tokens: (input.maxTokens ?? 4096) + 2048, // headroom for reasoning tokens
      instructions: input.system,
      input: input.user,
      text: { format: zodTextFormat(schema, "output") },
    });
    if (res.output_parsed == null) throw new StructuredError("unparseable output");
    return res.output_parsed as z.infer<S>;
  },

  async *speak(input) {
    const stream = getClient().responses.stream(
      {
        model: MODEL_SPEECH,
        reasoning: { effort: "low" },
        max_output_tokens: (input.maxTokens ?? 1024) + 2048,
        instructions: input.system,
        input: input.user,
      },
      { signal: input.signal },
    );
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") yield event.delta;
    }
  },

  isApiError: (err) => err instanceof OpenAI.APIError,

  describe(err) {
    if (err instanceof OpenAI.AuthenticationError) return { code: "no_key", message: "The OpenAI API key was rejected." };
    if (err instanceof OpenAI.RateLimitError) {
      const quota = /quota/i.test(err.message);
      return { code: "rate_limited", message: quota ? "OpenAI: the account is out of quota." : "The table needs a breath. Try again in a moment." };
    }
    if (err instanceof OpenAI.APIError) return { code: "failed", message: `OpenAI API: ${err.message}` };
    return null;
  },
};
