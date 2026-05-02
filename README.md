# HagiCode Index

这是 `https://index.hagicode.com` 的独立 Astro 静态站点。它负责托管公开 JSON 资产、站点门户首页，以及数据镜像页与版本历史页。

## 站点职责

- 托管公开 JSON 索引与静态资源。不提供服务端 API。
- 根路由 `/` 现在是 HagiCode 站点导航门户，集中展示主站、文档、Builder、Soul、Trait 与数据镜像入口。
- `/data/` 承接旧首页的人类可读数据内容，继续展示 catalog 卡片、about 镜像与原始 JSON 动作。
- 用 `src/data/public/sites.json` 作为门户站点入口的权威源文件，并由 Astro 在构建期发布为 `/sites.json`。
- 用 `src/data/public/index-catalog.json` 作为数据镜像页展示与外部程序发现 JSON 资产的权威源文件，并由 Astro 在构建期发布为 `/index-catalog.json`。
- 为 `HagiCode Server` 与 `HagiCode Desktop` 生成独立版本历史页：`/server/history/` 与 `/desktop/history/`。
- 维护 `activity-metrics` 快照与 catalog 摘要，并保持 `/activity-metrics.json` 路由稳定。
- 保持既有 JSON URL 不变，例如 `/index-catalog.json`、`/activity-metrics.json`、`/server/index.json`、`/desktop/index.json`、`/presets/index.json`。

## JSON 发布格式

生产构建遵循“源文件可读、发布产物压缩”的规则：`src/**`、`public/**` 和同步脚本生成的 source-of-truth JSON 可以保留缩进与换行，`npm run build`、`npm run validate` 和 `npm test` 会在 Astro 输出后运行 `scripts/minify-published-json.mjs`，只递归改写发布目录里的 `*.json`。

发布目录中的所有 JSON 都必须等于 `JSON.stringify(JSON.parse(raw))` 的稳定压缩结果。该约束同时覆盖 route-mapped JSON（例如 `/index-catalog.json`、`/server/index.json`）和由 `public/**` 复制进入产物的 JSON（例如 `/presets/**`、`/agent-templates/**`、`/character-templates/**`、`/secondary-professions/index.json`）。`scripts/validate-catalog.mjs` 会扫描发布目录下的全部 `.json` 文件；如果产物不是稳定压缩格式或不是合法 JSON，会输出具体公开路径并失败。

维护者不需要、也不应该为了线上体积手工压缩源 JSON。请继续把可维护性放在 source 文件里，把发布格式交给构建后的 minify 与 verify 步骤。

## hagi18n 本地化工作流

HagIndex 使用 hagi18n 风格的 YAML 源文件维护门户、页脚、Promoto 展示页与 `/promote_content.json` 的人类可读文案。

- 配置文件：`hagi18n.yaml`
- YAML 源目录：`src/i18n/locales/<locale>/`
- 必需 namespace：`hagindex.yml`、`promoto.yml`、`promote-content.yml`
- 生成产物：`src/i18n/generated-locales/<locale>/<namespace>.json`

`generated-locales` 是构建前生成的运行时资源，不作为人工维护入口。修改文案时先改 YAML，再执行：

```bash
npm run i18n:generate
npm run i18n:check
```

常用维护命令：

```bash
npm run i18n:audit
npm run i18n:report
npm run i18n:doctor
npm run i18n:sync
npm run i18n:prune
```

带 `:write` 后缀的 `i18n:sync:write` 与 `i18n:prune:write` 会改写 YAML；不带 `:write` 的命令只预览结果。

所有 `npm run dev`、`npm run build`、`npm run validate` 和 `npm test` 都会先运行 `prepare:generated`，其中包含 `prepare:i18n`。`validate` 与 `test` 还会运行 `i18n:check`，用于发现 YAML 与生成 JSON 的漂移。

翻译和元数据边界：

- 放进 YAML：页面标题、导航标签、页脚文字、按钮文字、Promoto 筛选/状态文案、推广标题、描述、CTA、图片 alt。
- 留在 TypeScript/JSON：公开路由、href、外部链接、promotion ID、平台 ID、时间戳、图片 import、图片尺寸与格式描述。
- `/promote_content.json` 的公开 shape 不变；`src/data/promote-content-metadata.ts` 只维护稳定元数据，`src/data/promote-content-source.ts` 从生成资源组合本地化字段。

## Source / Public 边界

