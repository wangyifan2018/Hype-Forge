"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentLogEntry } from "@/components/forge/agent-activity-log";
import {
  formatAgentTime,
  type AgentPhase,
  type AgentPhaseId,
} from "@/lib/forge/agent-phases";
import { getInsightIcon, type InsightEntry } from "@/lib/forge/intel-analysis";
import {
  formatStageMs,
  type IntelStage,
  type IntelStageId,
} from "@/lib/forge/intel-stages";

function newLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useAgentPhaseRunner() {
  const [entries, setEntries] = useState<AgentLogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [activePhases, setActivePhases] = useState<AgentPhase[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const [insights, setInsights] = useState<InsightEntry[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const append = useCallback(
    (message: string, level: AgentLogEntry["level"] = "info") => {
      setEntries((prev) => [
        ...prev,
        {
          id: newLogId(),
          time: formatAgentTime(),
          message,
          level,
        },
      ]);
    },
    []
  );

  const reset = useCallback(() => {
    clearTimers();
    abortRef.current?.abort();
    abortRef.current = null;
    setEntries([]);
    setRunning(false);
    setActivePhases([]);
    setPhaseIndex(-1);
    setInsights([]);
  }, [clearTimers]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    clearTimers();
    setRunning(false);
    append("用户已停止情报检索", "warn");
  }, [append, clearTimers]);

  /**
   * 写入服务端返回的**真实**阶段回执：阶段名、说明与真实耗时。
   * 这是取代"13 个 delayMs 动画阶段"的唯一数据源，界面不再编造过程。
   */
  const recordStages = useCallback(
    (stages: IntelStage[] | undefined) => {
      if (!stages?.length) return;
      const iconFor: Record<IntelStageId, AgentPhaseId> = {
        cache: "parse_scope",
        search: "search_web",
        parse: "cluster_topics",
        rank: "rank_leads",
        fallback: "done",
        mock: "connect",
      };
      setInsights((prev) => {
        const next = [...prev];
        for (const stage of stages) {
          const phaseId = iconFor[stage.id] ?? "done";
          const text = `${stage.label}${stage.detail ? `（${stage.detail}）` : ""} · ${formatStageMs(stage.ms)}`;
          if (next.some((p) => p.text === text)) continue;
          next.push({
            id: newLogId(),
            text,
            icon: getInsightIcon(phaseId),
            phaseId,
          });
        }
        return next;
      });
      for (const stage of stages) {
        append(
          `${stage.status === "warn" ? "⚠ " : "· "}${stage.label}${
            stage.detail ? `：${stage.detail}` : ""
          }（${formatStageMs(stage.ms)}）`,
          stage.status === "warn" ? "warn" : "info"
        );
      }
    },
    [append]
  );

  const runPhases = useCallback(
    async (
      phases: AgentPhase[],
      task: (signal: AbortSignal) => Promise<void>
    ) => {
      clearTimers();
      const ac = new AbortController();
      abortRef.current = ac;

      setRunning(true);
      setActivePhases(phases);
      setPhaseIndex(-1);
      setInsights([]);
      setEntries([]);

      phases.forEach((phase, index) => {
        const delay = phases
          .slice(0, index)
          .reduce((sum, p) => sum + p.delayMs, 0);
        const t = setTimeout(() => {
          if (ac.signal.aborted) return;
          setPhaseIndex(index);
          append(phase.message, "info");
        }, delay);
        timersRef.current.push(t);
      });

      try {
        await task(ac.signal);
        if (!ac.signal.aborted) {
          setPhaseIndex(phases.length - 1);
        }
      } finally {
        clearTimers();
        if (abortRef.current === ac) abortRef.current = null;
        setRunning(false);
      }
    },
    [append, clearTimers]
  );

  return {
    entries,
    running,
    activePhases,
    phaseIndex,
    insights,
    append,
    recordStages,
    reset,
    cancel,
    runPhases,
    setRunning,
    setEntries,
    getAbortSignal: () => abortRef.current?.signal,
  };
}
