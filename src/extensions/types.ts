export interface ExtensionMetadata {
  id: string;
  name: string;
  description: string;
  enabledByDefault: boolean;
}

export interface ExtensionEntry extends ExtensionMetadata {
  group: string;
  init: () => void;
}
