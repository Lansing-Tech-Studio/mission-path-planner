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
    // Navigate to Setup tab first (Program is now default)
    await page.locator('button[data-tab="setup"]').click();
    
    const startX = page.locator('#startX');
    const startY = page.locator('#startY');
    
    await startX.fill('50');
    await startY.fill('60');
    
    // Inputs should reflect new values
    await expect(startX).toHaveValue('50');
    await expect(startY).toHaveValue('60');
  });

  test('should update start angle', async ({ page }) => {
    // Navigate to Setup tab first (Program is now default)
    await page.locator('button[data-tab="setup"]').click();
    
    const startAngle = page.locator('#startAngle');
    
    await startAngle.fill('45');
    await expect(startAngle).toHaveValue('45');
    
    await startAngle.fill('90');
    await expect(startAngle).toHaveValue('90');
  });

  test('should update mat alignment', async ({ page }) => {
    // Navigate to Setup tab first (Program is now default)
    await page.locator('button[data-tab="setup"]').click();
    
    const matAlignment = page.locator('#matAlignment');
    
    await matAlignment.selectOption('right');
    await expect(matAlignment).toHaveValue('right');
    
    await matAlignment.selectOption('centered');
    await expect(matAlignment).toHaveValue('centered');
  });

  test('dragging a rotated robot to the left edge leaves it touching the edge', async ({ page }) => {
    await page.locator('button[data-tab="setup"]').click();
    await page.locator('#robotPreset').selectOption('dadbot');
    await page.locator('#startAngle').fill('-90');
    await page.locator('#startX').fill('80');
    await page.locator('#startY').fill('50');
    await page.locator('#startX').dispatchEvent('change');

    // Grab the robot at its axle center, then drag well past the left edge.
    const grabAt = await page.evaluate(() => {
      const planner = (window as any).missionPlanner;
      const axle = planner.pathCalculator.anchorToAxle(planner.robot.getConfig());
      return {
        x: planner.canvas.coordToCanvasX(axle.x),
        y: planner.canvas.coordToCanvasY(axle.y)
      };
    });

    const box = (await page.locator('#missionCanvas').boundingBox())!;
    await page.mouse.move(box.x + grabAt.x, box.y + grabAt.y);
    await page.mouse.down();
    await page.mouse.move(box.x - 400, box.y + grabAt.y, { steps: 10 });
    await page.mouse.up();

    const result = await page.evaluate(() => {
      const planner = (window as any).missionPlanner;
      const config = planner.robot.getConfig();
      const axle = planner.pathCalculator.anchorToAxle(config);
      const extents = planner.pathCalculator.footprintExtents(config, config.startAngle);
      return { startX: config.startX, leftEdgeOfRobot: axle.x + extents.minX };
    });

    expect(result.startX).toBeCloseTo(0, 5);
    expect(result.leftEdgeOfRobot).toBeCloseTo(0, 5);
  });
});
