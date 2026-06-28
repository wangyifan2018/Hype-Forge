"use client";

import { cn } from "@/lib/utils";

export type SellerStep = 1 | 2 | 3 | 4;

const STEPS: { id: SellerStep; label: string }[] = [
  { id: 1, label: "热点情报" },
  { id: 2, label: "去得物搜货" },
  { id: 3, label: "你的商品素材" },
  { id: 4, label: "生成" },
];

type SellerStepperProps = {
  current: SellerStep;
  onStepChange: (step: SellerStep) => void;
  canGoToStep: (step: SellerStep) => boolean;
};

export function SellerStepper({
  current,
  onStepChange,
  canGoToStep,
}: SellerStepperProps) {
  return (
    <nav className="flex gap-1 rounded-md border border-terminal-border/80 bg-terminal-bg/40 p-1">
      {STEPS.map((s) => {
        const enabled = canGoToStep(s.id);
        const active = current === s.id;
        return (
          <button
            key={s.id}
            type="button"
            disabled={!enabled && !active}
            onClick={() => enabled && onStepChange(s.id)}
            className={cn(
              "flex-1 rounded px-1 py-1.5 text-[9px] font-medium uppercase tracking-wide transition-colors",
              active
                ? "bg-terminal-accent/20 text-terminal-accent"
                : enabled
                  ? "text-foreground/80 hover:bg-terminal-border/40"
                  : "cursor-not-allowed text-terminal-muted/50"
            )}
          >
            <span className="block opacity-70">{s.id}</span>
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

export function stepSectionId(step: SellerStep): string {
  return `seller-step-${step}`;
}
