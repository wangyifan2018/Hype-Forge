import type { ForgeProgressStep } from "@/lib/forge/types";

export const STEP_LABELS: Record<ForgeProgressStep, string> = {
  vision: "识图分析",
  viralBrief: "爆款策划",
  visual: "视觉方案",
  copy: "文案生成",
  critic: "审稿优化",
};

function isValidationError(message: string): boolean {
  return (
    /too_small|too_big|Invalid input|invalid_type|ZodError/i.test(message) ||
    /"path":\s*\[/i.test(message)
  );
}

export function stepErrorHint(
  step?: ForgeProgressStep,
  errorMessage?: string
): string {
  const msg = errorMessage ?? "";
  switch (step) {
    case "vision":
      return "识图失败通常可忽略：请检查图片格式与大小，或不上传图片继续执行。";
    case "viralBrief":
      return "爆款策划失败：将使用默认策略继续，可手动调整文案角度。";
    case "visual":
      if (isValidationError(msg)) {
        return "视觉方案返回格式不完整（已尝试自动补齐）。请再点一次 Execute；若仍失败，检查输入是否过长。";
      }
      return "视觉方案失败：检查 DASHSCOPE_API_KEY、网络与模型额度。";
    case "copy":
      return "文案生成失败：检查 API Key 与输入是否过长。";
    case "critic":
      return "审稿失败：将使用文案初稿，可手动 Remix。";
    default:
      return "请查看下方流水线日志，或打开浏览器 Network 查看 /api/forge/run 响应。";
  }
}
