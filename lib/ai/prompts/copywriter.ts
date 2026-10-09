import type { ForgeInput, ProductBrief, ViralBrief, VisualPrompts } from "@/lib/forge/types";
import {
  buildForgePromptContext,
  buildPsychologyContextBlock,
  HOOK_OPENING_FORMULAS,
} from "@/lib/forge/prompt-context";
import { formatReferenceCopyBlock } from "@/lib/forge/reference-copy";
import { AI_FLAVOR_BLACKLIST } from "@/lib/forge/anti-ai-detect";
import { extractMeaningfulKeywords } from "@/lib/forge/keyword-extractor";

const FRAMEWORK_GUIDES: Record<string, string> = {
  AIDA: "【AIDA 框架】注意→兴趣→欲望→行动。首句必须制造视觉冲击或好奇心，中段展开卖点细节，末段引导行动。",
  PAS: "【PAS 框架】痛点→激化→解决。先说用户遇到的问题，再放大痛点，最后给出产品作为解决方案。",
  BAB: "【BAB 框架】前→后→桥梁。描述使用前状态，再描述使用后状态，产品就是连接两者的桥梁。",
  SOCIAL_PROOF: "【社交认证框架】强调社区热度、明星同款、评论区反馈、想要人数，用他人认可建立信任。",
  FOMO: "【FOMO 框架】稀缺+紧迫。限量/季节/涨价/断码，制造错过恐惧，但要真实不虚假。",
  TRANSFORMATION: "【蜕变故事框架】从路人到焦点的穿搭改造叙事，强调使用产品前后的形象变化。",
};

/**
 * RTF-X 框架：Role-Task-Format-Constraints
 * 统一 prompt 骨架，参考小红书 RTF-X 实战模式
 */
