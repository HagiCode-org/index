import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const defaultProjectRoot = path.resolve(scriptDir, '..');
export const agentPresetLibraryPath = path.join(defaultProjectRoot, 'src', 'data', 'agent-preset-library.json');
export const coreDungeonScriptKeys = ['proposal.generate', 'proposal.execute', 'proposal.archive'];
export const universalTemplateTag = 'universal';
const templateTagGroupKeys = ['languages', 'domains', 'roles'];
const supportedTemplateModes = ['curated', 'universal'];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sortUniqueStrings(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function countByTag(templates, selector) {
  const counts = {};

  for (const template of templates ?? []) {
    for (const value of selector(template)) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }

  return Object.fromEntries(
    Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
  );
}

function resolveProjectPath(projectRoot, ...segments) {
  return path.join(projectRoot, ...segments);
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function createReasonMap(entries = []) {
  return Object.fromEntries(entries.map((entry) => [entry.tag, entry.reason]));
}

function identifyCoverageGaps(coverage, priorityTags, reasons = {}) {
  return priorityTags
    .map((tag, index) => ({
      tag,
      count: coverage?.[tag] ?? 0,
      reason: reasons[tag] ?? '',
      priority: index + 1,
    }))
    .sort((left, right) => left.count - right.count || left.priority - right.priority)
    .map(({ priority, ...entry }) => entry);
}

function ensureArray(value, fieldName, { minLength = 0 } = {}) {
  assert(Array.isArray(value), `${fieldName} must be an array.`);
  assert(value.length >= minLength, `${fieldName} must contain at least ${minLength} entries.`);
  assert(
    value.every((entry) => typeof entry === 'string' && entry.trim().length > 0),
    `${fieldName} entries must be non-empty strings.`,
  );
}

function ensureFlatTagsContainGroupTags(tags, tagGroups, templateId) {
  const tagSet = new Set(tags);

  for (const [groupName, values] of Object.entries(tagGroups)) {
    for (const value of values) {
      assert(tagSet.has(value), `Character template ${templateId} tags must include ${groupName} value ${value}.`);
    }
  }
}

function buildTemplateIndex(templates) {
  return new Map((templates ?? []).map((template) => [template.id, template]));
}

function buildApplyScope(templateMode, templateId) {
  assert(
    supportedTemplateModes.includes(templateMode),
    `Character template ${templateId} templateMode ${templateMode} is not supported.`,
  );
  return templateMode === 'curated' ? ['soul', 'trait'] : ['soul'];
}

function buildTemplateTags(templateDefinition, tagGroups, templateMode) {
  return sortUniqueStrings([
    ...templateDefinition.styleTags,
    ...tagGroups.languages,
    ...tagGroups.domains,
    ...tagGroups.roles,
    ...(templateMode === universalTemplateTag ? [universalTemplateTag] : []),
  ]);
}

function assertNoIntersection(values, blockedValues, fieldName, templateId) {
  const blocked = values.filter((value) => blockedValues.has(value));
  assert(
    blocked.length === 0,
    `Character template ${templateId} ${fieldName} must not contain blocked values: ${blocked.join(', ')}.`,
  );
}

function assertSomeIntersection(values, allowedValues, fieldName, templateId) {
  if (allowedValues.size === 0) {
    return;
  }

  assert(
    values.some((value) => allowedValues.has(value)),
    `Character template ${templateId} ${fieldName} must contain at least one allowed value.`,
  );
}

function validatePersonalitySoul(template, templateId, filters) {
  assert(template, `Character template ${templateId} personality SOUL is required.`);
  assert(
    filters.allowedStyleTypes.includes(template.styleType),
    `Character template ${templateId} personality SOUL ${template.id} must use an allowed styleType.`,
  );
  assert(
    filters.preferredIds.includes(template.id),
    `Character template ${templateId} personality SOUL ${template.id} is not in the preferred personality set.`,
  );

  const roles = template.tagGroups?.roles ?? [];
  const languages = template.tagGroups?.languages ?? [];
  const domains = template.tagGroups?.domains ?? [];

  assertSomeIntersection(roles, new Set(filters.allowedRoles ?? []), 'personality roles', templateId);
  assertNoIntersection(roles, new Set(filters.blockedRoles ?? []), 'personality roles', templateId);
  assertNoIntersection(domains, new Set(filters.blockedDomains ?? []), 'personality domains', templateId);
  assertNoIntersection(languages, new Set(filters.blockedLanguages ?? []), 'personality languages', templateId);
}

function validateLanguageStyleSoul(template, templateId, filters) {
  assert(template, `Character template ${templateId} language-style SOUL is required.`);
  assert(
    filters.allowedStyleTypes.includes(template.styleType),
    `Character template ${templateId} language-style SOUL ${template.id} must use an allowed styleType.`,
  );
  assert(
    filters.preferredIds.includes(template.id),
    `Character template ${templateId} language-style SOUL ${template.id} is not in the preferred language-style set.`,
  );

  const roles = template.tagGroups?.roles ?? [];
  const languages = template.tagGroups?.languages ?? [];
  const domains = template.tagGroups?.domains ?? [];

  assertSomeIntersection(languages, new Set(filters.allowedLanguages ?? []), 'language-style languages', templateId);
  assertNoIntersection(languages, new Set(filters.blockedLanguages ?? []), 'language-style languages', templateId);
  assertNoIntersection(roles, new Set(filters.blockedRoles ?? []), 'language-style roles', templateId);
  assertNoIntersection(domains, new Set(filters.blockedDomains ?? []), 'language-style domains', templateId);
}

function validatePriorityCoverage(values, priorities, fieldName) {
  const valueSet = new Set(values);

  for (const priority of priorities ?? []) {
    assert(valueSet.has(priority), `Character template library must cover priority ${fieldName} ${priority}.`);
  }
}

function buildKnownTemplateTagGroups(templateMatrix = []) {
  const knownTagGroups = {
    languages: new Set(),
    domains: new Set(),
    roles: new Set(),
  };

  for (const templateDefinition of templateMatrix) {
    for (const groupKey of templateTagGroupKeys) {
      for (const tag of templateDefinition?.tagGroups?.[groupKey] ?? []) {
        knownTagGroups[groupKey].add(tag);
      }
    }
  }

  return knownTagGroups;
}

function normalizeDungeonBindingPresetSources(presetSources, knownTagGroups) {
  assert(Array.isArray(presetSources), 'dungeonBindingPresetSources must be an array.');

  const seenScriptKeys = new Set();

  return presetSources.map((presetSource, index) => {
    assert(presetSource && typeof presetSource === 'object', `dungeonBindingPresetSources[${index}] must be an object.`);
    const scriptKey = typeof presetSource.scriptKey === 'string' ? presetSource.scriptKey.trim() : '';
    assert(scriptKey.length > 0, `dungeonBindingPresetSources[${index}].scriptKey is required.`);
    assert(
      coreDungeonScriptKeys.includes(scriptKey),
      `dungeonBindingPresetSources[${index}] scriptKey ${scriptKey} is not supported.`,
    );
    assert(
      !seenScriptKeys.has(scriptKey),
      `dungeonBindingPresetSources contains duplicate scriptKey ${scriptKey}.`,
    );
    seenScriptKeys.add(scriptKey);

    const normalizedTagGroups = {};

    for (const groupKey of templateTagGroupKeys) {
      const fieldName = `dungeonBindingPresetSources[${index}].tagGroups.${groupKey}`;
      const entries = sortUniqueStrings(presetSource?.tagGroups?.[groupKey] ?? []);
      ensureArray(entries, fieldName);

      for (const tag of entries) {
        assert(
          knownTagGroups[groupKey].has(tag),
          `dungeonBindingPresetSources[${index}] references unknown ${groupKey} tag ${tag}.`,
        );
      }

      normalizedTagGroups[groupKey] = entries;
    }

    return {
      scriptKey,
      tagGroups: normalizedTagGroups,
    };
  });
}

function buildDungeonBindings(tagGroups, presetSources, templateId) {
  const bindings = presetSources.flatMap((presetSource) => {
    const matchedTags = sortUniqueStrings(
      templateTagGroupKeys.flatMap((groupKey) => {
        const sourceTags = new Set(presetSource.tagGroups[groupKey] ?? []);
        return (tagGroups[groupKey] ?? []).filter((tag) => sourceTags.has(tag));
      }),
    );

    if (matchedTags.length === 0) {
      return [];
    }

    return [{
      scriptKey: presetSource.scriptKey,
      matchedTags,
      matchedTagGroups: templateTagGroupKeys.filter((groupKey) =>
        (tagGroups[groupKey] ?? []).some((tag) => presetSource.tagGroups[groupKey].includes(tag))),
      priority: coreDungeonScriptKeys.indexOf(presetSource.scriptKey),
    }];
  });

  const seenScriptKeys = new Set();
  for (const binding of bindings) {
    assert(
      !seenScriptKeys.has(binding.scriptKey),
      `Character template ${templateId} generated duplicate dungeon binding for ${binding.scriptKey}.`,
    );
    seenScriptKeys.add(binding.scriptKey);
  }

  return bindings.sort(
    (left, right) => left.priority - right.priority || left.scriptKey.localeCompare(right.scriptKey),
  );
}

export async function loadAgentPresetLibrary(projectRoot = defaultProjectRoot) {
  return loadJson(resolveProjectPath(projectRoot, 'src', 'data', 'agent-preset-library.json'));
}

export async function loadPublishedTemplateIndexes(projectRoot = defaultProjectRoot) {
  const publicRoot = resolveProjectPath(projectRoot, 'public');
  const soulIndex = await loadJson(path.join(publicRoot, 'agent-templates', 'soul', 'index.json'));
  const traitIndex = await loadJson(path.join(publicRoot, 'agent-templates', 'trait', 'index.json'));
  const characterIndex = await loadJson(path.join(publicRoot, 'character-templates', 'index.json'));

  return {
    soulIndex,
    traitIndex,
    characterIndex,
  };
}

export function buildPublishedTemplateStats({ soulIndex, traitIndex, characterIndex }) {
  return {
    counts: {
      soulTemplates: soulIndex.templates.length,
      traitTemplates: traitIndex.templates.length,
      characterTemplates: characterIndex.templates.length,
    },
    soulCoverage: {
      domains: countByTag(soulIndex.templates, (template) => template.tagGroups?.domains ?? []),
      languages: countByTag(soulIndex.templates, (template) => template.tagGroups?.languages ?? []),
      roles: countByTag(soulIndex.templates, (template) => template.tagGroups?.roles ?? []),
    },
    traitCoverage: {
      domains: countByTag(traitIndex.templates, (template) => template.tagGroups?.domains ?? []),
      languages: countByTag(traitIndex.templates, (template) => template.tagGroups?.languages ?? []),
      roles: countByTag(traitIndex.templates, (template) => template.tagGroups?.roles ?? []),
    },
    characterCoverage: {
      domains: countByTag(characterIndex.templates, (template) => template.tagGroups?.domains ?? []),
      languages: countByTag(characterIndex.templates, (template) => template.tagGroups?.languages ?? []),
      roles: countByTag(characterIndex.templates, (template) => template.tagGroups?.roles ?? []),
    },
  };
}

export function buildCharacterTemplateLibrary({ libraryData, soulIndex, traitIndex }) {
  const soulTemplates = buildTemplateIndex(soulIndex.templates);
  const traitTemplates = buildTemplateIndex(traitIndex.templates);
  const knownTagGroups = buildKnownTemplateTagGroups(libraryData.templateMatrix);
  const dungeonBindingPresetSources = normalizeDungeonBindingPresetSources(
    libraryData.dungeonBindingPresetSources ?? [],
    knownTagGroups,
  );
  const summaries = [];
  const details = [];
  const seenIds = new Set();
  const seenNames = new Set();
  const seenCombos = new Set();

  assert(Array.isArray(libraryData.templateMatrix), 'templateMatrix must be an array.');
  assert(
    libraryData.templateMatrix.length >= libraryData.expansionTargets.minimumCharacterTemplates,
    `templateMatrix must contain at least ${libraryData.expansionTargets.minimumCharacterTemplates} templates.`,
  );

  for (const templateDefinition of libraryData.templateMatrix) {
    assert(typeof templateDefinition.id === 'string' && templateDefinition.id.trim().length > 0, 'Character template id is required.');
    assert(typeof templateDefinition.name === 'string' && templateDefinition.name.trim().length > 0, `Character template ${templateDefinition.id} name is required.`);
    assert(typeof templateDefinition.summary === 'string' && templateDefinition.summary.trim().length > 0, `Character template ${templateDefinition.id} summary is required.`);
    assert(!seenIds.has(templateDefinition.id), `Duplicate character template id ${templateDefinition.id}.`);
    assert(!seenNames.has(templateDefinition.name), `Duplicate character template name ${templateDefinition.name}.`);
    seenIds.add(templateDefinition.id);
    seenNames.add(templateDefinition.name);

    const templateMode = typeof templateDefinition.templateMode === 'string'
      ? templateDefinition.templateMode.trim()
      : '';
    const applyScope = buildApplyScope(templateMode, templateDefinition.id);

    ensureArray(templateDefinition.styleTags, `Character template ${templateDefinition.id} styleTags`, { minLength: 1 });
    ensureArray(templateDefinition.scenes, `Character template ${templateDefinition.id} scenes`, { minLength: 1 });
    const traitTemplateIds = templateDefinition.traitTemplateIds ?? [];
    ensureArray(
      traitTemplateIds,
      `Character template ${templateDefinition.id} traitTemplateIds`,
      { minLength: templateMode === 'curated' ? 1 : 0 },
    );
    if (templateMode === 'universal') {
      assert(
        traitTemplateIds.length === 0,
        `Character template ${templateDefinition.id} templateMode universal must not declare traitTemplateIds.`,
      );
    }

    const personalityId = templateDefinition.soulSelection?.personalityId;
    const languageStyleId = templateDefinition.soulSelection?.languageStyleId;
    assert(typeof personalityId === 'string' && personalityId.trim().length > 0, `Character template ${templateDefinition.id} soulSelection.personalityId is required.`);
    assert(typeof languageStyleId === 'string' && languageStyleId.trim().length > 0, `Character template ${templateDefinition.id} soulSelection.languageStyleId is required.`);

    const personalitySoul = soulTemplates.get(personalityId);
    const languageStyleSoul = soulTemplates.get(languageStyleId);
    validatePersonalitySoul(personalitySoul, templateDefinition.id, libraryData.soulFilters.personality);
    validateLanguageStyleSoul(languageStyleSoul, templateDefinition.id, libraryData.soulFilters.languageStyle);

    const uniqueTraitIds = sortUniqueStrings(traitTemplateIds);
    assert(
      uniqueTraitIds.length === traitTemplateIds.length,
      `Character template ${templateDefinition.id} traitTemplateIds must be unique.`,
    );

    for (const traitTemplateId of uniqueTraitIds) {
      assert(
        traitTemplates.has(traitTemplateId),
        `Character template ${templateDefinition.id} references unknown trait template ${traitTemplateId}.`,
      );
    }

    const comboKey = `${templateMode}__${personalityId}__${languageStyleId}__${uniqueTraitIds.join('__')}`;
    assert(!seenCombos.has(comboKey), `Duplicate character template combination ${templateDefinition.id}.`);
    seenCombos.add(comboKey);

    const tagGroups = {
      languages: sortUniqueStrings(templateDefinition.tagGroups.languages),
      domains: sortUniqueStrings(templateDefinition.tagGroups.domains),
      roles: sortUniqueStrings(templateDefinition.tagGroups.roles),
    };

    ensureArray(tagGroups.languages, `Character template ${templateDefinition.id} tagGroups.languages`, { minLength: 1 });
    ensureArray(tagGroups.domains, `Character template ${templateDefinition.id} tagGroups.domains`, { minLength: 1 });
    ensureArray(tagGroups.roles, `Character template ${templateDefinition.id} tagGroups.roles`, { minLength: 1 });

    const tags = buildTemplateTags(templateDefinition, tagGroups, templateMode);
    ensureFlatTagsContainGroupTags(tags, tagGroups, templateDefinition.id);
    const dungeonBindings = buildDungeonBindings(tagGroups, dungeonBindingPresetSources, templateDefinition.id);

    const detail = {
      id: templateDefinition.id,
      name: templateDefinition.name,
      summary: templateDefinition.summary,
      path: `/character-templates/templates/${templateDefinition.id}.json`,
      templateVersion: libraryData.templateVersion,
      templateMode,
      applyScope,
      tags,
      tagGroups,
      scenes: [...templateDefinition.scenes],
      sourceRepo: 'repos/index',
      sourceUrl: `https://github.com/HagiCode-org/site/tree/main/repos/index/public/character-templates/templates/${templateDefinition.id}.json`,
      soulSelection: {
        personalityId,
        languageStyleId,
      },
      soulTemplateIds: [personalityId, languageStyleId],
      traitTemplateIds: uniqueTraitIds,
      dungeonBindings,
    };

    details.push(detail);
    summaries.push({
      id: detail.id,
      name: detail.name,
      summary: detail.summary,
      path: detail.path,
      templateVersion: detail.templateVersion,
      templateMode: detail.templateMode,
      applyScope: detail.applyScope,
      tags: detail.tags,
      tagGroups: detail.tagGroups,
      scenes: detail.scenes,
      dungeonBindings: detail.dungeonBindings,
    });
  }

  const availableTagGroups = {
    languages: sortUniqueStrings(summaries.flatMap((template) => template.tagGroups.languages)),
    domains: sortUniqueStrings(summaries.flatMap((template) => template.tagGroups.domains)),
    roles: sortUniqueStrings(summaries.flatMap((template) => template.tagGroups.roles)),
  };

  validatePriorityCoverage(availableTagGroups.domains, libraryData.expansionTargets.priorityDomains, 'domain');
  validatePriorityCoverage(availableTagGroups.languages, libraryData.expansionTargets.priorityLanguages, 'language');
  validatePriorityCoverage(availableTagGroups.roles, libraryData.expansionTargets.priorityRoles, 'role');

  const gapPriorities = {
    domains: identifyCoverageGaps(
      libraryData.baseline.characterCoverageBeforeExpansion.domains,
      libraryData.expansionTargets.priorityDomains,
      createReasonMap(libraryData.gapPriorities.domains),
    ),
    languages: identifyCoverageGaps(
      libraryData.baseline.characterCoverageBeforeExpansion.languages,
      libraryData.expansionTargets.priorityLanguages,
      createReasonMap(libraryData.gapPriorities.languages),
    ),
    roles: identifyCoverageGaps(
      libraryData.baseline.characterCoverageBeforeExpansion.roles,
      libraryData.expansionTargets.priorityRoles,
      createReasonMap(libraryData.gapPriorities.roles),
    ),
  };

  return {
    manifest: {
      version: libraryData.version,
      generatedAt: libraryData.generatedAt,
      title: 'Character Templates',
      description: 'Count-driven character templates that publish curated SOUL-plus-Trait bundles and universal SOUL-only starting points for one-click Hero draft initialization.',
      availableTagGroups,
      templates: summaries,
    },
    details,
    gapPriorities,
  };
}

export async function writeCharacterTemplateLibrary(library, projectRoot = defaultProjectRoot) {
  const characterRoot = resolveProjectPath(projectRoot, 'public', 'character-templates');
  const templatesRoot = path.join(characterRoot, 'templates');

  await mkdir(templatesRoot, { recursive: true });
  await writeJson(path.join(characterRoot, 'index.json'), library.manifest);

  for (const detail of library.details) {
    await writeJson(path.join(templatesRoot, `${detail.id}.json`), detail);
  }
}

async function run() {
  const libraryData = await loadAgentPresetLibrary();
  const { soulIndex, traitIndex } = await loadPublishedTemplateIndexes();
  const library = buildCharacterTemplateLibrary({
    libraryData,
    soulIndex,
    traitIndex,
  });

  await writeCharacterTemplateLibrary(library);

  process.stdout.write(`Generated ${library.details.length} character templates at public/character-templates/index.json\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}
