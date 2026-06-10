import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function normalizePublishedBaseUrl(publishedBaseUrl) {
  const trimmed = String(publishedBaseUrl ?? '').trim();
  if (!trimmed) {
    throw new Error('publishedBaseUrl is required.');
  }

  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

async function rewriteReadmeLinks(targetDir, publishedBaseUrl) {
  const readmePath = path.join(targetDir, 'README.md');
  const original = await readFile(readmePath, 'utf8');
  const rewritten = original.replaceAll(
    'https://<your-docs-site>/presets/',
    `${normalizePublishedBaseUrl(publishedBaseUrl)}presets/`,
  );

  if (rewritten !== original) {
    await writeFile(readmePath, rewritten, 'utf8');
  }
}

export async function syncPresets({ sourceDir, targetDir, publishedBaseUrl }) {
  if (!sourceDir || !targetDir) {
    throw new Error('sourceDir and targetDir are required.');
  }

  await mkdir(path.dirname(targetDir), { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true, force: true });

  const entries = await readdir(targetDir);
  if (entries.includes('README.md')) {
    await rewriteReadmeLinks(targetDir, publishedBaseUrl);
  }
}
