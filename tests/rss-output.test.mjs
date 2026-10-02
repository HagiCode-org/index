import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const projectRoot = path.resolve(import.meta.dirname, '..');
const publishedRoot = path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist');

function assertEmptyFeed(xml) {
  assert.match(xml, /^<\?xml/u);
  const channel = xml.match(/<channel>([\s\S]*?)<\/channel>/u)?.[1];
  assert.ok(channel, 'RSS feed has a channel');
  assert.match(channel, /<title>[^<]+<\/title>/u);
  assert.match(channel, /<description>[^<]+<\/description>/u);
  assert.match(channel, /<language>en<\/language>/u);
  assert.match(channel, /<link>https:\/\/index\.hagicode\.com\/<\/link>/u);
  assert.doesNotMatch(xml, /<item>/u);
}

test('the built-in root and English feeds are valid empty RSS linked by the shared footer', async () => {
  const [rootFeed, englishAlias, homepage] = await Promise.all([
    readFile(path.join(publishedRoot, 'rss.xml'), 'utf8'),
    readFile(path.join(publishedRoot, 'rss.en.xml'), 'utf8'),
    readFile(path.join(publishedRoot, 'index.html'), 'utf8'),
  ]);

  assertEmptyFeed(rootFeed);
  assertEmptyFeed(englishAlias);
  assert.equal(rootFeed, englishAlias);
  assert.ok(homepage.includes('https://index.hagicode.com/rss.xml'));
  assert.ok(homepage.includes('https://index.hagicode.com/rss.xml'));
});
