/**
 * 创意总监 Agent
 * 联合生成视觉方案 + 文案，确保图文心理一致性
 *
 * 参考 rebel-forge 的 recall_training 模式：
 * 一次 LLM 调用同时输出 visual + copy，共享心理学策略
 */

import { chatComplete, isLiveMode } from "@/lib/ai/llm";
import { DEWU_VISUAL_PRINCIPLES } from "@/lib/ai/prompts/visual";
import {
  buildForgePromptContext,
  buildPsychologyContextBlock,
  pickVariantTrigger,
  PSYCHOLOGY_VISUAL_MAP,
} from "@/lib/forge/prompt-context";
import { formatReferenceCopyBlock } from "@/lib/forge/reference-copy";
import { extractJson } from "@/lib/forge/parse-json";
import { normalizeVisualPrompts } from "@/lib/forge/visual-normalize";
import {
  mockVisualPrompts,
  mockCopyMarkdown,
  delay,
} from "@/lib/forge/mock";
import type {
  CreativeOutput,
  ForgeInput,
  ProductBrief,
  ViralBrief,
} from "@/lib/forge/types";
import { creativeOutputSchema } from "@/lib/forge/types";

/**
 * 创意总监系统提示词
 * 联合指导视觉 + 文案生成，强调图文心理一致性
 */
const CREATIVE_DIRECTOR_SYSTEM = `【Role 角色】
你是得物/小红书带货的「创意总监」，同时精通视觉导演与文案创作。
你的核心能力是确保图文心理一致性——视觉氛围与文案情绪必须来自同一套心理学策略。

【Task 任务】
基于【热点场景】、【心理触发器】与【商品】，联合输出：
1. 3 组豆包生图方案（含分镜）
2. 得物整帖图序
3. 完整种草文案（Markdown）
4. 图文心理对齐说明

所有输出必须服务于同一套心理触发器，确保用户从封面到文案感受到一致的情绪共振。

${DEWU_VISUAL_PRINCIPLES}

【心理学驱动的联合策略】
视觉与文案必须共同服务心理触发器：
- identity（身份认同）→ 视觉：独立展示、舞台光；文案：强调"属于你的风格"
- novelty（新奇感）→ 视觉：打破常规视角；文案：制造好奇心、反常识
- community（社区归属）→ 视觉：群体场景；文案：圈层黑话、共同记忆
- emotion（情绪触发）→ 视觉：氛围光影；文案：感官细节、情绪词
- fomo（错失恐惧）→ 视觉：限量编号；文案：稀缺、紧迫
- social_proof（社交认证）→ 视觉：多人场景；文案：热度、想要人数
- transformation（蜕变故事）→ 视觉：before/after；文案：前后对比叙事
- nostalgia（怀旧情绪）→ 视觉：复古色调；文案：年代感、温暖回忆
- aspiration（向往感）→ 视觉：理想生活；文案：精致、高级
- belonging（归属感）→ 视觉：圈层标识；文案："内部人"密码

【Format 格式】
输出合法 JSON，结构如下：
{
  "visual": {
    "doubaoPromptZh": "...",
    "doubaoPromptVariants": [...],
    "dewuFeedStoryboard": [...],
    "doubaoSop": [...],
    "fluxEn": "...",
    "bgRedrawZh": "...",
    "creativeConcept": "...",
    "moodKeywords": [...],
    "shotList": [...],
    "imagePlaybook": [...],
    "coverTip": "...",
    "avoidList": [...],
    "psychologyVisualStrategy": "...",
    "doubaoNegativeZh": "..."
  },
  "copyDraft": "完整 Markdown 文案（含标题、正文、话题标签）",
  "sharedPsychologyNotes": "图文共同服务的心理触发器与策略说明（50-100字）",
  "visualCopyAlignment": "视觉与文案如何呼应的具体说明（30-60字）"
}

【Constraints 约束】
1. visual 部分必须遵循豆包 Prompt 结构化格式（【主体】【场景】【景别/机位/光线】【心理视觉】【约束】）
2. copyDraft 必须严格按五段式结构（【钩子】【痛点场景】【解决方案】【效果可视化】【行动指令】）
3. sharedPsychologyNotes 必须明确列出主触发器与次触发器
4. visualCopyAlignment 必须说明封面视觉与文案首段的情绪呼应关系
5. 禁止 AI 味词汇（综上所述、值得注意的是、不可否认等）
6. 文案必须包含具体数字、个人体验细节、口语化表达
7. 只输出合法 JSON，不要其他内容`;

/**
 * 构建创意总监用户提示词
 * 整合趋势、商品、策略简报，指导联合生成
 */
