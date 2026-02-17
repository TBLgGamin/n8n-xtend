# Changelog

## [Unreleased]

## [1.8.1] - 2026-02-17

### Added

- redesign popup navigation and settings page
- redesign popup as tabbed command center with chrome.storage

### Changed

- restore full changelog history to initial release
- replace conventional-changelog with native bash script


## [1.8.0] - 2026-02-17

### Added
- Popup: clickable origin rows that open the instance in a new tab
- Popup: version footer with link to GitHub release changelog
- Popup: GitHub release check — shows "Update available" badge when a newer version exists
- Popup: instances persisted in IndexedDB via shared storage utilities for instant rendering
- Popup: flexible URL input accepting bare domains, full URLs, or URLs with paths
- Narrow permission model: static content script for *.n8n.cloud, dynamic registration for self-hosted instances
- Background service worker for dynamic content script registration and origin storage
- Popup UI to manage self-hosted n8n instance permissions

### Changed
- Popup: removed verbose hint text and n8n Cloud section for a cleaner UI
- Manifest narrowed from broad host access to per-origin optional permissions
- Build system now produces three bundles: content script, background worker, popup script

### Removed
- Broad `<all_urls>` host permission
- `web_accessible_resources` (icons are inline SVGs)

## [1.7.1] - 2026-02-12

### Changed
- Settings panel: replace logo with "Extensions" heading matching n8n native style
- Settings panel: switch from toggle sliders to checkboxes
- Settings monitor: retry injection on every poll while on settings page
- Variables extension: switch from PollMonitor to MutationMonitor for instant enhancement
- Theme system: replace polling with MutationObserver, storage events, and media query listeners
- Build system: auto-generate extension registry from filesystem scan
- Build system: auto-discover CSS files instead of hardcoded paths
- Extension init functions standardized to `init()` with auto-generated registry

### Fixed
- Variables extension: handle Vue re-renders that reset text content while keeping the enhanced attribute
- Graph extension: use project main content area instead of content wrapper for view injection

## [1.7.0] - 2026-02-08

### Added
- Graph extension: sidebar menu item with blank page view and active state management
- Graph extension: workflow data fetching with project detection and loading states
- Graph extension: infinite canvas with pan (drag), zoom (scroll), and reset (Ctrl+0)
- Graph extension: workflow call-tree visualization with sequential chaining and left-to-right layout
- Graph extension: SVG bezier edge connections between parent and child workflows
- Graph extension: MCP tool resolution — mcpClientTool nodes matched to workflows via fuzzy name comparison
- Graph extension: visual grouping — connected flows and standalone workflows separated with section labels and grid layout
- Graph extension: published/unpublished indicator on workflow cards (circle-check / circle-minus icons)
- Graph extension: edge labels showing connection type (sub-workflow or mcp) with dashed MCP edges
- Graph extension: fit-to-view toolbar button to auto-zoom the entire graph into the viewport
- Graph extension: minimap in bottom-right corner showing card positions and live viewport rectangle
- Shared workflow API: bulk fetch, detail fetch, and project workflow listing
- Shared types: WorkflowNode, WorkflowDetail, WorkflowDetailResponse, WorkflowListResponse

### Changed
- Moved fetchWorkflowProjectId to shared API for reuse across extensions

## [1.6.0] - 2026-02-07

### Added
- Note title rename extension: rename sticky note titles with Space shortcut
- Logging auditor agent for codebase observability audits
- Comprehensive structured logging across all extensions, API client, storage, theme system, and settings
- Runtime API response validation

### Changed
- Restructured extensions with co-located metadata and n8n-specific categories
- Settings groups now derived from folder structure
- Parallelized folder sync and copy operations for better performance
- Pre-grouped extensions with Map instead of O(n^2) filter in settings
- Reduced redundant DOM queries in tree operations
- Added early return guard in escapeHtml for strings without special characters
- Normalized icon exports to object pattern with `as const`
- Consistent barrel imports across all extensions
- Boolean variables renamed to use is/has prefix convention

