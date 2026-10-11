const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpegStartOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const jpegStandaloneMarkers = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8]);
const jpegEndOfImageMarker = 0xd9;

function readAscii(bytes, offset, length) {
  if (offset + length > bytes.length) {
    return '';
  }

  return bytes.toString('latin1', offset, offset + length);
}

function isAvif(bytes) {
  if (bytes.length < 16 || readAscii(bytes, 4, 4) !== 'ftyp') {
    return false;
  }

  const boxEnd = Math.min(bytes.readUInt32BE(0), bytes.length);
  const brands = [readAscii(bytes, 8, 4)];

  for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
    brands.push(readAscii(bytes, offset, 4));
  }

  return brands.some((brand) => brand === 'avif' || brand === 'avis');
}

export function detectImageType(bytes) {
  if (bytes.length >= pngSignature.length && bytes.subarray(0, pngSignature.length).equals(pngSignature)) {
    return 'png';
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  if (readAscii(bytes, 0, 4) === 'RIFF' && readAscii(bytes, 8, 4) === 'WEBP') {
    return 'webp';
  }

  if (isAvif(bytes)) {
    return 'avif';
  }

  return null;
}

function readPngDimensions(bytes) {
  if (bytes.length < 24 || readAscii(bytes, 12, 4) !== 'IHDR') {
    return null;
  }

  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function readJpegDimensions(bytes) {
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }

    const marker = bytes[offset + 1];

    if (marker === 0xff) {
      offset += 1;
      continue;
    }

    if (jpegStartOfFrameMarkers.has(marker)) {
      if (offset + 9 > bytes.length) {
        return null;
      }

      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }

    if (marker === jpegEndOfImageMarker) {
      return null;
    }

    if (jpegStandaloneMarkers.has(marker)) {
      offset += 2;
      continue;
    }

    offset += 2 + bytes.readUInt16BE(offset + 2);
  }

  return null;
}

function readWebpDimensions(bytes) {
  const chunk = readAscii(bytes, 12, 4);

  if (chunk === 'VP8 ' && bytes.length >= 30) {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      return null;
    }

    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }

  if (chunk === 'VP8L' && bytes.length >= 25) {
    if (bytes[20] !== 0x2f) {
      return null;
    }

    const packed = bytes.readUInt32LE(21);
    return { width: (packed & 0x3fff) + 1, height: ((packed >> 14) & 0x3fff) + 1 };
  }

  if (chunk === 'VP8X' && bytes.length >= 30) {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }

  return null;
}

function readAvifDimensions(bytes) {
  const ispeOffset = bytes.indexOf(Buffer.from('ispe', 'latin1'));

  if (ispeOffset < 4 || ispeOffset + 16 > bytes.length) {
    return null;
  }

  return { width: bytes.readUInt32BE(ispeOffset + 8), height: bytes.readUInt32BE(ispeOffset + 12) };
}

export function readImageDimensions(bytes) {
  switch (detectImageType(bytes)) {
    case 'png':
      return readPngDimensions(bytes);
    case 'jpeg':
      return readJpegDimensions(bytes);
    case 'webp':
      return readWebpDimensions(bytes);
    case 'avif':
      return readAvifDimensions(bytes);
    default:
      return null;
  }
}
