import { NextResponse } from "next/server";
import { getDefaultModelId, isLiveMode } from "@/lib/ai/llm";
import { LLM_MODELS } from "@/lib/ai/models";

export async function GET() {
  const defaultModel = getDefaultModelId();
  return NextResponse.json({
    mode: isLiveMode() ? "live" : "mock",
    /** 服务端默认模型（DASHSCOPE_MODEL，须命中模型目录） */
    model: defaultModel,
    defaultModel,
    /** UI 选择器数据源 */
    models: LLM_MODELS,
  });
}
