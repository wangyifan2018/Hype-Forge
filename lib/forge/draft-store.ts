const DRAFT_KEY = "hype-forge:step3-draft";

export type Step3Draft = {
  productPaste: string;
  productLink: string;
  trendId: string;
  platform: "xiaohongshu" | "dewu";
};

export function loadStep3Draft(): Step3Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Step3Draft;
    if (typeof parsed.productPaste !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStep3Draft(draft: Step3Draft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota */
  }
}

export function clearStep3Draft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
