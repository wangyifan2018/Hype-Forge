import { describe, it, expect } from "vitest";
import { detectAiFlavors, checkAuthenticity, AI_FLAVOR_BLACKLIST } from "./anti-ai-detect";

describe("detectAiFlavors", () => {
  it("flags blacklist words and raises score", () => {
    const text = "综上所述，这款鞋子的品质毋庸置疑，值得注意的是它的缓震效果。";
    const result = detectAiFlavors(text);
    expect(result.score).toBeGreaterThan(0);
    expect(result.flagged.length).toBeGreaterThan(0);
    expect(result.flagged.some((f) => f.includes("综上所述"))).toBe(true);
    expect(result.flagged.some((f) => f.includes("毋庸置疑"))).toBe(true);
  });

  it("lowers score for authentic markers", () => {
    const text =
      "我上脚这双鞋真的绝了！闭眼入，yyds！谁懂啊这个脚感，拿到手就知道值了，实测3天告诉你结果。";
    const result = detectAiFlavors(text);
    // Authentic markers reduce score; with many markers the raw score should be low
    expect(result.score).toBeLessThanOrEqual(30);
  });

  it("penalizes missing numbers, personal details, and emoji", () => {
    const text = "这是一款优质的运动鞋，采用了先进的科技材料，提供了舒适的穿着体验。";
    const result = detectAiFlavors(text);
    // No numbers, no personal pronouns, no emoji → multiple penalties
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.suggestions.some((s) => s.includes("具体数字"))).toBe(true);
    expect(result.flagged.some((f) => f.includes("缺少 emoji"))).toBe(true);
  });

  it("penalizes long paragraphs", () => {
    const longParagraph = "这是一段很长的文字".repeat(30);
    const result = detectAiFlavors(longParagraph);
    expect(result.flagged.some((f) => f.includes("段落过长"))).toBe(true);
  });

  it("clamps score to 0-100", () => {
    const result = detectAiFlavors("");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("generates severity suggestions based on score", () => {
    // Very AI-like text → high score → "AI 味过重" suggestion
    const aiText = AI_FLAVOR_BLACKLIST.join("，") + "。这是一段没有任何细节的文字。";
    const result = detectAiFlavors(aiText);
    expect(result.suggestions.some((s) => s.includes("AI 味"))).toBe(true);
  });
});

describe("checkAuthenticity", () => {
  it("fails for generic text missing all markers", () => {
    const result = checkAuthenticity("这是一段普通的产品描述文字。");
    expect(result.pass).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it("passes for text with all required markers", () => {
    const text =
      "我今天上脚这双鞋，399入手，真的绝了啊！脚感软弹，闭眼入不亏\uD83D\uDD25";
    const result = checkAuthenticity(text);
    expect(result.pass).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("reports specific missing elements", () => {
    const result = checkAuthenticity("鞋子很好看呀");
    expect(result.reasons.some((r) => r.includes("具体数字"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("emoji"))).toBe(true);
  });
});