当前仓库明确区分两类 JSON：

### 1. Route-mapped JSON：source 在 `src`，公开路由由 Astro 输出

| 公开路由 | 权威源 | 路由实现 | 类型 |
| --- | --- | --- | --- |
| `/index-catalog.json` | `src/data/public/index-catalog.json` | `src/pages/index-catalog.json.ts` | file-backed |
| `/sites.json` | `src/data/public/sites.json` | `src/pages/sites.json.ts` | file-backed |
| `/activity-metrics.json` | `src/data/public/activity-metrics.json` | `src/pages/activity-metrics.json.ts` | file-backed |
| `/live-broadcast.json` | `src/data/public/live-broadcast.json` | `src/pages/live-broadcast.json.ts` | file-backed |
| `/server/index.json` | `src/data/public/server/index.json` | `src/pages/server/index.json.ts` | file-backed |
| `/desktop/index.json` | `src/data/public/desktop/index.json` | `src/pages/desktop/index.json.ts` | file-backed |
| `/about.json` | `src/data/about/about-source.ts` + `src/assets/about/*` | `src/pages/about.json.ts` | generated |

规则很明确：

- 不要手改 `dist/**` 或尝试在 `public/` 下补这些路由文件。
- producer 脚本只更新 `src/data/public/**`。
- `/about.json` 的文字 source-of-truth 固定在 `src/data/about/about-source.ts`，图片 source-of-truth 固定在 `src/assets/about/*`。
- about 图片必须通过 Astro import 进入 `/about.json`；不要直接写 `/about/*.png`、`/about/*.jpg` 或任何 staging 路径。
- Astro 构建负责输出 route-mapped JSON；生产构建随后统一压缩发布目录中的所有 JSON 产物。

`/sites.json` 与 `/index-catalog.json` 的职责不同：

- `/sites.json`：门户站点目录。描述用户应该前往哪些生产站点或站内稳定路径。
- `/index-catalog.json`：公开 JSON 资产目录。描述程序和维护者需要核对的 JSON 入口，不混入外站导航语义。

### 2. 非 route-mapped JSON：仍以 `public/` 或其他 source 目录驱动

这些资产当前**暂不纳入** Astro JSON 路由模型，但它们复制到发布目录后同样受稳定压缩 JSON 约束：

- `public/presets/**`
- `public/agent-templates/**`
- `public/character-templates/**`
- `public/secondary-professions/index.json`
- `../hagicode-core/src/PCode.Web/Assets/secondary-professions.index.json`

它们各自仍由同步脚本或生成脚本维护，但不应被误认为 route-mapped JSON 的权威源。源文件可以保持格式化；只有构建产物会被压缩。

## 版本历史页面

版本历史页只依赖仓库内静态 JSON，不会在运行时发起额外请求。

- `HagiCode Server`：`/server/history/` ← source `src/data/public/server/index.json` ← published route `/server/index.json`
- `HagiCode Desktop`：`/desktop/history/` ← source `src/data/public/desktop/index.json` ← published route `/desktop/index.json`
- 首页 package 卡片通过 `historyPagePath` 暴露可访问入口，同时继续保留原始 JSON 链接。

历史页当前的归一化边界如下：

- 优先读取 `packages[]`。若不存在则回退到 `versions[]`。
- `Server` 历史页当前只展示带可下载地址的 `.zip` 文件；其他产物通过版本级 `原始 JSON` 追溯。
- `Desktop` 历史页继续展示全部已知文件。
- 发布日期候选字段：`publishedAt`、`releaseDate`、`updatedAt`、`createdAt` 及其下划线变体。
- 每个版本页块会完整暴露该版本的全部已知文件，而不是只展示单一主要资源。
- 结构化资源优先级：`assets[]`、`downloads[]`、`artifacts[]`；若都不存在，再回退到 `files[]`；最后才回退到 release 顶层 `directUrl` / `downloadUrl`。
- 文件下载地址候选字段：`directUrl`、`downloadUrl`、`url`、`downloadURL`、`download_url`、`assetUrl`、`browserDownloadUrl`、`href`、`path`。
- 若单个文件含 `downloadSources[]`，历史页会在同一文件行渲染多个来源按钮；`fileCount` 与 `downloadableFileCount` 仍按文件而非来源计数。
- 当前内置来源标签：`official` → `官网下载`，`github-release` → `GitHub Release`。
- 相对 `path` 会基于对应的 `/server/index.json` 或 `/desktop/index.json` 归一化为稳定站内链接。
- 缺少发布日期时显示 `发布日期未知`。
- 文件缺少下载入口时仍会显示该条目，并以不可下载状态呈现；版本分组继续保留 `原始 JSON` 兜底动作。
- 当前页面不做运行时筛选、折叠或搜索，维护边界仅限静态归一化与可读展示。

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
npm run verify:json-routes
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

