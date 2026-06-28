import {
  chatComplete,
  chatStream,
  chatWithImages,
  isLiveMode,
  mapDashScopeError,
} from "@/lib/ai/dashscope";
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

export type ProductScoutParams = {
  categoryHint: string;
  categoryLabel?: string;
  selectedTrend?: HotTrendCard | null;
  signal?: AbortSignal;
  forceRefresh?: boolean;
  discoveryMode?: IntelDiscoveryMode;
  autoScope?: IntelAutoScope;
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
): Promise<{ leads: HotProductLead[]; cached: boolean; searchedAt: string }> {
  const {
    categoryHint,
    categoryLabel,
    selectedTrend,
    signal,
    forceRefresh,
    discoveryMode = "manual",
    autoScope = "category",
  } = params;
  const trendId = selectedTrend?.id;

  if (forceRefresh) clearCachedLeads(categoryHint, trendId, discoveryMode, autoScope);

  const cached = getCachedLeads(categoryHint, trendId, discoveryMode, autoScope);
  if (cached) {
    return {
      leads: sortLeadsByPriority(cached),
      cached: true,
      searchedAt: new Date().toISOString(),
    };
  }

  if (!isLiveMode()) {
    await delay(800, signal);
    const leads = sortLeadsByPriority(mockProductLeads());
    setCachedLeads(leads, categoryHint, trendId, discoveryMode, autoScope);
    return { leads, cached: false, searchedAt: new Date().toISOString() };
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
      { json: true, search: true, signal, system: PRODUCT_SCOUT_SYSTEM }
    );
    const json = extractJson(raw) as
      | { leads?: HotProductLead[] }
      | HotProductLead[];
    const leads = sortLeadsByPriority(
      Array.isArray(json)
        ? json
        : productScoutResponseSchema.parse(json).leads
    );
    setCachedLeads(leads, categoryHint, trendId, discoveryMode, autoScope);
    return { leads, cached: false, searchedAt: new Date().toISOString() };
  } catch {
    const leads = sortLeadsByPriority(mockProductLeads());
    setCachedLeads(leads, categoryHint, trendId, discoveryMode, autoScope);
    return { leads, cached: false, searchedAt: new Date().toISOString() };
  }
}

export async function runTrendScan(
  platform: Platform,
  categoryHint?: string,
  signal?: AbortSignal,
  forceRefresh?: boolean,
  categoryLabel?: string,
  discoveryMode: IntelDiscoveryMode = "manual",
  autoScope: IntelAutoScope = "category"
): Promise<{ trends: HotTrendCard[]; cached: boolean; searchedAt: string }> {
  if (forceRefresh) clearCachedTrends(platform, categoryHint, discoveryMode, autoScope);

  const cached = getCachedTrends(platform, categoryHint, discoveryMode, autoScope);
  if (cached) {
    return { trends: cached, cached: true, searchedAt: new Date().toISOString() };
  }

  if (!isLiveMode()) {
    await delay(800, signal);
    const trends = mockHotTrends(platform);
    setCachedTrends(platform, trends, categoryHint, discoveryMode, autoScope);
    return { trends, cached: false, searchedAt: new Date().toISOString() };
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
      { json: true, search: true, signal, system: TREND_RADAR_SYSTEM }
    );
    const json = extractJson(raw) as { trends?: HotTrendCard[] } | HotTrendCard[];
    const trends = Array.isArray(json)
      ? json
      : hotTrendScanResponseSchema.parse(json).trends;
    setCachedTrends(platform, trends, categoryHint, discoveryMode, autoScope);
    return { trends, cached: false, searchedAt: new Date().toISOString() };
  } catch {
    const trends = mockHotTrends(platform);
    setCachedTrends(platform, trends, categoryHint, discoveryMode, autoScope);
    return { trends, cached: false, searchedAt: new Date().toISOString() };
  }
}

export async function runVision(
  imageDataUrls: string | string[],
  input?: ForgeInput,
  signal?: AbortSignal
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
    await delay(500, signal);
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
      { json: true, signal }
    );
    return productBriefSchema.parse(extractJson(raw));
  } catch (error) {
    throw new Error(mapDashScopeError(error));
  }
}

