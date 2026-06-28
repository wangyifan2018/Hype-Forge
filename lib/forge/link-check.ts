export type LinkCheckResult = {
  valid: boolean;
  message: string;
};

export function checkAffiliateLink(url: string): LinkCheckResult {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, message: "未填写好物链接" };
  }
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, message: "链接需以 http/https 开头" };
    }
    return {
      valid: true,
      message: "格式正确，发布前请在浏览器或得物 App 内手动点开确认",
    };
  } catch {
    return { valid: false, message: "不是有效的 URL 格式" };
  }
}
