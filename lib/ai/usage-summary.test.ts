import { describe, expect, it } from "vitest";
import { formatUsageSummary, summarizeUsage } from "@/lib/ai/usage-summary";
import type { LlmUsageEntry } from "@/lib/ai/llm";

const entry = (over: Partial<LlmUsageEntry> = {}): LlmUsageEntry => ({
  model: "deepseek-v4.1-flash",
  mode: "text",
  ms: 1000,
  inputTokens: 1000,
  outputTokens: 500,
  ...over,
});

describe("summarizeUsage", () => {
  it("累加次数/耗时/token，并记录涉及的模型", () => {
    const summary = summarizeUsage([entry(), entry({ ms: 2000, mode: "search" })]);
    expect(summary.calls).toBe(2);
    expect(summary.totalMs).toBe(3000);
    expect(summary.inputTokens).toBe(2000);
    expect(summary.outputTokens).toBe(1000);
    expect(summary.models).toEqual(["deepseek-v4.1-flash"]);
    expect(summary.tokensUnknown).toBe(false);
  });

  it("有调用没上报 token 时标记 tokensUnknown，不假装是 0", () => {
    const summary = summarizeUsage([
      entry({ inputTokens: undefined, outputTokens: undefined }),
    ]);
    expect(summary.tokensUnknown).toBe(true);
  });

  it("统计回退次数与多模型", () => {
    const summary = summarizeUsage([
      entry({ fellBack: true, model: "qwen3.6-plus" }),
      entry(),
    ]);
    expect(summary.fellBackCalls).toBe(1);
    expect(summary.models).toHaveLength(2);
  });
});

describe("formatUsageSummary", () => {
  it("未调用模型时明确说明原因", () => {
    expect(formatUsageSummary(summarizeUsage([]))).toContain("未调用模型");
  });

  it("汇总文案包含次数、耗时与 token", () => {
    const text = formatUsageSummary(summarizeUsage([entry()]));
    expect(text).toContain("1 次模型调用");
    expect(text).toContain("1.0s");
    expect(text).toContain("输入 1.0k / 输出 500 tokens");
  });

  it("token 未知与备用模型都会写进文案", () => {
    const text = formatUsageSummary(
      summarizeUsage([
        entry({ inputTokens: undefined, outputTokens: undefined, fellBack: true }),
      ])
    );
    expect(text).toContain("token 用量未上报");
    expect(text).toContain("备用模型");
  });
});
