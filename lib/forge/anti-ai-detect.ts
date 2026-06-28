/**
 * AI 味检测模块
 * 检测文案中的 AI 生成痕迹，帮助提升内容真实感
 */

export type AiFlavorDetection = {
  score: number; // 0-100，分数越高越像 AI 生成
  flagged: string[]; // 被标记的 AI 味表述
  suggestions: string[]; // 改进建议
};

// AI 味黑名单词库
export const AI_FLAVOR_BLACKLIST = [
  "综上所述",
  "值得注意的是",
  "不可否认",
  "总而言之",
  "在当今社会",
  "随着.*的发展",
  "众所周知",
  "毋庸置疑",
  "由此可见",
  "因此.*可以得出",
  "不仅.*而且",
  "一方面.*另一方面",
  "首先.*其次.*最后",
  "需要指出的是",
  "应该看到",
  "事实上",
  "实际上",
  "毫无疑问",
];

// 真实感标记词（得物/小红书社区用语）
const AUTHENTIC_MARKERS = [
  "绝了",
  "闭眼入",
  "真的会谢",
  "yyds",
  "绝绝子",
  "救命",
  "谁懂啊",
  "我直接",
  "拿到手",
  "上脚",
  "试了",
  "入手",
  "开箱",
  "实测",
  "亲测",
  "我的体验",
  "个人感受",
];

// 必须包含的具体细节类型
const REQUIRED_DETAILS = {
  numbers: /\d+/, // 具体数字（价格/尺寸/时间）
  personal: /(我|我的|我试|我入手|我拿到|上脚|实测|亲测)/, // 个人体验
  specific: /(这个|这款|这双|这件|今天|昨天|刚才)/, // 具体指代
};

export function detectAiFlavors(text: string): AiFlavorDetection {
  const flagged: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // 1. 检测黑名单词
  for (const word of AI_FLAVOR_BLACKLIST) {
    const regex = new RegExp(word, "g");
    const matches = text.match(regex);
    if (matches) {
      flagged.push(`禁用词: ${word} (${matches.length}次)`);
      score += matches.length * 8;
    }
  }

  // 2. 检测真实感标记词（反向计分）
  let authenticCount = 0;
  for (const marker of AUTHENTIC_MARKERS) {
    if (text.includes(marker)) {
      authenticCount++;
    }
  }
  score -= authenticCount * 5;

  // 3. 检查必须包含的细节
  const missingDetails: string[] = [];
  if (!REQUIRED_DETAILS.numbers.test(text)) {
    missingDetails.push("具体数字（价格/尺寸/时间）");
    score += 10;
  }
  if (!REQUIRED_DETAILS.personal.test(text)) {
    missingDetails.push("个人体验细节（我试了/拿到手/上脚）");
    score += 15;
  }
  if (!REQUIRED_DETAILS.specific.test(text)) {
    missingDetails.push("具体指代（这个/这款/这双）");
    score += 5;
  }

  if (missingDetails.length > 0) {
    suggestions.push(`建议补充: ${missingDetails.join("、")}`);
  }

  // 4. 检查段落长度（AI 生成倾向段落过长）
  const paragraphs = text.split(/\n\n+/);
  const longParagraphs = paragraphs.filter((p) => p.length > 200);
  if (longParagraphs.length > 0) {
    flagged.push(`段落过长 (${longParagraphs.length}个段落超过200字)`);
    score += longParagraphs.length * 5;
  }

  // 5. 检查 emoji 使用（AI 生成倾向 emoji 过少或过于规律）
  const emojiMatches = text.match(/[\ud800-\udbff][\udc00-\udfff]/g);
  const emojiCount = emojiMatches?.length ?? 0;
  if (emojiCount === 0) {
    flagged.push("缺少 emoji");
    score += 10;
  } else if (emojiCount < 3 && text.length > 300) {
    flagged.push("emoji 过少");
    score += 5;
  }

  // 6. 检查口语化程度
  const colloquialPatterns = /(啊|呀|嘛|呢|吧|哦|噢|嗯|哈哈|嘿嘿)/g;
  const colloquialMatches = text.match(colloquialPatterns);
  if (!colloquialMatches || colloquialMatches.length < 3) {
    suggestions.push("建议增加口语化表达（啊、呀、嘛、呢、吧）");
    score += 5;
  }

  // 归一化分数到 0-100
  score = Math.max(0, Math.min(100, score));

  // 生成建议
  if (score >= 70) {
    suggestions.unshift("AI 味过重，建议大幅改写");
  } else if (score >= 50) {
    suggestions.unshift("AI 味较明显，建议局部改写");
  } else if (score >= 30) {
    suggestions.unshift("有轻微 AI 痕迹，可优化");
  }

  return {
    score,
    flagged,
    suggestions,
  };
}

/**
 * 检测文案是否符合平台真实感要求
 */
export function checkAuthenticity(text: string): {
  pass: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // 必须包含具体数字
  if (!REQUIRED_DETAILS.numbers.test(text)) {
    reasons.push("缺少具体数字（价格/尺寸/时间）");
  }

  // 必须包含个人体验
  if (!REQUIRED_DETAILS.personal.test(text)) {
    reasons.push("缺少个人体验细节");
  }

  // 必须包含具体指代
  if (!REQUIRED_DETAILS.specific.test(text)) {
    reasons.push("缺少具体指代（这个/这款）");
  }

  // 必须包含口语化表达
  const colloquialPatterns = /(啊|呀|嘛|呢|吧|哦|噢|嗯)/g;
  if (!colloquialPatterns.test(text)) {
    reasons.push("缺少口语化表达");
  }

  // 必须包含 emoji
  const emojiPattern = /[\ud800-\udbff][\udc00-\udfff]/;
  if (!emojiPattern.test(text)) {
    reasons.push("缺少 emoji");
  }

  return {
    pass: reasons.length === 0,
    reasons,
  };
}
