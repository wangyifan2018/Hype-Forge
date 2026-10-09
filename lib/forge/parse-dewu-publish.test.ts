import { describe, it, expect } from "vitest";
import { parseDewuPublish } from "./parse-dewu-publish";

describe("parseDewuPublish", () => {
  it("正确解析标准 Markdown 格式", () => {
    const input = `## 标题
测试标题文案

## 正文
【钩子】首段内容
【痛点场景】痛点内容
【解决方案】方案内容
【效果可视化】效果内容
【行动指令】行动内容

## 话题标签
#得物球鞋 #潮穿 #OOTD`;
    const result = parseDewuPublish(input);
    expect(result.title).toBe("测试标题文案");
    expect(result.body).not.toContain("【钩子】");
    expect(result.body).not.toContain("【痛点场景】");
    expect(result.body).toContain("首段内容");
    expect(result.hashtags).toContain("#得物球鞋");
  });

  it("标题为空时从第一行提取", () => {
    const input = `35℃高温周末局凭什么她一眼锁定

## 正文
正文内容

## 话题标签
#测试`;
    const result = parseDewuPublish(input);
    expect(result.title).toBe("35℃高温周末局凭什么她一眼锁定");
    expect(result.body).toContain("正文内容");
  });

  it("去除正文中的结构标签", () => {
    const input = `## 标题
测试标题

## 正文
【钩子】这是钩子内容
【痛点场景】这是痛点内容
【解决方案】这是方案内容
【效果可视化】这是效果内容
【行动指令】这是行动内容

## 话题标签
#测试`;
    const result = parseDewuPublish(input);
    expect(result.body).not.toContain("【钩子】");
    expect(result.body).not.toContain("【痛点场景】");
    expect(result.body).not.toContain("【解决方案】");
    expect(result.body).not.toContain("【效果可视化】");
    expect(result.body).not.toContain("【行动指令】");
    expect(result.body).toContain("这是钩子内容");
    expect(result.body).toContain("这是痛点内容");
  });

  it("处理带字面换行符的 AI 输出", () => {
    const input = `\n测试标题\n\n## 正文\n【钩子】钩子内容\n\n【痛点】痛点内容\n\n## 话题标签\n#测试`;
    const result = parseDewuPublish(input);
    expect(result.title).toBe("测试标题");
    expect(result.body).not.toContain("【钩子】");
    expect(result.body).toContain("钩子内容");
  });

  it("话题标签提取正常", () => {
    const input = `## 标题
标题

## 正文
正文内容

## 话题标签
#得物球鞋上脚穿搭 #网球千金出片 #夏日爆款配色`;
    const result = parseDewuPublish(input);
    expect(result.hashtags.length).toBe(3);
    expect(result.hashtagsText).toContain("#得物球鞋上脚穿搭");
  });

  it("缺失话题标签时从全文提取", () => {
    const input = `## 标题
标题

## 正文
正文内容 #得物球鞋`;
    const result = parseDewuPublish(input);
    expect(result.hashtags).toContain("#得物球鞋");
  });
});

describe("标题归一化（得物标题必须单行）", () => {
  it("多候选标题 + --- 分隔只取第一条", () => {
    const parsed = parseDewuPublish(
      [
        "## 标题",
        "3 天通勤实测｜北卡蓝真的绝了（数字冲击，评分 97）",
        "---",
        "北卡蓝上脚 | 谁懂啊（情绪共鸣，评分 90）",
        "",
        "## 正文",
        "最近入手了这双鞋，拿到手上脚试了三天。",
        "",
        "## 话题标签",
        "#球鞋穿搭 #通勤鞋 #得物好物",
      ].join("\n")
    );
    expect(parsed.title).toBe("3 天通勤实测｜北卡蓝真的绝了");
    expect(parsed.title).not.toContain("---");
    expect(parsed.title).not.toContain("评分");
  });

  it("超长标题会截断", () => {
    const long = "这是一条非常长的标题".repeat(6);
    const parsed = parseDewuPublish(`## 标题\n${long}\n\n## 正文\n正文内容`);
    expect(parsed.title.length).toBeLessThanOrEqual(31);
    expect(parsed.title.endsWith("…")).toBe(true);
  });
});
