// @vitest-environment jsdom
/**
 * P0 回归测试：Step3 表单必须与 Dashboard 共用同一个 react-hook-form 实例，
 * 否则卖家粘贴的原文/链接进不了 buildForgeInput，Execute 只会拿到「商品」兜底值。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ForgeDashboard } from "@/components/forge/forge-dashboard";

type CapturedCall = { url: string; body: Record<string, unknown> };

function jsonRes(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function sseRes(events: unknown[]): Response {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("ForgeDashboard · Step3 表单贯通", () => {
  let calls: CapturedCall[];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    // jsdom 未实现 scrollIntoView（Agent 日志自动滚动会用到）
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/forge/health")) {
          return jsonRes({
            mode: "live",
            model: "deepseek-v4.1-flash",
            defaultModel: "deepseek-v4.1-flash",
            models: [],
          });
        }
        if (url.includes("/api/forge/run")) {
          calls.push({
            url,
            body: JSON.parse(String(init?.body ?? "{}")),
          });
          return sseRes([{ type: "done" }]);
        }
        return jsonRes({});
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("粘贴的商品名/卖点/链接会进入 /api/forge/run 请求体", async () => {
    render(<ForgeDashboard />);

    // Step3 的粘贴框只在 sellerStep === 3 时渲染
    fireEvent.click(screen.getByRole("button", { name: /你的商品素材/ }));

    const paste = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="productPaste"]'
    );
    const link = document.querySelector<HTMLInputElement>(
      'input[name="productLink"], textarea[name="productLink"]'
    );
    expect(paste).toBeTruthy();

    fireEvent.change(paste!, {
      target: { value: "AJ1 北卡蓝 白蓝配色\n到手 749，码数偏小半码，适合春夏通勤" },
    });
    if (link) {
      fireEvent.change(link, { target: { value: "https://dw4.co/abc123" } });
    }

    const execute = await screen.findByRole("button", {
      name: /Execute Forge Pipeline/i,
    });
    // RHF 的订阅更新需要一次宏任务刷新才会反映到 disabled 属性上
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((execute as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(execute);

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const input = calls[0].body.input as Record<string, unknown>;
    expect(String(input.productName)).toContain("AJ1");
    expect(String(input.sellingPoints)).toContain("749");
    expect(input.platform).toBe("dewu");
    if (link) expect(String(input.dewuProductUrl)).toContain("dw4.co");
  });
});
