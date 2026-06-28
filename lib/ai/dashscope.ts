import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText, Output, type ModelMessage } from "ai";
import type { z } from "zod";
import { extractJson } from "@/lib/forge/parse-json";

export type SearchOptions = {
  search_strategy?: "agent" | "agent_max";
  forced_search?: boolean;
};

export function getModel(): string {
  return process.env.DASHSCOPE_MODEL ?? "qwen3.6-plus";
}

export function getBaseUrl(): string {
  return (
    process.env.DASHSCOPE_BASE_URL ??
    "https://dashscope.aliyuncs.com/compatible-mode/v1"
  );
}

export function isLiveMode(): boolean {
  if (process.env.FORGE_FORCE_MOCK === "true") return false;
  return Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

export function getDashScopeProvider() {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey || !isLiveMode()) return null;
  
  return createOpenAICompatible({
    name: "dashscope",
    apiKey,
    baseURL: getBaseUrl(),
    // Use custom fetch to ensure enable_search and search_options are passed as top-level fields
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === "string") {
        try {
          const body = JSON.parse(init.body);
          console.log("[dashscope fetch] request body keys:", Object.keys(body).join(", "));
          console.log("[dashscope fetch] enable_search:", body.enable_search);
          console.log("[dashscope fetch] search_options:", body.search_options);
          // DashScope requires enable_search and search_options at the TOP LEVEL
          // Ensure they are present if the SDK's providerOptions flattening failed
          if (body.providerOptions?.dashscope) {
            const dashOpts = body.providerOptions.dashscope;
            if (dashOpts.enable_search !== undefined) {
              body.enable_search = dashOpts.enable_search;
            }
            if (dashOpts.search_options) {
              body.search_options = dashOpts.search_options;
            }
            // Remove the nested providerOptions to avoid confusion
            delete body.providerOptions;
            console.log("[dashscope fetch] moved enable_search/search_options to top level");
            init.body = JSON.stringify(body);
          }
          console.log("[dashscope fetch] final body keys:", Object.keys(body).join(", "));
        } catch (e) {
          // JSON parse failed, pass through unchanged
          console.log("[dashscope fetch] parse error:", e);
        }
      }
      return globalThis.fetch(input, init);
    },
  });
}

export function mapDashScopeError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("429") || message.includes("rate limit")) {
      return "请求过于频繁，请稍后重试";
    }
    if (message.includes("401") || message.includes("Unauthorized")) {
      return "API Key 无效或未授权";
    }
    return message;
  }
  return "未知错误";
}

function buildProviderOptions(options?: {
  search?: boolean;
  searchOptions?: SearchOptions;
}) {
  if (!options?.search) return undefined;
  
  // DashScope expects enable_search and search_options at the TOP LEVEL of the request body
  // @ai-sdk/openai-compatible flattens providerOptions.{providerName} into top-level fields
  // So we use the provider name "dashscope" as the key
  return {
    dashscope: {
      enable_search: true,
      search_options: {
        search_strategy: "agent",
        forced_search: true,
        ...options.searchOptions,
      },
    },
  };
}

export async function chatComplete(
  messages: ModelMessage[],
  options?: {
    json?: boolean;
    search?: boolean;
    searchOptions?: SearchOptions;
    signal?: AbortSignal;
    system?: string;
  }
): Promise<string> {
  const provider = getDashScopeProvider();
  if (!provider) throw new Error("DashScope provider not available");

  const providerOpts = buildProviderOptions(options);

  // DashScope requires streaming for web search in OpenAI compatible mode
  // Non-streaming calls with enable_search will silently ignore the search parameter
  if (options?.search) {
    console.log("[dashscope] using streamText for search-enabled call");
    let fullText = "";
    const result = streamText({
      model: provider(getModel()),
      messages,
      system: options?.system,
      providerOptions: providerOpts,
      abortSignal: options?.signal,
    });

    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    if (!fullText) throw new Error("Empty response from model");
    return fullText;
  }

  const { text } = await generateText({
    model: provider(getModel()),
    messages,
    system: options?.system,
    providerOptions: providerOpts,
    abortSignal: options?.signal,
  });

  if (!text) throw new Error("Empty response from model");
  return text;
}

export async function chatCompleteObject<T extends z.ZodType>(
  messages: ModelMessage[],
  schema: T,
  options?: {
    search?: boolean;
    searchOptions?: SearchOptions;
    signal?: AbortSignal;
    system?: string;
  }
): Promise<z.infer<T>> {
  const provider = getDashScopeProvider();
  if (!provider) throw new Error("DashScope provider not available");

  const providerOpts = buildProviderOptions(options);

  // DashScope requires streaming for web search in OpenAI compatible mode
  if (options?.search) {
    console.log("[dashscope] using streamText for search-enabled call (object mode)");
    let fullText = "";
    const result = streamText({
      model: provider(getModel()),
      messages,
      system: options?.system,
      providerOptions: providerOpts,
      abortSignal: options?.signal,
    });

    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    const json = extractJson(fullText);
    const output = schema.safeParse(json);
    if (!output.success) throw new Error(`Invalid response: ${output.error.message}`);
    return output.data;
  }

  const { output } = await generateText({
    model: provider(getModel()),
    messages,
    system: options?.system,
    output: Output.object({ schema }),
    providerOptions: buildProviderOptions(options),
    abortSignal: options?.signal,
  });

  if (!output) throw new Error("Empty response from model");
  return output as z.infer<T>;
}

export async function chatWithImage(
  text: string,
  imageDataUrl: string,
  options?: { json?: boolean; signal?: AbortSignal }
): Promise<string> {
  return chatWithImages(text, [imageDataUrl], options);
}

export async function chatWithImages(
  text: string,
  imageDataUrls: string[],
  options?: { json?: boolean; signal?: AbortSignal }
): Promise<string> {
  const urls = imageDataUrls.filter((u) => u.trim().length > 0);
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

export async function* chatStream(
  messages: ModelMessage[],
  signal?: AbortSignal,
  system?: string
): AsyncGenerator<string> {
  const provider = getDashScopeProvider();
  if (!provider) throw new Error("DashScope provider not available");

  const result = streamText({
    model: provider(getModel()),
    messages,
    system,
    abortSignal: signal,
  });

  for await (const chunk of result.textStream) {
    if (chunk) yield chunk;
  }
}
