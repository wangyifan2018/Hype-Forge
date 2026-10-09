"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PUBLISH_CHECKLIST_ITEMS } from "@/lib/forge/workspace-prefs";
import { checkAffiliateLink } from "@/lib/forge/link-check";

type PublishChecklistProps = {
  affiliateLink: string;
  checklist: Record<string, boolean>;
  onChange: (itemId: string, checked: boolean) => void;
  visible: boolean;
};

export function PublishChecklist({
  affiliateLink,
  checklist,
  onChange,
  visible,
}: PublishChecklistProps) {
  const linkCheck = useMemo(
    () => checkAffiliateLink(affiliateLink),
    [affiliateLink]
  );

  /** 可达性探测结果（格式校验之外，真正验证"能不能点开"） */
  const [probe, setProbe] = useState<{
    loading: boolean;
    reachable?: boolean;
    reason?: string;
  }>({ loading: false });

  async function handleProbe() {
    setProbe({ loading: true });
    try {
      const res = await fetch("/api/forge/link-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: affiliateLink }),
      });
      const data = (await res.json()) as {
        reachable?: boolean;
        reason?: string;
        error?: string;
      };
      setProbe({
        loading: false,
        reachable: data.reachable,
        reason: data.reason ?? data.error ?? "检查失败",
      });
    } catch (error) {
      setProbe({
        loading: false,
        reachable: false,
        reason: error instanceof Error ? error.message : "检查失败",
      });
    }
  }

  if (!visible) return null;

  return (
    <div className="mb-3 rounded-lg border border-terminal-border bg-terminal-bg/60 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-terminal-accent">
        发帖变现清单
      </p>
      <p
        className={`mb-2 text-[10px] ${affiliateLink.trim() ? (linkCheck.valid ? "text-emerald-400/90" : "text-amber-300/90") : "text-terminal-muted"}`}
      >
        好物链接（发帖时粘贴）：{affiliateLink.trim() ? linkCheck.message : "未在表单填写，发帖时自行添加"}
      </p>

      {affiliateLink.trim() && linkCheck.valid && (
        <div className="mb-2 space-y-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-[9px]"
            disabled={probe.loading}
            onClick={handleProbe}
          >
            {probe.loading ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : null}
            检查链接能否点开
          </Button>
          {probe.reason && (
            <p
              className={`text-[9px] ${
                probe.reachable ? "text-emerald-400/90" : "text-amber-300/90"
              }`}
            >
              {probe.reachable ? "✓ " : "⚠ "}
              {probe.reason}
            </p>
          )}
        </div>
      )}
      <ul className="space-y-1.5">
        {PUBLISH_CHECKLIST_ITEMS.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={Boolean(checklist[item.id])}
              onChange={(e) => onChange(item.id, e.target.checked)}
            />
            <span className="text-[10px] text-foreground/85">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
