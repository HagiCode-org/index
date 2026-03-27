import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCharacterTemplateLibrary,
  buildPublishedTemplateStats,
  loadAgentPresetLibrary,
  loadPublishedTemplateIndexes,
} from '../scripts/build-agent-preset-library.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');

async function loadCurrentLibrary() {
  const libraryData = await loadAgentPresetLibrary(projectRoot);
  const indexes = await loadPublishedTemplateIndexes(projectRoot);
  const library = buildCharacterTemplateLibrary({
    libraryData,
    soulIndex: indexes.soulIndex,
    traitIndex: indexes.traitIndex,
  });

  return {
    libraryData,
    indexes,
    library,
  };
}

test('published template stats reflect the expanded current counts', async () => {
  const { indexes } = await loadCurrentLibrary();
  const stats = buildPublishedTemplateStats(indexes);

  assert.deepEqual(stats.counts, {
    soulTemplates: 61,
    traitTemplates: 307,
    characterTemplates: 11,
  });
  assert.equal(stats.characterCoverage.domains.backend, 5);
  assert.equal(stats.characterCoverage.domains.mobile, 1);
  assert.equal(stats.characterCoverage.roles.architect, 3);
});

test('gap priorities remain focused on the pre-expansion zero and low coverage matrix', async () => {
  const { library } = await loadCurrentLibrary();

  assert.deepEqual(
    library.gapPriorities.domains.slice(0, 4).map((entry) => entry.tag),
    ['backend', 'mobile', 'architecture', 'security'],
  );
  assert.deepEqual(
    library.gapPriorities.languages.slice(0, 5).map((entry) => entry.tag),
    ['vue', 'java', 'python', 'csharp', 'dart'],
  );
  assert.deepEqual(
    library.gapPriorities.roles.map((entry) => entry.tag),
    ['architect', 'developer', 'reviewer', 'engineer'],
  );
});

test('generated library keeps the expected template count and priority coverage', async () => {
  const { library } = await loadCurrentLibrary();

  assert.equal(library.details.length, 11);
  assert.deepEqual(library.manifest.availableTagGroups.roles, ['architect', 'developer', 'engineer', 'reviewer']);
  assert.deepEqual(
    library.manifest.availableTagGroups.domains,
    ['architecture', 'automation', 'backend', 'devops', 'frontend', 'mobile', 'security', 'testing'],
  );
  assert.deepEqual(
    library.manifest.availableTagGroups.languages,
    ['bash', 'csharp', 'dart', 'go', 'java', 'javascript', 'kotlin', 'python', 'react', 'sql', 'swift', 'typescript', 'vue'],
  );
  assert(
    library.details.every(
      (detail) =>
        detail.soulSelection.personalityId === 'soul-main-12-aloof-ace-scholar'
        && detail.soulSelection.languageStyleId === 'soul-orth-11-classical-chinese-ultra-minimal-mode',
    ),
  );
  assert(
    library.manifest.templates.every((template) => ['curated', 'universal'].includes(template.templateMode)),
  );
  assert(
    library.manifest.templates.every((template) =>
      template.dungeonBindings.every((binding, index, bindings) => (
        ['proposal-generate', 'proposal-execute', 'proposal-archive'].includes(binding.scriptKey)
        && binding.priority === index
        && bindings.findIndex((candidate) => candidate.scriptKey === binding.scriptKey) === index
      ))),
  );
});

test('universal character templates publish soul-only apply scope in manifest and detail payloads', async () => {
  const { library } = await loadCurrentLibrary();
  const summary = library.manifest.templates.find((template) => template.id === 'character-cold-scholar-universal-template');
  const detail = library.details.find((template) => template.id === 'character-cold-scholar-universal-template');

  assert.equal(summary?.templateMode, 'universal');
  assert.deepEqual(summary?.applyScope, ['soul']);
  assert.equal(detail?.templateMode, 'universal');
  assert.deepEqual(detail?.applyScope, ['soul']);
  assert.deepEqual(detail?.traitTemplateIds, []);
  assert.deepEqual(detail?.soulTemplateIds, [
    'soul-main-12-aloof-ace-scholar',
    'soul-orth-11-classical-chinese-ultra-minimal-mode',
  ]);
});

test('published character templates expose stable core-flow bindings in summaries and details', async () => {
  const { library } = await loadCurrentLibrary();
  const reactEngineer = library.manifest.templates.find((template) => template.id === 'character-cold-scholar-react-engineer');
  const reactEngineerDetail = library.details.find((template) => template.id === 'character-cold-scholar-react-engineer');

  assert.deepEqual(
    reactEngineer?.dungeonBindings.map((binding) => binding.scriptKey),
    ['proposal-generate', 'proposal-execute', 'proposal-archive'],
  );
  assert.deepEqual(reactEngineerDetail?.dungeonBindings, reactEngineer?.dungeonBindings);
  assert.deepEqual(
    reactEngineer?.dungeonBindings[0]?.matchedTags.includes('react'),
    true,
  );
});

test('duplicate character combinations are rejected', async () => {
  const { libraryData, indexes } = await loadCurrentLibrary();
  const duplicated = structuredClone(libraryData);

  duplicated.templateMatrix.push({
    ...duplicated.templateMatrix[0],
    id: 'character-duplicate-react-engineer',
    name: 'Duplicate React Engineer',
    summary: 'Duplicate summary',
  });

  assert.throws(
    () => buildCharacterTemplateLibrary({
      libraryData: duplicated,
      soulIndex: indexes.soulIndex,
      traitIndex: indexes.traitIndex,
    }),
    /Duplicate character template combination character-duplicate-react-engineer\./,
  );
});

test('universal character templates reject non-empty trait bindings', async () => {
  const { libraryData, indexes } = await loadCurrentLibrary();
  const invalid = structuredClone(libraryData);
  const universalTemplate = invalid.templateMatrix.find((template) => template.id === 'character-cold-scholar-universal-template');

  universalTemplate.traitTemplateIds = ['01-core-development-frontend-developer'];

  assert.throws(
    () => buildCharacterTemplateLibrary({
      libraryData: invalid,
      soulIndex: indexes.soulIndex,
      traitIndex: indexes.traitIndex,
    }),
    /templateMode universal must not declare traitTemplateIds\./,
  );
});
