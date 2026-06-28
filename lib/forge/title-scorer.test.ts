import { describe, it, expect } from "vitest";
import {
  scoreTitle,
  rankTitleCandidates,
  selectBestTitle,
} from "./title-scorer";
import type { TitleCandidate } from "@/lib/forge/types";

describe("scoreTitle", () => {
  it("scores known hook types with expected base weights", () => {
    // 数字冲击: retention=95, emotion=70, search=85 → 95*0.4+70*0.3+85*0.3 = 38+21+25.5 = 84.5
    const score = scoreTitle("3招搞定球鞋搭配", "数字冲击");
    // +8 for digits, +5 for ideal length (12-18 chars: "3招搞定球鞋搭配" = 8 chars → no length bonus, < 8 penalty)
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("penalizes titles shorter than 8 chars", () => {
    const short = scoreTitle("太顶了", "情绪共鸣");
    const normal = scoreTitle("这双鞋上脚真的太顶了谁懂啊", "情绪共鸣");
    expect(short).toBeLessThan(normal);
  });

  it("penalizes titles longer than 20 chars", () => {
    const long = scoreTitle("这是一段非常非常长的标题文字内容超出了二十个字符的限制范围之外", "痛点直击");
    const normal = scoreTitle("痛点直击好鞋推荐", "痛点直击");
    expect(long).toBeLessThan(normal);
  });

  it("adds bonus for digits in title", () => {
    const withDigit = scoreTitle("3招搭配技巧", "痛点直击");
    const noDigit = scoreTitle("搭配技巧分享", "痛点直击");
    expect(withDigit).toBeGreaterThan(noDigit);
  });

  it("adds bonus for question marks", () => {
    const question = scoreTitle("这双鞋值不值得入？", "悬念提问");
    const noQuestion = scoreTitle("这双鞋值得入手", "悬念提问");
    expect(question).toBeGreaterThan(noQuestion);
  });

  it("falls back to default weights for unknown hook types", () => {
    const score = scoreTitle("这是一个测试标题文字内容", "未知类型");
    // default: 70*0.4+70*0.3+70*0.3 = 70, +5 for length 12-18
    expect(score).toBe(75);
  });

  it("clamps score to 0-100", () => {
    expect(scoreTitle("短", "反差对比")).toBeGreaterThanOrEqual(0);
    expect(scoreTitle("短", "反差对比")).toBeLessThanOrEqual(100);
  });
});

describe("rankTitleCandidates", () => {
  it("sorts candidates by estimatedScore descending", () => {
    const candidates: TitleCandidate[] = [
      { title: "普通标题", hookType: "社交认证", estimatedScore: 50 },
      { title: "3招搞定搭配", hookType: "数字冲击", estimatedScore: 50 },
      { title: "谁懂啊这鞋绝了", hookType: "情绪共鸣", estimatedScore: 50 },
    ];
    const ranked = rankTitleCandidates(candidates);
    expect(ranked[0].estimatedScore).toBeGreaterThanOrEqual(ranked[1].estimatedScore);
    expect(ranked[1].estimatedScore).toBeGreaterThanOrEqual(ranked[2].estimatedScore);
  });

  it("does not mutate the original array", () => {
    const candidates: TitleCandidate[] = [
      { title: "A", hookType: "社交认证", estimatedScore: 50 },
      { title: "B", hookType: "数字冲击", estimatedScore: 50 },
    ];
    const original = [...candidates];
    rankTitleCandidates(candidates);
    expect(candidates).toEqual(original);
  });

  it("recalculates estimatedScore from title and hookType", () => {
    const candidates: TitleCandidate[] = [
      { title: "3招搭配技巧分享", hookType: "数字冲击", estimatedScore: 0 },
    ];
    const ranked = rankTitleCandidates(candidates);
    expect(ranked[0].estimatedScore).toBeGreaterThan(0);
  });
});

describe("selectBestTitle", () => {
  it("returns null for empty array", () => {
    expect(selectBestTitle([])).toBeNull();
  });

  it("returns the highest-scoring candidate", () => {
    const candidates: TitleCandidate[] = [
      { title: "普通标题", hookType: "社交认证", estimatedScore: 50 },
      { title: "3招搭配技巧", hookType: "数字冲击", estimatedScore: 50 },
      { title: "弱标题", hookType: "社交认证", estimatedScore: 50 },
    ];
    const best = selectBestTitle(candidates);
    expect(best).not.toBeNull();
    expect(best!.title).toBe("3招搭配技巧");
  });
});
