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
├── popup/                      # Extension popup (multi-view SPA)
│   ├── index.ts                # Extension list, detail, settings, instances views
│   ├── popup.html              # Popup page markup
│   └── styles/
│       └── popup.css           # Popup-specific styles (built separately from content CSS)
├── settings/                   # Extension enable/disable logic
│   ├── index.ts                # Re-exports from core
│   └── core/
│       ├── index.ts            # Re-exports from storage
│       └── storage.ts          # loadSettings(), isExtensionEnabled(), setExtensionEnabled()
├── shared/
│   ├── api/
│   │   ├── client.ts           # REST API client with retry logic (3 attempts, exponential backoff)
│   │   ├── workflows.ts        # Workflow list/detail fetching helpers
│   │   └── index.ts
│   ├── types/
│   │   ├── api.ts              # Folder, Workflow, TreeItem, WorkflowDetail interfaces
│   │   └── index.ts
│   ├── utils/
│   │   ├── chrome-storage.ts   # In-memory cache over chrome.storage.sync + chrome.storage.local
│   │   ├── monitor.ts          # PollMonitor, MutationMonitor, AdaptivePollMonitor
│   │   ├── theme.ts            # Theme detection (dark/light)
│   │   ├── theme-colors.ts     # Light/dark color palettes + onThemeColorsChange()
│   │   ├── theme-manager.ts    # Manages n8n-xtend-dark class on html element
│   │   ├── url.ts              # URL parsing, page detection, isN8nHost()
│   │   ├── dom.ts              # DOM query helpers (findElementBySelectors, findElementByClassPattern)
│   │   ├── html.ts             # HTML escaping (XSS prevention)
│   │   ├── validation.ts       # ID validation and object sanitization
│   │   ├── timing.ts           # createDebounced(), createThrottled()
│   │   ├── logger.ts           # Hierarchical logging with levels
│   │   └── index.ts
│   └── styles/
│       └── variables.css       # CSS variables (colors, spacing)
├── extensions/
│   ├── index.ts                # Re-exports registry and types
│   ├── registry.ts             # Auto-generated: assembles extensions from discovered index.ts files
│   ├── meta.ts                 # Auto-generated: metadata-only variant for popup bundle
│   ├── types.ts                # ExtensionMetadata, ExtensionEntry interfaces
│   ├── sidebar/                # Sidebar/navigation extensions
│   │   ├── folder-tree/        # Collapsible tree navigation with drag-drop
│   │   │   ├── api/            # fetchFolders, move/copy operations
│   │   │   ├── components/     # folder.ts, workflow.ts element creation
│   │   │   ├── core/           # injector, monitor, tree, state, dragdrop, sync
│   │   │   ├── icons/          # SVG icons (chevron, folder, workflow)
│   │   │   ├── styles/
│   │   │   └── video/
│   │   └── graph/              # Workflow dependency graph visualization
│   │       ├── core/           # injector, monitor, canvas, renderer, graph-builder, data, state
│   │       ├── icons/
│   │       ├── styles/
│   │       └── video/
│   ├── editor/                 # Workflow canvas extensions
│   │   ├── capture/            # Export workflows as PNG/SVG
│   │   │   ├── core/           # injector, monitor
│   │   │   ├── utils/          # capture.ts (modern-screenshot)
│   │   │   └── video/
│   │   └── note-title/         # Rename sticky note titles with Space shortcut
│   │       ├── core/           # injector (keyboard listener + rename modal), monitor
│   │       └── video/
│   └── ui/                     # UI enhancement extensions
│       ├── show-password/      # Toggle password field visibility
│       │   ├── core/           # injector, monitor
│       │   ├── icons/          # eye icons
│       │   └── video/
│       └── variables/          # Auto-wrap {{ }} with click-to-copy
│           ├── core/           # enhancer, monitor
│           └── video/
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
| `src/popup/index.ts` | `popup.js` | Popup UI (extensions, settings, instances) |

### Extension System

Each extension is self-contained with co-located metadata:

```typescript
// extensions/{sidebar|editor|ui}/your-extension/index.ts
export const metadata: ExtensionMetadata = {
  id: 'your-extension',
  name: 'Your Extension',
  description: 'What it does',
  howToUse: 'How to use it',
  enabledByDefault: true,
};

export function init(): void {
  startMonitor();
}
```

The registry (`extensions/registry.ts`) is **auto-generated** by the build system — it discovers all `extensions/*/*/index.ts` files and assembles them with their group (derived from folder path) and init function. A parallel `meta.ts` is also generated with metadata-only imports for the popup bundle.

`src/index.ts` loops over the registry, checking `isExtensionEnabled()` for each.

### Monitor Factories (`shared/utils/monitor.ts`)

Three reusable monitor types:

- **PollMonitor** - Simple interval polling. Use for: page detection, periodic checks
- **MutationMonitor** - DOM mutation observation. Use for: detecting new elements
- **AdaptivePollMonitor** - Speeds up when user active (100ms active, 250ms idle). Use for: responsive UI tracking

### Storage System

