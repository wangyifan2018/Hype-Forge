import type { ForgeInput, HotTrendCard } from "@/lib/forge/types";
import { getTrendById } from "@/lib/forge/trends";

export type ResolvedTrend = {
  label: string;
  sceneEn: string;
  sceneZh: string;
  hookAngle?: string;
  keywords?: string[];
};

export function resolveTrend(input: ForgeInput): ResolvedTrend {
  const ctx = input.trendContext;
  if (ctx) {
    return {
      label: ctx.title,
      sceneEn: ctx.sceneEn,
      sceneZh: ctx.sceneZh,
      hookAngle: ctx.hookAngle,
      keywords: ctx.keywords,
    };
  }
  const staticTrend = getTrendById(input.trendId);
  if (staticTrend) {
    return {
      label: staticTrend.label,
      sceneEn: staticTrend.sceneEn,
      sceneZh: staticTrend.sceneZh,
    };
  }
  return {
    label: input.trendId,
    sceneEn: "lifestyle product scene",
    sceneZh: "生活方式场景",
  };
}

export function hotCardFromStaticTrend(
  trend: ReturnType<typeof getTrendById>
): HotTrendCard | null {
  if (!trend) return null;
  return {
    id: trend.id,
    title: trend.label,
    heatScore: trend.id === "worldcup-2026" ? 92 : 78,
    keywords: trend.keywords ?? [],
    sceneEn: trend.sceneEn,
    sceneZh: trend.sceneZh,
    hookAngle: trend.hookAngle ?? trend.label,
    psychologyTriggers: trend.psychologyTriggers,
    viralPotential: trend.viralPotential,
    emotionalHook: trend.emotionalHook,
  };
}