### Fixed
- Escape chrome.runtime.getURL() output in settings injector
- Safe number interpolation for folder item counts
- Theme data validation against expected values
- Silent JSON.parse failures now properly logged
- Structured error context in all API catch blocks

## [1.5.0] - 2025-06-07

### Added
- Origin validation guard in API client to prevent credentialed requests to untrusted origins
- Field-level validation for drag-drop data parsing with type, ID, and name checks
- Shared page detection helpers: `isWorkflowPage()`, `isVariablesPage()`, `isSettingsPersonalPage()`
- Shared `createDebounced()` and `createThrottled()` timing utilities
- IndexedDB error boundary with graceful in-memory fallback for private browsing
- Folder cache TTL (5 minutes) to prevent stale data in long-lived tabs
- Security Conventions section in CLAUDE.md
- Incremental tree updates with diff-based DOM patching to avoid full re-renders
- 30-second content cache for folder contents to reduce API calls
- 5-second polling monitor for automatic change detection in expanded folders
- Tree state tracking for efficient incremental updates
- Workflow copy functionality with full workflow data cloning
- POST endpoint support in API client for creating resources

### Changed
- CI bundle size limit increased from 150KB to 200KB
- Settings panel now escapes extension name, description, and ID in innerHTML
- Show-password icons moved from `core/icons.ts` to dedicated `icons/` directory
- `clearFolderCache` exported through folder-tree API barrel file
- Page detection functions consolidated from extension monitors into `shared/utils/url.ts`
- Boolean variables renamed to follow `is/has` prefix convention (`isLoaded`, `isOpen`)
- Folder tree state debounce refactored to use shared `createDebounced`
- Adaptive poll monitor throttle refactored to use shared `createThrottled`
- Folder cache cleared on every tree refresh
- Folder tree now preserves scroll position and expansion state during updates

### Fixed
- Drag-drop event bubbling causing incorrect parentFolderId in move/copy operations

### Removed
- Keyboard navigation feature (arrow keys, Enter to navigate tree)

## [1.4.2] - 2026-02-04

### Added
- IndexedDB storage via Dexie.js with in-memory caching for fast synchronous reads
- Reusable monitor utilities: `createPollMonitor`, `createMutationMonitor`, `createAdaptivePollMonitor`
- Automatic migration from localStorage to IndexedDB on first load
- Input validation utilities for IDs with `isValidId()`, `sanitizeId()`, `validateAndEncodeId()`
- Prototype pollution protection via `sanitizeObject()` utility
- Content Security Policy in manifest for defense-in-depth

### Changed
- Storage layer now uses IndexedDB instead of localStorage for persistence
- All monitors refactored to use shared monitor utilities
- Capture functions deduplicated with shared `withAdjustedViewport()` helper
- Folder expansion state now debounced (150ms) to reduce database writes
- Keyboard navigation visibility check no longer triggers layout reflow
- ResizeObserver uses requestAnimationFrame instead of setTimeout
- API client now preserves actual error status codes on retry failure
- HTML escape simplified to single-pass replace
- URL builders now validate and encode IDs to prevent XSS
- Manifest URL matching restricted from `<all_urls>` to `http://*/*`, `https://*/*`
- CLAUDE.md updated with comprehensive architecture documentation

### Fixed
- Show-password monitor memory leak (MutationObserver now properly disconnected)
- Folder cache invalidation after drag-drop moves
- Clipboard write error handling in variables enhancer
- Database errors now logged instead of silently swallowed
- XSS vulnerability in workflow and folder URL construction
- Prototype pollution risk in localStorage migration

## [1.4.1] - 2026-02-04

### Added
- Settings panel extension for managing n8n-xtend features
- Theme polling for instant theme change detection without page refresh
- Shared CSS variables for consistent theming across extensions
- Keyboard navigation caching with invalidation on expand/collapse
- Folder path caching to reduce API calls

