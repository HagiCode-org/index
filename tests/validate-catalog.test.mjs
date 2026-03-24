import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');

test('catalog validation script succeeds', async () => {
  const { stdout } = await execFileAsync('node', ['./scripts/validate-catalog.mjs'], {
    cwd: projectRoot,
  });

  assert.match(stdout, /Validated \d+ catalog entries\./);
});
