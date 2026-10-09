/**
 * 模型回退链。
 *
 * 单一网关/单一模型时，一次 429、5xx 或网络抖动就会让整步失败（或静默降级成
 * mock）。这里把"主模型失败 → 备用模型再试一次"做成可注入、可单测的逻辑：
 * - 只对**可重试**的错误回退（限流、服务端错误、网络/超时）
 * - 认证/参数/模型不存在等错误直接抛出（换模型也没用，早失败更好）
 * - 用户主动取消（AbortError）绝不回退
 */

export type FallbackOutcome<T> = {
  value: T;
  /** 实际成功的模型；发生回退时 != primary */
  usedModel: string;
  /** 主模型失败的原因（未回退时为 undefined） */
  primaryError?: string;
  attempts: number;
};

export function isRetryableModelError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name;
  // 用户取消绝不回退（否则会在用户点了 Cancel 之后又烧一次调用）；
  // 超时属于可重试的传输问题。
  if (name === "AbortError") return false;
  if (name === "TimeoutError") return true;
  const message = error.message.toLowerCase();
  if (
    message.includes("invalid_api_key") ||
    message.includes("incorrect api key") ||
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("400") ||
    message.includes("model_not_found")
  ) {
    return false;
  }
  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("socket") ||
    message.includes("fetch failed") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("overloaded")
  );
}

export type WithFallbackParams<T> = {
  primary: string;
  fallback?: string;
  attempt: (model: string) => Promise<T>;
  isRetryable?: (error: unknown) => boolean;
  onFallback?: (info: { from: string; to: string; reason: string }) => void;
};

export async function withModelFallback<T>(
  params: WithFallbackParams<T>
): Promise<FallbackOutcome<T>> {
  const isRetryable = params.isRetryable ?? isRetryableModelError;

  try {
    const value = await params.attempt(params.primary);
    return { value, usedModel: params.primary, attempts: 1 };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "未知错误";
    const canFallback =
      Boolean(params.fallback) &&
      params.fallback !== params.primary &&
      isRetryable(error);

    if (!canFallback) throw error;

    params.onFallback?.({
      from: params.primary,
      to: params.fallback as string,
      reason,
    });

    const value = await params.attempt(params.fallback as string);
    return {
      value,
      usedModel: params.fallback as string,
      primaryError: reason,
      attempts: 2,
    };
  }
}
