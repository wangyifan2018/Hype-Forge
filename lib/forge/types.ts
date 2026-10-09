import { z } from "zod";

export const platformSchema = z.enum(["xiaohongshu", "dewu"]);
export type Platform = z.infer<typeof platformSchema>;

/**
 * 请求级模型选择字段。
 * 合法性由 `lib/ai/models.ts` 目录判定；未知模型由服务端回落到默认模型，
 * 不返回 400（避免前端持久化的旧模型名让整个接口不可用）。
 */
export const llmModelSchema = z.string().max(64).optional();

export const trendLifecycleStageSchema = z.enum([
  "emerging",
  "rising",
  "peak",
  "declining",
]);

export const psychologyTriggerSchema = z.enum([
  "identity",
  "novelty",
  "community",
  "emotion",
  "fomo",
  "social_proof",
  "transformation",
  "nostalgia",
  "aspiration",
  "belonging",
]);

export type PsychologyTrigger = z.infer<typeof psychologyTriggerSchema>;

export const hotTrendCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  heatScore: z.number().min(1).max(100),
  keywords: z.array(z.string()),
  sceneEn: z.string(),
  sceneZh: z.string(),
  hookAngle: z.string(),
  whyNow: z.string().optional(),
  suggestedScoutKeywords: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  lifecycleStage: trendLifecycleStageSchema.optional(),
  trendVelocity: z.enum(["accelerating", "stable", "decelerating"]).optional(),
  saturationLevel: z.enum(["low", "medium", "high"]).optional(),
  bestPostWindow: z.string().optional(),
  officialTopicMatch: z.string().optional(),
  psychologyTriggers: z.array(psychologyTriggerSchema).min(1).max(4).optional(),
  viralPotential: z.number().min(1).max(100).optional(),
  emotionalHook: z.string().optional(),
});

export type HotTrendCard = z.infer<typeof hotTrendCardSchema>;

export const hotTrendScanResponseSchema = z.object({
  trends: z.array(hotTrendCardSchema).min(1),
  cached: z.boolean().optional(),
});

export const competitionLevelSchema = z.enum(["低", "中", "高"]);

export const bestPostFormatSchema = z.enum([
  "单品种草",
  "对比测评",
  "合集清单",
]);

export const hotProductLeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  heatScore: z.number().min(1).max(100),
  searchKeywords: z.array(z.string()),
  contentAngle: z.string(),
  whyHot: z.string(),
  creativeHooks: z.array(z.string()).min(2).max(5),
  verifySteps: z.array(z.string()).min(2).max(6),
  competitionLevel: competitionLevelSchema,
  bestPostFormat: bestPostFormatSchema,
  priority: z.enum(["high", "medium", "low"]).optional(),
  note: z.string(),
  psychologyTriggers: z.array(psychologyTriggerSchema).min(1).max(4).optional(),
  viralPotential: z.number().min(1).max(100).optional(),
  emotionalHook: z.string().optional(),
});

export const productEnrichResponseSchema = z.object({
  sellingPoints: z.string(),
  styleTags: z.array(z.string()).optional(),
  searchKeywords: z.array(z.string()).optional(),
});

export type ProductEnrichResponse = z.infer<typeof productEnrichResponseSchema>;

export const remixTypeSchema = z.enum([
  "shorter",
  "hookier",
  "more_professional",
  "regenerate_titles",
  "angle",
  /** 按质检给出的待改进项定向修订（人机确认点：用户点按钮才执行） */
  "revise_mustfix",
]);

export type RemixType = z.infer<typeof remixTypeSchema>;

export const engageReplyStrategySchema = z.object({
  trigger: z.string(),
  reply: z.string(),
  psychology: z.string(),
});

export type EngageReplyStrategy = z.infer<typeof engageReplyStrategySchema>;

export const engageResponseSchema = z.object({
  templates: z.array(z.string()).min(1).max(6),
  replyStrategies: z.array(engageReplyStrategySchema).min(3).max(6).optional(),
});

export type HotProductLead = z.infer<typeof hotProductLeadSchema>;

export const productScoutResponseSchema = z.object({
  leads: z.array(hotProductLeadSchema).min(1),
  cached: z.boolean().optional(),
});

export const productImageMetaSchema = z.object({
  dataUrl: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  role: z.enum(["cover", "detail"]).optional(),
});

export type ProductImageMeta = z.infer<typeof productImageMetaSchema>;

/**
 * 卖家自己历史爆款的 ICL 上下文（数据源是浏览器 localStorage 里的发帖记录，
 * 因此由前端算好后随请求下发），用于让文案越用越像卖家自己的爆款。
 */
export const learnContextSchema = z.object({
  iclBlock: z.string().max(2000),
  topFramework: z.string().optional(),
  sampleCount: z.number().int().min(0),
});

