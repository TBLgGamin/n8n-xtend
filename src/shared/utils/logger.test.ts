import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

describe('Logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('logs info messages with correct prefix', () => {
      logger.info('test message');
      expect(consoleSpy.log).toHaveBeenCalledWith('[n8n-xtend:info] test message');
    });

    it('logs info messages with additional args', () => {
      logger.info('test message', { data: 'value' });
      expect(consoleSpy.log).toHaveBeenCalledWith('[n8n-xtend:info] test message', {
        data: 'value',
      });
    });

    it('logs info messages with multiple args', () => {
      logger.info('test', 'arg1', 'arg2', 123);
      expect(consoleSpy.log).toHaveBeenCalledWith('[n8n-xtend:info] test', 'arg1', 'arg2', 123);
    });
  });

  describe('warn', () => {
    it('logs warn messages with correct prefix', () => {
      logger.warn('warning message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[n8n-xtend:warn] warning message');
    });

    it('logs warn messages with additional args', () => {
      logger.warn('warning', { issue: 'problem' });
      expect(consoleSpy.warn).toHaveBeenCalledWith('[n8n-xtend:warn] warning', {
        issue: 'problem',
      });
    });
  });

  describe('error', () => {
    it('logs error messages with correct prefix', () => {
      logger.error('error message');
      expect(consoleSpy.error).toHaveBeenCalledWith('[n8n-xtend:error] error message');
    });

    it('logs error messages with error object', () => {
      const error = new Error('test error');
      logger.error('something failed', error);
      expect(consoleSpy.error).toHaveBeenCalledWith('[n8n-xtend:error] something failed', error);
    });
  });

  describe('child', () => {
    it('creates child logger with component prefix', () => {
      const childLogger = logger.child('api');
      childLogger.info('child message');
      expect(consoleSpy.log).toHaveBeenCalledWith('[n8n-xtend:api:info] child message');
    });

    it('creates nested child logger', () => {
      const childLogger = logger.child('api');
      const nestedLogger = childLogger.child('client');
      nestedLogger.info('nested message');
      expect(consoleSpy.log).toHaveBeenCalledWith('[n8n-xtend:api:client:info] nested message');
    });

    it('child logger logs warnings correctly', () => {
      const childLogger = logger.child('tree');
      childLogger.warn('tree warning');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[n8n-xtend:tree:warn] tree warning');
    });

    it('child logger logs errors correctly', () => {
      const childLogger = logger.child('capture');
      childLogger.error('capture error');
      expect(consoleSpy.error).toHaveBeenCalledWith('[n8n-xtend:capture:error] capture error');
    });
  });

  describe('debug (production mode)', () => {
    it('does not log debug messages in production mode', () => {
      logger.debug('debug message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  describe('log level filtering', () => {
    it('info is logged in production', () => {
      logger.info('info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('warn is logged in production', () => {
      logger.warn('warn message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('error is logged in production', () => {
      logger.error('error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });
});
