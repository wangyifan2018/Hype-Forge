import {
  chatComplete,
  chatStream,
  chatWithImages,
  isLiveMode,
  mapLlmError,
  resolveRequestModel,
} from "@/lib/ai/llm";
import {
  buildCopywriterSystem,
  buildCopywriterUserPrompt,
} from "@/lib/ai/prompts/copywriter";
import {
  buildCriticUserPrompt,
  CRITIC_SYSTEM,
} from "@/lib/ai/prompts/critic";
import {
  buildEngageUserPrompt,
  ENGAGE_SYSTEM,
} from "@/lib/ai/prompts/engage";
import {
  buildProductEnrichUserPrompt,
  PRODUCT_ENRICH_SYSTEM,
} from "@/lib/ai/prompts/product-enrich";
import {
  buildProductScoutUserPrompt,
  PRODUCT_SCOUT_SYSTEM,
} from "@/lib/ai/prompts/product-scout";
import { buildRemixUserPrompt, REMIX_SYSTEM } from "@/lib/ai/prompts/remix";
import {
  buildTrendRadarUserPrompt,
  TREND_RADAR_SYSTEM,
} from "@/lib/ai/prompts/trend-radar";
import {
  clearCachedLeads,
  getCachedLeads,
  setCachedLeads,
} from "@/lib/forge/product-scout-cache";
import {
  buildVisionUserPrompt,
  VISION_SYSTEM,
} from "@/lib/ai/prompts/vision";
import { VISUAL_SYSTEM, buildVisualUserPrompt } from "@/lib/ai/prompts/visual";
import {
  buildViralPlannerUserPrompt,
  VIRAL_PLANNER_SYSTEM,
} from "@/lib/ai/prompts/viral-planner";
import { extractJson } from "@/lib/forge/parse-json";
import { applyGateToCritic, runQualityGate } from "@/lib/forge/quality-gate";
import { normalizeVisualPrompts } from "@/lib/forge/visual-normalize";
import { rankTitleCandidates } from "@/lib/forge/title-scorer";
import { cleanCopyDraft } from "@/lib/forge/clean-copy";
import {
  extractMeaningfulKeywords,
} from "@/lib/forge/keyword-extractor";
import {
  clearCachedTrends,
  getCachedTrends,
  setCachedTrends,
} from "@/lib/forge/trend-cache";
import {
  mockCopyMarkdown,
  mockCopyStream,
  mockHotTrends,
  mockProductBrief,
  mockProductLeads,
  mockViralBrief,
  mockVisualPrompts,
  delay,
} from "@/lib/forge/mock";
import type {
  CriticReport,
  ForgeInput,
  HotProductLead,
  HotTrendCard,
  Platform,
  ProductBrief,
  ProductEnrichResponse,
  RemixType,
  ViralBrief,
  VisualPrompts,
  EngageReplyStrategy,
} from "@/lib/forge/types";
import {
  criticReportSchema,
  engageResponseSchema,
  hotTrendScanResponseSchema,
  productBriefSchema,
  productEnrichResponseSchema,
  productScoutResponseSchema,
  viralBriefSchema,
} from "@/lib/forge/types";

import type {
  IntelAutoScope,
  IntelDiscoveryMode,
} from "@/lib/forge/intel-discovery";

/** 服务层通用调用选项：模型由 UI 选择后随请求下发 */
export type RunOptions = {
  signal?: AbortSignal;
  model?: string;
};

/** 情报类接口返回的降级元信息：fallback=true 表示当前是示例数据，非真实联网情报 */
export type IntelFallbackMeta = {
  cached: boolean;
  searchedAt: string;
  fallback?: boolean;
  fallbackReason?: string;
};

export type ProductScoutParams = {
  categoryHint: string;
  categoryLabel?: string;
  selectedTrend?: HotTrendCard | null;
  signal?: AbortSignal;
  forceRefresh?: boolean;
  discoveryMode?: IntelDiscoveryMode;
  autoScope?: IntelAutoScope;
  model?: string;
};

