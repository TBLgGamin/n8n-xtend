# n8n-xtend Development Guidelines

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
├── shared/           # Reusable across all extensions
│   ├── api/          # n8n REST API client
│   ├── types/        # Common TypeScript interfaces
│   ├── utils/        # Logger, storage, URL helpers
│   └── ui/           # Shared UI components (context menu)
├── extensions/       # Individual extension features
│   └── tree/         # Tree navigation extension
│       ├── components/
│       ├── core/
│       └── icons/
└── index.ts          # Extension loader
```

## Commands
- `bun run build` - Production build
- `bun run dev` - Watch mode
- `bun run lint` - Check linting
- `bun run lint:fix` - Fix linting issues
- `bun run typecheck` - Type checking

## Git Workflow

### Committing Changes
When committing, use the full git commit command to trigger the Husky pre-commit hooks:
```bash
git add <files>
git commit -m "message"
```

The pre-commit hooks will automatically run linting and type checking before the commit is created.

### Releases & Documentation

After every release:
1. Update `CHANGELOG.md` with the new version, date, and changes
2. Review and update `README.md` if features changed
3. Review and update `CONTRIBUTING.md` if development workflow changed

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
