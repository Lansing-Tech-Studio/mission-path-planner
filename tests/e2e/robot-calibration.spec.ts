import { test, expect } from '@playwright/test';
import { openSetup } from './helpers';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Robot Calibration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Calibration lives in the Setup tab (Program is the default tab).
    await openSetup(page);
  });

  test('shows the three calibration inputs with defaults', async ({ page }) => {
    await expect(page.locator('#calDistanceFactor')).toHaveValue('1');
    await expect(page.locator('#calTurnFactor')).toHaveValue('1');
    await expect(page.locator('#calDriftOffset')).toHaveValue('0');
  });

  test('editing a factor re-renders without error and persists in export', async ({ page }) => {
    await page.locator('#calDistanceFactor').fill('1.3');
    await page.locator('#calDriftOffset').fill('10');

    // No inline validation error should be shown for valid values.
    await expect(page.locator('#calDistanceFactorError')).toHaveText('');

    // The value should be carried into the exported JSON (round-trip persistence).
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportBtn').click();
    const download = await downloadPromise;

    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const downloadPath = path.join(tempDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    const data = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'));
    fs.unlinkSync(downloadPath);

    expect(data.robot.calibration).toEqual({
      distanceFactor: 1.3,
      turnFactor: 1,
      driftOffset: 10
    });
  });

  test('out-of-range value shows an inline error', async ({ page }) => {
    await page.locator('#calDistanceFactor').fill('5');
    await expect(page.locator('#calDistanceFactor')).toHaveClass(/invalid/);
    await expect(page.locator('#calDistanceFactorError')).toContainText('between 0.5 and 2');
  });

  test('Reset to Defaults restores all three factors', async ({ page }) => {
    await page.locator('#calDistanceFactor').fill('1.4');
    await page.locator('#calTurnFactor').fill('0.7');
    await page.locator('#calDriftOffset').fill('15');

    await page.locator('#resetCalibrationBtn').click();

    await expect(page.locator('#calDistanceFactor')).toHaveValue('1');
    await expect(page.locator('#calTurnFactor')).toHaveValue('1');
    await expect(page.locator('#calDriftOffset')).toHaveValue('0');
  });

  test('How to Calibrate help section expands', async ({ page }) => {
    const helpSection = page.locator('.section.calibration-help');
    const helpHeader = helpSection.locator('.section-header');

    // Expanded by default; clicking toggles it collapsed.
    await expect(helpSection).not.toHaveClass(/collapsed/);
    await helpHeader.click();
    await expect(helpSection).toHaveClass(/collapsed/);
  });
});