export type LearnContext = z.infer<typeof learnContextSchema>;

export const forgeInputSchema = z.object({
  trendId: z.string(),
  productName: z.string().min(1),
  sellingPoints: z.string().min(1),
  platform: platformSchema,
  productImage: z.string().nullable().optional(),
  productImages: z.array(productImageMetaSchema).max(6).optional(),
  trendContext: hotTrendCardSchema.optional().nullable(),
  dewuProductUrl: z.string().optional(),
  affiliateLink: z.string().optional(),
  referenceCopy: z.string().max(2000).optional(),
  styleTags: z.array(z.string()).optional(),
  /** 历史爆款 few-shot（可选） */
  learnContext: learnContextSchema.optional(),
});

export type ForgeInput = z.infer<typeof forgeInputSchema>;

export const productStyleSchema = z.enum([
  "streetwear",
  "minimal",
  "sporty",
  "vintage",
  "techwear",
  "casual",
]);

export const productBriefSchema = z.object({
  category: z.string(),
  colors: z.array(z.string()),
  material: z.string(),
  visualFeatures: z.string(),
  suggestedHooks: z.array(z.string()),
  style: productStyleSchema.optional(),
  targetAudience: z.string().optional(),
  conditionQuality: z.enum(["high", "medium", "low"]).optional(),
  functionalBenefits: z.array(z.string()).optional(),
  emotionalBenefits: z.array(z.string()).optional(),
  socialBenefits: z.array(z.string()).optional(),
  brandSignals: z.array(z.string()).optional(),
  seasonFit: z.string().optional(),
});

export type ProductBrief = z.infer<typeof productBriefSchema>;

export const titleCandidateSchema = z.object({
  title: z.string(),
  hookType: z.string(),
  estimatedScore: z.number().min(0).max(100),
});

export type TitleCandidate = z.infer<typeof titleCandidateSchema>;

export const viralBriefSchema = z.object({
  hookFramework: z.enum(["AIDA", "PAS", "BAB", "SOCIAL_PROOF", "FOMO", "TRANSFORMATION"]),
  emotionalCore: z.string(),
  memoryPoint: z.string(),
  targetAudience: z.string(),
  keywordStrategy: z.array(z.string()).min(3).max(5),
  titleAngles: z.array(z.string()).min(3).max(5),
  titleCandidates: z.array(titleCandidateSchema).min(3).max(5).optional(),
  visualMood: z.string(),
  ctaStrategy: z.string(),
  contentFormat: z.enum(["单品种草", "对比测评", "合集清单", "开箱精选"]),
  avoidAngles: z.array(z.string()),
  psychologyAlignment: z.string().optional(),
});

export type ViralBrief = z.infer<typeof viralBriefSchema>;

export const playbookStepSchema = z.object({
  step: z.number().int().positive(),
  tool: z.string(),
  action: z.string(),
  detail: z.string(),
});

export type PlaybookStep = z.infer<typeof playbookStepSchema>;

/** 单镜分镜（豆包一次提示生成 1 张） */
export const doubaoShotSchema = z.object({
  frame: z.string(),
  shotSize: z.string(),
  camera: z.string(),
  composition: z.string(),
  lighting: z.string(),
  mood: z.string().optional(),
});

export type DoubaoShot = z.infer<typeof doubaoShotSchema>;

/** 得物信息流整帖图序（4-6 张竖图） */
export const dewuFeedFrameSchema = z.object({
  position: z.number().int().positive(),
  role: z.string(),
  variantId: z.string().optional(),
  shotSize: z.string(),
  note: z.string(),
});

export type DewuFeedFrame = z.infer<typeof dewuFeedFrameSchema>;

/** 一组豆包生图方案：热点 × 商品的不同视觉角度 + 分镜 */
export const doubaoPromptVariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  angle: z.string(),
  doubaoPromptZh: z.string(),
  postUse: z.string(),
  directorNotes: z.string(),
  shots: z.array(doubaoShotSchema).min(2).max(3),
});

export type DoubaoPromptVariant = z.infer<typeof doubaoPromptVariantSchema>;

export const visualPromptsSchema = z.object({
  doubaoPromptZh: z.string(),
  doubaoPromptVariants: z.array(doubaoPromptVariantSchema).min(3).max(4),
  dewuFeedStoryboard: z.array(dewuFeedFrameSchema).min(4).max(6),
  doubaoSop: z.array(playbookStepSchema).min(3).max(6),
  fluxEn: z.string(),
  bgRedrawZh: z.string(),
  creativeConcept: z.string(),
  moodKeywords: z.array(z.string()).min(3).max(8),
  shotList: z.array(z.string()).min(3).max(6),
  imagePlaybook: z.array(playbookStepSchema).min(4).max(10),
  coverTip: z.string(),
  avoidList: z.array(z.string()).min(2).max(6),
  psychologyVisualStrategy: z.string().optional(),
  doubaoNegativeZh: z.string().optional(),
});

