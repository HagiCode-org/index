#!/usr/bin/env node
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const monoRoot = path.resolve(projectRoot, '..', '..');
const imgbinRoot = path.join(monoRoot, 'repos', 'imgbin');
const imgbinCliPath = path.join(imgbinRoot, 'dist', 'cli.js');
const sourcePath = path.join(projectRoot, 'src', 'data', 'steam-achievements-source.json');
const libraryRoot = path.join(projectRoot, 'src', 'assets', 'steam', 'achievements', '.imgbin-library');
const publicIconRoot = path.join(projectRoot, 'public', 'steam', 'achievements', 'icons');
const require = createRequire(import.meta.url);
const sharp = require(path.join(imgbinRoot, 'node_modules', 'sharp'));
const generatedAssetPattern = /Generated asset(?: with warnings)? at (.+)$/m;

function parseArgs(argv) {
  const options = {
    force: false,
    dryRun: false,
    retries: 3,
    retryDelayMs: 30_000,
    only: new Set(),
    limit: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const takeValue = () => {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`Missing value for ${arg}.`);
      }
      index += 1;
      return value;
    };

    if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--retries') {
      options.retries = Number.parseInt(takeValue(), 10);
    } else if (arg.startsWith('--retries=')) {
      options.retries = Number.parseInt(arg.slice('--retries='.length), 10);
    } else if (arg === '--retry-delay-ms') {
      options.retryDelayMs = Number.parseInt(takeValue(), 10);
    } else if (arg.startsWith('--retry-delay-ms=')) {
      options.retryDelayMs = Number.parseInt(arg.slice('--retry-delay-ms='.length), 10);
    } else if (arg === '--only') {
      options.only.add(takeValue());
    } else if (arg.startsWith('--only=')) {
      options.only.add(arg.slice('--only='.length));
    } else if (arg === '--limit') {
      options.limit = Number.parseInt(takeValue(), 10);
    } else if (arg.startsWith('--limit=')) {
      options.limit = Number.parseInt(arg.slice('--limit='.length), 10);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit <= 0)) {
    throw new Error('--limit must be a positive integer.');
  }

  if (!Number.isInteger(options.retries) || options.retries < 1) {
    throw new Error('--retries must be a positive integer.');
  }

  if (!Number.isInteger(options.retryDelayMs) || options.retryDelayMs < 0) {
    throw new Error('--retry-delay-ms must be a non-negative integer.');
  }

  return options;
}

function apiNameToIconBasename(apiName) {
  return apiName.toLowerCase();
}

function apiNameToAssetSlug(apiName) {
  return apiNameToIconBasename(apiName).replaceAll('_', '-');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function pathExists(candidate) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on('error', reject);
    child.on('close', (exitCode) => {
      resolve({ exitCode: exitCode ?? 1, stdout, stderr });
    });
  });
}

async function removeExistingImgBinAssets(assetSlug) {
  if (!await pathExists(libraryRoot)) {
    return;
  }

  const assetNamePattern = new RegExp(`^${escapeRegExp(assetSlug)}(?:-\\d+)?$`);
  const monthlyDirectories = await readdir(libraryRoot, { withFileTypes: true });

  for (const monthlyDirectory of monthlyDirectories) {
    if (!monthlyDirectory.isDirectory()) {
      continue;
    }

    const monthlyDirectoryPath = path.join(libraryRoot, monthlyDirectory.name);
    const assetDirectories = await readdir(monthlyDirectoryPath, { withFileTypes: true });

    for (const assetDirectory of assetDirectories) {
      if (!assetDirectory.isDirectory() || !assetNamePattern.test(assetDirectory.name)) {
        continue;
      }

      const assetDirectoryPath = path.join(monthlyDirectoryPath, assetDirectory.name);
      await rm(assetDirectoryPath, { recursive: true, force: true });
      console.log(`Removed stale ImgBin asset ${path.relative(projectRoot, assetDirectoryPath)}.`);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createPromptFile(achievement) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'hagicode-steam-achievement-'));
  const promptFile = path.join(tempDir, 'prompt.json');
  const displayName = achievement.displayName?.en ?? achievement.steamApiName;
  const promptDocument = {
    _comment: 'Generated by scripts/generate-steam-achievement-icons.mjs for ImgBin.',
    context: 'steam-achievement-icon',
    userPrompt: [
      achievement.icon.prompt,
      'Render as a polished square icon that remains recognizable at 64x64.',
      'Use a single centered emblem, thick readable shapes, balanced negative space, subtle rim light, and no text or watermark.',
      'The final source image will be resized to 256x256 PNG for Steamworks achievement icon upload.'
    ].join('\n\n'),
    generationParams: {
      size: '1024x1024',
      quality: 'high',
      format: 'png'
    },
    _metadata: {
      source: 'hagicode-index-steam-achievements',
      localId: achievement.localId,
      steamApiName: achievement.steamApiName,
      displayName,
      targetSize: '256x256'
    }
  };

  await writeFile(promptFile, `${JSON.stringify(promptDocument, null, 2)}\n`, 'utf8');
  return {
    promptFile,
    cleanup: async () => rm(tempDir, { recursive: true, force: true })
  };
}

