import { test, expect } from '@playwright/test';

test.describe('Program Block Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button[data-tab="program"]').click();
  });

  test('should add a text block', async ({ page }) => {
    await page.locator('#addTextBlock').click();
    
    const blocks = page.locator('.program-block.text-block');
    await expect(blocks).toHaveCount(1);
    
    const textarea = blocks.first().locator('textarea');
    await expect(textarea).toBeVisible();
  });

  test('should add a move block', async ({ page }) => {
    await page.locator('#addMoveBlock').click();
    
    const blocks = page.locator('.program-block.move-block');
    await expect(blocks).toHaveCount(1);
    
    const directionInput = blocks.first().locator('input[type="number"]').first();
    const degreesInput = blocks.first().locator('input[type="number"]').nth(1);
    
    await expect(directionInput).toBeVisible();
    await expect(degreesInput).toBeVisible();
  });

  test('should validate move block direction', async ({ page }) => {
    await page.locator('#addMoveBlock').click();
    
    const block = page.locator('.program-block.move-block').first();
    const directionInput = block.locator('input[type="number"]').first();
    
    // Invalid direction
    await directionInput.fill('150');
    await directionInput.blur();
    
    // Wait a bit for validation to trigger
    await page.waitForTimeout(100);
    
    await expect(block).toHaveClass(/invalid/);
  });

  test('should accept valid move block values', async ({ page }) => {
    await page.locator('#addMoveBlock').click();
    
    const block = page.locator('.program-block.move-block').first();
    const directionInput = block.locator('input[type="number"]').first();
    const degreesInput = block.locator('input[type="number"]').nth(1);
    
    await directionInput.fill('50');
    await degreesInput.fill('720');
    await degreesInput.blur();
    
    await expect(block).not.toHaveClass(/invalid/);
  });

  test('should add multiple blocks', async ({ page }) => {
    await page.locator('#addTextBlock').click();
    await page.locator('#addMoveBlock').click();
    await page.locator('#addMoveBlock').click();
    await page.locator('#addTextBlock').click();
    
    const allBlocks = page.locator('.program-block');
    await expect(allBlocks).toHaveCount(4);
    
    const textBlocks = page.locator('.text-block');
    const moveBlocks = page.locator('.move-block');
    await expect(textBlocks).toHaveCount(2);
    await expect(moveBlocks).toHaveCount(2);
  });
});
