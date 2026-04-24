import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function getCliOption(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function resolvePublishedRoot(input = process.env.INDEX_BUILD_ROOT ?? 'dist') {
  return path.resolve(projectRoot, input);
}

function assertPublishedRootInsideProject(publishedRoot) {
  const relative = path.relative(projectRoot, publishedRoot);

  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to minify JSON outside a build output directory: ${publishedRoot}`);
  }

  const topLevelDirectory = relative.split(path.sep)[0];
  const blockedSourceRoots = new Set(['src', 'public', 'scripts', 'tests', 'vendor']);

  if (blockedSourceRoots.has(topLevelDirectory)) {
    throw new Error(`Refusing to minify source-of-truth JSON under ${topLevelDirectory}/. Use a build output directory such as dist.`);
  }
}

async function collectJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectJsonFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function toPublishedPath(filePath, publishedRoot) {
  return `/${path.relative(publishedRoot, filePath).split(path.sep).join('/')}`;
}

export async function minifyPublishedJson({ publishedRoot = resolvePublishedRoot() } = {}) {
  assertPublishedRootInsideProject(publishedRoot);

  const jsonFiles = await collectJsonFiles(publishedRoot);

  for (const filePath of jsonFiles) {
    const raw = await readFile(filePath, 'utf8');
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `Cannot minify invalid published JSON at ${toPublishedPath(filePath, publishedRoot)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await writeFile(filePath, JSON.stringify(parsed), 'utf8');
  }

  console.log(`Minified ${jsonFiles.length} published JSON assets in ${path.relative(projectRoot, publishedRoot) || publishedRoot}.`);
}

const publishedRootArg = getCliOption('--published-root');
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (entryPath && entryPath === fileURLToPath(import.meta.url)) {
  minifyPublishedJson({ publishedRoot: resolvePublishedRoot(publishedRootArg ?? undefined) }).catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
