"use client";

import { useFormContext } from "react-hook-form";
import { Loader2, Sparkles } from "lucide-react";
import type { AgentLogEntry } from "@/components/forge/agent-activity-log";
import { IntelSearchPanel } from "@/components/forge/intel-search-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ExecuteButton } from "@/components/forge/execute-button";
import {
  ProductImagesUpload,
  type ProductImageDraft,
} from "@/components/forge/product-images-upload";
import { PicklistPanel } from "@/components/forge/picklist-panel";
import {
  SellerStepper,
  stepSectionId,
  type SellerStep,
} from "@/components/forge/seller-stepper";
import { WorkflowGuide } from "@/components/forge/workflow-guide";
import type { PicklistItem } from "@/lib/forge/local-store";
import type { InputFormValues } from "@/lib/forge/form-schema";
import { DEWU_TRENDS, GENERAL_TRENDS } from "@/lib/forge/trends";
import type { LlmModelOption } from "@/lib/ai/models";
import { DewuSearchHandoff } from "@/components/forge/dewu-search-handoff";
import { PipelineTimeline } from "@/components/forge/pipeline-timeline";
import { STEP_LABELS } from "@/lib/forge/pipeline-labels";
import type {
  IntelAutoScope,
  IntelDiscoveryMode,
} from "@/lib/forge/intel-discovery";
import type {
  ForgeMode,
  ForgeProgressStep,
  HotProductLead,
  HotTrendCard,
  PipelineLogEntry,
  PipelineStatus,
  ProductBrief,
  ViralBrief,
} from "@/lib/forge/types";

type InputPanelProps = {
  sellerStep: SellerStep;
  onSellerStepChange: (step: SellerStep) => void;
  canGoToSellerStep: (step: SellerStep) => boolean;
  categoryLabel: string;
  inferredHint?: string;
  activeLead: HotProductLead | null;
  onGoToAssetsStep: () => void;
  picklist: PicklistItem[];
  activePicklistId: string | null;
  onAddToPicklist: (lead: HotProductLead) => void;
  onLoadPicklist: (item: PicklistItem) => void;
  onRemovePicklist: (id: string) => void;
  onVerifyToggle: (picklistId: string, stepIndex: number, checked: boolean) => void;
  onEnrichSellingPoints?: () => void;
  enriching?: boolean;
  trendContext: HotTrendCard | null;
  onTrendSelect: (id: string, context: HotTrendCard | null) => void;
  scannedTrends: HotTrendCard[];
  scanning: boolean;
  scanCached: boolean;
  intelQuery: string;
  onIntelQueryChange: (q: string) => void;
  workspaceCategory: import("@/lib/forge/local-store").WorkspaceCategory;
  onWorkspaceCategoryChange: (
    c: import("@/lib/forge/local-store").WorkspaceCategory
  ) => void;
  intelAutoScope: IntelAutoScope;
  onIntelAutoScopeChange: (s: IntelAutoScope) => void;
  smartIntelRunning: boolean;
  smartIntelRunMode: IntelDiscoveryMode | null;
  canRunManualIntel: boolean;
  onAutoIntel: () => void;
  onClueIntel: () => void;
  onStopIntel?: () => void;
  intelShowcase?: boolean;
  onSelectTrend: (trend: HotTrendCard) => void;
  onScoutFromTrend: (trend: HotTrendCard) => void;
  agentLogEntries: AgentLogEntry[];
  agentLogRunning: boolean;
  productLeads: HotProductLead[];
  scouting: boolean;
  scoutCached: boolean;
  scoutSearchedAt: string | null;
  onApplyLead: (lead: HotProductLead) => void;
  productImages: ProductImageDraft[];
  onProductImagesChange: (images: ProductImageDraft[]) => void;
  status: PipelineStatus;
  mode: ForgeMode;
  model: string;
  onModelChange: (modelId: string) => void;
  availableModels: LlmModelOption[];
  productBrief: ProductBrief | null;
  viralBrief?: ViralBrief | null;
  visionWarning: string | null;
  progressStep: ForgeProgressStep | null;
  pipelineLogs: PipelineLogEntry[];
  lastError: { step?: ForgeProgressStep; message: string } | null;
  hasProductImages: boolean;
  onExecute: () => void;
  onCancel?: () => void;
};

function findTrendCard(
  id: string,
  scanned: HotTrendCard[]
): HotTrendCard | null {
  return scanned.find((t) => t.id === id) ?? null;
}

