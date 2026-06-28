/**
 * 质量编辑 Agent
 * 整合 critic + compliance + anti-AI 检测，多轮迭代至达标
 *
 * 参考 prompt-optimizer-studio 的多轮优化模式：
 * - 初始审稿 + 评分
 * - 若未达阈值，生成修订建议
 * - 让 LLM 根据 mustFix 修订
 * - 重新审稿，直到达标或达到最大轮次
 */

import { runCritic } from "@/lib/forge/service";
import { buildCriticRevisionPrompt, CRITIC_SYSTEM } from "@/lib/ai/prompts/critic";
import { chatComplete } from "@/lib/ai/dashscope";
import type {
  CriticReport,
  ForgeInput,
  ProductBrief,
  ViralBrief,
  VisualPrompts,
} from "@/lib/forge/types";

export interface QualityEditorInput {
  input: ForgeInput;
  copyDraft: string;
  visual: VisualPrompts;
  brief?: ProductBrief | null;
  viralBrief?: ViralBrief | null;
  signal?: AbortSignal;
}

export interface QualityEditorOutput {
  critic: CriticReport;
  revisedCopy: string;
  rounds: number;
  scoreHistory: CriticReport["scores"][];
}

/** 质量阈值配置 */
export const QUALITY_THRESHOLDS = {
  hook: 85,
  viralPotential: 80,
  scrollStopPower: 80,
  antiAiScore: 70,
  structureCheck: 80,
  complianceCheck: 100,
};

/** 检查是否达到质量阈值 */
export function meetsQualityThreshold(critic: CriticReport): boolean {
  const s = critic.scores;
  if (s.hook < QUALITY_THRESHOLDS.hook) return false;
  if ((s.viralPotential ?? 0) < QUALITY_THRESHOLDS.viralPotential) return false;
  if ((s.scrollStopPower ?? 0) < QUALITY_THRESHOLDS.scrollStopPower) return false;
  if ((s.antiAiScore ?? 100) < QUALITY_THRESHOLDS.antiAiScore) return false;
  if ((s.structureCheck ?? 100) < QUALITY_THRESHOLDS.structureCheck) return false;
  if ((s.complianceCheck ?? 100) < QUALITY_THRESHOLDS.complianceCheck) return false;
  return true;
}

/** 生成修订后的文案 */
async function generateRevision(
  input: ForgeInput,
  currentCopy: string,
  critic: CriticReport,
  visual: VisualPrompts,
  brief: ProductBrief | null,
  viralBrief: ViralBrief | null,
  round: number,
  signal?: AbortSignal
): Promise<string> {
  const revisionPrompt = buildCriticRevisionPrompt(
    input,
    currentCopy,
    { mustFix: critic.mustFix, scores: critic.scores as Record<string, number> },
    visual,
    brief,
    viralBrief,
    round
  );

  const raw = await chatComplete(
    [
      { role: "user", content: revisionPrompt },
    ],
    { signal, system: CRITIC_SYSTEM }
  );

  return raw.trim();
}

/**
 * 运行质量编辑 Agent
 * 多轮迭代审稿 + 修订，直到达标或达到最大轮次
 */
export async function runQualityEditor(
  params: QualityEditorInput,
  maxRounds: number = 2
): Promise<QualityEditorOutput> {
  const { input, copyDraft, visual, brief, viralBrief, signal } = params;

  let currentCopy = copyDraft;
  let critic: CriticReport;
  const scoreHistory: CriticReport["scores"][] = [];
  let round = 0;

  // 初始审稿
  critic = await runCritic(input, currentCopy, visual, brief, viralBrief, signal);
  critic.round = 1;
  scoreHistory.push(critic.scores);
  round = 1;

  // 多轮迭代
  while (
    round < maxRounds &&
    !meetsQualityThreshold(critic) &&
    critic.mustFix.length > 0
  ) {
    round++;

    try {
      // 生成修订
      currentCopy = await generateRevision(
        input,
        currentCopy,
        critic,
        visual,
        brief ?? null,
        viralBrief ?? null,
        round,
        signal
      );

      // 重新审稿
      critic = await runCritic(input, currentCopy, visual, brief, viralBrief ?? null, signal);
      critic.round = round;
      critic.scoredHistory = [...scoreHistory];
      scoreHistory.push(critic.scores);
    } catch {
      // 修订失败，使用上一版
      break;
    }
  }

  // 附加完整历史
  critic.scoredHistory = scoreHistory;

  return {
    critic,
    revisedCopy: currentCopy,
    rounds: round,
    scoreHistory,
  };
}
