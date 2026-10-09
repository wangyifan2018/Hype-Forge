import {
  checkCompliance,
  type ComplianceCheck,
  type ComplianceViolation,
} from "@/lib/forge/compliance-check";
import {
  checkAuthenticity,
  detectAiFlavors,
  type AiFlavorDetection,
} from "@/lib/forge/anti-ai-detect";
import type { CriticReport } from "@/lib/forge/types";

/**
 * 确定性质量门（代码校验层）
 *
 * 背景：Critic 由写文案的同一个模型自评，且评分标准与 copywriter 的写作要求逐条相同
 * （同一份 AI_FLAVOR_BLACKLIST），所以「合规性」「去 AI 味」两项自评没有信息量。
 * 这里用仓内已有的确定性模块算出真实结论，并覆盖 LLM 自评分数、把问题并入 mustFix，
 * 让 orchestrator 的修订循环由真实信号驱动。
 */

export type QualityGateOptions = {
  /** 用户原文（商品原文 + 卖点 + 标题），用于核对文案里的数字是否凭空出现 */
  sourceText?: string;
};

export type QualityGateResult = {
  compliance: ComplianceCheck;
  aiFlavor: AiFlavorDetection;
  authenticity: { pass: boolean; reasons: string[] };
  /** 合规分：无 high 违规 = 100，否则 0（与 critic 的 100 硬阈值语义一致） */
  complianceScore: number;
  compliancePass: boolean;
  /** 去 AI 味分（0-100，越高越好）= 100 - detectAiFlavors（越低越像 AI） */
  antiAiScore: number;
  issues: string[];
  violations: ComplianceViolation[];
  fabricatedNumbers: string[];
};

/** 从文本里抽出所有数字（价格/尺码/时间等） */
function extractNumbers(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

export function runQualityGate(
  copy: string,
  options?: QualityGateOptions
): QualityGateResult {
  const text = copy ?? "";
  const compliance = checkCompliance(text);
  const aiFlavor = detectAiFlavors(text);
  const authenticity = checkAuthenticity(text);

  const compliancePass = compliance.pass;
  const complianceScore = compliancePass ? 100 : 0;
  const antiAiScore = Math.max(0, Math.min(100, 100 - aiFlavor.score));

  const issues: string[] = [];

  // 1) 合规：high 违规必须修；medium/low 作为提示
  for (const v of compliance.violations) {
    const label = v.severity === "high" ? "合规（必须改）" : "合规（建议改）";
    issues.push(`${label}：${v.suggestion ?? v.word}`);
  }

  // 2) 反 AI 味：确定性黑名单命中
  for (const flag of aiFlavor.flagged.slice(0, 5)) {
    issues.push(`去 AI 味：${flag}`);
  }

  // 3) 真实感硬性要求（数字/个人体验/指代/口语/emoji）
  for (const reason of authenticity.reasons) {
    issues.push(`真实感：${reason}`);
  }

  // 4) 事实核对：文案里的数字必须来自用户原文，否则提示人工确认（不直接判失败）
  const source = options?.sourceText?.trim();
  const fabricatedNumbers: string[] = [];
  if (source) {
    const allowed = new Set(extractNumbers(source));
    for (const n of extractNumbers(text)) {
      if (!allowed.has(n) && !fabricatedNumbers.includes(n)) {
        fabricatedNumbers.push(n);
      }
    }
    if (fabricatedNumbers.length > 0) {
      issues.push(
        `事实核对：数字 ${fabricatedNumbers.slice(0, 6).join("、")} 未出现在用户原文中，请确认是否编造价格/参数`
      );
    }
  }

  return {
    compliance,
    aiFlavor,
    authenticity,
    compliancePass,
    complianceScore,
    antiAiScore,
    issues: Array.from(new Set(issues)),
    violations: compliance.violations,
    fabricatedNumbers,
  };
}

/** 用确定性结论覆盖 LLM 自评，并把问题并入 mustFix */
export function applyGateToCritic(
  report: CriticReport,
  gate: QualityGateResult
): CriticReport {
  const mustFix = Array.from(
    new Set([...gate.issues, ...report.mustFix.filter(Boolean)])
  );

  return {
    ...report,
    scores: {
      ...report.scores,
      complianceCheck: gate.complianceScore,
      antiAiScore: gate.antiAiScore,
    },
    mustFix: mustFix.slice(0, 12),
    deterministic: {
      checkedBy: "code",
      compliancePass: gate.compliancePass,
      complianceScore: gate.complianceScore,
      antiAiScore: gate.antiAiScore,
      violations: gate.violations.map((v) => ({
        word: v.word,
        severity: v.severity,
        suggestion: v.suggestion,
      })),
      fabricatedNumbers: gate.fabricatedNumbers,
      issues: gate.issues,
    },
  };
}
