# n8n Tree

Browser extension that adds tree-style folder navigation to n8n using the REST API.

## Project Structure

```
n8ntree/
├── src/
│   ├── api/              # API client for n8n REST endpoints
│   │   ├── client.ts     # Fetch functions for folders/workflows
│   │   └── index.ts
│   ├── components/       # UI components
│   │   ├── folder.ts     # Folder tree node element
│   │   ├── workflow.ts   # Workflow tree node element
│   │   └── index.ts
│   ├── core/             # Core extension logic
│   │   ├── injector.ts   # DOM injection into n8n sidebar
│   │   ├── monitor.ts    # URL change detection and auto-inject
│   │   ├── tree.ts       # Tree loading and rendering
│   │   └── index.ts
│   ├── icons/            # SVG icons
│   │   └── index.ts
│   ├── styles/           # CSS styles
│   │   └── tree.css
│   ├── types/            # TypeScript interfaces
│   │   └── index.ts
│   ├── utils/            # Utility functions
│   │   ├── logger.ts     # Structured logging
│   │   ├── storage.ts    # localStorage helpers
│   │   ├── url.ts        # URL parsing utilities
│   │   └── index.ts
│   ├── index.ts          # Entry point
│   └── manifest.json     # Extension manifest (v3)
├── dist/                 # Build output (gitignored)
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Watch mode for development
npm run dev

# Type check
npm run typecheck
```

## Installation

1. Run `npm install && npm run build`
2. Open `chrome://extensions/`
3. Enable Developer Mode
4. Click "Load unpacked"
5. Select the `dist/` folder
6. Navigate to your n8n instance

## How It Works

1. Extension detects n8n by checking hostname
2. Monitors URL changes for project context
3. Lists projects at top level
4. Lazy-loads folders/workflows on expand via REST API
5. Uses session cookies for auth (no credentials stored)

## API Endpoints

- `GET /rest/workflows/{id}` - Get workflow details (for project lookup)
- `GET /rest/workflows?includeFolders=true&filter={...}` - List folders and workflows

## Features

- Projects > Folders > Subfolders > Workflows hierarchy
- Lazy loading (folders load on first expand)
- Click workflow to open it
- Folder counts show items inside
- Persists expanded/collapsed state

## Security

- Fully client-side
- No external requests
- Uses existing session auth
- No credentials stored
