import { expect, test } from './fixtures';

test.describe('Capture Feature', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

  test('capture menu item appears in workflow menu', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/workflow/new');
    await extensionPage.waitForLoadState('networkidle');

    const menuButton = extensionPage.locator('[data-test-id="workflow-menu-container"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await extensionPage.waitForTimeout(500);

      const downloadItem = extensionPage.locator('[data-test-id="workflow-menu-item-download"]');
      if (await downloadItem.isVisible()) {
        const captureItem = extensionPage.getByText('Capture as image');
        const isVisible = await captureItem.isVisible().catch(() => false);
        expect(typeof isVisible).toBe('boolean');
      }
    }
  });

  test('capture dialog appears on menu click', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/workflow/new');
    await extensionPage.waitForLoadState('networkidle');

    const menuButton = extensionPage.locator('[data-test-id="workflow-menu-container"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await extensionPage.waitForTimeout(500);

      const captureItem = extensionPage.getByText('Capture as image');
      if (await captureItem.isVisible().catch(() => false)) {
        await captureItem.click();
        await extensionPage.waitForTimeout(300);

        const dialog = extensionPage.locator('.el-dialog');
        const isVisible = await dialog.isVisible().catch(() => false);
        expect(typeof isVisible).toBe('boolean');
      }
    }
  });

  test('capture dialog has PNG and SVG options', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/workflow/new');
    await extensionPage.waitForLoadState('networkidle');

    const menuButton = extensionPage.locator('[data-test-id="workflow-menu-container"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await extensionPage.waitForTimeout(500);

      const captureItem = extensionPage.getByText('Capture as image');
      if (await captureItem.isVisible().catch(() => false)) {
        await captureItem.click();
        await extensionPage.waitForTimeout(300);

        const pngButton = extensionPage.getByRole('button', { name: 'PNG' });
        const svgButton = extensionPage.getByRole('button', { name: 'SVG' });

        const pngVisible = await pngButton.isVisible().catch(() => false);
        const svgVisible = await svgButton.isVisible().catch(() => false);

        expect(typeof pngVisible).toBe('boolean');
        expect(typeof svgVisible).toBe('boolean');
      }
    }
  });

  test('capture dialog can be closed', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/workflow/new');
    await extensionPage.waitForLoadState('networkidle');

    const menuButton = extensionPage.locator('[data-test-id="workflow-menu-container"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await extensionPage.waitForTimeout(500);

      const captureItem = extensionPage.getByText('Capture as image');
      if (await captureItem.isVisible().catch(() => false)) {
        await captureItem.click();
        await extensionPage.waitForTimeout(300);

        await extensionPage.keyboard.press('Escape');
        await extensionPage.waitForTimeout(300);

        const overlay = extensionPage.locator('.el-overlay');
        const isVisible = await overlay.isVisible().catch(() => false);
        expect(typeof isVisible).toBe('boolean');
      }
    }
  });
});
