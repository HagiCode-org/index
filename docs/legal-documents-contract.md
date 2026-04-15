# Legal Documents Metadata Contract

This file documents the `https://index.hagicode.com/legal-documents.json` payload consumed by HagiCode Desktop.

## Audience

- `repos/index` maintainers publishing JSON assets
- `repos/docs` maintainers updating legal pages
- desktop maintainers consuming revision-aware legal metadata

## Purpose

Provide a stable machine-readable contract for the current HagiCode EULA and Privacy Policy revisions without hardcoding legal dates inside the desktop client.

## Route

- Source JSON: `src/data/public/legal-documents.json`
- Published route: `/legal-documents.json`
- Page wrapper: `src/pages/legal-documents.json.ts`

## Payload shape

```json
{
  "schemaVersion": "1.0.0",
  "publishedAt": "2026-04-15T00:00:00.000Z",
  "documents": [
    {
      "documentType": "eula",
      "effectiveDate": "2026-04-15",
      "revision": "2026-04-15",
      "canonicalUrl": "https://docs.hagicode.com/legal/eula/",
      "locales": {
        "zh-CN": {
          "title": "终端用户许可协议（EULA）",
          "browserOpenUrl": "https://docs.hagicode.com/legal/eula/"
        },
        "en-US": {
          "title": "End User License Agreement (EULA)",
          "browserOpenUrl": "https://docs.hagicode.com/en/legal/eula/"
        }
      }
    }
  ]
}
```

## Field reference

- `schemaVersion`: version for the metadata contract itself; bump only for structural changes.
- `publishedAt`: ISO timestamp describing when this JSON payload was last updated.
- `documents`: array of legal document entries. The current contract requires exactly one `eula` entry and one `privacy-policy` entry.
- `documentType`: stable document identifier used by desktop routing.
- `effectiveDate`: the public effective date shown to users.
- `revision`: revision identifier compared against accepted desktop consent records.
- `canonicalUrl`: locale-neutral canonical docs URL for auditing and fallback display.
- `locales.<locale>.title`: localized document title rendered by desktop.
- `locales.<locale>.browserOpenUrl`: locale-specific URL opened in the system browser.

## Update checklist

Whenever you update either legal document in `repos/docs`, update this contract in the same change.

1. Edit the docs pages in `repos/docs/src/content/docs/legal/*.mdx` and `repos/docs/src/content/docs/en/legal/*.mdx`.
2. Update the matching `effectiveDate` and `revision` in `repos/index/src/data/public/legal-documents.json`.
3. Verify each `browserOpenUrl` still targets the correct published docs route.
4. Keep `documentType` values stable: `eula` and `privacy-policy`.
5. Run `npm test` in `repos/index` so the published JSON contract is validated.

## Compatibility notes

- Desktop treats `revision` as the legal-consent source of truth.
- Desktop may fall back to cached metadata when the index route is temporarily unavailable.
- New optional fields may be added in a backward-compatible manner, but existing field names must remain stable.
