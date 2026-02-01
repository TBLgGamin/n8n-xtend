<div align="center">

# n8n-xtend

**Extend your n8n experience**

[![CI](https://github.com/TBLgGamin/n8n-xtend/actions/workflows/ci.yml/badge.svg)](https://github.com/TBLgGamin/n8n-xtend/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://github.com/TBLgGamin/n8n-xtend/releases)

A browser extension that enhances n8n with powerful client-side features.

[Installation](#installation) • [Features](#features) •  [Contributing](#contributing)

</div>

---

## Features

### Tree Navigation

Navigate your n8n projects with a collapsible tree view that makes finding workflows effortless.
<div align="center">
                    
https://github.com/user-attachments/assets/de497413-538c-40ed-9cea-81b63aadf925

</div>

**Highlights:**
- **Hierarchical View** — Browse projects, folders, and workflows in an intuitive tree structure
- **Drag & Drop** — Reorganize workflows and folders by dragging them
- **Keyboard Navigation** — Full keyboard support (arrow keys, Enter, Space)

---

### Workflow Capture

Export your workflow diagrams as high-quality images with a single click.

<div align="center">

https://github.com/user-attachments/assets/de497413-538c-40ed-9cea-81b63aadf925

</div>

**Highlights:**
- **PNG Export** — High-resolution raster images (2x scale) perfect for documentation
- **SVG Export** — Scalable vector graphics for presentations and editing
- **Smart Bounds** — Automatically calculates optimal image boundaries around your nodes
- **Menu Integration** — Access via the workflow context menu alongside other actions

---

### Variables Enhancement

Work with n8n variables more efficiently with improved syntax display and quick copy.

<div align="center">

https://github.com/user-attachments/assets/583726e8-dcc7-4657-9f3f-91034ee6ec9b

</div>

**Highlights:**
- **Syntax Wrapping** — Variable usage automatically wrapped with `{{ }}` for clarity
- **Click to Copy** — One click copies the complete syntax to your clipboard

---

## Installation

### Chrome / Chromium-based Browsers

1. Download the latest release from [Releases](https://github.com/TBLgGamin/n8n-xtend/releases)
2. Extract the zip file
3. Navigate to `chrome://extensions/`
4. Enable **Developer mode** (top right toggle)
5. Click **Load unpacked**
6. Select the extracted folder
7. Visit your n8n instance and enjoy!

### Build from Source

```bash
git clone https://github.com/TBLgGamin/n8n-xtend.git
cd n8n-xtend
bun install
bun run build
```

Then load the `dist/` folder as an unpacked extension.

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE) — Built with ❤️ for the n8n community
