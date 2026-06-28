import type { ForgeInput, ProductBrief, ViralBrief, VisualPrompts } from "@/lib/forge/types";
import { hasHashtagSection } from "@/lib/forge/copy-hashtags";
import {
  buildForgePromptContext,
  buildPsychologyContextBlock,
  formatPsychologyTriggersLabel,
} from "@/lib/forge/prompt-context";
import { resolveTrend } from "@/lib/forge/trend-resolve";
import { AI_FLAVOR_BLACKLIST } from "@/lib/forge/anti-ai-detect";
import { extractMeaningfulKeywords } from "@/lib/forge/keyword-extractor";

export const CRITIC_SYSTEM =
  "【Role 角色】\n" +
  "你是得物/小红书爆款内容质检编辑 + 反AI味审查员 + 合规审核员。\n" +
  "你的职责是确保种草文案与豆包生图方案达到可发布质量，同时具备真实感与合规性。\n\n" +
  "【Task 任务】\n" +
  "审核文案与视觉方案，输出合法 JSON，含：\n" +
  "- scores：各维度 0-100 分\n" +
  "- mustFix：必须修订的问题列表\n" +
  "- 可选 revisedCopy / revisedFluxEn / revisedBgRedrawZh\n" +
  "- viralityComposite：6维爆款评分（hookStrength/emotionalResonance/trendAlignment/noveltyFactor/timingFit/platformNative）\n\n" +
  "【评分标准】\n" +
  "- hook 90+：反差/提问/数据冲击；70-89：有场景但不够锐利；低于70：平淡无钩子\n" +
  "- viralPotential 90+：记忆锚点+情绪共鸣+实用价值；低于80须在 mustFix 给出爆款提升建议\n" +
  "- scrollStopPower 90+：标题悬念+封面心理信号与 emotionalHook 一致；低于80须建议改标题或封面\n" +
  "- visualAlign 90+：文案情绪与 psychologyVisualStrategy/moodKeywords 一致；低于80须指出图文心理不一致\n" +
  "- searchKeywordDensity 90+：3+搜索词自然融入\n" +
  "- antiAiScore 90+：文案口语化、有具体数字与个人体验、无AI味词汇；低于70须在 mustFix 列出具体AI味表述\n" +
  "- structureCheck 90+：五段式完整（钩子/痛点/方案/效果/CTA）；低于80须指出缺失段落\n" +
  "- complianceCheck 100：无广告法违禁词、无平台敏感词、无URL\n\n" +
  "【AI味检测标准】\n" +
  "- 黑名单词（出现即扣分）：" + AI_FLAVOR_BLACKLIST.slice(0, 15).join("、") + "\n" +
  "- 必须有具体数字（价格/尺寸/时间）\n" +
  "- 必须有个人体验词（我试了/拿到手/上脚/实测）\n" +
  "- 必须有口语化表达（绝了/闭眼入/真的会谢/谁懂啊）\n" +
  "- 每段不超过150字\n" +
  "- 至少3个emoji\n\n" +
  "【五段式结构检查】\n" +
  "1. 【钩子】首句是否制造停留\n" +
  "2. 【痛点场景】是否有具体细节\n" +
  "3. 【解决方案】是否有具体数字\n" +
  "4. 【效果可视化】是否有个人体验\n" +
  "5. 【行动指令】是否有轻CTA\n\n" +
  "【心理一致性审稿】\n" +
  "- 正文首段是否呼应心理触发器与情绪钩子\n" +
  "- 封面豆包 Prompt 是否传递与文案相同的心理信号\n" +
  "- mustFix 示例：「正文偏功能卖点，未呼应 identity 触发器，建议首段加入身份宣言式钩子」\n\n" +
  "【Constraints 约束】\n" +
  "规则：得物仅三小节（标题/正文/话题标签），禁止 URL；话题至少3个#；豆包须3:4与去水印；" +
  "mustFix非空时须提供 revisedCopy 或 revisedBgRedrawZh；禁止虚假促销与编造款号。\n" +
  "只输出合法 JSON，不要包裹在 markdown 代码块中。";

/**
 * 构建修订专用 prompt（多轮迭代时使用）
 * 参考 prompt-optimizer-studio 的 goalAnchor 防偏题机制
 */
