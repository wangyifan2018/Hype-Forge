import type { ContentStyle, WorkspaceCategory } from "@/lib/forge/local-store";

export const CATEGORY_OPTIONS: {
  id: WorkspaceCategory;
  label: string;
  trendQuery: string;
}[] = [
  {
    id: "sneaker",
    label: "球鞋",
    trendQuery: "得物 热门球鞋 爆款 上脚 穿搭",
  },
  {
    id: "streetwear",
    label: "潮穿",
    trendQuery: "得物 潮穿 OOTD 层叠 街拍",
  },
  {
    id: "3c",
    label: "数码桌搭",
    trendQuery: "得物 数码桌搭 客制键盘 好物",
  },
  {
    id: "beauty",
    label: "美妆",
    trendQuery: "得物 美妆 护肤 彩妆 种草",
  },
  {
    id: "custom",
    label: "自定义",
    trendQuery: "",
  },
];

export const STYLE_OPTIONS: {
  id: ContentStyle;
  label: string;
  styleTag: string;
}[] = [
  { id: "cool", label: "酷感直给", styleTag: "酷感直给、有态度" },
  { id: "review", label: "测评对比", styleTag: "真实测评、对比体验" },
  { id: "compare", label: "闺蜜安利", styleTag: "闺蜜安利、真实体验" },
  { id: "minimal", label: "极简高级", styleTag: "极简高级、少废话" },
];

export function getCategoryLabel(category: WorkspaceCategory): string {
  return CATEGORY_OPTIONS.find((c) => c.id === category)?.label ?? "潮流通用";
}

export function categoryToTrendQuery(
  category: WorkspaceCategory,
  override?: string
): string {
  if (category === "custom" && override?.trim()) return override.trim();
  const found = CATEGORY_OPTIONS.find((c) => c.id === category);
  return (
    override?.trim() ||
    found?.trendQuery ||
    process.env.NEXT_PUBLIC_FORGE_TREND_QUERY ||
    "得物 热门球鞋 潮穿 爆款 热搜"
  );
}

export function styleToTags(style: ContentStyle): string[] {
  const found = STYLE_OPTIONS.find((s) => s.id === style);
  return found ? [found.styleTag] : [];
}

export const PICKLIST_STATUS_LABELS: Record<
  import("@/lib/forge/local-store").PicklistStatus,
  string
> = {
  idea: "待验证",
  verified: "已选品",
  producing: "制作中",
  posted: "已发帖",
};

export const PUBLISH_CHECKLIST_ITEMS = [
  { id: "images", label: "主图至少 3 张（封面+细节+场景）" },
  { id: "affiliate", label: "发帖时已自行粘贴好物链接" },
  { id: "link_click", label: "自己点击好物链接确认可打开" },
  { id: "topics", label: "话题标签已复制进发帖正文" },
  { id: "posted", label: "已在得物社区发布" },
] as const;
