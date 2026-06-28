import { z } from "zod";
import { hotProductLeadSchema } from "@/lib/forge/types";

export const STORE_VERSION = "forgeStoreV1";

export const picklistStatusSchema = z.enum([
  "idea",
  "verified",
  "producing",
  "posted",
]);

export type PicklistStatus = z.infer<typeof picklistStatusSchema>;

export const workspaceCategorySchema = z.enum([
  "sneaker",
  "streetwear",
  "3c",
  "beauty",
  "custom",
]);

export type WorkspaceCategory = z.infer<typeof workspaceCategorySchema>;

export const contentStyleSchema = z.enum([
  "cool",
  "review",
  "compare",
  "minimal",
]);

export type ContentStyle = z.infer<typeof contentStyleSchema>;

export const workspacePrefsSchema = z.object({
  category: workspaceCategorySchema.default("streetwear"),
  defaultStyle: contentStyleSchema.default("cool"),
  trendQueryOverride: z.string().optional(),
  /** 情报扫描专用搜索词（如「AJ1 北卡蓝」「桌搭键盘」） */
  intelQuery: z.string().optional(),
  /** auto=全站自探热点/爆款；manual=须先有线索再搜 */
  intelDiscoveryMode: z.enum(["auto", "manual"]).default("auto"),
  /** 智能搜索：category=略侧重主营品类；open=全站跨平台（含抖音/小红书） */
  intelAutoScope: z.enum(["category", "open"]).default("category"),
});

export type WorkspacePrefs = z.infer<typeof workspacePrefsSchema>;

export const picklistItemSchema = z.object({
  id: z.string(),
  leadSnapshot: hotProductLeadSchema,
  status: picklistStatusSchema,
  productName: z.string().optional(),
  sellingPoints: z.string().optional(),
  dewuProductUrl: z.string().optional(),
  affiliateLink: z.string().optional(),
  referenceCopy: z.string().optional(),
  verifyChecked: z.record(z.string(), z.boolean()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastRunId: z.string().optional(),
});

export type PicklistItem = z.infer<typeof picklistItemSchema>;

export const engagementMetricsSchema = z.object({
  likes: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
  saves: z.number().int().min(0).default(0),
  views: z.number().int().min(0).default(0),
  recordedAt: z.string().optional(),
});

export type EngagementMetrics = z.infer<typeof engagementMetricsSchema>;

export const postedRecordSchema = z.object({
  id: z.string(),
  productName: z.string(),
  affiliateLink: z.string().optional(),
  copySnippet: z.string().optional(),
  postedAt: z.string(),
  notes: z.string().optional(),
  picklistId: z.string().optional(),
  // 新增：发布后数据追踪
  platform: z.enum(["dewu", "xiaohongshu"]).optional(),
  postUrl: z.string().optional(),
  title: z.string().optional(),
  hookFramework: z.string().optional(),
  // 新增：互动数据
  engagement: engagementMetricsSchema.optional(),
  // 新增：是否标记为爆款
  isHit: z.boolean().default(false),
});

export type PostedRecord = z.infer<typeof postedRecordSchema>;

export const publishChecklistStateSchema = z.object({
  itemIds: z.record(z.string(), z.boolean()).default({}),
});

export type PublishChecklistState = z.infer<
  typeof publishChecklistStateSchema
>;

export const forgeStoreSchema = z.object({
  version: z.literal(STORE_VERSION),
  prefs: workspacePrefsSchema,
  picklist: z.array(picklistItemSchema),
  posted: z.array(postedRecordSchema),
  publishChecklist: publishChecklistStateSchema.optional(),
  engageTemplates: z.array(z.string()).optional(),
});

export type ForgeStore = z.infer<typeof forgeStoreSchema>;

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
