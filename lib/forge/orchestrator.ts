import {
  runCopyDraft,
  runCritic,
  runVision,
  runViralBrief,
  runVisualPrompts,
  streamTextChunks,
  type RunOptions,
} from "@/lib/forge/service";
import { ensureHashtagSection } from "@/lib/forge/copy-hashtags";
import { mapLlmError } from "@/lib/ai/llm";
import { resolveTrend } from "@/lib/forge/trend-resolve";
import { STEP_LABELS } from "@/lib/forge/pipeline-labels";
import { buildCriticRevisionPrompt, CRITIC_SYSTEM } from "@/lib/ai/prompts/critic";
import { chatComplete } from "@/lib/ai/llm";
import type {
  CriticReport,
  ForgeInput,
  ForgeRunEvent,
  ForgeState,
  ProductBrief,
  ViralBrief,
  VisualPrompts,
} from "@/lib/forge/types";
import { visualPromptsSchema } from "@/lib/forge/types";

function applyCriticRevisions(
  state: ForgeState,
  critic: CriticReport
): ForgeState {
  const next = { ...state, critic };
  let visual = state.visual!;
  let copyFinal = state.copyDraft ?? "";

  const shouldRevise = critic.mustFix.length > 0;

  if (
    shouldRevise &&
    (critic.revisedFluxEn || critic.revisedBgRedrawZh)
  ) {
    const revisedZh =
      critic.revisedBgRedrawZh ?? visual.doubaoPromptZh;
    visual = visualPromptsSchema.parse({
      ...visual,
      fluxEn: critic.revisedFluxEn ?? visual.fluxEn,
      bgRedrawZh: revisedZh,
      doubaoPromptZh: revisedZh,
      doubaoPromptVariants: visual.doubaoPromptVariants.map((v, i) =>
        i === 0 ? { ...v, doubaoPromptZh: revisedZh } : v
      ),
    });
    next.visual = visual;
    next.promptsOptimized = true;
  }

  if (shouldRevise && critic.revisedCopy?.trim()) {
    copyFinal = critic.revisedCopy;
  }

  next.copyFinal = copyFinal;
  return next;
}

/** 检查 critic 评分是否达到阈值，达标则无需继续迭代 */
const CRITIC_THRESHOLD = {
  hook: 85,
  viralPotential: 80,
  scrollStopPower: 80,
  antiAiScore: 70,
  structureCheck: 80,
  complianceCheck: 100,
};

function criticMeetsThreshold(critic: CriticReport): boolean {
  const s = critic.scores;
  if (s.hook < CRITIC_THRESHOLD.hook) return false;
  if ((s.viralPotential ?? 0) < CRITIC_THRESHOLD.viralPotential) return false;
  if ((s.scrollStopPower ?? 0) < CRITIC_THRESHOLD.scrollStopPower) return false;
  if ((s.antiAiScore ?? 100) < CRITIC_THRESHOLD.antiAiScore) return false;
  if ((s.structureCheck ?? 100) < CRITIC_THRESHOLD.structureCheck) return false;
  if ((s.complianceCheck ?? 100) < CRITIC_THRESHOLD.complianceCheck) return false;
  return true;
}

/** 多轮修订：让 LLM 根据 critic mustFix 修订文案 */
async function runCriticRevision(
  input: ForgeInput,
  currentCopy: string,
  critic: CriticReport,
  visual: VisualPrompts,
  brief: ProductBrief | null,
  viralBrief: ViralBrief | null,
  round: number,
  options?: RunOptions
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
    { signal: options?.signal, system: CRITIC_SYSTEM, model: options?.model }
  );
  // 修订返回的是纯文案（非 JSON），直接提取
  return raw.trim();
}

function mapStepError(step: string, error: unknown): string {
  const msg = error instanceof Error ? mapLlmError(error) : "未知错误";
  return `${STEP_LABELS[step as keyof typeof STEP_LABELS] ?? step}失败：${msg}`;
}

