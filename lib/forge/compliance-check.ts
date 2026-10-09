/**
 * 合规性检测模块
 * 检测广告法违禁词 + 平台敏感词
 */

export type ComplianceCheck = {
  pass: boolean;
  violations: ComplianceViolation[];
  warnings: string[];
};

export type ComplianceViolation = {
  word: string;
  type: "absolute" | "medical" | "false_promise" | "platform_sensitive";
  severity: "high" | "medium" | "low";
  suggestion?: string;
};

// 绝对化用语（广告法严禁）
const ABSOLUTE_WORDS = [
  // 注意：不要放裸「最」——会把「最近/最后/最初」判成绝对化用语，误报率极高；
  // 广告法关注的是「最+形容词」构成的最高级表述，已在下文逐条列出。
  { word: "最佳", type: "absolute" as const, severity: "high" as const },
  { word: "最好", type: "absolute" as const, severity: "high" as const },
  { word: "最优", type: "absolute" as const, severity: "high" as const },
  { word: "最强", type: "absolute" as const, severity: "high" as const },
  { word: "最低", type: "absolute" as const, severity: "high" as const },
  { word: "最高", type: "absolute" as const, severity: "high" as const },
  { word: "最大", type: "absolute" as const, severity: "high" as const },
  { word: "最小", type: "absolute" as const, severity: "high" as const },
  { word: "最多", type: "absolute" as const, severity: "high" as const },
  { word: "最少", type: "absolute" as const, severity: "high" as const },
  { word: "唯一", type: "absolute" as const, severity: "high" as const },
  { word: "首个", type: "absolute" as const, severity: "high" as const },
  { word: "首选", type: "absolute" as const, severity: "high" as const },
  { word: "独家", type: "absolute" as const, severity: "high" as const },
  { word: "独家配方", type: "absolute" as const, severity: "high" as const },
  { word: "绝无仅有", type: "absolute" as const, severity: "high" as const },
  { word: "史无前例", type: "absolute" as const, severity: "high" as const },
  { word: "前无古人", type: "absolute" as const, severity: "high" as const },
  { word: "顶级", type: "absolute" as const, severity: "high" as const },
  { word: "顶尖", type: "absolute" as const, severity: "high" as const },
  { word: "极品", type: "absolute" as const, severity: "high" as const },
  { word: "终极", type: "absolute" as const, severity: "high" as const },
  { word: "极致", type: "absolute" as const, severity: "high" as const },
  { word: "绝对", type: "absolute" as const, severity: "high" as const },
  { word: "全网最低", type: "absolute" as const, severity: "high" as const },
  { word: "史上最强", type: "absolute" as const, severity: "high" as const },
  { word: "世界级", type: "absolute" as const, severity: "high" as const },
  { word: "国家级", type: "absolute" as const, severity: "high" as const },
  { word: "全球首发", type: "absolute" as const, severity: "high" as const },
];

// 医疗功效宣称（非医疗产品禁用）
const MEDICAL_WORDS = [
  { word: "治疗", type: "medical" as const, severity: "high" as const },
  { word: "治愈", type: "medical" as const, severity: "high" as const },
  { word: "根治", type: "medical" as const, severity: "high" as const },
  { word: "药效", type: "medical" as const, severity: "high" as const },
  { word: "疗效", type: "medical" as const, severity: "high" as const },
  { word: "医学", type: "medical" as const, severity: "medium" as const },
  { word: "医疗", type: "medical" as const, severity: "medium" as const },
  { word: "医生", type: "medical" as const, severity: "medium" as const },
  { word: "处方", type: "medical" as const, severity: "high" as const },
  { word: "药用", type: "medical" as const, severity: "high" as const },
  { word: "保健", type: "medical" as const, severity: "medium" as const },
  { word: "减肥", type: "medical" as const, severity: "medium" as const },
  { word: "瘦身", type: "medical" as const, severity: "medium" as const },
  { word: "祛痘", type: "medical" as const, severity: "medium" as const },
  { word: "祛斑", type: "medical" as const, severity: "medium" as const },
  { word: "美白", type: "medical" as const, severity: "medium" as const },
];

// 虚假承诺
const FALSE_PROMISE_WORDS = [
  { word: "100%有效", type: "false_promise" as const, severity: "high" as const },
  { word: "立即见效", type: "false_promise" as const, severity: "high" as const },
  { word: "永久", type: "false_promise" as const, severity: "medium" as const },
  { word: "保证", type: "false_promise" as const, severity: "medium" as const },
  { word: "承诺", type: "false_promise" as const, severity: "medium" as const },
  { word: "无效退款", type: "false_promise" as const, severity: "high" as const },
  { word: "零风险", type: "false_promise" as const, severity: "high" as const },
];

