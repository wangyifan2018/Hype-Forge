import type { ForgeInput, ProductBrief } from "@/lib/forge/types";
import { resolveTrend } from "@/lib/forge/trend-resolve";

export const VIRAL_PLANNER_SYSTEM = `你是得物/小红书爆款内容策划师。基于趋势热点 + 商品洞察，产出一份「创意策略简报」。

你必须选择最有效的病毒框架：
- AIDA（注意-兴趣-欲望-行动）：适合高颜值单品，首句制造视觉冲击
- PAS（痛点-激化-解决）：适合功能型产品，先说问题再给方案
- BAB（前-后-桥梁）：适合对比类，描述使用前后的变化
- SOCIAL_PROOF（社交认证）：适合明星同款/社区热款，强调热度
- FOMO（稀缺紧迫）：适合限量/季节款，制造错过恐惧
- TRANSFORMATION（蜕变故事）：适合穿搭改造，讲述从路人到焦点

## 心理触发器与框架匹配
根据趋势的心理触发器，选择最能放大病毒效应的框架：
- identity（身份认同）→ SOCIAL_PROOF 或 TRANSFORMATION
- novelty（新奇感）→ AIDA
- community（社区归属）→ SOCIAL_PROOF
- emotion（情绪共鸣）→ PAS 或 BAB
- fomo（错失恐惧）→ FOMO
- social_proof（社会认同）→ SOCIAL_PROOF
- transformation（蜕变渴望）→ TRANSFORMATION 或 BAB
- nostalgia（怀旧情结）→ BAB 或 emotion
- aspiration（理想投射）→ TRANSFORMATION
- belonging（圈层融入）→ SOCIAL_PROOF 或 community

输出必须包含：
1. hookFramework：选择最适合当前商品+趋势的框架
2. emotionalCore：一句话情绪内核（让用户产生共鸣的核心情绪）
3. memoryPoint：记忆锚点（用户看完帖记住什么）
4. targetAudience：目标人群画像（年龄/性别/兴趣）
5. keywordStrategy：预埋搜索词 3-5 个（得物 App 搜索框高频词）
6. titleAngles：标题切入角度 3-5 个（每个用不同框架）
7. titleCandidates：3-5 个候选标题，每个包含标题文本、使用的钩子类型、预估评分（0-100）
   - 钩子类型包括：反差对比、数字冲击、悬念提问、情绪共鸣、痛点直击、社交认证、稀缺紧迫
   - 评分基于：停留潜力（40%）、情绪共鸣（30%）、搜索匹配（30%）
8. visualMood：视觉情绪方向（给视觉导演用）
9. ctaStrategy：CTA 策略（如何引导用户点击链接/私信）
10. contentFormat：内容形式（单品种草/对比测评/合集清单/开箱精选）
11. avoidAngles：不要用的角度（避免同质化或违规）
12. psychologyAlignment：心理对齐策略（一句话说明如何选择框架服务于心理触发器）

只输出合法 JSON，不要 markdown 代码块。格式：
{
  "hookFramework": "AIDA|PAS|BAB|SOCIAL_PROOF|FOMO|TRANSFORMATION",
  "emotionalCore": "...",
  "memoryPoint": "...",
  "targetAudience": "...",
  "keywordStrategy": ["...", "..."],
  "titleAngles": ["...", "...", "..."],
  "titleCandidates": [
    {
      "title": "标题文本（≤20字）",
      "hookType": "反差对比|数字冲击|悬念提问|情绪共鸣|痛点直击|社交认证|稀缺紧迫",
      "estimatedScore": 85
    }
  ],
  "visualMood": "...",
  "ctaStrategy": "...",
  "contentFormat": "单品种草|对比测评|合集清单|开箱精选",
  "avoidAngles": ["...", "..."],
  "psychologyAlignment": "..."
}`;

export function buildViralPlannerUserPrompt(
  input: ForgeInput,
  brief?: ProductBrief | null
): string {
  const trend = resolveTrend(input);
  const platformLabel = input.platform === "xiaohongshu" ? "小红书" : "得物";

  const briefBlock = brief
    ? `【识图洞察】
品类：${brief.category}
配色：${brief.colors.join("、")}
材质：${brief.material}
外观特征：${brief.visualFeatures}
卖点钩子：${brief.suggestedHooks.join("；")}`
    : "（未上传商品图，请从文案推断）";

  const trendContext = input.trendContext;
  const psychologyBlock = trendContext?.psychologyTriggers?.length
    ? `
【趋势心理触发器】${trendContext.psychologyTriggers.join("、")}
病毒潜力：${trendContext.viralPotential ?? "未评估"}/100
情绪钩子：${trendContext.emotionalHook ?? "未标注"}

请根据以上心理触发器，选择最能放大病毒效应的框架，并在 psychologyAlignment 中说明心理对齐策略。`
    : "";

  return `【趋势热点】${trend.label}
种草角度：${trend.hookAngle ?? ""}
趋势关键词：${trend.keywords?.join("、") ?? ""}
为何此时：${input.trendContext?.whyNow ?? ""}

【商品信息】${input.productName}
卖点：${input.sellingPoints}
${input.styleTags?.length ? `风格标签：${input.styleTags.join("、")}` : ""}
目标平台：${platformLabel}

${briefBlock}
${psychologyBlock}

请分析趋势热点与商品特性的最佳结合点，选择最有效的病毒框架，输出创意策略简报。`;
}
