import { describe, expect, it } from "vitest";
import {
  applyGateToCritic,
  compareCriticQuality,
  runQualityGate,
} from "@/lib/forge/quality-gate";
import { checkCompliance } from "@/lib/forge/compliance-check";
import type { CriticReport } from "@/lib/forge/types";

const CLEAN_COPY = `## 标题
北卡蓝通勤实测绝了

## 正文
【钩子】最近入手了这双北卡蓝，拿到手就上脚试了三天 😮‍💨
【痛点场景】上班通勤一天走一万步，之前那双磨脚磨得我直皱眉
【解决方案】这双白蓝配色，我 42 码买的，到手 749，鞋面软但不塌
【效果可视化】实测三天通勤完全不累脚，穿搭也百搭
【行动指令】喜欢的可以去主页看看，评论区聊配色

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

describe("runQualityGate · 结构判定（取代模型自评）", () => {
  it("完整稿：三小节 + 五段式 + 话题充足 → 结构分满分", () => {
    const gate = runQualityGate(CLEAN_COPY, { platform: "dewu" });
    expect(gate.scores.structureCheck).toBe(100);
    expect(gate.scores.hashtagPresent).toBe(100);
    expect(gate.structure.missingSegments).toEqual([]);
    expect(gate.issues.join(" ")).not.toContain("结构（必须改）");
  });

  it("缺话题小节 + 缺两段 → 结构分按缺项扣分并给出具体缺哪段", () => {
    const broken = `## 标题
随便写写

## 正文
【钩子】第一句
【解决方案】卖点在这里，749 到手

最近入手，上脚试了，绝了 😮‍💨`;
    const gate = runQualityGate(broken, { platform: "dewu" });

    expect(gate.structure.missingSegments).toEqual([
      "痛点场景",
      "效果可视化",
      "行动指令",
    ]);
    // 100 - 缺3段*20 - 缺1个小节*20
    expect(gate.scores.structureCheck).toBe(20);
    expect(gate.structure.hashtagCount).toBe(0);
    expect(gate.scores.hashtagPresent).toBe(0);
    expect(gate.issues.join(" ")).toContain("缺少 ## 话题标签 小节");
  });

  it("小红书话题要求 4 个：3 个时不达标，得物同一稿通过", () => {
    const three = CLEAN_COPY.replace(" #得物好物", "");
    expect(runQualityGate(three, { platform: "dewu" }).scores.hashtagPresent).toBe(100);
    const xhs = runQualityGate(three, { platform: "xiaohongshu" });
    expect(xhs.scores.hashtagPresent).toBe(75);
    expect(xhs.issues.join(" ")).toContain("小红书建议至少 4 个");
  });

  it("标题超长会给出建议修改（不判失败）", () => {
    const long = `${CLEAN_COPY.replace("北卡蓝通勤实测绝了", "这".repeat(40))}`;
    const gate = runQualityGate(long, { platform: "dewu" });
    expect(gate.issues.join(" ")).toContain("标题（建议改）");
  });

  it("趋势关键词覆盖：命中率决定 searchKeywordDensity", () => {
    const full = runQualityGate(CLEAN_COPY, {
      platform: "dewu",
      trendKeywords: ["北卡蓝", "通勤"],
    });
    expect(full.scores.searchKeywordDensity).toBe(100);

    const half = runQualityGate(CLEAN_COPY, {
      platform: "dewu",
      trendKeywords: ["北卡蓝", "露营"],
    });
    expect(half.scores.searchKeywordDensity).toBe(50);
    // 命中率 50% 只记录分数，不额外报问题
    expect(half.issues.join(" ")).not.toContain("搜索词覆盖");

    const low = runQualityGate(CLEAN_COPY, {
      platform: "dewu",
      trendKeywords: ["北卡蓝", "露营", "飞盘"],
    });
    expect(low.scores.searchKeywordDensity).toBe(33);
    expect(low.issues.join(" ")).toContain("搜索词覆盖");

    // 没有趋势关键词时不判定，保留模型评分
    expect(
      runQualityGate(CLEAN_COPY, { platform: "dewu" }).scores
        .searchKeywordDensity
    ).toBeUndefined();
  });
});

describe("applyGateToCritic · 覆盖范围", () => {
  it("结构/话题/搜索词也一并由代码覆盖", () => {
    const llmReport: CriticReport = {
      scores: {
        hook: 95,
        emotion: 90,
        platformFit: 90,
        visualAlign: 90,
        hashtagPresent: 99,
        viralPotential: 95,
        searchKeywordDensity: 99,
        scrollStopPower: 92,
        antiAiScore: 99,
        structureCheck: 99,
        complianceCheck: 100,
      },
      mustFix: [],
    };

    const merged = applyGateToCritic(
      llmReport,
      runQualityGate("## 标题\n标题\n\n## 正文\n没有结构的正文", {
        platform: "dewu",
        trendKeywords: ["露营"],
      })
    );

    expect(merged.scores.structureCheck).toBe(0);
    expect(merged.scores.hashtagPresent).toBe(0);
    expect(merged.scores.searchKeywordDensity).toBe(0);
    // 主观项仍保留模型评分
    expect(merged.scores.hook).toBe(95);
    expect(merged.scores.emotion).toBe(90);
  });
});

describe("compareCriticQuality · 多轮改写择优", () => {
  const base = (over: Partial<CriticReport["scores"]>): CriticReport => ({
    scores: {
      hook: 80,
      emotion: 80,
      platformFit: 80,
      visualAlign: 80,
      hashtagPresent: 80,
      viralPotential: 80,
      searchKeywordDensity: 80,
      scrollStopPower: 80,
      antiAiScore: 80,
      structureCheck: 80,
      complianceCheck: 100,
      ...over,
    },
    mustFix: [],
  });

  it("合规不过的一版永远劣于合规通过的一版（主观分不能抵消）", () => {
    const nice = base({ complianceCheck: 0, hook: 100, viralPotential: 100 });
    const compliant = base({ complianceCheck: 100, hook: 60, viralPotential: 60 });
    expect(compareCriticQuality(compliant, nice)).toBeGreaterThan(0);
    expect(compareCriticQuality(nice, compliant)).toBeLessThan(0);
  });

  it("都合规时先比结构，再比去 AI 味", () => {
    const better = base({ structureCheck: 100, antiAiScore: 70 });
    const worse = base({ structureCheck: 60, antiAiScore: 99 });
    expect(compareCriticQuality(better, worse)).toBeGreaterThan(0);
  });

  it("确定性分相同时才比主观的钩子与爆款潜力", () => {
    const a = base({ hook: 90, viralPotential: 90 });
    const b = base({ hook: 70, viralPotential: 70 });
    expect(compareCriticQuality(a, b)).toBeGreaterThan(0);
    expect(compareCriticQuality(b, a)).toBeLessThan(0);
  });
});
