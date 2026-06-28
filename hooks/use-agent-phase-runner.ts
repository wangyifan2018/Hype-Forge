"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentLogEntry } from "@/components/forge/agent-activity-log";
import {
  formatAgentTime,
  type AgentPhase,
  type AgentPhaseId,
} from "@/lib/forge/agent-phases";
import {
  buildPhaseInsight,
  getInsightIcon,
  type InsightEntry,
  type IntelAnalysisContext,
} from "@/lib/forge/intel-analysis";

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
  const analysisCtxRef = useRef<IntelAnalysisContext>({ pipeline: "full" });

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

  const pushInsight = useCallback((phaseId: AgentPhaseId) => {
    const line = buildPhaseInsight(phaseId, analysisCtxRef.current);
    if (line.startsWith("跳过")) return;
    setInsights((prev) => {
      if (prev.some((p) => p.text === line)) return prev;
      return [
        ...prev,
        {
          id: newLogId(),
          text: line,
          icon: getInsightIcon(phaseId),
          phaseId,
        },
      ];
    });
  }, []);

  const runPhases = useCallback(
    async (
      phases: AgentPhase[],
      task: (signal: AbortSignal) => Promise<void>,
      analysisCtx?: IntelAnalysisContext
    ) => {
      clearTimers();
      const ac = new AbortController();
      abortRef.current = ac;
      if (analysisCtx) analysisCtxRef.current = analysisCtx;

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
          pushInsight(phase.id);
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
    [append, clearTimers, pushInsight]
  );

  return {
    entries,
    running,
    activePhases,
    phaseIndex,
    insights,
    append,
    reset,
    cancel,
    runPhases,
    setRunning,
    setEntries,
    getAbortSignal: () => abortRef.current?.signal,
  };
}
