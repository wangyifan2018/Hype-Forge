"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildExportPackMarkdown } from "@/lib/forge/export-pack";
import { copyToClipboard } from "@/lib/clipboard";
import type { CriticReport, ForgeInput, VisualPrompts } from "@/lib/forge/types";
import { toast } from "sonner";

type ExportPackButtonProps = {
  input: ForgeInput | null;
  copyText: string;
  prompts: VisualPrompts | null;
  critic: CriticReport | null;
  engageTemplates?: string[];
  publishChecklist?: Record<string, boolean>;
  disabled?: boolean;
};

export function ExportPackButton({
  input,
  copyText,
  prompts,
  critic,
  engageTemplates,
  publishChecklist,
  disabled,
}: ExportPackButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleExport() {
    if (!input || !copyText) {
      toast.error("请先完成 Execute 生成内容");
      return;
    }
    const md = buildExportPackMarkdown(input, copyText, prompts, critic, {
      engageTemplates,
      publishChecklist,
    });
    const ok = await copyToClipboard(md);
    if (ok) {
      setCopied(true);
      toast.success("已复制完整导出包");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("复制失败");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-terminal-border text-[10px]"
      onClick={handleExport}
      disabled={disabled || !copyText}
    >
      <Package className="h-3 w-3" />
      {copied ? "已复制" : "导出包"}
    </Button>
  );
}
