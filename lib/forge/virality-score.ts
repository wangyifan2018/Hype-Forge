import type { ViralityComposite, CriticReport } from "@/lib/forge/types";

/**
 * 爆款指数计算与展示
 * 基于 critic 的 6 维评分（hookStrength/emotionalResonance/trendAlignment/noveltyFactor/timingFit/platformNative）
 */

export type ViralityLevel = "S" | "A" | "B" | "C" | "D";

export interface ViralityAnalysis {
  composite: ViralityComposite;
  totalScore: number;
  level: ViralityLevel;
  dimensions: ViralityDimension[];
  insights: string[];
}

export interface ViralityDimension {
  key: keyof ViralityComposite;
  label: string;
  score: number;
  description: string;
  icon: string;
}

/**
 * 计算综合爆款指数
 */
export function calculateViralityScore(composite: ViralityComposite): number {
  // 加权平均：钩子强度(25%) + 情绪共鸣(20%) + 趋势契合(20%) + 新奇感(15%) + 时机匹配(10%) + 平台原生(10%)
  const weights = {
    hookStrength: 0.25,
    emotionalResonance: 0.20,
    trendAlignment: 0.20,
    noveltyFactor: 0.15,
    timingFit: 0.10,
    platformNative: 0.10,
  };

  const total =
    composite.hookStrength * weights.hookStrength +
    composite.emotionalResonance * weights.emotionalResonance +
    composite.trendAlignment * weights.trendAlignment +
    composite.noveltyFactor * weights.noveltyFactor +
    composite.timingFit * weights.timingFit +
    composite.platformNative * weights.platformNative;

  return Math.round(total);
}

/**
 * 根据分数判定爆款等级
 */
export function getViralityLevel(score: number): ViralityLevel {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

/**
 * 获取等级对应的颜色
 */
export function getViralityColor(level: ViralityLevel): string {
  const colors: Record<ViralityLevel, string> = {
    S: "#FF6B6B", // 红色 - 超级爆款
    A: "#FFA94D", // 橙色 - 高潜力
    B: "#FFD43B", // 黄色 - 中等
    C: "#69DB7C", // 绿色 - 一般
    D: "#ADB5BD", // 灰色 - 待优化
  };
  return colors[level];
}

/**
 * 解析 6 维评分详情
 */
export function parseViralityDimensions(composite: ViralityComposite): ViralityDimension[] {
  return [
    {
      key: "hookStrength",
      label: "钩子强度",
      score: composite.hookStrength,
      description: "标题与首句的停留潜力",
      icon: "🎯",
    },
    {
      key: "emotionalResonance",
      label: "情绪共鸣",
      score: composite.emotionalResonance,
      description: "内容触发用户情绪的程度",
      icon: "💫",
    },
    {
      key: "trendAlignment",
      label: "趋势契合",
      score: composite.trendAlignment,
      description: "与当前热点趋势的匹配度",
      icon: "🔥",
    },
    {
      key: "noveltyFactor",
      label: "新奇感",
      score: composite.noveltyFactor,
      description: "内容的独特性与新鲜感",
      icon: "✨",
    },
    {
      key: "timingFit",
      label: "时机匹配",
      score: composite.timingFit,
      description: "发布时机的恰当性",
      icon: "⏰",
    },
    {
      key: "platformNative",
      label: "平台原生",
      score: composite.platformNative,
      description: "符合平台调性与用户习惯",
      icon: "📱",
    },
  ];
}

/**
 * 生成爆款洞察建议
 */
export function generateViralityInsights(dimensions: ViralityDimension[]): string[] {
  const insights: string[] = [];
  const weakDimensions = dimensions.filter((d) => d.score < 70);

  if (weakDimensions.length === 0) {
    insights.push("🎉 各维度均衡，具备爆款潜质！");
    return insights;
  }

  // 找出最弱的维度
  const weakest = weakDimensions.reduce((min, d) => (d.score < min.score ? d : min));

  switch (weakest.key) {
    case "hookStrength":
      insights.push("💡 钩子强度不足，建议优化标题悬念感，首句加入反差或提问");
      break;
    case "emotionalResonance":
      insights.push("💡 情绪共鸣偏弱，建议强化个人体验细节，增加口语化表达");
      break;
    case "trendAlignment":
      insights.push("💡 趋势契合度低，建议融入更多趋势关键词与热点元素");
      break;
    case "noveltyFactor":
      insights.push("💡 新奇感不足，建议尝试独特视角或意外并置");
      break;
    case "timingFit":
      insights.push("💡 时机匹配度一般，建议关注最佳发布窗口");
      break;
    case "platformNative":
      insights.push("💡 平台原生感弱，建议调整语气与格式，更贴近社区风格");
      break;
  }

  // 如果有多个弱项，追加建议
  if (weakDimensions.length > 1) {
    insights.push(`⚠️ 还有 ${weakDimensions.length - 1} 个维度待提升`);
  }

  return insights;
}

/**
 * 完整分析爆款指数
 */
export function analyzeVirality(composite: ViralityComposite): ViralityAnalysis {
  const totalScore = calculateViralityScore(composite);
  const level = getViralityLevel(totalScore);
  const dimensions = parseViralityDimensions(composite);
  const insights = generateViralityInsights(dimensions);

  return {
    composite,
    totalScore,
    level,
    dimensions,
    insights,
  };
}

/**
 * 从 CriticReport 提取爆款评分
 */
export function extractViralityFromCritic(critic: CriticReport): ViralityAnalysis | null {
  if (!critic.viralityComposite) return null;
  return analyzeVirality(critic.viralityComposite);
}
