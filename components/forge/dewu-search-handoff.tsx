"use client";

import { ArrowRight, Search } from "lucide-react";
import { CopyButton } from "@/components/forge/copy-button";
import { Button } from "@/components/ui/button";
import {
  aggregateDewuSearchKeywords,
  formatKeywordsForCopy,
} from "@/lib/forge/dewu-search-keywords";
import type { HotProductLead, HotTrendCard } from "@/lib/forge/types";
import { cn } from "@/lib/utils";

type DewuSearchHandoffProps = {
  trendContext: HotTrendCard | null;
  intelQuery?: string;
  categoryLabel?: string;
  activeLead?: HotProductLead | null;
  compact?: boolean;
  onGoToAssets?: () => void;
  className?: string;
};

export function DewuSearchHandoff({
  trendContext,
  intelQuery,
  categoryLabel,
  activeLead,
  compact = false,
  onGoToAssets,
  className,
}: DewuSearchHandoffProps) {
  const keywords = aggregateDewuSearchKeywords({
    trendContext,
    intelQuery,
    categoryLabel,
    activeLead,
  });
  const copyText = formatKeywordsForCopy(keywords);

  if (keywords.length === 0 && !trendContext) {
    return (
      <p className={cn("text-[10px] text-terminal-muted", className)}>
        请先在 Step1 选择或扫描场景趋势，此处将显示得物搜索关键词。
      </p>
    );
  }

  return (
    <div
      id="dewu-search-handoff"
      className={cn(
        "rounded-md border border-terminal-accent/40 bg-terminal-accent/5 p-3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-terminal-accent" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-terminal-accent">
            得物搜索关键词
          </p>
        </div>
        {copyText && <CopyButton text={copyText} label="复制全部" />}
      </div>

      {trendContext && (
        <p className="mt-1.5 text-[10px] text-foreground/85">
          场景：<strong>{trendContext.title}</strong>
          {trendContext.hookAngle && (
            <span className="text-terminal-muted">
              {" "}
              · {trendContext.hookAngle}
            </span>
          )}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {keywords.length > 0 ? (
          keywords.map((k) => (
            <span
              key={k}
              className="rounded-full border border-terminal-accent/50 bg-terminal-accent/10 px-2 py-0.5 text-[10px] text-terminal-accent"
            >
              {k}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-terminal-muted">
            暂无关键词，可填写情报搜索词或 Scan 热点
          </span>
        )}
      </div>

      {!compact && (
        <>
          <ol className="mt-2.5 list-decimal space-y-0.5 pl-4 text-[10px] leading-relaxed text-terminal-muted">
            <li>打开得物 App，粘贴上方关键词搜索</li>
            <li>选中真实 SKU，保存商品主图到相册</li>
            <li>回到 Step3 上传主图，填写名称、卖点与链接</li>
            <li>Step4 Execute → 中栏改图 Prompt、右栏发帖文案</li>
          </ol>
          {onGoToAssets && (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="mt-2 h-8 w-full text-[10px]"
              onClick={onGoToAssets}
            >
              我已选好商品，去填素材
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
