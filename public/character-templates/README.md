# Character Templates

This catalog publishes stable character-template JSON for one-click Hero draft initialization.

- Manifest: `/character-templates/index.json`
- Detail: `/character-templates/templates/{id}.json`
- API proxy: `/api/character-templates/index.json` and `/api/character-templates/templates/{id}.json`
- Apply semantics: replace the current local SOUL draft and Trait list only; other Hero fields stay unchanged and editable.
- Entry model: the Hero SOUL section and Trait section both converge on the shared `Select Character Template` action.

Each detail payload references ordered `soulTemplateIds[]` and `traitTemplateIds[]`, which must resolve to published canonical `agent-templates` entries before release.
