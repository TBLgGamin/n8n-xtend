import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentTheme, isDarkMode, onThemeChange } from './theme';

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = [];
  const mediaQuery = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, callback: (e: { matches: boolean }) => void) => {
      if (event === 'change') {
        listeners.push(callback);
      }
    }),
    removeEventListener: vi.fn((event: string, callback: (e: { matches: boolean }) => void) => {
      if (event === 'change') {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
      }
    }),
    dispatchEvent: vi.fn(() => true),
    triggerChange: (newMatches: boolean) => {
      for (const listener of listeners) {
        listener({ matches: newMatches });
      }
    },
  };

  globalThis.matchMedia = vi.fn(() => mediaQuery as unknown as MediaQueryList);
  return mediaQuery;
}

describe('getCurrentTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns dark when stored as "dark"', () => {
    localStorage.setItem('N8N_THEME', 'dark');
    expect(getCurrentTheme()).toBe('dark');
  });

  it('returns light when stored as "light"', () => {
    localStorage.setItem('N8N_THEME', 'light');
    expect(getCurrentTheme()).toBe('light');
  });

  it('returns dark when stored as JSON "dark"', () => {
    localStorage.setItem('N8N_THEME', '"dark"');
    expect(getCurrentTheme()).toBe('dark');
  });

  it('returns light when stored as JSON "light"', () => {
    localStorage.setItem('N8N_THEME', '"light"');
    expect(getCurrentTheme()).toBe('light');
  });

  it('returns system theme when no stored value', () => {
    mockMatchMedia(true);
    expect(getCurrentTheme()).toBe('dark');
  });

  it('returns light from system when prefers light', () => {
    mockMatchMedia(false);
    expect(getCurrentTheme()).toBe('light');
  });

  it('returns dark from system when prefers dark', () => {
    mockMatchMedia(true);
    expect(getCurrentTheme()).toBe('dark');
  });

  it('handles JSON stringified theme', () => {
    localStorage.setItem('N8N_THEME', JSON.stringify('dark'));
    expect(getCurrentTheme()).toBe('dark');
  });

  it('falls back to system theme for invalid value', () => {
    localStorage.setItem('N8N_THEME', 'invalid');
    mockMatchMedia(false);
    expect(getCurrentTheme()).toBe('light');
  });
});

describe('isDarkMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns true when theme is dark', () => {
    localStorage.setItem('N8N_THEME', 'dark');
    expect(isDarkMode()).toBe(true);
  });

  it('returns false when theme is light', () => {
    localStorage.setItem('N8N_THEME', 'light');
    expect(isDarkMode()).toBe(false);
  });

  it('returns true when system prefers dark', () => {
    mockMatchMedia(true);
    expect(isDarkMode()).toBe(true);
  });

  it('returns false when system prefers light', () => {
    mockMatchMedia(false);
    expect(isDarkMode()).toBe(false);
  });
});

describe('onThemeChange', () => {
  let mockMq: ReturnType<typeof mockMatchMedia>;

  beforeEach(() => {
    localStorage.clear();
    mockMq = mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns cleanup function', () => {
    const callback = vi.fn();
    const cleanup = onThemeChange(callback);
    expect(typeof cleanup).toBe('function');
  });

  it('calls callback on media query change', () => {
    const callback = vi.fn();
    onThemeChange(callback);

    mockMq.triggerChange(true);

    expect(callback).toHaveBeenCalled();
  });

  it('calls callback on storage change', () => {
    const callback = vi.fn();
    onThemeChange(callback);

    const event = new StorageEvent('storage', {
      key: 'N8N_THEME',
      newValue: 'dark',
    });
    window.dispatchEvent(event);

    expect(callback).toHaveBeenCalled();
  });

  it('does not call callback for unrelated storage changes', () => {
    const callback = vi.fn();
    onThemeChange(callback);

    const event = new StorageEvent('storage', {
      key: 'OTHER_KEY',
      newValue: 'value',
    });
    window.dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it('cleanup removes media query listener', () => {
    const callback = vi.fn();
    const cleanup = onThemeChange(callback);

    cleanup();

    expect(mockMq.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('cleanup removes storage listener', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const callback = vi.fn();
    const cleanup = onThemeChange(callback);

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('passes current theme to callback', () => {
    localStorage.setItem('N8N_THEME', 'dark');
    const callback = vi.fn();
    onThemeChange(callback);

    mockMq.triggerChange(false);

    expect(callback).toHaveBeenCalledWith('dark');
  });

  it.skip('observes document element for class changes', async () => {
    const callback = vi.fn();
    onThemeChange(callback);

    document.documentElement.classList.add('dark-theme');

    await vi.waitFor(
      () => {
        expect(callback).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
  });

  it('cleanup disconnects mutation observer', () => {
    const callback = vi.fn();
    const cleanup = onThemeChange(callback);

    cleanup();

    document.documentElement.classList.add('new-class');
    expect(callback).not.toHaveBeenCalled();
  });
});
