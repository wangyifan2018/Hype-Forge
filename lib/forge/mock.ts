import type {
  ForgeInput,
  HotProductLead,
  HotTrendCard,
  Platform,
  ProductBrief,
  ViralBrief,
  VisualPrompts,
} from "@/lib/forge/types";
import {
  buildPsychologyVisualStrategyDefault,
  DEFAULT_DOUBAO_NEGATIVE_ZH,
} from "@/lib/forge/prompt-context";
import { hotCardFromStaticTrend } from "@/lib/forge/trend-resolve";
import { normalizeVisualPrompts } from "@/lib/forge/visual-normalize";
import { DEWU_TRENDS, TRENDS, getTrendById } from "@/lib/forge/trends";

export function mockProductBrief(input: ForgeInput): ProductBrief {
  return {
    category: "潮流家居 / 观赛周边",
    colors: ["墨绿", "暖白"],
    material: "亲肤织物 + 哑光涂层",
    visualFeatures: `${input.productName} 轮廓清晰，适合世界杯主题场景植入`,
    suggestedHooks: [
      "2026 世界杯氛围感拉满",
      "看球房一秒出片",
      input.sellingPoints.split(/[,，、]/)[0]?.trim() || "高颜值实用",
    ],
  };
}

export function mockViralBrief(input: ForgeInput): ViralBrief {
  const point = input.sellingPoints.split(/[,，、]/)[0]?.trim() || "高颜值";
  return {
    hookFramework: "AIDA",
    emotionalCore: `拥有${input.productName}的瞬间，自信感拉满`,
    memoryPoint: `第一眼就被${point}击中`,
    targetAudience: "18-28 岁潮流爱好者，关注穿搭与生活方式",
    keywordStrategy: [input.productName.slice(0, 12), "得物好物", "穿搭种草", "真实体验"],
    titleAngles: [
      `${input.productName}上脚/上手瞬间被问链接`,
      `这${point}，闭眼入不亏`,
      `得物入手｜${input.productName}真实体验`,
    ],
    titleCandidates: [
      {
        title: `${input.productName}上脚真的绝 🔥`,
        hookType: "情绪共鸣",
        estimatedScore: 88,
      },
      {
        title: `这${point}，闭眼入不亏`,
        hookType: "痛点直击",
        estimatedScore: 82,
      },
      {
        title: `得物入手｜${input.productName}真实体验`,
        hookType: "社交认证",
        estimatedScore: 78,
      },
    ],
    visualMood: "高对比街头质感，干净背景突出商品主体",
    ctaStrategy: "轻引导：链接在主页/评论区，不强行推销",
    contentFormat: "单品种草",
    avoidAngles: ["虚假促销", "医疗功效宣称", "过度修图"],
    psychologyAlignment:
      "用 AIDA 框架放大身份认同与新奇感，首句制造视觉冲击，中段强化社交认证",
  };
}

export function mockHotTrends(platform: Platform): HotTrendCard[] {
  const source = platform === "dewu" ? DEWU_TRENDS : TRENDS;
  return source.map((t) => hotCardFromStaticTrend(t)!).filter(Boolean);
}

