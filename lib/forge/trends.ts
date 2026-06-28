import type { PsychologyTrigger } from "@/lib/forge/types";

export type Trend = {
  id: string;
  label: string;
  sceneEn: string;
  sceneZh: string;
  hookAngle?: string;
  keywords?: string[];
  group?: "dewu" | "general";
  psychologyTriggers?: PsychologyTrigger[];
  viralPotential?: number;
  emotionalHook?: string;
};

export const DEWU_TRENDS: Trend[] = [
  {
    id: "dewu-sneaker-heat",
    label: "得物球鞋热度",
    group: "dewu",
    sceneEn:
      "premium sneaker hero shot on seamless white, urban streetwear backdrop, soft studio light, hype drop culture, clean composition for e-commerce",
    sceneZh:
      "得物球鞋主图风格，白底商品居中，街头潮流氛围背景，干净高对比光影，适合社区晒单",
    hookAngle: "上脚即话题，爆款配色闭眼入",
    keywords: ["得物球鞋", "爆款配色", "上脚穿搭"],
    psychologyTriggers: ["identity", "social_proof", "novelty"],
    viralPotential: 85,
    emotionalHook: "穿上这双鞋，我就是街头最靓的仔",
  },
  {
    id: "dewu-streetwear",
    label: "得物潮穿街拍",
    group: "dewu",
    sceneEn:
      "streetwear editorial, concrete and neon city bokeh, fashion model silhouette optional, product focus on white seamless, dewu style lookbook",
    sceneZh:
      "得物潮穿街拍场景，城市霓虹虚化背景，商品主体清晰，穿搭博主质感",
    hookAngle: "一套穿搭直接抄作业，评论区问链接",
    keywords: ["得物穿搭", "潮穿", "OOTD"],
    psychologyTriggers: ["identity", "aspiration", "community"],
    viralPotential: 82,
    emotionalHook: "这套穿搭太有范儿了，我也要这样穿",
  },
  {
    id: "dewu-3c-desk",
    label: "得物数码桌搭",
    group: "dewu",
    sceneEn:
      "tech desk setup, matte black desk, subtle RGB accent, minimal geek aesthetic, product hero on white, premium gadget photography",
    sceneZh:
      "得物数码桌搭场景，极简桌面、轻RGB点缀，商品白底居中，科技质感",
    hookAngle: "桌搭党必备，颜值即正义",
    keywords: ["桌搭", "数码好物", "得物3C"],
    psychologyTriggers: ["identity", "novelty", "belonging"],
    viralPotential: 78,
    emotionalHook: "这才是科技宅的理想桌面，太治愈了",
  },
];

export const GENERAL_TRENDS: Trend[] = [
  {
    id: "worldcup-2026",
    label: "2026世界杯看球房",
    group: "general",
    sceneEn:
      "2026 FIFA World Cup watch party room, stadium ambient LED glow, cozy sofa zone, premium lifestyle product placement",
    sceneZh:
      "2026美加墨世界杯主题看球房，大屏赛事氛围、沙发区暖光，商品白底保留",
    hookAngle: "宅家观赛氛围一步到位",
    keywords: ["世界杯2026", "看球房"],
    psychologyTriggers: ["community", "emotion", "fomo"],
    viralPotential: 88,
    emotionalHook: "这个世界杯，我要把家变成最嗨的球场",
  },
  {
    id: "summer-camping",
    label: "夏日露营野奢",
    group: "general",
    sceneEn:
      "summer glamping campsite, golden hour sunlight, outdoor lifestyle product on white seamless",
    sceneZh: "夏日野奢露营场景，商品白底居中融入自然背景",
    hookAngle: "周末出逃感，拍照自带滤镜",
    keywords: ["露营", "野奢"],
    psychologyTriggers: ["aspiration", "nostalgia", "transformation"],
    viralPotential: 75,
    emotionalHook: "逃离城市，这才是向往的生活",
  },
];

export const TRENDS: Trend[] = [...DEWU_TRENDS, ...GENERAL_TRENDS];

export const DEFAULT_DEWU_TREND_ID = "dewu-sneaker-heat";

export function getTrendById(id: string): Trend | undefined {
  return TRENDS.find((t) => t.id === id);
}
