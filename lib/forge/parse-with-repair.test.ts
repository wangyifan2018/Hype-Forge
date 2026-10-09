import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callAndParse } from "@/lib/forge/parse-with-repair";

const schema = z.object({
  sellingPoints: z.string(),
  styleTags: z.array(z.string()),
});

const GOOD = JSON.stringify({
  sellingPoints: "白蓝配色，到手 749",
  styleTags: ["酷感直给"],
});

describe("callAndParse（结构化输出修复重试）", () => {
  it("首次即合法时只调用一次", async () => {
    const call = vi.fn<(extra?: string) => Promise<string>>(async () => GOOD);
    const result = await callAndParse({ label: "补卖点", schema, call });

    expect(result.sellingPoints).toContain("749");
    expect(call).toHaveBeenCalledTimes(1);
    // 正常路径不应带上"修正指令"
    expect(call.mock.calls[0][0]).toBeUndefined();
  });

  it("字段校验失败时回灌 Zod 错误重试一次并成功", async () => {
    const call = vi
      .fn<(extra?: string) => Promise<string>>()
      .mockResolvedValueOnce(JSON.stringify({ sellingPoints: "缺 tags" }))
      .mockResolvedValueOnce(GOOD);

    const result = await callAndParse({ label: "补卖点", schema, call });

    expect(result.styleTags).toEqual(["酷感直给"]);
    expect(call).toHaveBeenCalledTimes(2);
    // 第二次调用必须携带修正指令，否则模型无从修正
    expect(String(call.mock.calls[1][0])).toContain("重新输出");
  });

  it("返回非 JSON（如包了说明文字）也能救回一次", async () => {
    const call = vi
      .fn<(extra?: string) => Promise<string>>()
      .mockResolvedValueOnce("好的，这是结果：没有 JSON")
      .mockResolvedValueOnce(`\`\`\`json\n${GOOD}\n\`\`\``);

    const result = await callAndParse({ label: "补卖点", schema, call });

    expect(result.sellingPoints).toContain("白蓝配色");
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("两次都失败时抛出带业务名的错误（不再裸抛 Zod）", async () => {
    const call = vi.fn(async () => JSON.stringify({ sellingPoints: 1 }));

    await expect(
      callAndParse({ label: "补卖点", schema, call })
    ).rejects.toThrow(/补卖点/);
    expect(call).toHaveBeenCalledTimes(2);
  });
});
