# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Custom Claude Code commands for `/commit` and `/push` workflows

### Changed
- Updated CLAUDE.md with custom command documentation
- Migrated build system from Webpack to Bun
- Added Biome for linting and formatting
- Added Husky for git hooks
- Added conventional commits with commitlint
- Added GitHub Actions CI/CD pipeline
- Renamed project from "n8n Tree" to "n8n-xtend"

## [1.0.0] - 2025-02-01

### Added
- Initial release
- Tree-style folder navigation for n8n
- Project, folder, and workflow hierarchy
- Lazy loading of folder contents
- Persistent expanded/collapsed state
- Click-to-open workflow navigation
- Folder item counts
