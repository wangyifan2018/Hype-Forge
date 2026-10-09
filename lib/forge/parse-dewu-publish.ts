import { extractHashtags } from "@/lib/forge/copy-hashtags";

export type DewuPublishParsed = {
  title: string;
  body: string;
  hashtagsText: string;
  hashtags: string[];
};

function extractSection(copy: string, heading: string): string {
  const marker = `## ${heading}`;
  const idx = copy.indexOf(marker);
  if (idx < 0) return "";
  const after = copy.slice(idx + marker.length);
  const next = after.search(/\n## /);
  return (next >= 0 ? after.slice(0, next) : after).trim();
}

/**
 * 移除正文中的结构标签（如 【钩子】【痛点场景】等）
 * 这些是 AI 输出的结构标记，不应出现在最终发帖文案中
 */
function stripStructureTags(text: string): string {
  return text
    .replace(/【(?:钩子|痛点场景|痛点|解决方案|效果可视化|行动指令)】/g, "")
    .replace(/\n{3,}/g, "\n\n") // 清理多余空行
    .trim();
}

/**
 * 标题归一化。
 * copywriter 在没有标题候选时被要求"输出 3 个候选标题（用 --- 分隔）"，
 * 模型可能真的把多行候选写进 ## 标题；得物标题是单行字段，
 * 这里只取第一条有效行，并去掉候选分隔线与评分注记、限制长度。
 */
function normalizeTitle(raw: string): string {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^-{2,}$/.test(line))
    .map((line) =>
      line
        // 只去掉列表序号/项目符号（"1. "、"- "），不要吃掉标题开头本身的数字（"3 天通勤实测"）
        .replace(/^\s*(?:\d+[.、)]|[-*•])\s+/, "")
        .replace(/\*\*/g, "")
        .replace(/（[^）]*评分[^）]*）/g, "")
        .replace(/\([^)]*评分[^)]*\)/g, "")
        .trim()
    )
    .filter((line) => line.length > 0);

  const first = lines[0] ?? "";
  const title = first.replace(/^#+\s*/, "").trim();
  // 得物标题建议 20 字内，超长截断避免整段进标题框
  return title.length > 30 ? `${title.slice(0, 30)}…` : title;
}

export function parseDewuPublish(copy: string): DewuPublishParsed {
  let title = extractSection(copy, "标题");
  let body = extractSection(copy, "正文");
  let hashtagsText = extractSection(copy, "话题标签");

  // 如果没找到 ## 标题，尝试从文本开头提取（AI 可能直接输出标题）
  if (!title) {
    const firstHeading = copy.match(/^##\s+(.+)$/m);
    if (firstHeading && !firstHeading[1].includes("正文") && !firstHeading[1].includes("话题")) {
      title = firstHeading[1].replace(/^#+\s*/, "").trim();
    }
  }

  // 如果仍然没找到标题，取第一行非空文本作为标题
  if (!title) {
    const firstLine = copy.split("\n").find((l) => l.trim().length > 0 && !l.startsWith("##"));
    if (firstLine && firstLine.trim().length > 0 && firstLine.trim().length <= 50) {
      title = firstLine.trim();
    }
  }

  if (!body) {
    const legacy = extractSection(copy, "创意主轴");
    const main = extractSection(copy, "正文");
    body = main || legacy;
    if (!body) {
      const stripped = copy
        .replace(/^##\s+标题[\s\S]*?(?=\n## |\n#|$)/m, "")
        .replace(/^##\s+话题标签[\s\S]*/m, "")
        .trim();
      body = stripped.slice(0, 2000);
    }
  }

  // 清理正文中的结构标签
  body = stripStructureTags(body);

  if (!hashtagsText) {
    hashtagsText = extractHashtags(copy).join(" ");
  }

  const hashtags = extractHashtags(hashtagsText || copy);

  return {
    title: normalizeTitle(title),
    body: body.trim(),
    hashtagsText: hashtags.join(" "),
    hashtags,
  };
}
