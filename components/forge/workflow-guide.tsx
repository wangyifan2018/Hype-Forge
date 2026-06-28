"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function WorkflowGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-terminal-accent/30 bg-terminal-accent/5 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-[10px] font-semibold uppercase tracking-wider text-terminal-accent"
        onClick={() => setOpen((o) => !o)}
      >
        得物卖家四步 SOP
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-[10px] leading-relaxed text-foreground/85">
          <p>
            <strong>① 热点情报</strong>（三选一）：手写预设场景 / 填情报词后
            Scan / 一键智能情报。品类与文案风格会根据你填的商品信息自动识别，无需手选。
          </p>
          <p>
            <strong>② 去得物搜货</strong>：复制「得物搜索关键词」→ 打开得物
            App 搜货选款。爆款线索仅为 AI 参考，需你自行验证。
          </p>
          <p>
            <strong>③ 你的商品素材</strong>：上传你在 App 保存的主图，填写真实
            商品名、卖点、好物链接（商品链仅核对不进正文）。
          </p>
          <p>
            <strong>④ 生成</strong>：Execute → 中栏改图 Prompt + 作图 SOP，右栏
            发帖文案与话题标签。本站不生图。
          </p>
          <p className="text-terminal-muted">
            非官方热销榜；缓存约 30 分钟。配置 DASHSCOPE_API_KEY 后为 LIVE。
          </p>
        </div>
      )}
    </div>
  );
}
