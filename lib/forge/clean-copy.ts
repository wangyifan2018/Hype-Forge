/**
 * 清理 AI 返回的文案草稿
 * 去除 AI 常见的多余输出（尾部 JSON、字面 \n、多余空白等）
 */

/**
 * 移除文案尾部的 JSON 块（评分、viralityComposite 等元数据）
 * AI 有时会在 Markdown 后附加 JSON 格式的评分数据
 */
export function stripTrailingJson(markdown: string): string {
  // 从后往前查找最后一个 } 或 ]，然后往前找 { 或 [
  // 更简单：找到第一个 { 之前或最后一个 } 之后的内容并去掉
  // 我们只需要保留 ## 标题 到 话题标签 之间的内容
  // 找到最后一个 ## 话题标签 结束的位置，之后的内容如果包含 JSON 就去掉

  // 方法：找到最后一个 } 的位置，从它往前找到匹配的 {，然后去掉从 { 到末尾的所有内容
  let result = markdown;

  // 反复去掉尾部的 JSON 对象
  while (true) {
    const lastBrace = result.lastIndexOf("}");
    if (lastBrace === -1) break;

    // 从 lastBrace 往前找匹配的 {
    let openBrace = -1;
    let depth = 1;
    for (let i = lastBrace - 1; i >= 0; i--) {
      if (result[i] === "}") depth++;
      if (result[i] === "{") {
        depth--;
        if (depth === 0) {
          openBrace = i;
          break;
        }
      }
    }

    if (openBrace === -1) break;

    // 检查这个 { 前面是否是换行或开头（说明是独立 JSON 块）
    const beforeJson = result.slice(0, openBrace);
    const trimmedBefore = beforeJson.trimEnd();
    // 如果 trimmed 后长度变了，说明前面有空白/换行，JSON 是独立的
    if (trimmedBefore.length < beforeJson.length || trimmedBefore.length === 0) {
      // 去掉这个 JSON 块（包括它前面的空行）
      result = trimmedBefore;
    } else {
      // { 前面不是空白，说明 JSON 可能是内容的一部分，停止
      break;
    }
  }

  return result;
}

/**
 * 修复字面 \n 为真正的换行，并清理多余空白
 */
export function normalizeNewlines(markdown: string): string {
  // 将字面 \n 替换为真正的换行
  let result = markdown.replace(/\\n/g, "\n");

  // 去除首尾空白行
  result = result.trim();

  // 清理连续 3 个以上的换行为 2 个
  result = result.replace(/\n{3,}/g, "\n\n");

  return result;
}

/**
 * 清理 AI 返回的文案草稿
 */
export function cleanCopyDraft(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let draft = raw;

  // 1. 修复字面换行
  draft = normalizeNewlines(draft);

  // 2. 去掉尾部 JSON
  draft = stripTrailingJson(draft);

  // 3. 再次修复换行和空白
  draft = normalizeNewlines(draft);

  return draft;
}
