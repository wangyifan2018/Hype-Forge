/**
 * nodejieba 原生模块健康检查
 * 在应用启动或流水线执行前检查 nodejieba 是否正常加载
 */

export type NodejiebaHealth = {
  ok: boolean;
  error?: string;
};

let cachedHealth: NodejiebaHealth | null = null;

export function checkNodejieba(): NodejiebaHealth {
  if (cachedHealth) return cachedHealth;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jieba = require("nodejieba");
    if (typeof jieba.cut !== "function") {
      cachedHealth = { ok: false, error: "nodejieba.cut 不是函数" };
      return cachedHealth;
    }
    // 快速测试分词功能
    const result = jieba.cut("测试");
    if (!Array.isArray(result) || result.length === 0) {
      cachedHealth = { ok: false, error: "nodejieba.cut 返回了意外结果" };
      return cachedHealth;
    }
    cachedHealth = { ok: true };
    return cachedHealth;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    cachedHealth = {
      ok: false,
      error: `nodejieba 原生绑定加载失败: ${message}`,
    };
    return cachedHealth;
  }
}

/**
 * 重置健康检查缓存（用于测试）
 */
export function resetNodejiebaHealth(): void {
  cachedHealth = null;
}
