import type { ForgeRunEvent, StreamEvent } from "@/lib/forge/types";

export function encodeSseEvent(event: StreamEvent | ForgeRunEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSseStream<T extends StreamEvent | ForgeRunEvent>(
  generator: (signal: AbortSignal) => AsyncGenerator<T>,
  requestSignal?: AbortSignal
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const abort = new AbortController();

      const onAbort = () => abort.abort();
      requestSignal?.addEventListener("abort", onAbort);

      try {
        for await (const event of generator(abort.signal)) {
          if (abort.signal.aborted) break;
          controller.enqueue(encoder.encode(encodeSseEvent(event)));
          if (event.type === "done" || event.type === "error") break;
        }
      } catch (error) {
        if (!abort.signal.aborted) {
          const message =
            error instanceof Error ? error.message : "Stream failed";
          controller.enqueue(
            encoder.encode(
              encodeSseEvent({ type: "error", message } as T)
            )
          );
        }
      } finally {
        requestSignal?.removeEventListener("abort", onAbort);
        controller.close();
      }
    },
    cancel() {
      /* client disconnected */
    },
  });
}
