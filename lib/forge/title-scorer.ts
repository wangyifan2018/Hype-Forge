import type { TitleCandidate } from "@/lib/forge/types";

/**
 * 标题评分规则
 * 基于停留潜力（40%）、情绪共鸣（30%）、搜索匹配（30%）
 */

const HOOK_TYPE_WEIGHTS: Record<string, { retention: number; emotion: number; search: number }> = {
  "反差对比": { retention: 90, emotion: 75, search: 60 },
  "数字冲击": { retention: 95, emotion: 70, search: 85 },
  "悬念提问": { retention: 85, emotion: 80, search: 65 },
  "情绪共鸣": { retention: 75, emotion: 95, search: 70 },
  "痛点直击": { retention: 80, emotion: 85, search: 90 },
  "社交认证": { retention: 70, emotion: 75, search: 80 },
  "稀缺紧迫": { retention: 85, emotion: 80, search: 75 },
};

/**
 * 计算标题综合评分
 */
export function scoreTitle(title: string, hookType: string): number {
  const weights = HOOK_TYPE_WEIGHTS[hookType] ?? { retention: 70, emotion: 70, search: 70 };
  
  // 基础分
  let score = weights.retention * 0.4 + weights.emotion * 0.3 + weights.search * 0.3;
  
  // 长度惩罚：过长或过短扣分
  const len = title.length;
  if (len < 8) score -= 10;
  else if (len > 20) score -= 15;
  else if (len >= 12 && len <= 18) score += 5;
  
  // 数字加分
  if (/\d/.test(title)) score += 8;
  
  // Emoji 加分（使用 surrogate pairs 检测）
  if (/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(title)) {
    score += 5;
  }
  
  // 疑问句加分（提升互动）
  if (/[？?]/.test(title)) score += 3;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 对标题候选进行排序和筛选。
 *
 * ⚠️ 注意：`estimatedScore` 是**规则查表**得到的启发式分数（依据 hookType 与
 * 数字/疑问/情绪等特征），不是语义质量评估——它会覆盖模型自评的 estimatedScore。
 * 因此展示给用户/写进 prompt 时必须说明是"规则分"，不要当成内容质量结论。
 */
export function rankTitleCandidates(candidates: TitleCandidate[]): TitleCandidate[] {
  return [...candidates]
    .map(c => ({
      ...c,
      estimatedScore: scoreTitle(c.title, c.hookType),
    }))
    .sort((a, b) => b.estimatedScore - a.estimatedScore);
}

/**
 * 选择最佳标题
 */
export function selectBestTitle(candidates: TitleCandidate[]): TitleCandidate | null {
  if (candidates.length === 0) return null;
  const ranked = rankTitleCandidates(candidates);
  return ranked[0];
}
