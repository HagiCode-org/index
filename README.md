# HagiCode Index

[![last commit](https://img.shields.io/github/last-commit/HagiCode-org/index)](https://github.com/HagiCode-org/index/commits/main)
[![website](https://img.shields.io/website?url=https%3A%2F%2Findex.hagicode.com&label=website)](https://index.hagicode.com)

这是 `https://index.hagicode.com` 的 HagiCode 门户与数据站点。访客可以在这里找到 HagiCode 各个站点、查看数据页以及 HagiCode Server 与 HagiCode Desktop 的版本历史；开发者和外部程序可以读取它发布的公开 JSON 资产。

## 站点能力

- 根路由 `/` 是 HagiCode 站点导航门户，集中展示主站、文档、Builder、Soul、Trait 与数据镜像入口。
- `/data/` 是人类可读的数据页，展示 catalog 卡片、about 镜像与原始 JSON 动作。
- `/server/history/` 与 `/desktop/history/` 分别是 `HagiCode Server` 与 `HagiCode Desktop` 的版本历史页。
- 托管公开 JSON 索引与静态资源，路由保持稳定。不提供服务端 API。
- `/promoto` 是独立的数据审核页，不是第二份站点级推广卡片。

## 公开 JSON 资产

`/index-catalog.json` 是公开 JSON 资产目录，列出下面这些入口，供程序发现和核对。这些 URL 保持稳定。

| 路由 | 内容 |
| --- | --- |
| `/index-catalog.json` | 公开 JSON 资产目录 |
| `/server/index.json` | HagiCode Server 包索引 |
| `/desktop/index.json` | HagiCode Desktop 包索引 |
| `/presets/index.json` | Claude Code 提供商预设与入口索引 |
| `/agent-templates/index.json` | SOUL 与 Trait 模板目录 |
| `/character-templates/index.json` | 角色模板目录，兼容 curated 与 universal 两种应用模式 |
| `/secondary-professions/index.json` | 系统默认副职业目录 |
| `/about.json` | HagiCode 对外联系渠道、社区入口与二维码资源 |
| `/design.json` | awesome-design-md 主题目录、README 截图预览与上游文档链接 |
| `/steam/index.json` | HagiCode 本体、DLC 与 Steam 成就的共享数据集 |
| `/steam/achievements.json` | Steamworks 成就 API 名、双语文案、里程碑参数与图标路径 |
| `/promote.json` | 跨站点复用的促销启停数据 |
| `/promote_content.json` | 10 种语言的促销标题、描述与跳转链接，见下文图片 fallback 链 |

## /promote_content.json 图片 fallback 链

每条推广内容的 `image` 多出一个附加字段 `sources`，列出同一张图的多种格式，按客户端应优先尝试的顺序排列：

1. AVIF（`image/avif`）
2. WebP（`image/webp`）
3. 原图（与 `image.src`、`image.format`、`image.width`、`image.height` 完全相同，始终是最后一项）

下面是一条条目的结构示意（路径为占位符，实际 hash 以构建产物为准）：

```json
"image": {
  "src": "/_astro/awesome.ABC123.png",
  "width": 1280,
  "height": 720,
  "format": "png",
  "alt": "...",
  "sources": [
    { "format": "avif", "type": "image/avif", "src": "/_astro/awesome.DEF456.avif", "width": 1280, "height": 720 },
    { "format": "webp", "type": "image/webp", "src": "/_astro/awesome.GHI789.webp", "width": 1280, "height": 720 },
    { "format": "png", "type": "image/png", "src": "/_astro/awesome.ABC123.png", "width": 1280, "height": 720 }
  ]
}
```

- 客户端规则：按 `sources` 的顺序逐项检查，取第一个自己能解码的 `type`，请求它的 `src`。原图即使在 AVIF/WebP 可用时也保留在最后一项，作为最后的回退。
- 路径解析：`src` 是根相对路径（以 `/_astro/` 开头），必须相对于提供该 JSON 的源站 `https://index.hagicode.com` 解析，例如 `new URL(src, 'https://index.hagicode.com')`。不要把它直接当作当前页面域名下的路径使用。
- 兼容性：`image.sources` 是附加字段。`id`、`title`、`description`、`cta`、`link`、`targetPlatform`，以及 `image` 中原有的 `src`、`width`、`height`、`format`、`alt` 均不变。
- Steam 数据（`/steam/index.json`、`/steam/achievements.json`）不包含 `sources`。

## 版本历史页面

版本历史页只依赖仓库内静态 JSON，不会在运行时发起额外请求。

- `HagiCode Server`：`/server/history/`，数据来自 `/server/index.json`
- `HagiCode Desktop`：`/desktop/history/`，数据来自 `/desktop/index.json`
- 首页 package 卡片通过 `historyPagePath` 暴露可访问入口，同时继续保留原始 JSON 链接。

历史页的展示规则：

- `Server` 历史页当前只展示带可下载地址的 `.zip` 文件；其他产物通过版本级 `原始 JSON` 追溯。
- `Desktop` 历史页继续展示全部已知文件。
- 每个版本页块会完整暴露该版本的全部已知文件，而不是只展示单一主要资源。
- 若单个文件含 `downloadSources[]`，历史页会在同一文件行渲染多个来源按钮；`fileCount` 与 `downloadableFileCount` 仍按文件而非来源计数。
- 当前内置来源标签：`official` → `官网下载`，`github-release` → `GitHub Release`。
- 缺少发布日期时显示 `发布日期未知`。
- 文件缺少下载入口时仍会显示该条目，并以不可下载状态呈现；版本分组继续保留 `原始 JSON` 兜底动作。
- 当前页面不做运行时筛选、折叠或搜索。

## 目录清单模型

`/index-catalog.json` 的每个条目至少包含：

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

其中：

- `historyPagePath` 当前固定用于 `server-packages` → `/server/history/`、`desktop-packages` → `/desktop/history/`
