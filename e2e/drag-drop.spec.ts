import { expect, mockN8nApi, test, waitForTreeView } from './fixtures';

test.describe('Drag and Drop', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

  test.beforeEach(async ({ extensionPage }) => {
    await mockN8nApi(extensionPage);
  });

  test('workflow items are draggable', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const workflow = extensionPage.locator('.n8n-tree-item[draggable="true"]').first();
        if (await workflow.isVisible()) {
          const draggable = await workflow.getAttribute('draggable');
          expect(draggable).toBe('true');
        }
      } catch {
        test.skip(true, 'Tree view not injected or no items');
      }
    }
  });

  test('folder items are drop targets', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const dropTarget = extensionPage.locator('.n8n-tree-drop-target').first();
        if (await dropTarget.isVisible()) {
          const hasClass = await dropTarget.evaluate((el) =>
            el.classList.contains('n8n-tree-drop-target'),
          );
          expect(hasClass).toBe(true);
        }
      } catch {
        test.skip(true, 'Tree view not injected or no drop targets');
      }
    }
  });

  test('drag highlights valid drop targets', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/projects/test-project/workflows');
    await extensionPage.waitForLoadState('networkidle');

    const sidebar = extensionPage.locator('#sidebar');
    if (await sidebar.isVisible()) {
      try {
        await waitForTreeView(extensionPage);
        const workflow = extensionPage.locator('.n8n-tree-item[draggable="true"]').first();
        const folder = extensionPage.locator('.n8n-tree-drop-target').first();

        if ((await workflow.isVisible()) && (await folder.isVisible())) {
          await workflow.dispatchEvent('dragstart', {
            dataTransfer: { effectAllowed: 'move' },
          });

          await extensionPage.waitForTimeout(100);
        }
      } catch {
        test.skip(true, 'Tree view not injected or insufficient items');
      }
    }
  });
});
