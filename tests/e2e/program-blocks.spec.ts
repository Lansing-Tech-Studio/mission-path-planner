import { test, expect } from '@playwright/test';

test.describe('Program Block Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('button[data-tab="program"]').click();
  });

  test('should add a text block', async ({ page }) => {
    await page.locator('#addTextBlock').click();
    
    // Check that a block was created by evaluating internal state
    const blockCount = await page.evaluate(() => {
      return (window as any).missionPlanner.blocks.blocks.length;
    });
    expect(blockCount).toBe(1);
    
    const blockType = await page.evaluate(() => {
      return (window as any).missionPlanner.blocks.blocks[0].type;
    });
    expect(blockType).toBe('text');
    
    // Verify Blockly rendered the block
    const blocklyBlocks = page.locator('.blocklyDraggable');
    await expect(blocklyBlocks.first()).toBeVisible();
  });

  test('should add a move block', async ({ page }) => {
    await page.locator('#addMoveBlock').click();
    
    // Check internal state for move block
    const blockCount = await page.evaluate(() => {
      return (window as any).missionPlanner.blocks.blocks.length;
    });
    expect(blockCount).toBe(1);
    
    const blockType = await page.evaluate(() => {
      return (window as any).missionPlanner.blocks.blocks[0].type;
    });
    expect(blockType).toBe('move');
    
    // Verify Blockly SVG blocks are rendered
    const blocklyBlocks = page.locator('.blocklyDraggable');
    await expect(blocklyBlocks.first()).toBeVisible();
  });

  test('should validate move block direction', async ({ page }) => {
    await page.locator('#addMoveBlock').click();
    
    // Update block with invalid direction via JavaScript
    await page.evaluate(() => {
      const bm = (window as any).missionPlanner.blocks;
      const blockId = bm.blocks[0].id;
      bm.updateBlock(blockId, 'direction', 150); // invalid
    });
    
    // Check that block is marked as invalid in internal state
    const isValid = await page.evaluate(() => {
      return (window as any).missionPlanner.blocks.blocks[0].valid;
    });
    expect(isValid).toBe(false);
  });

  test('should accept valid move block values', async ({ page }) => {
    await page.locator('#addMoveBlock').click();
    
    // Update with valid values
    await page.evaluate(() => {
      const bm = (window as any).missionPlanner.blocks;
      const blockId = bm.blocks[0].id;
      bm.updateBlock(blockId, 'direction', 50);
      bm.updateBlock(blockId, 'degrees', 720);
    });
    
    // Check validity
    const isValid = await page.evaluate(() => {
      return (window as any).missionPlanner.blocks.blocks[0].valid;
    });
    expect(isValid).toBe(true);
  });

  test('should add multiple blocks', async ({ page }) => {
    await page.locator('#addTextBlock').click();
    await page.locator('#addMoveBlock').click();
    await page.locator('#addMoveBlock').click();
    await page.locator('#addTextBlock').click();
    
    // Check internal state
    const blockCount = await page.evaluate(() => {
      return (window as any).missionPlanner.blocks.blocks.length;
    });
    expect(blockCount).toBe(4);
    
    const types = await page.evaluate(() => {
      return (window as any).missionPlanner.blocks.blocks.map((b: any) => b.type);
    });
    
    const textCount = types.filter((t: string) => t === 'text').length;
    const moveCount = types.filter((t: string) => t === 'move').length;
    
    expect(textCount).toBe(2);
    expect(moveCount).toBe(2);
  });
});
