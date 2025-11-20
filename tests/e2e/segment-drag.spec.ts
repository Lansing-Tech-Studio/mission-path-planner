import { test, expect } from '@playwright/test';

test.describe('Segment Endpoint Dragging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dragging a straight segment endpoint updates degrees only', async ({ page }) => {
    // Switch to Program tab where blocks live
    await page.getByRole('button', { name: 'Program' }).click();
    // Add a move block
    await page.getByRole('button', { name: 'Add Move Block' }).click();

    // Capture initial degrees and direction
    const inputs = page.locator('#programBlocks .program-block.move-block input[type="number"]');
    await expect(inputs).toHaveCount(2);
    const directionInput = inputs.nth(0);
    const degreesInput = inputs.nth(1);

    const initialDirection = await directionInput.inputValue();
    const initialDegrees = await degreesInput.inputValue();

    // Compute handle client coordinates and a target point 10cm further along the segment
    const movePoints = await page.evaluate(() => {
      const mp = (window as any).missionPlanner;
      const canvas: HTMLCanvasElement = mp.canvas.canvas;
      const rect = canvas.getBoundingClientRect();
      // Ensure program exists: first block straight by default (direction 0)
      mp.update();
      const handles = mp.canvas.endpointHandles || [];
      if (!handles.length) return null;
      const h = handles[0];
      const cx = mp.canvas.coordToCanvasX(h.x);
      const cy = mp.canvas.coordToCanvasY(h.y);
      // Target 10cm further along straight direction (angle ~ of segment start)
      const startIdx = h.startIdx ?? 0;
      const start = mp.canvas.currentPath.points[startIdx];
      const angleRad = ((start.angle + 90) * Math.PI) / 180;
      const targetXcm = start.x + (Math.cos(angleRad) *  (Math.hypot(h.x - start.x, h.y - start.y) + 10));
      const targetYcm = start.y + (Math.sin(angleRad) *  (Math.hypot(h.x - start.x, h.y - start.y) + 10));
      const tx = mp.canvas.coordToCanvasX(targetXcm);
      const ty = mp.canvas.coordToCanvasY(targetYcm);
      // Convert canvas pixels to client coordinates by inverting css scale
      const cssScaleX = canvas.width / rect.width;
      const cssScaleY = canvas.height / rect.height;
      return {
        x: rect.left + cx / cssScaleX,
        y: rect.top + cy / cssScaleY,
        tx: rect.left + tx / cssScaleX,
        ty: rect.top + ty / cssScaleY,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      };
    });

    expect(movePoints).not.toBeNull();

    // Drag the endpoint upward by ~40 pixels in client space
    const startX = movePoints!.x;
    const startY = movePoints!.y;
    const endX = movePoints!.tx;
    const endY = movePoints!.ty;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    // Degrees should change in model, direction should remain the same
    const finalState = await page.evaluate(() => {
      const bm = (window as any).missionPlanner.blocks;
      const b = bm.blocks[0];
      return { direction: String(b.direction), degrees: String(b.degrees) };
    });
    expect(finalState.direction).toBe(initialDirection);
    expect(finalState.degrees).not.toBe(initialDegrees);
  });
});
