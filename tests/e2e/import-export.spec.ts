import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should export JSON configuration', async ({ page }) => {
    // Navigate to Setup tab first (Program is now default)
    await page.locator('button[data-tab="setup"]').click();
    
    // Set team name
    await page.locator('#teamName').fill('Test Team');
    
    // Switch back to Program tab to add a block
    await page.locator('button[data-tab="program"]').click();
    await page.locator('#addMoveBlock').click();
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportBtn').click();
    const download = await downloadPromise;
    
    // Verify filename pattern
    expect(download.suggestedFilename()).toMatch(/^test-team-\d{4}-\d{2}-\d{2}\.json$/);
    
    // Save and validate content
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const downloadPath = path.join(tempDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const content = fs.readFileSync(downloadPath, 'utf-8');
    const data = JSON.parse(content);
    
    expect(data.version).toBeDefined();
    expect(data.exportDate).toBeDefined();
    expect(data.teamInfo.name).toBe('Test Team');
    expect(data.program).toBeInstanceOf(Array);
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should trigger import file dialog', async ({ page }) => {
    const importBtn = page.locator('#importBtn');
    
    // Click should trigger file input
    await importBtn.click();
    
    const fileInput = page.locator('#importFile');
    await expect(fileInput).toHaveAttribute('type', 'file');
  });
});
