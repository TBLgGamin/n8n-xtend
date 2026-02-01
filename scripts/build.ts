import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const isWatch = process.argv.includes('--watch');
const srcDir = join(import.meta.dir, '..', 'src');
const distDir = join(import.meta.dir, '..', 'dist');

async function build() {
  console.log('Building n8n-xtend...');

  // Clean dist directory
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  mkdirSync(distDir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [join(srcDir, 'index.ts')],
    outdir: distDir,
    naming: '[dir]/content.[ext]',
    target: 'browser',
    minify: !isWatch,
    sourcemap: isWatch ? 'external' : 'none',
    define: {
      __DEV__: String(isWatch),
    },
  });

  // Rename the output to content.js (Bun outputs to index.js by default)
  const outputPath = join(distDir, 'content.js');
  if (!existsSync(outputPath)) {
    const indexPath = join(distDir, 'index.js');
    if (existsSync(indexPath)) {
      const { renameSync } = await import('node:fs');
      renameSync(indexPath, outputPath);
    }
  }

  if (!result.success) {
    console.error('Build failed:');
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  const cssPath = join(srcDir, 'extensions', 'tree', 'styles', 'tree.css');
  let css = readFileSync(cssPath, 'utf-8');

  // Embed font as base64
  const fontPath = join(srcDir, 'fonts', 'n8n.woff2');
  if (existsSync(fontPath)) {
    const fontData = readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');
    css = css.replace(
      /url\(['"]?[^'"]*n8n-tree\.woff2['"]?\)/g,
      `url('data:font/woff2;base64,${fontBase64}')`
    );
  }

  // Write processed CSS
  writeFileSync(join(distDir, 'content.css'), css);

  // Copy manifest
  cpSync(join(srcDir, 'manifest.json'), join(distDir, 'manifest.json'));

  console.log('Build complete!');
}

if (isWatch) {
  const { watch } = await import('node:fs');

  console.log('Watching for changes...');

  // Initial build
  await build();

  // Watch for changes using Node's fs.watch
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  watch(srcDir, { recursive: true }, (_eventType, filename) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      console.log(`\nFile changed: ${filename}`);
      await build();
    }, 100);
  });

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\nStopping watch mode...');
    process.exit(0);
  });
} else {
  await build();
}
