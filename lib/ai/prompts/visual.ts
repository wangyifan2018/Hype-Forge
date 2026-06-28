import type { ForgeInput, ProductBrief, PsychologyTrigger, ViralBrief } from "@/lib/forge/types";
import {
  buildForgePromptContext,
  buildPsychologyContextBlock,
  pickVariantTrigger,
  PSYCHOLOGY_VISUAL_MAP,
} from "@/lib/forge/prompt-context";
import { formatReferenceCopyBlock } from "@/lib/forge/reference-copy";

export { PSYCHOLOGY_VISUAL_MAP };

/** 得物社区视觉约束（写入 system，指导分镜与 Prompt 结构） */
export const DEWU_VISUAL_PRINCIPLES = `
得物信息流偏好（必须遵守）：
- 画幅统一 3:4 竖图；封面商品占画面约 55%-70%，背景干净、主体不变形
- 首页缩略图可读：高对比轮廓、主色醒目、避免细碎文字与贴纸
- 多图帖常见结构：① 趋势封面 ② 细节/材质 ③ 场景/上脚/桌搭 ④ 可选对比或配色 ⑤ 氛围远景
- 镜头语言宜具体：写清景别（特写/中景/全景）、机位（平视/俯拍 45°/低机位仰拍）、光线（柔光侧光/轮廓光/自然窗光）
- 调色：潮流感、略高对比、色温与趋势 scene 一致；勿网红过度磨皮
- 豆包限制：每组 2-3 个分镜即可，每镜对应 1 次生成；主提示词须把分镜要素熔炼进一段话（80-180 字）
`;

export const VISUAL_SYSTEM =
  "【Role 角色】\n" +
  "你是得物带货的「视觉导演 + 豆包生图 Prompt 工程师」，精通消费者心理学在视觉传达中的应用。\n" +
  "用户用豆包「图生图/参考图」：上传 Step3 主图 + 粘贴中文提示词，按分镜逐张出图。\n\n" +
  "【Task 任务】\n" +
  "结合【热点场景】、【心理触发器】与【具体商品】输出 3 组豆包方案（不同视觉角度），每组含专业分镜；并输出得物整帖图序 dewuFeedStoryboard。\n\n" +
  `${DEWU_VISUAL_PRINCIPLES}\n\n` +
  "【心理学驱动的视觉策略】\n" +
  "每组方案的视觉设计必须服务于趋势的心理触发器：\n" +
  "- identity（身份认同）→ 独立展示、舞台光、徽章式构图\n" +
  "- novelty（新奇感）→ 打破常规视角、意外并置、超现实元素、鲜明撞色\n" +
  "- community（社区归属）→ 群体场景、圈层符号、共同仪式氛围\n" +
  "- emotion（情绪触发）→ 氛围光影、情绪色调、感官细节放大\n" +
  "- fomo（错失恐惧）→ 限量编号、独占空间、紧张构图\n" +
  "- social_proof（社交认证）→ 多人场景、UGC 风格、从众感\n" +
  "- transformation（蜕变故事）→ before/after 对比、光影变化叙事\n" +
  "- nostalgia（怀旧情绪）→ 复古色调、年代感道具、温暖柔光\n" +
  "- aspiration（向往感）→ 理想生活场景、高级质感、精致生活方式\n" +
  "- belonging（归属感）→ 圈层标识、\"内部人\"视觉密码\n\n" +
  "【Format 格式】\n" +
  "豆包 Prompt 结构化格式（每组 doubaoPromptZh 必须遵循）：\n" +
  "【主体】保留上传商品主体不变形…\n" +
  "【场景】趋势背景/氛围…\n" +
  "【景别/机位/光线】中景、微仰、柔光侧光…\n" +
  "【心理视觉】服务的主触发器及视觉策略…\n" +
  "【约束】3:4 竖图，无文字无 logo 无水印\n\n" +
  "variant 心理分工：\n" +
  "- trend-cover：停留触发器（identity/novelty/social_proof），封面 0.3 秒抓眼\n" +
  "- detail-mood：情绪放大（emotion/novelty），材质微距\n" +
  "- scene-lifestyle：归属/向往（belonging/aspiration），生活化场景\n\n" +
  "【Constraints 约束】\n" +
  "1. doubaoPromptVariants：必须 3 组\n" +
  "   - id：trend-cover | detail-mood | scene-lifestyle\n" +
  "   - directorNotes：20-40 字，须标注服务的主心理触发器\n" +
  "   - shots：每组 2-3 镜\n" +
  "   - doubaoPromptZh：80-180 字，按结构化格式输出\n" +
  "2. dewuFeedStoryboard：4-6 条\n" +
  "3. doubaoPromptZh = 封面组 doubaoPromptZh\n" +
  "4. doubaoNegativeZh：全局负面约束（变形、水印、文字、过度磨皮）\n" +
  "5. psychologyVisualStrategy：一句话总结视觉如何服务心理触发器\n" +
  "6. 只输出合法 JSON：\n" +
  '{\n  "doubaoPromptZh": "...",\n  "doubaoPromptVariants": [...],\n  "dewuFeedStoryboard": [...],\n  "doubaoSop": [...],\n  "fluxEn": "...",\n  "bgRedrawZh": "...",\n  "creativeConcept": "...",\n  "moodKeywords": [...],\n  "shotList": [...],\n  "imagePlaybook": [...],\n  "coverTip": "...",\n  "avoidList": [...],\n  "psychologyVisualStrategy": "...",\n  "doubaoNegativeZh": "..."\n}';

