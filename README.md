# HagiCode Index

这是 `https://index.hagicode.com` 的独立 Astro 静态站点。它负责托管公开 JSON 资产，也负责生成目录首页与版本历史页。

## 站点职责

- 托管公开 JSON 索引与静态资源。不提供服务端 API。
- 用 `src/data/public/index-catalog.json` 作为首页展示与外部程序发现索引的权威源文件，并由 Astro 在构建期发布为 `/index-catalog.json`。
- 为 `HagiCode Server` 与 `HagiCode Desktop` 生成独立版本历史页：`/server/history/` 与 `/desktop/history/`。
- 维护 `activity-metrics` 快照与 catalog 摘要，并保持 `/activity-metrics.json` 路由稳定。
- 保持既有 JSON URL 不变，例如 `/index-catalog.json`、`/activity-metrics.json`、`/server/index.json`、`/desktop/index.json`、`/presets/index.json`。

## Source / Public 边界

当前仓库明确区分两类 JSON：

### 1. Route-mapped JSON：source 在 `src`，公开路由由 Astro 输出

| 公开路由 | 权威源文件 | 生成方式 |
| --- | --- | --- |
| `/index-catalog.json` | `src/data/public/index-catalog.json` | `src/pages/index-catalog.json.ts` |
| `/activity-metrics.json` | `src/data/public/activity-metrics.json` | `src/pages/activity-metrics.json.ts` |
| `/server/index.json` | `src/data/public/server/index.json` | `src/pages/server/index.json.ts` |
| `/desktop/index.json` | `src/data/public/desktop/index.json` | `src/pages/desktop/index.json.ts` |

规则很明确：

- 不要手改 `dist/**` 或尝试在 `public/` 下补这些路由文件。
- producer 脚本只更新 `src/data/public/**`。
- Astro 构建负责输出稳定、minified 的公开 JSON。

### 2. 非 route-mapped JSON：仍以 `public/` 或其他 source 目录驱动

这些资产当前**暂不纳入** Astro JSON 路由模型：

- `public/presets/**`
- `public/agent-templates/**`
- `public/character-templates/**`
- `public/secondary-professions/index.json`
- `../hagicode-core/src/PCode.Web/Assets/secondary-professions.index.json`

它们各自仍由同步脚本或生成脚本维护，但不应被误认为 route-mapped JSON 的权威源。

## 版本历史页面

版本历史页只依赖仓库内静态 JSON，不会在运行时发起额外请求。

- `HagiCode Server`：`/server/history/` ← source `src/data/public/server/index.json` ← published route `/server/index.json`
- `HagiCode Desktop`：`/desktop/history/` ← source `src/data/public/desktop/index.json` ← published route `/desktop/index.json`
- 首页 package 卡片通过 `historyPagePath` 暴露可访问入口，同时继续保留原始 JSON 链接。

历史页当前的归一化边界如下：

- 优先读取 `packages[]`。若不存在则回退到 `versions[]`。
- 发布日期候选字段：`publishedAt`、`releaseDate`、`updatedAt`、`createdAt` 及其下划线变体。
- 下载入口候选字段：`downloadUrl`、`url`、`files[]`、`assets[]`、`downloads[]`、`artifacts[]`。
- 缺少发布日期时显示 `发布日期未知`。
- 缺少下载入口时显示 `无直接下载`，同时保留 `原始 JSON` 兜底动作。

## 活动数据模型

`src/data/public/activity-metrics.json` 使用独立契约，并把当前快照同步成 catalog 摘要。最终公开路由仍是 `/activity-metrics.json`。

- 顶层字段：`lastUpdated`、`dockerHub`、`clarity`、`history`
- `dockerHub`：`repository`、`pullCount`
- `clarity`：`activeUsers`、`activeSessions`、`dateRange`
- `history` 条目：`date`、`dockerHub.pullCount`、`clarity.activeUsers`、`clarity.activeSessions`
- catalog 摘要字段：`activityMetrics.activeUsers`、`activityMetrics.activeSessions`、`activityMetrics.dateRange`

