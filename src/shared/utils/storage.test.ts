import { beforeEach, describe, expect, it } from 'vitest';
import { getBrowserId, getStorageItem, setStorageItem } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getBrowserId', () => {
    it('returns empty string when no browser ID stored', () => {
      expect(getBrowserId()).toBe('');
    });

    it('returns stored browser ID', () => {
      localStorage.setItem('n8n-browserId', 'test-browser-123');
      expect(getBrowserId()).toBe('test-browser-123');
    });

    it('returns exact stored value', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      localStorage.setItem('n8n-browserId', uuid);
      expect(getBrowserId()).toBe(uuid);
    });
  });

  describe('getStorageItem', () => {
    it('returns null when key does not exist', () => {
      expect(getStorageItem('nonexistent')).toBeNull();
    });

    it('returns parsed JSON object', () => {
      localStorage.setItem('test-key', JSON.stringify({ foo: 'bar' }));
      expect(getStorageItem('test-key')).toEqual({ foo: 'bar' });
    });

    it('returns parsed JSON array', () => {
      localStorage.setItem('test-key', JSON.stringify([1, 2, 3]));
      expect(getStorageItem('test-key')).toEqual([1, 2, 3]);
    });

    it('returns parsed JSON number', () => {
      localStorage.setItem('test-key', JSON.stringify(42));
      expect(getStorageItem('test-key')).toBe(42);
    });

    it('returns parsed JSON boolean', () => {
      localStorage.setItem('test-key', JSON.stringify(true));
      expect(getStorageItem('test-key')).toBe(true);
    });

    it('returns parsed JSON string', () => {
      localStorage.setItem('test-key', JSON.stringify('hello'));
      expect(getStorageItem('test-key')).toBe('hello');
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem('test-key', 'not valid json {');
      expect(getStorageItem('test-key')).toBeNull();
    });

    it('returns null for empty string', () => {
      localStorage.setItem('test-key', '');
      expect(getStorageItem('test-key')).toBeNull();
    });

    it('handles nested objects', () => {
      const nested = { a: { b: { c: 'deep' } } };
      localStorage.setItem('test-key', JSON.stringify(nested));
      expect(getStorageItem('test-key')).toEqual(nested);
    });
  });

  describe('setStorageItem', () => {
    it('stores object as JSON', () => {
      setStorageItem('test-key', { foo: 'bar' });
      expect(localStorage.getItem('test-key')).toBe('{"foo":"bar"}');
    });

    it('stores array as JSON', () => {
      setStorageItem('test-key', [1, 2, 3]);
      expect(localStorage.getItem('test-key')).toBe('[1,2,3]');
    });

    it('stores number as JSON', () => {
      setStorageItem('test-key', 42);
      expect(localStorage.getItem('test-key')).toBe('42');
    });

    it('stores boolean as JSON', () => {
      setStorageItem('test-key', true);
      expect(localStorage.getItem('test-key')).toBe('true');
    });

    it('stores string as JSON', () => {
      setStorageItem('test-key', 'hello');
      expect(localStorage.getItem('test-key')).toBe('"hello"');
    });

    it('stores null as JSON', () => {
      setStorageItem('test-key', null);
      expect(localStorage.getItem('test-key')).toBe('null');
    });

    it('overwrites existing values', () => {
      setStorageItem('test-key', { old: 'value' });
      setStorageItem('test-key', { new: 'value' });
      expect(getStorageItem('test-key')).toEqual({ new: 'value' });
    });
  });
});
