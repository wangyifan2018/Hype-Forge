import type { IntelAutoScope, IntelDiscoveryMode } from "@/lib/forge/intel-discovery";
import type { Platform } from "@/lib/forge/types";

export const TREND_RADAR_SYSTEM = `你是得物/潮流电商内容运营专家，精通消费者心理学和病毒传播机制。请结合近期网络热点，为给定品类生成可落地的带货「场景趋势」卡片。

## 病毒传播心理学原理
爆款不是偶然，而是特定心理公式的结果：情绪驱动行动、身份认同强化、社区归属感、新奇感刺激。2026年，产品必须同时命中多个心理触发点才能病毒式传播。

## 核心心理触发器（每个趋势必须标注 1-3 个）
- identity（身份认同）：用户购买是为了讲述"我是谁"的故事，产品是身份标签
- novelty（新奇感）：前所未见、独特、打破常规，激发探索欲
- community（社区归属）：小圈子认同、创作者社区、"我们这类人"的归属感
- emotion（情绪触发）：美感、愉悦、欲望的微瞬间，直觉脑先于逻辑脑决策
- fomo（错失恐惧）：稀缺性、时效性、"错过就没了"的紧迫感
- social_proof（社交认证）：创作者同款、社区热款、"大家都在用"
- transformation（蜕变故事）：从路人到焦点、使用前后的对比变化
- nostalgia（怀旧情绪）：文化时机、复古浪潮、季节情绪、集体记忆
- aspiration（向往感）：理想生活方式、想成为的人、向上社交的符号
- belonging（归属感）：圈层认同、"这是我们圈子的标配"

## 病毒传播潜力评分（viralPotential 1-100）
- 90-100：强身份认同 + 高情绪触发 + 低饱和度 + emerging/rising 阶段
- 70-89：明确心理触发器 + 社区讨论热度 + 可执行性强
- 50-69：有一定热度但心理触发不够强烈或竞争较大
- <50：心理触发弱或已过高峰

## 输出格式
只输出合法 JSON，不要 markdown 代码块：
{
  "trends": [
    {
      "id": "唯一英文slug",
      "title": "中文趋势标题",
      "heatScore": 1-100,
      "keywords": ["关键词1", "关键词2"],
      "sceneEn": "英文场景描述供 FLUX 生图",
      "sceneZh": "中文背景替换场景描述",
      "hookAngle": "一句话种草角度",
      "whyNow": "2句说明为何此刻适合跟这个场景",
      "suggestedScoutKeywords": ["用于下一步搜爆款单品的得物搜索词1", "搜索词2"],
      "lifecycleStage": "emerging|rising|peak|declining",
      "trendVelocity": "accelerating|stable|decelerating",
      "saturationLevel": "low|medium|high",
      "bestPostWindow": "建议发布时间窗口，如「本周内发布最佳」",
      "officialTopicMatch": "得物官方话题/挑战赛名称（若有，否则省略）",
      "psychologyTriggers": ["identity|novelty|community|emotion|fomo|social_proof|transformation|nostalgia|aspiration|belonging"],
      "viralPotential": 1-100,
      "emotionalHook": "一句话情绪钩子，描述用户看到这个趋势时的微情绪反应（如'这就是我'或'我也想要这种感觉'）"
    }
  ]
}

## 要求
- 输出 3-5 条 trends；heatScore 反映当下热度
- lifecycleStage：emerging=刚冒头竞争少 / rising=快速上升 / peak=最热但竞争大 / declining=已过高峰
- 得物场景优先球鞋、潮穿、数码桌搭、配饰等
- suggestedScoutKeywords 要具体、可在得物 App 搜索
- 禁止虚构商品链接或价格；禁止敏感政治内容
- 场景需适合商品主图换背景
- 每个趋势必须标注 psychologyTriggers（1-3 个）和 viralPotential
- emotionalHook 要能引发"这就是我"或"我也想要"的微情绪反应
- 优先推荐 viralPotential >= 70 的趋势`;

export function buildTrendRadarUserPrompt(
  platform: Platform,
  categoryHint?: string,
  categoryLabel?: string,
  discoveryMode: IntelDiscoveryMode = "manual",
  autoScope: IntelAutoScope = "category"
): string {
  const platformLabel = platform === "xiaohongshu" ? "小红书" : "得物";
  const defaultQuery =
    process.env.FORGE_TREND_QUERY ??
    "得物 热门球鞋 潮穿 好物 社区热搜 2026";
  const hint = categoryHint?.trim() || defaultQuery;
  const today = new Date().toISOString().slice(0, 10);

  const modeBlock =
    discoveryMode === "auto" && autoScope === "open"
      ? `模式：全站热点（不限主营品类 · 跨平台）
- 联网检索抖音、小红书、得物等近期热搜/话题/挑战/笔记趋势
- 归纳为适合在${platformLabel}跟进的带货「场景趋势」（氛围/话题/拍照方向，不是 SKU 清单）
- 输出 4-5 条 trends，至少覆盖 4 个不同赛道；禁止 5 条全是同一品类（如全是球鞋）
- whyNow 须点明热点来源（如「抖音××话题」「小红书××笔记体」）
- 优先 emerging/rising 且 saturationLevel=低
- 每条趋势必须分析其心理触发器（psychologyTriggers）和病毒传播潜力（viralPotential）
- emotionalHook 要精准描述用户的微情绪反应时刻`
      : discoveryMode === "auto"
        ? `模式：智能搜索（跨品类，可略侧重主营）
- 不要只输出球鞋；须跨品类覆盖（至少 3 个不同赛道）
- 优先 emerging/rising 且 saturationLevel=低
- 输出 4-5 条 trends
- 每条趋势必须分析其心理触发器和病毒传播潜力
- emotionalHook 要能引发身份认同或向往感`
        : `模式：线索定向
- 紧扣搜索方向与主营品类
- 输出 3-5 条 trends
- 分析每条趋势的心理触发器和病毒潜力`;

  const scopeLabel =
    discoveryMode === "auto" && autoScope === "open"
      ? "全站（抖音+小红书+得物，不限品类）"
      : categoryLabel ?? "潮流通用";

  return `检索日期：${today}
目标平台（内容落地）：${platformLabel}
情报范围：${scopeLabel}
搜索方向：${hint}

${modeBlock}

请联网搜索并归纳当前适合${platformLabel}的带货场景趋势。
每条 trend 须标注 lifecycleStage、trendVelocity、saturationLevel、bestPostWindow；若有得物官方话题请写 officialTopicMatch。
每条 trend 的 suggestedScoutKeywords 将用于下一步「爆款线索」搜索，务必具体可搜。

重点：每条趋势必须从消费者心理学角度分析——
1. psychologyTriggers：这个趋势命中了哪些心理触发器？（identity/novelty/community/emotion/fomo/social_proof/transformation/nostalgia/aspiration/belonging）
2. viralPotential：综合心理触发强度、饱和度、生命周期阶段，给出 1-100 的病毒传播潜力分
3. emotionalHook：用户看到这个趋势时，脑海中闪过的微情绪反应是什么？`;
}
