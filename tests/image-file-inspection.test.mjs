import test from 'node:test';
import assert from 'node:assert/strict';
import { detectImageType, readImageDimensions } from '../scripts/image-file-inspection.mjs';
import { buildAvifBytes, buildPngBytes, buildWebpBytes } from './helpers/image-fixtures.mjs';

function buildJpegBytes({ width, height }) {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03]);
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  return bytes;
}

test('detectImageType identifies PNG, JPEG, WebP and AVIF headers', () => {
  assert.equal(detectImageType(buildPngBytes({ width: 1, height: 1 })), 'png');
  assert.equal(detectImageType(buildJpegBytes({ width: 1, height: 1 })), 'jpeg');
  assert.equal(detectImageType(buildWebpBytes({ width: 1, height: 1 })), 'webp');
  assert.equal(detectImageType(buildAvifBytes({ width: 1, height: 1 })), 'avif');
  assert.equal(detectImageType(Buffer.from('not an image at all')), null);
  assert.equal(detectImageType(Buffer.alloc(0)), null);
});

test('readImageDimensions reads width and height from each supported header', () => {
  assert.deepEqual(readImageDimensions(buildPngBytes({ width: 1232, height: 706 })), { width: 1232, height: 706 });
  assert.deepEqual(readImageDimensions(buildJpegBytes({ width: 640, height: 480 })), { width: 640, height: 480 });
  assert.deepEqual(readImageDimensions(buildWebpBytes({ width: 1280, height: 720 })), { width: 1280, height: 720 });
  assert.deepEqual(readImageDimensions(buildWebpBytes({ width: 16384, height: 1 })), { width: 16384, height: 1 });
  assert.deepEqual(readImageDimensions(buildAvifBytes({ width: 1920, height: 1080 })), { width: 1920, height: 1080 });
});

test('readImageDimensions returns null when a header is truncated or unreadable', () => {
  assert.equal(readImageDimensions(buildPngBytes({ width: 1232, height: 706 }).subarray(0, 20)), null);
  assert.equal(readImageDimensions(buildJpegBytes({ width: 640, height: 480 }).subarray(0, 8)), null);
  assert.equal(readImageDimensions(buildWebpBytes({ width: 1280, height: 720 }).subarray(0, 24)), null);
  assert.equal(readImageDimensions(buildAvifBytes({ width: 1920, height: 1080 }).subarray(0, 60)), null);
  assert.equal(readImageDimensions(Buffer.from('not an image at all')), null);
});
