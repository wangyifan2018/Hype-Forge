"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/forge/copy-button";
import { extractHashtags } from "@/lib/forge/copy-hashtags";
import { DewuPublishPanel } from "@/components/forge/dewu-publish-panel";
import { ViralityCard } from "@/components/forge/virality-card";
import { ExportPackButton } from "@/components/forge/export-pack";
import { PostHistory } from "@/components/forge/post-history";
import { PublishChecklist } from "@/components/forge/publish-checklist";
import type { PostedRecord, EngagementMetrics } from "@/lib/forge/local-store";
import type {
  CriticReport,
  EngageReplyStrategy,
  ForgeInput,
  PipelineLogEntry,
  PipelineStatus,
  VisualPrompts,
} from "@/lib/forge/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const REMIX_OPTIONS: { type: string; label: string }[] = [
  { type: "shorter", label: "更短" },
  { type: "hookier", label: "更炸" },
  { type: "more_professional", label: "更专业" },
  { type: "regenerate_titles", label: "换标题" },
];

type CopywriterTerminalProps = {
  status: PipelineStatus;
  copyText: string;
  critic: CriticReport | null;
  lastInput: ForgeInput | null;
  prompts: VisualPrompts | null;
  affiliateLink: string;
  publishChecklist: Record<string, boolean>;
  onPublishCheckChange: (itemId: string, checked: boolean) => void;
  engageTemplates: string[];
  engageReplyStrategies?: EngageReplyStrategy[];
  onGenerateEngage: () => void;
  onRemix: (
    remixType: string,
    angle?: string,
    mustFix?: string[]
  ) => Promise<string | string[] | null>;
  onCopyTextChange: (text: string) => void;
  /** 用户从候选里挑了哪条标题（用于学习标题偏好） */
  onTitleChosen?: (chosen: string, alternatives: string[]) => void;
  posted: PostedRecord[];
  onMarkPosted: () => void;
  onReloadPosted: (record: PostedRecord) => void;
  onUpdateEngagement: (postId: string, engagement: EngagementMetrics) => void;
  pipelineLogs?: PipelineLogEntry[];
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80
      ? "bg-green-500"
      : value >= 60
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-terminal-muted">
        <span>{label}</span>
        <motion.span
          key={value}
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {value}
        </motion.span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-terminal-border">
        <motion.div
          className={cn("h-full rounded-full transition-colors", color)}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function replaceMarkdownTitle(copy: string, newTitle: string): string {
  const lines = copy.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("## "));
  if (idx >= 0) {
    lines[idx] = `## ${newTitle.replace(/^##\s*/, "")}`;
    return lines.join("\n");
  }
  return `## ${newTitle}\n\n${copy}`;
}

