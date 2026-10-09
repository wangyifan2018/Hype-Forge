import { describe, expect, it } from "vitest";
import { applyGateToCritic, runQualityGate } from "@/lib/forge/quality-gate";
import { checkCompliance } from "@/lib/forge/compliance-check";
import type { CriticReport } from "@/lib/forge/types";

const CLEAN_COPY = `## 标题
这双鞋真的绝了

## 正文
最近入手了这双鞋，拿到手第一感觉是轻，上脚试了 3 天通勤完全不累脚 😮‍💨
配色是白蓝，我 42 码买的，日常穿搭很好搭。

## 话题标签
#好物分享 #球鞋穿搭 #通勤鞋 #得物好物`;

describe("runQualityGate · 合规", () => {
  it("无违规时通过且记 100 分", () => {
    const gate = runQualityGate(CLEAN_COPY);
    expect(gate.compliancePass).toBe(true);
    expect(gate.complianceScore).toBe(100);
  });

  it("正文含 URL 时判为不通过（得物禁 URL）", () => {
    const gate = runQualityGate(`${CLEAN_COPY}\n详情见 https://dw4.co/abc`);
    expect(gate.compliancePass).toBe(false);
    expect(gate.complianceScore).toBe(0);
    expect(gate.issues.join(" ")).toContain("URL");
  });

  it("绝对化用语判为不通过", () => {
    const gate = runQualityGate(`${CLEAN_COPY}\n全网最低价，闭眼入`);
    expect(gate.compliancePass).toBe(false);
  });

  it("「最近/最后」不再被误判（裸「最」已从词表移除）", () => {
    const check = checkCompliance("最近入手，最后决定留下，最初还在犹豫");
    expect(check.pass).toBe(true);
    expect(check.violations.filter((v) => v.severity === "high")).toHaveLength(0);
  });

  it("低风险的「链接」提示不阻断合规（CTA 会提到链接）", () => {
    const gate = runQualityGate(`${CLEAN_COPY}\n链接在主页，需要的自取`);
    expect(gate.compliancePass).toBe(true);
  });
});

describe("runQualityGate · 去 AI 味与真实感", () => {
  it("命中 AI 味黑名单词会扣分", () => {
    const gate = runQualityGate("综上所述，这款鞋值得购买。");
    expect(gate.antiAiScore).toBeLessThan(100);
    expect(gate.issues.join(" ")).toContain("去 AI 味");
  });

  it("缺少 emoji / 个人体验会给出真实感提示", () => {
    const gate = runQualityGate("这是一双鞋，很好看。");
    expect(gate.authenticity.pass).toBe(false);
    expect(gate.issues.join(" ")).toContain("真实感");
  });
});

describe("runQualityGate · 数字事实核对", () => {
  it("文案里的数字必须能在用户原文中找到", () => {
    const gate = runQualityGate("到手价 599，超划算", {
      sourceText: "AJ1 北卡蓝 到手 749 元",
    });
    expect(gate.fabricatedNumbers).toContain("599");
    expect(gate.issues.join(" ")).toContain("事实核对");
  });

  it("原文出现过的数字不报", () => {
    const gate = runQualityGate("到手价 749，我 42 码", {
      sourceText: "AJ1 到手 749 元，42 码可选",
    });
    expect(gate.fabricatedNumbers).toHaveLength(0);
  });
});

describe("applyGateToCritic", () => {
  it("用代码结论覆盖 LLM 自评的合规/去 AI 味，并并入 mustFix", () => {
    const llmReport: CriticReport = {
      scores: {
        hook: 95,
        emotion: 90,
        platformFit: 90,
        visualAlign: 90,
        hashtagPresent: 90,
        viralPotential: 95,
        searchKeywordDensity: 90,
        scrollStopPower: 92,
        antiAiScore: 96,
        structureCheck: 95,
        complianceCheck: 100,
      },
      mustFix: [],
    };

    const merged = applyGateToCritic(
      llmReport,
      runQualityGate("绝了！购买链接 see https://x.co/1")
    );

    expect(merged.scores.complianceCheck).toBe(0);
    expect(merged.deterministic?.checkedBy).toBe("code");
    expect(merged.deterministic?.compliancePass).toBe(false);
    expect(merged.mustFix.length).toBeGreaterThan(0);
    // 其它主观维度保留 LLM 评分
    expect(merged.scores.hook).toBe(95);
  });
});
