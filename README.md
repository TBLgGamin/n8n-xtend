# n8n-xtend

**Extend your n8n experience**

[![CI](https://github.com/YOUR_USERNAME/n8n-xtend/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/n8n-xtend/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A browser extension that adds client-side enhancements to n8n, starting with tree-style folder navigation.

## Features

- **Tree Navigation** - Browse projects, folders, and workflows in a collapsible tree view
- **Lazy Loading** - Folders load on demand for fast performance
- **Persistent State** - Remembers which folders you had expanded
- **Click to Open** - Navigate directly to any workflow
- **Folder Counts** - See how many items are in each folder

## Installation

### Chrome / Chromium-based browsers

1. Download the latest release from [Releases](https://github.com/YOUR_USERNAME/n8n-xtend/releases)
2. Extract the zip file
3. Go to `chrome://extensions/`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the extracted folder
7. Navigate to your n8n instance

### From Source

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/n8n-xtend.git
cd n8n-xtend

# Install dependencies
bun install

# Build the extension
bun run build

# Load the dist/ folder as an unpacked extension
```

## Development

This project uses [Bun](https://bun.sh/) for fast builds and development.

```bash
# Install dependencies
bun install

# Start development mode (watch for changes)
bun run dev

# Build for production
bun run build

# Run linter
bun run lint

# Fix linting issues
bun run lint:fix

# Type check
bun run typecheck
```

## How It Works

1. The extension detects when you're on an n8n instance
2. It injects a tree view into the sidebar
3. Projects are shown at the top level
4. Expanding a project or folder fetches its contents via the n8n REST API
5. Uses your existing session cookies for authentication (no credentials stored)

## Project Structure

```
n8n-xtend/
├── src/
│   ├── api/          # API client for n8n REST endpoints
│   ├── components/   # UI components (folder, workflow nodes)
│   ├── core/         # Core logic (injection, monitoring, tree)
│   ├── fonts/        # Custom icon font
│   ├── icons/        # SVG icons
│   ├── styles/       # CSS styles
│   ├── types/        # TypeScript interfaces
│   ├── utils/        # Utility functions
│   └── index.ts      # Entry point
├── scripts/
│   └── build.ts      # Bun build script
└── dist/             # Build output
```

## Security

- Fully client-side - no data leaves your browser
- No external requests except to your n8n instance
- Uses existing session authentication
- No credentials or tokens are stored

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
