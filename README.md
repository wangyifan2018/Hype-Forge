# Hype-Forge 爆款图文兵工厂

**得物带货优先**的本地内容组装台（亦支持小红书）。不直接生图，输出：

- **豆包** 中文生图提示词 + 跟做 SOP（中栏）
- 备用 FLUX / 醒图分镜字段（高级折叠）
- **得物发帖三件套**：标题、正文、话题标签（右栏；好物链接发帖时自行粘贴）

## 文档

| 文档 | 说明 |
|------|------|
| **[使用手册](docs/USAGE.md)** | 安装、四步 SOP、常见问题 |
| **[架构说明](docs/ARCHITECTURE.md)** | 数据流、目录、状态机 |
| **[开发指南](docs/DEVELOPMENT.md)** | 改 Prompt / API / UI |
| **[得物挂链说明](docs/DEWU-AFFILIATE.md)** | 边界、链接、不爬链 |
| **[API 参考](docs/API.md)** | 接口、SSE 事件 |
| **[AGENTS.md](AGENTS.md)** | Cursor Agent 约定 |

## 快速开始

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local，填入 DASHSCOPE_API_KEY（可选，无 Key 走 Mock）
npm run dev:clean
```

打开 http://localhost:3000 → **热点情报** → **得物搜货** → Step3 **粘贴商品原文 + 多图 + 链接** → **Execute** → 中栏复制豆包 Prompt，右栏复制发帖三件套。

## 核心能力

- **四步卖家流** — 情报 / 关键词交接 / 素材 / Execute 诊断
- **Step3 简化** — 整段粘贴得物原文、单链接、多图多分辨率（首张主图）
- **5 步流水线** — 识图（多图）→ 爆款策划 → 豆包视觉 → 文案 → Critic 质检（合规/去 AI 味由代码校验）
- **智能推断** — 从粘贴文案推断品类与风格（无需手选）
- **导出包** — 文案 + Prompt + 清单一次复制

## 环境变量

见 [.env.example](.env.example)，详细说明见 [使用手册 §4](docs/USAGE.md#4-配置说明envlocal)。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev:clean` | **推荐** 清缓存后启动开发 |
| `npm run dev` | 开发模式 |
| `npm run build` | 生产构建 |
| `npm run test` | 单元测试（`lib/forge/*.test.ts`） |
| `npm run lint` | ESLint |

## 技术栈

Next.js 14 · TypeScript · Tailwind · DashScope OpenAI 兼容 API

## 工程优化（2026-06）

### 状态管理升级
- **Zustand v5**：从单一 store 重构为 slice 模式，提升可维护性
- **persist 中间件**：自动持久化到 localStorage，无需手动序列化
- **useShallow 优化**：减少不必要的 re-render

### 表单验证升级
- **React Hook Form**：替代原生 useState 管理表单状态
- **Zod 集成**：类型安全的 schema 验证（`lib/forge/form-schema.ts`）
- **实时验证**：用户输入时即时反馈错误

### 中文 NLP 增强
- **nodejieba**：集成结巴分词进行关键词提取
- **TF-IDF 算法**：智能识别商品核心卖点
- **停用词过滤**：去除无意义词汇，提升关键词质量
- **应用位置**：视觉服务、文案生成、审稿评分

### 动画体验优化
- **Motion 库**：替代 Framer Motion，更轻量的动画方案
- **流水线进度条**：平滑的步骤切换动画
- **评分反馈**：Critic 评分的动态可视化
- **面板过渡**：AnimatePresence 实现无缝切换

### AI SDK 最佳实践
- **system 选项**：所有系统提示词通过 `system` 参数传递，不在 messages 数组中
- **安全增强**：防止 prompt injection 攻击
- **统一封装**：`chatComplete`、`chatStream` 等函数支持 system 选项

## License

Private / 本地工具，按需自用。