约束如下：

- 同一 UTC 日期只保留一条 `history` 记录。
- 仅保留最近 90 天窗口。
- Clarity 返回 `0/0` 或请求失败时，保留上一份有效 Clarity 快照。
- 首次运行会自动创建初始 JSON。无需人工补文件。

## 活动数据来源

当前参考实现来自 monorepo 的 `repos/site`，但本仓库独立维护自己的资产与自动化。

- Docker Hub：`DOCKER_HUB_REPOSITORY` 指向的仓库拉取次数。
- Microsoft Clarity：近 3 天活跃用户与活跃会话。
- GitHub Actions：定时执行 `npm run update-activity-metrics`。
- 同一次刷新会同步更新 `src/data/public/index-catalog.json` 中 `activity-metrics` 条目的 `lastUpdated` 与摘要。

## 环境变量

脚本命令：`npm run update-activity-metrics`

- `DOCKER_HUB_REPOSITORY`：默认 `newbe36524/hagicode`
- `CLARITY_API_KEY`：读取 Clarity Data Export API
- `HAGICODE_CLARITY_PROJECT_ID`：兼容变量，用于维护上下文

```bash
export DOCKER_HUB_REPOSITORY="newbe36524/hagicode"
export CLARITY_API_KEY="<token>"
export HAGICODE_CLARITY_PROJECT_ID="<project-id>"
npm run update-activity-metrics
```

或：

```bash
node --env-file=.env ./scripts/update-activity-metrics.mjs
```

## GitHub Actions 自动化

工作流文件：`.github/workflows/update-activity-metrics.yml`

- 支持 `schedule`、`workflow_dispatch`、`workflow_call`
- 在仓库内安装依赖并执行 `npm run update-activity-metrics`
- 输出核心指标、更新时间与警告到 workflow summary
- 若 source JSON 有变更，直接提交并推送到当前分支

## 其他资产来源与边界

### presets

- 源目录：`repos/docs/public/presets`
- 发布镜像：`public/presets`
- 维护原则：常规更新应在 `repos/docs` 完成，再同步到本仓库；不要把这里作为 presets 主编辑位置。

### Agent templates

- Trait canonical 输出：`../trait/src/data/generated/agent-templates/`
- SOUL canonical 输出：`../soul/src/data/generated/agent-templates/`
- Index 发布目录：`public/agent-templates/`
- 根清单：`public/agent-templates/index.json`
- 维护原则：不要在 `repos/index/public/agent-templates/` 手工编辑模板正文；这里是发布镜像，不是 source-of-truth。

### Secondary professions

- 源数据：`src/data/secondary-professions.catalog.json`
- 发布目录：`public/secondary-professions/index.json`
- catalog 源入口：`src/data/public/index-catalog.json` 中的 `secondary-professions`
- 后端 fallback：`../hagicode-core/src/PCode.Web/Assets/secondary-professions.index.json`
- 维护原则：副职业目录以 `repos/index` 源数据为准；不要直接手改 `public/secondary-professions/index.json` 或后端 fallback 快照。

### Character templates

- 生成输入：`src/data/agent-preset-library.json`
- 生成脚本：`scripts/build-agent-preset-library.mjs`
- 发布目录：`public/character-templates/`
- `curated` 输出 `applyScope = ["soul", "trait"]`
- `universal` 输出 `applyScope = ["soul"]`

## 开发命令

```bash
npm install
npm run sync:presets
npm run sync:secondary-professions
npm run sync:character-templates
npm run validate
npm test
npm run update-activity-metrics
npm run dev
npm run build
```

默认开发端口：`31266`

## 目录清单模型

`src/data/public/index-catalog.json` 的每个条目至少包含：

- `id`
- `title`
- `description`
- `path`
- `category`
- `sourceRepo`
- `lastUpdated`
- `status`

可选字段：

- `readmePath`
- `sourceUrl`
- `historyPagePath`
- `activityMetrics`

其中：

