"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PostedRecord, EngagementMetrics } from "@/lib/forge/local-store";
import { EngagementRecorder } from "@/components/forge/engagement-recorder";

type PostHistoryProps = {
  posted: PostedRecord[];
  onReload: (record: PostedRecord) => void;
  onMarkPosted: () => void;
  canMarkPosted: boolean;
  onUpdateEngagement: (postId: string, engagement: EngagementMetrics) => void;
};

export function PostHistory({
  posted,
  onReload,
  onMarkPosted,
  canMarkPosted,
  onUpdateEngagement,
}: PostHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 rounded-lg border border-terminal-border bg-terminal-bg/60 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-[10px] font-semibold uppercase tracking-wider text-terminal-muted"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-1">
          <History className="h-3 w-3" />
          发帖历史 ({posted.length})
        </span>
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {canMarkPosted && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-7 w-full text-[10px]"
          onClick={onMarkPosted}
        >
          标记已发帖
        </Button>
      )}

      {open && (
        <ul className="mt-2 max-h-64 space-y-3 overflow-y-auto">
          {posted.length === 0 ? (
            <li className="text-[10px] text-terminal-muted">暂无记录</li>
          ) : (
            posted.map((r) => (
              <li key={r.id} className="space-y-2">
                <button
                  type="button"
                  className="w-full rounded border border-terminal-border/60 p-2 text-left text-[10px] hover:border-terminal-accent/40"
                  onClick={() => onReload(r)}
                >
                  <span className="font-medium text-foreground">
                    {r.productName}
                  </span>
                  <span className="ml-2 text-terminal-muted">
                    {new Date(r.postedAt).toLocaleDateString("zh-CN")}
                  </span>
                  {r.copySnippet && (
                    <p className="mt-0.5 line-clamp-1 text-terminal-muted">
                      {r.copySnippet}
                    </p>
                  )}
                </button>
                <EngagementRecorder post={r} onUpdate={onUpdateEngagement} />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
