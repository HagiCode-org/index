import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const maxDimension = 16384;
const defaultByteLengths = { png: 4096, webp: 2048, avif: 1024 };

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

function assertDimensions(width, height) {
  for (const value of [width, height]) {
    if (!Number.isInteger(value) || value < 1 || value > maxDimension) {
      throw new RangeError(`Image dimension ${value} must be an integer from 1 to ${maxDimension}.`);
    }
  }
}

function padToByteLength(header, byteLength) {
  if (byteLength < header.length) {
    throw new RangeError(`byteLength ${byteLength} is shorter than the ${header.length}-byte header.`);
  }

  return Buffer.concat([header, Buffer.alloc(byteLength - header.length)]);
}

function buildBox(type, ...payloads) {
  const body = Buffer.concat(payloads);
  const header = Buffer.concat([uint32(body.length + 8), Buffer.from(type, 'latin1')]);

  return Buffer.concat([header, body]);
}

export function buildPngBytes({ width, height, byteLength = defaultByteLengths.png } = {}) {
  assertDimensions(width, height);

  const header = Buffer.concat([
    pngSignature,
    uint32(13),
    Buffer.from('IHDR', 'latin1'),
    uint32(width),
    uint32(height),
    Buffer.from([8, 6, 0, 0, 0]),
    uint32(0),
  ]);

  return padToByteLength(header, byteLength);
}

export function buildWebpBytes({ width, height, byteLength = defaultByteLengths.webp } = {}) {
  assertDimensions(width, height);

  const header = Buffer.alloc(25);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(byteLength - 8, 4);
  header.write('WEBP', 8, 'latin1');
  header.write('VP8L', 12, 'latin1');
  header.writeUInt32LE(5, 16);
  header[20] = 0x2f;
  header.writeUInt32LE(((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14), 21);

  return padToByteLength(header, byteLength);
}

export function buildAvifBytes({ width, height, byteLength = defaultByteLengths.avif } = {}) {
  assertDimensions(width, height);

  const ftyp = buildBox('ftyp', Buffer.from('avif', 'latin1'), uint32(0), Buffer.from('avif', 'latin1'));
  const ispe = buildBox('ispe', uint32(0), uint32(width), uint32(height));
  const meta = buildBox('meta', uint32(0), buildBox('iprp', buildBox('ipco', ispe)));
  const header = Buffer.concat([ftyp, meta]);

  if (byteLength < header.length + 8) {
    throw new RangeError(`byteLength ${byteLength} is shorter than the ${header.length + 8}-byte header.`);
  }

  return Buffer.concat([header, buildBox('free', Buffer.alloc(byteLength - header.length - 8))]);
}

const builders = { png: buildPngBytes, webp: buildWebpBytes, avif: buildAvifBytes };

export function buildImageFixtureBytes(format, options) {
  return builders[format](options);
}

export async function writeImageFixtureFile(publishedRoot, { src, format, width, height, byteLength }) {
  const filePath = path.join(publishedRoot, src.replace(/^\//, ''));

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buildImageFixtureBytes(format, { width, height, byteLength }));
}
