export interface ExtensionConfig {
  id: string;
  name: string;
  description: string;
  enabledByDefault: boolean;
}

export const EXTENSIONS: ExtensionConfig[] = [
  {
    id: 'folder-tree',
    name: 'Folder Tree',
    description: 'Adds a collapsible folder tree to the sidebar for quick navigation',
    enabledByDefault: true,
  },
  {
    id: 'capture',
    name: 'Workflow Capture',
    description: 'Export workflow diagrams as PNG or SVG images',
    enabledByDefault: true,
  },
  {
    id: 'show-password',
    name: 'Show Password',
    description: 'Adds toggle buttons to reveal password fields',
    enabledByDefault: true,
  },
  {
    id: 'variables',
    name: 'Variables Syntax',
    description: 'Enhances variable display with proper syntax highlighting',
    enabledByDefault: true,
  },
];
