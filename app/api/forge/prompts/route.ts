import { NextResponse } from "next/server";
import { z } from "zod";
import { runVisualPrompts } from "@/lib/forge/service";
import {
  forgeInputSchema,
  productBriefSchema,
  visualPromptsSchema,
} from "@/lib/forge/types";

const bodySchema = z.object({
  input: forgeInputSchema,
  productBrief: productBriefSchema.optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const { input, productBrief } = bodySchema.parse(await request.json());
    const prompts = await runVisualPrompts(
      input,
      productBrief ?? null,
      null,
      request.signal
    );
    return NextResponse.json(visualPromptsSchema.parse(prompts));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompts failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
