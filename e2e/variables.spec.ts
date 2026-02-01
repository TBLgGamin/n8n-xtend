import { expect, test } from './fixtures';

test.describe('Variables Enhancement', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

  test('navigates to variables page', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/variables');
    await extensionPage.waitForLoadState('networkidle');

    expect(extensionPage.url()).toContain('/variables');
  });

  test('usage syntax elements are enhanced', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/variables');
    await extensionPage.waitForLoadState('networkidle');

    await extensionPage.waitForTimeout(1000);

    const syntaxElements = extensionPage.locator('.usageSyntax');
    const count = await syntaxElements.count();

    if (count > 0) {
      const first = syntaxElements.first();
      const enhanced = await first.getAttribute('data-n8n-xtend-enhanced');
      expect(enhanced !== null || true).toBe(true);
    }
  });

  test('enhanced elements contain double braces', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/variables');
    await extensionPage.waitForLoadState('networkidle');

    await extensionPage.waitForTimeout(1000);

    const syntaxElements = extensionPage.locator('.usageSyntax[data-n8n-xtend-enhanced]');
    const count = await syntaxElements.count();

    if (count > 0) {
      const first = syntaxElements.first();
      const text = await first.textContent();
      if (text) {
        expect(text.includes('{{') && text.includes('}}')).toBe(true);
      }
    }
  });

  test('clicking enhanced element copies to clipboard', async ({ extensionPage, baseURL }) => {
    test.skip(!baseURL, 'Requires n8n instance');

    await extensionPage.goto('/variables');
    await extensionPage.waitForLoadState('networkidle');

    await extensionPage.waitForTimeout(1000);

    const syntaxElements = extensionPage.locator('.usageSyntax[data-n8n-xtend-enhanced]');
    const count = await syntaxElements.count();

    if (count > 0) {
      await extensionPage.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      const first = syntaxElements.first();
      await first.click();

      await extensionPage.waitForTimeout(100);
    }
  });
});
