import type { ForgeInput, RemixType } from "@/lib/forge/types";

export const REMIX_SYSTEM = `你是得物/小红书种草文案编辑。根据用户指令局部改写 Markdown 文案。
规则：
- 得物：仅改「## 标题」「## 正文」「## 话题标签」三小节，禁止 URL 与 ## 好物链接
- 小红书：可保留完整 Markdown 结构（含好物链接等）
- 不得编造虚假促销、鉴定编号
- regenerate_titles 时只输出 JSON：{"titles":["标题1","标题2","标题3"]}
- 其他类型输出 JSON：{"copyText":"完整 Markdown"}`;

export function buildRemixUserPrompt(params: {
  remixType: RemixType;
  copyText: string;
  input: ForgeInput;
  creativeConcept?: string;
  angle?: string;
  /** revise_mustfix：质检给出的待改进项（代码校验 + 模型意见合并后的清单） */
  mustFix?: string[];
}): string {
  const instructions: Record<RemixType, string> = {
    shorter:
      "压缩正文，保留核心卖点；得物仅保留三小节，更短更有节奏。",
    hookier: "加强前三行冲击力与情绪，更酷更直接。",
    more_professional: "语气更专业可信，减少夸张，保留穿搭场景。",
    regenerate_titles: "生成 3 个不同风格的得物帖子标题（含 Emoji 可选），不要输出正文。",
    angle: `围绕创意角度「${params.angle ?? ""}」改写创意主轴与正文前 2 段，与角度强相关。`,
    revise_mustfix: [
      "只修复下面列出的问题，其余内容、结构、语气尽量保持不变，不要整篇重写。",
      "逐条落实；结构缺失的段落必须补齐，违规词必须替换，搜索词缺失要自然补入。",
      "得物仍只输出三小节，禁止 URL。",
    ].join(""),
  };

  const mustFixBlock =
    params.remixType === "revise_mustfix" && params.mustFix?.length
      ? `\n【必须逐条修复的问题】\n${params.mustFix
          .slice(0, 12)
          .map((item, i) => `${i + 1}. ${item}`)
          .join("\n")}`
      : "";

  return `指令：${instructions[params.remixType]}
平台：${params.input.platform === "dewu" ? "得物" : "小红书"}
商品：${params.input.productName}
${params.creativeConcept ? `视觉创意主轴：${params.creativeConcept}` : ""}

${mustFixBlock}
【当前文案】
${params.copyText}

请按 remixType=${params.remixType} 输出 JSON。`;
}