function buildVariantPsychBlock(
  triggers: PsychologyTrigger[]
): string {
  const variants = [
    { id: "trend-cover", label: "趋势封面" },
    { id: "detail-mood", label: "质感细节" },
    { id: "scene-lifestyle", label: "场景种草" },
  ];
  return variants
    .map((v) => {
      const t = pickVariantTrigger(v.id, triggers);
      if (!t) return `- ${v.label}：通用趋势氛围`;
      return `- ${v.label}：主触发器 ${t} → ${PSYCHOLOGY_VISUAL_MAP[t]}`;
    })
    .join("\n");
}

export function buildVisualUserPrompt(
  input: ForgeInput,
  brief?: ProductBrief | null,
  viralBrief?: ViralBrief | null
): string {
  const ctx = buildForgePromptContext(input, brief, viralBrief);
  const psychBlock = buildPsychologyContextBlock(ctx);
  const platformLabel = input.platform === "xiaohongshu" ? "小红书" : "得物";
  const productUrl = input.dewuProductUrl?.trim()
    ? `得物商品链接（仅供理解 SKU，禁止写入 Prompt）：${input.dewuProductUrl}`
    : "未提供得物商品链接。";
  const hooks = brief?.suggestedHooks?.join("；") ?? "";
  const category = brief?.category ?? "潮牌单品";

  const dewuExtra =
    input.platform === "dewu"
      ? `【得物品类参考】${category} — 球鞋类优先「鞋型轮廓+低机位」；服饰类「上身≤40%」；桌搭类「俯拍 45° 陈列」。
整帖建议 4-6 张 3:4 竖图，封面必须一眼识别商品与趋势。`
      : "";

  const viralBriefBlock = viralBrief
    ? `【爆款策略】
情绪内核：${viralBrief.emotionalCore}
记忆锚点：${viralBrief.memoryPoint}
视觉情绪方向：${viralBrief.visualMood}
目标人群：${viralBrief.targetAudience}
${viralBrief.psychologyAlignment ? `心理对齐：${viralBrief.psychologyAlignment}` : ""}`
    : "";

  const variantPsychBlock =
    ctx.psychologyTriggers.length > 0
      ? `\n【各方案心理分工】\n${buildVariantPsychBlock(ctx.psychologyTriggers)}`
      : "";

  return `【热点场景】${ctx.trend.label}
种草角度：${ctx.trend.hookAngle ?? ""}
趋势关键词：${ctx.trend.keywords?.join("、") ?? ""}
英文场景：${ctx.trend.sceneEn}
中文场景：${ctx.trend.sceneZh}
${psychBlock}
${variantPsychBlock}

【商品】${input.productName}
卖点摘要：${input.sellingPoints.slice(0, 300)}
卖点钩子：${hooks || "（从文案推断）"}
目标平台：${platformLabel}
${dewuExtra}
${productUrl}
${formatReferenceCopyBlock(input.referenceCopy)}
${brief ? `【识图】品类=${brief.category}，颜色=${brief.colors.join("、")}，材质=${brief.material}，特征=${brief.visualFeatures}` : "（未上传商品图，请从文案推断视觉）"}
${viralBriefBlock}

请输出 3 组带分镜的 doubaoPromptVariants + dewuFeedStoryboard；每组 doubaoPromptZh 须按【主体】【场景】【景别/机位/光线】【心理视觉】【约束】结构化输出。
${ctx.psychologyTriggers.length > 0 ? `重点：视觉设计必须服务于心理触发器【${ctx.psychologyTriggers.join("、")}】，让用户在刷到封面的瞬间产生心理共振。` : "重点：封面必须在 0.3 秒内抓住注意力，传递趋势氛围与商品特性。"}`;
}
