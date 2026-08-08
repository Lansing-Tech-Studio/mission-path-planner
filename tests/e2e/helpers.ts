import { Page } from '@playwright/test';

/**
 * Switch to the Setup tab and expand every section in it. Setup sections ship
 * collapsed, so controls inside them are not clickable until opened.
 */
export async function openSetup(page: Page) {
  await page.locator('button[data-tab="setup"]').click();
  const collapsed = page.locator('.tab-content[data-tab="setup"] .section.collapsed > .section-header');
  // Re-resolve each time: expanding a section drops it from the match set, and
  // outer sections come first, so a nested one is clickable by the time it's first.
  while (await collapsed.count()) {
    await collapsed.first().click();
  }
}
