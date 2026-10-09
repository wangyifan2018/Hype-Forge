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
import type { CriticReport, Platform } from "@/lib/forge/types";
import { parseDewuPublish } from "@/lib/forge/parse-dewu-publish";

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
  /** 平台规则不同（得物三小节 / 小红书小节与话题数不同） */
  platform?: Platform;
  /** 趋势关键词：用于确定性计算 searchKeywordDensity（原本靠模型自评） */
  trendKeywords?: string[];
};

export type QualityGateScores = {
  complianceCheck: number;
  antiAiScore: number;
  /** 以下三项只在能被代码判定时才给出，undefined 表示保留模型评分 */
  structureCheck?: number;
  hashtagPresent?: number;
  searchKeywordDensity?: number;
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
  /** 可由代码判定的全部维度 */
  scores: QualityGateScores;
  /** 结构检查明细（供 UI 展示"缺哪一段"） */
  structure: {
    sections: string[];
    missingSections: string[];
    missingSegments: string[];
    hashtagCount: number;
    titleLength: number;
  };
  issues: string[];
  violations: ComplianceViolation[];
  fabricatedNumbers: string[];
};

/** 从文本里抽出所有数字（价格/尺码/时间等） */
function extractNumbers(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

/** 得物/小红书正文的五段式结构标签（prompt 强制输出，展示时会被 parser 去掉） */
const REQUIRED_SEGMENTS = [
  "钩子",
  "痛点场景",
  "解决方案",
  "效果可视化",
  "行动指令",
];

/** 平台对「三小节 + 话题数」的要求 */
const PLATFORM_RULES = {
  dewu: { minHashtags: 3, minTitle: 1, maxTitle: 30 },
  xiaohongshu: { minHashtags: 4, minTitle: 1, maxTitle: 20 },
} as const;

/**
 * 结构检查：小节齐不齐、五段式标签齐不齐、话题数量、标题长度。
 * 这些原本由模型自评 structureCheck / hashtagPresent，属于可判定维度。
 */
function inspectStructure(copy: string, platform: Platform) {
  const rules = PLATFORM_RULES[platform];
  const parsed = parseDewuPublish(copy);

  const sections: string[] = [];
  const missingSections: string[] = [];
  for (const name of ["标题", "正文", "话题标签"]) {
    const present = new RegExp(`^#{1,3}\\s*${name}`, "m").test(copy);
    if (present) sections.push(name);
    else missingSections.push(name);
  }

  const missingSegments = REQUIRED_SEGMENTS.filter(
    (segment) => !copy.includes(`【${segment}】`)
  );

  const hashtagCount = parsed.hashtags.length;
  const titleLength = parsed.title.length;

  return {
    sections,
    missingSections,
    missingSegments,
    hashtagCount,
    titleLength,
    rules,
  };
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
  const platform: Platform = options?.platform ?? "dewu";
  const structure = inspectStructure(text, platform);

  // 0) 结构：小节 / 五段式 / 话题数 —— 代码判定，取代模型自评
  if (structure.missingSections.length > 0) {
    issues.push(
      `结构（必须改）：缺少 ${structure.missingSections.map((s) => `## ${s}`).join("、")} 小节`
    );
  }
  if (structure.missingSegments.length > 0) {
    issues.push(
      `结构（必须改）：正文缺少 ${structure.missingSegments.map((s) => `【${s}】`).join("、")} 段`
    );
  }
  if (structure.hashtagCount < structure.rules.minHashtags) {
    issues.push(
      `话题标签（必须改）：当前 ${structure.hashtagCount} 个，${platform === "dewu" ? "得物" : "小红书"}建议至少 ${structure.rules.minHashtags} 个`
    );
  }
  if (structure.titleLength === 0) {
    issues.push("标题（必须改）：未解析出标题");
  } else if (structure.titleLength > structure.rules.maxTitle) {
    issues.push(
      `标题（建议改）：${structure.titleLength} 字，建议压到 ${structure.rules.maxTitle} 字内`
    );
  }

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

  // 5) 搜索词覆盖：趋势关键词在文案（含标题与话题）中的命中率
  const trendKeywords = (options?.trendKeywords ?? []).filter((k) => k.trim());
  let searchKeywordDensity: number | undefined;
  if (trendKeywords.length > 0) {
    const lower = text.toLowerCase();
    const hits = trendKeywords.filter((k) => lower.includes(k.toLowerCase()));
    searchKeywordDensity = Math.round((hits.length / trendKeywords.length) * 100);
    if (searchKeywordDensity < 50) {
      const missed = trendKeywords.filter((k) => !lower.includes(k.toLowerCase()));
      issues.push(
        `搜索词覆盖（建议改）：趋势关键词仅命中 ${hits.length}/${trendKeywords.length}，未命中：${missed.slice(0, 4).join("、")}`
      );
    }
  }

  // 结构分：五段式每缺一段扣 20，小节缺失每个扣 20；话题不足按缺额扣分
  const structureScore = Math.max(
    0,
    100 -
      structure.missingSegments.length * 20 -
      structure.missingSections.length * 20
  );
  const hashtagPresent = Math.max(
    0,
    Math.min(
      100,
      Math.round((structure.hashtagCount / structure.rules.minHashtags) * 100)
    )
  );

  return {
    compliance,
    aiFlavor,
    authenticity,
    compliancePass,
    complianceScore,
    antiAiScore,
    scores: {
      complianceCheck: complianceScore,
      antiAiScore,
      structureCheck: structureScore,
      hashtagPresent,
      ...(searchKeywordDensity === undefined ? {} : { searchKeywordDensity }),
    },
    structure: {
      sections: structure.sections,
      missingSections: structure.missingSections,
      missingSegments: structure.missingSegments,
      hashtagCount: structure.hashtagCount,
      titleLength: structure.titleLength,
    },
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
      // 可判定的维度一律以代码结论为准；未判定的（hook/emotion 等主观项）保留模型评分
      ...gate.scores,
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
