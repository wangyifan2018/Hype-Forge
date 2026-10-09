import { describe, expect, it, vi } from "vitest";
import {
  isRetryableModelError,
  withModelFallback,
} from "@/lib/ai/model-fallback";

const err = (message: string, name = "Error") => {
  const e = new Error(message);
  e.name = name;
  return e;
};

describe("isRetryableModelError", () => {
  it("限流/服务端错误/网络问题可重试", () => {
    expect(isRetryableModelError(err("429 Too Many Requests"))).toBe(true);
    expect(isRetryableModelError(err("fetch failed"))).toBe(true);
    expect(isRetryableModelError(err("503 Service Unavailable"))).toBe(true);
    expect(isRetryableModelError(err("timed out", "TimeoutError"))).toBe(true);
  });

  it("认证/参数/模型不存在不可重试（换模型也没用）", () => {
    expect(isRetryableModelError(err("Incorrect API key provided"))).toBe(false);
    expect(isRetryableModelError(err("invalid_api_key"))).toBe(false);
    expect(isRetryableModelError(err("401 Unauthorized"))).toBe(false);
    expect(isRetryableModelError(err("model_not_found"))).toBe(false);
  });

  it("用户取消不可回退", () => {
    expect(isRetryableModelError(err("aborted", "AbortError"))).toBe(false);
  });
});

describe("withModelFallback", () => {
  it("主模型成功时不调用备用模型", async () => {
    const attempt = vi.fn(async () => "ok");
    const result = await withModelFallback({
      primary: "deepseek-v4.1-flash",
      fallback: "qwen3.6-plus",
      attempt,
    });
    expect(result.usedModel).toBe("deepseek-v4.1-flash");
    expect(result.attempts).toBe(1);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("可重试错误会回退到备用模型，并回报原因", async () => {
    const attempt = vi
      .fn<(model: string) => Promise<string>>()
      .mockRejectedValueOnce(err("429 rate limit"))
      .mockResolvedValueOnce("fallback ok");
    const onFallback = vi.fn();

    const result = await withModelFallback({
      primary: "deepseek-v4.1-flash",
      fallback: "qwen3.6-plus",
      attempt,
      onFallback,
    });

    expect(result.value).toBe("fallback ok");
    expect(result.usedModel).toBe("qwen3.6-plus");
    expect(result.primaryError).toContain("429");
    expect(onFallback).toHaveBeenCalledOnce();
    expect(attempt.mock.calls[1][0]).toBe("qwen3.6-plus");
  });

  it("不可重试错误直接抛出，不浪费一次调用", async () => {
    const attempt = vi.fn(async () => {
      throw err("Incorrect API key provided");
    });
    await expect(
      withModelFallback({
        primary: "a",
        fallback: "b",
        attempt,
      })
    ).rejects.toThrow(/Incorrect API key/);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("没有备用模型时按原样失败", async () => {
    const attempt = vi.fn(async () => {
      throw err("503");
    });
    await expect(
      withModelFallback({ primary: "a", attempt })
    ).rejects.toThrow("503");
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("备用模型也失败时抛出备用模型的错误", async () => {
    const attempt = vi
      .fn<(model: string) => Promise<string>>()
      .mockRejectedValueOnce(err("429"))
      .mockRejectedValueOnce(err("still 503"));
    await expect(
      withModelFallback({ primary: "a", fallback: "b", attempt })
    ).rejects.toThrow("still 503");
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});
