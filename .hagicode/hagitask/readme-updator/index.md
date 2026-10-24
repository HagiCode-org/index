---
public: true
multilingual: false
style: product
---

# README requirements

## Product focus

- Introduce HagiCode Index (`index.hagicode.com`) as the static site that gives people one portal to the HagiCode sites (main site, docs, Builder, Soul, Trait and the data mirror), a human-readable data page, and version history pages for HagiCode Server and HagiCode Desktop, while also publishing the public JSON assets that HagiCode clients and external programs read.
- Address visitors who want to find HagiCode sites and release history first, and developers who consume the published JSON (for example `/index-catalog.json`, `/activity-metrics.json`, `/server/index.json`, `/desktop/index.json`, `/presets/index.json`). The README is written in Chinese; keep it in Chinese.
- Lead with what the site offers visitors and consumers; keep how the data is built and synced out of the main description.

## Required content

- Open with a short product introduction and the site link, keeping the badges the README carries.
- Describe the user-facing capabilities as the site shows them: the portal home page, the `/data/` page, the Server and Desktop version history pages (`/server/history/`, `/desktop/history/`) and the stable public JSON URLs.
- Document the public JSON assets a consumer can rely on, such as the `/promote_content.json` image fallback list and the stable JSON routes. Route and file names must match `src/` and `public/`.

## Exclusions

- Exclude values for environment variables, tokens, secret values, internal hosts, machine-specific paths and private links.
- Keep repository maintenance instructions out of the README: build and verification commands, JSON minification rules, localization workflow, source and public boundaries, GitHub Actions automation, sync flow, deployment and maintenance boundaries. Do not list features the repository does not show.
