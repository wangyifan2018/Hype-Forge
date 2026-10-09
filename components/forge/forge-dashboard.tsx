"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  DEFAULT_INPUT_FORM_VALUES,
  inputFormResolver,
  type InputFormValues,
} from "@/lib/forge/form-schema";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { InputPanel } from "@/components/forge/input-panel";
import { IntelRadarPanel } from "@/components/forge/intel-radar-panel";
import { VisualCommander } from "@/components/forge/visual-commander";
import { CopywriterTerminal } from "@/components/forge/copywriter-terminal";
import type { SellerStep } from "@/components/forge/seller-stepper";
import { useAgentPhaseRunner } from "@/hooks/use-agent-phase-runner";
import {
  ForgePipelineError,
  useForgePipeline,
} from "@/hooks/use-forge-pipeline";
import { STEP_LABELS } from "@/lib/forge/pipeline-labels";
import {
  usePrefsStore,
  usePicklistStore,
  usePostedStore,
  usePublishChecklistStore,
} from "@/hooks/use-forge-store";
import { buildIntelRunningPhases } from "@/lib/forge/agent-phases";
import { intelPipelineTitle } from "@/lib/forge/intel-analysis";
import { useProductScout } from "@/hooks/use-product-scout";
import { useTrendScan } from "@/hooks/use-trend-scan";
import type { PicklistItem } from "@/lib/forge/local-store";
import { hotCardFromStaticTrend } from "@/lib/forge/trend-resolve";
import { DEFAULT_DEWU_TREND_ID, getTrendById } from "@/lib/forge/trends";
import {
  buildScoutHintForMode,
  buildTrendScanHintForMode,
  hasManualIntelClue,
  type IntelDiscoveryMode,
} from "@/lib/forge/intel-discovery";
import { inferWorkspaceContext } from "@/lib/forge/infer-workspace";
import {
  LLM_MODELS,
  llmModelLabel,
  resolveLlmModelId,
} from "@/lib/ai/models";
import { parseProductPaste } from "@/lib/forge/parse-product-paste";
import { parseDewuPublish } from "@/lib/forge/parse-dewu-publish";
import { learnFromHistory } from "@/lib/forge/strategy-learner";
import { loadStep3Draft, saveStep3Draft } from "@/lib/forge/draft-store";
import { getCategoryLabel, STYLE_OPTIONS } from "@/lib/forge/workspace-prefs";
import type { ProductImageDraft } from "@/components/forge/product-images-upload";
import type {
  EngageReplyStrategy,
  ForgeInput,
  HotProductLead,
  HotTrendCard,
} from "@/lib/forge/types";
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function ForgeDashboard() {
  /**
   * 唯一表单实例：通过 <FormProvider> 下发，InputPanel 用 useFormContext 读写同一份状态。
   * 切勿在子组件里另建 useForm（曾因此导致 Step3 粘贴内容进不了流水线）。
   */
  const form = useForm<InputFormValues>({
    resolver: inputFormResolver,
    defaultValues: DEFAULT_INPUT_FORM_VALUES,
  });

  const { watch, setValue, getValues } = form;

  const formValues = watch();
  const [sellerStep, setSellerStep] = useState<SellerStep>(1);
  const [trendContext, setTrendContext] = useState<HotTrendCard | null>(() =>
    hotCardFromStaticTrend(getTrendById(DEFAULT_DEWU_TREND_ID))
  );
  const [lastInput, setLastInput] = useState<ForgeInput | null>(null);
  const [productImages, setProductImages] = useState<ProductImageDraft[]>([]);
  const [activePicklistId, setActivePicklistId] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [activeLead, setActiveLead] = useState<HotProductLead | null>(null);
  const [smartIntelRunning, setSmartIntelRunning] = useState(false);
  const [smartIntelRunMode, setSmartIntelRunMode] =
    useState<IntelDiscoveryMode | null>(null);
  const [engageReplyStrategies, setEngageReplyStrategies] = useState<
    EngageReplyStrategy[]
  >([]);
  const intelAgent = useAgentPhaseRunner();

  const { prefs, updatePrefs, setCategory, setModel } = usePrefsStore();
  const {
    picklist,
    addToPicklist,
    updatePicklistItem,
    removeFromPicklist,
    setVerifyChecked,
  } = usePicklistStore();
  const { posted, markPosted, updateEngagement } = usePostedStore();
  const {
    publishChecklist,
    setPublishCheck,
    setEngageTemplates,
    resetPublishChecklist,
    engageTemplates,
  } = usePublishChecklistStore();

  const {
    scanning,
    scannedTrends,
    scanCached,
    fallback: scanFallback,
    scan,
  } = useTrendScan();
  const {
    scouting,
    leads: productLeads,
    scoutCached,
    searchedAt: scoutSearchedAt,
    fallback: scoutFallback,
    scout: scoutProducts,
  } = useProductScout();
  const {
    status,
    mode,
    defaultModel,
    models,
    productBrief,
    viralBrief,
    visionWarning,
    prompts,
    promptsOptimized,
    copyText,
    setCopyText,
    critic,
    progressStep,
    pipelineLogs,
    lastError,
    execute,
    cancel,
    restoredInput,
  } = useForgePipeline();

  // 刷新恢复上次结果时，同步 lastInput，保证 remix/engage 等仍可用
  useEffect(() => {
    if (restoredInput) setLastInput(restoredInput);
  }, [restoredInput]);

  // 识图失败不阻断流水线（降级为纯文本），但必须显式告知用户，
  // 否则「Execute 完成」会让人误以为文案参考了图片。
  useEffect(() => {
    if (visionWarning) toast.warning(visionWarning);
  }, [visionWarning]);

  useEffect(() => {
    const draft = loadStep3Draft();
    if (draft) {
      if (draft.productPaste) setValue("productPaste", draft.productPaste);
      if (draft.productLink) setValue("productLink", draft.productLink);
      if (draft.trendId) setValue("trendId", draft.trendId);
      if (draft.platform) setValue("platform", draft.platform);
    }
  }, [setValue]);

  useEffect(() => {
    saveStep3Draft({
      productPaste: formValues.productPaste,
      productLink: formValues.productLink ?? "",
      trendId: formValues.trendId,
      platform: formValues.platform,
    });
  }, [formValues.productPaste, formValues.productLink, formValues.trendId, formValues.platform]);

  const workspaceCtx = useMemo(() => {
    const hasTextSignal =
      Boolean(prefs.intelQuery?.trim()) ||
      formValues.productPaste.replace(/\s/g, "").length >= 4;
    const inferred = inferWorkspaceContext({
      intelQuery: prefs.intelQuery,
      productName: formValues.productPaste.split(/\r?\n/)[0]?.trim(),
      sellingPoints: formValues.productPaste,
      referenceCopy: formValues.productPaste,
      trendTitle: trendContext?.title,
      preferredCategory: prefs.category,
    });
    if (!hasTextSignal && prefs.category !== "custom") {
      return {
        ...inferred,
        category: prefs.category,
        categoryLabel: getCategoryLabel(prefs.category),
      };
    }
    return inferred;
  }, [
    prefs.intelQuery,
    prefs.category,
    formValues.productPaste,
    trendContext?.title,
  ]);

  const inferredHint = useMemo(() => {
    const styleLabel =
      STYLE_OPTIONS.find((s) => s.id === workspaceCtx.style)?.label ??
      "酷感直给";
    return `${workspaceCtx.categoryLabel} · ${styleLabel}`;
  }, [workspaceCtx]);

  const intelOpts = useMemo(
    () => ({
      category: workspaceCtx.category,
      categoryLabel: workspaceCtx.categoryLabel,
      intelQuery: prefs.intelQuery,
      productName: formValues.productPaste.split(/\r?\n/)[0]?.trim(),
      referenceCopy: formValues.productPaste,
      trendTitle: trendContext?.title,
    }),
    [workspaceCtx, prefs.intelQuery, formValues.productPaste, trendContext?.title]
  );

  const intelDiscoveryMode: IntelDiscoveryMode =
    prefs.intelDiscoveryMode ?? "auto";
  const intelAutoScope = prefs.intelAutoScope ?? "category";

  /** 模型：用户选择优先，其次服务端默认（health 下发的 DASHSCOPE_MODEL） */
  const selectedModel = useMemo(
    () => resolveLlmModelId(prefs.model ?? defaultModel),
    [prefs.model, defaultModel]
  );

  const availableModels = useMemo(
    () => (models.length ? models : [...LLM_MODELS]),
    [models]
  );

  const handleModelChange = useCallback(
    (modelId: string) => {
      setModel(resolveLlmModelId(modelId));
      toast.info(`已切换模型：${llmModelLabel(modelId)}（下次执行生效）`);
    },
    [setModel]
  );

  const canRunManualIntel = useMemo(
    () =>
      hasManualIntelClue({
        intelQuery: prefs.intelQuery,
        productPaste: formValues.productPaste,
      }),
    [prefs.intelQuery, formValues.productPaste]
  );

  const buildForgeInput = useCallback((): ForgeInput => {
    const parsed = parseProductPaste(formValues.productPaste, formValues.productLink ?? "");
    // 历史爆款 ICL：用卖家自己的互动数据筛出的样本喂给文案 prompt（越用越像本人）
    const learn = learnFromHistory(posted);
    return {
      trendId: formValues.trendId,
      productName: parsed.productName,
      sellingPoints: parsed.sellingPoints,
      platform: formValues.platform,
      trendContext,
      dewuProductUrl: parsed.dewuProductUrl,
      affiliateLink: parsed.affiliateLink,
      referenceCopy: parsed.referenceCopy,
      styleTags: workspaceCtx.styleTags,
      ...(learn.iclBlock
        ? {
            learnContext: {
              iclBlock: learn.iclBlock,
              topFramework: learn.topFramework ?? undefined,
              sampleCount: learn.sampleCount,
            },
          }
        : {}),
    };
  }, [formValues, trendContext, workspaceCtx.styleTags, posted]);

  const canGoToSellerStep = useCallback(
    (step: SellerStep): boolean => {
      if (step === 1) return true;
      if (step === 2) {
        return Boolean(trendContext) || formValues.trendId.length > 0;
      }
      if (step === 3) {
        return (
          Boolean(trendContext) ||
          formValues.productPaste.trim().length > 0 ||
          picklist.length > 0 ||
          productLeads.length > 0
        );
      }
      if (step === 4) {
        return formValues.productPaste.replace(/\s/g, "").length >= 10;
      }
      return false;
    },
    [
      trendContext,
      formValues.trendId,
      formValues.productPaste,
      picklist.length,
      productLeads.length,
    ]
  );

  const intelBusy = smartIntelRunning || scouting || scanning;
  /**
   * 情报雷达面板的显隐。
   * 运行中自动展开；**跑完不再自动收起**——真实阶段回执、耗时、来源与趋势卡
   * 都在这个面板里，收起等于把刚花钱换来的情报结论藏掉。用户点「关闭」才收起。
   */
  const [intelShowcase, setIntelShowcase] = useState(false);

  const handleStopIntel = useCallback(() => {
    if (intelAgent.running || intelBusy) {
      intelAgent.cancel();
      setSmartIntelRunning(false);
      setSmartIntelRunMode(null);
      toast.info("已停止情报检索");
      return;
    }
    setIntelShowcase(false);
  }, [intelAgent, intelBusy]);

  const handleScoutProducts = useCallback(
    async (forceRefresh?: boolean, trendOverride?: HotTrendCard | null) => {
      setIntelShowcase(true);
      const trend = trendOverride ?? trendContext;
      const scoutAutoScope =
        intelDiscoveryMode === "auto" ? intelAutoScope : "category";
      const hint = buildScoutHintForMode(intelDiscoveryMode, {
        ...intelOpts,
        selectedTrend: trend,
        autoScope: scoutAutoScope,
      });
      const scoutLabel =
        intelDiscoveryMode === "auto" && scoutAutoScope === "open"
          ? "全站（抖音+小红书+得物）"
          : workspaceCtx.categoryLabel;
      try {
        await intelAgent.runPhases(
          buildIntelRunningPhases("scout"),
          async (signal) => {
            const scout = await scoutProducts(
              {
                categoryHint: hint,
                categoryLabel: scoutLabel,
                selectedTrend: trend,
                forceRefresh,
                discoveryMode: intelDiscoveryMode,
                autoScope: scoutAutoScope,
                model: selectedModel,
              },
              signal
            );
          intelAgent.recordStages(scout.stages);
          const result = scout.items;
          const top = result[0];
          intelAgent.append(
            top
              ? `完成 · ${result.length} 条爆款，优先：${top.name}（竞争${top.competitionLevel}）`
              : `完成 · ${result.length} 条爆款线索`,
            "success"
          );
          if (result.length > 0) setSellerStep(2);
          }
        );
        toast.success(
          trend ? `已按「${trend.title}」完成爆款检索` : "爆款线索已更新"
        );
      } catch (error) {
        if (isAbortError(error)) return;
        const msg = error instanceof Error ? error.message : "爆款情报失败";
        intelAgent.append(`爆款检索失败：${msg}`, "error");
        toast.error(msg);
      }
    },
    [
      scoutProducts,
      intelOpts,
      trendContext,
      workspaceCtx.categoryLabel,
      intelAgent,
      intelDiscoveryMode,
      intelAutoScope,
      mode,
      selectedModel,
    ]
  );

  const runIntelPipeline = useCallback(
    async (discoveryMode: IntelDiscoveryMode) => {
      if (discoveryMode === "manual" && !canRunManualIntel) {
        toast.error("请先填写「情报搜索词」或在 Step3 粘贴商品文案");
        return;
      }

      setSmartIntelRunning(true);
      setSmartIntelRunMode(discoveryMode);
      updatePrefs({ intelDiscoveryMode: discoveryMode });
      let trendsCount = 0;
      let leadsCount = 0;
      const autoScope =
        discoveryMode === "auto" ? intelAutoScope : "category";
      const scanHint = buildTrendScanHintForMode(discoveryMode, {
        ...intelOpts,
        platform: formValues.platform,
        autoScope,
      });
      const intelCategoryLabel =
        discoveryMode === "auto" && autoScope === "open"
          ? "全站（抖音+小红书+得物）"
          : workspaceCtx.categoryLabel;

      try {
        await intelAgent.runPhases(
          buildIntelRunningPhases("trend"),
          async (signal) => {
            const scanResult = await scan(
              {
                platform: formValues.platform,
                categoryHint: scanHint,
                categoryLabel: intelCategoryLabel,
                forceRefresh: true,
                discoveryMode,
                autoScope,
                model: selectedModel,
              },
              signal
            );
            intelAgent.recordStages(scanResult.stages);
            const trends = scanResult.items;
            trendsCount = trends.length;
            const top = trends[0];
            if (top) {
              setValue("trendId", top.id);
              setTrendContext(top);
            }
            const scoutHint = buildScoutHintForMode(discoveryMode, {
              ...intelOpts,
              selectedTrend: top ?? null,
              autoScope,
            });
            const scoutResult = await scoutProducts(
              {
                categoryHint: scoutHint,
                categoryLabel: intelCategoryLabel,
                selectedTrend: top ?? null,
                forceRefresh: true,
                discoveryMode,
                autoScope,
                model: selectedModel,
              },
              signal
            );
            intelAgent.recordStages(scoutResult.stages);
            const leads = scoutResult.items;
            leadsCount = leads.length;
            setSellerStep(2);
            const modeLabel =
              discoveryMode === "auto" ? "智能搜索" : "按线索搜";
            intelAgent.append(
              `${modeLabel}完成 · 场景 ${trendsCount} · 爆款 ${leadsCount}${top ? ` · 首推场景「${top.title}」` : ""}`,
              "success"
            );
          }
        );
        toast.success(
          `${discoveryMode === "auto" ? "智能搜索" : "按线索搜"}完成：${trendsCount} 个场景 + ${leadsCount} 条爆款。请到 Step2 复制关键词去得物验证`
        );
      } catch (error) {
        if (isAbortError(error)) return;
        const msg = error instanceof Error ? error.message : "情报失败";
        intelAgent.append(`情报失败：${msg}`, "error");
        toast.error(msg);
      } finally {
        setSmartIntelRunning(false);
        setSmartIntelRunMode(null);
      }
    },
    [
      scan,
      scoutProducts,
      formValues.platform,
      intelOpts,
      intelAutoScope,
      workspaceCtx.categoryLabel,
      intelAgent,
      canRunManualIntel,
      updatePrefs,
      mode,
      setValue,
      selectedModel,
    ]
  );

  const handleAutoIntel = useCallback(() => {
    setIntelShowcase(true);
    return runIntelPipeline("auto");
  }, [runIntelPipeline]);

  const handleClueIntel = useCallback(() => {
    setIntelShowcase(true);
    return runIntelPipeline("manual");
  }, [runIntelPipeline]);

  const handleSelectTrend = useCallback((trend: HotTrendCard) => {
    setValue("trendId", trend.id);
    setTrendContext(trend);
    toast.info(`已选场景：${trend.title}。可复制下方关键词去得物搜货`);
  }, [setValue]);

  const handleApplyLead = useCallback((lead: HotProductLead) => {
    setActiveLead(lead);
    const refBlock = [
      `【AI 参考·${lead.name}，非得物订单】`,
      lead.contentAngle,
      lead.whyHot,
      `创意：${lead.creativeHooks.join("；")}`,
      `得物可搜：${lead.searchKeywords.join("、")}`,
    ].join("\n");
    const currentPaste = getValues("productPaste");
    const newPaste = currentPaste.trim()
      ? `${currentPaste.trim()}\n\n${refBlock}`
      : `${lead.name}\n${refBlock}`;
    setValue("productPaste", newPaste);
    setSellerStep(2);
    toast.info(
      "已加入 AI 参考卖点（可删改）。请复制关键词去得物 App 搜货，选款后再填 Step3"
    );
  }, [setValue, getValues]);

  const handleLoadPicklist = useCallback(
    (item: PicklistItem) => {
      setActivePicklistId(item.id);
      setActiveLead(item.leadSnapshot);
      const name = item.productName ?? item.leadSnapshot.name;
      const body =
        item.sellingPoints ??
        [item.leadSnapshot.contentAngle, item.leadSnapshot.whyHot].join("\n");
      const paste = item.referenceCopy?.trim()
        ? item.referenceCopy
        : `${name}\n${body}`;
      setValue("productPaste", paste);
      const currentLink = getValues("productLink");
      const newLink = item.dewuProductUrl ?? item.affiliateLink ?? currentLink;
      setValue("productLink", newLink);
      setSellerStep(3);
    },
    [setValue, getValues]
  );

  const handleAddToPicklist = useCallback(
    (lead: HotProductLead) => {
      const item = addToPicklist(lead);
      setActivePicklistId(item.id);
      toast.success("已加入选品池");
    },
    [addToPicklist]
  );

  const syncPicklistFromForm = useCallback(() => {
    if (!activePicklistId) return;
    const parsed = parseProductPaste(formValues.productPaste, formValues.productLink ?? "");
    updatePicklistItem(activePicklistId, {
      productName: parsed.productName,
      sellingPoints: parsed.sellingPoints,
      dewuProductUrl: parsed.dewuProductUrl,
      affiliateLink: parsed.affiliateLink,
      referenceCopy: parsed.referenceCopy ?? formValues.productPaste,
      ...((formValues.productLink ?? "").trim() ? { status: "producing" as const } : {}),
    });
  }, [activePicklistId, formValues, updatePicklistItem]);

  const handleEnrich = useCallback(async () => {
    const paste = formValues.productPaste.trim();
    if (paste.length < 2) {
      toast.error("请先粘贴得物商品文案");
      return;
    }
    setEnriching(true);
    try {
      const parsed = parseProductPaste(formValues.productPaste, formValues.productLink ?? "");
      const res = await fetch("/api/forge/dewu/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: parsed.productName,
          category: workspaceCtx.category,
          creativeHooks: activeLead?.creativeHooks,
          referenceCopy: parsed.referenceCopy ?? paste,
          model: selectedModel,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "补全失败");
      }
      const data = (await res.json()) as {
        sellingPoints: string;
        styleTags?: string[];
        searchKeywords?: string[];
      };
      const title = parsed.productName;
      setValue("productPaste", `${title}\n${data.sellingPoints}`.trim());
      if (data.searchKeywords?.length) {
        toast.info(`得物可搜：${data.searchKeywords.join("、")}`);
      }
      toast.success("卖点已生成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 补卖点失败");
    } finally {
      setEnriching(false);
    }
  }, [
    formValues.productPaste,
    formValues.productLink,
    workspaceCtx.category,
    activeLead,
    setValue,
    selectedModel,
  ]);

  const handleTrendSelect = useCallback(
    (id: string, context: HotTrendCard | null) => {
      setValue("trendId", id);
      setTrendContext(context);
    },
    [setValue]
  );

  const handleExecute = useCallback(async () => {
    syncPicklistFromForm();
    const input = buildForgeInput();
    setLastInput(input);
    setSellerStep(4);
    resetPublishChecklist();

    try {
      await execute(input, productImages.map((i) => i.file), {
        model: selectedModel,
      });
      if (activePicklistId) {
        updatePicklistItem(activePicklistId, { status: "producing" });
      }
      toast.success("Forge Pipeline 完成");
    } catch (error) {
      setSellerStep(4);
      const step =
        error instanceof ForgePipelineError ? error.step : lastError?.step;
      const msg =
        error instanceof Error ? error.message : "流水线执行失败";
      const label = step ? STEP_LABELS[step] : null;
      toast.error(label ? `${label}失败：${msg}` : msg);
      requestAnimationFrame(() => {
        document
          .getElementById("seller-step-4")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (step) {
          document
            .getElementById(`pipeline-step-${step}`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    }
  }, [
    syncPicklistFromForm,
    buildForgeInput,
    productImages,
    execute,
    activePicklistId,
    updatePicklistItem,
    resetPublishChecklist,
    lastError?.step,
    selectedModel,
  ]);

  const handleRemix = useCallback(
    async (
      remixType: string,
      angle?: string,
      mustFix?: string[]
    ): Promise<string | string[] | null> => {
      if (!copyText || !lastInput) return null;
      const res = await fetch("/api/forge/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remixType,
          angle,
          mustFix,
          copyText,
          input: lastInput,
          creativeConcept: prompts?.creativeConcept,
          model: selectedModel,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Remix 失败");
      }
      const data = (await res.json()) as {
        copyText?: string;
        titles?: string[];
      };
      if (data.titles) return data.titles;
      if (data.copyText) {
        setCopyText(data.copyText);
        return data.copyText;
      }
      return null;
    },
    [copyText, lastInput, prompts, setCopyText, selectedModel]
  );

  const handleEngage = useCallback(async () => {
    if (!lastInput) {
      toast.error("请先 Execute 生成内容");
      return;
    }
    try {
      const res = await fetch("/api/forge/dewu/engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: lastInput.productName,
          affiliateLink: lastInput.affiliateLink,
          model: selectedModel,
        }),
      });
      if (!res.ok) throw new Error("生成失败");
      const data = (await res.json()) as {
        templates: string[];
        replyStrategies?: EngageReplyStrategy[];
      };
      setEngageTemplates(data.templates);
      setEngageReplyStrategies(data.replyStrategies ?? []);
      toast.success("评论话术已生成");
    } catch {
      toast.error("评论话术生成失败");
    }
  }, [lastInput, setEngageTemplates, selectedModel]);

  const handleMarkPosted = useCallback(() => {
    const parsed = parseProductPaste(formValues.productPaste, formValues.productLink ?? "");
    if (!parsed.productName.trim()) {
      toast.error("请粘贴商品文案");
      return;
    }
    markPosted({
      productName: parsed.productName,
      affiliateLink: parsed.affiliateLink || undefined,
      copySnippet: copyText.slice(0, 200),
      picklistId: activePicklistId ?? undefined,
      platform: formValues.platform,
      title: parseDewuPublish(copyText).title || undefined,
      hookFramework: viralBrief?.hookFramework,
      isHit: false,
    });
    toast.success("已记入发帖历史");
  }, [
    formValues.productPaste,
    formValues.productLink,
    formValues.platform,
    copyText,
    activePicklistId,
    markPosted,
    viralBrief?.hookFramework,
  ]);

  const creativeHooks =
    activeLead?.creativeHooks ??
    picklist.find((p) => p.id === activePicklistId)?.leadSnapshot
      .creativeHooks ??
    [];

  const intelRadarTitle = intelPipelineTitle({
    pipeline: smartIntelRunMode ? "full" : scouting ? "scout" : "full",
    discoveryMode: smartIntelRunMode ?? intelDiscoveryMode,
    autoScope: intelAutoScope,
  });

  return (
    <FormProvider {...form}>
      <main className="grid h-screen grid-cols-1 gap-px bg-terminal-border lg:grid-cols-[minmax(300px,1fr)_minmax(360px,1.25fr)_minmax(400px,1fr)]">
      <div className="min-h-0 overflow-hidden">
        <InputPanel
        sellerStep={sellerStep}
        onSellerStepChange={setSellerStep}
        canGoToSellerStep={canGoToSellerStep}
        categoryLabel={workspaceCtx.categoryLabel}
        inferredHint={inferredHint}
        activeLead={activeLead}
        onGoToAssetsStep={() => setSellerStep(3)}
        intelQuery={prefs.intelQuery ?? ""}
        onIntelQueryChange={(q) => updatePrefs({ intelQuery: q })}
        workspaceCategory={prefs.category}
        onWorkspaceCategoryChange={setCategory}
        smartIntelRunning={smartIntelRunning}
        smartIntelRunMode={smartIntelRunMode}
        intelAutoScope={intelAutoScope}
        onIntelAutoScopeChange={(s) => updatePrefs({ intelAutoScope: s })}
        canRunManualIntel={canRunManualIntel}
        onAutoIntel={handleAutoIntel}
        onClueIntel={handleClueIntel}
        onStopIntel={handleStopIntel}
        intelShowcase={intelShowcase}
        onSelectTrend={handleSelectTrend}
        onScoutFromTrend={(t) => {
          handleSelectTrend(t);
          void handleScoutProducts(false, t);
        }}
        agentLogEntries={intelAgent.entries}
        agentLogRunning={intelAgent.running || smartIntelRunning}
        picklist={picklist}
        activePicklistId={activePicklistId}
        onAddToPicklist={handleAddToPicklist}
        onLoadPicklist={handleLoadPicklist}
        onRemovePicklist={removeFromPicklist}
        onVerifyToggle={setVerifyChecked}
        onEnrichSellingPoints={handleEnrich}
        enriching={enriching}
        trendContext={trendContext}
        onTrendSelect={handleTrendSelect}
        scannedTrends={scannedTrends}
        scanning={scanning}
        scanCached={scanCached}
        productLeads={productLeads}
        scouting={scouting}
        scoutCached={scoutCached}
        scoutSearchedAt={scoutSearchedAt}
        scoutFallback={scoutFallback}
        onApplyLead={handleApplyLead}
        productImages={productImages}
        onProductImagesChange={setProductImages}
        status={status}
        mode={mode}
        model={selectedModel}
        onModelChange={handleModelChange}
        availableModels={availableModels}
        productBrief={productBrief}
        viralBrief={viralBrief}
        visionWarning={visionWarning}
        progressStep={progressStep}
        pipelineLogs={pipelineLogs}
        lastError={lastError}
        hasProductImages={productImages.length > 0}
        onExecute={handleExecute}
        onCancel={() => {
          cancel();
          toast.info("已取消流水线");
        }}
        />
      </div>
      <AnimatePresence mode="wait">
        {intelShowcase ? (
          <motion.div
            key="intel-radar"
            className="min-h-0 overflow-hidden"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <IntelRadarPanel
              className="h-full"
              title={intelRadarTitle}
              subtitle={[
                intelAutoScope === "open"
                  ? "全站跨平台"
                  : workspaceCtx.categoryLabel,
                mode === "live" ? "LIVE 联网" : "MOCK",
                scanFallback ? "已降级为示例数据" : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              phases={intelAgent.activePhases}
              phaseIndex={intelAgent.phaseIndex}
              insights={intelAgent.insights}
              entries={intelAgent.entries}
              running={intelAgent.running}
              onStop={handleStopIntel}
              trends={scannedTrends}
              leads={productLeads}
            />
          </motion.div>
        ) : (
          <motion.div
            key="forge-panels"
            className="contents"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="min-h-0 overflow-hidden">
              <VisualCommander
                status={status}
                prompts={prompts}
                optimized={promptsOptimized}
                creativeHooks={creativeHooks}
                onRemixAngle={async (angle) => {
                  await handleRemix("angle", angle);
                }}
                disabled={status !== "done" || !copyText}
              />
            </div>
            <div className="min-h-0 overflow-hidden">
              <CopywriterTerminal
                status={status}
                copyText={copyText}
                pipelineLogs={pipelineLogs}
                critic={critic}
                lastInput={lastInput}
                prompts={prompts}
                affiliateLink={formValues.productLink ?? ""}
                publishChecklist={publishChecklist}
                onPublishCheckChange={setPublishCheck}
                engageTemplates={engageTemplates}
                engageReplyStrategies={engageReplyStrategies}
                onGenerateEngage={handleEngage}
                onRemix={handleRemix}
                onCopyTextChange={setCopyText}
                posted={posted}
                onMarkPosted={handleMarkPosted}
                onReloadPosted={(record) => {
                  setValue("productPaste", record.copySnippet
                    ? `${record.productName}\n${record.copySnippet}`
                    : record.productName);
                  if (record.affiliateLink) {
                    setValue("productLink", record.affiliateLink);
                  }
                  if (record.copySnippet) setCopyText(record.copySnippet);
                  toast.info("已从历史载入，可二创后重新 Execute");
                }}
                onUpdateEngagement={updateEngagement}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
    </FormProvider>
  );
}
