import { z } from "zod";
import { runForgePipeline } from "@/lib/forge/orchestrator";
import { createSseStream } from "@/lib/forge/sse";
import type { ForgeRunEvent } from "@/lib/forge/types";
import {
  forgeInputSchema,
  llmModelSchema,
  productBriefSchema,
} from "@/lib/forge/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  input: forgeInputSchema,
  productBrief: productBriefSchema.optional().nullable(),
  model: llmModelSchema,
});

export async function POST(request: Request) {
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch (err) {
    const details = err instanceof Error ? err.message : JSON.stringify(err);
    console.warn("[forge/run] 请求体校验失败:", details);
    return new Response(JSON.stringify({ error: "Invalid payload", details }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const imageDataUrls =
    payload.input.productImages?.map((p) => p.dataUrl).filter(Boolean) ??
    (payload.input.productImage ? [payload.input.productImage] : null);

  const stream = createSseStream<ForgeRunEvent>(
    async function* (signal) {
      yield* runForgePipeline(payload.input, imageDataUrls, {
        signal,
        model: payload.model,
      });
    },
    request.signal
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
