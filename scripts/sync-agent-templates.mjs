import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const monoRoot = path.resolve(repoRoot, '..', '..');

const sourceDirectories = {
  trait: path.join(monoRoot, 'repos', 'trait', 'src', 'data', 'generated', 'agent-templates'),
  soul: path.join(monoRoot, 'repos', 'soul', 'src', 'data', 'generated', 'agent-templates'),
};

const publicRoot = path.join(repoRoot, 'public');
const outputRoot = path.join(publicRoot, 'agent-templates');
const manifestPath = path.join(outputRoot, 'index.json');

async function ensureJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function resolveGeneratedAt(values) {
  const timestamps = values
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) {
    return new Date().toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

async function copyDirectory(sourceDirectory, targetDirectory) {
  await fs.rm(targetDirectory, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetDirectory), { recursive: true });
  await fs.cp(sourceDirectory, targetDirectory, { recursive: true });
}

export async function syncAgentTemplates({
  sources = sourceDirectories,
  destinationRoot = outputRoot,
} = {}) {
  const typeEntries = [];

  for (const [templateType, sourceDirectory] of Object.entries(sources)) {
    const typeIndex = await ensureJsonFile(path.join(sourceDirectory, 'index.json'));
    await copyDirectory(sourceDirectory, path.join(destinationRoot, templateType));

    typeEntries.push({
      templateType,
      title: typeIndex.title,
      description: typeIndex.description,
      path: `/agent-templates/${templateType}/index.json`,
      count: Array.isArray(typeIndex.templates) ? typeIndex.templates.length : 0,
      generatedAt: typeIndex.generatedAt ?? null,
    });
  }

  const manifest = {
    version: '1.0.0',
    generatedAt: resolveGeneratedAt(typeEntries.map((entry) => entry.generatedAt)),
    types: typeEntries.map(({ generatedAt, ...entry }) => entry).sort((left, right) => left.templateType.localeCompare(right.templateType)),
  };

  await fs.mkdir(destinationRoot, { recursive: true });
  await fs.writeFile(path.join(destinationRoot, 'index.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return manifest;
}

async function main() {
  const manifest = await syncAgentTemplates();
  process.stdout.write(`Synced ${manifest.types.length} agent template types to ${path.relative(repoRoot, manifestPath)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
