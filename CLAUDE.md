# n8n-xtend Development Guidelines

## Overview

Chrome extension enhancing n8n workflow automation platform. Content script architecture with modular, toggleable extensions.

## Code Quality - MANDATORY

After EVERY code change, run:
```bash
bun run lint:fix && bun run typecheck
```

This is automated via Claude Code hooks but verify manually if needed.

## Code Style

### No Comments Policy
- NEVER add code comments
- Code must be self-documenting through:
  - Clear, descriptive function names
  - Meaningful variable names
  - Small, focused functions
  - TypeScript types as documentation

### Naming Conventions
- Functions: verb + noun (e.g., `fetchFolders`, `createWorkflowElement`)
- Booleans: is/has/should prefix (e.g., `isExpanded`, `hasChildren`)
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase

## Project Structure

```
src/
├── index.ts                    # Main entry - detects n8n host, loads extensions
├── manifest.json               # Chrome manifest v3
├── shared/
│   ├── api/
│   │   └── client.ts           # REST API client with retry logic (3 attempts, exponential backoff)
│   ├── types/
│   │   └── api.ts              # Folder, Workflow, TreeItem interfaces
│   ├── utils/
│   │   ├── database.ts         # IndexedDB via Dexie.js + in-memory cache
│   │   ├── storage.ts          # Storage abstraction (sync read, async write)
│   │   ├── monitor.ts          # PollMonitor, MutationMonitor, AdaptivePollMonitor
│   │   ├── theme.ts            # Theme detection (dark/light)
│   │   ├── theme-colors.ts     # Extract colors from n8n computed styles
│   │   ├── theme-manager.ts    # Manages n8n-xtend-dark class on html element
│   │   ├── url.ts              # URL parsing and page detection helpers
│   │   ├── dom.ts              # DOM query helpers
│   │   ├── html.ts             # HTML escaping (XSS prevention)
│   │   ├── validation.ts       # ID validation and object sanitization
│   │   └── logger.ts           # Hierarchical logging with levels
│   └── styles/
│       └── variables.css       # CSS variables (colors, spacing)
├── extensions/
│   ├── index.ts                # Exports all extension init functions
│   ├── ui/
│   │   ├── folder-tree/        # Collapsible tree navigation with drag-drop
│   │   │   ├── api/            # fetchFolders, fetchWorkflowProjectId, move operations
│   │   │   ├── components/     # folder.ts, workflow.ts element creation
│   │   │   ├── core/           # injector, monitor, tree, state, dragdrop, keyboard
│   │   │   ├── icons/          # SVG icons (chevron, folder, workflow)
│   │   │   └── styles/
│   │   ├── settings/           # Extension enable/disable panel at /settings/personal
│   │   │   ├── core/           # injector, monitor, storage
│   │   │   └── config.ts       # EXTENSIONS array with metadata
│   │   ├── show-password/      # Toggle password field visibility
│   │   │   ├── core/           # injector, monitor
│   │   │   └── icons/          # eye icons
│   │   └── variables/          # Auto-wrap {{ }} with click-to-copy
│   │       └── core/           # enhancer, monitor
│   └── enhancements/
│       └── capture/            # Export workflows as PNG/SVG
│           ├── core/           # injector, monitor
│           └── utils/          # capture.ts (modern-screenshot)
└── icons/                      # Extension icons (16, 48, 128)
```

## Architecture

### Extension System

Each extension follows this pattern:
1. Export `init*()` function from `extensions/index.ts`
2. Start a monitor that watches for activation conditions
3. Inject UI when conditions are met
4. Clean up on context change

Extensions are toggled via settings panel. Check `extensions/ui/settings/config.ts` for the EXTENSIONS array.

### Monitor Factories (`shared/utils/monitor.ts`)

Three reusable monitor types:

- **PollMonitor** - Simple interval polling. Use for: page detection, periodic checks
- **MutationMonitor** - DOM mutation observation. Use for: detecting new elements
- **AdaptivePollMonitor** - Speeds up when user active (100ms active, 250ms idle). Use for: responsive UI tracking

