import { describe, expect, it, vi } from "vitest";
import { isSafeToProbe, probeLink } from "@/lib/forge/link-safety";

function res(status: number, location?: string): Response {
  return new Response(null, {
    status,
    headers: location ? { location } : undefined,
  });
}

describe("isSafeToProbe · SSRF 防护", () => {
  it("允许公网 http/https", () => {
    expect(isSafeToProbe("https://dw4.co/abc").ok).toBe(true);
    expect(isSafeToProbe("http://example.com").ok).toBe(true);
  });

  it("拒绝非 http 协议、内网与本地地址、带账号密码的链接", () => {
    expect(isSafeToProbe("file:///etc/passwd").ok).toBe(false);
    expect(isSafeToProbe("http://localhost:3000/api").ok).toBe(false);
    expect(isSafeToProbe("http://127.0.0.1/admin").ok).toBe(false);
    expect(isSafeToProbe("http://192.168.1.1/").ok).toBe(false);
    expect(isSafeToProbe("http://172.16.0.9/").ok).toBe(false);
    expect(isSafeToProbe("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(isSafeToProbe("https://user:pass@example.com/").ok).toBe(false);
  });

  it("拒绝空值与无效 URL", () => {
    expect(isSafeToProbe("   ").ok).toBe(false);
    expect(isSafeToProbe("不是链接").ok).toBe(false);
  });
});

describe("probeLink", () => {
  it("200 视为可访问", async () => {
    const fetchImpl = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => res(200)
    );
    const result = await probeLink("https://example.com/a", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reachable).toBe(true);
    expect(result.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1]?.method).toBe("HEAD");
  });

  it("不支持 HEAD 时用 GET 兜底", async () => {
    const fetchImpl = vi
      .fn<(url: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(res(405))
      .mockResolvedValueOnce(res(200));
    const result = await probeLink("https://example.com/a", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reachable).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][1]?.method).toBe("GET");
  });

  it("跟随重定向并记录跳数", async () => {
    const fetchImpl = vi
      .fn<(url: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(res(302, "https://example.com/final"))
      .mockResolvedValueOnce(res(200));
    const result = await probeLink("https://example.com/start", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reachable).toBe(true);
    expect(result.redirects).toBe(1);
    expect(result.finalUrl).toBe("https://example.com/final");
  });

  it("重定向到内网会被拒绝", async () => {
    const fetchImpl = vi
      .fn<(url: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(res(302, "http://127.0.0.1:8080/secret"));
    const result = await probeLink("https://example.com/start", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reachable).toBe(false);
    expect(result.reason).toContain("重定向目标被拒绝");
  });

  it("404 给出可能已失效的提示", async () => {
    const fetchImpl = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => res(404)
    );
    const result = await probeLink("https://example.com/gone", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reachable).toBe(false);
    expect(result.reason).toContain("404");
  });

  it("超时给出明确原因", async () => {
    const fetchImpl = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
      const error = new Error("timed out");
      error.name = "TimeoutError";
      throw error;
    });
    const result = await probeLink("https://example.com/slow", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reachable).toBe(false);
    expect(result.reason).toContain("超时");
  });

  it("不安全链接直接拒绝且不发请求", async () => {
    const fetchImpl = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => res(200)
    );
    const result = await probeLink("http://localhost:3000/", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.reachable).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