export function CopywriterTerminal({
  status,
  copyText,
  critic,
  lastInput,
  prompts,
  affiliateLink,
  publishChecklist,
  onPublishCheckChange,
  engageTemplates,
  engageReplyStrategies = [],
  onGenerateEngage,
  onRemix,
  onCopyTextChange,
  onTitleChosen,
  posted,
  onMarkPosted,
  onReloadPosted,
  onUpdateEngagement,
  pipelineLogs = [],
}: CopywriterTerminalProps) {
  const [criticOpen, setCriticOpen] = useState(true);
  const [remixing, setRemixing] = useState(false);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const isStreaming = status === "running" && !critic;
  const showSkeleton = status === "idle" && !copyText;
  const showMonetize = status === "done" && Boolean(copyText);
  const hashtagTags = copyText ? extractHashtags(copyText) : [];
  const hashtagAutoPatched = pipelineLogs.some((l) =>
    l.message.includes("已自动补全 ## 话题标签")
  );
  const isDewu = lastInput?.platform === "dewu";
  const [extrasOpen, setExtrasOpen] = useState(false);

  /**
   * 质检出现"必须改"的问题（如合规不通过）时自动展开折叠区。
   * 得物视图把 Remix/清单/历史/质检 收在折叠区里，若默认收起，
   * 卖家会看不到合规风险与待改进清单。
   */
  const mustFixCount = critic?.mustFix.length ?? 0;
  const complianceFailed = critic?.deterministic
    ? !critic.deterministic.compliancePass
    : false;
  const hasBlockingIssues = complianceFailed || mustFixCount > 0;

  useEffect(() => {
    if (hasBlockingIssues) setExtrasOpen(true);
  }, [hasBlockingIssues]);

  async function handleRemix(type: string, mustFix?: string[]) {
    setRemixing(true);
    setTitleOptions([]);
    try {
      const result = await onRemix(type, undefined, mustFix);
      if (Array.isArray(result)) {
        setTitleOptions(result);
        toast.success("已生成 3 个标题，点击替换");
      } else if (result) {
        toast.success("文案已 Remix");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Remix 失败");
    } finally {
      setRemixing(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-terminal-panel">
      <header className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
            {isDewu ? "得物发帖" : "Copywriter"}
          </h2>
          <p className="text-[10px] text-terminal-muted">
            {isDewu
              ? "Execute 后：标题 · 正文 · 话题（链接在 Step3 自行复制）"
              : "Execute 后：发帖文案 · Remix"}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportPackButton
            input={lastInput}
            copyText={copyText}
            prompts={prompts}
            critic={critic}
            engageTemplates={engageTemplates}
            publishChecklist={publishChecklist}
            disabled={!showMonetize}
          />
          {copyText && isDewu && (
            <CopyButton text={copyText} label="Markdown" />
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center overflow-hidden p-4">
        <div className="flex w-full max-w-[375px] flex-1 flex-col">
          {showMonetize && isDewu && copyText && (
            <DewuPublishPanel copyText={copyText} />
          )}

          {hashtagAutoPatched && showMonetize && isDewu && (
            <p className="mb-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[9px] text-amber-200/90">
              未检测到完整话题小节，Execute 已自动补全「## 话题标签」。
            </p>
          )}

          {showMonetize && isDewu && (
            <button
              type="button"
              className="mb-2 flex w-full items-center justify-between rounded border border-terminal-border/60 px-2 py-1.5 text-[10px] text-terminal-muted"
              onClick={() => setExtrasOpen((o) => !o)}
            >
              Remix · 清单 · 历史 · 质检
              {hasBlockingIssues && (
                <span className="ml-auto mr-1 rounded border border-red-500/40 bg-red-500/10 px-1 text-[9px] text-red-300">
                  {complianceFailed ? "合规未通过" : `${mustFixCount} 项待改进`}
                </span>
              )}
              {extrasOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}

          {(extrasOpen || !isDewu) && (
            <>
          <PublishChecklist
            affiliateLink={affiliateLink}
            checklist={publishChecklist}
            onChange={onPublishCheckChange}
            visible={showMonetize}
          />

          <PostHistory
            posted={posted}
            onReload={onReloadPosted}
            onMarkPosted={onMarkPosted}
            canMarkPosted={showMonetize}
            onUpdateEngagement={onUpdateEngagement}
          />

          {showMonetize && (
            <div className="mb-3 rounded-lg border border-terminal-border bg-terminal-bg/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-terminal-accent">
                  评论引流话术
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[9px]"
                  onClick={onGenerateEngage}
                >
                  生成
                </Button>
              </div>
              {engageTemplates.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {engageTemplates.map((t) => (
                    <li key={t} className="flex gap-1">
                      <span className="flex-1 text-[10px] text-foreground/85">
                        {t}
                      </span>
                      <CopyButton text={t} label="复制" />
                    </li>
                  ))}
                </ul>
              )}
              {engageReplyStrategies.length > 0 && (
                <ul className="mt-2 space-y-2 border-t border-terminal-border/60 pt-2">
                  {engageReplyStrategies.map((s) => (
                    <li key={`${s.trigger}-${s.psychology}`}>
                      <p className="text-[9px] text-terminal-muted">
                        {s.trigger} · {s.psychology}
                      </p>
                      <div className="mt-0.5 flex gap-1">
                        <span className="flex-1 text-[10px] text-foreground/85">
                          {s.reply}
                        </span>
                        <CopyButton text={s.reply} label="复制" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {critic && status === "done" && (
            <div className="mb-3 space-y-3">
              {/* 爆款指数卡片 */}
              {critic.viralityComposite && (
                <ViralityCard composite={critic.viralityComposite} />
              )}

              {/* 基础质检评分 */}
              <div className="rounded-lg border border-terminal-border bg-terminal-bg/60 p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-[10px] font-semibold uppercase tracking-wider text-terminal-muted"
                  onClick={() => setCriticOpen((o) => !o)}
                >
                  Critic 质检
                  {criticOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                {criticOpen && (
                  <div className="mt-2 space-y-2">
                    {critic.deterministic && (
                      <div className="rounded border border-terminal-border/70 bg-terminal-bg/50 p-2 text-[9px]">
                        <p className="font-semibold text-terminal-muted">
                          代码校验（合规 / 去 AI 味，不采信模型自评）
                        </p>
                        <p
                          className={
                            critic.deterministic.compliancePass
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          合规：
                          {critic.deterministic.compliancePass
                            ? "通过"
                            : "未通过"}
                          {critic.deterministic.violations.length > 0
                            ? ` · ${critic.deterministic.violations
                                .slice(0, 4)
                                .map((v) => v.word)
                                .join("、")}`
                            : ""}
                        </p>
                        {critic.deterministic.fabricatedNumbers.length > 0 && (
                          <p className="text-amber-400">
                            原文未出现的数字：
                            {critic.deterministic.fabricatedNumbers
                              .slice(0, 6)
                              .join("、")}
                          </p>
                        )}
                      </div>
                    )}
                    {critic.mustFix.length > 0 && (
                      <div className="rounded border border-terminal-border/70 bg-terminal-bg/50 p-2 text-[9px]">
                        <p className="font-semibold text-terminal-muted">
                          待改进（{critic.mustFix.length}）
                        </p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-foreground/80">
                          {critic.mustFix.slice(0, 6).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 h-6 w-full text-[9px]"
                          disabled={remixing || !copyText}
                          onClick={() => handleRemix("revise_mustfix", critic.mustFix)}
                        >
                          {remixing ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          按这 {critic.mustFix.length} 项定向重写（只改问题，不动其余）
                        </Button>
                      </div>
                    )}
                    <ScoreBar label="Hook" value={critic.scores.hook} />
                    <ScoreBar label="Emotion" value={critic.scores.emotion} />
                    <ScoreBar
                      label="Platform"
                      value={critic.scores.platformFit}
                    />
                    <ScoreBar
                      label="Visual"
                      value={critic.scores.visualAlign}
                    />
                    {critic.scores.linkPresent != null && (
                      <ScoreBar
                        label="Link"
                        value={critic.scores.linkPresent}
                      />
                    )}
                    {critic.scores.hashtagPresent != null && (
                      <ScoreBar
                        label="Hashtag"
                        value={critic.scores.hashtagPresent}
                      />
                    )}
                    {critic.scores.viralPotential != null && (
                      <ScoreBar
                        label="爆款潜力"
                        value={critic.scores.viralPotential}
                      />
                    )}
                    {critic.scores.scrollStopPower != null && (
                      <ScoreBar
                        label="首屏停留"
                        value={critic.scores.scrollStopPower}
                      />
                    )}
                    {critic.scores.searchKeywordDensity != null && (
                      <ScoreBar
                        label="搜索词嵌入"
                        value={critic.scores.searchKeywordDensity}
                      />
                    )}
                    {critic.scores.antiAiScore != null && (
                      <ScoreBar
                        label={
                          critic.deterministic ? "去AI味(代码)" : "去AI味"
                        }
                        value={critic.scores.antiAiScore}
                      />
                    )}
                    {critic.scores.structureCheck != null && (
                      <ScoreBar
                        label="五段式"
                        value={critic.scores.structureCheck}
                      />
                    )}
                    {critic.scores.complianceCheck != null && (
                      <ScoreBar
                        label={
                          critic.deterministic ? "合规性(代码)" : "合规性"
                        }
                        value={critic.scores.complianceCheck}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {showMonetize && (
            <div className="mb-2 flex flex-wrap gap-1">
              {REMIX_OPTIONS.map((opt) => (
                <Button
                  key={opt.type}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[9px]"
                  disabled={remixing}
                  onClick={() => handleRemix(opt.type)}
                >
                  {remixing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    opt.label
                  )}
                </Button>
              ))}
            </div>
          )}

          {titleOptions.length > 0 && (
            <div className="mb-2 space-y-1">
              <p className="text-[9px] text-terminal-muted">点击替换标题</p>
              <div className="flex flex-wrap gap-1">
                {titleOptions.map((title) => (
                  <Button
                    key={title}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto max-w-full whitespace-normal text-left text-[9px]"
                    onClick={() => {
                      onTitleChosen?.(title, titleOptions);
                      onCopyTextChange(replaceMarkdownTitle(copyText, title));
                      setTitleOptions([]);
                      toast.success("标题已替换");
                    }}
                  >
                    {title}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!isDewu && copyText && hashtagTags.length > 0 && (
            <div className="mb-2 rounded-lg border border-terminal-border bg-terminal-bg/60 p-2">
              <CopyButton
                text={hashtagTags.join(" ")}
                label="复制标签"
              />
            </div>
          )}

          {(!isDewu || isStreaming || showSkeleton) && (
          <div className="flex min-h-[200px] flex-1 flex-col overflow-hidden rounded-[2rem] border-2 border-terminal-border bg-terminal-bg shadow-inner">
            <ScrollArea className="h-[calc(100vh-18rem)] max-h-[520px] flex-1">
              <div className="p-4">
                {showSkeleton ? (
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : isDewu && isStreaming ? (
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/90 typewriter-cursor">
                    {copyText || " "}
                  </p>
                ) : (
                  <div
                    className={cn(
                      "prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/90",
                      isStreaming && copyText && "typewriter-cursor"
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {copyText || (isStreaming ? " " : "")}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