export type TrendScanParams = {
  platform: Platform;
  categoryHint?: string;
  categoryLabel?: string;
  signal?: AbortSignal;
  forceRefresh?: boolean;
  discoveryMode?: IntelDiscoveryMode;
  autoScope?: IntelAutoScope;
  model?: string;
};

function sortLeadsByPriority(leads: HotProductLead[]): HotProductLead[] {
  const priorityScore = { high: 100, medium: 50, low: 0 };
  return [...leads].sort((a, b) => {
    const pa = a.priority ? priorityScore[a.priority] : 50;
    const pb = b.priority ? priorityScore[b.priority] : 50;
    const va = a.viralPotential ?? 0;
    const vb = b.viralPotential ?? 0;
    const scoreA = pa * 0.4 + a.heatScore * 0.3 + va * 0.3;
    const scoreB = pb * 0.4 + b.heatScore * 0.3 + vb * 0.3;
    return scoreB - scoreA;
  });
}

export async function runProductScout(
  params: ProductScoutParams
): Promise<{ leads: HotProductLead[] } & IntelFallbackMeta> {
  const {
    categoryHint,
    categoryLabel,
    selectedTrend,
    signal,
    forceRefresh,
    discoveryMode = "manual",
    autoScope = "category",
    model,
  } = params;
  const trendId = selectedTrend?.id;
  // 缓存按「有效模型」隔离：切模型后结论会变，不能吃旧模型的缓存
  const effectiveModel = resolveRequestModel(model);

  // MOCK 模式不读写情报缓存：示例数据不该占用真实情报的缓存位
  if (!isLiveMode()) {
    await delay(800, signal);
    return {
      leads: sortLeadsByPriority(mockProductLeads()),
      cached: false,
      searchedAt: new Date().toISOString(),
    };
  }

  if (forceRefresh) {
    clearCachedLeads(categoryHint, trendId, discoveryMode, autoScope, effectiveModel);
  }

  const cached = getCachedLeads(
    categoryHint,
    trendId,
    discoveryMode,
    autoScope,
    effectiveModel
  );
  if (cached) {
    return {
      leads: sortLeadsByPriority(cached),
      cached: true,
      searchedAt: new Date().toISOString(),
    };
  }

  try {
    const raw = await chatComplete(
      [
        {
          role: "user",
          content: buildProductScoutUserPrompt(categoryHint, {
            categoryLabel,
            selectedTrend,
            discoveryMode,
            autoScope,
          }),
        },
      ],
      { search: true, signal, system: PRODUCT_SCOUT_SYSTEM, model }
    );
    const json = extractJson(raw) as
      | { leads?: HotProductLead[] }
      | HotProductLead[];
    const leads = sortLeadsByPriority(
      Array.isArray(json)
        ? json
        : productScoutResponseSchema.parse(json).leads
    );
    setCachedLeads(leads, categoryHint, trendId, discoveryMode, autoScope, effectiveModel);
    return { leads, cached: false, searchedAt: new Date().toISOString() };
  } catch (error) {
    const reason = mapLlmError(error);
    console.warn(
      `[forge/intel] 爆款情报联网搜索失败，降级为示例数据：${reason}`
    );
    const leads = sortLeadsByPriority(mockProductLeads());
    // 不写入缓存：避免一次瞬时故障把示例数据缓存住，让恢复后的扫描继续拿到 mock
    return {
      leads,
      cached: false,
      searchedAt: new Date().toISOString(),
      fallback: true,
      fallbackReason: reason,
    };
  }
}

