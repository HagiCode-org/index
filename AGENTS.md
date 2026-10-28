# HagiCode Index - Agent Configuration

## Root Configuration

Inherits all behavior from `/AGENTS.md` at the monorepo root. Local rules extend or override the root file for this repository.

## Project Context

This repository is the Astro static site for [index.hagicode.com](https://index.hagicode.com), hosting public JSON assets, a site navigation portal, data mirror pages, and version history pages for HagiCode Server and Desktop.

## Working Directory

Run commands from `repos/index/`.

## Key Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm test
pnpm run validate
pnpm run i18n:check
pnpm run i18n:audit            # hagi18n audit/report/doctor/sync/prune (config: hagi18n.yaml; sync/prune have :write variants)
pnpm run typecheck
pnpm run sync:index
pnpm run sync:secondary-professions
pnpm run sync:character-templates
pnpm run sync:agent-templates
pnpm run generate:steam-achievements   # regenerate Steam achievement icons (scripts/steam-achievements/)
```

`pnpm run dev` / `pnpm run preview` listen on `${PORT_INDEX:-31266}`. Hosting config for Aliyun ESA lives in `esa.jsonc` (`npm ci --include=dev`, `pnpm run build`, `dist/` assets).

Requires Node.js 24+. `build`, `validate` and `test` first run `prepare:generated` (i18n resources, secondary professions, character templates) and build into `dist/`, `.astro-validate/` and `.astro-test/` respectively (all gitignored). Initialize submodules with `git submodule update --init --recursive` (`vendor/awesome-design-md`).

## Key Paths

- `src/pages/`: Astro routes
- `src/data/public/`: source-of-truth JSON assets (index-catalog.json)
- `src/data/sites-catalog.json`: internal portal site catalog, read only by the homepage; not published
- `scripts/`: JSON minification, validation, and generation helpers
- `public/`: static assets published alongside built JSON; `presets/`, `agent-templates/`, `character-templates/` and `secondary-professions/` are synced mirrors/generated output, not hand-edited sources
- `src/i18n/`: `locale-metadata.ts` (10 published-content locales) and YAML under `locales/<locale>/`; `generated-locales/` is generated and gitignored
- `tests/`: `node --test` suites run by `pnpm test` against the `.astro-test` build
- `.github/workflows/`: gh-pages deploy plus `index-file-sync.yml` (scheduled mirror sync that commits managed index changes) and `compress-images.yml` (compresses jpg/png/webp added to the repo)
- `src/pages/steam/`: Steam achievements page and JSON routes, fed by `src/data/steam-achievements-source.json` and `src/assets/steam/`
- `src/assets/promote/generated/`: textless generated key art for `promote.json` entries (imported by `src/data/promote-content-metadata.ts`); `recipes.json` there records the generation recipe, so change art by editing the recipe rather than hand-editing the images
- `docs/legal-documents-contract.md`: contract for the published `legal-documents.json` (consumed by HagiCode Desktop)

## Agent Guidelines

- All published JSON must be stable compressed format (`JSON.stringify(JSON.parse(raw))`). Run `pnpm run validate` after changes.
- Keep existing JSON URL routes stable (e.g., `/index-catalog.json`, `/server/index.json`, `/desktop/index.json`).
- Edit source JSON files in `src/data/public/`, not the minified build output.
- Do not add server-side API routes; this is a static site.
- Change localized copy in the YAML sources, then run `pnpm run i18n:generate` and `pnpm run i18n:check`; never edit `src/i18n/generated-locales/`.
- Every `src/data/public/promote.json` entry needs a non-empty `platforms` array (`web` / `hagicode`); take items offline with `on: false`, not by clearing `platforms`.
- Footer and site-level promotion come from HagiLight packages; do not duplicate them locally.

## References

- `README.md`

## Package management

- The repository uses pnpm, pinned in `package.json` `packageManager`. Run `corepack enable` once, then `pnpm install`. `pnpm-lock.yaml` is the only lockfile; do not commit `package-lock.json`.
- Settings live in `pnpm-workspace.yaml`. `allowBuilds` lists the dependencies whose install scripts may run (reviewed individually, `false` means reviewed and denied); review any new dependency that has an install script and add it there.
- A local registry mirror belongs in `~/.npmrc` only. Never commit a `registry=` line or a mirror URL; `pnpm run check:registry` (also run in CI) fails on any non-`registry.npmjs.org` `tarball` in the lockfile and on mirror hosts in tracked files.
- Undeclared imports fail under pnpm's strict layout: declare the package instead of hoisting it.
