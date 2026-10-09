// @vitest-environment jsdom
/**
 * 发帖记录必须保留 hookFramework / title / platform：
 * 此前 markPosted 只写死 isHit:false 并丢掉这三个字段，导致
 * strategy-learner 永远筛不出爆款样本（学习闭环无法启动）。
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useForgeStore } from "@/hooks/use-forge-store";
import { HIT_THRESHOLDS } from "@/lib/forge/strategy-learner";

describe("useForgeStore · 发帖记录", () => {
  beforeEach(() => {
    useForgeStore.setState({ posted: [], picklist: [] });
  });

  it("markPosted 保留平台、标题与爆款框架", () => {
    const { markPosted } = useForgeStore.getState();
    const record = markPosted({
      productName: "AJ1 北卡蓝",
      copySnippet: "绝了",
      platform: "dewu",
      title: "3 天通勤实测",
      hookFramework: "AIDA",
      isHit: false,
    });

    expect(record.platform).toBe("dewu");
    expect(record.title).toBe("3 天通勤实测");
    expect(record.hookFramework).toBe("AIDA");
    expect(useForgeStore.getState().posted[0].hookFramework).toBe("AIDA");
  });

  it("记录互动后按真实阈值重算 isHit", () => {
    const { markPosted, updateEngagement } = useForgeStore.getState();
    const record = markPosted({
      productName: "AJ1 北卡蓝",
      platform: "dewu",
      title: "实测",
      hookFramework: "AIDA",
      isHit: false,
    });

    expect(useForgeStore.getState().posted[0].isHit).toBe(false);

    updateEngagement(record.id, {
      likes: HIT_THRESHOLDS.dewu.likes + 5,
      comments: 12,
      shares: 6,
      saves: 20,
      views: 1500,
    });

    expect(useForgeStore.getState().posted[0].isHit).toBe(true);
  });
});
