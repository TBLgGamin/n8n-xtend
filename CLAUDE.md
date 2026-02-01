# n8n-xtend Development Guidelines

## Code Quality - MANDATORY

After EVERY code change, run:
```bash
bun run lint:fix && bun run typecheck
```

This is automated via Claude Code hooks but verify manually if needed.

## Testing Requirements - MANDATORY

### Standards
- **Pass Rate**: 100% of non-skipped tests must pass
- **Coverage Thresholds** (enforced in vitest.config.ts):
  - Lines: 70%
  - Functions: 70%
  - Branches: 70%
  - Statements: 70%

### Commands
- `bun run test` - Run all unit tests
- `bun run test:coverage` - Run tests with coverage report

### Before Committing
All tests must pass before commits are allowed:
```bash
bun run test
```

### Writing Tests
- Place test files adjacent to source files: `foo.ts` → `foo.test.ts`
- Use Vitest with jsdom environment for DOM testing
- Mock external dependencies (fetch, localStorage, etc.)
- Note: Some MutationObserver tests may need to be skipped due to jsdom limitations

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
- `bun run test` - Run unit tests
- `bun run test:coverage` - Run tests with coverage report

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

The pre-commit hooks automatically run linting, type checking, and tests. **All tests must pass with 100% pass rate before commits are accepted.**

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
