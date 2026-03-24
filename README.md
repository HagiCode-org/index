# HagiCode Index

这是 `https://index.hagicode.com` 的独立 Astro 静态站点。它负责托管公开 JSON 资产。也负责维护可人工浏览的目录首页与版本历史页面。

## 站点职责

- 托管公开 JSON 索引与静态资源。不提供服务端 API。
- 用 `public/index-catalog.json` 作为首页展示和外部程序发现索引的单一来源。
- 为 `HagiCode Server` 与 `HagiCode Desktop` 生成独立版本历史页。对应路由是 `/server/history/` 与 `/desktop/history/`。
- 独立生成并发布 `public/activity-metrics.json`，并把当前快照摘要同步到 `public/index-catalog.json`。
- 保持原始 JSON 路径稳定可直连。例如 `/presets/index.json`、`/server/index.json` 与 `/desktop/index.json`。

## 版本历史页面

版本历史页只依赖仓库内的静态 JSON，不会在运行时发起额外请求。

- `HagiCode Server`：`/server/history/` ← 数据源 `public/server/index.json`
- `HagiCode Desktop`：`/desktop/history/` ← 数据源 `public/desktop/index.json`
- 首页 package 卡片通过 `historyPagePath` 暴露可访问入口，同时继续保留原始 JSON 链接。

历史页当前的归一化边界如下。

- 优先读取 `packages[]`。若不存在则回退到 `versions[]`。
- 发布日期候选字段：`publishedAt`、`releaseDate`、`updatedAt`、`createdAt` 及其下划线变体。
- 下载入口候选字段：`downloadUrl`、`url`、`files[]`、`assets[]`、`downloads[]`、`artifacts[]`。
- 缺少发布日期时显示 `发布日期未知`。
- 缺少下载入口时显示 `无直接下载`。同时保留 `原始 JSON` 兜底动作。

## 活动数据模型

`public/activity-metrics.json` 使用独立的数据契约，同时会把当前快照同步成 catalog 摘要。

- 顶层快照字段：`lastUpdated`、`dockerHub`、`clarity`、`history`
- `dockerHub`：`repository`、`pullCount`
- `clarity`：`activeUsers`、`activeSessions`、`dateRange`
- `history` 条目：`date`、`dockerHub.pullCount`、`clarity.activeUsers`、`clarity.activeSessions`
- catalog 摘要字段：`activityMetrics.activeUsers`、`activityMetrics.activeSessions`、`activityMetrics.dateRange`

约束如下。

- 同一 UTC 日期只保留一条 `history` 记录。
- 仅保留最近 90 天窗口。
- Clarity 返回 `0/0` 或请求失败时。保留上一份有效 Clarity 快照。
- 首次运行会自动创建初始 JSON。无需人工补文件。

## 活动数据来源

当前参考实现来自 monorepo 中的 `repos/site`。但本仓库独立维护自己的资产与自动化。

- Docker Hub：`DOCKER_HUB_REPOSITORY` 指向的仓库拉取次数。
- Microsoft Clarity：近 3 天活跃用户与活跃会话。
- GitHub Actions：定时执行仓库内脚本。更新 `public/activity-metrics.json`。并直接提交到主分支。
- 同一次刷新会同步更新 `public/index-catalog.json` 中 `activity-metrics` 条目的 `lastUpdated` 与摘要。

## 环境变量

脚本命令：`npm run update-activity-metrics`

必需或推荐变量如下。

- `DOCKER_HUB_REPOSITORY`。默认值是 `newbe36524/hagicode`。
- `CLARITY_API_KEY`。用于读取 Clarity Data Export API。
- `HAGICODE_CLARITY_PROJECT_ID`。与参考仓保持一致的兼容变量。当前仅用于维护上下文。

本地运行可直接导出变量。也可用 Node 22 的 `--env-file` 机制。

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
- 在仓库内安装依赖。执行 `npm run update-activity-metrics`
- 输出核心指标、更新时间与警告到 workflow summary
- 若 JSON 有变更。直接提交并推送到当前分支。默认是主分支

这样做的原因很直接。

- 指标文件属于静态资产。
- 更新策略需要与 `index.json` 系列资产保持一致。
- 需要异常可追踪。

## presets 来源与边界

- 源目录：`repos/docs/public/presets`
- 发布镜像：`public/presets`
- 维护原则：常规更新应在 monorepo 的 `repos/docs` 完成。再同步到本仓库。不要把这里作为 presets 的主编辑位置。

## 开发命令

```bash
npm install
npm run sync:presets
npm run validate
npm test
npm run update-activity-metrics
npm run dev
npm run build
```

默认开发端口为 `31266`。

## 目录清单模型

`public/index-catalog.json` 的每个条目至少包含：

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

其中 `historyPagePath` 只用于已经提供人类可读历史页的 package 条目。当前固定用于：

- `server-packages` → `/server/history/`
- `desktop-packages` → `/desktop/history/`

其中 `activityMetrics` 目前用于 `activity-metrics` 条目，并与 `/activity-metrics.json` 当前快照保持同步：

- `activeUsers`
- `activeSessions`
- `dateRange`

## 同步流程

### 目录资产

1. 在 monorepo 的 `repos/docs/public/presets` 更新 `index.json`、`README.md` 或 provider JSON。
2. 在本仓库执行 `npm run sync:presets`。
3. 如有新增入口。更新 `public/index-catalog.json`。
4. 执行 `npm run validate` 或直接 `npm run build`。

### 包索引与历史页

1. 同步或更新 `public/server/index.json`、`public/desktop/index.json`。
2. 确认 `public/index-catalog.json` 中的 managed package 条目仍包含正确的 `historyPagePath`。
3. 若上游索引结构演进。同步更新 `src/lib/load-package-history.ts` 的归一化规则。
4. 同步更新 `tests/version-history-pages.test.mjs` 与 `tests/validate-catalog.test.mjs`。
5. 执行 `npm run validate`、`npm test`、`npm run build`。

### 活动数据资产

1. 配置 `CLARITY_API_KEY` 等环境变量。
2. 运行 `npm run update-activity-metrics`。
3. 检查 `public/activity-metrics.json` 与 `public/index-catalog.json` 中的 `activity-metrics` 摘要是否一致。
4. 运行 `npm run validate`、`npm test`、`npm run build`。

## 验证说明

- `npm run validate` 会同时检查 `index-catalog.json` 与 `activity-metrics.json` 的结构。
- `npm test` 会覆盖版本历史归一化、catalog 契约、活动摘要同步、同日重跑、90 天滚动与 Clarity `0/0` 保留场景。
- `npm run build` 默认先执行校验。再输出静态站点与历史页 HTML。

## 维护边界

- monorepo 中的 `repos/site` 只是参考实现。不是运行时依赖。
- `public/activity-metrics.json` 仍是独立静态资产，但当前快照摘要属于 `index-catalog.json` 的公开发现职责。
- Index 只负责读取并渲染镜像好的包索引。不负责生成上游发布数据。
- 每次刷新活动数据后，都要确认 `activity-metrics` catalog 条目的 `lastUpdated` 与摘要字段已同步，再执行校验、测试和静态构建。
- 当 `public/server/index.json` 或 `public/desktop/index.json` 的结构发生演进时，必须同步更新 `src/lib/load-package-history.ts` 与 `tests/version-history-pages.test.mjs`。不要只改页面文案。
