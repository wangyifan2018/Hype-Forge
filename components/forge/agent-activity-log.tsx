"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type AgentLogLevel = "info" | "success" | "error" | "warn";

export type AgentLogEntry = {
  id: string;
  time: string;
  message: string;
  level: AgentLogLevel;
};

type AgentActivityLogProps = {
  entries: AgentLogEntry[];
  running?: boolean;
  title?: string;
  className?: string;
};

export function AgentActivityLog({
  entries,
  running,
  title = "Agent 情报终端",
  className,
}: AgentActivityLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length, running]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-terminal-accent/25 bg-black/40 font-mono",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-terminal-accent/20 px-2 py-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-terminal-accent">
          {title}
        </span>
        {running && (
          <span className="flex items-center gap-1 text-[9px] text-terminal-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terminal-accent" />
            RUNNING
          </span>
        )}
      </div>
      {running && (
        <div className="h-0.5 w-full overflow-hidden bg-terminal-border/50">
          <div className="h-full w-1/3 animate-pulse bg-terminal-accent/80" />
        </div>
      )}
      <div className="max-h-28 space-y-0.5 overflow-y-auto p-2 text-[10px] leading-relaxed">
        {entries.length === 0 && !running && (
          <p className="text-terminal-muted">
            点击 Scan / 爆款 / 一键情报后，此处显示 Agent 执行过程
          </p>
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            className={cn(
              "flex gap-2",
              e.level === "error" && "text-red-400",
              e.level === "success" && "text-emerald-400/90",
              e.level === "warn" && "text-amber-300/90",
              e.level === "info" && "text-foreground/80"
            )}
          >
            <span className="shrink-0 text-terminal-muted/70">[{e.time}]</span>
            <span>{e.message}</span>
          </div>
        ))}
        {running && entries.length > 0 && (
          <span className="inline-block h-3 w-1.5 animate-pulse bg-terminal-accent/80" />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
