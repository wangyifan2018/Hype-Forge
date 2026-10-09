import type { IntelAutoScope, IntelDiscoveryMode } from "@/lib/forge/intel-discovery";
import type { AgentPhaseId } from "@/lib/forge/agent-phases";
import type { ForgeMode } from "@/lib/forge/types";

export type IntelAnalysisContext = {
  pipeline: "full" | "scout" | "scan";
  discoveryMode?: IntelDiscoveryMode;
  autoScope?: IntelAutoScope;
  categoryLabel?: string;
  forgeMode?: ForgeMode;
};

export type InsightIcon =
  | "radio"
  | "search"
  | "merge"
  | "chart"
  | "check"
  | "sparkles"
  | "brain"
  | "zap";

export type InsightEntry = {
  id: string;
  text: string;
  icon: InsightIcon;
  phaseId: AgentPhaseId;
};

export function getInsightIcon(phaseId: AgentPhaseId): InsightIcon {
  switch (phaseId) {
    case "connect":
    case "connect_scout":
      return "radio";
    case "parse_scope":
      return "sparkles";
    case "search_douyin":
    case "search_xhs":
    case "search_dewu":
    case "search_products":
    case "search_web":
      return "search";
    case "cluster_topics":
      return "merge";
    case "synthesize_trends":
      return "sparkles";
    case "psychology_analysis":
      return "brain";
    case "viral_hook_detection":
      return "zap";
    case "score_lifecycle":
    case "rank_leads":
      return "chart";
    case "done":
      return "check";
    default:
      return "sparkles";
  }
}

export function intelPipelineTitle(ctx: IntelAnalysisContext): string {
  if (ctx.pipeline === "scout") return "爆款线索检索";
  if (ctx.pipeline === "scan") return "热点场景扫描";
  if (ctx.discoveryMode === "manual") return "按线索搜";
  return "智能搜索";
}
