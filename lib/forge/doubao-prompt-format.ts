import type { DoubaoPromptVariant, VisualPrompts } from "@/lib/forge/types";

/** 单组方案复制文本（含分镜，便于粘贴到豆包备注区） */
export function formatDoubaoVariantCopy(
  v: DoubaoPromptVariant,
  extras?: { psychologyVisualStrategy?: string; doubaoNegativeZh?: string }
): string {
  const lines = [
    `【${v.label} · ${v.postUse}】`,
    `创意角度：${v.angle}`,
    `导演备注：${v.directorNotes}`,
    ...(extras?.psychologyVisualStrategy
      ? [`心理视觉策略：${extras.psychologyVisualStrategy}`]
      : []),
    "",
    "▌ 豆包主提示词",
    v.doubaoPromptZh,
    ...(extras?.doubaoNegativeZh
      ? ["", "▌ 负面约束", extras.doubaoNegativeZh]
      : []),
    "",
    "▌ 分镜（按镜号在豆包逐张生成）",
    ...v.shots.map(
      (s) =>
        `${s.frame} | ${s.shotSize} | ${s.camera}\n  构图：${s.composition}\n  光线：${s.lighting}${s.mood ? `\n  氛围：${s.mood}` : ""}`
    ),
  ];
  return lines.join("\n");
}

export function formatAllDoubaoVariantsCopy(prompts: VisualPrompts): string {
  const feed =
    prompts.dewuFeedStoryboard.length > 0
      ? [
          "【得物发帖图序 · 3:4 竖图】",
          ...prompts.dewuFeedStoryboard.map(
            (f) =>
              `图${f.position} ${f.role}（${f.shotSize}）→ 对应方案 ${f.variantId ?? "—"}：${f.note}`
          ),
          "",
          "---",
          "",
        ].join("\n")
      : "";

  const extras = {
    psychologyVisualStrategy: prompts.psychologyVisualStrategy,
    doubaoNegativeZh: prompts.doubaoNegativeZh,
  };

  return (
    feed +
    prompts.doubaoPromptVariants
      .map((v) => formatDoubaoVariantCopy(v, extras))
      .join("\n\n---\n\n")
  );
}
