# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
