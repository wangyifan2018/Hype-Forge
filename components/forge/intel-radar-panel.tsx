"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  GitMerge,
  Radio,
  Search,
  Sparkles,
  Square,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AgentActivityLog,
  type AgentLogEntry,
} from "@/components/forge/agent-activity-log";
import type { AgentPhase } from "@/lib/forge/agent-phases";
import type { InsightEntry, InsightIcon } from "@/lib/forge/intel-analysis";
import { cn } from "@/lib/utils";
import { PSYCHOLOGY_LABELS } from "@/lib/forge/psychology-labels";
import type { HotProductLead, HotTrendCard, PsychologyTrigger } from "@/lib/forge/types";

type IntelRadarPanelProps = {
  title: string;
  subtitle?: string;
  phases: AgentPhase[];
  phaseIndex: number;
  insights: InsightEntry[];
  entries: AgentLogEntry[];
  running: boolean;
  onStop: () => void;
  className?: string;
  trends?: HotTrendCard[];
  leads?: HotProductLead[];
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  douyin: { label: "抖音", color: "text-pink-400 border-pink-400/40" },
  xiaohongshu: { label: "小红书", color: "text-red-400 border-red-400/40" },
  dewu: { label: "得物", color: "text-terminal-accent border-terminal-accent/40" },
};

const SOURCE_ORDER = ["douyin", "xiaohongshu", "dewu"];

const TRIGGER_ORDER: PsychologyTrigger[] = [
  "identity",
  "novelty",
  "community",
  "emotion",
  "fomo",
  "social_proof",
  "transformation",
  "nostalgia",
  "aspiration",
  "belonging",
];

function InsightIconSvg({ icon, className }: { icon: InsightIcon; className?: string }) {
  const props = { className: cn("h-3 w-3", className) };
  switch (icon) {
    case "radio":
      return <Radio {...props} />;
    case "search":
      return <Search {...props} />;
    case "merge":
      return <GitMerge {...props} />;
    case "chart":
      return <BarChart3 {...props} />;
    case "check":
      return <CheckCircle2 {...props} />;
    case "sparkles":
      return <Sparkles {...props} />;
    case "brain":
      return <Brain {...props} />;
    case "zap":
      return <Zap {...props} />;
  }
}

function TokenCounter({ active, delayMs }: { active: boolean; delayMs: number }) {
  const [count, setCount] = useState(0);
  const target = Math.max(10, delayMs * 12);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    const step = Math.max(1, Math.floor(target / 30));
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= target) return target;
        return prev + step + Math.floor(Math.random() * step);
      });
    }, 80);
    return () => clearInterval(interval);
  }, [active, target]);

  return (
    <span className="font-mono tabular-nums text-terminal-accent">
      {count.toLocaleString()}
    </span>
  );
}

/* ─ Metrics Strip ─────────────────────────────────────────────────────── */

