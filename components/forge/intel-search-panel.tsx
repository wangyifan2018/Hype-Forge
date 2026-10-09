"use client";

import { Loader2, Search, Square, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AgentActivityLog,
  type AgentLogEntry,
} from "@/components/forge/agent-activity-log";
import type { WorkspaceCategory } from "@/lib/forge/local-store";
import type {
  IntelAutoScope,
  IntelDiscoveryMode,
} from "@/lib/forge/intel-discovery";
import type { ForgeMode, HotTrendCard } from "@/lib/forge/types";
import { CATEGORY_OPTIONS } from "@/lib/forge/workspace-prefs";
import {
  LIFECYCLE_BADGE_CLASS,
  LIFECYCLE_LABELS,
} from "@/lib/forge/trend-lifecycle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PSYCHOLOGY_LABELS,
  PSYCHOLOGY_COLORS,
} from "@/lib/forge/psychology-labels";

type IntelSearchPanelProps = {
  mode: ForgeMode;
  intelQuery: string;
  onIntelQueryChange: (q: string) => void;
  workspaceCategory: WorkspaceCategory;
  onWorkspaceCategoryChange: (c: WorkspaceCategory) => void;
  intelAutoScope: IntelAutoScope;
  onIntelAutoScopeChange: (s: IntelAutoScope) => void;
  canRunManualIntel: boolean;
  scanning: boolean;
  scouting: boolean;
  smartRunning: boolean;
  smartRunMode: IntelDiscoveryMode | null;
  scanCached: boolean;
  scoutCached: boolean;
  scannedTrends: HotTrendCard[];
  selectedTrendId: string | null;
  onAutoIntel: () => void;
  onClueIntel: () => void;
  onStopIntel?: () => void;
  intelShowcase?: boolean;
  onSelectTrend: (trend: HotTrendCard) => void;
  onScoutFromTrend: (trend: HotTrendCard) => void;
  isDewu: boolean;
  agentLogEntries: AgentLogEntry[];
  agentLogRunning: boolean;
  inferredHint?: string;
};

