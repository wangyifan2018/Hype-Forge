import type { PostedRecord } from "@/lib/forge/local-store";
import type { EngagementMetrics } from "@/lib/forge/local-store";

/**
 * 爆款判定阈值
 */
export const HIT_THRESHOLDS = {
  // 得物平台
  dewu: {
    likes: 50,
    comments: 10,
    shares: 5,
    engagementRate: 0.05, // 5% 互动率
  },
  // 小红书平台
  xiaohongshu: {
    likes: 100,
    comments: 20,
    saves: 30,
    engagementRate: 0.08, // 8% 互动率
  },
};

/**
 * 计算互动率
 */
export function calculateEngagementRate(
  engagement: EngagementMetrics,
  views?: number
): number {
  if (!views || views === 0) return 0;
  const totalEngagement =
    engagement.likes + engagement.comments + engagement.shares + engagement.saves;
  return totalEngagement / views;
}

/**
 * 判定是否为爆款
 */
export function isHitPost(post: PostedRecord): boolean {
  if (!post.engagement) return false;

  const platform = post.platform || "dewu";
  const thresholds = HIT_THRESHOLDS[platform as keyof typeof HIT_THRESHOLDS];
  const { engagement } = post;

  // 基础指标判定
  const meetsBasicThreshold =
    engagement.likes >= thresholds.likes ||
    engagement.comments >= thresholds.comments ||
    (platform === "xiaohongshu" &&
      "saves" in thresholds &&
      engagement.saves >= (thresholds as typeof HIT_THRESHOLDS.xiaohongshu).saves);

  // 互动率判定（如果有浏览量数据）
  const engagementRate = calculateEngagementRate(engagement, engagement.views);
  const meetsEngagementRate =
    engagement.views > 0 && engagementRate >= thresholds.engagementRate;

  return meetsBasicThreshold || meetsEngagementRate;
}

/**
 * 策略模式分析结果
 */
export interface StrategyPattern {
  framework: string;
  successCount: number;
  avgEngagement: number;
  hitRate: number;
  recommendation: string;
}

/**
 * 分析历史数据，提取成功策略模式
 */
export function analyzeStrategyPatterns(
  posts: PostedRecord[]
): StrategyPattern[] {
  // 按框架分组
  const frameworkGroups = posts.reduce(
    (acc, post) => {
      const framework = post.hookFramework || "unknown";
      if (!acc[framework]) {
        acc[framework] = [];
      }
      acc[framework].push(post);
      return acc;
    },
    {} as Record<string, PostedRecord[]>
  );

  // 分析每个框架的表现
  const patterns: StrategyPattern[] = Object.entries(frameworkGroups).map(
    ([framework, groupPosts]) => {
      const hitPosts = groupPosts.filter(isHitPost);
      const successCount = hitPosts.length;
      const hitRate = groupPosts.length > 0 ? successCount / groupPosts.length : 0;

      // 计算平均互动量
      const totalEngagement = groupPosts.reduce((sum, post) => {
        if (!post.engagement) return sum;
        return (
          sum +
          post.engagement.likes +
          post.engagement.comments +
          post.engagement.shares +
          post.engagement.saves
        );
      }, 0);
      const avgEngagement =
        groupPosts.length > 0 ? totalEngagement / groupPosts.length : 0;

      // 生成推荐语
      let recommendation = "";
      if (hitRate >= 0.5 && successCount >= 2) {
        recommendation = `⭐ 强烈推荐：${framework} 框架爆款率 ${Math.round(hitRate * 100)}%，平均互动 ${Math.round(avgEngagement)}`;
      } else if (hitRate >= 0.3 && successCount >= 1) {
        recommendation = `✅ 推荐使用：${framework} 框架表现良好，爆款率 ${Math.round(hitRate * 100)}%`;
      } else if (avgEngagement > 50) {
        recommendation = `💡 可尝试：${framework} 框架平均互动较高 (${Math.round(avgEngagement)})`;
      } else {
        recommendation = `⚠️ 谨慎使用：${framework} 框架数据表现一般`;
      }

      return {
        framework,
        successCount,
        avgEngagement,
        hitRate,
        recommendation,
      };
    }
  );

  // 按爆款率排序
  return patterns.sort((a, b) => b.hitRate - a.hitRate);
}

/**
 * 生成 ICL (In-Context Learning) 样本
 * 从历史爆款中提取关键元素，用于 prompt 注入
 */
export interface ICLSample {
  title: string;
  hookPattern: string;
  emotionalCore: string;
  keyPhrases: string[];
  framework: string;
}

/**
 * 从爆款帖子中提取 ICL 样本
 */
export function extractICLSamples(posts: PostedRecord[]): ICLSample[] {
  const hitPosts = posts.filter(isHitPost);

  return hitPosts.slice(0, 3).map((post) => {
    // 提取标题
    const title = post.title || post.productName;

    // 提取钩子模式（从标题推断）
    let hookPattern = "通用";
    if (/\d+/.test(title)) {
      hookPattern = "数字冲击";
    } else if (/[？?]/.test(title)) {
      hookPattern = "悬念提问";
    } else if (/真的|绝了|闭眼入/.test(post.copySnippet || "")) {
      hookPattern = "情绪共鸣";
    } else if (/对比|vs|VS/.test(title)) {
      hookPattern = "反差对比";
    }

    // 提取情绪内核（简化版，实际应该用 NLP 分析）
    const emotionalCore = post.notes || "真实体验分享";

    // 提取关键短语
    const keyPhrases: string[] = [];
    const snippet = post.copySnippet || "";
    if (/真的/.test(snippet)) keyPhrases.push("真的");
    if (/绝了/.test(snippet)) keyPhrases.push("绝了");
    if (/闭眼入/.test(snippet)) keyPhrases.push("闭眼入");
    if (/谁懂/.test(snippet)) keyPhrases.push("谁懂");
    if (/上脚/.test(snippet)) keyPhrases.push("上脚体验");
    if (/入手/.test(snippet)) keyPhrases.push("入手感受");

    return {
      title,
      hookPattern,
      emotionalCore,
      keyPhrases,
      framework: post.hookFramework || "unknown",
    };
  });
}

/**
 * 生成 ICL prompt 注入块
 */
export function buildICLBlock(samples: ICLSample[]): string {
  if (samples.length === 0) return "";

  const lines = [
    "【历史爆款参考】",
    "以下是你过往创作的爆款案例，请参考其钩子模式与情绪表达：",
    "",
  ];

  samples.forEach((sample, idx) => {
    lines.push(`${idx + 1}. 标题：${sample.title}`);
    lines.push(`   钩子模式：${sample.hookPattern}`);
    lines.push(`   情绪内核：${sample.emotionalCore}`);
    if (sample.keyPhrases.length > 0) {
      lines.push(`   关键短语：${sample.keyPhrases.join("、")}`);
    }
    lines.push("");
  });

  lines.push("请在创作时借鉴以上爆款的钩子技巧与真实感表达。");

  return lines.join("\n");
}

/**
 * 完整的策略学习流程
 */
export function learnFromHistory(posts: PostedRecord[]): {
  patterns: StrategyPattern[];
  iclBlock: string;
  topFramework: string | null;
} {
  const patterns = analyzeStrategyPatterns(posts);
  const iclSamples = extractICLSamples(posts);
  const iclBlock = buildICLBlock(iclSamples);

  // 找出最佳框架
  const topFramework =
    patterns.length > 0 && patterns[0].hitRate >= 0.3
      ? patterns[0].framework
      : null;

  return {
    patterns,
    iclBlock,
    topFramework,
  };
}
