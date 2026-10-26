import type { ServerEvent } from "@/lib/types";
import { stripDashesDeep } from "@/lib/text";

/** Server side: a text/event-stream Response plus a typed `send`. */
export function createEventStream() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      closed = true;
    },
  });

  return {
    response: new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    }),
    send(event: ServerEvent) {
      if (closed) return;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event.type === "delta" ? event : stripDashesDeep(event))}\n\n`));
    },
    close() {
      if (closed) return;
      closed = true;
      controller.close();
    },
    get closed() {
      return closed;
    },
  };
}

/** Client side: POST JSON and yield parsed events as they arrive. */
export async function* readEvents(url: string, body: unknown, signal?: AbortSignal): AsyncGenerator<ServerEvent> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {}
    yield { type: "error", code: res.status === 400 ? "bad_request" : "failed", message };
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (line) yield JSON.parse(line.slice(6)) as ServerEvent;
    }
  }
}
