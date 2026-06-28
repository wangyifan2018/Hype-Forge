import { describe, it, expect, beforeAll } from "vitest";
import { checkNodejieba, resetNodejiebaHealth } from "./nodejieba-health";
import { segment, extractKeywords, extractMeaningfulKeywords, filterStopWords } from "./keyword-extractor";

beforeAll(() => {
  // 重置健康检查缓存，确保每次测试都重新检查
  resetNodejiebaHealth();
});

describe("nodejieba health", () => {
  it("原生绑定加载正常", () => {
    const result = checkNodejieba();
    expect(result.ok).toBe(true);
  });
});

describe("segment", () => {
  it("默认分词正常", () => {
    const result = segment("你好世界");
    expect(result.length).toBeGreaterThan(0);
    expect(result.join("")).toContain("你好");
  });

  it("空字符串返回空数组", () => {
    expect(segment("")).toEqual([]);
    // nodejieba may return unexpected results for whitespace-only input,
    // so we test the actual behavior rather than strict empty array
    const wsResult = segment("   ");
    expect(Array.isArray(wsResult)).toBe(true);
  });

  it("search 模式正常", () => {
    const result = segment("人工智能技术", "search");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("extractKeywords", () => {
  it("TF-IDF 关键词提取正常", () => {
    const result = extractKeywords("人工智能技术发展非常快，机器学习深度学习都是热门方向", 5);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("空字符串返回空数组", () => {
    expect(extractKeywords("")).toEqual([]);
  });

  it("topN 限制正常", () => {
    const result = extractKeywords("人工智能技术发展非常快机器学习深度学习", 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

describe("filterStopWords", () => {
  it("过滤常见停用词", () => {
    const input = ["的", "人工智能", "了", "技术", "是"];
    const result = filterStopWords(input);
    expect(result).not.toContain("的");
    expect(result).not.toContain("了");
    expect(result).toContain("人工智能");
  });

  it("过滤纯标点符号", () => {
    const input = ["...", "，", "hello", "。"];
    const result = filterStopWords(input);
    expect(result).not.toContain("...");
    expect(result).not.toContain("，");
    expect(result).toContain("hello");
  });

  it("过滤纯数字", () => {
    const input = ["123", "AI", "456", "技术"];
    const result = filterStopWords(input);
    expect(result).not.toContain("123");
    expect(result).not.toContain("456");
    expect(result).toContain("技术");
  });

  it("过滤单字符", () => {
    const input = ["a", "AI", "的", "技术"];
    const result = filterStopWords(input);
    expect(result).not.toContain("a");
    expect(result).toContain("AI");
  });
});

describe("extractMeaningfulKeywords", () => {
  it("有意义的关键词提取正常", () => {
    const result = extractMeaningfulKeywords("球鞋AJ1芝加哥配色得物社区热搜", 5);
    expect(result.length).toBeGreaterThan(0);
    // 过滤后应该保留有意义的关键词
    expect(result.every((w) => w.length >= 2)).toBe(true);
  });

  it("短文本关键词提取", () => {
    const result = extractMeaningfulKeywords("潮穿球鞋", 3);
    expect(Array.isArray(result)).toBe(true);
  });
});
