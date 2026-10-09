/**
 * 情报检索的「真实阶段回执」。
 *
 * 背景：情报面板此前用 `delayMs` 累加 setTimeout 播放 13 个阶段（"采集抖音热搜"
 * "扫描得物社区"…），而背后只有 1 次联网归纳调用 —— 展示的过程是编造的。
 * 现在改为服务端记录**实际发生**的阶段与耗时，前端只如实呈现。
 */

export type IntelStageId =
  | "cache"
  | "search"
  | "parse"
  | "rank"
  | "fallback"
  | "mock";

export type IntelStage = {
  id: IntelStageId;
  /** 人类可读的阶段名，如「联网检索公开讨论」 */
  label: string;
  /** 补充说明，如「命中缓存」「模型 deepseek-v4.1-flash」 */
  detail?: string;
  /** 实际耗时（毫秒） */
  ms: number;
  status: "ok" | "warn";
};

export function formatStageMs(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** 记录一个同步阶段 */
export function pushStage(
  stages: IntelStage[],
  stage: Omit<IntelStage, "ms"> & { ms?: number }
): void {
  stages.push({ ms: 0, ...stage });
}

/** 记录一个异步阶段的真实耗时；异常照常抛出，但仍留下 warn 记录 */
export async function measureStage<T>(
  stages: IntelStage[],
  id: IntelStageId,
  label: string,
  fn: () => Promise<T>,
  detailFor?: (result: T) => string | undefined
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    stages.push({
      id,
      label,
      detail: detailFor?.(result),
      ms: Date.now() - startedAt,
      status: "ok",
    });
    return result;
  } catch (error) {
    stages.push({
      id,
      label,
      detail: error instanceof Error ? error.message : "未知错误",
      ms: Date.now() - startedAt,
      status: "warn",
    });
    throw error;
  }
}
