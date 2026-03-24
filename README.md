# HagiCode Index

这是 `https://index.hagicode.com` 的独立 Astro 静态站点。它负责托管公开 JSON 资产。也负责维护可人工浏览的目录首页。

## 站点职责

- 托管公开 JSON 索引与静态资源。不提供服务端 API。
- 用 `public/index-catalog.json` 作为首页展示和外部程序发现索引的单一来源。
- 独立生成并发布 `public/activity-metrics.json`。但不在本轮承担活动数据展示职责。
- 保持原始 JSON 路径稳定可直连。例如 `/presets/index.json` 与 `/activity-metrics.json`。

## 活动数据模型

`public/activity-metrics.json` 使用独立的数据契约。

- 顶层快照字段：`lastUpdated`、`dockerHub`、`clarity`、`history`
- `dockerHub`：`repository`、`pullCount`
- `clarity`：`activeUsers`、`activeSessions`、`dateRange`
- `history` 条目：`date`、`dockerHub.pullCount`、`clarity.activeUsers`、`clarity.activeSessions`

约束如下。

- 同一 UTC 日期只保留一条 `history` 记录。
- 仅保留最近 90 天窗口。
- Clarity 返回 `0/0` 或请求失败时。保留上一份有效 Clarity 快照。
- 首次运行会自动创建初始 JSON。无需人工补文件。

## 活动数据来源

当前参考实现来自 monorepo 中的 `repos/site`。但本仓库独立维护自己的资产与自动化。

- Docker Hub：`DOCKER_HUB_REPOSITORY` 指向的仓库拉取次数。
- Microsoft Clarity：近 3 天活跃用户与活跃会话。
- GitHub Actions：定时执行仓库内脚本。更新 `public/activity-metrics.json`。并通过 PR 暴露变更。

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
- 若 JSON 有变更。通过固定分支 `metrics-update` 创建或更新 PR

这样做的原因很直接。

- 指标文件属于静态资产。
- 需要可审查变更面。
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

## 同步流程

### 目录资产

1. 在 monorepo 的 `repos/docs/public/presets` 更新 `index.json`、`README.md` 或 provider JSON。
2. 在本仓库执行 `npm run sync:presets`。
3. 如有新增入口。更新 `public/index-catalog.json`。
4. 执行 `npm run validate` 或直接 `npm run build`。

### 活动数据资产

1. 配置 `CLARITY_API_KEY` 等环境变量。
2. 运行 `npm run update-activity-metrics`。
3. 检查 `public/activity-metrics.json` 是否符合预期。
4. 运行 `npm run validate`、`npm test`、`npm run build`。

## 验证说明

- `npm run validate` 会同时检查 `index-catalog.json` 与 `activity-metrics.json` 的结构。
- `npm test` 会覆盖首次生成、同日重跑、90 天滚动与 Clarity `0/0` 保留场景。
- `npm run build` 默认先执行校验。再输出静态站点。

## 维护边界

- monorepo 中的 `repos/site` 只是参考实现。不是运行时依赖。
- `public/activity-metrics.json` 是独立静态资产。不属于 `index-catalog.json` 主目录职责。
- Index 本轮只负责生成和存储活动数据 JSON。不负责首页活动数据展示。