export function mockProductLeads(): HotProductLead[] {
  return [
    {
      id: "lead-dunk-low",
      name: "复古低帮球鞋热度款",
      category: "球鞋",
      heatScore: 91,
      searchKeywords: ["Dunk", "低帮", "复古配色"],
      contentAngle: "百搭通勤，评论区求链接最多",
      whyHot: "低帮复古配色在得物穿搭帖里复现率高，适合通勤 OOTD 合集。",
      creativeHooks: [
        "一周通勤 3 套配色公式",
        "新旧 Dunk 侧面对比上脚",
        "雨天室外防滑实测特写",
      ],
      verifySteps: [
        "得物 App 搜索「Dunk 低帮 复古」",
        "对比想要人数与同配色评论",
        "保存官方主图并复制分享链接",
      ],
      competitionLevel: "中",
      bestPostFormat: "单品种草",
      priority: "high",
      note: "非官方榜单；需在得物App内验证；图片与链接请手动获取",
    },
    {
      id: "lead-shell-jacket",
      name: "轻量冲锋衣层叠穿",
      category: "潮穿",
      heatScore: 85,
      searchKeywords: ["冲锋衣", "户外风", "层叠"],
      contentAngle: "春秋过渡一件搞定，街拍感强",
      whyHot: "换季层叠穿话题升温，街拍封面点击率高。",
      creativeHooks: [
        "内搭卫衣+冲锋衣两层对比",
        "城市夜景霓虹街拍背景",
        "拉链/面料细节微距",
      ],
      verifySteps: [
        "搜索「轻量冲锋衣 潮穿」",
        "看近 7 天相关笔记互动",
        "从商品页保存平铺主图",
      ],
      competitionLevel: "低",
      bestPostFormat: "对比测评",
      priority: "high",
      note: "非官方榜单；需在得物App内验证；图片与链接请手动获取",
    },
    {
      id: "lead-keyboard-kit",
      name: "客制化键盘套件",
      category: "数码桌搭",
      heatScore: 82,
      searchKeywords: ["客制键盘", "桌搭", "RGB"],
      contentAngle: "桌搭党晒单高发，颜值即正义",
      whyHot: "桌搭晒单在得物数码区稳定出圈，适合氛围灯+俯拍构图。",
      creativeHooks: [
        "改造前后桌面对比",
        "键帽特写+RGB 氛围夜景",
        "打字音/手感体验（图文描述）",
      ],
      verifySteps: [
        "搜索「客制键盘 桌搭」",
        "筛选高互动晒单参考构图",
        "保存商品白底图作抠图素材",
      ],
      competitionLevel: "中",
      bestPostFormat: "合集清单",
      priority: "medium",
      note: "非官方榜单；需在得物App内验证；图片与链接请手动获取",
    },
  ];
}

