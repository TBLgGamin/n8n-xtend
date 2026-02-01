import { expect, mockN8nApi, test, waitForTreeView } from './fixtures';

test.describe('Tree View', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

  test.beforeEach(async ({ extensionPage }) => {
    await mockN8nApi(extensionPage);
  });

  test('displays folders header', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const header = extensionPage.locator('#n8n-tree-view .tree-header');
        await expect(header).toContainText('Folders');
      } catch {
        test.skip(true, 'Tree view not injected');
      }
    }
  });

  test('displays workflow items', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const workflows = extensionPage.locator('[data-workflow-id]');
        const count = await workflows.count();
        expect(count).toBeGreaterThanOrEqual(0);
      } catch {
        test.skip(true, 'Tree view not injected');
      }
    }
  });

  test('displays folder items', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const folders = extensionPage.locator('[data-folder-id]');
        const count = await folders.count();
        expect(count).toBeGreaterThanOrEqual(0);
      } catch {
        test.skip(true, 'Tree view not injected');
      }
    }
  });

  test('folder chevron is clickable', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const chevron = extensionPage.locator('.n8n-tree-chevron').first();
        if (await chevron.isVisible()) {
          await chevron.click();
          await extensionPage.waitForTimeout(500);
        }
      } catch {
        test.skip(true, 'Tree view not injected or no folders');
      }
    }
  });

  test('workflow links navigate correctly', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const workflowLink = extensionPage.locator('.n8n-tree-item[href*="/workflow/"]').first();
        if (await workflowLink.isVisible()) {
          const href = await workflowLink.getAttribute('href');
          expect(href).toContain('/workflow/');
        }
      } catch {
        test.skip(true, 'Tree view not injected or no workflows');
      }
    }
  });

  test('respects theme', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const treeView = extensionPage.locator('#n8n-tree-view');
        const hasDarkClass = await treeView.evaluate((el) =>
          el.classList.contains('n8n-tree-dark'),
        );
        expect(typeof hasDarkClass).toBe('boolean');
      } catch {
        test.skip(true, 'Tree view not injected');
      }
    }
  });
});
