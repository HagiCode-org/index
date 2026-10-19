# HagiCode Index - Agent Configuration

## Root Configuration

Inherits all behavior from `/AGENTS.md` at the monorepo root. Local rules extend or override the root file for this repository.

## Project Context

This repository is the Astro static site for [index.hagicode.com](https://index.hagicode.com), hosting public JSON assets, a site navigation portal, data mirror pages, and version history pages for HagiCode Server and Desktop.

## Working Directory

Run commands from `repos/index/`.

## Key Commands

```bash
npm install
npm run dev
npm run build
npm test
npm run validate
npm run i18n:check
npm run typecheck
npm run sync:index
npm run sync:secondary-professions
npm run sync:character-templates
npm run sync:agent-templates
npm run generate:steam-achievements   # regenerate Steam achievement icons (scripts/steam-achievements/)
```

`npm run dev` / `npm run preview` listen on `${PORT_INDEX:-31266}`. Hosting config for Aliyun ESA lives in `esa.jsonc` (`npm ci --include=dev`, `npm run build`, `dist/` assets).

Requires Node.js 24+. `build`, `validate` and `test` first run `prepare:generated` (i18n resources, secondary professions, character templates) and build into `dist/`, `.astro-validate/` and `.astro-test/` respectively (all gitignored). Initialize submodules with `git submodule update --init --recursive` (`vendor/awesome-design-md`).

## Key Paths

- `src/pages/`: Astro routes
- `src/data/public/`: source-of-truth JSON assets (index-catalog.json)
- `src/data/sites-catalog.json`: internal portal site catalog, read only by the homepage; not published
- `scripts/`: JSON minification, validation, and generation helpers
- `public/`: static assets published alongside built JSON; `presets/`, `agent-templates/`, `character-templates/` and `secondary-professions/` are synced mirrors/generated output, not hand-edited sources
- `src/i18n/`: `locale-metadata.ts` (10 published-content locales) and YAML under `locales/<locale>/`; `generated-locales/` is generated and gitignored
- `tests/`: `node --test` suites run by `npm test` against the `.astro-test` build
- `.github/workflows/`: gh-pages deploy plus `index-file-sync.yml` (scheduled mirror sync that commits managed index changes) and `compress-images.yml` (compresses jpg/png/webp added to the repo)
- `src/pages/steam/`: Steam achievements page and JSON routes, fed by `src/data/steam-achievements-source.json` and `src/assets/steam/`
- `docs/legal-documents-contract.md`: contract for the published `legal-documents.json` (consumed by HagiCode Desktop)

## Agent Guidelines

- All published JSON must be stable compressed format (`JSON.stringify(JSON.parse(raw))`). Run `npm run validate` after changes.
- Keep existing JSON URL routes stable (e.g., `/index-catalog.json`, `/server/index.json`, `/desktop/index.json`).
- Edit source JSON files in `src/data/public/`, not the minified build output.
- Do not add server-side API routes; this is a static site.
- Change localized copy in the YAML sources, then run `npm run i18n:generate` and `npm run i18n:check`; never edit `src/i18n/generated-locales/`.
- Every `src/data/public/promote.json` entry needs a non-empty `platforms` array (`web` / `hagicode`); take items offline with `on: false`, not by clearing `platforms`.
- Footer and site-level promotion come from HagiLight packages; do not duplicate them locally.

## References

- `README.md`
