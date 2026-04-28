# Steam Achievement Icons

`src/data/steam-achievements-source.json` is the source of truth for Steam achievement metadata and icon prompts.

Generate or refresh icons with ImgBin:

```bash
cd repos/index
node scripts/generate-steam-achievement-icons.mjs
```

Useful options:

```bash
node scripts/generate-steam-achievement-icons.mjs --only HAGICODE_CREATE --force
node scripts/generate-steam-achievement-icons.mjs --limit 1 --dry-run
node scripts/generate-steam-achievement-icons.mjs --only HAGICODE_CREATE --force --retries 5 --retry-delay-ms 60000
```

The script writes:

- generated ImgBin source assets to `src/assets/steam/achievements/.imgbin-library/`
- Steam-ready 256x256 PNG icons to `public/steam/achievements/icons/`
- one achieved icon and one locked grayscale icon per achievement

When `--force` is used, the script first removes existing ImgBin library directories for the target achievement slug, then regenerates the source asset through ImgBin. This keeps stale or failed-provider metadata out of the managed asset library.

To add a new achievement, append it to `src/data/steam-achievements-source.json`, keep `steamApiName` aligned with the backend mapping, add a focused `icon.prompt`, then rerun the script. The generator intentionally fails when ImgBin's configured image provider is unavailable so committed icons always come from ImgBin.
