# Changelog

## [Unreleased]

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
- Workflow copy functionality
- Incremental tree updates
- Drag-drop support with copy (Ctrl/Cmd) and move

### Changed
- Removed keyboard navigation

### Fixed
- Drag-drop event bubbling
