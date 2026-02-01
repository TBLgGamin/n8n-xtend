import sharp from 'sharp';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const rootDir = join(import.meta.dir, '..');
const sourceIcon = join(rootDir, 'src', 'images', 'favicon-96x96.png');
const outputDir = join(rootDir, 'src', 'icons');

const sizes = [16, 48, 128];

async function generateIcons() {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating extension icons...');

  for (const size of sizes) {
    const outputPath = join(outputDir, `icon-${size}.png`);
    await sharp(sourceIcon).resize(size, size).png().toFile(outputPath);
    console.log(`  Created icon-${size}.png`);
  }

  console.log('Done!');
}

generateIcons();