export async function runTrendScan(
  params: TrendScanParams
): Promise<{ trends: HotTrendCard[] } & IntelFallbackMeta> {
  const {
    platform,
    categoryHint,
    categoryLabel,
    signal,
    forceRefresh,
    discoveryMode = "manual",
    autoScope = "category",
    model,
  } = params;

  // 缓存按「有效模型」隔离：切模型后结论会变，不能吃旧模型的缓存
  const effectiveModel = resolveRequestModel(model);

  // MOCK 模式不读写情报缓存：示例数据不该占用真实情报的缓存位
  if (!isLiveMode()) {
    await delay(800, signal);
    return {
      trends: mockHotTrends(platform),
      cached: false,
      searchedAt: new Date().toISOString(),
    };
  }

  if (forceRefresh) {
    clearCachedTrends(platform, categoryHint, discoveryMode, autoScope, effectiveModel);
  }

  const cached = getCachedTrends(
    platform,
    categoryHint,
    discoveryMode,
    autoScope,
    effectiveModel
  );
  if (cached) {
    return { trends: cached, cached: true, searchedAt: new Date().toISOString() };
  }

  try {
    const raw = await chatComplete(
      [
        {
          role: "user",
          content: buildTrendRadarUserPrompt(
            platform,
            categoryHint,
            categoryLabel,
            discoveryMode,
            autoScope
          ),
        },
      ],
      { search: true, signal, system: TREND_RADAR_SYSTEM, model }
    );
    const json = extractJson(raw) as { trends?: HotTrendCard[] } | HotTrendCard[];
    const trends = Array.isArray(json)
      ? json
      : hotTrendScanResponseSchema.parse(json).trends;
    setCachedTrends(platform, trends, categoryHint, discoveryMode, autoScope, effectiveModel);
    return { trends, cached: false, searchedAt: new Date().toISOString() };
  } catch (error) {
    const reason = mapLlmError(error);
    console.warn(
      `[forge/intel] 热点雷达联网搜索失败，降级为示例数据：${reason}`
    );
    const trends = mockHotTrends(platform);
    // 不写入缓存：避免一次瞬时故障把示例数据缓存住，让恢复后的扫描继续拿到 mock
    return {
      trends,
      cached: false,
      searchedAt: new Date().toISOString(),
      fallback: true,
      fallbackReason: reason,
    };
  }
}

export async function runVision(
  imageDataUrls: string | string[],
  input?: ForgeInput,
  options?: RunOptions
): Promise<ProductBrief> {
  const urls = (
    Array.isArray(imageDataUrls) ? imageDataUrls : [imageDataUrls]
  ).filter((u) => u.trim().length > 0);

  const fallbackInput: ForgeInput = input ?? {
    trendId: "worldcup-2026",
    productName: "商品",
    sellingPoints: "",
    platform: "xiaohongshu",
  };

  if (!urls.length) {
    return mockProductBrief(fallbackInput);
  }

  if (!isLiveMode()) {
    await delay(500, options?.signal);
    return mockProductBrief(fallbackInput);
  }

  // Extract keywords from input text to guide vision analysis
  const textForKeywords = [
    fallbackInput.productName,
    fallbackInput.sellingPoints,
    fallbackInput.trendContext?.title,
    fallbackInput.trendContext?.keywords?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const keywords = extractMeaningfulKeywords(textForKeywords, 5);

  try {
    const raw = await chatWithImages(
      `${VISION_SYSTEM}\n\n${buildVisionUserPrompt(urls.length, keywords)}`,
      urls,
      { signal: options?.signal, model: options?.model }
    );

    let json: unknown;
    try {
      json = extractJson(raw);
    } catch {
      throw new Error("识图返回内容不是合法 JSON，可重试或换更清晰的主图");
    }

    const parsed = productBriefSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("识图返回结构不符合契约，可重试或换更清晰的主图");
    }
    return parsed.data;
  } catch (error) {
    throw new Error(mapLlmError(error));
  }
}

export async function runViralBrief(
  input: ForgeInput,
  brief?: ProductBrief | null,
  options?: RunOptions
): Promise<ViralBrief> {
  if (!isLiveMode()) {
    await delay(600, options?.signal);
    return mockViralBrief(input);
  }

  try {
    const raw = await chatComplete(
      [
        {
          role: "user",
          content: buildViralPlannerUserPrompt(input, brief),
        },
      ],
      { signal: options?.signal, system: VIRAL_PLANNER_SYSTEM, model: options?.model }
    );
    const parsed = viralBriefSchema.parse(extractJson(raw));
    
    // 对标题候选进行评分排序
    if (parsed.titleCandidates && parsed.titleCandidates.length > 0) {
      parsed.titleCandidates = rankTitleCandidates(parsed.titleCandidates);
    }
    
    return parsed;
  } catch (error) {
    // 策划失败不阻塞流水线，返回 mock 兜底（显式告警，便于区分"用了兜底"与"真出结果"）
    console.warn(
      `[forge/pipeline] 爆款策划失败，使用兜底简报：${mapLlmError(error)}`
    );
    return mockViralBrief(input);
  }
}