### About JSON

1. 在 `src/data/about/about-source.ts` 更新 about 文本、链接、条目 id/type 与图片绑定。
2. 在 `src/assets/about/` 替换二维码或账号图片资源。
3. 执行 `npm run validate`、`npm test`、`npm run build`，确认 `/about.json`、图片哈希 URL 与 route 校验全部通过。

约束：

- 不要恢复 `repos/index/about/` 作为影子 source。
- 不要在 JSON 中手写源图片文件名；公开 `imageUrl` 必须来自 Astro 构建产物。

### 目录资产（presets）

1. 在 monorepo 的 `repos/docs/public/presets` 更新 `index.json`、`README.md` 或 provider JSON。
2. 在本仓库执行 `npm run sync:presets`。
3. 如有新增入口，更新 `src/data/public/index-catalog.json`。
4. 执行 `npm run validate` 或 `npm run build`。

### 包索引与历史页

1. 运行 `npm run sync:index`，或更新 `src/data/public/server/index.json`、`src/data/public/desktop/index.json`。
2. 确认 `src/data/public/index-catalog.json` 中 managed package 条目仍包含正确的 `historyPagePath`。
3. 若上游索引结构演进，同步更新 `src/lib/load-package-history.ts`、`src/components/VersionHistoryPage.astro`、`tests/version-history-pages.test.mjs` 与 `tests/route-mapped-loaders.test.mjs`。
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

- `npm run verify:json-routes`：校验 route-mapped JSON 的公开输出、minify 状态与生成路由契约（含 `/about.json`）。
- `npm run validate`：构建临时 Astro 输出，并校验 source/build 语义一致、公开路由存在且 JSON 已 minify。
- `npm test`：覆盖版本历史归一化、按版本分组文件清单、`files[]` 回退、不可下载文件可见性、route-mapped loader 契约、portal/data 页分流、`/sites.json` 与 `/index-catalog.json` 的职责校验、catalog 漂移检测、活动摘要同步、同日重跑、90 天滚动、pretty JSON 拒绝与 `/about.json` 结构校验。
- `npm run build`：生成最终静态站点，并再次验证 route-mapped JSON 输出。

## 生产部署

- 权威工作流：`.github/workflows/index-deploy-gh-pages.yml`
- 镜像同步工作流：`.github/workflows/index-file-sync.yml` 在同步 `server` / `desktop` 索引并提交到 `main` 后，会显式 dispatch `index-deploy-gh-pages.yml`，避免因 Actions bot push 不触发 `on: push` 而漏发版
- 生产 source of truth：`gh-pages` 分支，只允许 CI 发布经过验证的 JSON 索引快照
- 发布 payload 契约：分支根目录保留 `esa.jsonc`，静态站点和 JSON 公开产物统一放在 `dist/`
- 所需 GitHub 权限：deploy job 需要 `contents: write`
- 所需托管设置：托管层应读取 `gh-pages/esa.jsonc`，并把 `gh-pages/dist/` 作为发布目录
- 首次部署检查：确认 `dist/` 内仍包含 `/sites.json`、`/index-catalog.json`、历史页及镜像资产，然后验证 `https://index.hagicode.com`
- 回滚方式：回退 source 提交或从旧提交重新运行工作流，让 CI 重新发布上一个稳定快照

## 维护边界

- monorepo 中的 `repos/site` 只是参考实现，不是运行时依赖。
- `src/data/public/**` 是 route-mapped JSON 的 source-of-truth；不要手改 `dist/**`，也不要把这些文件重新放回 `public/` 作为源码。
- `public/agent-templates/**`、`public/character-templates/**`、`public/presets/**`、`public/secondary-professions/index.json` 仍是发布镜像或生成结果，但不属于 Astro JSON 路由源目录。
- Index 只负责读取并发布镜像好的包索引，不负责生成上游发布数据。
- 当 `/server/index.json` 或 `/desktop/index.json` 的结构发生演进时，必须同步更新 loader、历史页模板与回归测试，不要只改页面文案。