function MetricsStrip({
  trendsCount,
  leadsCount,
  topViral,
  phaseProgress,
  phaseTotal,
}: {
  trendsCount: number;
  leadsCount: number;
  topViral: number;
  phaseProgress: number;
  phaseTotal: number;
}) {
  const metrics = [
    { label: "场景", value: trendsCount, suffix: "个" },
    { label: "爆款", value: leadsCount, suffix: "条" },
    { label: "病毒力", value: topViral, suffix: "/100" },
    { label: "阶段", value: phaseProgress, suffix: `/${phaseTotal}` },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className="intel-metric-card flex flex-col items-center rounded border border-terminal-border/60 bg-black/40 px-2 py-1.5"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <span className="text-[7px] uppercase tracking-widest text-terminal-muted">
            {m.label}
          </span>
          <span className="text-sm font-bold tabular-nums text-terminal-accent">
            {m.value}
            <span className="text-[8px] font-normal text-terminal-muted">
              {m.suffix}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Psychology Radar Chart ────────────────────────────────────────────── */

function PsychologyRadarChart({
  activeTriggers,
  phaseProgress,
  phaseTotal,
}: {
  activeTriggers: PsychologyTrigger[];
  phaseProgress: number;
  phaseTotal: number;
}) {
  const cx = 100;
  const cy = 100;
  const maxR = 72;
  const n = TRIGGER_ORDER.length;
  const angleStep = (2 * Math.PI) / n;

  function getPoint(index: number, radius: number) {
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  const gridLevels = [0.33, 0.66, 1.0];
  const activeSet = new Set(activeTriggers);
  const progressRatio = phaseTotal > 0 ? phaseProgress / phaseTotal : 0;

  // Build polygon points for active triggers
  const polyPoints = TRIGGER_ORDER.map((trigger, i) => {
    const active = activeSet.has(trigger);
    const r = active ? maxR * 0.85 : maxR * 0.15 * progressRatio;
    const pt = getPoint(i, r);
    return `${pt.x},${pt.y}`;
  }).join(" ");

  return (
    <div className="intel-float-up-anim flex flex-col items-center">
      <p className="mb-1 text-[7px] uppercase tracking-widest text-terminal-muted">
        心理触发器分布
      </p>
      <svg viewBox="0 0 200 200" className="w-full max-w-[200px]">
        {/* Grid rings */}
        {gridLevels.map((level) => {
          const r = maxR * level;
          const pts = TRIGGER_ORDER.map((_, i) => {
            const pt = getPoint(i, r);
            return `${pt.x},${pt.y}`;
          }).join(" ");
          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke="currentColor"
              className="text-terminal-border/60"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Axes */}
        {TRIGGER_ORDER.map((_, i) => {
          const pt = getPoint(i, maxR);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={pt.x}
              y2={pt.y}
              stroke="currentColor"
              className="text-terminal-border/40"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Active polygon */}
        <polygon
          points={polyPoints}
          fill="rgba(34,197,94,0.15)"
          stroke="rgba(34,197,94,0.7)"
          strokeWidth="1.5"
          className="intel-radar-fill-anim"
        />

        {/* Axis dots */}
        {TRIGGER_ORDER.map((trigger, i) => {
          const pt = getPoint(i, maxR);
          const active = activeSet.has(trigger);
          return (
            <circle
              key={trigger}
              cx={pt.x}
              cy={pt.y}
              r={active ? 3 : 2}
              className={cn(
                "transition-all duration-500",
                active ? "fill-terminal-accent" : "fill-terminal-muted/40"
              )}
            />
          );
        })}

        {/* Labels */}
        {TRIGGER_ORDER.map((trigger, i) => {
          const pt = getPoint(i, maxR + 14);
          const active = activeSet.has(trigger);
          return (
            <text
              key={trigger}
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                "text-[7px] transition-colors duration-500",
                active ? "fill-terminal-accent" : "fill-terminal-muted/50"
              )}
            >
              {PSYCHOLOGY_LABELS[trigger]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Particle Ring ─────────────────────────────────────────────────────── */

function ParticleRing({ running }: { running: boolean }) {
  if (!running) return null;

  const particles = [
    { radius: 145, duration: 7, color: "bg-pink-400", size: "h-1.5 w-1.5", start: 0 },
    { radius: 150, duration: 9, color: "bg-red-400", size: "h-1 w-1", start: 60 },
    { radius: 140, duration: 6, color: "bg-terminal-accent", size: "h-1.5 w-1.5", start: 120 },
    { radius: 155, duration: 11, color: "bg-cyan-400", size: "h-1 w-1", start: 180 },
    { radius: 148, duration: 8, color: "bg-pink-300", size: "h-1 w-1", start: 240 },
    { radius: 142, duration: 10, color: "bg-emerald-400", size: "h-1.5 w-1.5", start: 300 },
    { radius: 152, duration: 7.5, color: "bg-rose-400", size: "h-1 w-1", start: 45 },
    { radius: 138, duration: 9.5, color: "bg-green-300", size: "h-1 w-1", start: 165 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {particles.map((p, i) => (
        <div
          key={i}
          className={cn("intel-particle absolute rounded-full", p.color, p.size)}
          style={{
            // @ts-expect-error CSS custom properties
            "--orbit-radius": `${p.radius}px`,
            "--orbit-duration": `${p.duration}s`,
            "--orbit-start": `${p.start}deg`,
            animationDelay: `${-p.start / 360 * p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Trend Heat Bar ────────────────────────────────────────────────────── */

function TrendHeatBar({ trends }: { trends: HotTrendCard[] }) {
  if (trends.length === 0) return null;

  const maxScore = Math.max(...trends.map((t) => t.viralPotential ?? 0), 1);

  return (
    <div className="intel-float-up-anim space-y-1">
      <p className="text-[7px] uppercase tracking-widest text-terminal-muted">
        病毒传播潜力
      </p>
      <div className="space-y-1">
        {trends.map((t, i) => {
          const score = t.viralPotential ?? 0;
          const pct = (score / maxScore) * 100;
          const colorClass =
            score >= 80
              ? "bg-green-500/70"
              : score >= 60
                ? "bg-yellow-500/70"
                : "bg-terminal-muted/50";
          return (
            <div key={t.id} className="flex items-center gap-1.5">
              <span className="w-16 truncate text-[8px] text-foreground/70">
                {t.title}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-terminal-border/60">
                <div
                  className={cn("intel-heat-bar h-full rounded-full", colorClass)}
                  style={{
                    width: `${pct}%`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              </div>
              <span
                className={cn(
                  "w-7 text-right text-[8px] font-bold tabular-nums",
                  score >= 80
                    ? "text-green-400"
                    : score >= 60
                      ? "text-yellow-400"
                      : "text-terminal-muted"
                )}
              >
                {score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Panel ────────────────────────────────────────────────────────── */

export function IntelRadarPanel({
  title,
  subtitle,
  phases,
  phaseIndex,
  insights,
  entries,
  running,
  onStop,
  className,
  trends = [],
  leads = [],
}: IntelRadarPanelProps) {
  const insightEndRef = useRef<HTMLDivElement>(null);
  const [completed, setCompleted] = useState(false);
  const progress =
    phases.length > 0
      ? Math.min(100, ((phaseIndex + 1) / phases.length) * 100)
      : 0;
  const current = phases[phaseIndex] ?? phases[phases.length - 1];

  useEffect(() => {
    if (!running && phaseIndex >= phases.length - 1 && phases.length > 0) {
      const t = setTimeout(() => setCompleted(true), 300);
      return () => clearTimeout(t);
    }
    setCompleted(false);
  }, [running, phaseIndex, phases.length]);

  useEffect(() => {
    insightEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [insights.length]);

  const activeSources = new Set<string>();
  phases.slice(0, phaseIndex + 1).forEach((p) => {
    if (p.source) activeSources.add(p.source);
  });

  // Collect active psychology triggers from trends
  const allTriggers = new Set<PsychologyTrigger>();
  trends.forEach((t) => {
    t.psychologyTriggers?.forEach((tr) => allTriggers.add(tr));
  });
  const activeTriggers = Array.from(allTriggers);

  // Compute top viral potential
  const topViral = Math.max(
    ...trends.map((t) => t.viralPotential ?? 0),
    ...leads.map((l) => l.viralPotential ?? 0),
    0
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-terminal-panel lg:col-span-2",
        className
      )}
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-terminal-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-terminal-accent">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[10px] text-terminal-muted">{subtitle}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 border-red-500/40 px-2 text-[10px] text-red-300 hover:bg-red-500/10 hover:text-red-200"
          onClick={onStop}
          disabled={!running}
        >
          <Square className="h-3 w-3 fill-current" />
          停止
        </Button>
      </header>

      {/* Main content: Radar + Agent Workbench */}
      <div className="flex min-h-0 flex-1 flex-col-reverse gap-px bg-terminal-border lg:flex-row">
        {/* Agent Workbench */}
        <div className="flex min-h-[200px] flex-1 flex-col bg-terminal-bg/40 max-lg:shrink-0 lg:min-h-0 lg:max-w-[360px] lg:shrink-0 lg:basis-[min(360px,40%)]">
          {/* Model Status */}
          <div className="shrink-0 border-b border-terminal-border px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  running
                    ? "animate-pulse bg-terminal-accent"
                    : completed
                      ? "bg-emerald-400"
                      : "bg-terminal-muted"
                )}
              />
              <span className="text-[9px] font-semibold uppercase tracking-widest text-terminal-accent">
                Agent 工作台
              </span>
              {current?.tool && running && (
                <span className="ml-auto rounded bg-terminal-accent/10 px-1.5 py-0.5 text-[8px] text-terminal-accent">
                  {current.tool}
                </span>
              )}
            </div>
          </div>

          {/* Tool Call Card */}
          {running && current?.tool && (
            <div className="shrink-0 border-b border-terminal-border/60 px-3 py-2">
              <div className="flex items-center gap-2 text-[10px]">
                <Zap className="h-3 w-3 animate-pulse text-terminal-accent" />
                <span className="font-medium text-foreground/90">
                  {current.tool}
                </span>
                {current.source && (
                  <span className="text-terminal-muted">
                    &rsaquo; {SOURCE_LABELS[current.source]?.label ?? current.source}
                  </span>
                )}
              </div>
              {current.detail && (
                <p className="mt-1 text-[9px] text-terminal-muted">
                  {current.detail}
                </p>
              )}
            </div>
          )}

          {/* Completed State */}
          {completed && (
            <div className="shrink-0 border-b border-terminal-border/60 px-3 py-2">
              <div className="flex items-center gap-2 text-[10px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-medium text-emerald-400">
                  分析完成
                </span>
              </div>
              <p className="mt-1 text-[9px] text-terminal-muted">
                已生成 {insights.length} 条分析结果
              </p>
            </div>
          )}

          {/* Source Flow */}
          <div className="shrink-0 border-b border-terminal-border/60 px-3 py-2">
            <p className="mb-1.5 text-[8px] uppercase tracking-widest text-terminal-muted">
              数据源
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_ORDER.map((src) => {
                const info = SOURCE_LABELS[src];
                const active = activeSources.has(src);
                return (
                  <span
                    key={src}
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] transition-all duration-500",
                      active
                        ? cn(info.color, "intel-source-active")
                        : "border-terminal-border/40 text-terminal-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        active ? "bg-current" : "bg-terminal-muted/30"
                      )}
                    />
                    {info.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Insights */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-3 py-2">
              <p className="text-[8px] uppercase tracking-widest text-terminal-muted">
                分析流
              </p>
            </div>
            <ul className="space-y-1 px-3 pb-3">
              {insights.length === 0 && running && (
                <li className="text-[10px] text-terminal-muted typewriter-cursor">
                  等待首个信号…
                </li>
              )}
              {insights.map((entry, i) => (
                <li
                  key={entry.id}
                  className="intel-insight-in flex items-start gap-1.5 rounded border border-terminal-border/60 bg-black/30 px-2 py-1.5 text-[10px] leading-relaxed text-foreground/90"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <InsightIconSvg
                    icon={entry.icon}
                    className="mt-0.5 shrink-0 text-terminal-accent/70"
                  />
                  <span>{entry.text}</span>
                </li>
              ))}
              <div ref={insightEndRef} />
            </ul>
          </div>

          {/* Agent Terminal */}
          <div className="shrink-0 border-t border-terminal-border p-3">
            <AgentActivityLog
              entries={entries}
              running={running}
              title="情报终端"
              className="max-h-28"
            />
          </div>
        </div>

        {/* Radar View */}
        <div className="relative flex min-h-[240px] flex-1 flex-col overflow-hidden p-3 lg:min-h-0 lg:p-4">
          <div className="intel-radar-grid pointer-events-none absolute inset-0 opacity-40" />

          {/* Metrics Strip */}
          <div className="relative z-10 shrink-0">
            <MetricsStrip
              trendsCount={trends.length}
              leadsCount={leads.length}
              topViral={topViral}
              phaseProgress={phaseIndex + 1}
              phaseTotal={phases.length}
            />
          </div>

          {/* Radar Disc + Psychology Chart Row */}
          <div className="relative z-10 mt-3 flex flex-1 items-center gap-3 lg:gap-4">
            {/* Radar Disc Area */}
            <div className="relative mx-auto flex w-full max-w-[280px] shrink-0 flex-col items-center justify-center py-2 lg:mx-0 lg:w-auto lg:max-w-none lg:flex-1">
              <div
                className={cn(
                  "relative aspect-square w-full max-w-[260px] transition-opacity duration-1000",
                  completed && "opacity-60"
                )}
              >
                <div className="intel-radar-ring absolute inset-[8%] rounded-full border border-terminal-accent/20" />
                <div className="intel-radar-ring absolute inset-[22%] rounded-full border border-terminal-accent/15" />
                <div className="intel-radar-ring absolute inset-[36%] rounded-full border border-cyan-400/20" />
                <div
                  className={cn(
                    "intel-radar-sweep absolute inset-[8%] rounded-full transition-[animation-duration] duration-1000",
                    completed && "!animate-none opacity-0"
                  )}
                />

                {/* Particle Ring */}
                <ParticleRing running={running} />

                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
                  {completed ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      <p className="mt-2 text-sm font-semibold text-emerald-400">
                        分析完成
                      </p>
                      <p className="mt-1 text-[10px] text-terminal-muted">
                        {insights.length} 条结果
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-terminal-muted">
                        Intel Radar
                      </p>
                      {current?.tool && (
                        <p className="mt-1 text-[10px] font-medium text-terminal-accent/80">
                          {current.tool}
                        </p>
                      )}
                      <p className="mt-1 text-base font-semibold text-terminal-accent">
                        {current?.label ?? "初始化"}
                      </p>
                      {current?.detail && (
                        <p className="mt-1 max-w-[180px] text-[9px] text-terminal-muted">
                          {current.detail}
                        </p>
                      )}
                      {running && (
                        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-terminal-muted">
                          <span>tokens</span>
                          <TokenCounter
                            active={running}
                            delayMs={current?.delayMs ?? 500}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Psychology Radar Chart */}
            <div className="hidden shrink-0 lg:block" style={{ width: "200px" }}>
              <PsychologyRadarChart
                activeTriggers={activeTriggers}
                phaseProgress={phaseIndex + 1}
                phaseTotal={phases.length}
              />
            </div>
          </div>

          {/* Trend Heat Bar */}
          {trends.length > 0 && (
            <div className="relative z-10 mt-2 shrink-0">
              <TrendHeatBar trends={trends} />
            </div>
          )}

          {/* Phase Timeline */}
          <div className="relative z-10 mt-auto space-y-2 pt-2">
            <div className="flex justify-between text-[9px] text-terminal-muted">
              <span>分析进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-terminal-border">
              <div
                className="h-full bg-gradient-to-r from-terminal-accent to-cyan-400 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Timeline nodes */}
            <div className="flex items-center gap-0 overflow-x-auto py-1">
              {phases.map((p, i) => {
                const isDone = i < phaseIndex || completed;
                const isCurrent = i === phaseIndex && !completed;
                return (
                  <div
                    key={`${p.id}-${i}`}
                    className="flex shrink-0 items-center"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full border-2 transition-all duration-300",
                          isDone
                            ? "border-terminal-accent bg-terminal-accent"
                            : isCurrent
                              ? "intel-phase-pulse border-terminal-accent bg-terminal-accent/30"
                              : "border-terminal-muted/40 bg-transparent"
                        )}
                      />
                      <span
                        className={cn(
                          "mt-1 whitespace-nowrap text-[7px] transition-colors",
                          isDone
                            ? "text-terminal-accent"
                            : isCurrent
                              ? "text-foreground/80"
                              : "text-terminal-muted/50"
                        )}
                      >
                        {p.label}
                      </span>
                    </div>
                    {i < phases.length - 1 && (
                      <div
                        className={cn(
                          "mx-0.5 h-px w-4 transition-colors duration-300",
                          i < phaseIndex || completed
                            ? "bg-terminal-accent/60"
                            : "bg-terminal-border/60"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
