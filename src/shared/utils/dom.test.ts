import { beforeEach, describe, expect, it } from 'vitest';
import { findElementByClassPattern, findElementBySelectors } from './dom';

describe('findElementBySelectors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds element by first selector', () => {
    document.body.innerHTML = '<div class="target">Found</div>';
    const result = findElementBySelectors(document, ['.target', '.other']);
    expect(result?.textContent).toBe('Found');
  });

  it('finds element by second selector if first not found', () => {
    document.body.innerHTML = '<div class="other">Found</div>';
    const result = findElementBySelectors(document, ['.target', '.other']);
    expect(result?.textContent).toBe('Found');
  });

  it('returns null when no selector matches', () => {
    document.body.innerHTML = '<div class="something">Not found</div>';
    const result = findElementBySelectors(document, ['.target', '.other']);
    expect(result).toBeNull();
  });

  it('searches within parent element', () => {
    document.body.innerHTML = `
      <div id="parent">
        <div class="child">Child</div>
      </div>
      <div class="child">Outside</div>
    `;
    const parent = document.getElementById('parent') as HTMLElement;
    const result = findElementBySelectors(parent, ['.child']);
    expect(result?.textContent).toBe('Child');
  });

  it('returns first matching element', () => {
    document.body.innerHTML = `
      <div class="target">First</div>
      <div class="target">Second</div>
    `;
    const result = findElementBySelectors(document, ['.target']);
    expect(result?.textContent).toBe('First');
  });

  it('handles empty selectors array', () => {
    document.body.innerHTML = '<div class="target">Found</div>';
    const result = findElementBySelectors(document, []);
    expect(result).toBeNull();
  });

  it('finds by ID selector', () => {
    document.body.innerHTML = '<div id="myId">Found</div>';
    const result = findElementBySelectors(document, ['#myId']);
    expect(result?.textContent).toBe('Found');
  });

  it('finds by tag name', () => {
    document.body.innerHTML = '<span>Found</span>';
    const result = findElementBySelectors(document, ['span']);
    expect(result?.textContent).toBe('Found');
  });

  it('finds by data attribute', () => {
    document.body.innerHTML = '<div data-test-id="target">Found</div>';
    const result = findElementBySelectors(document, ['[data-test-id="target"]']);
    expect(result?.textContent).toBe('Found');
  });
});

describe('findElementByClassPattern', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds element with class containing pattern', () => {
    document.body.innerHTML = '<div class="_sideMenu_abc123">Found</div>';
    const parent = document.body;
    const result = findElementByClassPattern(parent, ['_sideMenu_']);
    expect(result?.textContent).toBe('Found');
  });

  it('finds element matching first pattern', () => {
    document.body.innerHTML = '<div class="_projects_xyz">Found</div>';
    const parent = document.body;
    const result = findElementByClassPattern(parent, ['_sideMenu_', '_projects_']);
    expect(result?.textContent).toBe('Found');
  });

  it('returns null when no pattern matches', () => {
    document.body.innerHTML = '<div class="other-class">Not found</div>';
    const parent = document.body;
    const result = findElementByClassPattern(parent, ['_sideMenu_', '_projects_']);
    expect(result).toBeNull();
  });

  it('handles multiple classes on element', () => {
    document.body.innerHTML = '<div class="foo _menuContent_123 bar">Found</div>';
    const parent = document.body;
    const result = findElementByClassPattern(parent, ['_menuContent_']);
    expect(result?.textContent).toBe('Found');
  });

  it('returns null for empty patterns array', () => {
    document.body.innerHTML = '<div class="_sideMenu_abc">Found</div>';
    const parent = document.body;
    const result = findElementByClassPattern(parent, []);
    expect(result).toBeNull();
  });

  it('searches nested elements', () => {
    document.body.innerHTML = `
      <div class="parent">
        <div class="child">
          <div class="_bottomMenu_xyz">Found</div>
        </div>
      </div>
    `;
    const parent = document.body;
    const result = findElementByClassPattern(parent, ['_bottomMenu_']);
    expect(result?.textContent).toBe('Found');
  });

  it('returns first matching element when multiple match', () => {
    document.body.innerHTML = `
      <div class="_sideMenu_first">First</div>
      <div class="_sideMenu_second">Second</div>
    `;
    const parent = document.body;
    const result = findElementByClassPattern(parent, ['_sideMenu_']);
    expect(result?.textContent).toBe('First');
  });
});
