import { NextResponse } from "next/server";
import { z } from "zod";
import { runRemix } from "@/lib/forge/service";
import {
  forgeInputSchema,
  llmModelSchema,
  remixTypeSchema,
} from "@/lib/forge/types";

const bodySchema = z.object({
  remixType: remixTypeSchema,
  copyText: z.string().min(1),
  input: forgeInputSchema,
  creativeConcept: z.string().optional(),
  angle: z.string().optional(),
  model: llmModelSchema,
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { model, ...params } = body;
    const result = await runRemix(params, { signal: request.signal, model });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Remix failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