export function buildCriticRevisionPrompt(
  input: ForgeInput,
  previousCopy: string,
  previousCritic: { mustFix: string[]; scores: Record<string, number> },
  visual: VisualPrompts,
  brief?: ProductBrief | null,
  viralBrief?: ViralBrief | null,
  round?: number
): string {
  const trend = resolveTrend(input);
  const ctx = buildForgePromptContext(input, brief, viralBrief);
  const psychBlock = buildPsychologyContextBlock(ctx);
  const platformLabel = input.platform === "xiaohongshu" ? "小红书" : "得物";

  return [
    `【修订轮次】第 ${round ?? 2} 轮`,
    "",
    "【GoalAnchor 目标锚定】",
    "修订目标：解决上一轮 mustFix 中的所有问题，同时保持文案的核心创意与心理触发器对齐。",
    "禁止：为修复问题而删除心理触发器、情绪钩子、趋势关键词。",
    "",
    `平台：${platformLabel}`,
    `趋势：${trend.label}`,
    `趋势关键词：${trend.keywords?.join("、") ?? ""}`,
    ctx.psychologyTriggers.length > 0
      ? `心理触发器（必须保留）：${formatPsychologyTriggersLabel(ctx.psychologyTriggers)}`
      : "",
    ctx.emotionalHook ? `情绪钩子（必须保留）：${ctx.emotionalHook}` : "",
    psychBlock,
    "",
    `商品：${input.productName}`,
    "",
    "【上一轮 mustFix（必须全部解决）】",
    ...previousCritic.mustFix.map((f, i) => `${i + 1}. ${f}`),
    "",
    "【上一轮评分（低于阈值的维度须重点提升）】",
    Object.entries(previousCritic.scores)
      .map(([k, v]) => `${k}: ${v}`)
      .join("、"),
    "",
    "【当前文案（须修订）】",
    previousCopy,
    "",
    "请输出修订后的完整文案，确保：",
    "1. 上一轮 mustFix 全部解决",
    "2. 五段式结构完整",
    "3. AI味检测达标（无黑名单词、有数字、有个人体验、有口语化表达）",
    "4. 合规性达标（无违禁词、无URL）",
    "5. 心理触发器与情绪钩子保持一致",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCriticUserPrompt(
  input: ForgeInput,
  copyDraft: string,
  visual: VisualPrompts,
  brief?: ProductBrief | null,
  viralBrief?: ViralBrief | null
): string {
  const trend = resolveTrend(input);
  const ctx = buildForgePromptContext(input, brief, viralBrief);
  const psychBlock = buildPsychologyContextBlock(ctx);
  const platformLabel = input.platform === "xiaohongshu" ? "小红书" : "得物";
  const hashtagOk = hasHashtagSection(copyDraft, 3);
  const variantLines = visual.doubaoPromptVariants
    .map(
      (v) =>
        "· " + v.label + "：" + v.doubaoPromptZh.slice(0, 80) + "…"
    )
    .join("\n");

  // Extract keywords from copy draft using jieba for keyword density evaluation
  const extractedKeywords = extractMeaningfulKeywords(copyDraft, 10);
  const keywordDensityBlock = extractedKeywords.length > 0
    ? `【分词提取关键词】（用于评估 searchKeywordDensity）：${extractedKeywords.join("、")}`
    : "";

  return [
    "【审稿输入】",
    "平台：" + platformLabel,
    "趋势：" + trend.label,
    "趋势关键词（用于评 searchKeywordDensity）：" +
      (trend.keywords?.join("、") ?? ""),
    ctx.psychologyTriggers.length > 0
      ? "心理触发器：" + formatPsychologyTriggersLabel(ctx.psychologyTriggers)
      : "",
    ctx.emotionalHook ? "情绪钩子：" + ctx.emotionalHook : "",
    psychBlock,
    "商品：" + input.productName,
    "得物商品链接（不应出现在正文）：" +
      (input.dewuProductUrl?.trim() || "无"),
    "话题标签小节检测：" + (hashtagOk ? "通过" : "缺失或不足，必须修订"),
    "封面建议：" + visual.coverTip,
    visual.psychologyVisualStrategy
      ? "心理视觉策略：" + visual.psychologyVisualStrategy
      : "",
    visual.doubaoNegativeZh
      ? "豆包负面约束：" + visual.doubaoNegativeZh
      : "",
    "氛围关键词：" + visual.moodKeywords.join("、"),
    brief ? "视觉：" + brief.visualFeatures : "",
    keywordDensityBlock,
    "",
    "【豆包生图 · 共 " + visual.doubaoPromptVariants.length + " 组】",
    variantLines,
    "",
    "【文案草稿】",
    copyDraft,
    "",
    "【英文 FLUX Prompt（备用）】",
    visual.fluxEn,
    "",
    "【审稿要求】",
    "请从以下维度评分（均 0-100）：",
    "hook / emotion / platformFit / visualAlign / hashtagPresent / viralPotential / searchKeywordDensity / scrollStopPower / antiAiScore / structureCheck / complianceCheck",
    "并输出 viralityComposite 6维评分（hookStrength/emotionalResonance/trendAlignment/noveltyFactor/timingFit/platformNative，均 0-100）",
    "重点检查：图文心理一致性、AI味检测、五段式结构完整性、合规性。",
    "评分 searchKeywordDensity 时，参考【分词提取关键词】中的关键词是否自然融入正文。",
  ]
    .filter(Boolean)
    .join("\n");
}