- **chrome.storage.sync** + **chrome.storage.local** with in-memory cache (`chrome-storage.ts`)
- At init, all keys loaded into `syncCache` / `localCache` Maps via `chrome.storage.*.get(null)`
- `chrome.storage.onChanged` listener keeps cache in sync
- Sync reads: `getSyncItem()`, `getLocalItem()` — no async after init
- Async writes: `setSyncItem()`, `setLocalItem()` — update cache immediately, fire-and-forget to chrome.storage

Storage keys:

| Key | Storage | Used By | Data |
|-----|---------|---------|------|
| `n8n-xtend-settings` | sync | content + popup | `Record<string, boolean>` extension toggles |
| `n8n-xtend-origins` | sync | background + popup | `string[]` self-hosted origins |
| `n8n-xtend-preferences` | sync | popup | `{ checkForUpdates: boolean }` |
| `n8ntree-expanded` | local | folder-tree | expanded folder IDs |

### Theme System

- `getCurrentTheme()` returns `'dark' | 'light'`
- `initThemeManager()` adds/removes `n8n-xtend-dark` class on `<html>`
- `getThemeColors()` returns light/dark color palette
- `onThemeColorsChange(cb)` for reactive theme updates
- CSS uses `:root.n8n-xtend-dark` selector for dark mode

### Toast System (`shared/utils/toast.ts`)

- `showToast({ message, action?, duration? })` - Show notification toast
- All toasts have a unified look: green checkmark icon + message + optional action + dismiss
- `action: { label, onClick }` adds an action button (e.g., "Undo")
- Default duration: 6000ms, auto-dismisses
- Toasts stack bottom-right, slide in/out with 300ms transitions
- CSS in `shared/styles/toast.css`, success color via `--n8n-xtend-color-success`

### Event Bus (`shared/utils/event-bus.ts`)

- `emit(event, payload)` / `on(event, handler)` - Typed pub-sub
- `on()` returns an unsubscribe function
- Key cross-extension events:
  - `folder-tree:item-moved` / `items-moved` → graph clears cached state
  - `folder-tree:tree-refreshed` → graph invalidates when sync detects external changes
  - `undo:operation-registered` → notifies listeners of new undoable action
  - `undo:requested` → triggers undo execution

### Undo System (`shared/utils/undo.ts`)

- `registerUndo({ description, undo })` - Register undoable operation + show success toast with Undo button
- `initUndoSystem()` - Called at content script init, registers Ctrl+Z handler
- Single-operation stack (latest only, no history)
- Keyboard shortcut skips INPUT/TEXTAREA/contentEditable elements

### API Client (`shared/api/client.ts`)

- `request<T>(endpoint)` - GET with retry
- `post<T>(endpoint, body)` - POST with retry
- `patch<T>(endpoint, body)` - PATCH with retry
- Retry logic: 3 attempts (1 initial + 2 retries), exponential backoff (1s, 2s)
- Retryable codes: 408, 429, 500, 502, 503, 504
- `assertTrustedOrigin()` validates `isN8nHost()` before every request
- `fetchWithTimeout()` wraps fetch with 10s AbortController
- Includes `browser-id` header from localStorage, `credentials: 'include'`

## Key Types (`shared/types/api.ts`)

```typescript
interface Folder { id, name, resource: 'folder', parentFolderId?, workflowCount?, subFolderCount? }
interface Workflow { id, name, resource?, versionId?, parentFolderId?, homeProject?: { id } }
interface WorkflowDetail { id, name, active, nodes, connections, settings, pinData, tags, ... }
type TreeItem = Folder | Workflow
function isFolder(item: TreeItem): item is Folder
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
4. Create `index.ts` - export `metadata` (ExtensionMetadata) and `init()`
5. Optionally add `video/` directory with demo video + `VIDEO.md`

That's it. The build system auto-generates the registry. No need to touch `src/index.ts`, `registry.ts`, or any config file.

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

#### CHANGELOG.md

`CHANGELOG.md` is auto-generated at release time by `scripts/changelog.sh`. It reads conventional commit subjects since the last tag and maps them to sections:

- `feat:` → **Added**
- `fix:` → **Fixed**
- `refactor:`, `perf:`, `docs:`, `chore:` → **Changed**

Do not manually edit `CHANGELOG.md` during commits — write good conventional commit messages instead.

## Build System (`scripts/build.ts`)

1. Auto-generates `extensions/registry.ts` and `extensions/meta.ts` from discovered extensions
2. Cleans `dist/` directory
3. Bundles three entry points: content script, background service worker, popup script
4. Defines `__DEV__` as `true` in watch mode, `false` in production (all three entry points)
5. Combines content CSS files (excludes `popup/**/*.css`), embeds fonts as base64
6. Builds popup CSS separately (`variables.css` + `popup/styles/popup.css`)
7. Copies `popup.html`, icons, and video assets to `dist/`
8. Generates `manifest.json` with version from `package.json`
9. Watch mode: `node:fs.watch` on `src/` recursive, 100ms debounce

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
  extensions/      # Video assets per extension
```

## Dependencies

- `modern-screenshot` - DOM to PNG/SVG capture
- `@biomejs/biome` - Linting/formatting
- `@commitlint/cli` + `@commitlint/config-conventional` - Conventional commit enforcement
- `@types/bun` - Bun TypeScript types
- `@types/chrome` - Chrome extension API types
- `typescript` - Type checking
- `husky` - Git hooks
- `lint-staged` - Pre-commit staged file checking
