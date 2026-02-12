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
- Constants: UPPER_SNAKE_CASE for primitives/enums only; use camelCase for arrays/objects (e.g., `extensionRegistry`)
- Types/Interfaces: PascalCase

## Project Structure

```
src/
├── index.ts                    # Content script entry - detects n8n host, loops over registry
├── manifest.json               # Chrome manifest v3
├── background/                 # Service worker (manages dynamic content script registration)
│   ├── index.ts                # onInstalled, onStartup, message handling
│   └── types.ts                # MessageRequest/Response types, storage key, script ID
├── popup/                      # Extension popup (manage self-hosted instance permissions)
│   ├── index.ts                # Origin add/remove UI logic, permission requests
│   ├── popup.html              # Popup page markup
│   └── styles/
│       └── popup.css           # Popup-specific styles (built separately from content CSS)
├── settings/                   # Extension manager (settings panel at /settings/personal)
│   ├── index.ts                # initSettingsExtension(), isExtensionEnabled()
│   ├── core/
│   │   ├── injector.ts         # Settings panel DOM injection
│   │   ├── monitor.ts          # PollMonitor for settings page detection
│   │   └── storage.ts          # Extension enable/disable persistence
│   └── styles/
│       └── settings.css
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
│   │   ├── theme-colors.ts     # Light/dark color palettes
│   │   ├── theme-manager.ts    # Manages n8n-xtend-dark class on html element
│   │   ├── url.ts              # URL parsing and page detection helpers
│   │   ├── dom.ts              # DOM query helpers
│   │   ├── html.ts             # HTML escaping (XSS prevention)
│   │   ├── validation.ts       # ID validation and object sanitization
│   │   └── logger.ts           # Hierarchical logging with levels
│   └── styles/
│       └── variables.css       # CSS variables (colors, spacing)
├── extensions/
│   ├── index.ts                # Re-exports registry and types
│   ├── registry.ts             # Assembles extensions from co-located metadata
│   ├── types.ts                # ExtensionMetadata, ExtensionEntry interfaces
│   ├── sidebar/                # Sidebar/navigation extensions
│   │   └── folder-tree/        # Collapsible tree navigation with drag-drop
│   │       ├── api/            # fetchFolders, fetchWorkflowProjectId, move operations
│   │       ├── components/     # folder.ts, workflow.ts element creation
│   │       ├── core/           # injector, monitor, tree, state, dragdrop
│   │       ├── icons/          # SVG icons (chevron, folder, workflow)
│   │       └── styles/
│   ├── editor/                 # Workflow canvas extensions
│   │   ├── capture/            # Export workflows as PNG/SVG
│   │   │   ├── core/           # injector, monitor
│   │   │   └── utils/          # capture.ts (modern-screenshot)
│   │   └── note-title/         # Rename sticky note titles with Space shortcut
│   │       └── core/           # injector (keyboard listener + rename modal), monitor
│   └── ui/                     # UI enhancement extensions
│       ├── show-password/      # Toggle password field visibility
│       │   ├── core/           # injector, monitor
│       │   └── icons/          # eye icons
│       └── variables/          # Auto-wrap {{ }} with click-to-copy
│           └── core/           # enhancer, monitor
└── icons/                      # Extension icons (16, 48, 128)
```

## Architecture

### Permission Model

The extension uses narrow permissions instead of broad host access:

- **n8n Cloud** (`*.n8n.cloud`) — Static content script, works automatically
- **Self-hosted** — Users add their instance URL via the popup, which triggers `chrome.permissions.request()`. The background service worker then registers a dynamic content script for that origin via `chrome.scripting.registerContentScripts()`
- Origins are persisted in `chrome.storage.sync` and re-registered on install/update/startup
- `isN8nHost()` in the content script remains as defense-in-depth

Three entry points are built separately:

| Entry Point | Output | Role |
|-------------|--------|------|
| `src/index.ts` | `content.js` | Content script (injected into n8n pages) |
| `src/background/index.ts` | `background.js` | Service worker (dynamic script registration) |
| `src/popup/index.ts` | `popup.js` | Popup UI (manage self-hosted permissions) |

### Extension System

Each extension is self-contained with co-located metadata:

```typescript
// extensions/ui/your-extension/index.ts
export const metadata: ExtensionMetadata = {
  id: 'your-extension',
  name: 'Your Extension',
  description: 'What it does',
  enabledByDefault: true,
};

export function initYourExtension(): void {
  startMonitor();
}
```

The registry (`extensions/registry.ts`) assembles all extensions with their group (derived from folder path) and init function. `src/index.ts` loops over the registry — no per-extension wiring needed there.

Settings panel (`src/settings/`) manages enable/disable toggles. It reads from the registry, not a separate config.

### Monitor Factories (`shared/utils/monitor.ts`)

Three reusable monitor types:

- **PollMonitor** - Simple interval polling. Use for: page detection, periodic checks
- **MutationMonitor** - DOM mutation observation. Use for: detecting new elements
- **AdaptivePollMonitor** - Speeds up when user active (100ms active, 250ms idle). Use for: responsive UI tracking

### Storage System

- **IndexedDB** via Dexie.js with in-memory cache (content script data)
- Sync reads (`getStorageItem`), async writes (`setStorageItem`)
- Initialize with `initStorage()`, wait with `waitForStorage()`
- Keys: `n8n-xtend-settings`, `n8ntree-expanded`
- **chrome.storage.sync** for self-hosted origins (background/popup), key: `n8n-xtend-origins`

### Theme System

- `getCurrentTheme()` returns `'dark' | 'light'`
- `ThemeManager` adds `n8n-xtend-dark` class to document
- `getThemeColors()` returns light/dark color palette
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

1. Create folder: `src/extensions/sidebar/`, `src/extensions/editor/`, or `src/extensions/ui/`
2. Create `core/monitor.ts` - watch for activation conditions
3. Create `core/injector.ts` - inject UI into DOM
4. Create `index.ts` - export `metadata` (ExtensionMetadata) and `initYourExtension()`
5. Add entry to `extensions/registry.ts` with group and init function

That's it. No need to touch `src/index.ts` or any config file.

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
2. Auto-generates `extensions/registry.ts` from discovered extensions
3. Bundles three entry points: content script, background service worker, popup script
4. Combines content CSS files (excludes `popup/**/*.css`), embeds fonts as base64
5. Builds popup CSS separately (`variables.css` + `popup/styles/popup.css`)
6. Copies `popup.html` and icons to `dist/`
7. Generates `manifest.json` with version from `package.json`
8. Watch mode: debounced rebuild on changes

### Build Output
```
dist/
  content.js       # Content script
  content.css      # Content styles
  background.js    # Service worker
  popup.html       # Popup page
  popup.js         # Popup script
  popup.css        # Popup styles (variables + popup-specific)
  manifest.json    # Narrow permissions manifest
  icons/           # Extension icons
```

## Dependencies

- `dexie` - IndexedDB wrapper
- `modern-screenshot` - DOM to PNG/SVG capture
- `@biomejs/biome` - Linting/formatting
- `typescript` - Type checking
- `husky` - Git hooks
