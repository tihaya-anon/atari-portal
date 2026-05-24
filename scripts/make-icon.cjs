const fs = require('fs');
const path = require('path');
const pngToIcoModule = require('png-to-ico');
const sharp = require('sharp');

const pngToIco = pngToIcoModule.default || pngToIcoModule;

const rootDir = path.join(__dirname, '..');
const source = path.join(rootDir, 'public', 'assets', 'icon.png');
const icoOutput = path.join(rootDir, 'public', 'assets', 'icon.ico');
const icnsOutput = path.join(rootDir, 'public', 'assets', 'icon.icns');
const tempDir = path.join(rootDir, 'node_modules', '.cache', 'atari-portal-icons');
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icnsEntries = [
  ['icp4', 16],
  ['icp5', 32],
  ['icp6', 64],
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
];

async function renderPng(size, name) {
  const file = path.join(tempDir, name);
  await sharp(source)
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
    })
    .png()
    .toFile(file);
  return file;
}

function makeIcns(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 8);
  const output = Buffer.alloc(totalLength);
  output.write('icns', 0, 4, 'ascii');
  output.writeUInt32BE(totalLength, 4);

  let offset = 8;
  chunks.forEach((chunk) => {
    chunk.copy(output, offset);
    offset += chunk.length;
  });

  return output;
}

function makeIcnsChunk(type, data) {
  const chunk = Buffer.alloc(8 + data.length);
  chunk.write(type, 0, 4, 'ascii');
  chunk.writeUInt32BE(chunk.length, 4);
  data.copy(chunk, 8);
  return chunk;
}

async function main() {
  if (!fs.existsSync(source)) {
    throw new Error(`Icon source not found: ${source}`);
  }

  await fs.promises.mkdir(tempDir, { recursive: true });

  const pngFiles = await Promise.all(
    icoSizes.map((size) => renderPng(size, `ico-${size}.png`)),
  );

  const ico = await pngToIco(pngFiles);
  await fs.promises.writeFile(icoOutput, ico);
  console.log(`Wrote ${path.relative(rootDir, icoOutput)}`);

  const icnsChunks = await Promise.all(
    icnsEntries.map(async ([type, size]) => {
      const file = await renderPng(size, `icns-${size}.png`);
      const data = await fs.promises.readFile(file);
      return makeIcnsChunk(type, data);
    }),
  );
  await fs.promises.writeFile(icnsOutput, makeIcns(icnsChunks));
  console.log(`Wrote ${path.relative(rootDir, icnsOutput)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