### Changed
- All logs changed to debug level for silent production builds
- Renamed tree extension to folder-tree for clarity
- Reorganized theme utilities into separate modules (theme-colors, theme-manager)
- Capture dialog now closes instantly on format selection (optimistic UI)
- Reduced theme polling from 500ms to 5000ms (event-driven approach as primary)
- Variables monitor polling reduced to 250ms for faster response
- Settings monitor polling increased to 1000ms with page state tracking
- Single-pass item filtering replaces double filter() calls
- ResizeObserver debounce increased from 16ms to 150ms
- Batched drag/drop DOM updates into single requestAnimationFrame
- Activity detection throttled to 200ms to reduce function calls
- Optimized HTML escape with early return when no special characters
- Optimized logger format string construction
- Optimized findElementByClassPattern with early return on first match
- Renamed `init()` to `initExtensions()` for clarity
- Renamed `inject()` to `injectFolderTree()` for consistency

### Fixed
- Removed duplicate findElementByClassPattern from folder-tree injector

## [1.4.0] - 2026-02-04

### Added
- Show password extension with eye icon toggle for password field visibility
- Extensions now organized into `ui/` and `enhancements/` categories

### Removed
- Command bar extension
- Unit test suite and E2E test infrastructure

## [1.3.2] - 2026-02-01

### Changed
- Consolidated shared utilities (escapeHtml, findElementBySelectors, findElementByClassPattern)
- Improved drag-drop performance with requestAnimationFrame batching
- Added idle polling to reduce CPU usage when user is inactive
- Optimized DOM selector queries in injector
- Debounced resize observer callbacks
- Switched to system font stack, removed custom font
- Consolidated extension exports into single index file

### Removed
- Skeleton loading animation (faster perceived load without it)
- Unused icon generation and element capture dev scripts

### Fixed
- TypeScript strict mode errors in keyboard navigation and HTML escaping

## [1.3.1] - 2026-02-01

### Added
- Extension icons (16x16, 48x48, 128x128) with auto-generation script
- Smart n8n detection using DOM indicators and URL patterns for custom domain support

### Changed
- Restructured README with professional layout showcasing all extensions
- Added demo videos for Tree Navigation, Workflow Capture, and Variables extensions
- Build script now auto-syncs version from package.json to manifest.json
- Manifest uses `<all_urls>` with runtime detection for self-hosted n8n instances

## [1.3.0] - 2026-02-01

### Added
- Capture extension to export workflows as PNG or SVG images
- Element capture development script for inspecting n8n UI styles

## [1.2.0] - 2026-02-01

### Added
- Drag and drop support for moving workflows and folders
- Keyboard navigation for tree (arrow keys, Enter to open)
- Variables extension with `{{ }}` syntax wrapper for global variables
- Dark mode support with automatic theme detection
- Shared theme utility reading from N8N_THEME localStorage

### Changed
- Improved logger with component-specific prefixes (e.g., `[n8n-xtend:tree:info]`)
- Debug logging now only shows in dev builds (`bun run dev`)
- Workflows now display above folders at each tree level
- Build system now injects `__DEV__` flag for dev mode detection

### Fixed
- Fixed drag-drop causing infinite request loop (duplicate event listeners)
- Fixed workflow move to root folder (API expects `null` not `'0'`)

## [1.1.0] - 2026-02-01

### Added
- Custom Claude Code commands for `/commit`, `/push`, and `/release` workflows

### Changed
- Updated GitHub repository name to `n8n-xtend`
- Added package.json metadata (author, license, repository, homepage, bugs, keywords)
- Updated README.md with correct GitHub URLs
- Updated `/push` command to include CHANGELOG.md verification
- Updated CLAUDE.md with custom command documentation
- Migrated build system from Webpack to Bun
- Added Biome for linting and formatting
- Added Husky for git hooks
- Added conventional commits with commitlint
- Added GitHub Actions CI/CD pipeline
- Renamed project from "n8n Tree" to "n8n-xtend"

## [1.0.0] - 2026-02-01

### Added
- Initial release
- Tree-style folder navigation for n8n
- Project, folder, and workflow hierarchy
- Lazy loading of folder contents
- Persistent expanded/collapsed state
- Click-to-open workflow navigation
- Folder item counts
