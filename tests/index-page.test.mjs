import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const projectRoot = path.resolve(import.meta.dirname, '..');
const publishedRoot = path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist');

test('homepage renders the portal shell and canonical site destinations from /sites.json', async () => {
  const homepage = await readFile(path.join(publishedRoot, 'index.html'), 'utf8');
  const sitesCatalog = JSON.parse(await readFile(path.join(publishedRoot, 'sites.json'), 'utf8'));

  assert.match(homepage, /HagiCode 站点导航门户/);
  assert.match(homepage, /打开数据页/);
  assert.match(homepage, /站点清单 JSON/);
  assert.match(homepage, /查看目录 JSON/);
  assert.match(homepage, /稳定入口/);
  assert.match(homepage, /门户与镜像/);
  assert.match(homepage, /Promoto 展示台/);
  assert.match(homepage, /Steam 成就页面/);
  assert.match(homepage, /\/steam\/achievements\//);
  assert.match(homepage, /Steam 成就 JSON/);
  assert.match(homepage, /\/steam\/achievements\.json/);
  assert.doesNotMatch(homepage, /联系与社区/);
  assert.doesNotMatch(homepage, /打开 about JSON/);

  for (const entry of sitesCatalog.entries) {
    assert.match(homepage, new RegExp(entry.title['zh-CN'].replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
    assert.match(homepage, new RegExp(entry.url.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
  }
});

test('promoto page renders localized review labels and stable JSON links', async () => {
  const promotoPage = await readFile(path.join(publishedRoot, 'promoto', 'index.html'), 'utf8');

  assert.match(promotoPage, /HagiCode Promoto Showcase/);
  assert.match(promotoPage, /Promoto 内容展示台/);
  assert.match(promotoPage, /按平台筛选/);
  assert.match(promotoPage, /按数据质量筛选/);
  assert.match(promotoPage, /当前查看语言/);
  assert.match(promotoPage, /在 29 种桌面端语言之间切换卡片正文/);
  assert.match(promotoPage, /name="promoto-locale"/);
  assert.match(promotoPage, /当前显示 4 \/ 4 条 Promoto 内容/);
  assert.match(promotoPage, /当前语言：简体中文（zh-CN）/);
  assert.match(promotoPage, /data-selected-locale="zh-CN"/);
  assert.match(promotoPage, /data-promoto-selected-locale/);
  assert.match(promotoPage, /查看 JSON/);
  assert.match(promotoPage, /\/promote\.json/);
  assert.match(promotoPage, /\/promote_content\.json/);
  assert.doesNotMatch(promotoPage, /promoto-locale-grid/);
  assert.doesNotMatch(promotoPage, /promoto-locale-panel/);
});

test('promoto page script restores validated locale selection and reruns the showcase update loop', async () => {
  const promotoPage = await readFile(path.join(publishedRoot, 'promoto', 'index.html'), 'utf8');

  assert.match(promotoPage, /hagicode\.promoto\.selected-locale/);
  assert.match(promotoPage, /const validateLocale = \(value\) => \(supportedLocales\.has\(value\) \? value : defaultLocale\);/);
  assert.match(promotoPage, /const readStoredLocale = \(\) =>/);
  assert.match(promotoPage, /sessionStorage\.getItem\(storageKey\)/);
  assert.match(promotoPage, /persistSelectedLocale\(nextLocale\);/);
  assert.match(promotoPage, /applySelectedLocale\(nextLocale\);/);
  assert.match(promotoPage, /updateShowcase\(\);/);
});
