import { truncateReferenceCopy } from "@/lib/forge/reference-copy";

export type ParsedProductPaste = {
  productName: string;
  sellingPoints: string;
  referenceCopy: string | undefined;
  dewuProductUrl: string | undefined;
  affiliateLink: string | undefined;
};

function firstLineTitle(paste: string): string {
  const line = paste
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "商品";
  return line.length > 40 ? `${line.slice(0, 40)}…` : line;
}

/** 从 Step3 整段粘贴 + 单链接解析为 ForgeInput 字段（无爬链） */
export function parseProductPaste(
  productPaste: string,
  productLink: string
): ParsedProductPaste {
  const trimmed = productPaste.trim();
  const link = productLink.trim();

  if (!trimmed) {
    return {
      productName: "商品",
      sellingPoints: "商品", // 兜底值，避免空字符串导致 Zod 验证失败
      referenceCopy: undefined,
      dewuProductUrl: link || undefined,
      affiliateLink: link || undefined,
    };
  }

  const lines = trimmed.split(/\r?\n/);
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  const productName =
    firstIdx >= 0 ? firstLineTitle(lines[firstIdx] ?? trimmed) : "商品";

  const rest =
    firstIdx >= 0
      ? lines
          .slice(firstIdx + 1)
          .join("\n")
          .trim()
      : "";
  const sellingPoints = rest || trimmed || productName;

  return {
    productName,
    sellingPoints,
    referenceCopy: truncateReferenceCopy(trimmed),
    dewuProductUrl: link || undefined,
    affiliateLink: link || undefined,
  };
}
