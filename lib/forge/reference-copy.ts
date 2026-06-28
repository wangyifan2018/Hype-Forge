const MAX_REFERENCE_CHARS = 1500;

export function truncateReferenceCopy(text: string | undefined): string | undefined {
  const t = text?.trim();
  if (!t) return undefined;
  if (t.length <= MAX_REFERENCE_CHARS) return t;
  return `${t.slice(0, MAX_REFERENCE_CHARS)}…（已截断）`;
}

export function formatReferenceCopyBlock(text: string | undefined): string {
  const t = truncateReferenceCopy(text);
  if (!t) return "用户未提供从商品页复制的参考文案。";
  return `用户从得物商品页复制的参考文案（提炼真实卖点/款号/配色，禁止编造未出现的信息）：\n${t}`;
}
