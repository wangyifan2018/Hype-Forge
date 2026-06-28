"use client";

import { CopyButton } from "@/components/forge/copy-button";
import { parseDewuPublish } from "@/lib/forge/parse-dewu-publish";

type DewuPublishPanelProps = {
  copyText: string;
};

export function DewuPublishPanel({ copyText }: DewuPublishPanelProps) {
  const { title, body, hashtagsText, hashtags } = parseDewuPublish(copyText);

  return (
    <div className="mb-3 space-y-2">
      <p className="text-[10px] text-terminal-muted">
        好物链接请在 Step3 自行复制粘贴到得物，此处仅提供标题 / 正文 / 话题。
      </p>

      <div className="rounded-lg border border-terminal-border bg-terminal-bg/60 p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-terminal-accent">标题</p>
          {title && <CopyButton text={title} label="复制" />}
        </div>
        <p className="text-sm font-medium leading-snug text-foreground">
          {title || "—"}
        </p>
      </div>

      <div className="rounded-lg border border-terminal-border bg-terminal-bg/60 p-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-terminal-accent">正文</p>
          {body && <CopyButton text={body} label="复制" />}
        </div>
        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/90">
          {body || "—"}
        </p>
      </div>

      <div className="rounded-lg border border-terminal-border bg-terminal-bg/60 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-terminal-accent">话题</p>
          {hashtagsText && (
            <CopyButton text={hashtagsText} label="复制标签" />
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {hashtags.length > 0 ? (
            hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-terminal-accent/40 bg-terminal-accent/10 px-2 py-0.5 text-[10px] text-terminal-accent"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-terminal-muted">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
