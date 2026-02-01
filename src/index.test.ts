import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/extensions', () => ({
  initTreeExtension: vi.fn(),
  initVariablesExtension: vi.fn(),
  initCaptureExtension: vi.fn(),
}));

vi.mock('@/shared/utils', () => ({
  isN8nHost: vi.fn().mockReturnValue(true),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('index', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('initializes all extensions on n8n host', async () => {
    const { isN8nHost } = await import('@/shared/utils');
    const { initTreeExtension, initVariablesExtension, initCaptureExtension } = await import(
      '@/extensions'
    );
    (isN8nHost as ReturnType<typeof vi.fn>).mockReturnValue(true);

    await import('./index');

    expect(initTreeExtension).toHaveBeenCalled();
    expect(initVariablesExtension).toHaveBeenCalled();
    expect(initCaptureExtension).toHaveBeenCalled();
  });

  it('does not initialize extensions on non-n8n host', async () => {
    const { isN8nHost } = await import('@/shared/utils');
    const { initTreeExtension, initVariablesExtension, initCaptureExtension } = await import(
      '@/extensions'
    );
    (isN8nHost as ReturnType<typeof vi.fn>).mockReturnValue(false);

    vi.resetModules();
    await import('./index');

    expect(initTreeExtension).not.toHaveBeenCalled();
    expect(initVariablesExtension).not.toHaveBeenCalled();
    expect(initCaptureExtension).not.toHaveBeenCalled();
  });

  it('logs when loaded on n8n host', async () => {
    const { isN8nHost, logger } = await import('@/shared/utils');
    (isN8nHost as ReturnType<typeof vi.fn>).mockReturnValue(true);

    vi.resetModules();
    await import('./index');

    expect(logger.info).toHaveBeenCalledWith('n8n-xtend loaded');
  });

  it('does not log when not on n8n host', async () => {
    const { isN8nHost, logger } = await import('@/shared/utils');
    (isN8nHost as ReturnType<typeof vi.fn>).mockReturnValue(false);

    vi.resetModules();
    await import('./index');

    expect(logger.info).not.toHaveBeenCalled();
  });

  it('handles extension initialization error gracefully', async () => {
    const { isN8nHost, logger } = await import('@/shared/utils');
    const { initTreeExtension } = await import('@/extensions');

    (isN8nHost as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (initTreeExtension as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Init failed');
    });

    vi.resetModules();
    await import('./index');

    expect(logger.error).toHaveBeenCalledWith(
      'Extension "tree" failed to initialize:',
      expect.any(Error),
    );
  });

  it('continues initializing other extensions after one fails', async () => {
    const { isN8nHost } = await import('@/shared/utils');
    const { initTreeExtension, initVariablesExtension, initCaptureExtension } = await import(
      '@/extensions'
    );

    (isN8nHost as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (initTreeExtension as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Tree init failed');
    });

    vi.resetModules();
    await import('./index');

    expect(initVariablesExtension).toHaveBeenCalled();
    expect(initCaptureExtension).toHaveBeenCalled();
  });
});
