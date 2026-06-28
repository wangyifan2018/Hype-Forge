const HASHTAG_SECTION = "## 话题标签";

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  const re = /#[\u4e00-\u9fa5A-Za-z0-9_]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tags.add(m[0]);
  }
  return Array.from(tags);
}

export function hasHashtagSection(text: string, minTags = 3): boolean {
  const sectionIdx = text.indexOf(HASHTAG_SECTION);
  if (sectionIdx < 0) return false;
  const after = text.slice(sectionIdx + HASHTAG_SECTION.length);
  const nextHeading = after.search(/\n## /);
  const block = nextHeading >= 0 ? after.slice(0, nextHeading) : after;
  return extractHashtags(block).length >= minTags;
}

export function buildFallbackHashtags(
  productName: string,
  trendKeywords: string[] = []
): string[] {
  const fromTrend = trendKeywords
    .slice(0, 3)
    .map((k) => `#${k.replace(/\s+/g, "")}`);
  const base = ["#得物好物", "#潮穿穿搭", "#OOTD", "#好物分享"];
  const nameTag = productName.trim()
    ? `#${productName.trim().slice(0, 12).replace(/\s+/g, "")}`
    : null;
  const merged = [...fromTrend, ...(nameTag ? [nameTag] : []), ...base];
  const unique: string[] = [];
  for (const t of merged) {
    if (!unique.includes(t)) unique.push(t);
    if (unique.length >= 6) break;
  }
  return unique;
}

export function ensureHashtagSection(
  copy: string,
  fallbackTags: string[]
): { text: string; patched: boolean } {
  if (hasHashtagSection(copy, 3)) {
    return { text: copy, patched: false };
  }

  const tags = extractHashtags(copy);
  const productName =
    fallbackTags.length > 0
      ? (fallbackTags[fallbackTags.length - 1] ?? "")
      : "";
  const trendKeywords = fallbackTags.slice(0, -1);
  const useTags =
    tags.length >= 3
      ? tags
      : buildFallbackHashtags(productName, trendKeywords);

  const block = `${HASHTAG_SECTION}\n\n${useTags.join(" ")}\n`;

  const linkIdx = copy.indexOf("## 好物链接");
  if (linkIdx >= 0) {
    return {
      text: copy.slice(0, linkIdx).trimEnd() + "\n\n" + block + "\n" + copy.slice(linkIdx),
      patched: true,
    };
  }

  return { text: copy.trimEnd() + "\n\n" + block, patched: true };
}

export function extractHashtagSectionText(copy: string): string | null {
  const idx = copy.indexOf(HASHTAG_SECTION);
  if (idx < 0) return null;
  const after = copy.slice(idx + HASHTAG_SECTION.length);
  const nextHeading = after.search(/\n## /);
  const block = (nextHeading >= 0 ? after.slice(0, nextHeading) : after).trim();
  const tags = extractHashtags(block);
  return tags.length > 0 ? tags.join(" ") : block || null;
}
