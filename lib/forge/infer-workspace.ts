import type { ContentStyle, WorkspaceCategory } from "@/lib/forge/local-store";
import {
  categoryToTrendQuery,
  getCategoryLabel,
  styleToTags,
} from "@/lib/forge/workspace-prefs";

export type InferredWorkspace = {
  category: WorkspaceCategory;
  categoryLabel: string;
  style: ContentStyle;
  styleTags: string[];
};

const CATEGORY_RULES: { id: WorkspaceCategory; pattern: RegExp }[] = [
  {
    id: "sneaker",
    pattern: /球鞋|运动鞋|跑鞋|篮球鞋|板鞋|AJ|Dunk|Yeezy|Jordan|气垫|上脚/i,
  },
  {
    id: "streetwear",
    pattern: /潮穿|OOTD|外套|卫衣|冲锋衣|裤装|穿搭|街拍|层叠|帽衫/i,
  },
  {
    id: "3c",
    pattern: /键盘|桌搭|数码|耳机|显示器|鼠标|客制|RGB|3C|充电|音箱/i,
  },
  {
    id: "beauty",
    pattern: /美妆|护肤|彩妆|口红|粉底|精华|面膜|香水|防晒/i,
  },
];

const STYLE_RULES: { id: ContentStyle; patterns: RegExp }[] = [
  { id: "review", patterns: /测评|对比|实测|优缺点|值不值/i },
  { id: "compare", patterns: /闺蜜|安利|姐妹|种草清单/i },
  { id: "minimal", patterns: /极简|高级|少废话|冷淡风/i },
];

function scoreCategory(
  text: string,
  preferredCategory: WorkspaceCategory = "streetwear"
): WorkspaceCategory {
  const scores = new Map<WorkspaceCategory, number>();
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) {
      scores.set(rule.id, (scores.get(rule.id) ?? 0) + 1);
    }
  }
  let best: WorkspaceCategory = preferredCategory;
  let max = 0;
  for (const [id, n] of Array.from(scores.entries())) {
    if (n > max) {
      max = n;
      best = id;
    }
  }
  if (max === 0 && /得物|潮|穿|搭/.test(text)) return "streetwear";
  return best;
}

function inferStyle(text: string): ContentStyle {
  for (const rule of STYLE_RULES) {
    if (rule.patterns.test(text)) return rule.id;
  }
  return "cool";
}

/** 从情报词、商品信息、参考文案、趋势自动推断品类与文案风格 */
export function inferWorkspaceContext(input: {
  intelQuery?: string;
  productName?: string;
  sellingPoints?: string;
  referenceCopy?: string;
  trendTitle?: string;
  /** 无文本信号时作为默认品类（来自工作区设置） */
  preferredCategory?: WorkspaceCategory;
}): InferredWorkspace {
  const blob = [
    input.intelQuery,
    input.productName,
    input.sellingPoints,
    input.referenceCopy,
    input.trendTitle,
  ]
    .filter(Boolean)
    .join(" ");

  const category = scoreCategory(blob, input.preferredCategory ?? "streetwear");
  const style = inferStyle(blob);

  return {
    category,
    categoryLabel: getCategoryLabel(category),
    style,
    styleTags: styleToTags(style),
  };
}

/** 情报 Scan/爆款 用的搜索基底（无需用户选手动品类） */
export function buildIntelSearchBase(input: {
  intelQuery?: string;
  productName?: string;
  referenceCopy?: string;
  trendTitle?: string;
  preferredCategory?: WorkspaceCategory;
}): string {
  if (input.intelQuery?.trim()) {
    return input.intelQuery.trim();
  }
  const custom =
    input.productName?.trim() ||
    input.referenceCopy?.trim().slice(0, 80) ||
    undefined;
  const { category } = inferWorkspaceContext(input);
  return categoryToTrendQuery(category, custom);
}
