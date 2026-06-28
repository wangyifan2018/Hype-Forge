/**
 * 关键词提取模块
 * 使用 nodejieba 进行中文分词和关键词提取
 * 注意：nodejieba 是原生模块，仅在服务端可用
 */

// 优雅降级：如果 nodejieba 加载失败，使用简单分词作为兜底
let jieba: typeof import("nodejieba") | null = null;
let jiebaLoadError: string | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  jieba = require("nodejieba");
} catch (e) {
  jiebaLoadError = e instanceof Error ? e.message : String(e);
  console.warn("[keyword-extractor] nodejieba 加载失败，将使用简单分词降级:", jiebaLoadError);
}

/**
 * 简单分词降级方案：按标点符号和空格切分
 */
function simpleSegment(text: string): string[] {
  return text
    .split(/[\s,，。.!！?？;；:：\-—_()（）\[\]【】{}｛｝<>＜＞\/\\|`~@#$%^&*+=]+/)
    .filter((w) => w.trim().length > 0);
}

/**
 * 中文分词
 * @param text 输入文本
 * @param mode 分词模式：'default' | 'full' | 'search'
 * @returns 分词结果数组
 */
export function segment(
  text: string,
  mode: "default" | "full" | "search" = "default"
): string[] {
  if (!text || typeof text !== "string") return [];

  if (!jieba) {
    // 降级到简单分词
    return simpleSegment(text);
  }

  switch (mode) {
    case "full":
      return jieba.cutAll(text);
    case "search":
      return jieba.cutForSearch(text);
    default:
      return jieba.cut(text);
  }
}

/**
 * 提取关键词（基于 TF-IDF）
 * @param text 输入文本
 * @param topN 返回前 N 个关键词
 * @returns 关键词数组，按权重降序排列
 */
export function extractKeywords(text: string, topN: number = 10): string[] {
  if (!text || typeof text !== "string") return [];

  if (!jieba) {
    // 降级：返回简单分词结果的前 N 个
    return simpleSegment(text).slice(0, topN);
  }

  const keywords = jieba.extract(text, topN);
  return keywords.map((kw) => kw.word);
}

/**
 * 提取关键词及其权重
 * @param text 输入文本
 * @param topN 返回前 N 个关键词
 * @returns 关键词对象数组，包含 word 和 weight
 */
export function extractKeywordsWithWeight(
  text: string,
  topN: number = 10
): Array<{ word: string; weight: number }> {
  if (!text || typeof text !== "string") return [];

  if (!jieba) {
    // 降级：返回简单分词，权重默认为 0
    return simpleSegment(text).slice(0, topN).map((word) => ({ word, weight: 0 }));
  }

  return jieba.extract(text, topN);
}

/**
 * 词性标注
 * @param text 输入文本
 * @returns 词性标注结果数组
 */
export function tag(
  text: string
): Array<{ word: string; tag: string }> {
  if (!text || typeof text !== "string") return [];

  if (!jieba) {
    // 降级：返回简单分词，tag 默认为 "unknown"
    return simpleSegment(text).map((word) => ({ word, tag: "unknown" }));
  }

  return jieba.tag(text);
}

/**
 * 过滤停用词和标点符号
 * @param words 词语数组
 * @returns 过滤后的词语数组
 */
export function filterStopWords(words: string[]): string[] {
  const stopWords = new Set([
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一",
    "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着",
    "没有", "看", "好", "自己", "这", "他", "她", "它", "们", "那", "些",
    "什么", "怎么", "如何", "为什么", "哪", "谁", "多少", "几", "哪里",
    "吗", "呢", "吧", "啊", "呀", "哦", "嗯", "哈", "哎", "嘛", "噢",
    "而", "但", "如果", "虽然", "但是", "因为", "所以", "而且", "或者",
    "可以", "能", "会", "应该", "必须", "需要", "可能", "也许", "大概",
    "已经", "正在", "刚刚", "刚才", "现在", "今天", "明天", "昨天",
    "这个", "那个", "这些", "那些", "这里", "那里", "这边", "那边",
    "非常", "特别", "极其", "十分", "相当", "比较", "更加", "最",
    "只", "仅", "仅仅", "只是", "不过", "还是", "或者", "要么",
    "把", "被", "让", "给", "向", "对", "从", "到", "往", "朝",
    "与", "及", "等", "之", "其", "该", "此", "该", "本", "该",
  ]);

  return words.filter((word) => {
    // 过滤停用词
    if (stopWords.has(word)) return false;
    // 过滤纯标点（常见中英文标点）
    if (/^[.,;:!?'"()\[\]{}<>~`@#$%^&*_+=/\\|，。；：！？'"（）【】｛｝＜＞～`＠＃￥％＾＆＊＿＋＝／＼｜]+$/.test(word)) return false;
    // 过滤纯数字
    if (/^\d+$/.test(word)) return false;
    // 过滤单字符（通常无意义）
    if (word.length < 2) return false;
    return true;
  });
}

/**
 * 从文本中提取有意义的关键词（分词 + 过滤）
 * @param text 输入文本
 * @param topN 返回前 N 个关键词
 * @returns 过滤后的关键词数组
 */
export function extractMeaningfulKeywords(
  text: string,
  topN: number = 10
): string[] {
  const keywords = extractKeywords(text, topN * 2); // 多提取一些，过滤后可能不够
  const filtered = filterStopWords(keywords);
  return filtered.slice(0, topN);
}

/**
 * 获取文本的核心主题词
 * 结合 TF-IDF 关键词和词性标注，提取名词和动词
 * @param text 输入文本
 * @param topN 返回前 N 个主题词
 * @returns 主题词数组
 */
export function extractTopics(
  text: string,
  topN: number = 5
): string[] {
  const tagged = tag(text);
  
  // 筛选名词(n)和动词(v)
  const topicWords = tagged
    .filter((item) => {
      const tag = item.tag;
      // 名词: n, nr, ns, nt, nz, ng
      // 动词: v, vd, vn, vshi, vyou
      // 形容词: a, ad, an
      return (
        tag.startsWith("n") ||
        tag.startsWith("v") ||
        tag.startsWith("a")
      );
    })
    .map((item) => item.word);

  const filtered = filterStopWords(topicWords);
  
  // 去重并保持顺序
  const unique = Array.from(new Set(filtered));
  return unique.slice(0, topN);
}

/**
 * 导出加载状态（供外部检查）
 */
export const nodejiebaStatus = {
  loaded: jieba !== null,
  error: jiebaLoadError,
};
