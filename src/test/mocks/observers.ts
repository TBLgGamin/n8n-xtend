import { vi } from 'vitest';

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;
type MutationCallback = (mutations: MutationRecord[]) => void;

let resizeObserverCallbacks: ResizeCallback[] = [];
let mutationObserverCallbacks: MutationCallback[] = [];

class MockResizeObserver {
  private callback: ResizeCallback;

  constructor(callback: ResizeCallback) {
    this.callback = callback;
    resizeObserverCallbacks.push(callback);
  }

  observe(): void {}

  unobserve(): void {}

  disconnect(): void {
    const index = resizeObserverCallbacks.indexOf(this.callback);
    if (index > -1) {
      resizeObserverCallbacks.splice(index, 1);
    }
  }
}

class MockMutationObserver {
  private callback: MutationCallback;

  constructor(callback: MutationCallback) {
    this.callback = callback;
    mutationObserverCallbacks.push(callback);
  }

  observe(): void {}

  disconnect(): void {
    const index = mutationObserverCallbacks.indexOf(this.callback);
    if (index > -1) {
      mutationObserverCallbacks.splice(index, 1);
    }
  }

  takeRecords(): MutationRecord[] {
    return [];
  }
}

function createMockMatchMedia() {
  return vi.fn((query: string) => ({
    matches: !query.includes('dark'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  }));
}

export function setupObserverMocks(): void {
  resizeObserverCallbacks = [];
  mutationObserverCallbacks = [];

  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;
  globalThis.matchMedia = createMockMatchMedia();
}

export function resetObserverMocks(): void {
  resizeObserverCallbacks = [];
  mutationObserverCallbacks = [];
}

export function triggerResizeObserver(entries: Partial<ResizeObserverEntry>[] = []): void {
  const mockEntries = entries as ResizeObserverEntry[];
  for (const callback of resizeObserverCallbacks) {
    callback(mockEntries);
  }
}

export function triggerMutationObserver(mutations: Partial<MutationRecord>[] = []): void {
  const mockMutations = mutations as MutationRecord[];
  for (const callback of mutationObserverCallbacks) {
    callback(mockMutations);
  }
}

export function setMatchMediaMatches(matches: boolean): void {
  globalThis.matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  }));
}
