/**
 * 情报可信度工具。
 *
 * 模型返回的 `sources` 是一串自由文本（如「得物社区话题｜#夏日球鞋｜2026-06-11」），
 * 此前只用于展示，没有任何计算，于是"没有来源/来源很旧"的结论和"有据可查"的
 * 结论看起来一样可信。这里把它变成可计算的信号：
 *   - 解析日期 → 时效
 *   - 统计有来源、有日期的条数 → 置信度等级
 *   - 给出 needsVerify 标记与原因，供 UI 展示与排序使用
 */

export type IntelConfidenceLevel = "high" | "medium" | "low";

export type IntelConfidence = {
  level: IntelConfidenceLevel;
  sourceCount: number;
  datedCount: number;
  /** 最新一条来源的日期（YYYY-MM-DD） */
  freshestDate?: string;
  freshestAgeDays?: number;
  reasons: string[];
  needsVerify: boolean;
};

export type SourceInsight = {
  text: string;
  date?: string;
  ageDays?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** 支持 2026-06-11 / 2026/6/11 / 2026年6月11日 / 06-11 */
export function parseSourceDate(
  text: string,
  now: Date = new Date()
): string | undefined {
  const ymd = text.match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!Number.isNaN(date.getTime())) {
      return toYmd(date);
    }
  }

  const md = text.match(/(?<!\d)(\d{1,2})[-/月](\d{1,2})(?!\d)/);
  if (md) {
    const [, m, d] = md;
    const date = new Date(now.getFullYear(), Number(m) - 1, Number(d));
    // 未来日期说明是上一年（跨年场景）
    if (date.getTime() > now.getTime() + DAY_MS) {
      date.setFullYear(date.getFullYear() - 1);
    }
    if (!Number.isNaN(date.getTime())) return toYmd(date);
  }

  return undefined;
}

function toYmd(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export function analyzeSources(
  sources: string[] | undefined,
  now: Date = new Date()
): SourceInsight[] {
  return (sources ?? [])
    .filter((s) => s.trim().length > 0)
    .map((text) => {
      const parsed = parseSourceDate(text, now);
      if (!parsed) return { text };
      const ageDays = daysBetween(new Date(`${parsed}T00:00:00`), now);
      return { text, date: parsed, ageDays };
    });
}

const FRESH_DAYS = 14;
const STALE_DAYS = 60;

export function analyzeIntelConfidence(
  sources: string[] | undefined,
  now: Date = new Date()
): IntelConfidence {
  const insights = analyzeSources(sources, now);
  const dated = insights.filter((s) => s.date);
  const freshest = dated
    .slice()
    .sort((a, b) => (a.ageDays ?? 0) - (b.ageDays ?? 0))[0];

  const sourceCount = insights.length;
  const datedCount = dated.length;
  const freshestAgeDays = freshest?.ageDays;
  const reasons: string[] = [];
  let level: IntelConfidenceLevel = "low";

  if (sourceCount === 0) {
    reasons.push("未提供来源，无法核验");
  } else if (datedCount === 0) {
    reasons.push("来源未标注日期");
    level = "medium";
  } else if (freshestAgeDays !== undefined && freshestAgeDays > STALE_DAYS) {
    reasons.push(`最新来源已 ${freshestAgeDays} 天前，信息可能过时`);
    level = "low";
  } else if (datedCount >= 2 && (freshestAgeDays ?? Infinity) <= FRESH_DAYS) {
    level = "high";
  } else {
    level = "medium";
    if (datedCount === 1) reasons.push("仅 1 条来源带日期");
  }

  const needsVerify = level !== "high";

  return {
    level,
    sourceCount,
    datedCount,
    freshestDate: freshest?.date,
    freshestAgeDays,
    reasons,
    needsVerify,
  };
}

/** 0-100 的可计算可信度分（用于排序权重，不直接展示成"评分"） */
export function confidenceScore(confidence: IntelConfidence): number {
  const base = confidence.level === "high" ? 80 : confidence.level === "medium" ? 55 : 25;
  const dateBonus = Math.min(15, confidence.datedCount * 5);
  const stalePenalty =
    confidence.freshestAgeDays !== undefined && confidence.freshestAgeDays > 60
      ? 10
      : 0;
  return Math.max(0, Math.min(100, base + dateBonus - stalePenalty));
}

/**
 * 排序：先按"可核验程度"分层（需核实的排在后面），再按热度。
 * 使"无来源的凭空热点"不会挤掉"有据可查的热点"。
 */
export function rankByTrustThenHeat<
  T extends { heatScore?: number; confidence?: IntelConfidence }
>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aVerify = a.item.confidence?.needsVerify === false ? 1 : 0;
      const bVerify = b.item.confidence?.needsVerify === false ? 1 : 0;
      if (aVerify !== bVerify) return bVerify - aVerify;
      const heat =
        (b.item.heatScore ?? 0) - (a.item.heatScore ?? 0);
      if (heat !== 0) return heat;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