export async function runViralBrief(
  input: ForgeInput,
  brief?: ProductBrief | null,
  signal?: AbortSignal
): Promise<ViralBrief> {
  if (!isLiveMode()) {
    await delay(600, signal);
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
      { json: true, signal, system: VIRAL_PLANNER_SYSTEM }
    );
    const parsed = viralBriefSchema.parse(extractJson(raw));
    
    // 对标题候选进行评分排序
    if (parsed.titleCandidates && parsed.titleCandidates.length > 0) {
      parsed.titleCandidates = rankTitleCandidates(parsed.titleCandidates);
    }
    
    return parsed;
  } catch {
    // 策划失败不阻塞流水线，返回 mock 兜底
    return mockViralBrief(input);
  }
}

export async function runVisualPrompts(
  input: ForgeInput,
  brief?: ProductBrief | null,
  viralBrief?: ViralBrief | null,
  signal?: AbortSignal
): Promise<VisualPrompts> {
  if (!isLiveMode()) {
    await delay(700, signal);
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
      { json: true, signal, system: VISUAL_SYSTEM }
    );
    return normalizeVisualPrompts(
      extractJson(raw) as Record<string, unknown>
    );
  } catch (error) {
    throw new Error(mapDashScopeError(error));
  }
}

export async function runCopyDraft(
  input: ForgeInput,
  brief?: ProductBrief | null,
  prompts?: VisualPrompts | null,
  viralBrief?: ViralBrief | null,
  signal?: AbortSignal
): Promise<string> {
  if (!isLiveMode()) {
    await delay(600, signal);
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
      { signal, system: buildCopywriterSystem(input, viralBrief) }
    );
    return cleanCopyDraft(raw);
  } catch (error) {
    throw new Error(mapDashScopeError(error));
  }
}

export async function runCritic(
  input: ForgeInput,
  copyDraft: string,
  visual: VisualPrompts,
  brief?: ProductBrief | null,
  viralBrief?: ViralBrief | null,
  signal?: AbortSignal
): Promise<CriticReport> {
  if (!isLiveMode()) {
    await delay(500, signal);
    return {
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
  }

  try {
    const raw = await chatComplete(
      [
        {
          role: "user",
          content: buildCriticUserPrompt(input, copyDraft, visual, brief, viralBrief),
        },
      ],
      { json: true, signal, system: CRITIC_SYSTEM }
    );
    return criticReportSchema.parse(extractJson(raw));
  } catch (error) {
    throw new Error(mapDashScopeError(error));
  }
}

export async function* runCopyStream(
  input: ForgeInput,
  brief?: ProductBrief | null,
  prompts?: VisualPrompts | null,
  viralBrief?: ViralBrief | null,
  signal?: AbortSignal
): AsyncGenerator<string> {
  if (!isLiveMode()) {
    const text = mockCopyMarkdown(input);
    yield* mockCopyStream(text, signal);
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
      signal,
      buildCopywriterSystem(input, viralBrief)
    );
  } catch (error) {
    throw new Error(mapDashScopeError(error));
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
  signal?: AbortSignal
): Promise<ProductEnrichResponse> {
  if (!isLiveMode()) {
    await delay(400, signal);
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
    { json: true, signal, system: PRODUCT_ENRICH_SYSTEM }
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
  signal?: AbortSignal
): Promise<{ copyText?: string; titles?: string[] }> {
  if (!isLiveMode()) {
    await delay(400, signal);
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
    { json: true, signal, system: REMIX_SYSTEM }
  );
  const json = extractJson(raw) as {
    copyText?: string;
    titles?: string[];
  };
  return json;
}

export async function runEngage(
  params: { productName: string; affiliateLink?: string },
  signal?: AbortSignal
): Promise<{ templates: string[]; replyStrategies?: EngageReplyStrategy[] }> {
  if (!isLiveMode()) {
    await delay(300, signal);
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
    { json: true, signal, system: ENGAGE_SYSTEM }
  );
  const parsed = engageResponseSchema.parse(extractJson(raw));
  return {
    templates: parsed.templates,
    replyStrategies: parsed.replyStrategies,
  };
}
