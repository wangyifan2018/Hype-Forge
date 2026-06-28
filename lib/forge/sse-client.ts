import type { ForgeRunEvent, StreamEvent } from "@/lib/forge/types";

export async function consumeSseStream<T extends StreamEvent | ForgeRunEvent>(
  response: Response,
  onEvent: (event: T) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      return;
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as T;
        onEvent(event);
        if (
          typeof event === "object" &&
          event !== null &&
          "type" in event &&
          event.type === "error"
        ) {
          throw new Error((event as { message: string }).message);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}