// 平台敏感词（得物/小红书限流词）
const PLATFORM_SENSITIVE_WORDS = [
  { word: "微信", type: "platform_sensitive" as const, severity: "medium" as const, suggestion: "避免提及竞品平台" },
  { word: "淘宝", type: "platform_sensitive" as const, severity: "medium" as const, suggestion: "避免提及竞品平台" },
  { word: "天猫", type: "platform_sensitive" as const, severity: "medium" as const, suggestion: "避免提及竞品平台" },
  { word: "京东", type: "platform_sensitive" as const, severity: "medium" as const, suggestion: "避免提及竞品平台" },
  { word: "拼多多", type: "platform_sensitive" as const, severity: "medium" as const, suggestion: "避免提及竞品平台" },
  { word: "抖音", type: "platform_sensitive" as const, severity: "low" as const, suggestion: "避免提及竞品平台" },
  { word: "快手", type: "platform_sensitive" as const, severity: "low" as const, suggestion: "避免提及竞品平台" },
  { word: "链接", type: "platform_sensitive" as const, severity: "low" as const, suggestion: "避免直接提及链接" },
  { word: "购买链接", type: "platform_sensitive" as const, severity: "high" as const, suggestion: "禁止直接放购买链接" },
  { word: "点击购买", type: "platform_sensitive" as const, severity: "high" as const, suggestion: "禁止直接引导购买" },
];

// 品牌名空格规范检测
const BRAND_NAME_PATTERN = /([A-Z]{2,})\s*-\s*([A-Z]{2,})/g;

export function checkCompliance(text: string): ComplianceCheck {
  const violations: ComplianceViolation[] = [];
  const warnings: string[] = [];

  // 1. 检测绝对化用语
  for (const item of ABSOLUTE_WORDS) {
    if (text.includes(item.word)) {
      violations.push({
        word: item.word,
        type: item.type,
        severity: item.severity,
        suggestion: `避免使用绝对化用语"${item.word}"，可改为"更""较""非常"等相对表述`,
      });
    }
  }

  // 2. 检测医疗功效宣称
  for (const item of MEDICAL_WORDS) {
    if (text.includes(item.word)) {
      violations.push({
        word: item.word,
        type: item.type,
        severity: item.severity,
        suggestion: `非医疗产品避免使用"${item.word}"，可改为"帮助""改善""提升"等表述`,
      });
    }
  }

  // 3. 检测虚假承诺
  for (const item of FALSE_PROMISE_WORDS) {
    if (text.includes(item.word)) {
      violations.push({
        word: item.word,
        type: item.type,
        severity: item.severity,
        suggestion: `避免虚假承诺"${item.word}"，可改为客观描述`,
      });
    }
  }

  // 4. 检测平台敏感词
  for (const item of PLATFORM_SENSITIVE_WORDS) {
    if (text.includes(item.word)) {
      violations.push({
        word: item.word,
        type: item.type,
        severity: item.severity,
        suggestion: item.suggestion,
      });
    }
  }

  // 5. 检测品牌名格式（需要空格分隔）
  const brandMatches = text.match(BRAND_NAME_PATTERN);
  if (brandMatches) {
    for (const match of brandMatches) {
      // 检查是否已经有正确的空格格式
      if (!/\s+-\s+/.test(match)) {
        warnings.push(`品牌名"${match}"建议使用空格分隔，如"${match.replace(/-/g, " - ")}"`);
      }
    }
  }

  // 6. 检测 URL（得物禁止）
  const urlPattern = /https?:\/\/[^\s]+/g;
  if (urlPattern.test(text)) {
    violations.push({
      word: "URL链接",
      type: "platform_sensitive",
      severity: "high",
      suggestion: "得物平台禁止在正文中出现URL链接",
    });
  }

  const pass = violations.filter((v) => v.severity === "high").length === 0;

  return {
    pass,
    violations,
    warnings,
  };
}

/**
 * 获取合规性检测摘要
 */
export function getComplianceSummary(check: ComplianceCheck): string {
  if (check.pass && check.violations.length === 0) {
    return "✓ 合规性检测通过";
  }

  const highCount = check.violations.filter((v) => v.severity === "high").length;
  const mediumCount = check.violations.filter((v) => v.severity === "medium").length;
  const lowCount = check.violations.filter((v) => v.severity === "low").length;

  const parts: string[] = [];
  if (highCount > 0) parts.push(`${highCount}个高风险`);
  if (mediumCount > 0) parts.push(`${mediumCount}个中风险`);
  if (lowCount > 0) parts.push(`${lowCount}个低风险`);

  return `⚠ 发现${parts.join("、")}${check.warnings.length > 0 ? `，${check.warnings.length}个警告` : ""}`;
}
