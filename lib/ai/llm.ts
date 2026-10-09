import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText, Output, type ModelMessage } from "ai";
import type { z } from "zod";
import {
  DEFAULT_LLM_MODEL_ID,
  isLlmModelId,
  type LlmModelId,
} from "@/lib/ai/models";
import { extractJson } from "@/lib/forge/parse-json";

export type SearchOptions = {
  search_strategy?: "agent" | "agent_max";
  forced_search?: boolean;
};

/** 单次调用的通用选项：模型可在 UI 选择并随请求下发 */
export type LlmCallOptions = {
  /** 模型 id，需命中 lib/ai/models.ts 目录；缺省用服务端默认模型 */
  model?: string;
  signal?: AbortSignal;
  /** 系统提示词（禁止放进 messages，防止 prompt injection） */
  system?: string;
  /** 启用百炼联网搜索（仅流式模式下生效，见 streamToString 注释） */
  search?: boolean;
  searchOptions?: SearchOptions;
};

/** @ai-sdk/openai-compatible 的 provider 名，同时决定 providerOptions 的键名 */
const PROVIDER_NAME = "dashscope";
const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export function getBaseUrl(): string {
  return process.env.DASHSCOPE_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

const warned = new Set<string>();
const MAX_WARNED = 50;

function warnOnce(message: string): void {
  if (warned.has(message)) return;
  // 上限保护：模型名来自请求体，不能让它把 Set 撑成无界内存
  if (warned.size >= MAX_WARNED) return;
  warned.add(message);
  console.warn(`[llm] ${message}`);
}

/** 单次调用的默认超时（毫秒），可用 FORGE_LLM_TIMEOUT_MS 覆盖 */
function getTimeoutMs(): number {
  const raw = Number(process.env.FORGE_LLM_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 180_000;
}

/** usage 是 PromiseLike，取不到时不影响主流程 */
async function safeUsage(value: PromiseLike<unknown>): Promise<unknown> {
  try {
    return await value;
  } catch {
    return undefined;
  }
}

function newCallId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * 结构化调用日志（单点覆盖全部 LLM 调用）。
 * 之前全链路没有 requestId / 耗时 / token 记账，出问题只能靠猜。
 */
function logCall(entry: {
  id: string;
  model: string;
  mode: "text" | "object" | "search" | "stream";
  ms: number;
  ok: boolean;
  usage?: unknown;
  finishReason?: string;
  error?: string;
}): void {
  const line = JSON.stringify({ scope: "llm", ...entry });
  if (entry.ok) console.info(line);
  else console.warn(line);
}

/**
 * 服务端默认模型。
 * `DASHSCOPE_MODEL` 必须命中 lib/ai/models.ts 目录，否则回落到目录默认值并告警——
 * 避免健康检查徽标显示的模型与实际调用不一致。
 */
export function getDefaultModelId(): LlmModelId {
  const raw = process.env.DASHSCOPE_MODEL?.trim();
  if (!raw) return DEFAULT_LLM_MODEL_ID;
  if (isLlmModelId(raw)) return raw;
  warnOnce(
    `DASHSCOPE_MODEL="${raw}" 不在模型目录中，已回落到 ${DEFAULT_LLM_MODEL_ID}（可选值见 lib/ai/models.ts）`
  );
  return DEFAULT_LLM_MODEL_ID;
}

/** 请求下发的模型优先，其次服务端默认；非法值回落而不是报错 */
export function resolveRequestModel(model?: string | null): LlmModelId {
  if (!model) return getDefaultModelId();
  if (!isLlmModelId(model)) {
    warnOnce(`请求指定了未知模型 "${model}"，已回落到 ${DEFAULT_LLM_MODEL_ID}`);
    return DEFAULT_LLM_MODEL_ID;
  }
  return model;
}

export function isLiveMode(): boolean {
  if (process.env.FORGE_FORCE_MOCK === "true") return false;
  return Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

type LlmProvider = ReturnType<typeof createOpenAICompatible>;

let cachedProvider: LlmProvider | null = null;
let cachedProviderKey = "";

/** 进程内复用 provider（无状态，apiKey 变化时重建） */
export function getLlmProvider(): LlmProvider | null {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey || !isLiveMode()) return null;

  if (cachedProvider && cachedProviderKey === apiKey) return cachedProvider;

  cachedProvider = createOpenAICompatible({
    name: PROVIDER_NAME,
    apiKey,
    baseURL: getBaseUrl(),
  });
  cachedProviderKey = apiKey;
  return cachedProvider;
}

export function mapLlmError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    const lower = message.toLowerCase();
    if (message.includes("429") || lower.includes("rate limit")) {
      return "请求过于频繁，请稍后重试";
    }
    if (
      message.includes("401") ||
      lower.includes("unauthorized") ||
      lower.includes("invalid_api_key") ||
      lower.includes("incorrect api key") ||
      lower.includes("invalid api key")
    ) {
      return "API Key 无效或未授权";
    }
    if (
      message.includes("403") ||
      lower.includes("permission") ||
      lower.includes("not authorized")
    ) {
      return "模型未开通或无权访问，请在百炼控制台确认";
    }
    if (
      message.includes("404") ||
      lower.includes("model_not_found") ||
      lower.includes("does not exist")
    ) {
      return "模型不可用，请检查模型名与地域 endpoint";
    }
    return message;
  }
  return "未知错误";
}

