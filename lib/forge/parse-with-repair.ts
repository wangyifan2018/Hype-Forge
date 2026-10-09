import type { z } from "zod";
import { extractJson } from "@/lib/forge/parse-json";

/**
 * 「调用模型 + 解析契约」的组合，失败时把 Zod 错误回灌给模型重问一次。
 *
 * 背景：enrich / remix / engage / vision 等处是"严格 parse、无兜底"，模型偶发
 * 的格式偏差（多一层包裹、字段名写成中文、漏字段）会直接变成 500 或静默降级。
 * 这里只做一次重试：成本可控，且能把大部分格式性失败救回来。
 */

export type CallAndParseParams<T extends z.ZodType> = {
  /** 用于日志与错误信息，如 "补卖点" */
  label: string;
  schema: T;
  /** 用 prompt 调模型；extraInstruction 非空时表示这是"修正重试" */
  call: (extraInstruction?: string) => Promise<string>;
};

function safeExtract(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: extractJson(raw) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "JSON 解析失败",
    };
  }
}

export async function callAndParse<T extends z.ZodType>(
  params: CallAndParseParams<T>
): Promise<z.infer<T>> {
  const firstRaw = await params.call();
  const firstJson = safeExtract(firstRaw);
  if (firstJson.ok) {
    const parsed = params.schema.safeParse(firstJson.value);
    if (parsed.success) return parsed.data;
    return retryOnce(params, `字段校验失败：${parsed.error.message}`);
  }
  return retryOnce(params, `返回内容不是合法 JSON：${firstJson.error}`);
}

async function retryOnce<T extends z.ZodType>(
  params: CallAndParseParams<T>,
  reason: string
): Promise<z.infer<T>> {
  const instruction = [
    "上一次输出无法解析，请重新输出**完整**结果：",
    `- 问题：${reason.slice(0, 500)}`,
    "- 只输出一个合法 JSON 对象（不要 markdown 代码块、不要解释文字）",
    "- 字段名与类型必须与要求完全一致",
  ].join("\n");

  console.warn(`[forge/parse] ${params.label} 首次解析失败，回灌错误重试一次：${reason.slice(0, 200)}`);

  const secondRaw = await params.call(instruction);
  const secondJson = safeExtract(secondRaw);
  if (secondJson.ok) {
    const parsed = params.schema.safeParse(secondJson.value);
    if (parsed.success) return parsed.data;
    throw new Error(
      `${params.label}输出结构仍不符合契约：${parsed.error.message.slice(0, 200)}`
    );
  }
  throw new Error(`${params.label}重试后仍不是合法 JSON：${secondJson.error}`);
}