export function mockVisualPrompts(
  input: ForgeInput,
  brief?: ProductBrief | null
): VisualPrompts {
  const trend =
    input.trendContext ??
    (getTrendById(input.trendId)
      ? hotCardFromStaticTrend(getTrendById(input.trendId))
      : null);
  const sceneEn = trend?.sceneEn ?? "lifestyle product scene";
  const sceneZh = trend?.sceneZh ?? "生活方式场景背景";

  const concept = `${input.productName} × ${trend?.hookAngle ?? "得物爆款氛围"}，主图一眼可辨`;
  const wm = "画面干净无文字水印、无平台 logo";
  const doubaoPromptZh = `保留上传商品主体不变形；将背景替换为${sceneZh}，结合${trend?.hookAngle ?? "趋势"}氛围，突出${input.productName}的${brief?.colors[0] ?? "主色"}与材质。3:4 竖图，柔和侧光，${wm}。`;
  const doubaoPromptVariants = [
    {
      id: "trend-cover",
      label: "趋势封面",
      angle: `${trend?.title ?? "热点"} × ${input.productName} 主视觉`,
      doubaoPromptZh,
      postUse: "封面（第 1 张）",
    },
    {
      id: "detail-mood",
      label: "质感细节",
      angle: `趋势色盘 + ${brief?.material ?? "材质"}微距`,
      doubaoPromptZh: `保留商品主体不变；近景细节特写，侧光突出${brief?.colors[0] ?? "配色"}与材质，背景虚化为${sceneZh}色块，3:4 竖图，${wm}。`,
      postUse: "图 2（细节）",
    },
    {
      id: "scene-lifestyle",
      label: "场景种草",
      angle: `${sceneZh}生活方式 + 商品自然入镜`,
      doubaoPromptZh: `保留商品主体不变；轻度${sceneZh}生活场景，商品摆放/上脚自然，人物≤40%，3:4 竖图，${wm}。`,
      postUse: "图 3（氛围）",
    },
  ];
  const doubaoSop = [
    {
      step: 1,
      tool: "豆包",
      action: "打开豆包，选择图生图/参考图",
      detail: "使用网页版或 App 均可",
    },
    {
      step: 2,
      tool: "豆包",
      action: "上传 Step3 保存的商品主图",
      detail: "白底或实拍均可，确保鞋型/轮廓清晰",
    },
    {
      step: 3,
      tool: "豆包",
      action: "依次粘贴三组提示词",
      detail: "趋势封面 / 质感细节 / 场景种草各出 1-2 张",
    },
    {
      step: 4,
      tool: "豆包",
      action: "导出高清图",
      detail: "选最贴近实物的一张作得物发帖封面",
    },
  ];
  return normalizeVisualPrompts({
    doubaoPromptZh,
    doubaoPromptVariants,
    doubaoSop,
    fluxEn: `Professional product photography, ${input.productName} centered on seamless white background, hero shot, ${sceneEn}, soft key light, rim light, shallow depth of field, 8k uhd, cinematic color grading, commercial advertising, highly detailed, ${brief?.colors.join(", ") ?? "neutral palette"}, no text watermark`,
    bgRedrawZh: doubaoPromptZh,
    creativeConcept: concept,
    moodKeywords: ["高对比", "街头质感", "电商主图", "干净留白"],
    shotList: [
      `图1 封面：${sceneZh} + 商品居中`,
      "图2 细节：材质/Logo",
      "图3 场景：上脚/桌搭",
      "图4 氛围：环境远景",
    ],
    imagePlaybook: [
      {
        step: 1,
        tool: "得物 App",
        action: "保存官方主图",
        detail: "选白底或纯色背景款，避免带大面积文字水印",
      },
      {
        step: 2,
        tool: "醒图 / 美图",
        action: "智能抠图",
        detail: "边缘羽化 2-4px，保留鞋型/轮廓不变形",
      },
      {
        step: 3,
        tool: "醒图",
        action: "AI 换背景",
        detail: `粘贴「背景重绘 ZH」指令；强度中等，注意阴影方向与光源一致`,
      },
      {
        step: 4,
        tool: "FLUX（可选）",
        action: "生成氛围备选",
        detail: "复制 fluxEn；出 2-4 张选一张最像实物的作封面备选",
      },
      {
        step: 5,
        tool: "醒图",
        action: "调色统一",
        detail: "对比度 +5~10，色温略暖，与得物社区常用滤镜接近",
      },
    ],
    coverTip: "优先选商品占画面 60%、背景干净、无畸变的一张；人脸可选可不选。",
    avoidList: [
      "不要拉伸鞋型/衣摆",
      "不要加违规二维码或外站水印",
      "不要过度磨皮导致材质失真",
    ],
    psychologyTriggers: trend?.psychologyTriggers ?? [],
    psychologyVisualStrategy: buildPsychologyVisualStrategyDefault(
      trend?.psychologyTriggers ?? []
    ),
    doubaoNegativeZh: DEFAULT_DOUBAO_NEGATIVE_ZH,
  });
}

export function mockCopyMarkdown(input: ForgeInput): string {
  const trendLabel =
    input.trendContext?.title ??
    getTrendById(input.trendId)?.label ??
    "热门趋势";
  const hook = input.trendContext?.hookAngle ?? "";
  const point = input.sellingPoints.split(/[,，、]/)[0]?.trim() || "质感在线";
  if (input.platform === "dewu") {
    const refHint = input.referenceCopy?.trim()
      ? `\n\n${input.referenceCopy.trim().slice(0, 120)}…`
      : "";
    return `## ${input.productName}上脚真的绝 🔥

## 正文

${hook ? `${hook} ` : ""}这双 **${input.productName}** 我一上脚就被问链接 👟

${point}，做工和配色都很能打，日常通勤、街拍都能 hold 住。

不吹不黑，属于闭眼入不亏那一挂。想要同款的去主页/评论区找我～${refHint}

## 话题标签

#得物好物 #潮穿穿搭 #球鞋种草 #OOTD #好物分享`;
  }

  return `## ${trendLabel}｜${input.productName}

${hook ? `✨ ${hook}\n\n` : ""}这次入的 **${input.productName}**：
- ${point}

#小红书好物 #种草`;
}

export async function* mockCopyStream(
  text: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const chunks = text.match(/[\s\S]{1,12}/g) ?? [text];
  for (const chunk of chunks) {
    if (signal?.aborted) return;
    await new Promise((r) => setTimeout(r, 35));
    yield chunk;
  }
}

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      },
      { once: true }
    );
  });
}
