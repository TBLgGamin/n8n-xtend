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

### Custom Commands
- `/commit` - Create a conventional commit with Husky hooks
- `/push` - Push commits to remote
- `/release` - Build, test locally, and create a GitHub release

### Committing Changes
Use `/commit` or run manually to trigger Husky pre-commit hooks:
```bash
git add <files>
git commit -m "message"
```

The pre-commit hooks automatically run linting and type checking.

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
