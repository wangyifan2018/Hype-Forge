import {
  buildPsychologyVisualStrategyDefault,
  DEFAULT_DOUBAO_NEGATIVE_ZH,
} from "@/lib/forge/prompt-context";
import type {
  DoubaoPromptVariant,
  DoubaoShot,
  DewuFeedFrame,
  PlaybookStep,
  PsychologyTrigger,
  VisualPrompts,
} from "@/lib/forge/types";
import { visualPromptsSchema } from "@/lib/forge/types";

const WATERMARK_PHRASE =
  "去除参考图中平台水印、店铺名、二维码与文字贴纸，成片无文字无 logo 无水印";

const DEFAULT_DOUBAO_SOP: PlaybookStep[] = [
  {
    step: 1,
    tool: "豆包",
    action: "打开豆包 App / 网页",
    detail: "选择图生图或参考图功能",
  },
  {
    step: 2,
    tool: "豆包",
    action: "上传主图并检查水印",
    detail:
      "优先白底/干净实拍；若有得物角标、价格贴、二维码，先用消除/去水印或裁剪到只含商品",
  },
  {
    step: 3,
    tool: "豆包",
    action: "依次粘贴三组生图提示词",
    detail:
      "趋势封面 / 质感细节 / 场景种草各生成 1-2 张 3:4 图，共约 3-6 张用于得物多图发帖",
  },
  {
    step: 4,
    tool: "豆包",
    action: "微调并导出",
    detail: "亮度/对比度略提，保存最高清版本用于发帖",
  },
];

const DEFAULT_IMAGE_PLAYBOOK: PlaybookStep[] = [
  {
    step: 1,
    tool: "得物 App",
    action: "保存官方主图",
    detail: "选白底或纯色背景款，避免大面积文字水印",
  },
  {
    step: 2,
    tool: "醒图 / 美图",
    action: "智能抠图",
    detail: "边缘羽化 2-4px，保留鞋型/轮廓不变形",
  },
  {
    step: 3,
    tool: "豆包",
    action: "图生图换背景",
    detail: "上传抠图结果 + 粘贴豆包提示词，确认无平台水印",
  },
  {
    step: 4,
    tool: "导出",
    action: "保存高清成片",
    detail: "检查无二维码、无价格贴纸后用于得物发帖",
  },
];

const DEFAULT_MOOD = ["高对比", "街头质感", "电商主图", "干净留白"];
const DEFAULT_SHOTS = [
  "图1 封面·中景微仰：趋势背景 + 商品居中 60%，柔光侧光",
  "图2 细节·特写：材质/Logo/配色，浅景深",
  "图3 场景·中景：生活化场景或轻上脚，人物≤40%",
  "图4 氛围·全景：环境层次 + 商品仍清晰",
];
const DEFAULT_AVOID = [
  "不要加违规二维码或外站水印",
  "成片勿保留平台 logo 与价格条幅",
  "勿编造未出现的款号与参数",
];

function asPlaybookSteps(value: unknown): PlaybookStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (s): s is PlaybookStep =>
        s != null &&
        typeof s === "object" &&
        typeof (s as PlaybookStep).step === "number" &&
        typeof (s as PlaybookStep).tool === "string" &&
        typeof (s as PlaybookStep).action === "string" &&
        typeof (s as PlaybookStep).detail === "string"
    )
    .map((s, i) => ({ ...s, step: i + 1 }));
}

function ensurePlaybookSteps(
  steps: PlaybookStep[],
  min: number,
  max: number,
  defaults: PlaybookStep[]
): PlaybookStep[] {
  const base = steps.length ? steps : [];
  const merged = [...base];
  let i = 0;
  while (merged.length < min) {
    const d = defaults[i % defaults.length];
    merged.push({
      ...d,
      step: merged.length + 1,
      action: d.action,
      detail: d.detail,
    });
    i += 1;
  }
  return merged.slice(0, max).map((s, idx) => ({ ...s, step: idx + 1 }));
}

function ensureStringArray(
  value: unknown,
  min: number,
  max: number,
  defaults: string[]
): string[] {
  const arr = Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const merged = arr.length ? [...arr] : [...defaults];
  while (merged.length < min) {
    merged.push(defaults[merged.length % defaults.length] ?? "—");
  }
  return merged.slice(0, max);
}

function hasWatermarkGuard(text: string): boolean {
  return /水印|无文字|无 logo|无二维码|去除.*平台|干净无字/i.test(text);
}

