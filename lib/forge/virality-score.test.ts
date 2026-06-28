import { describe, it, expect } from "vitest";
import {
  calculateViralityScore,
  getViralityLevel,
  getViralityColor,
  parseViralityDimensions,
  generateViralityInsights,
  analyzeVirality,
  extractViralityFromCritic,
} from "./virality-score";
import type { ViralityComposite, CriticReport } from "@/lib/forge/types";

const highComposite: ViralityComposite = {
  hookStrength: 92,
  emotionalResonance: 88,
  trendAlignment: 85,
  noveltyFactor: 80,
  timingFit: 78,
  platformNative: 90,
};

const lowComposite: ViralityComposite = {
  hookStrength: 40,
  emotionalResonance: 35,
  trendAlignment: 50,
  noveltyFactor: 45,
  timingFit: 30,
  platformNative: 55,
};

describe("calculateViralityScore", () => {
  it("computes weighted average correctly", () => {
    const score = calculateViralityScore(highComposite);
    // 92*0.25 + 88*0.20 + 85*0.20 + 80*0.15 + 78*0.10 + 90*0.10
    // = 23 + 17.6 + 17 + 12 + 7.8 + 9 = 86.4 → 86
    expect(score).toBe(86);
  });

  it("returns 0 for all-zero composite", () => {
    const zero: ViralityComposite = {
      hookStrength: 0,
      emotionalResonance: 0,
      trendAlignment: 0,
      noveltyFactor: 0,
      timingFit: 0,
      platformNative: 0,
    };
    expect(calculateViralityScore(zero)).toBe(0);
  });
});

describe("getViralityLevel", () => {
  it("returns S for score >= 90", () => {
    expect(getViralityLevel(95)).toBe("S");
    expect(getViralityLevel(90)).toBe("S");
  });

  it("returns A for 80-89", () => {
    expect(getViralityLevel(85)).toBe("A");
    expect(getViralityLevel(80)).toBe("A");
  });

  it("returns B for 70-79", () => {
    expect(getViralityLevel(75)).toBe("B");
  });

  it("returns C for 60-69", () => {
    expect(getViralityLevel(65)).toBe("C");
  });

  it("returns D for < 60", () => {
    expect(getViralityLevel(50)).toBe("D");
    expect(getViralityLevel(0)).toBe("D");
  });
});

describe("getViralityColor", () => {
  it("returns a hex color string for each level", () => {
    for (const level of ["S", "A", "B", "C", "D"] as const) {
      expect(getViralityColor(level)).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe("parseViralityDimensions", () => {
  it("returns 6 dimensions with correct keys", () => {
    const dims = parseViralityDimensions(highComposite);
    expect(dims).toHaveLength(6);
    const keys = dims.map((d) => d.key);
    expect(keys).toContain("hookStrength");
    expect(keys).toContain("platformNative");
  });

  it("maps scores from composite", () => {
    const dims = parseViralityDimensions(highComposite);
    const hook = dims.find((d) => d.key === "hookStrength")!;
    expect(hook.score).toBe(92);
    expect(hook.label).toBe("钩子强度");
  });
});

describe("generateViralityInsights", () => {
  it("returns positive message when all dimensions >= 70", () => {
    const dims = parseViralityDimensions(highComposite);
    const insights = generateViralityInsights(dims);
    expect(insights[0]).toContain("爆款潜质");
  });

  it("returns improvement suggestion for weak dimensions", () => {
    const dims = parseViralityDimensions(lowComposite);
    const insights = generateViralityInsights(dims);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some((i) => i.includes("💡") || i.includes("⚠️"))).toBe(true);
  });
});

describe("analyzeVirality", () => {
  it("returns full analysis with level and dimensions", () => {
    const analysis = analyzeVirality(highComposite);
    expect(analysis.totalScore).toBe(86);
    expect(analysis.level).toBe("A");
    expect(analysis.dimensions).toHaveLength(6);
    expect(analysis.composite).toEqual(highComposite);
  });
});

describe("extractViralityFromCritic", () => {
  it("returns null when viralityComposite is missing", () => {
    const critic = { scores: {}, mustFix: [] } as unknown as CriticReport;
    expect(extractViralityFromCritic(critic)).toBeNull();
  });

  it("returns analysis when viralityComposite is present", () => {
    const critic = {
      scores: {},
      mustFix: [],
      viralityComposite: highComposite,
    } as unknown as CriticReport;
    const result = extractViralityFromCritic(critic);
    expect(result).not.toBeNull();
    expect(result!.level).toBe("A");
  });
});
