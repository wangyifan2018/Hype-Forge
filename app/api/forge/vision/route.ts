import { NextResponse } from "next/server";
import { z } from "zod";
import { validateImageDataUrl } from "@/lib/forge/image";
import { runVision } from "@/lib/forge/service";
import { productBriefSchema } from "@/lib/forge/types";

const bodySchema = z.object({
  image: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const imageError = validateImageDataUrl(body.image);
    if (imageError) {
      return NextResponse.json({ error: imageError }, { status: 400 });
    }

    const brief = await runVision(body.image, undefined, request.signal);
    return NextResponse.json(productBriefSchema.parse(brief));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vision failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
