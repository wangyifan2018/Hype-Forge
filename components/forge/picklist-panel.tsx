"use client";

import { BookmarkPlus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { PicklistItem } from "@/lib/forge/local-store";
import { PICKLIST_STATUS_LABELS } from "@/lib/forge/workspace-prefs";
import type { HotProductLead } from "@/lib/forge/types";
import { cn } from "@/lib/utils";

type PicklistPanelProps = {
  picklist: PicklistItem[];
  productLeads: HotProductLead[];
  activePicklistId: string | null;
  onAddLead: (lead: HotProductLead) => void;
  onLoadPicklist: (item: PicklistItem) => void;
  onRemovePicklist: (id: string) => void;
  onVerifyToggle: (picklistId: string, stepIndex: number, checked: boolean) => void;
  onApplyLead: (lead: HotProductLead) => void;
};

export function PicklistPanel({
  picklist,
  productLeads,
  activePicklistId,
  onAddLead,
  onLoadPicklist,
  onRemovePicklist,
  onVerifyToggle,
  onApplyLead,
}: PicklistPanelProps) {
  const activeItem = picklist.find((p) => p.id === activePicklistId);

  return (
    <div className="space-y-3">
      {productLeads.length > 0 && (
        <div className="space-y-2">
          <Label>AI 参考单品（非得物订单，需你在 App 验证）</Label>
          <p className="text-[9px] text-terminal-muted">
            点击仅加入参考卖点与搜索词，不会替你下单。请复制 Step2 关键词自行搜货。
          </p>
          <div className="max-h-36 space-y-2 overflow-y-auto">
            {productLeads.map((lead) => (
              <div
                key={lead.id}
                className="rounded border border-terminal-border bg-terminal-bg/50 p-2"
              >
                <div className="flex items-start justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => onApplyLead(lead)}
                    className="flex-1 text-left text-[10px]"
                  >
                    <span className="font-medium text-foreground">
                      {lead.name}
                    </span>
                    <span className="ml-1 text-terminal-accent">
                      {lead.heatScore}
                    </span>
                    <span className="ml-1 text-terminal-muted">
                      · {lead.competitionLevel} · {lead.bestPostFormat}
                      {lead.priority === "high" ? " · 优先" : ""}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 shrink-0 p-0"
                    title="收藏到选品池"
                    onClick={() => onAddLead(lead)}
                  >
                    <BookmarkPlus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>选品备忘 ({picklist.length})</Label>
        {picklist.length === 0 ? (
          <p className="text-[10px] text-terminal-muted">
            可选：收藏 AI 参考线索，得物验证后再载入 Step3 制作。
          </p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {picklist.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded border p-2 text-[10px]",
                  activePicklistId === item.id
                    ? "border-terminal-accent/60 bg-terminal-accent/5"
                    : "border-terminal-border bg-terminal-bg/50"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => onLoadPicklist(item)}
                  >
                    <span className="font-medium">
                      {item.productName || item.leadSnapshot.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-1 text-[8px]"
                    >
                      {PICKLIST_STATUS_LABELS[item.status]}
                    </Badge>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onRemovePicklist(item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-terminal-muted" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeItem && (
        <div className="rounded border border-terminal-border/80 bg-terminal-bg/30 p-2">
          <p className="mb-2 text-[10px] font-semibold text-terminal-accent">
            得物 App 验证清单
          </p>
          <ul className="space-y-1">
            {activeItem.leadSnapshot.verifySteps.map((step, i) => (
              <li key={step} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={Boolean(activeItem.verifyChecked[String(i)])}
                  onChange={(e) =>
                    onVerifyToggle(activeItem.id, i, e.target.checked)
                  }
                />
                <span className="text-[10px] text-foreground/85">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
