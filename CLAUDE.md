# n8n Tree Folder View

Browser extension that adds tree-style folder navigation to n8n using the REST API.

## Structure

```
n8nfolder/
├── manifest.json    # Extension manifest (v3)
├── content.js       # API calls and tree rendering
├── style.css        # Dark theme styling
```

## How It Works

1. Extension detects n8n by calling `/rest/projects`
2. Lists projects at top level
3. Lazy-loads folders/workflows on expand via `/rest/workflows?includeFolders=true`
4. Uses session cookies for auth (no credentials stored)

## API Endpoints Used

- `GET /rest/projects` - List all projects
- `GET /rest/workflows?includeFolders=true&filter={projectId,parentFolderId}` - List folders and workflows

## Installation

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select this folder
5. Navigate to your n8n instance

## Features

- Projects > Folders > Subfolders > Workflows hierarchy
- Lazy loading (folders load on first expand)
- Click workflow to open it
- Refresh button to reload tree
- Folder counts show items inside

## Security

- Fully client-side
- No external requests
- Uses existing session auth
- No data stored locally
