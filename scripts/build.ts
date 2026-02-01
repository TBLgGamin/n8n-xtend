import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const isWatch = process.argv.includes('--watch');
const rootDir = join(import.meta.dir, '..');
const srcDir = join(rootDir, 'src');
const distDir = join(rootDir, 'dist');

function getVersionFromPackageJson(): string {
  const packageJson = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf-8')
  );
  return packageJson.version;
}

interface Manifest {
  manifest_version: number;
  name: string;
  version: string;
  description: string;
  icons: Record<string, string>;
  content_scripts: Array<{
    matches: string[];
    js: string[];
    css: string[];
    run_at: string;
  }>;
}

function generateManifest(): Manifest {
  const sourceManifest = JSON.parse(
    readFileSync(join(srcDir, 'manifest.json'), 'utf-8')
  );

  return {
    ...sourceManifest,
    version: getVersionFromPackageJson(),
    icons: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  };
}

async function build() {
  console.log('Building n8n-xtend...');

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

  const treeCssPath = join(srcDir, 'extensions', 'tree', 'styles', 'tree.css');
  let css = readFileSync(treeCssPath, 'utf-8');

  const fontPath = join(srcDir, 'fonts', 'n8n.woff2');
  if (existsSync(fontPath)) {
    const fontData = readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');
    css = css.replace(
      /url\(['"]?[^'"]*n8n-tree\.woff2['"]?\)/g,
      `url('data:font/woff2;base64,${fontBase64}')`
    );
  }

  writeFileSync(join(distDir, 'content.css'), css);

  const manifest = generateManifest();
  writeFileSync(join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const iconsDir = join(distDir, 'icons');
  mkdirSync(iconsDir, { recursive: true });

  const srcIconsDir = join(srcDir, 'icons');
  if (existsSync(srcIconsDir)) {
    cpSync(srcIconsDir, iconsDir, { recursive: true });
  }

  console.log(`Build complete! (v${manifest.version})`);
}

if (isWatch) {
  const { watch } = await import('node:fs');

  console.log('Watching for changes...');

  await build();

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

  process.on('SIGINT', () => {
    console.log('\nStopping watch mode...');
    process.exit(0);
  });
} else {
  await build();
}
