/**
 * 改稿偏好学习（从卖家的真实选择里学，不依赖任何模型调用）。
 *
 * 目前可用的真实信号只有两类（终端没有自由编辑框）：
 *   1) 使用哪个 Remix 选项：更短 / 更炸 / 更专业 / 换标题
 *   2) 在候选标题里点了哪一条（可对比它与其余候选的特征差异）
 *
 * 学习结果是一小组**可解释**的偏好规则（而不是黑箱权重），
 * 命中次数达到阈值后才注入 prompt，避免被一次误操作带偏。
 */

export type PreferenceSignal =
  | {
      kind: "remix";
      option: "shorter" | "hookier" | "more_professional" | "regenerate_titles";
    }
  | { kind: "title_choice"; chosen: string; alternatives: string[] };

export type PreferenceProfile = {
  version: 1;
  /** ruleId → 命中次数 */
  counts: Record<string, number>;
  samples: number;
  lastUpdatedAt: string;
};

export const EMPTY_PROFILE: PreferenceProfile = {
  version: 1,
  counts: {},
  samples: 0,
  lastUpdatedAt: new Date(0).toISOString(),
};

/** 命中几次后才认为这是稳定的偏好 */
export const PREFERENCE_MIN_COUNT = 2;

const REMIX_RULE: Record<string, { id: string; hint: string }> = {
  shorter: {
    id: "remix.shorter",
    hint: "文案尽量更短、节奏更快（你多次选择「更短」）",
  },
  hookier: {
    id: "remix.hookier",
    hint: "首句钩子更冲、更直接（你多次选择「更炸」）",
  },
  more_professional: {
    id: "remix.more_professional",
    hint: "语气更专业克制、少夸张（你多次选择「更专业」）",
  },
  regenerate_titles: {
    id: "remix.retitle",
    hint: "标题可以多给几种风格备选（你常点「换标题」）",
  },
};

const TITLE_RULES: Record<string, { id: string; hint: string }> = {
  shorter: { id: "title.shorter", hint: "标题偏短（你选标题时倾向更短的一条）" },
  longer: { id: "title.longer", hint: "标题信息量更足（你倾向更长的一条）" },
  no_emoji: { id: "title.no_emoji", hint: "标题尽量少用或不用 emoji" },
  with_emoji: { id: "title.with_emoji", hint: "标题可以带 emoji" },
  with_number: { id: "title.with_number", hint: "标题里带具体数字" },
  with_question: { id: "title.with_question", hint: "标题用疑问句制造悬念" },
};

/** 中文标题里的疑问语气：问号或常见疑问词（"这双值得买吗"这类没有问号也算） */
function isQuestionLike(text: string): boolean {
  return /[？?]|吗|呢|怎么|为什么|哪|谁/.test(text);
}

/**
 * 统计 emoji 个数。
 * 项目 tsconfig target 为 ES5（不支持 \p{...} 的 u 标志），
 * 因此用代理对范围近似统计：能覆盖 🔥😮‍💨 这类 astral emoji，
 * 对 ❤️ 这类 BMP+变体选择符会漏计——用于"有无 emoji"的偏好判断足够。
 */
function emojiCount(text: string): number {
  const matches = text.match(/[\ud800-\udbff][\udc00-\udfff]/g);
  return matches?.length ?? 0;
}

/**
 * 从"选了哪条标题"推断偏好：只有所选标题在某个特征上**优于/劣于全部备选**
 * 时才产生规则（避免把随机点击当偏好）。
 */
export function titleChoiceRules(
  chosen: string,
  alternatives: string[]
): string[] {
  if (!chosen.trim() || alternatives.length === 0) return [];
  const others = alternatives.filter((t) => t.trim() && t !== chosen);
  if (others.length === 0) return [];

  const rules: string[] = [];
  const allShorter = others.every((t) => t.length <= chosen.length * 0.9);
  const allLonger = others.every((t) => t.length >= chosen.length * 1.1);
  if (allShorter) rules.push(TITLE_RULES.longer.id);
  if (allLonger) rules.push(TITLE_RULES.shorter.id);

  const chosenEmoji = emojiCount(chosen);
  if (chosenEmoji === 0 && others.every((t) => emojiCount(t) > 0)) {
    rules.push(TITLE_RULES.no_emoji.id);
  } else if (chosenEmoji > 0 && others.every((t) => emojiCount(t) === 0)) {
    rules.push(TITLE_RULES.with_emoji.id);
  }

  if (
    /\d/.test(chosen) &&
    others.every((t) => !/\d/.test(t))
  ) {
    rules.push(TITLE_RULES.with_number.id);
  }
  if (isQuestionLike(chosen) && others.every((t) => !isQuestionLike(t))) {
    rules.push(TITLE_RULES.with_question.id);
  }

  return rules;
}

export function rulesForSignal(signal: PreferenceSignal): string[] {
  if (signal.kind === "remix") {
    const rule = REMIX_RULE[signal.option];
    return rule ? [rule.id] : [];
  }
  return titleChoiceRules(signal.chosen, signal.alternatives);
}

export function applySignal(
  profile: PreferenceProfile,
  signal: PreferenceSignal,
  now: Date = new Date()
): PreferenceProfile {
  const rules = rulesForSignal(signal);
  if (rules.length === 0) return profile;

  const counts = { ...profile.counts };
  for (const rule of rules) {
    counts[rule] = (counts[rule] ?? 0) + 1;
  }
  return {
    version: 1,
    counts,
    samples: profile.samples + 1,
    lastUpdatedAt: now.toISOString(),
  };
}

const RULE_HINTS: Record<string, string> = {
  ...Object.fromEntries(
    Object.values(REMIX_RULE).map((r) => [r.id, r.hint])
  ),
  ...Object.fromEntries(Object.values(TITLE_RULES).map((r) => [r.id, r.hint])),
};

/** 达到阈值的偏好，转成可注入 prompt 的中文提示（最多 max 条，按命中次数排序） */
export function buildPreferenceHints(
  profile: PreferenceProfile | null | undefined,
  minCount: number = PREFERENCE_MIN_COUNT,
  max = 5
): string[] {
  if (!profile) return [];
  return Object.entries(profile.counts)
    .filter(([id, count]) => count >= minCount && RULE_HINTS[id])
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([id]) => RULE_HINTS[id]);
}

export function profileRuleSummary(
  profile: PreferenceProfile | null | undefined,
  minCount: number = PREFERENCE_MIN_COUNT
): { id: string; hint: string; count: number }[] {
  if (!profile) return [];
  return Object.entries(profile.counts)
    .filter(([id, count]) => count >= minCount && RULE_HINTS[id])
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id, hint: RULE_HINTS[id], count }));
}
