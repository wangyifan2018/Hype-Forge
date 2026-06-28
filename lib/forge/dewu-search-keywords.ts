import type { HotProductLead, HotTrendCard } from "@/lib/forge/types";

export type DewuSearchKeywordInput = {
  trendContext: HotTrendCard | null;
  intelQuery?: string;
  categoryLabel?: string;
  activeLead?: HotProductLead | null;
};

/** 聚合得物 App 建议搜索词（去重，保序） */
export function aggregateDewuSearchKeywords(
  input: DewuSearchKeywordInput
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (raw: string | undefined) => {
    const t = raw?.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  const trend = input.trendContext;
  if (trend) {
    for (const k of trend.suggestedScoutKeywords ?? []) add(k);
    for (const k of trend.keywords ?? []) add(k);
  }

  if (input.intelQuery?.trim()) add(input.intelQuery.trim());

  if (input.categoryLabel?.trim()) add(input.categoryLabel.trim());

  if (input.activeLead) {
    for (const k of input.activeLead.searchKeywords) add(k);
  }

  return out;
}

export function formatKeywordsForCopy(keywords: string[]): string {
  return keywords.join(" ");
}
