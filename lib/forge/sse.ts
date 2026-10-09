import type { ForgeRunEvent, StreamEvent } from "@/lib/forge/types";

export function encodeSseEvent(event: StreamEvent | ForgeRunEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** 空闲心跳间隔：长步骤（如思考模式下的文案生成）期间保持连接不被网关掐断 */
const HEARTBEAT_MS = 15_000;

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

      let closed = false;
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          // SSE 注释行：客户端会忽略，仅用于保活
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // 流已关闭
        }
      }, HEARTBEAT_MS);

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
        closed = true;
        clearInterval(heartbeat);
        requestSignal?.removeEventListener("abort", onAbort);
        controller.close();
      }
    },
    cancel() {
      /* client disconnected */
    },
  });
}
