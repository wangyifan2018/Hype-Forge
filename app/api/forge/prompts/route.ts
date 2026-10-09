import { NextResponse } from "next/server";
import { z } from "zod";
import { runVisualPrompts } from "@/lib/forge/service";
import {
  forgeInputSchema,
  llmModelSchema,
  productBriefSchema,
  visualPromptsSchema,
} from "@/lib/forge/types";

const bodySchema = z.object({
  input: forgeInputSchema,
  productBrief: productBriefSchema.optional().nullable(),
  model: llmModelSchema,
});

export async function POST(request: Request) {
  try {
    const { input, productBrief, model } = bodySchema.parse(
      await request.json()
    );
    const prompts = await runVisualPrompts(input, productBrief ?? null, null, {
      signal: request.signal,
      model,
    });
    return NextResponse.json(visualPromptsSchema.parse(prompts));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompts failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
