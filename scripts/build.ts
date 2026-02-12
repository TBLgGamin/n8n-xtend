import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, sep } from 'node:path';

const isWatch = process.argv.includes('--watch');
const isGenerateOnly = process.argv.includes('--generate-registry');
const rootDir = join(import.meta.dir, '..');
const srcDir = join(rootDir, 'src');
const distDir = join(rootDir, 'dist');
const extensionsDir = join(srcDir, 'extensions');

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
  permissions: string[];
  optional_host_permissions: string[];
  content_scripts: Array<{
    matches: string[];
    js: string[];
    css: string[];
    run_at: string;
  }>;
  background: {
    service_worker: string;
    type: string;
  };
  action: {
    default_popup: string;
    default_icon: Record<string, string>;
  };
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

function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function generateRegistry(): void {
  const glob = new Bun.Glob('*/*/index.ts');
  const extensionPaths = Array.from(glob.scanSync(extensionsDir)).sort();

  const typeImport = "import type { ExtensionEntry } from './types';";
  const imports: string[] = [];
  const entries: string[] = [];

  for (const extensionPath of extensionPaths) {
    const [group, name] = extensionPath.split('/') as [string, string];
    const alias = toCamelCase(name);
    const importPath = `./${group}/${name}`;

    imports.push(
      `import { init as ${alias}Init, metadata as ${alias}Metadata } from '${importPath}';`
    );
    entries.push(
      `  { ...${alias}Metadata, group: '${group}', init: ${alias}Init },`
    );
  }

  const content = [
    typeImport,
    '',
    ...imports,
    '',
    'export const extensionRegistry: ExtensionEntry[] = [',
    ...entries,
    '];',
    '',
  ].join('\n');

  const registryPath = join(extensionsDir, 'registry.ts');
  const existing = existsSync(registryPath)
    ? readFileSync(registryPath, 'utf-8')
    : '';

  if (existing !== content) {
    writeFileSync(registryPath, content);
    console.log('Registry updated.');
  }
}

function discoverCssFiles(): string[] {
  const glob = new Bun.Glob('**/*.css');
  const relativePaths = Array.from(glob.scanSync(srcDir)).sort();

  const variablesPath = ['shared', 'styles', 'variables.css'].join(sep);
  const popupPrefix = `popup${sep}`;
  const rest = relativePaths.filter(
    (p) => p !== variablesPath && !p.startsWith(popupPrefix),
  );

  return [
    join(srcDir, variablesPath),
    ...rest.map((p) => join(srcDir, p)),
  ];
}

function buildPopupCss(): string {
  const variablesPath = join(srcDir, 'shared', 'styles', 'variables.css');
  const popupCssPath = join(srcDir, 'popup', 'styles', 'popup.css');

  const parts: string[] = [];
  if (existsSync(variablesPath)) {
    parts.push(readFileSync(variablesPath, 'utf-8'));
  }
  if (existsSync(popupCssPath)) {
    parts.push(readFileSync(popupCssPath, 'utf-8'));
  }
  return parts.join('\n\n');
}

if (isGenerateOnly) {
  generateRegistry();
  process.exit(0);
}

async function build() {
  console.log('Building n8n-xtend...');

  generateRegistry();

  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  mkdirSync(distDir, { recursive: true });

  const contentResult = await Bun.build({
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

  if (!contentResult.success) {
    console.error('Content script build failed:');
    for (const log of contentResult.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  const backgroundResult = await Bun.build({
    entrypoints: [join(srcDir, 'background', 'index.ts')],
    outdir: distDir,
    naming: '[dir]/background.[ext]',
    target: 'browser',
    minify: !isWatch,
    sourcemap: isWatch ? 'external' : 'none',
  });

  const backgroundOutputPath = join(distDir, 'background.js');
  if (!existsSync(backgroundOutputPath)) {
    const bgIndexPath = join(distDir, 'index.js');
    if (existsSync(bgIndexPath)) {
      const { renameSync } = await import('node:fs');
      renameSync(bgIndexPath, backgroundOutputPath);
    }
  }

  if (!backgroundResult.success) {
    console.error('Background build failed:');
    for (const log of backgroundResult.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  const popupResult = await Bun.build({
    entrypoints: [join(srcDir, 'popup', 'index.ts')],
    outdir: distDir,
    naming: '[dir]/popup.[ext]',
    target: 'browser',
    minify: !isWatch,
    sourcemap: isWatch ? 'external' : 'none',
  });

  const popupOutputPath = join(distDir, 'popup.js');
  if (!existsSync(popupOutputPath)) {
    const popupIndexPath = join(distDir, 'index.js');
    if (existsSync(popupIndexPath)) {
      const { renameSync } = await import('node:fs');
      renameSync(popupIndexPath, popupOutputPath);
    }
  }

  if (!popupResult.success) {
    console.error('Popup build failed:');
    for (const log of popupResult.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  const cssPaths = discoverCssFiles();

  let css = cssPaths
    .filter((cssPath) => existsSync(cssPath))
    .map((cssPath) => readFileSync(cssPath, 'utf-8'))
    .join('\n\n');

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

  writeFileSync(join(distDir, 'popup.css'), buildPopupCss());

  copyFileSync(
    join(srcDir, 'popup', 'popup.html'),
    join(distDir, 'popup.html'),
  );

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

  await new Promise(() => {});
} else {
  await build();
}
