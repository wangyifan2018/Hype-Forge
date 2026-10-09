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
  let scanCalls: number;

  beforeEach(() => {
    calls = [];
    scanCalls = 0;
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
        if (url.includes("/api/forge/trends/scan")) {
          scanCalls += 1;
          return jsonRes({
            trends: [],
            cached: false,
            searchedAt: new Date().toISOString(),
            elapsedMs: 8420,
            stages: [
              { id: "cache", label: "查询热点情报缓存", detail: "未命中，走联网检索", ms: 1, status: "ok" },
              { id: "search", label: "联网检索公开讨论", detail: "模型 deepseek-v4.1-flash", ms: 8400, status: "ok" },
              { id: "parse", label: "结构化解析与归一", detail: "得到 0 条场景 · 0 条带来源", ms: 19, status: "ok" },
            ],
          });
        }
        if (url.includes("/api/forge/dewu/scout")) {
          return jsonRes({
            leads: [],
            cached: false,
            searchedAt: new Date().toISOString(),
            elapsedMs: 6100,
            stages: [
              { id: "cache", label: "查询爆款情报缓存", detail: "未命中，走联网检索", ms: 1, status: "ok" },
              { id: "search", label: "联网检索爆款方向", detail: "模型 deepseek-v4.1-flash", ms: 6100, status: "ok" },
            ],
          });
        }
        return jsonRes({});
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("刷新后能从本地快照恢复上次生成结果", async () => {
    localStorage.setItem(
      "hype-forge:last-run",
      JSON.stringify({
        savedAt: new Date().toISOString(),
        input: {
          trendId: "dewu-sneaker-heat",
          productName: "AJ1 北卡蓝",
          sellingPoints: "到手 749",
          platform: "dewu",
        },
        productBrief: null,
        viralBrief: null,
        prompts: null,
        promptsOptimized: false,
        copyText: "## 标题\n恢复测试标题ABC",
        critic: null,
      })
    );

    render(<ForgeDashboard />);
    // 文案经 markdown 渲染后文本节点可能被拆分，因此断言整体 textContent
    await waitFor(() =>
      expect(document.body.textContent).toContain("恢复测试标题ABC")
    );
  });

  it("情报检索展示服务端真实阶段回执，且不再出现编造的平台抓取过程", async () => {
    render(<ForgeDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /智能搜索/ }));

    await waitFor(() => expect(scanCalls).toBe(1));
    await waitFor(() =>
      expect(document.body.textContent).toContain("联网检索公开讨论")
    );
    // 真实耗时来自服务端 stages
    expect(document.body.textContent).toContain("8.4s");
    // 编造的"逐平台抓取"过程不得再出现
    expect(document.body.textContent).not.toContain("采集抖音热搜");
    expect(document.body.textContent).not.toContain("扫描得物社区");
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
