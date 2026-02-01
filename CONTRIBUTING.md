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

## Development Tools

### Element Capture Script

The `scripts/capture-element.js` script helps you inspect n8n's UI elements to match their exact styling. This is useful when creating new UI components that need to look native to n8n.

**Usage:**

1. Open n8n in your browser
2. Open the browser console (F12)
3. Paste the contents of `scripts/capture-element.js` and press Enter
4. Interact with n8n to show the element you want to capture (e.g., open a dropdown menu)
5. Run the capture command:

```javascript
// Capture a dropdown menu
captureElement('.el-dropdown-menu')

// Capture a dialog/modal
captureElement('.el-dialog')

// Capture any element by selector or reference
captureElement(document.querySelector('.some-element'))
```

The script will:
- Log the full HTML structure with all classes and attributes
- Log the computed CSS styles for each element
- Auto-download a `.txt` file with both HTML and CSS

This helps you understand n8n's exact element structure and styles so you can replicate them in your extensions.

## Reporting Issues

When reporting issues, please include:

- Browser and version
- n8n version (if known)
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
