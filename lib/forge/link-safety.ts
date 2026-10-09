/**
 * 链接可达性探测（服务端执行）。
 *
 * 产品 SOP 要求"发帖前核对链接可点开"，但 `link-check.ts` 只做了 URL 格式校验。
 * 浏览器直接 fetch 会被 CORS 挡住，所以由服务端探测；同时必须防 SSRF：
 * 只允许公网 http/https、禁止内网/回环地址、限制重定向跳数与超时。
 */

export type SafeUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

export type LinkProbeResult = {
  reachable: boolean;
  /** HTTP 状态码（未拿到响应时为 undefined） */
  status?: number;
  finalUrl?: string;
  reason: string;
  /** 走了几次重定向 */
  redirects: number;
};

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?fc00:/i,
  /^\[?fe80:/i,
  /\.local$/i,
];

/** 只允许公网 http/https，且不带账号密码 */
export function isSafeToProbe(raw: string): SafeUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "链接为空" };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: "不是有效的 URL（需以 http/https 开头）" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "只支持 http/https 链接" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "链接中不应包含账号密码" };
  }
  if (PRIVATE_HOST_PATTERNS.some((p) => p.test(url.hostname))) {
    return { ok: false, reason: "出于安全考虑，不探测内网/本地地址" };
  }
  return { ok: true, url: url.toString() };
}

export type ProbeOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRedirects?: number;
};

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_MAX_REDIRECTS = 3;

/**
 * 探测链接是否可访问。
 * 先 HEAD（省流量），若对方不支持（405/501/403）再用 GET 兜底；
 * 每一跳都重新做安全检查，避免被重定向到内网。
 */
export async function probeLink(
  raw: string,
  options: ProbeOptions = {}
): Promise<LinkProbeResult> {
  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  const safety = isSafeToProbe(raw);
  if (!safety.ok) {
    return { reachable: false, reason: safety.reason, redirects: 0 };
  }

  let currentUrl = safety.url;
  let redirects = 0;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let response: Response;
    try {
      response = await doFetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "user-agent": "Hype-Forge-LinkCheck/1.0" },
      });
      // 有些站点不支持 HEAD
      if ([403, 405, 501].includes(response.status)) {
        response = await doFetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(timeoutMs),
          headers: { "user-agent": "Hype-Forge-LinkCheck/1.0" },
        });
      }
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      return {
        reachable: false,
        reason: aborted
          ? `请求超时（${timeoutMs / 1000}s）`
          : `无法访问：${error instanceof Error ? error.message : "未知错误"}`,
        finalUrl: currentUrl,
        redirects,
      };
    }

    const location = response.headers.get("location");
    const isRedirect = response.status >= 300 && response.status < 400 && location;

    if (isRedirect) {
      if (redirects >= maxRedirects) {
        return {
          reachable: false,
          status: response.status,
          reason: `重定向次数超过 ${maxRedirects} 次`,
          finalUrl: currentUrl,
          redirects,
        };
      }
      let next: string;
      try {
        next = new URL(location, currentUrl).toString();
      } catch {
        return {
          reachable: false,
          status: response.status,
          reason: "重定向目标不是有效地址",
          finalUrl: currentUrl,
          redirects,
        };
      }
      const nextSafety = isSafeToProbe(next);
      if (!nextSafety.ok) {
        return {
          reachable: false,
          status: response.status,
          reason: `重定向目标被拒绝：${nextSafety.reason}`,
          finalUrl: currentUrl,
          redirects,
        };
      }
      currentUrl = nextSafety.url;
      redirects++;
      continue;
    }

    if (response.status >= 200 && response.status < 400) {
      return {
        reachable: true,
        status: response.status,
        finalUrl: currentUrl,
        reason:
          redirects > 0
            ? `可访问（跳转 ${redirects} 次后 HTTP ${response.status}）`
            : `可访问（HTTP ${response.status}）`,
        redirects,
      };
    }

    return {
      reachable: false,
      status: response.status,
      finalUrl: currentUrl,
      reason:
        response.status === 404
          ? "链接返回 404，可能已失效或商品已下架"
          : `链接不可用（HTTP ${response.status}）`,
      redirects,
    };
  }

  return {
    reachable: false,
    reason: "重定向处理异常",
    finalUrl: currentUrl,
    redirects,
  };
}