function buildRtfXFramework(input: ForgeInput, viralBrief?: ViralBrief | null): string {
  const platform = input.platform === "xiaohongshu" ? "小红书" : "得物";

  const role = input.platform === "xiaohongshu"
    ? "你是一位资深小红书种草博主，擅长用真实体验分享打动读者，文风亲切自然，像闺蜜聊天。"
    : "你是一位得物社区潮流达人，擅长用酷炫有态度的文案带货，文风直接、真实、有冲击力。";

  const hookFormula = viralBrief ? HOOK_OPENING_FORMULAS[viralBrief.hookFramework] ?? "" : "";
  const frameworkGuide = viralBrief ? FRAMEWORK_GUIDES[viralBrief.hookFramework] ?? "" : "";

  const task = `你的任务是为${platform}平台创作一篇爆款种草文案，必须严格遵循五段式结构：

【五段式结构】（必须按顺序输出，每段用【】标注）
1. 【钩子】首句必须制造停留——使用反差提问/数据冲击/悬念制造，在前2行内抓住注意力
2. 【痛点场景】描述目标用户的真实痛点或场景，必须包含具体细节（时间/地点/感受）
3. 【解决方案】介绍产品如何解决痛点，突出1-2个核心卖点，必须包含具体数字（价格/尺寸/材质）
4. 【效果可视化】展示使用后的效果或感受，必须包含个人体验细节（"我试了""拿到手""上脚"）
5. 【行动指令】引导用户互动（收藏/评论/关注），使用轻CTA，禁止直接放链接

${frameworkGuide}
${hookFormula}`;

  const titleCandidatesBlock = viralBrief?.titleCandidates && viralBrief.titleCandidates.length > 0
    ? `使用以下标题候选（已按规则分排序：数字/疑问/情绪等特征命中情况，非语义质量评分），
选用规则分最高者作为主标题，并自行判断它是否贴合商品：
${viralBrief.titleCandidates.map((c, i) => `${i + 1}. ${c.title}（${c.hookType}，规则分${c.estimatedScore}）`).join("\n")}`
    : `输出3个候选标题（用 --- 分隔），每个≤20字，分别标注使用的角度：
- 角度A：${viralBrief?.titleAngles[0] ?? "场景冲击"}
- 角度B：${viralBrief?.titleAngles[1] ?? "卖点直击"}
- 角度C：${viralBrief?.titleAngles[2] ?? "情绪共鸣"}
最终选用角度A作为主标题，可带1-2个emoji，有冲击力。`;

  const format = input.platform === "xiaohongshu"
    ? `输出 Markdown 笔记，必须包含以下小节（按顺序）：
## 标题（带 Emoji，≤20字）
## 创意主轴（2-3句：这条笔记的记忆点与情绪）
## 正文（严格按五段式结构，每段标注【钩子】【痛点场景】【解决方案】【效果可视化】【行动指令】）
## 配图怎么发（3-5条 bullet：封面/图2/图3 各发什么，与视觉方案一致）
## 发帖实操（numbered list 4-6步：修图→写文案→带话题→发布时机建议）
## 话题标签（至少4个，每行以 # 开头，例如 #好物分享 #OOTD）`
    : `输出 Markdown，且仅包含以下三个小节（按顺序，不要其他 ## 标题）：
## 标题
${titleCandidatesBlock}

## 正文
严格按五段式结构输出，每段用【】标注段落类型：
【钩子】首段：场景+情绪钩子，必须在前2行内制造「停留意愿」，呼应心理触发器与情绪钩子
【痛点场景】第二段：描述目标用户的真实场景，必须包含具体细节
【解决方案】第三段：1-2个具体卖点（优先来自用户参考文案与识图情绪/社交价值，禁止编造鉴定号/价格），必须包含具体数字
【效果可视化】第四段：个人体验感受，必须包含"我试了""拿到手""上脚"等个人体验词
【行动指令】末段：${viralBrief?.ctaStrategy ?? "轻CTA，可说「链接在主页/评论区」类表述，禁止写任何 URL"}
每段最多1-2个emoji，避免堆砌；段与段之间空一行。

## 话题标签
单独小节，至少4个 # 开头标签，空格分隔，须可在得物搜索。`;

  const blacklistSample = AI_FLAVOR_BLACKLIST.slice(0, 10).join("、");
  const constraints = `【硬性约束】
1. 禁止使用以下AI味词汇：${blacklistSample}等
2. 必须包含至少1个具体数字（价格/尺寸/时间/材质参数）
3. 必须包含至少1个个人体验细节（"我试了""拿到手""上脚""实测"）
4. 必须使用口语化表达（"绝了""闭眼入""真的会谢""谁懂啊"）
5. 每段控制在50-150字，避免长段落
6. 全文至少使用3个emoji，分布在各段
7. 禁止虚假促销、医疗功效宣称、编造鉴定号/价格
${input.platform === "dewu" ? "8. 禁止得物商品链接出现在正文、禁止##好物链接小节\n9. 语气：酷、直接、有态度" : "8. 语气：亲切、真实、像闺蜜聊天"}`;

  return `【Role 角色】
${role}

【Task 任务】
${task}

【Format 格式】
${format}

【Constraints 约束】
${constraints}`;
}

