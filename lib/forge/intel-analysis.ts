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

export function buildPhaseInsight(
  phaseId: AgentPhaseId,
  ctx: IntelAnalysisContext
): string {
  const open = ctx.autoScope === "open";
  const manual = ctx.discoveryMode === "manual";
  const live = ctx.forgeMode === "live";

  switch (phaseId) {
    case "connect":
      return live
        ? "已连接 DashScope 联网情报节点"
        : "MOCK 模式：加载示例情报库";
    case "parse_scope":
      return manual
        ? `解析线索 · 定向 ${ctx.categoryLabel ?? "品类"}`
        : open
          ? "情报范围：全站跨平台，不限主营品类"
          : `情报范围：跨品类 · 略侧重 ${ctx.categoryLabel ?? "潮穿"}`;
    case "search_douyin":
      return open ? "抓取抖音热搜与种草话题…" : "跳过（非全站模式）";
    case "search_xhs":
      return open ? "归纳小红书爆款笔记体与话题…" : "交叉验证小红书氛围词…";
    case "search_dewu":
      return "扫描得物社区场景/挑战赛/拍照方向";
    case "cluster_topics":
      return "话题聚类 · 去重 · 合并相近氛围";
    case "synthesize_trends":
      return "生成场景趋势卡 · 标注生命周期与发帖窗口";
    case "psychology_analysis":
      return "分析心理触发器 · 评估病毒传播潜力 · 识别情绪钩子";
    case "score_lifecycle":
      return "评分：emerging/rising 优先 · 饱和度过滤";
    case "connect_scout":
      return "切换爆款线索引擎 · 绑定首推场景";
    case "search_products":
      return "检索高热单品方向 · 预埋得物搜索词";
    case "viral_hook_detection":
      return "检测病毒钩子 · 分析心理共振 · 评估传播潜力";
    case "rank_leads":
      return "排序：竞争度 · priority · heatScore · viralPotential";
    case "search_web":
      return open
        ? "信号源：抖音热搜 · 小红书笔记趋势 · 得物社区"
        : "信号源：得物社区 · 公开讨论 · 季节话题";
    case "done":
      return "分析完成";
    default:
      return "处理中…";
  }
}

export function intelPipelineTitle(ctx: IntelAnalysisContext): string {
  if (ctx.pipeline === "scout") return "爆款线索检索";
  if (ctx.pipeline === "scan") return "热点场景扫描";
  if (ctx.discoveryMode === "manual") return "按线索搜";
  return "智能搜索";
}
