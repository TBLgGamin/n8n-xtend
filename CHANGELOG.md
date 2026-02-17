# Changelog

## [Unreleased]

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
- Variables extension: enhance detection and wrapping reliability

## [1.7.0] - 2026-02-08

### Added
- Graph sidebar extension with workflow call-tree visualization
- Infinite canvas with workflow cards
- Sequential chaining layout for call-tree graph
- MCP tool resolution and visual grouping in graph view
- Graph enhancements: minimap, edge labels, and toolbar

### Fixed
- Handle possibly undefined array access in graph renderer

## [1.6.0] - 2026-02-07

### Added
- Note title rename extension (Space shortcut on sticky notes)
- Settings groups derived from extension folder structure

### Changed
- Extensions restructured with co-located metadata and n8n-specific categories
- Comprehensive logging, security hardening, and performance optimizations

## [1.5.0] - 2026-02-07

### Added
- Incremental tree updates for folder tree
- Workflow copy support
- Keyboard navigation improvements

### Fixed
- Drag-drop event bubbling

### Changed
- Added resilience, shared utilities, and cache TTL

## [1.4.2] - 2026-02-04

### Fixed
- XSS and security vulnerabilities

## [1.4.1] - 2026-02-04

### Fixed
- Correct export name for `removeFolderTree`

### Changed
- Optimized monitors, caching, and capture UX

## [1.4.0] - 2026-02-04

### Added
- Settings panel for enabling/disabling individual extensions
- Improved theme reactivity

### Changed
- Storage migrated from localStorage to IndexedDB
- Monitors consolidated into shared utilities

## [1.3.2] - 2026-02-01

### Fixed
- Override vulnerable `@conventional-changelog/git-client` dependency

## [1.3.1] - 2026-02-01

### Changed
- Shared utilities consolidated and performance improved

## [1.3.0] - 2026-02-01

### Added
- Capture extension for exporting workflows as PNG/SVG

## [1.2.0] - 2026-02-01

### Fixed
- TypeScript strict mode errors in CI

## [1.1.0] - 2026-02-01

### Added
- Drag-drop support in folder tree
- Keyboard navigation
- Variables extension with `{{ }}` auto-wrap and click-to-copy
- Dark mode support
