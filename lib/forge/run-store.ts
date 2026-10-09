import type {
  CriticReport,
  ForgeInput,
  ProductBrief,
  ViralBrief,
  VisualPrompts,
} from "@/lib/forge/types";

/**
 * 最近一次 Execute 的结果快照。
 *
 * 背景：copyText / prompts / critic / brief 此前只存在于 React state，
 * 刷新页面即全部丢失（localStorage 只存了选品池与发帖历史），
 * 对卖家来说等于"昨天的稿子找不回来"。
 */

const RUN_KEY = "hype-forge:last-run";
const MAX_COPY_CHARS = 20000;

export type RunSnapshot = {
  savedAt: string;
  input: ForgeInput;
  productBrief: ProductBrief | null;
  viralBrief: ViralBrief | null;
  prompts: VisualPrompts | null;
  promptsOptimized: boolean;
  copyText: string;
  critic: CriticReport | null;
};

export function saveRunSnapshot(snapshot: RunSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      RUN_KEY,
      JSON.stringify({
        ...snapshot,
        copyText: snapshot.copyText.slice(0, MAX_COPY_CHARS),
      })
    );
  } catch {
    // 配额满/隐私模式：静默失败，不影响主流程
  }
}

export function loadRunSnapshot(): RunSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunSnapshot;
    if (!parsed || typeof parsed.copyText !== "string" || !parsed.input) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearRunSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    // ignore
  }
}