export function IntelSearchPanel({
  mode,
  intelQuery,
  onIntelQueryChange,
  workspaceCategory,
  onWorkspaceCategoryChange,
  intelAutoScope,
  onIntelAutoScopeChange,
  canRunManualIntel,
  scanning,
  scouting,
  smartRunning,
  smartRunMode,
  scanCached,
  scoutCached,
  scannedTrends,
  selectedTrendId,
  onAutoIntel,
  onClueIntel,
  onStopIntel,
  intelShowcase = false,
  onSelectTrend,
  onScoutFromTrend,
  isDewu,
  agentLogEntries,
  agentLogRunning,
  inferredHint,
}: IntelSearchPanelProps) {
  const busy = scanning || scouting || smartRunning;

  return (
    <div className="space-y-3 rounded-md border border-terminal-border/80 bg-terminal-bg/30 p-3">
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-8 min-w-0 flex-1 text-[11px]"
          disabled={busy}
          onClick={onAutoIntel}
        >
          {smartRunning && smartRunMode === "auto" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          智能搜索
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 flex-1 text-[11px]"
          disabled={busy || !canRunManualIntel}
          onClick={onClueIntel}
          title={
            canRunManualIntel
              ? undefined
              : "请先填写搜索词，或在 Step3 粘贴商品文案"
          }
        >
          {smartRunning && smartRunMode === "manual" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          按线索搜
        </Button>
        {busy && onStopIntel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-0.5 border-red-500/40 px-2 text-[10px] text-red-300 hover:bg-red-500/10"
            onClick={onStopIntel}
            title="停止检索"
          >
            <Square className="h-3 w-3 fill-current" />
          </Button>
        )}
        <span className="h-5 w-px shrink-0 bg-terminal-border/60" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-[10px]",
            intelAutoScope === "open"
              ? "bg-terminal-accent/15 text-terminal-accent"
              : "text-terminal-muted hover:text-foreground"
          )}
          disabled={busy}
          onClick={() => onIntelAutoScopeChange("open")}
        >
          全站
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-[10px]",
            intelAutoScope === "category"
              ? "bg-terminal-accent/15 text-terminal-accent"
              : "text-terminal-muted hover:text-foreground"
          )}
          disabled={busy}
          onClick={() => onIntelAutoScopeChange("category")}
        >
          品类
        </Button>
      </div>
      <p className="text-[10px] leading-relaxed text-terminal-muted">
        {intelAutoScope === "open"
          ? "全站热点：跨平台检索抖音 / 小红书 / 得物，不限主营品类。"
          : "品类侧重：跨品类但略侧重下方主营品类。"}
      </p>

      <div className="space-y-1.5">
        <Label className="text-terminal-accent">线索 / 搜索词（按线索搜时填写）</Label>
        <Input
          placeholder="例：AJ1 北卡蓝、客制键盘、春夏冲锋衣"
          value={intelQuery}
          onChange={(e) => onIntelQueryChange(e.target.value)}
          className="text-[11px]"
        />
        <div className="flex flex-wrap gap-1">
          <span className="w-full text-[9px] text-terminal-muted">
            主营品类
            {intelAutoScope === "open" ? "（仅按线索搜生效）" : "（按线索搜 + 智能搜索略侧重）"}
          </span>
          {CATEGORY_OPTIONS.filter((c) => c.id !== "custom").map((c) => (
            <Button
              key={c.id}
              type="button"
              variant={workspaceCategory === c.id ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-6 px-2 text-[9px]",
                intelAutoScope === "open" && "opacity-70"
              )}
              disabled={busy}
              onClick={() => onWorkspaceCategoryChange(c.id)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        {inferredHint && (
          <p className="text-[10px] text-terminal-accent/90">
            文案推断：{inferredHint}
          </p>
        )}
      </div>

      {!intelShowcase && (
        <AgentActivityLog
          entries={agentLogEntries}
          running={agentLogRunning}
          title="Intel Agent"
        />
      )}
      {intelShowcase && (
        <p className="text-[10px] text-terminal-accent/90">
          分析过程已展开至右侧情报雷达面板 →
        </p>
      )}

      <p className="text-[10px] text-terminal-muted">
        {mode === "live" ? "LIVE" : "MOCK"}
        {(scanCached || scoutCached) && " · 缓存"}
      </p>

      {scannedTrends.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[10px]">热点场景</Label>
          <div className="max-h-44 space-y-1.5 overflow-y-auto">
            {scannedTrends.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "rounded border p-2 text-[10px]",
                  selectedTrendId === t.id
                    ? "border-terminal-accent bg-terminal-accent/10"
                    : "border-terminal-border bg-terminal-bg/50"
                )}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelectTrend(t)}
                >
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-medium">{t.title}</span>
                    <span className="text-terminal-accent">{t.heatScore}</span>
                    {t.lifecycleStage && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 px-1 text-[8px] font-normal",
                          LIFECYCLE_BADGE_CLASS[t.lifecycleStage]
                        )}
                      >
                        {LIFECYCLE_LABELS[t.lifecycleStage]}
                      </Badge>
                    )}
                    {t.viralPotential && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 px-1 text-[8px] font-normal",
                          t.viralPotential >= 80
                            ? "border-green-500/50 text-green-300 bg-green-500/10"
                            : t.viralPotential >= 60
                              ? "border-yellow-500/50 text-yellow-300 bg-yellow-500/10"
                              : "border-gray-500/50 text-gray-300 bg-gray-500/10"
                        )}
                      >
                        病毒力 {t.viralPotential}
                      </Badge>
                    )}
                  </div>
                  {t.emotionalHook && (
                    <p className="mt-0.5 text-[9px] text-terminal-accent/80 italic">
                      {t.emotionalHook}
                    </p>
                  )}
                  {t.psychologyTriggers && t.psychologyTriggers.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.psychologyTriggers.map((trigger) => (
                        <Badge
                          key={trigger}
                          variant="outline"
                          className={cn(
                            "h-4 px-1 text-[8px] font-normal",
                            PSYCHOLOGY_COLORS[trigger]
                          )}
                        >
                          {PSYCHOLOGY_LABELS[trigger]}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {t.whyNow && (
                    <p className="mt-0.5 text-terminal-muted">{t.whyNow}</p>
                  )}
                  {t.sources && t.sources.length > 0 && (
                    <p className="mt-0.5 truncate text-[8px] text-terminal-muted/80">
                      来源：{t.sources.slice(0, 2).join("；")}
                    </p>
                  )}
                  {t.bestPostWindow && (
                    <p className="mt-0.5 text-[9px] text-terminal-accent/90">
                      {t.bestPostWindow}
                    </p>
                  )}
                  {t.officialTopicMatch && (
                    <p className="mt-0.5 text-[9px] text-sky-300/90">
                      官方话题：{t.officialTopicMatch}
                    </p>
                  )}
                </button>
                {isDewu && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-6 w-full text-[9px]"
                    disabled={scouting}
                    onClick={() => onScoutFromTrend(t)}
                  >
                    按此场景更新爆款线索
                  </Button>
                )}
                {t.suggestedScoutKeywords &&
                  t.suggestedScoutKeywords.length > 0 && (
                    <p className="mt-1 text-[9px] text-terminal-muted">
                      建议搜：{t.suggestedScoutKeywords.join(" · ")}
                    </p>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
