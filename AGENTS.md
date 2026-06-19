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
```

## Key Paths

- `src/pages/`: Astro routes
- `src/data/public/`: source-of-truth JSON assets (sites.json, index-catalog.json)
- `scripts/`: JSON minification, validation, and generation helpers
- `public/`: static assets published alongside built JSON

## Agent Guidelines

- All published JSON must be stable compressed format (`JSON.stringify(JSON.parse(raw))`). Run `npm run validate` after changes.
- Keep existing JSON URL routes stable (e.g., `/index-catalog.json`, `/activity-metrics.json`, `/server/index.json`).
- Edit source JSON files in `src/data/public/`, not the minified build output.
- Do not add server-side API routes; this is a static site.

## References

- `README.md`
