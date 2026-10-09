import { NextResponse } from "next/server";
import { z } from "zod";
import { runEngage } from "@/lib/forge/service";
import { llmModelSchema } from "@/lib/forge/types";

const bodySchema = z.object({
  productName: z.string().min(1),
  affiliateLink: z.string().optional(),
  model: llmModelSchema,
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { model, ...params } = body;
    const result = await runEngage(params, { signal: request.signal, model });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Engage failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
