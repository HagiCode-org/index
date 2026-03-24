import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(scriptDir, '../../docs/public/presets');
const targetDir = path.resolve(scriptDir, '../public/presets');

await mkdir(path.dirname(targetDir), { recursive: true });
await cp(sourceDir, targetDir, { recursive: true, force: true });

console.log(`Synced presets from ${sourceDir} to ${targetDir}`);
