import { beforeEach, describe, expect, it } from 'vitest';
import { isFolderExpanded, setFolderExpanded } from './state';

describe('state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('isFolderExpanded', () => {
    it('returns false for non-expanded folder', () => {
      expect(isFolderExpanded('folder-1')).toBe(false);
    });

    it('returns true for expanded folder', () => {
      localStorage.setItem('n8ntree-expanded', JSON.stringify({ 'folder-1': true }));
      expect(isFolderExpanded('folder-1')).toBe(true);
    });

    it('returns false for folder not in storage', () => {
      localStorage.setItem('n8ntree-expanded', JSON.stringify({ 'folder-2': true }));
      expect(isFolderExpanded('folder-1')).toBe(false);
    });

    it('returns false when storage is empty object', () => {
      localStorage.setItem('n8ntree-expanded', JSON.stringify({}));
      expect(isFolderExpanded('folder-1')).toBe(false);
    });

    it('handles invalid JSON in storage', () => {
      localStorage.setItem('n8ntree-expanded', 'invalid json');
      expect(isFolderExpanded('folder-1')).toBe(false);
    });
  });

  describe('setFolderExpanded', () => {
    it('expands folder', () => {
      setFolderExpanded('folder-1', true);
      expect(isFolderExpanded('folder-1')).toBe(true);
    });

    it('collapses folder', () => {
      setFolderExpanded('folder-1', true);
      setFolderExpanded('folder-1', false);
      expect(isFolderExpanded('folder-1')).toBe(false);
    });

    it('preserves other folder states when expanding', () => {
      setFolderExpanded('folder-1', true);
      setFolderExpanded('folder-2', true);
      expect(isFolderExpanded('folder-1')).toBe(true);
      expect(isFolderExpanded('folder-2')).toBe(true);
    });

    it('preserves other folder states when collapsing', () => {
      setFolderExpanded('folder-1', true);
      setFolderExpanded('folder-2', true);
      setFolderExpanded('folder-1', false);
      expect(isFolderExpanded('folder-1')).toBe(false);
      expect(isFolderExpanded('folder-2')).toBe(true);
    });

    it('removes folder from storage when collapsed', () => {
      setFolderExpanded('folder-1', true);
      setFolderExpanded('folder-1', false);
      const stored = JSON.parse(localStorage.getItem('n8ntree-expanded') || '{}');
      expect(stored['folder-1']).toBeUndefined();
    });

    it('stores true value when expanded', () => {
      setFolderExpanded('folder-1', true);
      const stored = JSON.parse(localStorage.getItem('n8ntree-expanded') || '{}');
      expect(stored['folder-1']).toBe(true);
    });

    it('handles multiple expand/collapse cycles', () => {
      setFolderExpanded('folder-1', true);
      setFolderExpanded('folder-1', false);
      setFolderExpanded('folder-1', true);
      expect(isFolderExpanded('folder-1')).toBe(true);
    });

    it('works with various folder ID formats', () => {
      setFolderExpanded('abc123', true);
      setFolderExpanded('folder-with-dashes', true);
      setFolderExpanded('123', true);
      expect(isFolderExpanded('abc123')).toBe(true);
      expect(isFolderExpanded('folder-with-dashes')).toBe(true);
      expect(isFolderExpanded('123')).toBe(true);
    });
  });
});
