# Contributing to n8n-xtend

Thank you for your interest in contributing to n8n-xtend!

## Development Setup

1. Make sure you have [Bun](https://bun.sh/) installed:

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/TBLgGamin/n8n-xtend.git
   cd n8n-xtend
   bun install
   ```

3. Start development mode:

   ```bash
   bun run dev
   ```

4. Load the `dist/` folder as an unpacked extension in Chrome.

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The pre-commit hook will automatically format staged files.

To manually run the linter:

```bash
bun run lint        # Check for issues
bun run lint:fix    # Fix issues automatically
bun run format      # Format all files
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Your commit messages should follow this format:

```
type(scope): description

[optional body]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(tree): add folder drag and drop support
fix(api): handle rate limiting errors
docs: update installation instructions
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run `bun run lint` and `bun run typecheck` to ensure code quality
5. Commit your changes following the commit message guidelines
6. Push to your fork and open a pull request
7. Describe your changes in the PR description

## Reporting Issues

When reporting issues, please include:

- Browser and version
- n8n version (if known)
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
