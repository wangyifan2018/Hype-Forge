import type { IntelAutoScope, IntelDiscoveryMode } from "@/lib/forge/intel-discovery";
import type { HotTrendCard } from "@/lib/forge/types";

export const PRODUCT_SCOUT_SYSTEM = `你是得物平台带货情报分析师，精通消费者心理学和病毒传播机制。使用联网搜索归纳「近期可能在得物社区高热」的单品方向，供创作者去 App 内搜索验证。

## 病毒传播心理学原理
爆款单品之所以病毒式传播，是因为它们命中了特定的心理触发器：
- identity（身份认同）：产品是身份标签，"穿这个=我是这类人"
- novelty（新奇感）：前所未见的设计、配色、联名，激发探索欲
- community（社区归属）：圈层标配、"我们圈子都穿这个"
- emotion（情绪触发）：美感、欲望、"我也想要这种感觉"
- fomo（错失恐惧）：限量、季节款、"错过就没了"
- social_proof（社交认证）：创作者同款、社区热款、"大家都在穿"
- transformation（蜕变故事）：穿搭改造、从路人到焦点
- nostalgia（怀旧情绪）：复古款、经典复刻、集体记忆
- aspiration（向往感）：理想生活方式的符号
- belonging（归属感）：圈层认同、"这是我们圈子的标配"

## 病毒传播潜力评分（viralPotential 1-100）
- 90-100：强身份认同 + 高情绪触发 + 低竞争 + 明确心理触发器
- 70-89：多个心理触发器 + 社区讨论热度 + 可执行性强
- 50-69：有一定热度但心理触发不够强烈或竞争较大
- <50：心理触发弱或已过高峰

## 输出格式
只输出合法 JSON，不要 markdown 代码块：
{
  "leads": [
    {
      "id": "英文slug",
      "name": "商品/品类名称（具体款型或系列）",
      "category": "球鞋/潮穿/数码/美妆等",
      "heatScore": 88,
      "searchKeywords": ["得物搜索词1", "搜索词2"],
      "contentAngle": "一句话种草角度",
      "whyHot": "2-3句：为何此刻值得做（结合近期话题/季节/社区讨论，勿编造销量数字）",
      "creativeHooks": ["创意角度1", "创意角度2", "创意角度3"],
      "verifySteps": ["在得物App搜索xxx", "看想要人数/评论", "保存主图并复制分享链接"],
      "competitionLevel": "低|中|高",
      "bestPostFormat": "单品种草|对比测评|合集清单",
      "priority": "high|medium|low",
      "note": "非官方榜单；需在得物App内验证；图片与链接请手动获取",
      "psychologyTriggers": ["identity|novelty|community|emotion|fomo|social_proof|transformation|nostalgia|aspiration|belonging"],
      "viralPotential": 82,
      "sources": ["来源名｜URL 或话题/榜单名｜日期，如：得物社区｜#夏日球鞋｜2026-06-11"],
      "emotionalHook": "一句话情绪钩子，描述用户看到这个单品时的微情绪反应（如'这就是我想要的'或'穿上这个我就是焦点'）"
    }
  ]
}

## 要求
- 输出 4-6 条 leads；优先推荐 competitionLevel=低 且 priority=high 的款
- 禁止编造具体商品URL、推广链接、价格、销量、鉴定编号
- 每条线索给出 sources（至少 1 条，含来源名与日期）；确实检索不到就减少条数，不要编造来源
- creativeHooks 要可执行、适合拍 3-6 张图发社区
- verifySteps 必须是用户在得物 App 内能完成的动作
- 每个单品必须标注 psychologyTriggers（1-3 个最相关的心理触发器）
- 每个单品必须给出 viralPotential（1-100 病毒传播潜力分）
- emotionalHook 要精准描述用户看到单品时的微情绪反应时刻
- 优先推荐 viralPotential >= 70 的单品`;