export type VisualPrompts = z.infer<typeof visualPromptsSchema>;

export const criticScoresSchema = z.object({
  hook: z.number().min(0).max(100),
  emotion: z.number().min(0).max(100),
  platformFit: z.number().min(0).max(100),
  visualAlign: z.number().min(0).max(100),
  linkPresent: z.number().min(0).max(100).optional(),
  hashtagPresent: z.number().min(0).max(100).optional(),
  viralPotential: z.number().min(0).max(100).optional(),
  searchKeywordDensity: z.number().min(0).max(100).optional(),
  scrollStopPower: z.number().min(0).max(100).optional(),
  antiAiScore: z.number().min(0).max(100).optional(),
  structureCheck: z.number().min(0).max(100).optional(),
  complianceCheck: z.number().min(0).max(100).optional(),
});

export const viralityCompositeSchema = z.object({
  hookStrength: z.number().min(0).max(100),
  emotionalResonance: z.number().min(0).max(100),
  trendAlignment: z.number().min(0).max(100),
  noveltyFactor: z.number().min(0).max(100),
  timingFit: z.number().min(0).max(100),
  platformNative: z.number().min(0).max(100),
});

export type ViralityComposite = z.infer<typeof viralityCompositeSchema>;

/**
 * 代码校验结果（compliance-check / anti-ai-detect 等确定性模块），
 * 由服务端覆盖 LLM 自评的 complianceCheck / antiAiScore，
 * 避免"生成者给自己打分"导致合规与反 AI 味这两项形同虚设。
 */
export const deterministicCriticSchema = z.object({
  checkedBy: z.literal("code"),
  compliancePass: z.boolean(),
  complianceScore: z.number(),
  antiAiScore: z.number(),
  violations: z.array(
    z.object({
      word: z.string(),
      severity: z.enum(["high", "medium", "low"]),
      suggestion: z.string().optional(),
    })
  ),
  /** 文案里出现但用户原文中不存在的数字（疑似编造价格/参数），需人工确认 */
  fabricatedNumbers: z.array(z.string()),
  issues: z.array(z.string()),
});

export type DeterministicCritic = z.infer<typeof deterministicCriticSchema>;

export const criticReportSchema = z.object({
  scores: criticScoresSchema,
  mustFix: z.array(z.string()),
  deterministic: deterministicCriticSchema.optional(),
  revisedCopy: z.string().optional(),
  revisedFluxEn: z.string().optional(),
  revisedBgRedrawZh: z.string().optional(),
  viralityComposite: viralityCompositeSchema.optional(),
  round: z.number().int().positive().optional(),
  scoredHistory: z.array(criticScoresSchema).optional(),
});

export type CriticReport = z.infer<typeof criticReportSchema>;

export type PipelineStatus = "idle" | "running" | "done" | "error";

export type ForgeMode = "live" | "mock";

export type ForgeProgressStep = "vision" | "viralBrief" | "visual" | "copy" | "critic";

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type PipelineLogLevel = "info" | "success" | "warn" | "error";

export type PipelineLogEntry = {
  id: string;
  time: string;
  step?: ForgeProgressStep;
  message: string;
  level: PipelineLogLevel;
};

export type ForgeRunEvent =
  | { type: "progress"; step: ForgeProgressStep }
  | { type: "log"; step?: ForgeProgressStep; message: string; level?: PipelineLogLevel }
  | { type: "brief"; data: ProductBrief }
  | { type: "viralBrief"; data: ViralBrief }
  | { type: "prompts"; data: VisualPrompts; optimized?: boolean }
  | { type: "delta"; text: string }
  | { type: "critic"; data: CriticReport }
  | { type: "done" }
  | { type: "error"; message: string; step?: ForgeProgressStep; phase?: string };

export type ForgeState = {
  input: ForgeInput;
  productBrief?: ProductBrief | null;
  viralBrief?: ViralBrief | null;
  visual?: VisualPrompts;
  copyDraft?: string;
  critic?: CriticReport;
  copyFinal?: string;
  promptsOptimized?: boolean;
  creativeOutput?: CreativeOutput | null;
};

/**
 * 创意总监联合生成输出
 * 确保图文心理一致性：visual + copy 由同一次 LLM 调用产出
 */
export const creativeOutputSchema = z.object({
  visual: visualPromptsSchema,
  copyDraft: z.string(),
  sharedPsychologyNotes: z.string(),
  visualCopyAlignment: z.string().optional(),
});

export type CreativeOutput = z.infer<typeof creativeOutputSchema>;
