import { describe, expect, it } from "vitest";
import {
  analyzeIntelConfidence,
  analyzeSources,
  confidenceScore,
  parseSourceDate,
  rankByTrustThenHeat,
} from "@/lib/forge/intel-confidence";

const NOW = new Date("2026-06-20T12:00:00");

describe("parseSourceDate", () => {
  it("识别常见写法", () => {
    expect(parseSourceDate("得物社区话题｜#夏日球鞋｜2026-06-11", NOW)).toBe("2026-06-11");
    expect(parseSourceDate("小红书 2026/6/1 笔记趋势", NOW)).toBe("2026-06-01");
    expect(parseSourceDate("2026年6月3日 抖音热搜", NOW)).toBe("2026-06-03");
  });

  it("只有月日时按今年算，未来日期回退到上一年", () => {
    expect(parseSourceDate("榜单 6-11 更新", NOW)).toBe("2026-06-11");
    expect(parseSourceDate("榜单 12-25 更新", NOW)).toBe("2025-12-25");
  });

  it("无日期返回 undefined", () => {
    expect(parseSourceDate("得物社区话题", NOW)).toBeUndefined();
  });
});

describe("analyzeSources", () => {
  it("算出每条来源的日期与天数差", () => {
    const insights = analyzeSources(
      ["a｜2026-06-11", "b 无日期"],
      NOW
    );
    expect(insights[0].date).toBe("2026-06-11");
    expect(insights[0].ageDays).toBe(9);
    expect(insights[1].date).toBeUndefined();
  });
});

describe("analyzeIntelConfidence", () => {
  it("无来源 → low + 需核实", () => {
    const c = analyzeIntelConfidence([], NOW);
    expect(c.level).toBe("low");
    expect(c.needsVerify).toBe(true);
    expect(c.reasons.join()).toContain("未提供来源");
  });

  it("有来源但都没日期 → medium + 需核实", () => {
    const c = analyzeIntelConfidence(["得物社区话题", "小红书笔记"], NOW);
    expect(c.level).toBe("medium");
    expect(c.needsVerify).toBe(true);
    expect(c.reasons.join()).toContain("未标注日期");
  });

  it("两条带日期的近期来源 → high，不需核实", () => {
    const c = analyzeIntelConfidence(
      ["得物话题｜2026-06-18", "小红书｜2026-06-15"],
      NOW
    );
    expect(c.level).toBe("high");
    expect(c.needsVerify).toBe(false);
    // 最新（ageDays 最小）的是 06-18
    expect(c.freshestDate).toBe("2026-06-18");
    expect(c.freshestAgeDays).toBe(2);
  });

  it("来源过旧 → low 并说明过时", () => {
    const c = analyzeIntelConfidence(["榜单｜2026-01-01"], NOW);
    expect(c.level).toBe("low");
    expect(c.freshestAgeDays).toBeGreaterThan(60);
    expect(c.reasons.join()).toContain("可能过时");
  });

  it("只有 1 条带日期 → medium", () => {
    const c = analyzeIntelConfidence(["得物话题｜2026-06-18", "无日期"], NOW);
    expect(c.level).toBe("medium");
    expect(c.reasons.join()).toContain("仅 1 条");
  });
});

describe("confidenceScore", () => {
  it("等级越高分越高，且旧来源会被扣分", () => {
    const high = confidenceScore(
      analyzeIntelConfidence(["a｜2026-06-18", "b｜2026-06-19"], NOW)
    );
    const none = confidenceScore(analyzeIntelConfidence([], NOW));
    const stale = confidenceScore(analyzeIntelConfidence(["a｜2026-01-01"], NOW));
    expect(high).toBeGreaterThan(none);
    expect(high).toBeGreaterThan(stale);
  });
});

describe("rankByTrustThenHeat", () => {
  it("可核验的情报排在需核实之前，同层再按热度", () => {
    const verifiedLowHeat = {
      id: "v",
      heatScore: 60,
      confidence: { needsVerify: false } as never,
    };
    const unverifiedHighHeat = {
      id: "u",
      heatScore: 95,
      confidence: { needsVerify: true } as never,
    };
    const verifiedHighHeat = {
      id: "v2",
      heatScore: 88,
      confidence: { needsVerify: false } as never,
    };

    const ranked = rankByTrustThenHeat([
      unverifiedHighHeat,
      verifiedLowHeat,
      verifiedHighHeat,
    ]);
    expect(ranked.map((t) => t.id)).toEqual(["v2", "v", "u"]);
  });

  it("没有 confidence 的项按需核实处理，保持稳定顺序", () => {
    const ranked = rankByTrustThenHeat([
      { id: "a", heatScore: 50 },
      { id: "b", heatScore: 90 },
    ]);
    expect(ranked.map((t) => t.id)).toEqual(["b", "a"]);
  });
});
