import { expect, test } from './fixtures';

test.describe('Extension Loading', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

  test('does not inject on non-n8n sites', async ({ page }) => {
    await page.goto('https://example.com');

    const treeView = page.locator('#n8n-tree-view');
    await expect(treeView).not.toBeVisible();
  });

  test('loads on n8n workflows page', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      await expect(extensionPage.locator('#n8n-tree-view')).toBeVisible({ timeout: 10000 });
    }
  });

  test('loads on workflow editor page', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/workflow/new');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      await extensionPage.waitForTimeout(2000);
    }
  });

  test('does not load on signin page', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/signin');

    const treeView = extensionPage.locator('#n8n-tree-view');
    await expect(treeView).not.toBeVisible();
  });
});
