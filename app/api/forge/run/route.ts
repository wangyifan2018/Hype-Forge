import { z } from "zod";
import { runForgePipeline } from "@/lib/forge/orchestrator";
import { createSseStream } from "@/lib/forge/sse";
import type { ForgeRunEvent } from "@/lib/forge/types";
import { forgeInputSchema, productBriefSchema } from "@/lib/forge/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  input: forgeInputSchema,
  productBrief: productBriefSchema.optional().nullable(),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof bodySchema>;
  try {
    const rawBody = await request.json();
    console.log("[forge/run] raw body keys:", Object.keys(rawBody));
    console.log("[forge/run] input keys:", Object.keys(rawBody.input || {}));
    payload = bodySchema.parse(rawBody);
  } catch (err) {
    console.error("[forge/run] validation error type:", typeof err, err?.constructor?.name);
    console.error("[forge/run] validation error:", err);
    // Zod v4 may use a different error class, so we stringify the whole thing
    const details = err instanceof Error ? err.message : JSON.stringify(err);
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
      yield* runForgePipeline(payload.input, imageDataUrls, signal);
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
