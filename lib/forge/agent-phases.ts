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
  /** 工具/模型名，如 "DashScope", "Web Search" */
  tool?: string;
  /** 数据源标识，如 "douyin", "xiaohongshu", "dewu" */
  source?: string;
  /** 当前步骤详细描述 */
  detail?: string;
};

const TREND_SCAN_CORE: AgentPhase[] = [
  {
    id: "connect",
    label: "连接节点",
    message: "Agent · 连接 DashScope 情报节点…",
    delayMs: 350,
    tool: "DashScope",
    detail: "建立联网情报通道",
  },
  {
    id: "parse_scope",
    label: "解析范围",
    message: "Agent · 解析情报范围与检索策略…",
    delayMs: 500,
    tool: "Query Planner",
    detail: "分析搜索意图与品类策略",
  },
  {
    id: "search_douyin",
    label: "抖音信号",
    message: "Agent · 采集抖音热搜与种草话题…",
    delayMs: 700,
    tool: "Web Search",
    source: "douyin",
    detail: "抓取抖音热搜与种草话题",
  },
  {
    id: "search_xhs",
    label: "小红书",
    message: "Agent · 归纳小红书笔记趋势…",
    delayMs: 650,
    tool: "Web Search",
    source: "xiaohongshu",
    detail: "归纳小红书爆款笔记体与话题",
  },
  {
    id: "search_dewu",
    label: "得物社区",
    message: "Agent · 扫描得物社区场景与话题…",
    delayMs: 600,
    tool: "Web Search",
    source: "dewu",
    detail: "扫描得物社区场景与挑战赛",
  },
  {
    id: "cluster_topics",
    label: "话题聚类",
    message: "Agent · 话题聚类与氛围去重…",
    delayMs: 550,
    tool: "Topic Clustering",
    detail: "话题聚类与氛围去重",
  },
  {
    id: "synthesize_trends",
    label: "场景卡片",
    message: "Agent · 生成场景趋势卡片…",
    delayMs: 800,
    tool: "大模型归并",
    detail: "生成场景趋势卡并标注生命周期",
  },
  {
    id: "psychology_analysis",
    label: "心理触发器",
    message: "Agent · 分析心理触发器与病毒潜力…",
    delayMs: 600,
    tool: "Psychology AI",
    detail: "识别 identity/novelty/community 等心理触发器，评估病毒传播潜力",
  },
  {
    id: "score_lifecycle",
    label: "生命周期",
    message: "Agent · 评估生命周期与竞争饱和度…",
    delayMs: 500,
    tool: "Scoring",
    detail: "评估 emerging/rising 优先级",
  },
];

export const SCAN_TREND_PHASES: AgentPhase[] = TREND_SCAN_CORE;

export const SCOUT_PRODUCT_PHASES: AgentPhase[] = [
  {
    id: "connect_scout",
    label: "爆款引擎",
    message: "Agent · 连接爆款情报引擎…",
    delayMs: 350,
    tool: "DashScope",
    detail: "连接爆款情报引擎",
  },
  {
    id: "search_products",
    label: "检索爆款",
    message: "Agent · 联网检索高热单品方向…",
    delayMs: 900,
    tool: "Web Search",
    detail: "检索高热单品方向与搜索词",
  },
  {
    id: "viral_hook_detection",
    label: "病毒钩子",
    message: "Agent · 检测病毒钩子与心理共振…",
    delayMs: 650,
    tool: "Viral Detector",
    detail: "分析单品的心理触发器，检测与趋势的心理共振效应",
  },
  {
    id: "rank_leads",
    label: "排序线索",
    message: "Agent · 排序线索（竞争度/优先级）…",
    delayMs: 650,
    tool: "Ranking",
    detail: "按竞争度与优先级排序",
  },
];

export function getTrendScanPhases(opts?: {
  autoScope?: "category" | "open";
}): AgentPhase[] {
  if (opts?.autoScope === "open") return TREND_SCAN_CORE;
  return TREND_SCAN_CORE.filter(
    (p) => p.id !== "search_douyin" && p.id !== "search_xhs"
  );
}

export function buildSmartIntelPhases(opts?: {
  autoScope?: "category" | "open";
}): AgentPhase[] {
  return [
    ...getTrendScanPhases(opts).map((p) => ({
      ...p,
      message: p.message.replace("Agent ·", "Agent [热点] ·"),
    })),
    ...SCOUT_PRODUCT_PHASES.map((p) => ({
      ...p,
      message: p.message.replace("Agent ·", "Agent [爆款] ·"),
    })),
  ];
}

/** @deprecated 使用 buildSmartIntelPhases */
export const SMART_INTEL_PHASES: AgentPhase[] = buildSmartIntelPhases();

/** @deprecated 兼容旧引用 */
export const formatAgentTime = (): string =>
  new Date().toLocaleTimeString("zh-CN", { hour12: false });