export function buildProductScoutUserPrompt(
  categoryHint?: string,
  options?: {
    categoryLabel?: string;
    selectedTrend?: HotTrendCard | null;
    discoveryMode?: IntelDiscoveryMode;
    autoScope?: IntelAutoScope;
  }
): string {
  const defaultHint =
    process.env.FORGE_TREND_QUERY ??
    "得物 热门球鞋 潮穿 爆款 热搜 2026";
  const hint = categoryHint?.trim() || defaultHint;
  const today = new Date().toISOString().slice(0, 10);
  const trend = options?.selectedTrend;

  const mode = options?.discoveryMode ?? "manual";
  const autoScope = options?.autoScope ?? "category";
  
  // 提取趋势的心理触发器信息
  const trendPsychBlock = trend && trend.psychologyTriggers && trend.psychologyTriggers.length > 0
    ? `\n该趋势的心理触发器：${trend.psychologyTriggers.join("、")}
建议寻找能命中相同心理触发器的单品，形成趋势+单品的心理共振。`
    : "";
  
  const trendViralBlock = trend && trend.viralPotential
    ? `\n该趋势的病毒传播潜力：${trend.viralPotential}/100
优先寻找病毒潜力 >= 该分数的单品。`
    : "";

  const trendBlock = trend
    ? `
已选场景趋势（${mode === "auto" ? "爆款可与此氛围呼应，也可跨品类" : "爆款须与此氛围一致"}）：
- 标题：${trend.title}
- 种草角度：${trend.hookAngle}
- 场景关键词：${trend.keywords.join("、")}
${"whyNow" in trend && trend.whyNow ? `- 为何现在：${(trend as HotTrendCard & { whyNow?: string }).whyNow}` : ""}
${"suggestedScoutKeywords" in trend ? `- 建议搜：${((trend as HotTrendCard & { suggestedScoutKeywords?: string[] }).suggestedScoutKeywords ?? []).join("、")}` : ""}
${trend.psychologyTriggers && trend.psychologyTriggers.length > 0 ? `- 心理触发器：${trend.psychologyTriggers.join("、")}` : ""}
${trend.viralPotential ? `- 病毒潜力：${trend.viralPotential}/100` : ""}
${trend.emotionalHook ? `- 情绪钩子：${trend.emotionalHook}` : ""}${trendPsychBlock}${trendViralBlock}`
    : "";

  const modeBlock =
    mode === "auto" && autoScope === "open"
      ? `模式：全站爆款线索（不限品类 · 可参考抖音/小红书带火方向）
- 联网结合抖音、小红书、得物社区近期讨论，归纳可能在得物高热验证的单品方向
- 输出 5-6 条 leads，至少 4 个不同 category；禁止 6 条全是球鞋
- whyHot 可注明外站话题来源；优先 competitionLevel=低、priority=high
- 每个单品必须分析其心理触发器（psychologyTriggers）和病毒传播潜力（viralPotential）
- emotionalHook 要精准描述用户看到单品时的微情绪反应`
      : mode === "auto"
        ? `模式：智能搜索爆款（跨品类，可略侧重主营）
- 输出 5-6 条 leads，至少覆盖 3 个不同 category
- 不要 6 条全是球鞋；优先 competitionLevel=低、priority=high
- 每个单品必须分析其心理触发器和病毒传播潜力
- 优先推荐 viralPotential >= 70 的单品`
        : `模式：线索定向
- 输出 4-6 条 leads，紧扣搜索方向
- 若有已选场景，leads 须能拍进该场景
- 分析每个单品的心理触发器和病毒潜力`;

  const scopeLabel =
    mode === "auto" && autoScope === "open"
      ? "全站（抖音+小红书+得物，不限品类）"
      : options?.categoryLabel ?? "潮流通用";

  return `检索日期参考：${today}
情报范围：${scopeLabel}
搜索方向：${hint}
${trendBlock}

${modeBlock}

请联网搜索并归纳得物社区可能高热的带货单品线索（偏具体款/配色/系列，不是泛泛场景）。
强调「近期」讨论，不要输出购买链接。

重点：每个单品必须从消费者心理学角度分析——
1. psychologyTriggers：这个单品命中了哪些心理触发器？（identity/novelty/community/emotion/fomo/social_proof/transformation/nostalgia/aspiration/belonging）
2. viralPotential：综合心理触发强度、竞争度、趋势契合度，给出 1-100 的病毒传播潜力分
3. emotionalHook：用户看到这个单品时，脑海中闪过的微情绪反应是什么？

${trend ? `心理共振策略：该趋势已命中【${trend.psychologyTriggers?.join("、") ?? "未标注"}】触发器，优先寻找能命中相同触发器的单品，形成趋势+单品的心理共振，最大化病毒传播潜力。` : ""}`;
}