### Storage System

- **IndexedDB** via Dexie.js with in-memory cache
- Sync reads (`getStorageItem`), async writes (`setStorageItem`)
- Initialize with `initStorage()`, wait with `waitForStorage()`
- Keys: `n8n-xtend-settings`, `n8ntree-expanded`

### Theme System

- `getTheme()` returns `'dark' | 'light'`
- `ThemeManager` adds `n8n-xtend-dark` class to document
- `extractThemeColors()` gets colors from n8n computed styles
- CSS uses `.n8n-xtend-dark` selector for dark mode

### API Client (`shared/api/client.ts`)

- `request<T>(endpoint)` - GET with retry
- `patch<T>(endpoint, body)` - PATCH with retry
- Retry logic: 3 attempts, exponential backoff (1s, 2s)
- Retryable codes: 408, 429, 500, 502, 503, 504
- Includes `browser-id` header from localStorage

## Key Types (`shared/types/api.ts`)

```typescript
interface Folder { id, name, resource: 'folder', parentFolderId?, workflowCount?, subFolderCount? }
interface Workflow { id, name, resource?, versionId?, parentFolderId?, homeProject: { id } }
type TreeItem = Folder | Workflow
```

## Security Conventions

- **HTML escaping**: Always use `escapeHtml()` when interpolating dynamic text into innerHTML templates
- **ID validation**: Always call `isValidId()` before using IDs in URLs or API endpoints
- **URL encoding**: Always use `encodeURIComponent()` for IDs in constructed URLs (see `buildFolderUrl`, `buildWorkflowUrl`)
- **Object sanitization**: Always use `sanitizeObject()` when parsing JSON from untrusted sources (localStorage, drag events)
- **Origin validation**: API client validates `isN8nHost()` before sending credentialed requests

## Adding a New Extension

1. Create folder: `src/extensions/ui/your-extension/` or `src/extensions/enhancements/your-extension/`
2. Create `core/monitor.ts` - watch for activation conditions
3. Create `core/injector.ts` - inject UI into DOM
4. Create `index.ts` - export `initYourExtension()`
5. Add to `extensions/index.ts` exports
6. Add to `extensions/ui/settings/config.ts` EXTENSIONS array
7. Call from `src/index.ts` with `isExtensionEnabled()` check

## Commands

- `bun run build` - Production build (minified)
- `bun run dev` - Watch mode with source maps
- `bun run lint` - Check linting (Biome)
- `bun run lint:fix` - Fix linting issues
- `bun run typecheck` - TypeScript validation

## Git Workflow

### Custom Commands
- `/commit` - Create conventional commit with Husky hooks
- `/push` - Push commits to remote
- `/release` - Build, test, version bump, create GitHub release

### Committing Changes
Use `/commit` or run manually to trigger Husky pre-commit hooks:
```bash
git add <files>
git commit -m "message"
```

Pre-commit hooks automatically run linting and type checking.

### Releases

Use `/release` to create a new version. This will:
1. Build the extension
2. Wait for local testing confirmation
3. Update version in `package.json` and `CHANGELOG.md`
4. Create git tag and GitHub release with built extension

After releases, review and update `README.md` and `CONTRIBUTING.md` if needed.

#### CHANGELOG.md Format
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing features

### Fixed
- Bug fixes

### Removed
- Removed features
```

## Build System (`scripts/build.ts`)

1. Cleans `dist/` directory
2. Bundles `src/index.ts` with Bun (target: browser)
3. Combines CSS files, embeds fonts as base64
4. Generates manifest.json with version from package.json
5. Copies icons
6. Watch mode: debounced rebuild on changes

## Dependencies

- `dexie` - IndexedDB wrapper
- `modern-screenshot` - DOM to PNG/SVG capture
- `@biomejs/biome` - Linting/formatting
- `typescript` - Type checking
- `husky` - Git hooks
