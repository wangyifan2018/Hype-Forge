"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type {
  IntelAutoScope,
  IntelDiscoveryMode,
} from "@/lib/forge/intel-discovery";
import type { HotTrendCard, Platform } from "@/lib/forge/types";

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
      };
      if (data.fallback) {
        toast.warning(
          `热点情报联网失败，已降级为示例数据${data.fallbackReason ? `：${data.fallbackReason}` : ""}`
        );
      }
      const sorted = [...data.trends].sort(
        (a, b) => b.heatScore - a.heatScore
      );
      setScannedTrends(sorted);
      setScanCached(Boolean(data.cached));
      setSearchedAt(data.searchedAt ?? new Date().toISOString());
      return sorted;
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
    scan,
    setScannedTrends,
  };
}
