"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type {
  IntelAutoScope,
  IntelDiscoveryMode,
} from "@/lib/forge/intel-discovery";
import type { HotTrendCard, Platform } from "@/lib/forge/types";
import type { IntelStage } from "@/lib/forge/intel-stages";
import { rankByTrustThenHeat } from "@/lib/forge/intel-confidence";

/** 情报检索返回：数据 + 服务端真实阶段回执 */
export type TrendScanMeta = {
  items: HotTrendCard[];
  stages: IntelStage[];
  cached: boolean;
  fallback: boolean;
  elapsedMs: number;
};

export type TrendScanRequest = {
  platform: Platform;
  categoryHint: string;
  categoryLabel?: string;
  forceRefresh?: boolean;
  discoveryMode?: IntelDiscoveryMode;
  autoScope?: IntelAutoScope;
  /** 本次扫描使用的模型（见 lib/ai/models.ts） */
  model?: string;
};

export function useTrendScan() {
  const [scanning, setScanning] = useState(false);
  const [scannedTrends, setScannedTrends] = useState<HotTrendCard[]>([]);
  const [scanCached, setScanCached] = useState(false);
  const [searchedAt, setSearchedAt] = useState<string | null>(null);
  /** true = 服务端联网失败，当前展示的是示例数据 */
  const [fallback, setFallback] = useState(false);

  const scan = useCallback(async (params: TrendScanRequest, signal?: AbortSignal) => {
    setScanning(true);
    try {
      const res = await fetch("/api/forge/trends/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "热点扫描失败"
        );
      }
      const data = (await res.json()) as {
        trends: HotTrendCard[];
        cached?: boolean;
        searchedAt?: string;
        /** true = 服务端联网调用失败，返回的是示例数据 */
        fallback?: boolean;
        fallbackReason?: string;
        /** 服务端实际发生的阶段与耗时 */
        stages?: IntelStage[];
        elapsedMs?: number;
      };
      setFallback(Boolean(data.fallback));
      if (data.fallback) {
        toast.warning(
          `热点情报联网失败，已降级为示例数据${data.fallbackReason ? `：${data.fallbackReason}` : ""}`
        );
      }
      // 服务端已按"可核验优先、热度次之"排序，这里沿用同一规则，避免打乱
      const sorted = rankByTrustThenHeat(data.trends);
      setScannedTrends(sorted);
      setScanCached(Boolean(data.cached));
      setSearchedAt(data.searchedAt ?? new Date().toISOString());
      return {
        items: sorted,
        stages: data.stages ?? [],
        cached: Boolean(data.cached),
        fallback: Boolean(data.fallback),
        elapsedMs: data.elapsedMs ?? 0,
      } satisfies TrendScanMeta;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw error;
    } finally {
      setScanning(false);
    }
  }, []);

  return {
    scanning,
    scannedTrends,
    scanCached,
    searchedAt,
    fallback,
    scan,
    setScannedTrends,
  };
}