function ensureDoubaoWatermarkGuard(
  doubaoPromptZh: string,
  doubaoSop: PlaybookStep[]
): { doubaoPromptZh: string; doubaoSop: PlaybookStep[] } {
  let prompt = doubaoPromptZh.trim();
  if (!hasWatermarkGuard(prompt)) {
    prompt = `${prompt.replace(/[。；]$/, "")}；${WATERMARK_PHRASE}。`;
  }

  const hasWatermarkStep = doubaoSop.some(
    (s) => /水印|消除|裁剪|去字/i.test(`${s.action}${s.detail}`)
  );
  let sop = [...doubaoSop];
  if (!hasWatermarkStep && sop.length >= 2) {
    sop = sop.map((s, i) =>
      i === 1
        ? {
            ...s,
            action: s.action.includes("上传") ? s.action : "上传主图并检查水印",
            detail:
              "若有平台角标、斜排水印、价格贴或二维码，先消除/去水印或裁剪到只含商品主体",
          }
        : s
    );
  }

  if (!/三组|3\s*组|各生成/i.test(sop.map((s) => s.detail).join(""))) {
    sop = sop.map((s, i) =>
      i === 2
        ? {
            ...s,
            action: "依次粘贴三组生图提示词",
            detail:
              "按中栏「趋势封面→质感细节→场景种草」各粘贴一次，每组出 1-2 张，检查无水印",
          }
        : s
    );
  }

  return { doubaoPromptZh: prompt, doubaoSop: sop };
}

function guardVariantPrompt(text: string): string {
  let p = text.trim();
  if (!hasWatermarkGuard(p)) {
    p = `${p.replace(/[。；]$/, "")}；${WATERMARK_PHRASE}。`;
  }
  return p;
}

