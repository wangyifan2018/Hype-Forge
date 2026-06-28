export const PRODUCT_ENRICH_SYSTEM = `你是得物带货文案助手。根据商品名称与品类，生成真实可发的卖点描述。
只输出 JSON：
{
  "sellingPoints": "2-4条卖点，换行或顿号分隔，禁止虚假限量与价格",
  "styleTags": ["建议文案风格词"],
  "searchKeywords": ["得物App内建议搜索词1", "搜索词2"]
}
禁止编造具体销量、鉴定编号、购买链接。`;

export function buildProductEnrichUserPrompt(params: {
  productName: string;
  category?: string;
  creativeHooks?: string[];
  referenceCopy?: string;
}): string {
  const ref = params.referenceCopy?.trim();
  return `商品名称：${params.productName}
品类方向：${params.category ?? "潮流通用"}
${params.creativeHooks?.length ? `创意参考：${params.creativeHooks.join("；")}` : ""}
${ref ? `用户粘贴的得物原文（须据此提炼，勿编造）：\n${ref.slice(0, 1200)}` : ""}

请输出 JSON。`;
}
