import { test, expect } from '@playwright/test';

test.describe('Print Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should trigger print dialog', async ({ page }) => {
    // Mock window.print
    await page.evaluate(() => {
      (window as any).printCalled = false;
      window.print = () => {
        (window as any).printCalled = true;
      };
    });
    
    await page.locator('#printBtn').click();
    
    // Verify print was called
    const printCalled = await page.evaluate(() => (window as any).printCalled);
    expect(printCalled).toBe(true);
  });

  test('should respect print robot config checkbox', async ({ page }) => {
    const checkbox = page.getByLabel('Include Robot Configuration in Print');
    
    await expect(checkbox).not.toBeChecked();
    
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test('should update plan date', async ({ page }) => {
    const planDate = page.locator('#planDate');
    
    await planDate.fill('2025-12-25');
    await expect(planDate).toHaveValue('2025-12-25');
  });
});
