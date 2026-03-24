# HagiCode Index

`repos/index` 是 `https://index.hagicode.com` 的独立 Astro 静态站点，用来集中发布 JSON 索引文件，并给维护者提供一个可人工浏览的目录首页。

## 站点职责

- 托管公开 JSON 索引与静态资源，不提供服务端 API。
- 用 `public/index-catalog.json` 作为首页展示和外部程序发现索引的单一来源。
- 保持原始 JSON 路径稳定可直连，例如 `/presets/index.json`。

## presets 来源与边界

- 源目录：`repos/docs/public/presets`
- 发布镜像：`repos/index/public/presets`
- 维护原则：常规更新应在 `repos/docs` 完成，再同步到 `repos/index`，不要把 `repos/index` 作为 presets 的主编辑位置。

## 开发命令

```bash
cd repos/index
npm install
npm run sync:presets
npm run validate
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

1. 在 `repos/docs/public/presets` 更新 `index.json`、`README.md` 或 provider JSON。
2. 在 `repos/index` 执行 `npm run sync:presets`。
3. 如有新增入口，更新 `public/index-catalog.json`。
4. 执行 `npm run validate` 或直接 `npm run build`。

## 验证说明

- `npm run validate` 会检查 catalog 必填字段、原始 JSON 路径和 README 路径是否存在。
- `npm test` 会运行 catalog 校验脚本，确保构建前能发现路径不一致问题。
- `npm run build` 默认先执行校验，再输出静态站点。