/** 百炼联网搜索的顶层字段（需与 providerOptions 的 JSON 值类型兼容） */
type BailianSearchProviderOptions = {
  enable_search: boolean;
  search_options: {
    search_strategy: "agent" | "agent_max";
    forced_search: boolean;
  };
};

/**
 * 百炼要求 `enable_search` / `search_options` 位于请求体顶层。
 * @ai-sdk/openai-compatible 会把 providerOptions[providerName] 中**不在其标准选项表内**
 * 的键平铺到请求体顶层，因此这里直接用 provider 名作为键。
 */
function buildProviderOptions(options?: {
  search?: boolean;
  searchOptions?: SearchOptions;
}): Record<string, BailianSearchProviderOptions> | undefined {
  if (!options?.search) return undefined;

  return {
    [PROVIDER_NAME]: {
      enable_search: true,
      search_options: {
        search_strategy: options.searchOptions?.search_strategy ?? "agent",
        forced_search: options.searchOptions?.forced_search ?? true,
      },
    },
  };
}

/** 百炼兼容模式要求联网搜索走流式，非流式会静默忽略 enable_search */
async function streamToString(options: {
  model: string;
  messages: ModelMessage[];
  system?: string;
  providerOptions?: Record<string, BailianSearchProviderOptions>;
  signal?: AbortSignal;
}): Promise<string> {
  const provider = getLlmProvider();
  if (!provider) throw new Error("LLM provider not available");

  // 流式请求的失败（如 401/429）不会抛到 textStream，需显式捕获，
  // 否则只能报 "Empty response from model"，掩盖真实原因导致静默降级。
  let streamError: unknown;
  const callId = newCallId();
  const startedAt = Date.now();
  const result = streamText({
    model: provider(options.model),
    messages: options.messages,
    system: options.system,
    providerOptions: options.providerOptions,
    abortSignal: options.signal,
    timeout: getTimeoutMs(),
    onError: (event) => {
      streamError = event.error;
    },
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    fullText += chunk;
  }

  const usage = await safeUsage(result.usage);

  if (!fullText) {
    const failure = streamError ?? new Error("Empty response from model");
    logCall({
      id: callId,
      model: options.model,
      mode: "search",
      ms: Date.now() - startedAt,
      ok: false,
      error: mapLlmError(failure),
    });
    throw failure;
  }

  logCall({
    id: callId,
    model: options.model,
    mode: "search",
    ms: Date.now() - startedAt,
    ok: true,
    usage,
  });
  return fullText;
}

/**
 * 单轮补全。
 * JSON 输出统一由「prompt 约定 + extractJson 容错解析」完成，
 * 未使用 response_format（百炼/DeepSeek 的 json_object 模式对 prompt 有额外约束，未验证）。
 */
export async function chatComplete(
  messages: ModelMessage[],
  options?: LlmCallOptions
): Promise<string> {
  const model = resolveRequestModel(options?.model);

  if (options?.search) {
    return streamToString({
      model,
      messages,
      system: options.system,
      providerOptions: buildProviderOptions(options),
      signal: options.signal,
    });
  }

  const provider = getLlmProvider();
  if (!provider) throw new Error("LLM provider not available");

  const callId = newCallId();
  const startedAt = Date.now();
  try {
    const { text, usage, finishReason } = await generateText({
      model: provider(model),
      messages,
      system: options?.system,
      abortSignal: options?.signal,
      timeout: getTimeoutMs(),
    });
    if (!text) throw new Error("Empty response from model");
    logCall({
      id: callId,
      model,
      mode: "text",
      ms: Date.now() - startedAt,
      ok: true,
      usage,
      finishReason,
    });
    return text;
  } catch (error) {
    logCall({
      id: callId,
      model,
      mode: "text",
      ms: Date.now() - startedAt,
      ok: false,
      error: mapLlmError(error),
    });
    throw error;
  }
}

/** 结构化输出（当前工程未使用，保留给后续 Agent 改造） */
export async function chatCompleteObject<T extends z.ZodType>(
  messages: ModelMessage[],
  schema: T,
  options?: LlmCallOptions
): Promise<z.infer<T>> {
  const model = resolveRequestModel(options?.model);

  if (options?.search) {
    const text = await streamToString({
      model,
      messages,
      system: options.system,
      providerOptions: buildProviderOptions(options),
      signal: options.signal,
    });
    const parsed = schema.safeParse(extractJson(text));
    if (!parsed.success) {
      throw new Error(`Invalid response: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  const provider = getLlmProvider();
  if (!provider) throw new Error("LLM provider not available");

  const { output } = await generateText({
    model: provider(model),
    messages,
    system: options?.system,
    output: Output.object({ schema }),
    abortSignal: options?.signal,
  });

  if (!output) throw new Error("Empty response from model");
  return output as z.infer<T>;
}

export async function chatWithImage(
  text: string,
  imageDataUrl: string,
  options?: Omit<LlmCallOptions, "search">
): Promise<string> {
  return chatWithImages(text, [imageDataUrl], options);
}

export async function chatWithImages(
  text: string,
  imageDataUrls: string[],
  options?: Omit<LlmCallOptions, "search">
): Promise<string> {
  const urls = imageDataUrls.filter((url) => url.trim().length > 0);
  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text },
        ...urls.map((url) => ({
          type: "image" as const,
          image: url,
        })),
      ],
    },
  ];
  return chatComplete(messages, options);
}

/** 流式补全（仅产出最终答案，不含思维链） */
export async function* chatStream(
  messages: ModelMessage[],
  options?: Omit<LlmCallOptions, "search" | "searchOptions">
): AsyncGenerator<string> {
  const provider = getLlmProvider();
  if (!provider) throw new Error("LLM provider not available");

  let streamError: unknown;
  const model = resolveRequestModel(options?.model);
  const callId = newCallId();
  const startedAt = Date.now();
  const result = streamText({
    model: provider(model),
    messages,
    system: options?.system,
    abortSignal: options?.signal,
    timeout: getTimeoutMs(),
    onError: (event) => {
      streamError = event.error;
    },
  });

  let yielded = false;
  for await (const chunk of result.textStream) {
    if (chunk) {
      yielded = true;
      yield chunk;
    }
  }

  // 流式失败不抛异常，仅在无输出时补抛，保证调用方能拿到真实错误
  if (!yielded && streamError) {
    logCall({
      id: callId,
      model,
      mode: "stream",
      ms: Date.now() - startedAt,
      ok: false,
      error: mapLlmError(streamError),
    });
    throw streamError;
  }
  logCall({
    id: callId,
    model,
    mode: "stream",
    ms: Date.now() - startedAt,
    ok: true,
    usage: await safeUsage(result.usage),
  });
}
