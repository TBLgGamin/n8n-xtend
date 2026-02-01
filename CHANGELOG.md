# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
