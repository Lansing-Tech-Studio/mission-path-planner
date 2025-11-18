import { test, expect } from '@playwright/test';

test.describe('Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render canvas', async ({ page }) => {
    const canvas = page.locator('#missionCanvas');
    await expect(canvas).toBeVisible();
    
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('should update start position inputs', async ({ page }) => {
    const startX = page.locator('#startX');
    const startY = page.locator('#startY');
    
    await startX.fill('50');
    await startY.fill('60');
    
    // Inputs should reflect new values
    await expect(startX).toHaveValue('50');
    await expect(startY).toHaveValue('60');
  });

  test('should update start angle', async ({ page }) => {
    const startAngle = page.locator('#startAngle');
    
    await startAngle.fill('45');
    await expect(startAngle).toHaveValue('45');
    
    await startAngle.fill('90');
    await expect(startAngle).toHaveValue('90');
  });

  test('should update mat alignment', async ({ page }) => {
    const matAlignment = page.locator('#matAlignment');
    
    await matAlignment.selectOption('right');
    await expect(matAlignment).toHaveValue('right');
    
    await matAlignment.selectOption('centered');
    await expect(matAlignment).toHaveValue('centered');
  });
});
