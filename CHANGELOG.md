# Changelog

## [Unreleased]

### Added
- Graph extension: sidebar menu item with blank page view and active state management

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
- Workflow copy functionality
- Incremental tree updates
- Drag-drop support with copy (Ctrl/Cmd) and move

### Changed
- Removed keyboard navigation

### Fixed
- Drag-drop event bubbling
