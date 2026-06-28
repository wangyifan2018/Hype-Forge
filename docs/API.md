# Hype-Forge API 参考

所有 AI 相关接口均在**服务端**调用 DashScope，前端通过 Next.js API Routes 访问。

Base URL（本地开发）：`http://localhost:3000`

---

## 健康检查

### `GET /api/forge/health`

**响应示例：**

```json
{
  "mode": "live",
  "model": "qwen3.6-plus"
}
```

| 字段 | 说明 |
|------|------|
| `mode` | `live` 有 Key 且未强制 Mock；`mock` 否则 |
| `model` | 当前配置的 `DASHSCOPE_MODEL` |

---

## 热点雷达

### `POST /api/forge/trends/scan`

扫描适合当前平台的热点场景（联网搜索 + 结构化 JSON）。

**请求体：**

```json
{
  "platform": "xiaohongshu",
  "categoryHint": "世界杯 氛围抱枕 家居"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `platform` | `"xiaohongshu" \| "dewu"` | 是 | 目标平台 |
| `categoryHint` | string | 否 | 品类关键词；缺省用 `FORGE_TREND_QUERY` |

**响应示例：**

```json
{
  "trends": [
    {
      "id": "worldcup-living-2026",
      "title": "2026世界杯客厅观赛角",
      "heatScore": 88,
      "keywords": ["世界杯2026", "看球房"],
      "sceneEn": "...",
      "sceneZh": "...",
      "hookAngle": "..."
    }
  ],
  "cached": false
}
```

- 相同 `platform` + `categoryHint` 30 分钟内返回缓存，`cached: true`
- 失败时服务端回退静态 Mock 趋势列表

---

## 完整流水线（推荐）

### `POST /api/forge/run`

一次 Execute 对应本接口，返回 **SSE** 流。

**请求体：**

```json
{
  "input": {
    "trendId": "worldcup-2026",
    "productName": "氛围感抱枕",
    "sellingPoints": "亲肤面料, 墨绿配色, 拍照上镜",
    "platform": "xiaohongshu",
    "productImage": "data:image/png;base64,...",
    "productImages": [
      { "dataUrl": "data:image/png;base64,...", "width": 1080, "height": 1440, "role": "cover" }
    ],
    "referenceCopy": "从得物复制的整段商品原文",
    "dewuProductUrl": "https://...",
    "affiliateLink": "https://...",
    "trendContext": {
      "id": "worldcup-living-2026",
      "title": "2026世界杯客厅观赛角",
      "heatScore": 88,
      "keywords": ["世界杯2026"],
      "sceneEn": "...",
      "sceneZh": "...",
      "hookAngle": "..."
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `trendContext` | 可选；来自热点扫描或预设，用于增强 Prompt |
| `productImage` | 可选；主图 data URL（与 `productImages[0]` 一致） |
| `productImages` | 可选；最多 6 张，单张识图 ≤5MB，建议总量 ≤12MB |
| `referenceCopy` | 可选；得物粘贴原文，截断 1500 字 |
| `dewuProductUrl` / `affiliateLink` | 可选；仅 Prompt 上下文，不进得物三件套正文 |

**响应：** `Content-Type: text/event-stream`

每条消息格式：`data: {JSON}\n\n`

### SSE 事件类型

| `type` | 字段 | 说明 |
|--------|------|------|
| `progress` | `step`: `vision` \| `visual` \| `copy` \| `critic` | 阶段进度 |
| `brief` | `data`: ProductBrief | 识图结果 |
| `prompts` | `data`: VisualPrompts, `optimized?`: boolean | 生图 Prompt；`optimized: true` 表示 Critic 已改 |
| `critic` | `data`: CriticReport | 质检报告 |
| `delta` | `text`: string | 终稿文案片段（打字机） |
| `log` | `message`, `level?`, `step?` | Agent 轨迹日志（info/success/warn/error） |
| `done` | — | 结束 |
| `error` | `message`, `step?`, `phase?` | 失败；`step` 为 `vision`/`visual`/`copy`/`critic` |

**ProductBrief：**

```ts
{
  category: string
  colors: string[]
  material: string
  visualFeatures: string
  suggestedHooks: string[]
}
```

**VisualPrompts：**

```ts
{
  doubaoPromptZh: string
  doubaoSop: { step, tool, action, detail }[]
  fluxEn: string
  bgRedrawZh: string
  creativeConcept: string
  moodKeywords: string[]
  shotList: string[]
  imagePlaybook: { step, tool, action, detail }[]  // ≥4 步，服务端 normalize 补齐
  coverTip: string
  avoidList: string[]
}
```

**CriticReport：**

```ts
{
  scores: { hook, emotion, platformFit, visualAlign, hashtagPresent?, linkPresent? } // 得物 omit linkPresent
  mustFix: string[]
  revisedCopy?: string
  revisedFluxEn?: string
  revisedBgRedrawZh?: string
}
```

客户端断开连接时，服务端会通过 `request.signal` 中止流水线。

---

## 得物爆款线索

### `POST /api/forge/dewu/scout`

请求体：`{ "categoryHint": "球鞋 爆款" }`

响应：`{ "leads": HotProductLead[], "cached"?: boolean }`

`HotProductLead` 含 `name`, `category`, `heatScore`, `searchKeywords`, `contentAngle`, `note`（提醒手动从 App 获取图/链）。

---

## ForgeInput 得物字段

| 字段 | 说明 |
|------|------|
| `dewuProductUrl` | 得物商品页（用户粘贴） |
| `affiliateLink` | 可选，与商品链接同源；**不**写入得物三件套正文 |
| `styleTags` | 可选 |

---

## 旧版拆分接口（仍可用）

前端默认已改用 `/api/forge/run`，以下接口可供脚本或调试：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/forge/vision` | `{ "image": "data:..." }` → ProductBrief |
| POST | `/api/forge/prompts` | `{ "input", "productBrief?" }` → VisualPrompts |
| POST | `/api/forge/stream` | `{ "input", "productBrief?", "prompts?" }` → SSE 仅文案 |

---

## 调用示例（curl）

```bash
# 健康检查
curl http://localhost:3000/api/forge/health

# 热点扫描
curl -X POST http://localhost:3000/api/forge/trends/scan \
  -H "Content-Type: application/json" \
  -d '{"platform":"dewu","categoryHint":"球鞋 爆款"}'

# 爆款线索
curl -X POST http://localhost:3000/api/forge/dewu/scout \
  -H "Content-Type: application/json" \
  -d '{"categoryHint":"得物 热门球鞋"}'

# 流水线（SSE，仅展示首几条）
curl -N -X POST http://localhost:3000/api/forge/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "trendId": "worldcup-2026",
      "productName": "测试商品",
      "sellingPoints": "卖点A, 卖点B",
      "platform": "dewu",
      "affiliateLink": "https://example.com/your-dewu-link"
    }
  }'
```

---

## 目录与扩展

| 路径 | 职责 |
|------|------|
| `lib/ai/dashscope.ts` | DashScope 客户端、`enable_search` |
| `lib/ai/prompts/*` | 各 Agent 系统 Prompt |
| `lib/forge/orchestrator.ts` | 流水线编排 |
| `lib/forge/service.ts` | 单步 AI 调用 |
| `hooks/use-forge-pipeline.ts` | 前端 SSE 消费 |
