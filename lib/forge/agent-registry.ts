/**
 * Agent 注册表
 * 定义每个 Agent 的能力声明、输入输出契约
 */

export type AgentCapability =
  | "trend_analysis"
  | "vision_analysis"
  | "strategy_planning"
  | "creative_direction"
  | "quality_editing"
  | "optimization";

export interface AgentDescriptor {
  id: string;
  name: string;
  role: string;
  capabilities: AgentCapability[];
  inputs: string[];
  outputs: string[];
}

export const AGENT_REGISTRY: Record<string, AgentDescriptor> = {
  "trend-scout": {
    id: "trend-scout",
    name: "趋势搜索 Agent",
    role: "联网搜索热点趋势，输出结构化趋势卡片",
    capabilities: ["trend_analysis"],
    inputs: ["query", "platform"],
    outputs: ["HotTrendCard[]"],
  },
  "vision-analyst": {
    id: "vision-analyst",
    name: "识图分析 Agent",
    role: "多模态分析商品图片，提取品类/材质/视觉特征",
    capabilities: ["vision_analysis"],
    inputs: ["imageUrls", "platform"],
    outputs: ["ProductBrief"],
  },
  "strategy-planner": {
    id: "strategy-planner",
    name: "策略策划 Agent",
    role: "综合趋势、商品、历史策略权重，输出爆款策划简报",
    capabilities: ["strategy_planning"],
    inputs: ["ForgeInput", "ProductBrief?", "strategyWeights?"],
    outputs: ["ViralBrief"],
  },
  "creative-director": {
    id: "creative-director",
    name: "创意总监 Agent",
    role: "联合生成视觉方案 + 文案，确保图文心理一致性",
    capabilities: ["creative_direction"],
    inputs: ["ForgeInput", "ProductBrief?", "ViralBrief"],
    outputs: ["CreativeOutput"],
  },
  "quality-editor": {
    id: "quality-editor",
    name: "质量编辑 Agent",
    role: "审稿 + 合规检测 + AI 味检测，多轮迭代至达标",
    capabilities: ["quality_editing"],
    inputs: ["ForgeInput", "CreativeOutput", "ViralBrief"],
    outputs: ["CriticReport", "revisedCopy"],
  },
  optimizer: {
    id: "optimizer",
    name: "优化 Agent",
    role: "remix 改写 + 多轮迭代优化",
    capabilities: ["optimization"],
    inputs: ["copyDraft", "remixType", "angle?"],
    outputs: ["revisedCopy"],
  },
};

export function getAgent(id: string): AgentDescriptor | undefined {
  return AGENT_REGISTRY[id];
}

export function getAllAgents(): AgentDescriptor[] {
  return Object.values(AGENT_REGISTRY);
}

export function getAgentsByCapability(
  capability: AgentCapability
): AgentDescriptor[] {
  return Object.values(AGENT_REGISTRY).filter((a) =>
    a.capabilities.includes(capability)
  );
}
