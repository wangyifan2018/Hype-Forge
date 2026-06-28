# Cursor / Agent 约定

## 产品一句话

得物卖家四步：**热点情报 → 得物搜货 → 粘贴原文+多图+链接 → Execute**；中栏 **豆包生图 Prompt+SOP**，右栏 **标题/正文/话题标签**（发帖链自行粘贴）。

## 必读

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 数据流与目录
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — 改 Prompt / API / UI
- [lib/forge/types.ts](lib/forge/types.ts) — Zod 契约

## 禁止

- 得物链接爬取、CPS 自动短链、站内生图
- 修改用户附带的 `.cursor/plans/*.plan.md`（除非用户明确要求）
- 将 `DASHSCOPE_API_KEY` 暴露为 `NEXT_PUBLIC_*`

## 提交前

```bash
npm run build
npm run test
```

## 常见改动入口

| 需求 | 文件 |
|------|------|
| Step3 表单 | `input-panel.tsx`, `forge-dashboard.tsx` |
| 豆包 Prompt | `lib/ai/prompts/visual.ts`, `visual-normalize.ts` |
| 视觉校验失败 | `visual-normalize.ts`（非 Key 问题） |
| 得物三件套文案 | `copywriter.ts`, `dewu-publish-panel.tsx` |
| SSE 步骤 | `orchestrator.ts`, `types.ts` `ForgeRunEvent` |