export async function runVisualPrompts(
  input: ForgeInput,
  brief?: ProductBrief | null,
  viralBrief?: ViralBrief | null,
  options?: RunOptions
): Promise<VisualPrompts> {
  if (!isLiveMode()) {
    await delay(700, options?.signal);
    return normalizeVisualPrompts(
      mockVisualPrompts(input, brief) as unknown as Record<string, unknown>
    );
  }

  try {
    const raw = await chatComplete(
      [
        {
          role: "user",
          content: buildVisualUserPrompt(input, brief, viralBrief),
        },
      ],
      { signal: options?.signal, system: VISUAL_SYSTEM, model: options?.model }
    );
    return normalizeVisualPrompts(
      extractJson(raw) as Record<string, unknown>
    );
  } catch (error) {
    throw new Error(mapLlmError(error));
  }
}

export async function runCopyDraft(
  input: ForgeInput,
  brief?: ProductBrief | null,
  prompts?: VisualPrompts | null,
  viralBrief?: ViralBrief | null,
  options?: RunOptions
): Promise<string> {
  if (!isLiveMode()) {
    await delay(600, options?.signal);
    return mockCopyMarkdown(input);
  }

  try {
    const raw = await chatComplete(
      [
        {
          role: "user",
          content: buildCopywriterUserPrompt(input, brief, prompts, viralBrief),
        },
      ],
      {
        signal: options?.signal,
        system: buildCopywriterSystem(input, viralBrief),
        model: options?.model,
      }
    );
    return cleanCopyDraft(raw);
  } catch (error) {
    throw new Error(mapLlmError(error));
  }
}

/**
 * 对指定文案跑确定性质量门。
 * 传入用户原文用于「数字事实核对」：文案里出现的数字必须能在原文中找到。
 */
export function runQualityGateFor(
  input: ForgeInput,
  copyDraft: string
): ReturnType<typeof runQualityGate> {
  const sourceText = [input.productName, input.sellingPoints, input.referenceCopy]
    .filter(Boolean)
    .join("\n");
  return runQualityGate(copyDraft, { sourceText });
}

export async function runCritic(
  input: ForgeInput,
  copyDraft: string,
  visual: VisualPrompts,
  brief?: ProductBrief | null,
  viralBrief?: ViralBrief | null,
  options?: RunOptions
): Promise<CriticReport> {
  if (!isLiveMode()) {
    await delay(500, options?.signal);
    const mockReport: CriticReport = {
      scores: {
        hook: 85,
        emotion: 88,
        platformFit: 90,
        visualAlign: 86,
        hashtagPresent: 88,
        viralPotential: 84,
        searchKeywordDensity: 82,
        scrollStopPower: 86,
        antiAiScore: 82,
        structureCheck: 88,
        complianceCheck: 100,
        ...(input.platform === "xiaohongshu"
          ? { linkPresent: 80 }
          : {}),
      },
      mustFix: [],
      viralityComposite: {
        hookStrength: 82,
        emotionalResonance: 86,
        trendAlignment: 80,
        noveltyFactor: 78,
        timingFit: 75,
        platformNative: 88,
      },
    };
    return applyGateToCritic(mockReport, runQualityGateFor(input, copyDraft));
  }

  try {
    const raw = await chatComplete(
      [
        {
          role: "user",
          content: buildCriticUserPrompt(input, copyDraft, visual, brief, viralBrief),
        },
      ],
      { signal: options?.signal, system: CRITIC_SYSTEM, model: options?.model }
    );
    const report = criticReportSchema.parse(extractJson(raw));
    // 合规 / 去 AI 味 / 真实感 / 数字事实核对一律以代码结论为准，覆盖 LLM 自评
    return applyGateToCritic(report, runQualityGateFor(input, copyDraft));
  } catch (error) {
    throw new Error(mapLlmError(error));
  }
}

