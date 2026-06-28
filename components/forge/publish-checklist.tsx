"use client";

import { useMemo } from "react";
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
