import type { HotProductLead } from "@/lib/forge/types";

const TTL_MS = 30 * 60 * 1000;

type CacheEntry = {
  leads: HotProductLead[];
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(
  categoryHint?: string,
  trendId?: string,
  discoveryMode?: string,
  autoScope?: string
): string {
  const base = categoryHint?.trim() || "_default";
  const trend = trendId ? `::trend:${trendId}` : "";
  return `${base}${trend}:${discoveryMode || "manual"}:${autoScope || "category"}`;
}

export function getCachedLeads(
  categoryHint?: string,
  trendId?: string,
  discoveryMode?: string,
  autoScope?: string
): HotProductLead[] | null {
  const key = cacheKey(categoryHint, trendId, discoveryMode, autoScope);
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
  autoScope?: string
): void {
  cache.set(cacheKey(categoryHint, trendId, discoveryMode, autoScope), {
    leads,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function clearCachedLeads(
  categoryHint?: string,
  trendId?: string,
  discoveryMode?: string,
  autoScope?: string
): void {
  cache.delete(cacheKey(categoryHint, trendId, discoveryMode, autoScope));
}
