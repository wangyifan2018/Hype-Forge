import { NextResponse } from "next/server";
import { z } from "zod";
import { runEngage } from "@/lib/forge/service";

const bodySchema = z.object({
  productName: z.string().min(1),
  affiliateLink: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await runEngage(body, request.signal);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Engage failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
