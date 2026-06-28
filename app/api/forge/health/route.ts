import { NextResponse } from "next/server";
import { getModel, isLiveMode } from "@/lib/ai/dashscope";

export async function GET() {
  return NextResponse.json({
    mode: isLiveMode() ? "live" : "mock",
    model: getModel(),
  });
}