function staticToCard(t: (typeof DEWU_TRENDS)[0]): HotTrendCard {
  return {
    id: t.id,
    title: t.label,
    heatScore: t.id.startsWith("dewu") ? 85 : 70,
    keywords: t.keywords ?? [],
    sceneEn: t.sceneEn,
    sceneZh: t.sceneZh,
    hookAngle: t.hookAngle ?? t.label,
  };
}

export function InputPanel({
  sellerStep,
  onSellerStepChange,
  canGoToSellerStep,
  categoryLabel,
  inferredHint,
  activeLead,
  onGoToAssetsStep,
  picklist,
  activePicklistId,
  onAddToPicklist,
  onLoadPicklist,
  onRemovePicklist,
  onVerifyToggle,
  onEnrichSellingPoints,
  enriching,
  trendContext,
  onTrendSelect,
  scannedTrends,
  scanning,
  intelQuery,
  onIntelQueryChange,
  workspaceCategory,
  onWorkspaceCategoryChange,
  intelAutoScope,
  onIntelAutoScopeChange,
  smartIntelRunning,
  smartIntelRunMode,
  canRunManualIntel,
  onAutoIntel,
  onClueIntel,
  onStopIntel,
  intelShowcase,
  onSelectTrend,
  onScoutFromTrend,
  agentLogEntries,
  agentLogRunning,
  scanCached,
  productLeads,
  scouting,
  scoutCached,
  scoutSearchedAt,
  onApplyLead,
  productImages,
  onProductImagesChange,
  status,
  mode,
  model,
  onModelChange,
  availableModels,
  productBrief,
  viralBrief,
  visionWarning,
  progressStep,
  pipelineLogs,
  lastError,
  hasProductImages,
  onExecute,
  onCancel,
}: InputPanelProps) {
  // 复用 Dashboard 的唯一表单实例（见 lib/forge/form-schema.ts 注释）：
  // 本地另建 useForm 会让卖家粘贴的内容进不了流水线。
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<InputFormValues>();

  const formValues = watch();
  const imageTooLarge = productImages.some(
    (i) => i.file.size > 5 * 1024 * 1024
  );
  const pasteOk = formValues.productPaste.replace(/\s/g, "").length >= 10;
  const canExecute = pasteOk && !imageTooLarge;
  const isDewu = formValues.platform === "dewu";

  const handleTrendChange = (id: string) => {
    setValue("trendId", id);
    const scanned = findTrendCard(id, scannedTrends);
    const staticTrend = [...DEWU_TRENDS, ...GENERAL_TRENDS].find(
      (t) => t.id === id
    );
    if (scanned) {
      onTrendSelect(id, scanned);
    } else if (staticTrend) {
      onTrendSelect(id, staticToCard(staticTrend));
    } else {
      onTrendSelect(id, null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-terminal-panel">
      <header className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
            Intel Feed
          </h2>
          <p className="text-[10px] text-terminal-muted">
            得物卖家工作台
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant={mode === "live" ? "live" : "mock"}>
            {mode === "live" ? `LIVE · ${model}` : "MOCK · offline"}
          </Badge>
          <Select
            value={model}
            onValueChange={onModelChange}
            disabled={availableModels.length === 0}
          >
            <SelectTrigger
              className="h-6 w-[168px] text-[10px]"
              aria-label="选择模型"
            >
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  className="text-[11px]"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="max-w-[168px] text-right text-[9px] leading-tight text-terminal-muted">
            {mode === "live"
              ? (availableModels.find((o) => o.id === model)?.hint ??
                "模型 · 影响全流程")
              : "MOCK 模式：模型不生效"}
          </p>
        </div>
      </header>

      <div className="border-b border-terminal-border px-4 py-2">
        <SellerStepper
          current={sellerStep}
          onStepChange={onSellerStepChange}
          canGoToStep={canGoToSellerStep}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <WorkflowGuide />

          {sellerStep === 1 && (
            <section id={stepSectionId(1)} className="space-y-4">
              <div className="space-y-2">
                <Label>Target Platform</Label>
                <Select
                  value={formValues.platform}
                  onValueChange={(v) =>
                    setValue("platform", v as "xiaohongshu" | "dewu")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dewu">得物（默认）</SelectItem>
                    <SelectItem value="xiaohongshu">小红书</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <IntelSearchPanel
                inferredHint={inferredHint}
                mode={mode}
                intelQuery={intelQuery}
                onIntelQueryChange={onIntelQueryChange}
                workspaceCategory={workspaceCategory}
                onWorkspaceCategoryChange={onWorkspaceCategoryChange}
                intelAutoScope={intelAutoScope}
                onIntelAutoScopeChange={onIntelAutoScopeChange}
                scanning={scanning}
                scouting={scouting}
                smartRunning={smartIntelRunning}
                smartRunMode={smartIntelRunMode}
                scanCached={scanCached}
                scoutCached={scoutCached}
                scannedTrends={scannedTrends}
                selectedTrendId={formValues.trendId}
                canRunManualIntel={canRunManualIntel}
                onAutoIntel={onAutoIntel}
                onClueIntel={onClueIntel}
                onStopIntel={onStopIntel}
                intelShowcase={intelShowcase}
                onSelectTrend={onSelectTrend}
                onScoutFromTrend={onScoutFromTrend}
                isDewu={isDewu}
                agentLogEntries={agentLogEntries}
                agentLogRunning={agentLogRunning}
              />
              {scoutSearchedAt && productLeads.length > 0 && (
                <p className="text-[10px] text-terminal-muted">
                  爆款更新：{new Date(scoutSearchedAt).toLocaleString("zh-CN")}
                </p>
              )}

              <div className="space-y-2">
                <Label>场景趋势</Label>
                <Select value={formValues.trendId} onValueChange={handleTrendChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择趋势" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>得物预设</SelectLabel>
                      {DEWU_TRENDS.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>通用场景</SelectLabel>
                      {GENERAL_TRENDS.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {scannedTrends.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>热点雷达</SelectLabel>
                        {scannedTrends.map((t) => (
                          <SelectItem key={`scan-${t.id}`} value={t.id}>
                            {t.title} · {t.heatScore}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                {trendContext && (
                  <p className="text-[10px] text-foreground/80">
                    角度：{trendContext.hookAngle}
                  </p>
                )}
              </div>

              {isDewu && trendContext && (
                <DewuSearchHandoff
                  trendContext={trendContext}
                  intelQuery={intelQuery}
                  categoryLabel={categoryLabel}
                  activeLead={activeLead}
                  compact
                />
              )}
            </section>
          )}

          {sellerStep === 2 && (
            <section id={stepSectionId(2)} className="space-y-4">
              {isDewu && (
                <DewuSearchHandoff
                  trendContext={trendContext}
                  intelQuery={intelQuery}
                  categoryLabel={categoryLabel}
                  activeLead={activeLead}
                  onGoToAssets={onGoToAssetsStep}
                />
              )}
              <PicklistPanel
                picklist={picklist}
                productLeads={productLeads}
                activePicklistId={activePicklistId}
                onAddLead={onAddToPicklist}
                onLoadPicklist={onLoadPicklist}
                onRemovePicklist={onRemovePicklist}
                onVerifyToggle={onVerifyToggle}
                onApplyLead={onApplyLead}
              />
            </section>
          )}

          {sellerStep === 3 && (
            <section id={stepSectionId(3)} className="space-y-4">
              <p className="text-[10px] leading-relaxed text-terminal-muted">
                在得物 App 选款后：上传商品图（可多张、任意分辨率），整段粘贴商品页文案，填一个链接供 AI 理解 SKU。本站不爬链、不生图。
              </p>
              <div className="space-y-2">
                <Label>商品图（可选，可删除/设主图）</Label>
                <ProductImagesUpload
                  images={productImages}
                  onChange={onProductImagesChange}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="productPaste">得物商品原文（整段粘贴）</Label>
                  {onEnrichSellingPoints && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      disabled={enriching || !formValues.productPaste.trim()}
                      onClick={onEnrichSellingPoints}
                    >
                      {enriching ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI 整理文案
                    </Button>
                  )}
                </div>
                <Textarea
                  id="productPaste"
                  rows={8}
                  placeholder="从得物商品页复制标题、规格、卖点、评价等到此…"
                  {...register("productPaste")}
                  className="text-[11px]"
                />
                {errors.productPaste && (
                  <p className="text-[9px] text-red-500">{errors.productPaste.message}</p>
                )}
                <p className="text-[9px] text-terminal-muted">
                  至少约 10 个有效字符方可 Execute；内容用于文案与豆包 Prompt，勿编造页面上没有的信息。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productLink">商品链接（可选）</Label>
                <Input
                  id="productLink"
                  placeholder="得物商品页或分享链接，仅帮助 AI 理解 SKU"
                  {...register("productLink")}
                  className="text-[11px]"
                />
                {errors.productLink && (
                  <p className="text-[9px] text-red-500">{errors.productLink.message}</p>
                )}
                <p className="text-[9px] text-terminal-muted">
                  不会写入右侧发帖正文；好物链接请发帖时自行粘贴。
                </p>
              </div>
            </section>
          )}

          {sellerStep === 4 && (
            <section id={stepSectionId(4)} className="space-y-3">
              <PipelineTimeline
                status={status}
                progressStep={progressStep}
                logs={pipelineLogs}
                lastError={lastError}
                hasImage={hasProductImages}
              />
              <p className="text-[10px] leading-relaxed text-terminal-muted">
                确认粘贴文案与图片后 Execute。约 4–5 次 API；右侧可 Remix
                文案，发帖时自行粘贴好物链接。
              </p>
              {mode === "mock" && (
                <p className="text-[10px] text-amber-400">
                  当前 MOCK 模式：示例数据，非真实 AI。配置 DASHSCOPE_API_KEY 后
                  为 LIVE。
                </p>
              )}
              <div className="rounded border border-terminal-border/60 bg-terminal-bg/40 p-2 text-[10px]">
                <p>
                  <strong>粘贴</strong>：
                  {formValues.productPaste.trim()
                    ? `${formValues.productPaste.replace(/\s/g, "").length} 字`
                    : "未填"}
                </p>
                <p className="mt-1">
                  <strong>图片</strong>：{productImages.length} 张
                  {productImages[0]
                    ? ` · 主图 ${productImages[0].width}×${productImages[0].height}`
                    : ""}
                </p>
                <p className="mt-1">
                  <strong>链接</strong>：
                  {formValues.productLink ? "已填（仅 AI 上下文）" : "未填"}
                </p>
              </div>

              {(productBrief || viralBrief || visionWarning) && (
                <div className="space-y-2">
                  {(productBrief || visionWarning) && (
                    <div className="rounded-md border border-terminal-border bg-terminal-bg/50 p-3 text-xs">
                      <p className="mb-1 font-semibold text-terminal-muted">
                        {productBrief
                          ? "Vision Brief"
                          : "Vision Brief · 已降级为纯文本"}
                      </p>
                      {visionWarning && (
                        <p className="mb-2 text-amber-400">{visionWarning}</p>
                      )}
                      {productBrief && (
                        <div className="space-y-1 text-[10px]">
                          <p>
                            {productBrief.category} ·{" "}
                            {productBrief.colors.join("/")}
                          </p>
                          {productBrief.targetAudience && (
                            <p className="text-terminal-muted">
                              受众：{productBrief.targetAudience}
                            </p>
                          )}
                          {productBrief.conditionQuality === "low" && (
                            <p className="text-amber-400">
                              图片质量偏低，建议换更清晰主图
                            </p>
                          )}
                          {productBrief.emotionalBenefits &&
                            productBrief.emotionalBenefits.length > 0 && (
                              <p className="text-terminal-muted">
                                情绪价值：
                                {productBrief.emotionalBenefits.join("、")}
                              </p>
                            )}
                          {productBrief.socialBenefits &&
                            productBrief.socialBenefits.length > 0 && (
                              <p className="text-terminal-muted">
                                社交价值：
                                {productBrief.socialBenefits.join("、")}
                              </p>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                  {viralBrief && (
                    <div className="rounded-md border border-terminal-accent/30 bg-terminal-accent/5 p-3 text-xs">
                      <p className="mb-1 font-semibold text-terminal-accent">
                        爆款策划 · {viralBrief.hookFramework}
                      </p>
                      <p className="text-[10px] text-foreground/90">
                        {viralBrief.emotionalCore}
                      </p>
                      <p className="mt-1 text-[9px] text-terminal-muted">
                        记忆点：{viralBrief.memoryPoint}
                      </p>
                      <p className="mt-1 text-[9px] text-terminal-muted">
                        搜索词：{viralBrief.keywordStrategy.join(" · ")}
                      </p>
                      {viralBrief.psychologyAlignment && (
                        <p className="mt-1 text-[9px] text-purple-300/90">
                          心理对齐：{viralBrief.psychologyAlignment}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {progressStep && status === "running" && (
                <p className="text-[10px] text-terminal-accent">
                  Agent：{STEP_LABELS[progressStep]}…
                </p>
              )}
            </section>
          )}

          {sellerStep !== 1 && sellerStep !== 2 && sellerStep !== 3 && (
            <Separator className="opacity-50" />
          )}
        </div>
      </ScrollArea>

      <footer className="space-y-2 border-t border-terminal-border p-4">
        {!canExecute && sellerStep >= 3 && (
          <p className="text-center text-[10px] text-terminal-muted">
            {imageTooLarge
              ? "主图超过 5MB，请压缩后重新上传"
              : "请填写商品名与卖点后再 Execute"}
          </p>
        )}
        <ExecuteButton
          status={status}
          progressStep={progressStep}
          onExecute={onExecute}
          onCancel={onCancel}
          disabled={!canExecute || sellerStep < 3}
        />
      </footer>
    </div>
  );
}
