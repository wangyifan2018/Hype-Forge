export const VISION_SYSTEM = `你是一位得物/潮流电商视觉分析师。根据用户上传的商品图，提取可用于爆款文案与生图的结构化信息。
只输出合法 JSON，不要 markdown 代码块，不要额外说明。JSON 字段：
{
  "category": "商品品类",
  "colors": ["主色1", "主色2"],
  "material": "材质/工艺",
  "visualFeatures": "外观特征一句话",
  "suggestedHooks": ["卖点钩子1", "卖点钩子2", "卖点钩子3"],
  "style": "streetwear|minimal|sporty|vintage|techwear|casual（穿搭风格，可选）",
  "targetAudience": "最可能购买人群（年龄/性别/兴趣，可选）",
  "conditionQuality": "high|medium|low（图片清晰度与可用性，可选）",
  "functionalBenefits": ["功能利益点，如厚底增高、透气网面"],
  "emotionalBenefits": ["情绪价值，如自信、潮流认同"],
  "socialBenefits": ["社交价值，如上脚被问链接、朋友圈出片"],
  "brandSignals": ["识别到的品牌/联名/设计师信号"],
  "seasonFit": "季节适配说明（可选）"
}
禁止编造未在图中可见的款号、价格、销量。`;

export function buildVisionUserPrompt(
  imageCount = 1,
  keywords?: string[]
): string {
  const keywordHint =
    keywords && keywords.length > 0
      ? `\n\n重点关注的关键词：${keywords.join("、")}`
      : "";

  if (imageCount <= 1) {
    return `请分析这张商品图，输出上述 JSON。${keywordHint}`;
  }
  return `请综合分析以下 ${imageCount} 张商品图（含主图与细节/角度），综合颜色、材质与外观特征，输出上述 JSON。${keywordHint}`;
}