export async function* runForgePipeline(
  input: ForgeInput,
  imageDataUrls: string[] | null,
  options?: RunOptions
): AsyncGenerator<ForgeRunEvent> {
  const state: ForgeState = { input };
  const visionUrls = imageDataUrls?.filter((u) => u.trim().length > 0) ?? [];
  const call = { signal: options?.signal, model: options?.model };

  try {
    let brief: ProductBrief | null = null;

    if (visionUrls.length > 0) {
      yield { type: "progress", step: "vision" };
      yield {
        type: "log",
        step: "vision",
        message: `Agent · 多模态识图分析 ${visionUrls.length} 张商品图…`,
        level: "info",
      };
      try {
        brief = await runVision(visionUrls, input, call);
        state.productBrief = brief;
        yield { type: "brief", data: brief };
        yield {
          type: "log",
          step: "vision",
          message: `识图完成 · ${visionUrls.length} 张 · ${brief.category}`,
          level: "success",
        };
      } catch (error) {
        const message = mapStepError("vision", error);
        // 识图失败不阻断流水线（降级为纯文本），但必须留痕 + 让前端显式提示
        console.warn(
          `[forge/pipeline] 识图失败，已降级为纯文本流程：${message}`
        );
        yield {
          type: "log",
          step: "vision",
          message: `${message}（已降级为纯文本流程，文案将不参考图片）`,
          level: "warn",
        };
      }
    } else {
      yield {
        type: "log",
        message: "跳过识图（未上传主图）",
        level: "info",
      };
    }

    yield { type: "progress", step: "viralBrief" };
    yield {
      type: "log",
      step: "viralBrief",
      message: "Agent · 生成爆款策划简报…",
      level: "info",
    };
    let viralBrief;
    try {
      viralBrief = await runViralBrief(input, brief, call);
      state.viralBrief = viralBrief;
      yield { type: "viralBrief", data: viralBrief };
      yield {
        type: "log",
        step: "viralBrief",
        message: `爆款策划完成 · 框架：${viralBrief.hookFramework}`,
        level: "success",
      };
    } catch (error) {
      const message = mapStepError("viralBrief", error);
      yield { type: "log", step: "viralBrief", message, level: "warn" };
    }

    yield { type: "progress", step: "visual" };
    yield {
      type: "log",
      step: "visual",
      message: "Agent · 生成视觉创意包与作图 SOP…",
      level: "info",
    };
    let visual;
    try {
      visual = await runVisualPrompts(input, brief, viralBrief, call);
      state.visual = visual;
      yield { type: "prompts", data: visual };
      yield {
        type: "log",
        step: "visual",
        message: "视觉方案完成",
        level: "success",
      };
    } catch (error) {
      const message = mapStepError("visual", error);
      yield { type: "log", step: "visual", message, level: "error" };
      yield { type: "error", message, step: "visual", phase: "visual" };
      return;
    }

    yield { type: "progress", step: "copy" };
    yield {
      type: "log",
      step: "copy",
      message: "Agent · 撰写得物种草文案…",
      level: "info",
    };
    let copyDraft: string;
    try {
      copyDraft = await runCopyDraft(input, brief, visual, viralBrief, call);
      state.copyDraft = copyDraft;
      yield {
        type: "log",
        step: "copy",
        message: "文案初稿完成",
        level: "success",
      };
    } catch (error) {
      const message = mapStepError("copy", error);
      yield { type: "log", step: "copy", message, level: "error" };
      yield { type: "error", message, step: "copy", phase: "copy" };
      return;
    }

    yield { type: "progress", step: "critic" };
    yield {
      type: "log",
      step: "critic",
      message: "Agent · 审稿与话题/链接质检（多轮迭代）…",
      level: "info",
    };

    const MAX_CRITIC_ROUNDS = 2;
    let critic: CriticReport;
    let currentCopy = copyDraft;
    const scoreHistory: CriticReport["scores"][] = [];

    try {
      // Round 1: initial critique
      critic = await runCritic(input, currentCopy, visual, brief, viralBrief, call);
      critic.round = 1;
      scoreHistory.push(critic.scores);
      yield {
        type: "log",
        step: "critic",
        message: `审稿第 1 轮完成 · 钩子 ${critic.scores.hook} · 爆款潜力 ${critic.scores.viralPotential ?? "-"}`,
        level: "success",
      };

      // Multi-round iteration if threshold not met
      let round = 1;
      while (round < MAX_CRITIC_ROUNDS && !criticMeetsThreshold(critic) && critic.mustFix.length > 0) {
        round++;
        yield {
          type: "log",
          step: "critic",
          message: `评分未达阈值，启动第 ${round} 轮修订…`,
          level: "info",
        };

        try {
          // Revise copy based on critic feedback
          currentCopy = await runCriticRevision(
            input,
            currentCopy,
            critic,
            visual,
            brief,
            viralBrief ?? null,
            round,
            call
          );

          // Re-critic the revised copy
          critic = await runCritic(input, currentCopy, visual, brief, viralBrief ?? null, call);
          critic.round = round;
          critic.scoredHistory = [...scoreHistory];
          scoreHistory.push(critic.scores);

          yield {
            type: "log",
            step: "critic",
            message: `审稿第 ${round} 轮完成 · 钩子 ${critic.scores.hook} · 爆款潜力 ${critic.scores.viralPotential ?? "-"}`,
            level: "success",
          };
        } catch {
          yield {
            type: "log",
            step: "critic",
            message: `第 ${round} 轮修订失败，使用上一版`,
            level: "warn",
          };
          break;
        }
      }

      // Attach full history to final critic
      critic.scoredHistory = scoreHistory;

    } catch (error) {
      yield {
        type: "log",
        step: "critic",
        message: mapStepError("critic", error),
        level: "warn",
      };
      critic = {
        scores: {
          hook: 70,
          emotion: 70,
          platformFit: 70,
          visualAlign: 70,
          hashtagPresent: 70,
          viralPotential: 70,
          searchKeywordDensity: 70,
          scrollStopPower: 70,
          antiAiScore: 70,
          structureCheck: 70,
          complianceCheck: 100,
          ...(input.platform === "xiaohongshu"
            ? { linkPresent: 70 }
            : {}),
        },
        mustFix: ["审稿服务暂不可用，已使用初稿"],
      };
    }

    const revised = applyCriticRevisions(
      { ...state, copyDraft: currentCopy, visual },
      critic
    );
    yield { type: "critic", data: critic };

    if (revised.promptsOptimized && revised.visual) {
      yield {
        type: "prompts",
        data: revised.visual,
        optimized: true,
      };
    }

    let copyFinal = revised.copyFinal ?? currentCopy;
    const trend = resolveTrend(input);
    const { text: withTags, patched } = ensureHashtagSection(copyFinal, [
      ...(trend.keywords ?? []),
      input.productName,
    ]);
    copyFinal = withTags;
    if (patched) {
      yield {
        type: "log",
        step: "critic",
        message: "已自动补全 ## 话题标签 小节",
        level: "warn",
      };
    }

    for await (const chunk of streamTextChunks(copyFinal, call.signal)) {
      yield { type: "delta", text: chunk };
    }

    yield { type: "log", message: "流水线执行完成", level: "success" };
    yield { type: "done" };
  } catch (error) {
    const message =
      error instanceof Error ? mapLlmError(error) : "Pipeline failed";
    if ((error as Error).name === "AbortError") {
      yield { type: "error", message: "已取消执行", phase: "abort" };
      return;
    }
    yield { type: "error", message, phase: "unknown" };
  }
}