- `historyPagePath` 当前固定用于 `server-packages` → `/server/history/`、`desktop-packages` → `/desktop/history/`
- `activityMetrics` 当前用于 `activity-metrics` 条目，并与 `/activity-metrics.json` 当前快照保持同步

## 同步流程

### 目录资产（presets）

1. 在 monorepo 的 `repos/docs/public/presets` 更新 `index.json`、`README.md` 或 provider JSON。
2. 在本仓库执行 `npm run sync:presets`。
3. 如有新增入口，更新 `src/data/public/index-catalog.json`。
4. 执行 `npm run validate` 或 `npm run build`。

### 包索引与历史页

1. 运行 `npm run sync:index`，或更新 `src/data/public/server/index.json`、`src/data/public/desktop/index.json`。
2. 确认 `src/data/public/index-catalog.json` 中 managed package 条目仍包含正确的 `historyPagePath`。
3. 若上游索引结构演进，同步更新 `src/lib/load-package-history.ts`、`tests/version-history-pages.test.mjs` 与 `tests/route-mapped-loaders.test.mjs`。
4. 执行 `npm run validate`、`npm test`、`npm run build`。

### Agent templates

1. 在 monorepo 的 `repos/trait` 执行 `npm run sync:agent-templates`，生成 Trait 模板快照。
2. 在 monorepo 的 `repos/soul` 执行 `npm run sync:agent-templates`，生成 SOUL 模板快照。
3. 在本仓库执行 `npm run sync:agent-templates`，把两侧 canonical 输出镜像到 `public/agent-templates/`。
4. 检查 `src/data/public/index-catalog.json` 中 `agent-templates` 条目仍指向 `/agent-templates/index.json`。
5. 执行 `npm run validate`、`npm test`、`npm run build`。

### Secondary professions

1. 在 `src/data/secondary-professions.catalog.json` 更新目录源数据。
2. 在本仓库执行 `npm run sync:secondary-professions`，同步生成 `public/secondary-professions/index.json` 与后端 fallback 快照，并更新 `src/data/public/index-catalog.json`。
3. 执行 `npm run validate`、`npm test`、`npm run build`。

### Character templates

1. 先执行 Agent template 同步流程，确保 `public/agent-templates/` 已最新。
2. 检查 `src/data/agent-preset-library.json` 里的计数基线、缺口优先清单和 `templateMatrix`。
3. 执行 `npm run sync:character-templates`，重建 `public/character-templates/`。
4. 执行 `npm run validate` 与 `npm test`，确认数量、去重、`templateMode` / `applyScope` 契约与引用完整性都通过。

### 活动数据资产

1. 配置 `CLARITY_API_KEY` 等环境变量。
2. 运行 `npm run update-activity-metrics`。
3. 检查 `src/data/public/activity-metrics.json` 与 `src/data/public/index-catalog.json` 中的 `activity-metrics` 摘要是否一致。
4. 执行 `npm run validate`、`npm test`、`npm run build`。

## 验证说明

- `npm run validate`：构建临时 Astro 输出，并校验 source/build 语义一致、公开路由存在且 JSON 已 minify。
- `npm test`：覆盖版本历史归一化、route-mapped loader 契约、catalog 漂移检测、活动摘要同步、同日重跑、90 天滚动与 pretty JSON 拒绝场景。
- `npm run build`：生成最终静态站点，并再次验证 route-mapped JSON 输出。

## 维护边界

- monorepo 中的 `repos/site` 只是参考实现，不是运行时依赖。
- `src/data/public/**` 是 route-mapped JSON 的 source-of-truth；不要手改 `dist/**`，也不要把这些文件重新放回 `public/` 作为源码。
- `public/agent-templates/**`、`public/character-templates/**`、`public/presets/**`、`public/secondary-professions/index.json` 仍是发布镜像或生成结果，但不属于 Astro JSON 路由源目录。
- Index 只负责读取并发布镜像好的包索引，不负责生成上游发布数据。
- 当 `/server/index.json` 或 `/desktop/index.json` 的结构发生演进时，必须同步更新 loader 与回归测试，不要只改页面文案。