function buildCreativeDirectorUserPrompt(
  input: ForgeInput,
  brief?: ProductBrief | null,
  viralBrief?: ViralBrief | null
): string {
  const ctx = buildForgePromptContext(input, brief, viralBrief);
  const psychBlock = buildPsychologyContextBlock(ctx);
  const platformLabel = input.platform === "xiaohongshu" ? "小红书" : "得物";
  const productUrl = input.dewuProductUrl?.trim()
    ? `得物商品链接（仅供理解 SKU，禁止写入正文或 Prompt）：${input.dewuProductUrl}`
    : "未提供得物商品链接。";
  const hooks = brief?.suggestedHooks?.join("；") ?? "";
  const category = brief?.category ?? "潮牌单品";

  const dewuExtra =
    input.platform === "dewu"
      ? `【得物品类参考】${category} — 球鞋类优先「鞋型轮廓+低机位」；服饰类「上身≤40%」；桌搭类「俯拍 45° 陈列」。
整帖建议 4-6 张 3:4 竖图，封面必须一眼识别商品与趋势。
禁止得物商品链接出现在正文、禁止##好物链接小节。`
      : "";

  const viralBriefBlock = viralBrief
    ? `【爆款策略简报】
框架：${viralBrief.hookFramework}
情绪内核：${viralBrief.emotionalCore}
记忆锚点：${viralBrief.memoryPoint}
视觉情绪方向：${viralBrief.visualMood}
目标人群：${viralBrief.targetAudience}
预埋搜索词：${viralBrief.keywordStrategy.join("、")}
CTA 策略：${viralBrief.ctaStrategy}
${viralBrief.psychologyAlignment ? `心理对齐：${viralBrief.psychologyAlignment}` : ""}

文案须呼应情绪钩子；预埋词自然嵌入不堆砌。`
    : "";

  // 构建各方案心理分工
  const variants = [
    { id: "trend-cover", label: "趋势封面" },
    { id: "detail-mood", label: "质感细节" },
    { id: "scene-lifestyle", label: "场景种草" },
  ];
  const variantPsychBlock = ctx.psychologyTriggers.length > 0
    ? `\n【各方案心理分工】\n${variants
        .map((v) => {
          const t = pickVariantTrigger(v.id, ctx.psychologyTriggers);
          if (!t) return `- ${v.label}：通用趋势氛围`;
          return `- ${v.label}：主触发器 ${t} → ${PSYCHOLOGY_VISUAL_MAP[t]}`;
        })
        .join("\n")}`
    : "";

  return `【热点场景】${ctx.trend.label}
种草角度：${ctx.trend.hookAngle ?? ""}
趋势关键词：${ctx.trend.keywords?.join("、") ?? ""}
英文场景：${ctx.trend.sceneEn}
中文场景：${ctx.trend.sceneZh}
${psychBlock}
${variantPsychBlock}

【商品】${input.productName}
卖点：${input.sellingPoints}
卖点钩子：${hooks || "（从文案推断）"}
目标平台：${platformLabel}
${dewuExtra}
${productUrl}
${formatReferenceCopyBlock(input.referenceCopy)}
${brief ? `【识图】品类=${brief.category}，颜色=${brief.colors.join("、")}，材质=${brief.material}，特征=${brief.visualFeatures}` : "（未上传商品图，请从文案推断视觉）"}
${viralBriefBlock}

【联合生成要求】
1. 视觉方案必须服务于心理触发器【${ctx.psychologyTriggers.join("、") || "通用趋势"}】
2. 文案必须与视觉氛围情绪一致（如视觉是复古怀旧，文案不能用赛博朋克语气）
3. 封面视觉与文案首段必须形成情绪呼应（如封面是冲击感，首句也必须是冲击感）
4. 每组视觉方案的 directorNotes 须标注服务的心理触发器
5. sharedPsychologyNotes 须总结图文共同策略

请输出完整 JSON。`;
}

export interface CreativeDirectorInput {
  input: ForgeInput;
  brief?: ProductBrief | null;
  viralBrief?: ViralBrief | null;
  signal?: AbortSignal;
}

/**
 * 运行创意总监 Agent
 * 联合生成视觉方案 + 文案，确保图文心理一致性
 */
export async function runCreativeDirector(
  params: CreativeDirectorInput
): Promise<CreativeOutput> {
  const { input, brief, viralBrief, signal } = params;

  if (!isLiveMode()) {
    await delay(800);
    const visual = mockVisualPrompts(input);
    const copyDraft = mockCopyMarkdown(input);
    return {
      visual,
      copyDraft,
      sharedPsychologyNotes: `[Mock] 主触发器：identity/novelty。视觉通过独立展示与舞台光强化身份认同；文案以"我的"开头建立个人叙事。`,
      visualCopyAlignment: `[Mock] 封面高对比轮廓与文案首句冲击力呼应，共同传递${input.platform === "dewu" ? "潮流态度" : "种草氛围"}。`,
    };
  }

  const raw = await chatComplete(
    [
      {
        role: "user",
        content: buildCreativeDirectorUserPrompt(input, brief, viralBrief),
      },
    ],
    { signal, system: CREATIVE_DIRECTOR_SYSTEM }
  );

  const parsed = creativeOutputSchema.parse(extractJson(raw));

  // 标准化视觉输出
  const normalizedVisual = normalizeVisualPrompts(parsed.visual);

  return {
    visual: normalizedVisual,
    copyDraft: parsed.copyDraft,
    sharedPsychologyNotes: parsed.sharedPsychologyNotes,
    visualCopyAlignment: parsed.visualCopyAlignment,
  };
}