export function buildCopywriterSystem(
  input: ForgeInput,
  viralBrief?: ViralBrief | null
): string {
  const rtfX = buildRtfXFramework(input, viralBrief);

  const strategyBlock = viralBrief
    ? `\n\n【本次策略简报】
框架：${viralBrief.hookFramework}
情绪内核：${viralBrief.emotionalCore}
记忆锚点：${viralBrief.memoryPoint}
目标人群：${viralBrief.targetAudience}
预埋搜索词：${viralBrief.keywordStrategy.join("、")}
CTA 策略：${viralBrief.ctaStrategy}
${viralBrief.psychologyAlignment ? `心理对齐：${viralBrief.psychologyAlignment}` : ""}

正文须呼应【情绪钩子】；预埋词优先来自 keywordStrategy，自然嵌入不堆砌。`
    : "";

  // 卖家自己的历史爆款（真实互动数据筛出的 ICL 样本）——越用越贴合本人风格
  const learn = input.learnContext;
  const learnBlock =
    learn && learn.iclBlock.trim()
      ? `\n\n【你的历史爆款（来自你自己的发帖记录，共 ${learn.sampleCount} 条）】\n${learn.iclBlock}${
          learn.topFramework
            ? `\n历史最佳框架：${learn.topFramework}（若与本次策略简报冲突，以本次策略为准）`
            : ""
        }`
      : "";

  // 卖家偏好来自他自己的操作（多次点「更短」、总是挑更短的标题…），
  // 属于软约束：与硬性约束冲突时以硬性约束为准
  const prefs = input.learnContext?.preferenceHints ?? [];
  const prefBlock =
    prefs.length > 0
      ? `\n\n【卖家偏好（来自你自己的改稿选择）】\n${prefs
          .map((p) => `- ${p}`)
          .join("\n")}\n以上为软偏好，若与硬性约束或合规要求冲突，以硬性约束为准。`
      : "";

  return `${rtfX}${strategyBlock}${learnBlock}${prefBlock}\n\n不要 JSON 包裹，直接输出 Markdown。`;
}

export function buildCopywriterUserPrompt(
  input: ForgeInput,
  brief?: ProductBrief | null,
  prompts?: VisualPrompts | null,
  viralBrief?: ViralBrief | null
): string {
  const ctx = buildForgePromptContext(input, brief, viralBrief);
  const psychBlock = buildPsychologyContextBlock(ctx);

  const productUrl = input.dewuProductUrl?.trim()
    ? `得物商品链接（仅供理解 SKU，禁止写入正文）：${input.dewuProductUrl}`
    : "用户未提供得物商品链接。";

  const visualBlock = prompts
    ? `【豆包生图方向——正文氛围须对齐，勿复述 Prompt】
氛围：${prompts.moodKeywords.join("、")}
创意：${prompts.creativeConcept}
${prompts.psychologyVisualStrategy ? `心理视觉策略：${prompts.psychologyVisualStrategy}` : ""}
发帖图序：${prompts.dewuFeedStoryboard.map((f) => `图${f.position}${f.role}`).join("→")}
多图方案：${prompts.doubaoPromptVariants.map((v) => `${v.label}（${v.postUse}，${v.shots.length}镜）`).join("；")}`
    : "";

  const fiveSegReminder = input.platform === "dewu"
    ? "正文必须严格按五段式结构输出，每段用【钩子】【痛点场景】【解决方案】【效果可视化】【行动指令】标注。"
    : "正文必须严格按五段式结构输出，每段用【钩子】【痛点场景】【解决方案】【效果可视化】【行动指令】标注。";

  // Extract keywords from input text using jieba for better keyword coverage
  const textForKeywords = [
    input.productName,
    input.sellingPoints,
    input.referenceCopy,
    ctx.trend.keywords?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const extractedKeywords = extractMeaningfulKeywords(textForKeywords, 8);
  const keywordBlock = extractedKeywords.length > 0
    ? `【分词提取关键词】（自然融入正文，优先用于话题标签）：${extractedKeywords.join("、")}`
    : "";

  return `趋势：${ctx.trend.label}
种草角度：${ctx.trend.hookAngle ?? ""}
趋势关键词（优先用于 #话题标签）：${ctx.trend.keywords?.join("、") ?? ""}
${psychBlock}

商品：${input.productName}
卖点：${input.sellingPoints}
${input.styleTags?.length ? `风格标签：${input.styleTags.join("、")}` : ""}
${productUrl}
${formatReferenceCopyBlock(input.referenceCopy)}
${brief ? `视觉洞察：${brief.visualFeatures}；配色 ${brief.colors.join("、")}；钩子参考 ${brief.suggestedHooks.join("；")}` : ""}
${visualBlock}
${keywordBlock}

${fiveSegReminder}
请直接输出完整 Markdown。`;
}
