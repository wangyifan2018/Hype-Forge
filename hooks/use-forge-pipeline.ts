"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  estimateDataUrlBytes,
  MAX_VISION_TOTAL_BYTES,
} from "@/lib/forge/image";
import { filesToProductImages } from "@/lib/forge/image-client";
import { formatAgentTime } from "@/lib/forge/agent-phases";
import { DEFAULT_LLM_MODEL_ID, LLM_MODELS, resolveLlmModelId, type LlmModelOption } from "@/lib/ai/models";
import { consumeSseStream } from "@/lib/forge/sse-client";
import { loadRunSnapshot, saveRunSnapshot } from "@/lib/forge/run-store";
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
  /** 服务端默认模型（DASHSCOPE_MODEL），UI 未显式选择时使用 */
  const [defaultModel, setDefaultModel] = useState(DEFAULT_LLM_MODEL_ID);
  /** UI 可选模型目录（由 /api/forge/health 下发，失败时用本地目录兜底） */
  const [models, setModels] = useState<LlmModelOption[]>([...LLM_MODELS]);
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
  /** 上次执行用的输入（用于刷新后恢复 remix/engage 等依赖 lastInput 的功能） */
  const [restoredInput, setRestoredInput] = useState<ForgeInput | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastRunInputRef = useRef<ForgeInput | null>(null);

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
      .then(
        (data: {
          mode: ForgeMode;
          model?: string;
          defaultModel?: string;
          models?: LlmModelOption[];
        }) => {
          setMode(data.mode);
          setDefaultModel(
            resolveLlmModelId(data.defaultModel ?? data.model ?? DEFAULT_LLM_MODEL_ID)
          );
          if (data.models?.length) setModels(data.models);
        }
      )
      .catch(() => setMode("mock"));
  }, []);

  // 刷新后恢复上一次 Execute 的结果（此前刷新即全部丢失）
  useEffect(() => {
    const snapshot = loadRunSnapshot();
    if (!snapshot) return;
    setProductBrief(snapshot.productBrief);
    setViralBrief(snapshot.viralBrief);
    setPrompts(snapshot.prompts);
    setPromptsOptimized(snapshot.promptsOptimized);
    setCopyText(snapshot.copyText);
    setCritic(snapshot.critic);
    setRestoredInput(snapshot.input);
    setStatus("done");
    appendLog(
      `已恢复上次生成结果（${new Date(snapshot.savedAt).toLocaleString("zh-CN")}）`,
      "info"
    );
  }, [appendLog]);

  // 执行完成后落盘快照
  useEffect(() => {
    if (status !== "done" || !copyText) return;
    const input = lastRunInputRef.current;
    if (!input) return;
    saveRunSnapshot({
      savedAt: new Date().toISOString(),
      input,
      productBrief,
      viralBrief,
      prompts,
      promptsOptimized,
      copyText,
      critic,
    });
  }, [
    status,
    copyText,
    productBrief,
    viralBrief,
    prompts,
    promptsOptimized,
    critic,
  ]);

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
    async (
      input: ForgeInput,
      imageFiles: File[] = [],
      options?: { model?: string }
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      lastRunInputRef.current = input;
      setRestoredInput(null);
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
          body: JSON.stringify({ input: payloadInput, model: options?.model }),
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
    restoredInput,
    defaultModel,
    models,
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
