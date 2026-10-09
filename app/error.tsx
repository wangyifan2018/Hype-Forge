"use client";

import { useEffect } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 全局错误边界。
 *
 * 这是一个"重量级客户端状态 + localStorage"的单页工具：任何组件在渲染
 * SSE/缓存数据时抛错，此前会直接白屏且生成结果丢失。这里给出可恢复的出口，
 * 并提供"清空本地缓存"以便从损坏的持久化数据中恢复。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[forge/ui] 渲染异常:", error);
  }, [error]);

  const clearLocalState = () => {
    try {
      localStorage.removeItem("hype-forge:last-run");
      localStorage.removeItem("hype-forge:step3-draft");
    } catch {
      // ignore
    }
    reset();
  };

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 bg-terminal-bg p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">
        界面出错了
      </h1>
      <p className="max-w-md text-xs text-terminal-muted">
        {error.message || "未知渲染错误"}
      </p>
      <p className="max-w-md text-[10px] text-terminal-muted">
        生成结果与草稿都在浏览器本地，先尝试重试；若反复失败，可清空本地缓存
        （会丢失上次结果与 Step3 草稿，但不会影响选品池与发帖历史）。
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="terminal" size="sm" onClick={reset}>
          <RotateCcw className="mr-1 h-3 w-3" />
          重试
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearLocalState}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          清空本地缓存并重试
        </Button>
      </div>
    </main>
  );
}
