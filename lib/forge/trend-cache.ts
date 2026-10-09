import type { HotTrendCard } from "@/lib/forge/types";
import type { Platform } from "@/lib/forge/types";

const TTL_MS = 30 * 60 * 1000;

type CacheEntry = {
  trends: HotTrendCard[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * 缓存 key 必须包含模型：切换模型后情报结论会变，
 * 否则用户切了模型仍在 30 分钟内吃旧模型的结果。
 */
function cacheKey(
  platform: Platform,
  categoryHint?: string,
  discoveryMode?: string,
  autoScope?: string,
  model?: string
): string {
  return `${platform}:${categoryHint?.trim() || "_default"}:${discoveryMode || "auto"}:${autoScope || "open"}:${model || "default"}`;
}

export function getCachedTrends(
  platform: Platform,
  categoryHint?: string,
  discoveryMode?: string,
  autoScope?: string,
  model?: string
): HotTrendCard[] | null {
  const key = cacheKey(platform, categoryHint, discoveryMode, autoScope, model);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.trends;
}

export function setCachedTrends(
  platform: Platform,
  trends: HotTrendCard[],
  categoryHint?: string,
  discoveryMode?: string,
  autoScope?: string,
  model?: string
): void {
  const key = cacheKey(platform, categoryHint, discoveryMode, autoScope, model);
  cache.set(key, {
    trends,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function clearCachedTrends(
  platform: Platform,
  categoryHint?: string,
  discoveryMode?: string,
  autoScope?: string,
  model?: string
): void {
  cache.delete(cacheKey(platform, categoryHint, discoveryMode, autoScope, model));
}
