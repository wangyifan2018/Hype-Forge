import { z } from "zod";
import { createSseStream } from "@/lib/forge/sse";
import { runCopyStream } from "@/lib/forge/service";
import type { StreamEvent } from "@/lib/forge/types";
import {
  forgeInputSchema,
  llmModelSchema,
  productBriefSchema,
  viralBriefSchema,
  visualPromptsSchema,
} from "@/lib/forge/types";

const bodySchema = z.object({
  input: forgeInputSchema,
  productBrief: productBriefSchema.optional().nullable(),
  prompts: visualPromptsSchema.optional().nullable(),
  viralBrief: viralBriefSchema.optional().nullable(),
  model: llmModelSchema,
});

export async function POST(request: Request) {
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = createSseStream(async function* (signal) {
    try {
      for await (const text of runCopyStream(
        payload.input,
        payload.productBrief ?? null,
        payload.prompts ?? null,
        payload.viralBrief ?? null,
        { signal, model: payload.model }
      )) {
        yield { type: "delta", text } satisfies StreamEvent;
      }
      yield { type: "done" } satisfies StreamEvent;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stream failed";
      yield { type: "error", message } satisfies StreamEvent;
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
