import { describe, expect, it } from "vitest";
import {
  HIT_THRESHOLDS,
  isHitPost,
  learnFromHistory,
} from "@/lib/forge/strategy-learner";
import { buildCopywriterSystem } from "@/lib/ai/prompts/copywriter";
import type { PostedRecord } from "@/lib/forge/local-store";
import type { ForgeInput } from "@/lib/forge/types";

function post(overrides: Partial<PostedRecord> = {}): PostedRecord {
  return {
    id: "p1",
    productName: "AJ1 北卡蓝",
    postedAt: new Date().toISOString(),
    isHit: false,
    ...overrides,
  };
}

const HIT_POST = post({
  id: "hit-1",
  title: "3 天通勤实测｜这双北卡蓝真的绝了",
  copySnippet: "最近入手了这双鞋，拿到手就上脚试了，绝了…",
  hookFramework: "AIDA",
  platform: "dewu",
  engagement: {
    likes: HIT_THRESHOLDS.dewu.likes + 10,
    comments: 12,
    shares: 6,
    saves: 20,
    views: 2000,
  },
});

const FLOP_POST = post({
  id: "flop-1",
  title: "随便写写",
  hookFramework: "PAS",
  platform: "dewu",
  engagement: { likes: 1, comments: 0, shares: 0, saves: 0, views: 100 },
});

describe("isHitPost", () => {
  it("互动达标判为爆款", () => {
    expect(isHitPost(HIT_POST)).toBe(true);
  });

  it("没有互动数据时不算爆款", () => {
    expect(isHitPost(post())).toBe(false);
    expect(isHitPost(FLOP_POST)).toBe(false);
  });
});

describe("learnFromHistory（学习闭环）", () => {
  it("用真实爆款产出 ICL 块，并给出样本数与最佳框架", () => {
    const learn = learnFromHistory([HIT_POST, FLOP_POST]);
    expect(learn.sampleCount).toBe(1);
    expect(learn.iclBlock).toContain("历史爆款参考");
    expect(learn.iclBlock).toContain("3 天通勤实测");
    expect(learn.topFramework).toBe("AIDA");
  });

  it("没有爆款时 ICL 为空，不污染 prompt", () => {
    const learn = learnFromHistory([FLOP_POST]);
    expect(learn.iclBlock).toBe("");
    expect(learn.sampleCount).toBe(0);
    expect(learn.topFramework).toBeNull();
  });
});

describe("copywriter 注入历史爆款", () => {
  const baseInput: ForgeInput = {
    trendId: "dewu-sneaker-heat",
    productName: "AJ1 北卡蓝",
    sellingPoints: "白蓝配色，到手 749",
    platform: "dewu",
  };

  it("有 learnContext 时 system 里带上历史爆款块", () => {
    const system = buildCopywriterSystem({
      ...baseInput,
      learnContext: {
        iclBlock: "【历史爆款参考】\n1. 标题：3 天通勤实测",
        topFramework: "AIDA",
        sampleCount: 1,
      },
    });
    expect(system).toContain("你的历史爆款");
    expect(system).toContain("3 天通勤实测");
    expect(system).toContain("历史最佳框架：AIDA");
  });

  it("没有 learnContext 时 system 不出现历史爆款块", () => {
    const system = buildCopywriterSystem(baseInput);
    expect(system).not.toContain("你的历史爆款");
  });
});
