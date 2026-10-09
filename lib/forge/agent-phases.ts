export type AgentPhaseId =
  | "connect"
  | "parse_scope"
  | "search_douyin"
  | "search_xhs"
  | "search_dewu"
  | "cluster_topics"
  | "synthesize_trends"
  | "psychology_analysis"
  | "score_lifecycle"
  | "connect_scout"
  | "search_products"
  | "viral_hook_detection"
  | "rank_leads"
  | "search_web"
  | "done";

export type AgentPhase = {
  id: AgentPhaseId;
  /** 左侧情报终端日志 */
  message: string;
  /** 右侧雷达面板步骤标题 */
  label: string;
  delayMs: number;
  /** 工具/模型名，如 "DashScope", "联网归纳" */
  tool?: string;
  /** 数据源标识，如 "douyin", "xiaohongshu", "dewu" */
  source?: string;
  /** 当前步骤详细描述 */
  detail?: string;
};

/**
 * 运行中的单条"真实"阶段。
 *
 * 情报检索实际只有 1 次联网归纳调用，因此不再播放"采集抖音热搜/扫描得物社区"
 * 这类编造的多阶段动画；真实过程与耗时由服务端 `stages` 回执给出
 * （见 lib/forge/intel-stages.ts 与 hooks/use-agent-phase-runner 的 recordStages）。
 */
export function buildIntelRunningPhases(
  kind: "trend" | "scout"
): AgentPhase[] {
  if (kind === "scout") {
    return [
      {
        id: "search_products",
        label: "联网检索爆款",
        message: "Agent · 联网检索高热单品方向（模型单次归纳）…",
        delayMs: 0,
        tool: "联网归纳",
        detail: "检索 → 解析 → 排序",
      },
    ];
  }
  return [
    {
      id: "search_web",
      label: "联网检索",
      message: "Agent · 联网检索公开讨论（模型单次归纳）…",
      delayMs: 0,
      tool: "联网归纳",
      detail: "检索 → 解析 → 归一",
    },
  ];
}

/** @deprecated 兼容旧引用 */
export const formatAgentTime = (): string =>
  new Date().toLocaleTimeString("zh-CN", { hour12: false });
