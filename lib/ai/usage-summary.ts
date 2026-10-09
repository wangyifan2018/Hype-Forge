import type { LlmUsageEntry } from "@/lib/ai/llm";

/**
 * 一次 Execute 的模型用量汇总。
 *
 * 此前卖家完全看不到"这次跑了几次模型、花了多久、用了多少 token"
 * （服务端只是把每次调用打到日志里）。这里做成可展示、可测试的汇总。
 */

export type UsageSummary = {
  calls: number;
  totalMs: number;
  inputTokens: number;
  outputTokens: number;
  /** 是否有调用没有上报 token（MOCK/部分网关不返回 usage） */
  tokensUnknown: boolean;
  fellBackCalls: number;
  models: string[];
};

export function summarizeUsage(entries: LlmUsageEntry[]): UsageSummary {
  let inputTokens = 0;
  let outputTokens = 0;
  let tokensUnknown = false;
  let totalMs = 0;
  let fellBackCalls = 0;
  const models = new Set<string>();

  for (const entry of entries) {
    totalMs += entry.ms;
    models.add(entry.model);
    if (entry.fellBack) fellBackCalls++;
    if (entry.inputTokens === undefined && entry.outputTokens === undefined) {
      tokensUnknown = true;
    } else {
      inputTokens += entry.inputTokens ?? 0;
      outputTokens += entry.outputTokens ?? 0;
    }
  }

  return {
    calls: entries.length,
    totalMs,
    inputTokens,
    outputTokens,
    tokensUnknown,
    fellBackCalls,
    models: Array.from(models),
  };
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function formatUsageSummary(summary: UsageSummary): string {
  if (summary.calls === 0) {
    return "本次执行未调用模型（MOCK 模式或复用缓存）";
  }

  const parts = [
    `${summary.calls} 次模型调用`,
    `总耗时 ${(summary.totalMs / 1000).toFixed(1)}s`,
  ];

  if (summary.tokensUnknown) {
    parts.push("token 用量未上报");
  } else {
    parts.push(
      `输入 ${formatTokens(summary.inputTokens)} / 输出 ${formatTokens(summary.outputTokens)} tokens`
    );
  }

  if (summary.fellBackCalls > 0) {
    parts.push(`其中 ${summary.fellBackCalls} 次由备用模型完成`);
  }
  if (summary.models.length > 1) {
    parts.push(`模型：${summary.models.join("、")}`);
  }

  return `本次执行：${parts.join(" · ")}`;
}
