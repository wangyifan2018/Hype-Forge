"use client";

import { Square, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEP_LABELS } from "@/lib/forge/pipeline-labels";
import type { ForgeProgressStep, PipelineStatus } from "@/lib/forge/types";

type ExecuteButtonProps = {
  status: PipelineStatus;
  progressStep?: ForgeProgressStep | null;
  onExecute: () => void;
  onCancel?: () => void;
  disabled?: boolean;
};

export function ExecuteButton({
  status,
  progressStep,
  onExecute,
  onCancel,
  disabled,
}: ExecuteButtonProps) {
  const isRunning = status === "running";
  const stepLabel =
    isRunning && progressStep ? STEP_LABELS[progressStep] : null;

  return (
    <div className="space-y-1">
    <Button
      type="button"
      variant="terminal"
      size="lg"
      className="w-full font-semibold"
      onClick={isRunning ? onCancel : onExecute}
      disabled={!isRunning && disabled}
    >
      {isRunning ? (
        <>
          <Square className="h-4 w-4" />
          Cancel Pipeline
        </>
      ) : (
        <>
          <Zap className="h-4 w-4" />
          ⚡️ Execute Forge Pipeline
        </>
      )}
    </Button>
    {stepLabel && (
      <p className="text-center text-[10px] text-terminal-accent">
        Agent 执行中：{stepLabel}…
      </p>
    )}
    {status === "error" && (
      <p className="text-center text-[10px] text-red-400">
        执行失败，请查看上方流水线诊断
      </p>
    )}
    </div>
  );
}
