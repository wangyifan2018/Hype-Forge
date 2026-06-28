# Hype-Forge 架构说明

## 系统边界

- **前端**：Next.js 14 App Router（`app/page.tsx` → `ForgeDashboard` 三栏布局）
- **AI**：阿里云 DashScope OpenAI 兼容 API（`lib/ai/dashscope.ts`）
- **持久化**：浏览器 `localStorage`（选品池、发帖历史、Step3 草稿、发帖清单）
- **不做**：得物爬链/CPS、站内生图、真实情报 SSE（Scan/Scout 为前端 phase 模拟 + 后端联网）

## 卖家四步状态机

| Step | 组件 | 职责 |
|------|------|------|
| 1 | `IntelSearchPanel` | 热点 Scan / 智能情报 / 场景选择 |
| 2 | `DewuSearchHandoff` + `PicklistPanel` | 关键词交接、选品池 |
| 3 | `ProductImagesUpload` + 粘贴框 + 单链接 | 多图、得物原文、商品链接（上下文） |
| 4 | `PipelineTimeline` + `ExecuteButton` | 流水线执行与诊断 |

## 数据流（Execute）

```mermaid
flowchart LR
  form[Step3 productPaste + images]
  parse[parseProductPaste]
  input[ForgeInput]
  run["POST /api/forge/run SSE"]
  orch[orchestrator]
  ui[中栏豆包 + 右栏三件套]

  form --> parse --> input --> run --> orch --> ui
```

1. `parseProductPaste` 将粘贴框映射为 `productName` / `sellingPoints` / `referenceCopy` / 链接字段。
2. 客户端 `filesToProductImages` 压缩长边至 1280px，写入 `productImages[]` 与 `productImage`（主图）。
3. `runForgePipeline`：`vision`（多图）→ `viralBrief`（爆款策划）→ `visual`（`normalizeVisualPrompts`）→ `copy` → `critic` → 流式 `delta`。

## 目录地图

| 路径 | 说明 |
|------|------|
| `app/api/forge/` | HTTP API（run SSE、scan、scout、enrich、remix…） |
| `lib/forge/orchestrator.ts` | 流水线编排与 SSE 事件 |
| `lib/forge/service.ts` | DashScope 调用封装（所有系统提示词通过 `system` 选项传递） |
| `lib/forge/types.ts` | Zod schema 单一事实来源 |
| `lib/forge/form-schema.ts` | React Hook Form Zod schema 与 resolver |
| `lib/forge/keyword-extractor.ts` | nodejieba 关键词提取（TF-IDF + 停用词过滤） |
| `lib/forge/visual-normalize.ts` | 视觉 JSON 容错补齐（含去水印、playbook 长度） |
| `lib/ai/prompts/` | 各 Agent system/user prompt |
| `components/forge/` | UI 三栏与 Step 面板（Motion 动画 + RHF 表单） |
| `hooks/use-forge-pipeline.ts` | 客户端 SSE 消费 |
| `store/` | Zustand v5 全局状态（slice 模式 + persist 中间件） |

## 情报子系统

- **Trend Scan**：`POST /api/forge/trends/scan` → `runTrendScan` → `trend-cache.ts`
- **Product Scout**：`POST /api/forge/dewu/scout` → `product-scout-cache.ts`
- **推断**：`infer-workspace.ts` 正则推断品类/风格（无单独 UI 选择器）

## 类型与契约

所有对外结构以 [`lib/forge/types.ts`](../lib/forge/types.ts) 为准；接口文档见 [API.md](./API.md)。
