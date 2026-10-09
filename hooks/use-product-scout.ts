"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type {
  IntelAutoScope,
  IntelDiscoveryMode,
} from "@/lib/forge/intel-discovery";
import type { HotProductLead, HotTrendCard } from "@/lib/forge/types";
import type { IntelStage } from "@/lib/forge/intel-stages";

/** 爆款检索返回：数据 + 服务端真实阶段回执 */
export type ScoutMeta = {
  items: HotProductLead[];
  stages: IntelStage[];
  cached: boolean;
  fallback: boolean;
  elapsedMs: number;
};

export type ScoutRequest = {
  categoryHint: string;
  categoryLabel?: string;
  selectedTrend?: HotTrendCard | null;
  forceRefresh?: boolean;
  discoveryMode?: IntelDiscoveryMode;
  autoScope?: IntelAutoScope;
  /** 本次扫描使用的模型（见 lib/ai/models.ts） */
  model?: string;
};

export function useProductScout() {
  const [scouting, setScouting] = useState(false);
  const [leads, setLeads] = useState<HotProductLead[]>([]);
  const [scoutCached, setScoutCached] = useState(false);
  const [searchedAt, setSearchedAt] = useState<string | null>(null);
  /** true = 服务端联网失败，当前展示的是示例数据 */
  const [fallback, setFallback] = useState(false);

  const scout = useCallback(async (params: ScoutRequest, signal?: AbortSignal) => {
    setScouting(true);
    try {
      const res = await fetch("/api/forge/dewu/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "爆款情报扫描失败"
        );
      }
      const data = (await res.json()) as {
        leads: HotProductLead[];
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
          `爆款情报联网失败，已降级为示例数据${data.fallbackReason ? `：${data.fallbackReason}` : ""}`
        );
      }
      setLeads(data.leads);
      setScoutCached(Boolean(data.cached));
      setSearchedAt(data.searchedAt ?? new Date().toISOString());
      return {
        items: data.leads,
        stages: data.stages ?? [],
        cached: Boolean(data.cached),
        fallback: Boolean(data.fallback),
        elapsedMs: data.elapsedMs ?? 0,
      } satisfies ScoutMeta;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw error;
    } finally {
      setScouting(false);
    }
  }, []);

  return {
    scouting,
    leads,
    scoutCached,
    searchedAt,
    fallback,
    scout,
    setLeads,
  };
}