function asShots(value: unknown): DoubaoShot[] {
  if (!Array.isArray(value)) return [];
  const out: DoubaoShot[] = [];
  for (const item of value) {
    if (item == null || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const shotSize = String(s.shotSize ?? "").trim();
    if (!shotSize) continue;
    out.push({
      frame: String(s.frame ?? `A${out.length + 1}`),
      shotSize,
      camera: String(s.camera ?? "平视"),
      composition: String(s.composition ?? "商品居中"),
      lighting: String(s.lighting ?? "自然柔光"),
      mood: s.mood != null ? String(s.mood) : undefined,
    });
  }
  return out;
}

function defaultDirectorNotes(id: string): string {
  switch (id) {
    case "detail-mood":
      return "略高对比，冷青或趋势主色点缀，突出材质颗粒与轮廓光";
    case "scene-lifestyle":
      return "生活化色温，环境虚化，商品饱和度略高于背景";
    default:
      return "得物 feed 风格，对比 +8，主色醒目，背景简洁不抢主体";
  }
}

function defaultShotsForVariant(id: string): DoubaoShot[] {
  switch (id) {
    case "detail-mood":
      return [
        {
          frame: "B1",
          shotSize: "特写",
          camera: "平视微距",
          composition: "材质/Logo/走线占满画面 70%",
          lighting: "侧光硬一点 + 补光板",
          mood: "质感种草",
        },
        {
          frame: "B2",
          shotSize: "近景",
          camera: "俯拍 30°",
          composition: "配色组合陈列，背景纯色趋势渐变",
          lighting: "顶柔光",
          mood: "细节图",
        },
      ];
    case "scene-lifestyle":
      return [
        {
          frame: "C1",
          shotSize: "中景",
          camera: "低机位仰拍 10°",
          composition: "上脚/上身，商品清晰，人物≤40%",
          lighting: "自然窗光 + 轻轮廓",
          mood: "街拍感",
        },
        {
          frame: "C2",
          shotSize: "全景",
          camera: "平视",
          composition: "场景氛围为主，商品在前景 1/3",
          lighting: "环境光，略暖",
          mood: "生活方式",
        },
      ];
    default:
      return [
        {
          frame: "A1",
          shotSize: "中景",
          camera: "微仰 12°",
          composition: "商品居中占 60%，顶部留白给信息流",
          lighting: "柔光侧光 + 浅反射板",
          mood: "趋势封面",
        },
        {
          frame: "A2",
          shotSize: "中近景",
          camera: "平视",
          composition: "同款主体，背景层次加深一阶",
          lighting: "轮廓光勾边",
          mood: "备选封面",
        },
      ];
  }
}

function enrichVariantStoryboard(v: DoubaoPromptVariant): DoubaoPromptVariant {
  const id = v.id || "trend-cover";
  const shots = (
    v.shots?.length >= 2 ? v.shots : defaultShotsForVariant(id)
  ).slice(0, 3);
  return {
    ...v,
    id,
    directorNotes:
      v.directorNotes?.trim() || defaultDirectorNotes(id),
    shots,
  };
}

function asVariants(value: unknown): DoubaoPromptVariant[] {
  if (!Array.isArray(value)) return [];
  const out: DoubaoPromptVariant[] = [];
  for (const item of value) {
    if (item == null || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    const zh = String(v.doubaoPromptZh ?? "").trim();
    if (!zh) continue;
    const id = String(v.id ?? `variant-${out.length + 1}`);
    out.push(
      enrichVariantStoryboard({
        id,
        label: String(v.label ?? `方案 ${out.length + 1}`),
        angle: String(v.angle ?? ""),
        doubaoPromptZh: guardVariantPrompt(zh),
        postUse: String(v.postUse ?? "配图"),
        directorNotes: String(v.directorNotes ?? ""),
        shots: asShots(v.shots),
      })
    );
  }
  return out;
}

function buildFallbackVariants(
  primary: string,
  creativeConcept: string
): DoubaoPromptVariant[] {
  const base = guardVariantPrompt(primary);
  const concept = creativeConcept.slice(0, 40);
  const raw: DoubaoPromptVariant[] = [
    {
      id: "trend-cover",
      label: "趋势封面",
      angle: `${concept} · 趋势氛围主视觉，商品居中`,
      doubaoPromptZh: base,
      postUse: "封面（第 1 张）",
      directorNotes: defaultDirectorNotes("trend-cover"),
      shots: defaultShotsForVariant("trend-cover"),
    },
    {
      id: "detail-mood",
      label: "质感细节",
      angle: "热点色盘 + 商品材质微距，背景极简",
      doubaoPromptZh: guardVariantPrompt(
        `${base.replace(/[。；]$/, "")}；构图改为近景细节特写，侧光突出材质纹理，背景虚化为趋势色渐变，3:4 竖图。`
      ),
      postUse: "图 2（细节）",
      directorNotes: defaultDirectorNotes("detail-mood"),
      shots: defaultShotsForVariant("detail-mood"),
    },
    {
      id: "scene-lifestyle",
      label: "场景种草",
      angle: "趋势生活方式场景 + 商品自然摆放/轻上脚",
      doubaoPromptZh: guardVariantPrompt(
        `${base.replace(/[。；]$/, "")}；加入轻度生活方式场景（桌搭/街拍/上脚其一），人物占比不超过四成，3:4 竖图。`
      ),
      postUse: "图 3（氛围）",
      directorNotes: defaultDirectorNotes("scene-lifestyle"),
      shots: defaultShotsForVariant("scene-lifestyle"),
    },
  ];
  return raw.map(enrichVariantStoryboard);
}

function ensureDewuFeedStoryboard(
  variants: DoubaoPromptVariant[],
  raw: unknown
): DewuFeedFrame[] {
  if (Array.isArray(raw) && raw.length >= 4) {
    const out: DewuFeedFrame[] = [];
    for (const item of raw) {
      if (item == null || typeof item !== "object") continue;
      const f = item as Record<string, unknown>;
      const position = Number(f.position);
      if (!position) continue;
      out.push({
        position,
        role: String(f.role ?? "配图"),
        variantId: f.variantId != null ? String(f.variantId) : undefined,
        shotSize: String(f.shotSize ?? "中景"),
        note: String(f.note ?? ""),
      });
    }
    if (out.length >= 4) return out.slice(0, 6);
  }

  const cover = variants.find((v) => v.id === "trend-cover") ?? variants[0];
  const detail = variants.find((v) => v.id === "detail-mood") ?? variants[1];
  const scene = variants.find((v) => v.id === "scene-lifestyle") ?? variants[2];

  return [
    {
      position: 1,
      role: "封面",
      variantId: cover?.id,
      shotSize: cover?.shots[0]?.shotSize ?? "中景",
      note: "信息流首图，商品 + 趋势背景",
    },
    {
      position: 2,
      role: "细节",
      variantId: detail?.id,
      shotSize: detail?.shots[0]?.shotSize ?? "特写",
      note: "材质/配色/Logo",
    },
    {
      position: 3,
      role: "场景",
      variantId: scene?.id,
      shotSize: scene?.shots[0]?.shotSize ?? "中景",
      note: "上脚/上身/桌搭",
    },
    {
      position: 4,
      role: "氛围",
      variantId: scene?.id,
      shotSize: scene?.shots[1]?.shotSize ?? "全景",
      note: "环境远景，商品仍清晰",
    },
    {
      position: 5,
      role: "备选",
      variantId: cover?.id,
      shotSize: cover?.shots[1]?.shotSize ?? "中近景",
      note: "封面备选或 A/B",
    },
  ];
}

function ensureDoubaoPromptVariants(
  primary: string,
  raw: unknown,
  creativeConcept: string
): DoubaoPromptVariant[] {
  let variants = asVariants(raw);
  if (variants.length < 3) {
    variants = buildFallbackVariants(primary, creativeConcept);
  }
  return variants.map(enrichVariantStoryboard).slice(0, 4);
}

/** 补齐豆包字段；兼容旧 JSON 仅含 bgRedrawZh；容错模型返回数组长度不足 */
export function normalizeVisualPrompts(raw: Record<string, unknown>): VisualPrompts {
  const bg = String(raw.bgRedrawZh ?? "");
  let doubao =
    String(raw.doubaoPromptZh ?? "").trim() ||
    bg ||
    "保留上传商品主体不变，仅替换背景为潮流场景，3:4 竖图，自然光，电商质感。";

  let doubaoSop = asPlaybookSteps(raw.doubaoSop);
  if (doubaoSop.length < 3) {
    const playbook = asPlaybookSteps(raw.imagePlaybook);
    const fromPlaybook = playbook.filter((s) => s.tool.includes("豆包"));
    doubaoSop =
      fromPlaybook.length >= 3
        ? fromPlaybook.slice(0, 5)
        : DEFAULT_DOUBAO_SOP;
  }
  doubaoSop = ensurePlaybookSteps(doubaoSop, 3, 6, DEFAULT_DOUBAO_SOP);

  const fluxEn = String(raw.fluxEn ?? "").trim();
  const creativeConcept =
    String(raw.creativeConcept ?? "").trim() || "商品主图 × 潮流场景，主体清晰可辨";

  let doubaoPromptVariants = ensureDoubaoPromptVariants(
    doubao,
    raw.doubaoPromptVariants,
    creativeConcept
  );
  doubao = doubaoPromptVariants[0]?.doubaoPromptZh ?? doubao;

  const guarded = ensureDoubaoWatermarkGuard(doubao, doubaoSop);
  doubao = guarded.doubaoPromptZh;
  doubaoSop = guarded.doubaoSop;
  doubaoPromptVariants = [
    { ...doubaoPromptVariants[0]!, doubaoPromptZh: doubao },
    ...doubaoPromptVariants.slice(1),
  ];

  let imagePlaybook = asPlaybookSteps(raw.imagePlaybook);
  if (imagePlaybook.length < 4 && doubaoSop.length >= 3) {
    const mapped: PlaybookStep[] = doubaoSop.map((s, i) => ({
      step: i + 1,
      tool: s.tool,
      action: s.action,
      detail: s.detail,
    }));
    imagePlaybook = [...imagePlaybook, ...mapped].slice(0, 10);
  }
  imagePlaybook = ensurePlaybookSteps(
    imagePlaybook,
    4,
    10,
    DEFAULT_IMAGE_PLAYBOOK
  );

  const moodKeywords = ensureStringArray(raw.moodKeywords, 3, 8, DEFAULT_MOOD);
  let avoidList = ensureStringArray(raw.avoidList, 2, 6, DEFAULT_AVOID);
  if (!avoidList.some((a) => /水印|二维码|logo/i.test(a))) {
    avoidList = [DEFAULT_AVOID[0], DEFAULT_AVOID[1], ...avoidList].slice(0, 6);
  }

  const coverTip =
    String(raw.coverTip ?? "").trim() ||
    "封面 3:4 竖图，商品占 55-70%，微仰更显轮廓，背景干净无字";
  const dewuFeedStoryboard = ensureDewuFeedStoryboard(
    doubaoPromptVariants,
    raw.dewuFeedStoryboard
  );
  const shotListFromFeed = dewuFeedStoryboard.map(
    (f) => `图${f.position} ${f.role}（${f.shotSize}）：${f.note}`
  );
  const shotList = ensureStringArray(
    raw.shotList,
    4,
    6,
    shotListFromFeed.length >= 4 ? shotListFromFeed : DEFAULT_SHOTS
  );

  const rawTriggers = Array.isArray(raw.psychologyTriggers)
    ? (raw.psychologyTriggers as PsychologyTrigger[])
    : [];
  const psychologyVisualStrategy =
    String(raw.psychologyVisualStrategy ?? "").trim() ||
    buildPsychologyVisualStrategyDefault(rawTriggers);
  const doubaoNegativeZh =
    String(raw.doubaoNegativeZh ?? "").trim() || DEFAULT_DOUBAO_NEGATIVE_ZH;

  return visualPromptsSchema.parse({
    ...raw,
    doubaoPromptZh: doubao,
    doubaoPromptVariants,
    dewuFeedStoryboard,
    doubaoSop,
    fluxEn: fluxEn || doubao,
    bgRedrawZh: bg || doubao,
    creativeConcept,
    moodKeywords,
    shotList,
    imagePlaybook,
    coverTip,
    avoidList,
    psychologyVisualStrategy,
    doubaoNegativeZh,
  });
}
