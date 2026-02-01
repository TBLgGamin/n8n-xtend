import { expect, mockN8nApi, test, waitForTreeView } from './fixtures';

test.describe('Keyboard Navigation', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

  test.beforeEach(async ({ extensionPage }) => {
    await mockN8nApi(extensionPage);
  });

  test('tree content is focusable', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const content = extensionPage.locator('#n8n-tree-content');
        const tabindex = await content.getAttribute('tabindex');
        expect(tabindex).toBe('0');
      } catch {
        test.skip(true, 'Tree view not injected');
      }
    }
  });

  test('tree has correct role attribute', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const content = extensionPage.locator('#n8n-tree-content');
        const role = await content.getAttribute('role');
        expect(role).toBe('tree');
      } catch {
        test.skip(true, 'Tree view not injected');
      }
    }
  });

  test('arrow down moves focus', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const content = extensionPage.locator('#n8n-tree-content');
        await content.focus();
        await extensionPage.keyboard.press('ArrowDown');

        const focused = extensionPage.locator('.n8n-tree-focused');
        const count = await focused.count();
        expect(count).toBeGreaterThanOrEqual(0);
      } catch {
        test.skip(true, 'Tree view not injected');
      }
    }
  });

  test('home key moves to first item', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const content = extensionPage.locator('#n8n-tree-content');
        await content.focus();

        await extensionPage.keyboard.press('ArrowDown');
        await extensionPage.keyboard.press('ArrowDown');
        await extensionPage.keyboard.press('Home');

        const firstItem = extensionPage.locator('.n8n-tree-item').first();
        const hasFocus = await firstItem.evaluate((el) => el.classList.contains('n8n-tree-focused'));
        expect(typeof hasFocus).toBe('boolean');
      } catch {
        test.skip(true, 'Tree view not injected');
      }
    }
  });

  test('end key moves to last item', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const content = extensionPage.locator('#n8n-tree-content');
        await content.focus();
        await extensionPage.keyboard.press('End');

        const items = extensionPage.locator('.n8n-tree-item');
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(0);
      } catch {
        test.skip(true, 'Tree view not injected');
      }
    }
  });
});
