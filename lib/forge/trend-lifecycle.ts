import type { HotTrendCard } from "@/lib/forge/types";

export const LIFECYCLE_LABELS: Record<
  NonNullable<HotTrendCard["lifecycleStage"]>,
  string
> = {
  emerging: "新兴",
  rising: "上升",
  peak: "峰值",
  declining: "回落",
};

export const LIFECYCLE_BADGE_CLASS: Record<
  NonNullable<HotTrendCard["lifecycleStage"]>,
  string
> = {
  emerging: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  rising: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  peak: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  declining: "border-terminal-border bg-terminal-bg/60 text-terminal-muted",
};
