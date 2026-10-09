import { NextResponse } from "next/server";
import { z } from "zod";
import { runTrendScan } from "@/lib/forge/service";
import { llmModelSchema, platformSchema } from "@/lib/forge/types";

const bodySchema = z.object({
  platform: platformSchema,
  categoryHint: z.string().optional(),
  categoryLabel: z.string().optional(),
  forceRefresh: z.boolean().optional(),
  discoveryMode: z.enum(["auto", "manual"]).optional(),
  autoScope: z.enum(["category", "open"]).optional(),
  model: llmModelSchema,
});

export async function POST(request: Request) {
  try {
    const {
      platform,
      categoryHint,
      categoryLabel,
      forceRefresh,
      discoveryMode,
      autoScope,
      model,
    } = bodySchema.parse(await request.json());
    const result = await runTrendScan({
      platform,
      categoryHint,
      categoryLabel,
      forceRefresh,
      discoveryMode: discoveryMode ?? "manual",
      autoScope: autoScope ?? "category",
      signal: request.signal,
      model,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trend scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
