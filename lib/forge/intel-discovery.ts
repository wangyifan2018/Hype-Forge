import type { WorkspaceCategory } from "@/lib/forge/local-store";
import { buildIntelSearchBase } from "@/lib/forge/infer-workspace";
import { CATEGORY_OPTIONS, categoryToTrendQuery } from "@/lib/forge/workspace-prefs";
import type { HotTrendCard, Platform } from "@/lib/forge/types";

/** 情报发现模式：自动全站探热点 vs 用户给线索后定向搜 */
export type IntelDiscoveryMode = "auto" | "manual";

/** 智能搜索范围：按主营品类略侧重 vs 全站跨平台不限品类 */
export type IntelAutoScope = "category" | "open";

export type IntelQueryOptions = {
  category: WorkspaceCategory;
  categoryLabel?: string;
  /** 仅 discoveryMode=auto 时生效 */
  autoScope?: IntelAutoScope;
  intelQuery?: string;
  productName?: string;
  referenceCopy?: string;
  trendTitle?: string;
};

export function hasManualIntelClue(input: {
  intelQuery?: string;
  productPaste?: string;
}): boolean {
  return (
    Boolean(input.intelQuery?.trim()) ||
    (input.productPaste?.replace(/\s/g, "").length ?? 0) >= 4
  );
}

function manualBaseQuery(opts: IntelQueryOptions): string {
  return buildIntelSearchBase({
    intelQuery: opts.intelQuery,
    productName: opts.productName,
    referenceCopy: opts.referenceCopy,
    trendTitle: opts.trendTitle,
    preferredCategory: opts.category,
  });
}

/** 自动模式：全站/跨品类探热点，不依赖用户线索 */
export function buildAutoTrendScanHint(
  opts: IntelQueryOptions & { platform: Platform }
): string {
  const year = new Date().getFullYear();
  const scope = opts.autoScope ?? "category";

  if (scope === "open") {
    return [
      "全网跨平台热点",
      "抖音热搜",
      "抖音种草话题",
      "抖音挑战",
      "小红书热搜",
      "小红书笔记趋势",
      "小红书爆款话题",
      "得物社区",
      "潮流电商",
      "全品类",
      "球鞋",
      "潮穿",
      "OOTD",
      "数码桌搭",
      "美妆护肤",
      "配饰",
      "新兴趋势",
      "低竞争机会",
      String(year),
    ].join(" ");
  }

  const platformLabel = opts.platform === "dewu" ? "得物" : "小红书";
  const soft =
    opts.categoryLabel && opts.category !== "custom"
      ? `可略侧重${opts.categoryLabel}，但须跨品类`
      : "全品类";

  return [
    platformLabel,
    "社区",
    "全站热搜",
    "新兴趋势",
    "爆款话题",
    "场景氛围",
    "拍照方向",
    "球鞋",
    "潮穿",
    "OOTD",
    "数码桌搭",
    "美妆护肤",
    "配饰",
    soft,
    "低竞争机会",
    String(year),
  ].join(" ");
}

/** 线索模式：围绕用户词/商品/主营品类 */
export function buildManualTrendScanHint(
  opts: IntelQueryOptions & { platform: Platform }
): string {
  const base = manualBaseQuery(opts);
  const categoryLabel =
    opts.categoryLabel ??
    CATEGORY_OPTIONS.find((c) => c.id === opts.category)?.label ??
    "潮流通用";
  const platformLabel = opts.platform === "dewu" ? "得物" : "小红书";

  return `${base} ${platformLabel} ${categoryLabel} 社区热搜 场景趋势 拍照氛围 话题 ${new Date().getFullYear()}`;
}

/** @deprecated 使用 buildManualTrendScanHint；保留兼容 */
export function buildTrendScanHint(
  opts: IntelQueryOptions & { platform: Platform }
): string {
  return buildManualTrendScanHint(opts);
}

/** 自动模式：跨品类爆款线索，场景仅作参考 */
export function buildAutoScoutHint(
  opts: IntelQueryOptions & { selectedTrend?: HotTrendCard | null }
): string {
  const year = new Date().getFullYear();
  const scope = opts.autoScope ?? "category";
  const trendBits = opts.selectedTrend
    ? [
        opts.selectedTrend.title,
        opts.selectedTrend.hookAngle,
        ...opts.selectedTrend.keywords,
      ]
    : [];

  if (scope === "open") {
    return [
      "得物",
      "社区爆款",
      "抖音带火单品",
      "小红书爆款",
      "跨平台热搜款",
      "全品类",
      "球鞋",
      "潮穿",
      "数码",
      "美妆",
      "配饰",
      ...trendBits,
      "新兴款",
      "低竞争",
      "具体型号",
      String(year),
    ]
      .filter(Boolean)
      .join(" ");
  }

  const soft =
    opts.categoryLabel && opts.category !== "custom"
      ? `略侧重${opts.categoryLabel}`
      : "";

  return [
    "得物",
    "社区",
    "全站爆款",
    "高热单品",
    "新兴款",
    "低竞争",
    "球鞋",
    "潮穿",
    "数码",
    "美妆",
    "跨品类",
    soft,
    ...trendBits,
    "热搜",
    "具体型号",
    String(year),
  ]
    .filter(Boolean)
    .join(" ");
}

/** 线索模式：紧扣线索与已选场景 */
export function buildManualScoutHint(
  opts: IntelQueryOptions & { selectedTrend?: HotTrendCard | null }
): string {
  const base = manualBaseQuery(opts);
  const categoryLabel =
    opts.categoryLabel ??
    CATEGORY_OPTIONS.find((c) => c.id === opts.category)?.label ??
    "潮流通用";

  if (opts.selectedTrend) {
    return [
      base,
      categoryLabel,
      "得物",
      opts.selectedTrend.title,
      opts.selectedTrend.hookAngle,
      ...opts.selectedTrend.keywords,
      "爆款单品",
      "具体款型",
      "配色",
      "热搜",
    ].join(" ");
  }

  return `${base} ${categoryLabel} 得物 爆款 单品 热搜款 具体型号 配色`;
}

/** @deprecated 使用 buildManualScoutHint */
export function buildScoutHint(
  opts: IntelQueryOptions & { selectedTrend?: HotTrendCard | null }
): string {
  return buildManualScoutHint(opts);
}

export function buildTrendScanHintForMode(
  mode: IntelDiscoveryMode,
  opts: IntelQueryOptions & { platform: Platform }
): string {
  return mode === "auto"
    ? buildAutoTrendScanHint(opts)
    : buildManualTrendScanHint(opts);
}

export function buildScoutHintForMode(
  mode: IntelDiscoveryMode,
  opts: IntelQueryOptions & { selectedTrend?: HotTrendCard | null }
): string {
  return mode === "auto"
    ? buildAutoScoutHint(opts)
    : buildManualScoutHint(opts);
}

/** 仅自动模式用的品类宽搜（无用户线索时） */
export function buildAutoCategoryWideQuery(category: WorkspaceCategory): string {
  return categoryToTrendQuery(category);
}
