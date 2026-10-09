// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearRunSnapshot,
  loadRunSnapshot,
  saveRunSnapshot,
  type RunSnapshot,
} from "@/lib/forge/run-store";
import type { ForgeInput } from "@/lib/forge/types";

const input: ForgeInput = {
  trendId: "dewu-sneaker-heat",
  productName: "AJ1 北卡蓝",
  sellingPoints: "到手 749",
  platform: "dewu",
};

function snapshot(overrides: Partial<RunSnapshot> = {}): RunSnapshot {
  return {
    savedAt: new Date().toISOString(),
    input,
    productBrief: null,
    viralBrief: null,
    prompts: null,
    promptsOptimized: false,
    copyText: "## 标题\n实测",
    critic: null,
    ...overrides,
  };
}

afterEach(() => {
  clearRunSnapshot();
});

describe("run-store 快照", () => {
  it("保存后可读回", () => {
    saveRunSnapshot(snapshot());
    const loaded = loadRunSnapshot();
    expect(loaded?.input.productName).toBe("AJ1 北卡蓝");
    expect(loaded?.copyText).toContain("实测");
  });

  it("超长文案会被截断，避免撑爆 localStorage", () => {
    saveRunSnapshot(snapshot({ copyText: "x".repeat(50000) }));
    expect(loadRunSnapshot()?.copyText.length).toBe(20000);
  });

  it("损坏数据不会抛错，按无快照处理", () => {
    localStorage.setItem("hype-forge:last-run", "{不是合法 JSON");
    expect(loadRunSnapshot()).toBeNull();
  });

  it("clear 后读不到", () => {
    saveRunSnapshot(snapshot());
    clearRunSnapshot();
    expect(loadRunSnapshot()).toBeNull();
  });
});
