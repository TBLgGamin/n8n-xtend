export interface ExtensionConfig {
  id: string;
  name: string;
  description: string;
  group: string;
  enabledByDefault: boolean;
}

const GROUP_DISPLAY_NAMES: Record<string, string> = {
  ui: 'UI',
  enhancements: 'Enhancements',
};

export function getGroupDisplayName(group: string): string {
  return GROUP_DISPLAY_NAMES[group] ?? group;
}

export function getUniqueGroups(extensions: ExtensionConfig[]): string[] {
  return [...new Set(extensions.map((ext) => ext.group))];
}

export const EXTENSIONS: ExtensionConfig[] = [
  {
    id: 'folder-tree',
    name: 'Folder Tree',
    description: 'Adds a collapsible folder tree to the sidebar for quick navigation',
    group: 'ui',
    enabledByDefault: true,
  },
  {
    id: 'capture',
    name: 'Workflow Capture',
    description: 'Export workflow diagrams as PNG or SVG images',
    group: 'enhancements',
    enabledByDefault: true,
  },
  {
    id: 'show-password',
    name: 'Show Password',
    description: 'Adds toggle buttons to reveal password fields',
    group: 'ui',
    enabledByDefault: true,
  },
  {
    id: 'variables',
    name: 'Variables Syntax',
    description: 'Enhances variable display with proper syntax highlighting',
    group: 'ui',
    enabledByDefault: true,
  },
  {
    id: 'note-title',
    name: 'Note Title Rename',
    description: 'Rename sticky note visible titles with Space shortcut',
    group: 'ui',
    enabledByDefault: true,
  },
];
