"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/forge/copy-button";
import {
  formatAllDoubaoVariantsCopy,
  formatDoubaoVariantCopy,
} from "@/lib/forge/doubao-prompt-format";
import type { PipelineStatus, VisualPrompts } from "@/lib/forge/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type VisualCommanderProps = {
  status: PipelineStatus;
  prompts: VisualPrompts | null;
  optimized?: boolean;
  creativeHooks?: string[];
  onRemixAngle?: (angle: string) => Promise<void>;
  disabled?: boolean;
};

export function VisualCommander({
  status,
  prompts,
  optimized,
  creativeHooks = [],
  onRemixAngle,
  disabled,
}: VisualCommanderProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [remixingAngle, setRemixingAngle] = useState<string | null>(null);
  const isLoading = status === "running" && !prompts;
  const isIdle = status === "idle" && !prompts;

  const variants = prompts?.doubaoPromptVariants ?? [];
  const feed = prompts?.dewuFeedStoryboard ?? [];
  const doubaoSop = prompts?.doubaoSop ?? [];
  const sopText = doubaoSop
    .map((s) => `${s.step}. ${s.action}\n   ${s.detail}`)
    .join("\n\n");
  const allCopy = prompts ? formatAllDoubaoVariantsCopy(prompts) : "";

  return (
    <div className="flex h-full flex-col bg-terminal-panel">
      <header className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
            豆包生图 · 视觉导演
          </h2>
          <p className="text-[10px] text-terminal-muted">
            得物 3:4 竖图 · 整帖图序 + 三组方案分镜（景别/机位/光线）
          </p>
        </div>
        {optimized && (
          <Badge variant="live" className="text-[9px]">
            Critic 已优化
          </Badge>
        )}
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {isIdle && (
            <p className="text-[10px] leading-relaxed text-terminal-muted">
              Execute 后显示：① 得物发帖图序 ② 三组带分镜的豆包 Prompt。在豆包按「组 →
              镜号」逐张生成，每组 1-2 张。
            </p>
          )}

          {creativeHooks.length > 0 && !disabled && onRemixAngle && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px]">创意方向（改右侧文案）</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {creativeHooks.map((hook) => (
                  <Button
                    key={hook}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-auto max-w-full whitespace-normal text-left text-[9px]",
                      remixingAngle === hook && "opacity-70"
                    )}
                    disabled={Boolean(remixingAngle)}
                    onClick={async () => {
                      setRemixingAngle(hook);
                      try {
                        await onRemixAngle(hook);
                        toast.success("已按该角度改稿（见右侧文案）");
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "改稿失败"
                        );
                      } finally {
                        setRemixingAngle(null);
                      }
                    }}
                  >
                    {remixingAngle === hook ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      hook
                    )}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {prompts && (prompts.moodKeywords.length > 0 || prompts.coverTip) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px]">视觉洞察</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prompts.moodKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {prompts.moodKeywords.map((kw) => (
                      <Badge
                        key={kw}
                        variant="outline"
                        className="text-[9px] font-normal"
                      >
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
                {prompts.psychologyVisualStrategy && (
                  <p className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1.5 text-[10px] text-purple-200/90">
                    心理视觉策略：{prompts.psychologyVisualStrategy}
                  </p>
                )}
                {prompts.coverTip && (
                  <p className="rounded border border-terminal-accent/30 bg-terminal-accent/10 px-2 py-1.5 text-[10px] text-foreground/90">
                    封面建议：{prompts.coverTip}
                  </p>
                )}
                {prompts.avoidList.length > 0 && (
                  <ul className="space-y-0.5 text-[9px] text-red-300/90">
                    {prompts.avoidList.map((a) => (
                      <li key={a}>避坑：{a}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {prompts && prompts.imagePlaybook.length > 0 && !isLoading && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px]">作图手册</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {prompts.imagePlaybook.map((s) => (
                  <div key={s.step} className="text-[9px] text-foreground/85">
                    <span className="text-terminal-accent">{s.step}.</span>{" "}
                    {s.tool} · {s.action}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {feed.length > 0 && !isLoading && (
            <Card className="border-terminal-border/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">得物发帖图序</CardTitle>
                {allCopy && <CopyButton text={allCopy} label="复制全部" />}
              </CardHeader>
              <CardContent>
                <ol className="space-y-1.5 text-[10px] text-foreground/90">
                  {feed.map((f) => (
                    <li
                      key={f.position}
                      className="flex gap-2 rounded border border-terminal-border/50 bg-terminal-bg/30 px-2 py-1.5"
                    >
                      <span className="shrink-0 font-mono text-terminal-accent">
                        {f.position}
                      </span>
                      <span>
                        <strong>{f.role}</strong> · {f.shotSize}
                        {f.variantId && (
                          <span className="text-terminal-muted">
                            {" "}
                            → {f.variantId}
                          </span>
                        )}
                        <br />
                        <span className="text-terminal-muted">{f.note}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {variants.map((v, i) => (
            <Card
              key={v.id}
              className={cn(i === 0 && "border-terminal-accent/50")}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="min-w-0 flex-1 pr-2">
                  <CardTitle className="text-sm text-terminal-accent">
                    {v.label}
                  </CardTitle>
                  <p className="mt-0.5 text-[10px] text-terminal-muted">
                    {v.postUse} · {v.angle}
                  </p>
                  <p className="mt-1 text-[10px] italic text-foreground/75">
                    导演：{v.directorNotes}
                  </p>
                </div>
                <CopyButton
                  text={formatDoubaoVariantCopy(v, {
                    psychologyVisualStrategy: prompts?.psychologyVisualStrategy,
                    doubaoNegativeZh: prompts?.doubaoNegativeZh,
                  })}
                  label="复制本组"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div>
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-terminal-muted">
                        豆包主提示词
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/95">
                        {v.doubaoPromptZh}
                      </p>
                    </div>
                    <div className="overflow-x-auto rounded border border-terminal-border/60">
                      <table className="w-full min-w-[280px] text-left text-[9px]">
                        <thead>
                          <tr className="border-b border-terminal-border/60 bg-terminal-bg/50 text-terminal-muted">
                            <th className="px-2 py-1">镜</th>
                            <th className="px-2 py-1">景别</th>
                            <th className="px-2 py-1">机位</th>
                            <th className="px-2 py-1">构图</th>
                            <th className="px-2 py-1">光线</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.shots.map((s) => (
                            <tr
                              key={s.frame}
                              className="border-b border-terminal-border/40 last:border-0"
                            >
                              <td className="px-2 py-1.5 font-mono text-terminal-accent">
                                {s.frame}
                              </td>
                              <td className="px-2 py-1.5">{s.shotSize}</td>
                              <td className="px-2 py-1.5">{s.camera}</td>
                              <td className="px-2 py-1.5 text-foreground/85">
                                {s.composition}
                              </td>
                              <td className="px-2 py-1.5 text-foreground/85">
                                {s.lighting}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>豆包作图 SOP</CardTitle>
              {sopText && <CopyButton text={sopText} label="复制 SOP" />}
            </CardHeader>
            <CardContent className="space-y-2">
              {isIdle || isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                doubaoSop.map((s) => (
                  <div
                    key={s.step}
                    className="rounded border border-terminal-border/80 bg-terminal-bg/40 p-2.5"
                  >
                    <p className="text-[10px] font-semibold text-terminal-accent">
                      Step {s.step} · {s.tool}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {s.action}
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-terminal-muted">
                      {s.detail}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {prompts && (
            <div className="rounded-md border border-terminal-border/60">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[10px] font-semibold text-terminal-muted"
                onClick={() => setAdvancedOpen((o) => !o)}
              >
                高级 / FLUX 英文 / 醒图分镜
                {advancedOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              {advancedOpen && (
                <div className="space-y-3 border-t border-terminal-border/60 p-3">
                  <p className="text-xs text-foreground/85">
                    {prompts.creativeConcept}
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-[10px] text-foreground/80">
                    {prompts.shotList.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <CopyButton text={prompts.fluxEn} label="复制 FLUX EN" />
                  <p className="text-[10px] text-foreground/80">{prompts.fluxEn}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
