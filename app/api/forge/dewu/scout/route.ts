import { NextResponse } from "next/server";
import { z } from "zod";
import { runProductScout } from "@/lib/forge/service";
import { hotTrendCardSchema } from "@/lib/forge/types";

const bodySchema = z.object({
  categoryHint: z.string().optional(),
  categoryLabel: z.string().optional(),
  selectedTrend: hotTrendCardSchema.optional().nullable(),
  forceRefresh: z.boolean().optional(),
  discoveryMode: z.enum(["auto", "manual"]).optional(),
  autoScope: z.enum(["category", "open"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await runProductScout({
      categoryHint: body.categoryHint ?? "",
      categoryLabel: body.categoryLabel,
      selectedTrend: body.selectedTrend ?? null,
      forceRefresh: body.forceRefresh,
      discoveryMode: body.discoveryMode ?? "manual",
      autoScope: body.autoScope ?? "category",
      signal: request.signal,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Product scout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
