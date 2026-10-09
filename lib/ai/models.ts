/**
 * LLM 模型目录（单一事实来源，客户端/服务端共用）
 *
 * 当前网关：阿里云百炼 DashScope OpenAI 兼容端点（见 `lib/ai/llm.ts`）。
 * 目录内模型均已上架百炼，且同时具备「图文输入 + 联网搜索」两项能力——
 * 这两项分别支撑 Step3 多图识图（`runVision`）与 Step1 热点情报（`enable_search`），
 * 因此新增模型时必须确认两项能力，否则对应链路会静默降级。
 */

export type LlmModelId = "deepseek-v4.1-flash" | "qwen3.6-plus";

export type LlmModelOption = {
  id: LlmModelId;
  /** UI 展示名 */
  label: string;
  vendor: "DeepSeek" | "Qwen";
  /** UI 下拉项副标题 */
  hint: string;
  /** 是否支持图片输入（Step3 识图必需） */
  supportsVision: boolean;
  /** 是否支持百炼 `enable_search` 联网搜索（Step1 情报必需） */
  supportsWebSearch: boolean;
};

export const LLM_MODELS: readonly LlmModelOption[] = [
  {
    id: "deepseek-v4.1-flash",
    label: "DeepSeek V4.1 Flash",
    vendor: "DeepSeek",
    hint: "默认 · 图文 + 联网 · 性价比",
    supportsVision: true,
    supportsWebSearch: true,
  },
  {
    id: "qwen3.6-plus",
    label: "Qwen3.6 Plus",
    vendor: "Qwen",
    hint: "备选 · 图文 + 联网",
    supportsVision: true,
    supportsWebSearch: true,
  },
];

export const DEFAULT_LLM_MODEL_ID: LlmModelId = "deepseek-v4.1-flash";

export function isLlmModelId(value: unknown): value is LlmModelId {
  return (
    typeof value === "string" && LLM_MODELS.some((model) => model.id === value)
  );
}

/**
 * 把任意来源（UI 选择 / 请求体 / 环境变量）收敛为合法模型 id。
 * 未知值回落到默认模型，保证接口不因前端遗留的旧模型名而整体失败。
 */
export function resolveLlmModelId(value: unknown): LlmModelId {
  return isLlmModelId(value) ? value : DEFAULT_LLM_MODEL_ID;
}

/**
 * 备用模型：主模型遇到限流/5xx/网络问题时再试一次。
 * 取目录中第一个与主模型不同、且能力达标的项（当前目录两项都支持图文+联网）。
 */
export function getFallbackModelId(primary: string): LlmModelId | undefined {
  return LLM_MODELS.find(
    (model) =>
      model.id !== primary && model.supportsVision && model.supportsWebSearch
  )?.id;
}

export function getLlmModelOption(id: string): LlmModelOption | undefined {
  return LLM_MODELS.find((model) => model.id === id);
}

export function llmModelLabel(id: string): string {
  return getLlmModelOption(id)?.label ?? id;
}
