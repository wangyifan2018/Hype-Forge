import { NextResponse } from "next/server";
import { z } from "zod";
import { runProductEnrich } from "@/lib/forge/service";

const bodySchema = z.object({
  productName: z.string().min(1),
  category: z.string().optional(),
  creativeHooks: z.array(z.string()).optional(),
  referenceCopy: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await runProductEnrich(body, request.signal);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Product enrich failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
