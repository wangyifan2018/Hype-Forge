import { PSYCHOLOGY_LABELS } from "@/lib/forge/psychology-labels";
import { hotCardFromStaticTrend, resolveTrend, type ResolvedTrend } from "@/lib/forge/trend-resolve";
import { getTrendById } from "@/lib/forge/trends";
import type {
  ForgeInput,
  ProductBrief,
  PsychologyTrigger,
  ViralBrief,
} from "@/lib/forge/types";

/** 心理触发器 → 视觉策略映射 */
export const PSYCHOLOGY_VISUAL_MAP: Record<PsychologyTrigger, string> = {
  identity: "身份标签视觉：突出商品作为身份符号的仪式感，如独立展示、舞台光、徽章式构图",
  novelty: "新奇感视觉：打破常规的视角、意外 juxtaposition、超现实元素、鲜明撞色",
  community: "社区归属视觉：群体场景、圈层符号、共同仪式、'我们这类人'的氛围",
  emotion: "情绪触发视觉：氛围光影、情绪色调、微表情、感官细节放大",
  fomo: "稀缺紧迫视觉：限量编号、倒计时感、独占空间、'最后一件'的紧张构图",
  social_proof: "社交认证视觉：多人场景、UGC 风格、社区截图拼贴、'大家都在用'的从众感",
  transformation: "蜕变对比视觉：before/after 对比、光影变化、从暗到亮的叙事",
  nostalgia: "怀旧情绪视觉：复古色调、经典元素复刻、年代感道具、温暖柔光",
  aspiration: "向往感视觉：理想生活场景、高级质感、向上社交符号、精致生活方式",
  belonging: "归属感视觉：圈层标识、共同语言、'内部人'才懂的视觉密码",
};

export type ForgePromptContext = {
  trend: ResolvedTrend;
  psychologyTriggers: PsychologyTrigger[];
  emotionalHook?: string;
  viralPotential?: number;
  psychologyAlignment?: string;
  emotionalBenefits?: string[];
  socialBenefits?: string[];
  functionalBenefits?: string[];
};

/** variant id → 优先服务的心理触发器 */
export const VARIANT_TRIGGER_MAP: Record<string, PsychologyTrigger[]> = {
  "trend-cover": ["identity", "novelty", "social_proof"],
  "detail-mood": ["emotion", "novelty", "transformation"],
  "scene-lifestyle": ["belonging", "aspiration", "community"],
};

export const DEFAULT_DOUBAO_NEGATIVE_ZH =
  "避免商品变形拉伸、平台水印、文字贴纸、二维码、过度磨皮、背景杂乱抢主体";

/** 得物首句公式（按 hookFramework） */
export const HOOK_OPENING_FORMULAS: Record<string, string> = {
  AIDA: "首句公式：视觉冲击/反差提问开场，如「第一眼就被这个配色击中」",
  PAS: "首句公式：痛点开场，如「通勤鞋穿腻了？这双直接换赛道」",
  BAB: "首句公式：使用前状态，如「以前穿搭总差点意思，直到换上这双」",
  SOCIAL_PROOF: "首句公式：社交认证，如「评论区都在问链接，我来说说真实体验」",
  FOMO: "首句公式：稀缺紧迫，如「这个配色快断码了，犹豫就真没了」",
  TRANSFORMATION: "首句公式：蜕变叙事，如「上脚瞬间从路人变焦点，不是夸张」",
};

export function buildForgePromptContext(
  input: ForgeInput,
  brief?: ProductBrief | null,
  viralBrief?: ViralBrief | null
): ForgePromptContext {
  const trend = resolveTrend(input);
  const ctx = input.trendContext;
  const staticCard = hotCardFromStaticTrend(getTrendById(input.trendId));

  const psychologyTriggers =
    ctx?.psychologyTriggers ??
    staticCard?.psychologyTriggers ??
    [];

  return {
    trend,
    psychologyTriggers,
    emotionalHook: ctx?.emotionalHook ?? staticCard?.emotionalHook,
    viralPotential: ctx?.viralPotential ?? staticCard?.viralPotential,
    psychologyAlignment: viralBrief?.psychologyAlignment,
    emotionalBenefits: brief?.emotionalBenefits,
    socialBenefits: brief?.socialBenefits,
    functionalBenefits: brief?.functionalBenefits,
  };
}

export function formatPsychologyTriggersLabel(
  triggers: PsychologyTrigger[]
): string {
  if (triggers.length === 0) return "未标注";
  return triggers.map((t) => PSYCHOLOGY_LABELS[t] ?? t).join("、");
}

export function buildPsychologyContextBlock(ctx: ForgePromptContext): string {
  const lines: string[] = [];
  if (ctx.psychologyTriggers.length > 0) {
    lines.push(
      `【心理触发器】${ctx.psychologyTriggers.join("、")}（${formatPsychologyTriggersLabel(ctx.psychologyTriggers)}）`
    );
  }
  if (ctx.emotionalHook) {
    lines.push(`【情绪钩子】${ctx.emotionalHook}`);
  }
  if (ctx.viralPotential != null) {
    lines.push(`【病毒潜力】${ctx.viralPotential}/100`);
  }
  if (ctx.psychologyAlignment) {
    lines.push(`【心理对齐策略】${ctx.psychologyAlignment}`);
  }
  if (ctx.emotionalBenefits?.length) {
    lines.push(`【识图情绪价值】${ctx.emotionalBenefits.join("、")}`);
  }
  if (ctx.socialBenefits?.length) {
    lines.push(`【识图社交价值】${ctx.socialBenefits.join("、")}`);
  }
  if (ctx.functionalBenefits?.length) {
    lines.push(`【功能利益点】${ctx.functionalBenefits.join("、")}`);
  }
  return lines.length > 0 ? lines.join("\n") : "";
}

export function buildPsychologyVisualStrategyDefault(
  triggers: PsychologyTrigger[]
): string {
  if (triggers.length === 0) {
    return "视觉设计服务于心理触发器，让用户在 0.3 秒内产生心理共振";
  }
  const primary = triggers[0]!;
  return `封面强化【${PSYCHOLOGY_LABELS[primary]}】触发器，0.3 秒内传递身份/情绪信号`;
}

export function pickVariantTrigger(
  variantId: string,
  triggers: PsychologyTrigger[]
): PsychologyTrigger | undefined {
  const preferred = VARIANT_TRIGGER_MAP[variantId] ?? [];
  for (const p of preferred) {
    if (triggers.includes(p)) return p;
  }
  return triggers[0];
}
