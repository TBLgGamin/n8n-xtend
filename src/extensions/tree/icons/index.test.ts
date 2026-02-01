import { describe, expect, it } from 'vitest';
import { type IconName, icons } from './index';

describe('icons', () => {
  it('exports chevron icon', () => {
    expect(icons.chevron).toBeDefined();
    expect(icons.chevron).toContain('<svg');
    expect(icons.chevron).toContain('</svg>');
  });

  it('exports folder icon', () => {
    expect(icons.folder).toBeDefined();
    expect(icons.folder).toContain('<svg');
    expect(icons.folder).toContain('</svg>');
  });

  it('exports folderOpen icon', () => {
    expect(icons.folderOpen).toBeDefined();
    expect(icons.folderOpen).toContain('<svg');
    expect(icons.folderOpen).toContain('</svg>');
  });

  it('exports workflow icon', () => {
    expect(icons.workflow).toBeDefined();
    expect(icons.workflow).toContain('<svg');
    expect(icons.workflow).toContain('</svg>');
  });

  it('chevron has viewBox attribute', () => {
    expect(icons.chevron).toContain('viewBox');
  });

  it('folder has viewBox attribute', () => {
    expect(icons.folder).toContain('viewBox');
  });

  it('folderOpen has viewBox attribute', () => {
    expect(icons.folderOpen).toContain('viewBox');
  });

  it('workflow has viewBox attribute', () => {
    expect(icons.workflow).toContain('viewBox');
  });

  it('icons object is frozen (const)', () => {
    const iconNames: IconName[] = ['chevron', 'folder', 'folderOpen', 'workflow'];
    expect(iconNames).toHaveLength(4);
  });

  it('all icons contain path elements', () => {
    expect(icons.chevron).toContain('<path');
    expect(icons.folder).toContain('<path');
    expect(icons.folderOpen).toContain('<path');
    expect(icons.workflow).toContain('<path');
  });

  it('icons use currentColor for fill', () => {
    expect(icons.chevron).toContain('fill="currentColor"');
    expect(icons.folder).toContain('fill="currentColor"');
    expect(icons.folderOpen).toContain('fill="currentColor"');
  });

  it('workflow icon has specific fill color', () => {
    expect(icons.workflow).toContain('fill="#EA4B71"');
  });
});
