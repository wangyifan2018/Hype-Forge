# Hype-Forge 开发指南

## 本地启动

```bash
npm install
cp .env.example .env.local
# 填入 DASHSCOPE_API_KEY 启用 LIVE
npm run dev:clean
```

- **LIVE**：存在 `DASHSCOPE_API_KEY` 且 `FORGE_FORCE_MOCK` 不为 `true`（见 `lib/ai/llm.ts` `isLiveMode()`）。
- **MOCK**：无 Key 或强制 Mock，流水线返回 `lib/forge/mock.ts` 示例数据。

## 如何改 Prompt

| Agent | 文件 | 注入点 |
|-------|------|--------|
| 识图 | `lib/ai/prompts/vision.ts` | `runVision` → `chatWithImages` |
| 视觉/豆包 | `lib/ai/prompts/visual.ts` | `runVisualPrompts`；输出经 `visual-normalize.ts` |
| 文案 | `lib/ai/prompts/copywriter.ts` | `runCopyDraft` / `runCopyStream` |
| 审稿 | `lib/ai/prompts/critic.ts` | `runCritic` → `orchestrator` `applyCriticRevisions` |
| Remix | `lib/ai/prompts/remix.ts` | `POST /api/forge/remix` |

得物文案约束：仅 `## 标题` / `## 正文` / `## 话题标签`；链接不进正文。

## 如何切换 / 新增模型

模型目录：[lib/ai/models.ts](../lib/ai/models.ts)（客户端与服务端共用）。

1. **切换默认模型**：改 `.env.local` 的 `DASHSCOPE_MODEL`（须命中目录，否则回落到目录默认值并打印 `[llm]` 告警）。
2. **运行时选择**：左栏顶部下拉框 → 持久化到 `prefs.model`（zustand persist）→ 随每个请求的 `model` 字段下发。
3. **新增模型**：在 `LLM_MODELS` 增加一项（同时更新 `LlmModelId` 联合类型）。
   新模型必须同时支持**图片输入**与 **`enable_search` 联网搜索**，否则 Step3 识图、Step1 热点情报会降级。
4. **调用链**：`model` 由 UI → API route（`llmModelSchema`）→ `lib/forge/service.ts` / `orchestrator.ts`（`RunOptions`）→ `lib/ai/llm.ts`（`resolveRequestModel`）。

> 百炼 `enable_search` 只在**流式**模式下生效；非流式调用会静默忽略搜索参数。

## 如何改 Step3 UI

- **表单管理**：使用 React Hook Form（RHF）
  - Schema 定义：`lib/forge/form-schema.ts`（Zod schema + RHF resolver）
  - 表单组件：`components/forge/input-panel.tsx`（使用 `useForm`、`register`、`watch`、`setValue`）
  - Dashboard 集成：`components/forge/forge-dashboard.tsx`（通过 `watch` 监听、`setValue` 更新）
  - 验证错误：通过 `formState.errors` 访问，UI 中直接渲染
- 解析：`lib/forge/parse-product-paste.ts`
- 多图：`components/forge/product-images-upload.tsx` + `lib/forge/image-client.ts`
- 草稿：`lib/forge/draft-store.ts`（`productPaste` / `productLink`）

## 如何加 API

1. 在 `app/api/forge/<name>/route.ts` 创建路由。
2. 业务逻辑放在 `lib/forge/service.ts` 或独立模块。
3. 更新 [API.md](./API.md) 与 `types.ts` schema。

## 调试流水线

- 浏览器 Network → `POST /api/forge/run` → EventStream
- 左栏 Step4 `PipelineTimeline`：`log` / `error` 事件带 `step`
- 视觉 JSON 校验失败：查看 `visual-normalize.ts`；勿仅怀疑 API Key

## 约定

- 不爬取得物商品页；`referenceCopy` 仅来自用户粘贴（截断见 `reference-copy.ts`）。
- 单图 ≤5MB，最多 6 张，识图总量建议 ≤12MB。
- **AI SDK 系统消息**：所有 `chatComplete`、`chatCompleteObject`、`chatStream` 调用必须通过 `system` 选项传递系统提示词，禁止在 `messages` 数组中包含 `role: "system"` 消息（防止 prompt injection 风险）。
- 提交前：`npm run build` 与 `npm run test`。

## 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [USAGE.md](./USAGE.md)
- 根目录 [AGENTS.md](../AGENTS.md)（Cursor Agent 约定）