export async function* runCopyStream(
  input: ForgeInput,
  brief?: ProductBrief | null,
  prompts?: VisualPrompts | null,
  viralBrief?: ViralBrief | null,
  options?: RunOptions
): AsyncGenerator<string> {
  if (!isLiveMode()) {
    const text = mockCopyMarkdown(input);
    yield* mockCopyStream(text, options?.signal);
    return;
  }

  try {
    yield* chatStream(
      [
        {
          role: "user",
          content: buildCopywriterUserPrompt(input, brief, prompts, viralBrief),
        },
      ],
      {
        signal: options?.signal,
        system: buildCopywriterSystem(input, viralBrief),
        model: options?.model,
      }
    );
  } catch (error) {
    throw new Error(mapLlmError(error));
  }
}

export async function* streamTextChunks(
  text: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  yield* mockCopyStream(text, signal);
}

export async function runProductEnrich(
  params: {
    productName: string;
    category?: string;
    creativeHooks?: string[];
    referenceCopy?: string;
  },
  options?: RunOptions
): Promise<ProductEnrichResponse> {
  if (!isLiveMode()) {
    await delay(400, options?.signal);
    return {
      sellingPoints: `${params.productName}：质感在线，百搭好搭，得物入手靠谱。`,
      styleTags: ["酷感直给"],
      searchKeywords: [params.productName.slice(0, 12)],
    };
  }

  const raw = await chatComplete(
    [
      { role: "user", content: buildProductEnrichUserPrompt(params) },
    ],
    { signal: options?.signal, system: PRODUCT_ENRICH_SYSTEM, model: options?.model }
  );
  return productEnrichResponseSchema.parse(extractJson(raw));
}

export async function runRemix(
  params: {
    remixType: RemixType;
    copyText: string;
    input: ForgeInput;
    creativeConcept?: string;
    angle?: string;
  },
  options?: RunOptions
): Promise<{ copyText?: string; titles?: string[] }> {
  if (!isLiveMode()) {
    await delay(400, options?.signal);
    if (params.remixType === "regenerate_titles") {
      return {
        titles: [
          `${params.input.productName}｜上脚太顶了`,
          `得物好物｜${params.input.productName}`,
          `${params.input.productName} 真实体验`,
        ],
      };
    }
    return { copyText: params.copyText };
  }

  const raw = await chatComplete(
    [
      { role: "user", content: buildRemixUserPrompt(params) },
    ],
    { signal: options?.signal, system: REMIX_SYSTEM, model: options?.model }
  );
  const json = extractJson(raw) as {
    copyText?: string;
    titles?: string[];
  };
  return json;
}

export async function runEngage(
  params: { productName: string; affiliateLink?: string },
  options?: RunOptions
): Promise<{ templates: string[]; replyStrategies?: EngageReplyStrategy[] }> {
  if (!isLiveMode()) {
    await delay(300, options?.signal);
    return {
      templates: [
        "链接在文末好物区，点开就能看～",
        "已放好物链接，需要的我私信你",
        "这款我也在穿，详情见帖子底部链接",
      ],
      replyStrategies: [
        {
          trigger: "求链接/哪里买",
          reply: "好物链接在帖子底部，点开就能看同款～",
          psychology: "互惠",
        },
        {
          trigger: "问尺码",
          reply: "我按平时码买的，偏码可以私信我对一下～",
          psychology: "权威",
        },
        {
          trigger: "夸好看",
          reply: "谢谢！这款最近挺火的，想要抓紧去主页链接看看",
          psychology: "社交认证",
        },
      ],
    };
  }

  const raw = await chatComplete(
    [
      {
        role: "user",
        content: buildEngageUserPrompt({
          productName: params.productName,
          hasAffiliateLink: Boolean(params.affiliateLink?.trim()),
        }),
      },
    ],
    { signal: options?.signal, system: ENGAGE_SYSTEM, model: options?.model }
  );
  const parsed = engageResponseSchema.parse(extractJson(raw));
  return {
    templates: parsed.templates,
    replyStrategies: parsed.replyStrategies,
  };
}
