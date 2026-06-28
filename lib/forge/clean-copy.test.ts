import { describe, it, expect } from "vitest";
import { cleanCopyDraft, stripTrailingJson, normalizeNewlines } from "./clean-copy";

describe("normalizeNewlines", () => {
  it("将字面 \\n 替换为真正换行", () => {
    const input = "标题\\n\\n## 正文";
    const result = normalizeNewlines(input);
    expect(result).toContain("\n\n");
    expect(result).not.toContain("\\n");
  });

  it("清理首尾空白", () => {
    const input = "\n\n\n  内容  \n\n\n";
    const result = normalizeNewlines(input);
    expect(result).toBe("内容");
  });

  it("连续3+换行缩减为2个", () => {
    const input = "段落1\n\n\n\n\n段落2";
    const result = normalizeNewlines(input);
    expect(result).toBe("段落1\n\n段落2");
  });
});

describe("stripTrailingJson", () => {
  it("去掉尾部独立 JSON 对象", () => {
    const input = "## 正文\n内容\n\n{\"viralityComposite\": {\"hookStrength\": 94}}";
    const result = stripTrailingJson(input);
    expect(result).not.toContain("viralityComposite");
    expect(result).toContain("## 正文");
  });

  it("去掉嵌套 JSON", () => {
    const input = "## 正文\n内容\n\n{\"scores\": {\"hook\": 85}, \"viralityComposite\": {\"hookStrength\": 94}}";
    const result = stripTrailingJson(input);
    expect(result).not.toContain("scores");
    expect(result).not.toContain("viralityComposite");
  });

  it("不去掉内容中的 JSON-like 字符串", () => {
    const input = '这是一段文案，{"key": "value"} 作为例子';
    const result = stripTrailingJson(input);
    expect(result).toBe(input);
  });
});

describe("cleanCopyDraft", () => {
  it("完整清理流程：修复换行 + 去 JSON", () => {
    const input = '\\n## 标题\n标题内容\\n\\n## 正文\n正文内容\\n\\n{"viralityComposite":{"hookStrength":94}}';
    const result = cleanCopyDraft(input);
    expect(result).not.toContain("\\n");
    expect(result).not.toContain("viralityComposite");
    expect(result).toContain("## 标题");
    expect(result).toContain("## 正文");
  });

  it("处理真实 AI 输出格式", () => {
    const input = `\n35℃高温周末局，凭什么她一眼锁定'网球千金'圈层入场券？\n\n## 正文\n【钩子】测试内容\n\n【痛点】测试内容\n\n## 话题标签\n#测试标签\n{"viralityComposite":{"hookStrength":94,"emotionalResonance":90,"trendAlignment":92,"noveltyFactor":88,"timingFit":90,"platformNative":93}}`;
    const result = cleanCopyDraft(input);
    expect(result).not.toContain("viralityComposite");
    expect(result).not.toContain("hookStrength");
    expect(result).toContain("35℃高温周末局");
    expect(result).toContain("## 正文");
    expect(result).toContain("## 话题标签");
    // 确保没有字面 \n
    expect(result).not.toMatch(/\\n/);
  });

  it("空输入返回空字符串", () => {
    expect(cleanCopyDraft("")).toBe("");
    expect(cleanCopyDraft(null as unknown as string)).toBe("");
    expect(cleanCopyDraft(undefined as unknown as string)).toBe("");
  });

  it("干净的输入不做多余处理", () => {
    const input = "## 标题\n标题\n\n## 正文\n正文";
    const result = cleanCopyDraft(input);
    expect(result).toBe(input);
  });

  it("去除前导字面换行符", () => {
    const input = "\\n\\n## 标题\n标题";
    const result = cleanCopyDraft(input);
    expect(result).not.toMatch(/^\\n/);
    expect(result).not.toMatch(/^\n{3,}/);
  });
});
