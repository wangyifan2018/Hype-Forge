"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check, Circle, Loader2, X } from "lucide-react";
import { STEP_LABELS } from "@/lib/forge/pipeline-labels";
import { stepErrorHint } from "@/lib/forge/pipeline-labels";
import type {
  ForgeProgressStep,
  PipelineLogEntry,
  PipelineStatus,
} from "@/lib/forge/types";
import { cn } from "@/lib/utils";

const STEPS: ForgeProgressStep[] = [
  "vision",
  "viralBrief",
  "visual",
  "copy",
  "critic",
];

type StepStatus = "pending" | "running" | "done" | "error" | "skipped";

type PipelineTimelineProps = {
  status: PipelineStatus;
  progressStep: ForgeProgressStep | null;
  logs: PipelineLogEntry[];
  lastError: { step?: ForgeProgressStep; message: string } | null;
  hasImage: boolean;
  defaultOpen?: boolean;
};

function deriveStepStatus(
  step: ForgeProgressStep,
  status: PipelineStatus,
  progressStep: ForgeProgressStep | null,
  lastError: PipelineTimelineProps["lastError"],
  hasImage: boolean
): StepStatus {
  if (step === "vision" && !hasImage) return "skipped";
  if (lastError?.step === step) return "error";
  const order = STEPS.indexOf(step);
  const current = progressStep ? STEPS.indexOf(progressStep) : -1;
  if (status === "running" && progressStep === step) return "running";
  if (status === "error" && lastError?.step === step) return "error";
  if (status === "done" || (current >= 0 && order < current)) return "done";
  if (status === "running" && current >= 0 && order === current)
    return "running";
  return "pending";
}

export function PipelineTimeline({
  status,
  progressStep,
  logs,
  lastError,
  hasImage,
}: PipelineTimelineProps) {
  if (status === "idle" && !lastError && logs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-md border border-terminal-border/80 bg-terminal-bg/40 p-3"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-terminal-accent">
        Forge Pipeline · Agent 执行轨迹
      </p>

      {/* Progress bar */}
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-terminal-muted/20">
        <motion.div
          className="h-full bg-gradient-to-r from-terminal-accent to-emerald-400"
          initial={{ width: 0 }}
          animate={{
            width: (() => {
              if (status === "done") return "100%";
              if (status === "error") {
                const errorIdx = lastError?.step
                  ? STEPS.indexOf(lastError.step)
                  : -1;
                return errorIdx >= 0 ? `${((errorIdx + 1) / STEPS.length) * 100}%` : "0%";
              }
              if (progressStep) {
                const idx = STEPS.indexOf(progressStep);
                return idx >= 0 ? `${((idx + 0.5) / STEPS.length) * 100}%` : "0%";
              }
              return "0%";
            })(),
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <ol className="space-y-2">
        <AnimatePresence mode="popLayout">
          {STEPS.map((step) => {
            const st = deriveStepStatus(
              step,
              status,
              progressStep,
              lastError,
              hasImage
            );
            return (
              <motion.li
                key={step}
                id={`pipeline-step-${step}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 text-[10px]"
              >
                <motion.span
                  className="mt-0.5 shrink-0"
                  animate={st === "running" ? { scale: [1, 1.2, 1] } : {}}
                  transition={{
                    duration: 1.5,
                    repeat: st === "running" ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {st === "running" && (
                      <motion.div
                        key="running"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-terminal-accent" />
                      </motion.div>
                    )}
                    {st === "done" && (
                      <motion.div
                        key="done"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      </motion.div>
                    )}
                    {st === "error" && (
                      <motion.div
                        key="error"
                        initial={{ scale: 0, rotate: 90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <X className="h-3.5 w-3.5 text-red-400" />
                      </motion.div>
                    )}
                    {(st === "pending" || st === "skipped") && (
                      <motion.div
                        key="pending"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Circle
                          className={cn(
                            "h-3.5 w-3.5",
                            st === "skipped"
                              ? "text-terminal-muted/40"
                              : "text-terminal-muted"
                          )}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.span>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "font-medium",
                      st === "error" && "text-red-400",
                      st === "running" && "text-terminal-accent",
                      st === "skipped" && "text-terminal-muted"
                    )}
                  >
                    {STEP_LABELS[step]}
                    {st === "skipped" && "（已跳过）"}
                  </span>
                  <AnimatePresence mode="wait">
                    {st === "error" && lastError?.step === step && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-0.5 text-red-300/90"
                      >
                        {lastError.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      <AnimatePresence>
        {lastError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-[10px] text-red-200/90"
          >
            <p className="font-semibold">执行失败</p>
            <p className="mt-0.5">{lastError.message}</p>
            <p className="mt-1 text-red-200/70">
              {stepErrorHint(lastError.step, lastError.message)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {logs.length > 0 && (
        <div className="mt-2 max-h-24 overflow-y-auto font-mono text-[9px] text-terminal-muted">
          <AnimatePresence>
            {logs.slice(-8).map((l) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  l.level === "error" && "text-red-400",
                  l.level === "success" && "text-emerald-400/80",
                  l.level === "warn" && "text-amber-300/80"
                )}
              >
                [{l.time}] {l.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
