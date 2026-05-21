import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const defaultPublishedBaseUrl = 'https://index.hagicode.com';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSourceDir = path.resolve(scriptDir, '../../docs/public/presets');
const defaultTargetDir = path.resolve(scriptDir, '../public/presets');

export async function rewritePublishedPresetReadme(targetDir, publishedBaseUrl = defaultPublishedBaseUrl) {
  const readmePath = path.join(targetDir, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  const normalizedBaseUrl = publishedBaseUrl.replace(/\/$/, '');
  const nextReadme = readme.replaceAll('https://<your-docs-site>', normalizedBaseUrl);

  if (nextReadme !== readme) {
    await writeFile(readmePath, nextReadme, 'utf8');
  }
}

export async function syncPresets({
  sourceDir = defaultSourceDir,
  targetDir = defaultTargetDir,
  publishedBaseUrl = defaultPublishedBaseUrl,
} = {}) {
  await mkdir(path.dirname(targetDir), { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true, force: true });
  await rewritePublishedPresetReadme(targetDir, publishedBaseUrl);

  return {
    sourceDir,
    targetDir,
    publishedBaseUrl: publishedBaseUrl.replace(/\/$/, ''),
  };
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (entryPath && entryPath === fileURLToPath(import.meta.url)) {
  const result = await syncPresets();
  console.log(`Synced presets from ${result.sourceDir} to ${result.targetDir} for ${result.publishedBaseUrl}`);
}
