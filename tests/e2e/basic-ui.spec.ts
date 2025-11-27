import { test, expect } from '@playwright/test';

test.describe('Mission Path Planner - Basic UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Mission Path Planner' })).toBeVisible();
    await expect(page.locator('#missionCanvas')).toBeVisible();
  });

  test('should switch between Setup and Program tabs', async ({ page }) => {
    const setupTab = page.locator('button[data-tab="setup"]');
    const programTab = page.locator('button[data-tab="program"]');
    
    // Program tab is now the default active tab
    await expect(programTab).toHaveClass(/active/);
    await expect(page.locator('#programBlocks')).toBeVisible();
    
    await setupTab.click();
    await expect(setupTab).toHaveClass(/active/);
    await expect(programTab).not.toHaveClass(/active/);
    
    // Setup content should be visible
    await expect(page.locator('#teamName')).toBeVisible();
  });

  test('should collapse and expand sections', async ({ page }) => {
    // Navigate to Setup tab first (Program is now default)
    await page.locator('button[data-tab="setup"]').click();
    
    const teamInfoHeader = page.locator('.section-header').filter({ hasText: 'Team Info' });
    const section = page.locator('.section').filter({ has: teamInfoHeader });
    
    await expect(section).not.toHaveClass(/collapsed/);
    
    await teamInfoHeader.click();
    await expect(section).toHaveClass(/collapsed/);
    
    await teamInfoHeader.click();
    await expect(section).not.toHaveClass(/collapsed/);
  });

  test('should load robot presets', async ({ page }) => {
    // Navigate to Setup tab first (Program is now default)
    await page.locator('button[data-tab="setup"]').click();
    
    const presetSelect = page.locator('#robotPreset');
    const lengthInput = page.locator('#robotLength');
    
    await presetSelect.selectOption('dadbot');
    await expect(lengthInput).toHaveValue('16.5');
    
    await presetSelect.selectOption('coopbot');
    await expect(lengthInput).toHaveValue('12');
  });

  test('should change mat selection', async ({ page }) => {
    // Navigate to Setup tab first (Program is now default)
    await page.locator('button[data-tab="setup"]').click();
    
    const matSelect = page.locator('#matSelect');
    const customUrlGroup = page.locator('#customMatUrlGroup');
    
    await expect(customUrlGroup).not.toBeVisible();
    
    await matSelect.selectOption('custom');
    await expect(customUrlGroup).toBeVisible();
    
    await matSelect.selectOption('blank');
    await expect(customUrlGroup).not.toBeVisible();
  });
});
