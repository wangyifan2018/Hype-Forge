"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  estimateDataUrlBytes,
  MAX_VISION_TOTAL_BYTES,
} from "@/lib/forge/image";
import { filesToProductImages } from "@/lib/forge/image-client";
import { formatAgentTime } from "@/lib/forge/agent-phases";
import { consumeSseStream } from "@/lib/forge/sse-client";
import type {
  CriticReport,
  ForgeInput,
  ForgeMode,
  ForgeProgressStep,
  ForgeRunEvent,
  PipelineLogEntry,
  PipelineStatus,
  ProductBrief,
  ViralBrief,
  VisualPrompts,
} from "@/lib/forge/types";

function newLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export class ForgePipelineError extends Error {
  step?: ForgeProgressStep;

  constructor(message: string, step?: ForgeProgressStep) {
    super(message);
    this.name = "ForgePipelineError";
    this.step = step;
  }
}

export function useForgePipeline() {
  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [mode, setMode] = useState<ForgeMode>("mock");
  const [model, setModel] = useState("qwen3.6-plus");
  const [productBrief, setProductBrief] = useState<ProductBrief | null>(null);
  const [viralBrief, setViralBrief] = useState<ViralBrief | null>(null);
  const [visionWarning, setVisionWarning] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<VisualPrompts | null>(null);
  const [promptsOptimized, setPromptsOptimized] = useState(false);
  const [copyText, setCopyText] = useState("");
  const [critic, setCritic] = useState<CriticReport | null>(null);
  const [progressStep, setProgressStep] = useState<ForgeProgressStep | null>(
    null
  );
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLogEntry[]>([]);
  const [lastError, setLastError] = useState<{
    step?: ForgeProgressStep;
    message: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const appendLog = useCallback(
    (
      message: string,
      level: PipelineLogEntry["level"] = "info",
      step?: ForgeProgressStep
    ) => {
      setPipelineLogs((prev) => [
        ...prev,
        {
          id: newLogId(),
          time: formatAgentTime(),
          message,
          level,
          step,
        },
      ]);
    },
    []
  );

  useEffect(() => {
    fetch("/api/forge/health")
      .then((r) => r.json())
      .then((data: { mode: ForgeMode; model: string }) => {
        setMode(data.mode);
        setModel(data.model);
      })
      .catch(() => setMode("mock"));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setProductBrief(null);
    setViralBrief(null);
    setVisionWarning(null);
    setPrompts(null);
    setPromptsOptimized(false);
    setCopyText("");
    setCritic(null);
    setProgressStep(null);
    setPipelineLogs([]);
    setLastError(null);
  }, []);

  const execute = useCallback(
    async (input: ForgeInput, imageFiles: File[] = []) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      setStatus("running");
      setProductBrief(null);
      setViralBrief(null);
      setVisionWarning(null);
      setPrompts(null);
      setPromptsOptimized(false);
      setCopyText("");
      setCritic(null);
      setProgressStep(null);
      setPipelineLogs([]);
      setLastError(null);
      appendLog("开始 Execute Forge Pipeline", "info");

      try {
        let productImages = input.productImages;
        let productImage = input.productImage ?? null;

        if (imageFiles.length > 0) {
          appendLog(`读取 ${imageFiles.length} 张商品图…`, "info");
          productImages = await filesToProductImages(imageFiles);
          const totalBytes = productImages.reduce(
            (sum, p) => sum + estimateDataUrlBytes(p.dataUrl),
            0
          );
          if (totalBytes > MAX_VISION_TOTAL_BYTES) {
            throw new Error(
              `识图数据总量过大（约 ${Math.round(totalBytes / 1024 / 1024)}MB），请减少图片或换更小文件`
            );
          }
          productImage = productImages[0]?.dataUrl ?? null;
        }

        const payloadInput: ForgeInput = {
          ...input,
          productImage,
          productImages,
        };

        const runRes = await fetch("/api/forge/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: payloadInput }),
          signal,
        });

        if (!runRes.ok) {
          const err = await runRes.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ??
              `HTTP ${runRes.status}：流水线请求失败`
          );
        }

        let streamingCopy = false;

        await consumeSseStream<ForgeRunEvent>(
          runRes,
          (event) => {
            switch (event.type) {
              case "progress":
                setProgressStep(event.step);
                break;
              case "log":
                appendLog(
                  event.message,
                  event.level ?? "info",
                  event.step
                );
                if (event.level === "warn" && event.step === "vision") {
                  setVisionWarning(event.message);
                }
                break;
              case "brief":
                setProductBrief(event.data);
                break;
              case "viralBrief":
                setViralBrief(event.data);
                break;
              case "prompts":
                setPrompts(event.data);
                setPromptsOptimized(Boolean(event.optimized));
                break;
              case "critic":
                setCritic(event.data);
                break;
              case "delta":
                if (!streamingCopy) {
                  setCopyText("");
                  streamingCopy = true;
                }
                setCopyText((prev) => prev + event.text);
                break;
              case "done":
                setStatus("done");
                setProgressStep(null);
                break;
              case "error":
                setLastError({
                  step: event.step,
                  message: event.message,
                });
                throw new ForgePipelineError(event.message, event.step);
            }
          },
          signal
        );

        setStatus((s) => (s === "running" ? "done" : s));
        setProgressStep(null);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setStatus("idle");
          appendLog("用户取消执行", "warn");
          return;
        }
        const message =
          error instanceof Error ? error.message : "流水线执行失败";
        setStatus("error");
        setLastError((prev) => prev ?? { message });
        appendLog(message, "error", progressStep ?? undefined);
        throw error;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [appendLog, progressStep]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setProgressStep(null);
  }, []);

  return {
    status,
    mode,
    model,
    productBrief,
    viralBrief,
    visionWarning,
    prompts,
    promptsOptimized,
    copyText,
    critic,
    progressStep,
    pipelineLogs,
    lastError,
    execute,
    cancel,
    reset,
    setCopyText,
  };
}
