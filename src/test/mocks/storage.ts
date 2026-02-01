let mockStorage: Map<string, string> = new Map();

export function setupStorageMock(): void {
  mockStorage = new Map();

  const storageMock = {
    getItem: (key: string): string | null => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      mockStorage.set(key, value);
    },
    removeItem: (key: string): void => {
      mockStorage.delete(key);
    },
    clear: (): void => {
      mockStorage.clear();
    },
    get length(): number {
      return mockStorage.size;
    },
    key: (index: number): string | null => {
      const keys = Array.from(mockStorage.keys());
      return keys[index] ?? null;
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
  });
}

export function resetStorageMock(): void {
  mockStorage.clear();
}

export function setStorageValue(key: string, value: string): void {
  mockStorage.set(key, value);
}

export function getStorageValue(key: string): string | null {
  return mockStorage.get(key) ?? null;
}

export function clearStorage(): void {
  mockStorage.clear();
}

export function getStorageSize(): number {
  return mockStorage.size;
}