async function generateOriginalWithImgBin(achievement, options) {
  const { promptFile, cleanup } = await createPromptFile(achievement);
  const slug = apiNameToIconBasename(achievement.steamApiName);

  try {
    const args = [
      imgbinCliPath,
      'generate',
      '--prompt-file',
      promptFile,
      '--output',
      libraryRoot,
      '--slug',
      slug,
      '--title',
      achievement.displayName.en,
      '--tag',
      'steam-achievement',
      '--tag',
      achievement.category
    ];

    if (options.dryRun) {
      args.push('--dry-run');
    }

    let result;
    for (let attempt = 1; attempt <= options.retries; attempt += 1) {
      result = await runProcess(process.execPath, args, {
        cwd: imgbinRoot,
        env: process.env
      });

      if (result.exitCode === 0 || attempt === options.retries) {
        break;
      }

      console.warn(`ImgBin attempt ${attempt}/${options.retries} failed for ${achievement.steamApiName}; retrying in ${options.retryDelayMs}ms.`);
      await sleep(options.retryDelayMs);
    }

    if (!result || result.exitCode !== 0) {
      throw new Error(`ImgBin failed for ${achievement.steamApiName}.`);
    }

    if (options.dryRun) {
      return null;
    }

    const combined = `${result.stdout}\n${result.stderr}`;
    const match = combined.match(generatedAssetPattern);
    if (!match) {
      throw new Error(`Unable to resolve generated ImgBin asset directory for ${achievement.steamApiName}.`);
    }

    return path.join(match[1].trim(), 'original.png');
  } finally {
    await cleanup();
  }
}

async function exportIcons(originalPath, achievedPath, lockedPath) {
  await mkdir(path.dirname(achievedPath), { recursive: true });

  await sharp(originalPath)
    .resize(256, 256, { fit: 'cover', position: 'center' })
    .png({ compressionLevel: 9 })
    .toFile(achievedPath);

  const lockOverlay = Buffer.from(`
    <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" fill="rgba(9,12,20,0.40)"/>
      <g transform="translate(90 88)" fill="none" stroke="rgba(235,240,250,0.88)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="48" width="68" height="58" rx="12" fill="rgba(18,24,38,0.60)"/>
        <path d="M18 48V31C18 14 31 4 38 4s20 10 20 27v17"/>
        <circle cx="38" cy="76" r="5" fill="rgba(235,240,250,0.92)" stroke="none"/>
      </g>
    </svg>
  `);

  await sharp(originalPath)
    .resize(256, 256, { fit: 'cover', position: 'center' })
    .grayscale()
    .modulate({ brightness: 0.58, saturation: 0.1 })
    .composite([{ input: lockOverlay, blend: 'over' }])
    .png({ compressionLevel: 9 })
    .toFile(lockedPath);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  let achievements = source.achievements;

  if (options.only.size > 0) {
    achievements = achievements.filter((achievement) => (
      options.only.has(achievement.localId) || options.only.has(achievement.steamApiName)
    ));
  }

  if (options.limit !== null) {
    achievements = achievements.slice(0, options.limit);
  }

  await mkdir(libraryRoot, { recursive: true });
  await mkdir(publicIconRoot, { recursive: true });

  for (const achievement of achievements) {
    const basename = apiNameToIconBasename(achievement.steamApiName);
    const assetSlug = apiNameToAssetSlug(achievement.steamApiName);
    const achievedPath = path.join(publicIconRoot, `${basename}.png`);
    const lockedPath = path.join(publicIconRoot, `${basename}_locked.png`);

    if (!options.force && await pathExists(achievedPath) && await pathExists(lockedPath)) {
      console.log(`Skipping ${achievement.steamApiName}; icons already exist.`);
      continue;
    }

    console.log(`Generating ${achievement.steamApiName} with ImgBin.`);
    if (options.force && !options.dryRun) {
      await removeExistingImgBinAssets(assetSlug);
    }

    const originalPath = await generateOriginalWithImgBin(achievement, options);

    if (options.dryRun || !originalPath) {
      continue;
    }

    await exportIcons(originalPath, achievedPath, lockedPath);
    console.log(`Exported ${path.relative(projectRoot, achievedPath)} and ${path.relative(projectRoot, lockedPath)}.`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
