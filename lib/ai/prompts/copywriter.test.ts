import { describe, it, expect } from "vitest";
import {
  buildCopywriterSystem,
  buildCopywriterUserPrompt,
} from "@/lib/ai/prompts/copywriter";
import type { ForgeInput, ViralBrief } from "@/lib/forge/types";

const dewuInput: ForgeInput = {
  trendId: "test-trend",
  productName: "Nike Air Max 90",
  sellingPoints: "经典复古 缓震舒适",
  platform: "dewu",
};

const xhsInput: ForgeInput = {
  ...dewuInput,
  platform: "xiaohongshu",
};

const viralBrief: ViralBrief = {
  hookFramework: "AIDA",
  emotionalCore: "复古情怀",
  memoryPoint: "经典不过时",
  targetAudience: "潮流青年",
  keywordStrategy: ["Air Max", "复古跑鞋", "经典配色"],
  titleAngles: ["场景冲击", "卖点直击", "情绪共鸣"],
  visualMood: "复古街头",
  ctaStrategy: "轻CTA，引导收藏",
  contentFormat: "单品种草",
  avoidAngles: ["价格对比"],
};

describe("buildCopywriterSystem", () => {
  it("includes RTF-X framework sections for dewu", () => {
    const system = buildCopywriterSystem(dewuInput);
    expect(system).toContain("【Role 角色】");
    expect(system).toContain("【Task 任务】");
    expect(system).toContain("【Format 格式】");
    expect(system).toContain("【Constraints 约束】");
  });

  it("includes five-segment structure reminder", () => {
    const system = buildCopywriterSystem(dewuInput);
    expect(system).toContain("五段式");
    expect(system).toContain("【钩子】");
    expect(system).toContain("【痛点场景】");
    expect(system).toContain("【解决方案】");
    expect(system).toContain("【效果可视化】");
    expect(system).toContain("【行动指令】");
  });

  it("includes AI flavor blacklist words", () => {
    const system = buildCopywriterSystem(dewuInput);
    expect(system).toContain("综上所述");
    expect(system).toContain("毋庸置疑");
  });

  it("adapts role for xiaohongshu platform", () => {
    const system = buildCopywriterSystem(xhsInput);
    expect(system).toContain("小红书");
    expect(system).toContain("种草博主");
  });

  it("adapts role for dewu platform", () => {
    const system = buildCopywriterSystem(dewuInput);
    expect(system).toContain("得物");
    expect(system).toContain("潮流达人");
  });

  it("includes strategy brief when viralBrief is provided", () => {
    const system = buildCopywriterSystem(dewuInput, viralBrief);
    expect(system).toContain("【本次策略简报】");
    expect(system).toContain("AIDA");
    expect(system).toContain("复古情怀");
    expect(system).toContain("Air Max");
  });

  it("omits strategy brief when viralBrief is null", () => {
    const system = buildCopywriterSystem(dewuInput, null);
    expect(system).not.toContain("【本次策略简报】");
  });

  it("ends with markdown output instruction", () => {
    const system = buildCopywriterSystem(dewuInput);
    expect(system).toContain("不要 JSON 包裹，直接输出 Markdown");
  });
});

describe("buildCopywriterUserPrompt", () => {
  it("includes product name and selling points", () => {
    const prompt = buildCopywriterUserPrompt(dewuInput);
    expect(prompt).toContain("Nike Air Max 90");
    expect(prompt).toContain("经典复古 缓震舒适");
  });

  it("includes five-segment reminder", () => {
    const prompt = buildCopywriterUserPrompt(dewuInput);
    expect(prompt).toContain("五段式结构");
  });

  it("includes dewu product URL warning when present", () => {
    const inputWithUrl: ForgeInput = {
      ...dewuInput,
      dewuProductUrl: "https://dewu.com/product/123",
    };
    const prompt = buildCopywriterUserPrompt(inputWithUrl);
    expect(prompt).toContain("禁止写入正文");
  });

  it("indicates no URL when dewuProductUrl is absent", () => {
    const prompt = buildCopywriterUserPrompt(dewuInput);
    expect(prompt).toContain("用户未提供得物商品链接");
  });
});
