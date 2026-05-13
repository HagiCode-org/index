# Character Templates

This catalog publishes stable character-template JSON for one-click Hero draft initialization.

- Manifest: `/character-templates/index.json`
- Detail: `/character-templates/templates/{id}.json`
- API proxy: `/api/character-templates/index.json` and `/api/character-templates/templates/{id}.json`
- Template modes: `curated` replaces both SOUL and Trait, `universal` replaces SOUL only and keeps Trait open.
- Apply semantics: follow each payload's `applyScope`; only the listed Hero fields are updated, and other Hero fields stay editable.
- Entry model: the Hero SOUL section and Trait section both converge on the shared `Select Character Template` action.

Each detail payload references ordered `soulTemplateIds[]`. `curated` payloads must also resolve non-empty `traitTemplateIds[]`; `universal` payloads publish an empty `traitTemplateIds[]` to signal that Trait selection remains user-controlled.
