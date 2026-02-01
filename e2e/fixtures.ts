import { test as base, expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const EXTENSION_PATH = path.join(__dirname, '../dist');

export const test = base.extend<{
  extensionPage: Page;
}>({
  extensionPage: async ({ context }, use) => {
    const extensionScript = fs.existsSync(path.join(EXTENSION_PATH, 'content.js'))
      ? fs.readFileSync(path.join(EXTENSION_PATH, 'content.js'), 'utf-8')
      : '';

    const page = await context.newPage();

    if (extensionScript) {
      await page.addInitScript(extensionScript);
    }

    await use(page);
  },
});

export { expect };

export async function waitForTreeView(page: Page): Promise<void> {
  await page.waitForSelector('#n8n-tree-view', { timeout: 10000 });
}

export async function waitForSidebar(page: Page): Promise<void> {
  await page.waitForSelector('#sidebar', { timeout: 10000 });
}

export async function mockN8nApi(page: Page): Promise<void> {
  await page.route('**/rest/workflows**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 'wf-1', name: 'Test Workflow 1' },
          { id: 'wf-2', name: 'Test Workflow 2' },
          { id: 'folder-1', name: 'Test Folder', resource: 'folder', workflowCount: 2 },
        ],
      }),
    });
  });

  await page.route('**/rest/folders/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 'folder-1', name: 'Test Folder', resource: 'folder', parentFolderId: '0' },
      }),
    });
  });
}

export async function navigateToWorkflows(page: Page, projectId = 'test-project'): Promise<void> {
  await page.goto(`/projects/${projectId}/workflows`);
}

export async function navigateToWorkflow(page: Page, workflowId: string): Promise<void> {
  await page.goto(`/workflow/${workflowId}`);
}

export async function navigateToVariables(page: Page): Promise<void> {
  await page.goto('/variables');
}
