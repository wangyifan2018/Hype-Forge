import type { HotProductLead } from "@/lib/forge/types";

const TTL_MS = 30 * 60 * 1000;

type CacheEntry = {
  leads: HotProductLead[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * 缓存 key 必须包含模型：切换模型后情报结论会变，
 * 否则用户切了模型仍在 30 分钟内吃旧模型的结果。
 */
function cacheKey(
  categoryHint?: string,
  trendId?: string,
  discoveryMode?: string,
  autoScope?: string,
  model?: string
): string {
  const base = categoryHint?.trim() || "_default";
  const trend = trendId ? `::trend:${trendId}` : "";
  return `${base}${trend}:${discoveryMode || "manual"}:${autoScope || "category"}:${model || "default"}`;
}

export function getCachedLeads(
  categoryHint?: string,
  trendId?: string,
  discoveryMode?: string,
  autoScope?: string,
  model?: string
): HotProductLead[] | null {
  const key = cacheKey(categoryHint, trendId, discoveryMode, autoScope, model);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.leads;
}

export function setCachedLeads(
  leads: HotProductLead[],
  categoryHint?: string,
  trendId?: string,
  discoveryMode?: string,
  autoScope?: string,
  model?: string
): void {
  cache.set(cacheKey(categoryHint, trendId, discoveryMode, autoScope, model), {
    leads,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function clearCachedLeads(
  categoryHint?: string,
  trendId?: string,
  discoveryMode?: string,
  autoScope?: string,
  model?: string
): void {
  cache.delete(cacheKey(categoryHint, trendId, discoveryMode, autoScope, model));
}
