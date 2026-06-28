import { PUBLISH_CHECKLIST_ITEMS } from "@/lib/forge/workspace-prefs";
import { checkAffiliateLink } from "@/lib/forge/link-check";
import { formatDoubaoVariantCopy } from "@/lib/forge/doubao-prompt-format";
import { parseDewuPublish } from "@/lib/forge/parse-dewu-publish";
import type { CriticReport, ForgeInput, VisualPrompts } from "@/lib/forge/types";

export function buildExportPackMarkdown(
  input: ForgeInput,
  copyText: string,
  prompts: VisualPrompts | null,
  critic: CriticReport | null,
  extras?: {
    engageTemplates?: string[];
    publishChecklist?: Record<string, boolean>;
  }
): string {
  const sections: string[] = [
    "# Hype-Forge 得物带货导出包",
    "",
    `**商品**：${input.productName}`,
    `**平台**：${input.platform === "dewu" ? "得物" : "小红书"}`,
  ];

  if (input.dewuProductUrl) {
    sections.push(`**商品页**：${input.dewuProductUrl}`);
  }
  if (input.affiliateLink) {
    sections.push(`**好物链接**：${input.affiliateLink}`);
  }

  if (prompts) {
    sections.push(
      "",
      "---",
      "",
      "## 得物发帖图序（分镜）",
      "",
      ...prompts.dewuFeedStoryboard.map(
        (f) =>
          `- 图${f.position} **${f.role}**（${f.shotSize}）· 方案 \`${f.variantId ?? "—"}\`：${f.note}`
      ),
      "",
      "## 豆包生图（3 组 · 含分镜）",
      "",
      ...prompts.doubaoPromptVariants.flatMap((v) => [
        `### ${v.label} · ${v.postUse}`,
        "",
        formatDoubaoVariantCopy(v),
        "",
      ]),
      "",
      "## 豆包作图 SOP",
      "",
      ...prompts.doubaoSop.map(
        (s) =>
          `${s.step}. **${s.tool}** — ${s.action}\n   ${s.detail}`
      )
    );
  }

  if (input.platform === "dewu" && copyText) {
    const parsed = parseDewuPublish(copyText);
    sections.push(
      "",
      "---",
      "",
      "## 得物发帖 · 标题",
      "",
      parsed.title,
      "",
      "## 得物发帖 · 正文",
      "",
      parsed.body,
      "",
      "## 得物发帖 · 话题",
      "",
      parsed.hashtagsText
    );
  } else {
    sections.push("", "---", "", "## 发帖文案", "", copyText || "（暂无）");
  }

  if (critic) {
    sections.push(
      "",
      "---",
      "",
      "## Critic 质检",
      `- Hook: ${critic.scores.hook}`,
      `- 情绪: ${critic.scores.emotion}`,
      `- 平台: ${critic.scores.platformFit}`,
      `- 视觉: ${critic.scores.visualAlign}`,
      critic.scores.hashtagPresent != null
        ? `- 话题: ${critic.scores.hashtagPresent}`
        : "",
      critic.scores.viralPotential != null
        ? `- 爆款潜力: ${critic.scores.viralPotential}`
        : "",
      critic.scores.scrollStopPower != null
        ? `- 首屏停留: ${critic.scores.scrollStopPower}`
        : "",
      critic.scores.searchKeywordDensity != null
        ? `- 搜索词嵌入: ${critic.scores.searchKeywordDensity}`
        : ""
    );
    if (critic.mustFix.length) {
      sections.push("", "**待改进**：", ...critic.mustFix.map((m) => `- ${m}`));
    }
  }

  if (prompts) {
    sections.push(
      "",
      "---",
      "",
      "## 备用 FLUX EN",
      "",
      prompts.fluxEn
    );
  }

  const linkCheck = checkAffiliateLink(input.affiliateLink ?? "");
  sections.push(
    "",
    "---",
    "",
    "## 链接检查",
    linkCheck.message
  );

  if (extras?.publishChecklist) {
    sections.push("", "## 发帖清单", "");
    for (const item of PUBLISH_CHECKLIST_ITEMS) {
      const done = extras.publishChecklist[item.id];
      sections.push(`- [${done ? "x" : " "}] ${item.label}`);
    }
  }

  if (extras?.engageTemplates?.length) {
    sections.push("", "## 评论引流话术", "");
    extras.engageTemplates.forEach((t, i) => {
      sections.push(`${i + 1}. ${t}`);
    });
  }

  sections.push(
    "",
    "---",
    "",
    "## 今日执行清单",
    "1. 豆包上传 Step3 主图，粘贴「豆包生图提示词」",
    "2. 复制右侧标题/正文/话题到得物社区发帖",
    "3. 自行粘贴好物链接，发布前点一次确认可打开"
  );

  return sections.filter(Boolean).join("\n");
}
