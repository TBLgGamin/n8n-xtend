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

5. **n8n Cloud** instances work immediately. For **self-hosted** instances, click the extension icon in the toolbar and add your instance URL through the popup.

## Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The pre-commit hook will automatically format staged files.

To manually run the linter:

```bash
bun run lint        # Check for issues
bun run lint:fix    # Fix issues automatically
bun run format      # Format all files
```

## Architecture Overview

The extension has three entry points, each built separately:

| Entry Point | Output | Purpose |
|-------------|--------|---------|
| `src/index.ts` | `dist/content.js` | Content script injected into n8n pages |
| `src/background/index.ts` | `dist/background.js` | Service worker managing dynamic content script registration |
| `src/popup/index.ts` | `dist/popup.js` | Popup UI for managing self-hosted instance permissions |

**Permission model:** n8n Cloud (`*.n8n.cloud`) is covered by a static content script. Self-hosted instances are registered dynamically by the background service worker after the user grants permission through the popup.

### Testing Both Flows

When working on changes, verify that the extension works on:

1. **n8n Cloud** — Should work out of the box with no setup
2. **Self-hosted** — Add the instance URL via the popup, confirm the browser permission prompt, then verify the extension activates

After reloading the extension (e.g. during development), dynamic scripts are automatically re-registered from saved storage.

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

## Branch Protection

The `main` branch is protected with the following rules:

- **Require pull request reviews**: All changes must be reviewed before merging
- **Require status checks**: The following CI checks must pass:
  - `quality` - Linting and type checking
  - `security` - Dependency vulnerability audit
  - `build` - Production build verification
- **No force push**: Force pushing to main is prohibited to preserve history
- **No direct commits**: All changes must go through pull requests

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
