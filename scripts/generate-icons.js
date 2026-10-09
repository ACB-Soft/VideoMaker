import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const c = crc32(typeAndData);
  chunk.writeUInt32BE(c, 8 + len);
  return chunk;
}

function generatePngBuffer(width, height, isMaskable = false) {
  const rowBytes = width * 4 + 1; // 1 filter byte per row
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.42 : width * 0.46;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient (Instagram style: purple to warm orange-pink)
      const gradT = (x + y) / (width + height);
      let r = Math.round(240 * (1 - gradT) + 188 * gradT);
      let g = Math.round(148 * (1 - gradT) + 24 * gradT);
      let b = Math.round(51 * (1 - gradT) + 136 * gradT);
      let a = 255;

      // Dark background rounded box
      const cornerRadius = width * 0.22;
      const qx = Math.max(0, Math.abs(dx) - (width * 0.46 - cornerRadius));
      const qy = Math.max(0, Math.abs(dy) - (height * 0.46 - cornerRadius));
      const boxDist = Math.sqrt(qx * qx + qy * qy);

      if (boxDist > cornerRadius && !isMaskable) {
        // Transparent outside rounded squircle
        a = 0;
      }

      // Draw camera outline & play icon inside
      const camInnerR = width * 0.28;
      const camOuterR = width * 0.32;
      if (Math.abs(dx) < camInnerR && Math.abs(dy) < camInnerR) {
        // Inner squircle
        const lensDist = Math.sqrt(dx * dx + dy * dy);
        if (lensDist > width * 0.12 && lensDist < width * 0.17) {
          // Lens ring (white)
          r = 255; g = 255; b = 255; a = 255;
        } else if (lensDist <= width * 0.12) {
          // Inside lens: dark slate
          r = 20; g = 25; b = 40; a = 255;
          // Play triangle inside: x from -0.03 to +0.05, y from -0.04 to +0.04
          const tx = dx / width;
          const ty = dy / width;
          if (tx >= -0.03 && tx <= 0.05 && Math.abs(ty) <= (0.05 - tx) * 0.6) {
            r = 255; g = 255; b = 255; a = 255;
          }
        }
      }

      // Camera top-right flash dot
      const flashDx = dx - width * 0.2;
      const flashDy = dy + width * 0.2;
      if (Math.sqrt(flashDx * flashDx + flashDy * flashDy) < width * 0.035) {
        r = 255; g = 255; b = 255; a = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace: None

  const compressedData = zlib.deflateSync(rawData);
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePngBuffer(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePngBuffer(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePngBuffer(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePngBuffer(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePngBuffer(32, 32, false));

console.log('Successfully generated all PWA icons!');
