import { test, expect, Page } from '@playwright/test';

test.describe('Mission Path Planner - Storage', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test.describe('Auto-save and restore', () => {
    test('should persist state across page reload', async ({ page }) => {
      // Navigate to Setup tab and modify team name
      await page.locator('button[data-tab="setup"]').click();
      await page.locator('#teamName').fill('My Persistent Team');
      
      // Wait for debounced auto-save (500ms)
      await page.waitForTimeout(600);
      
      // Reload the page
      await page.reload();
      
      // Navigate back to Setup tab and verify state persisted
      await page.locator('button[data-tab="setup"]').click();
      await expect(page.locator('#teamName')).toHaveValue('My Persistent Team');
    });

    test('should persist robot configuration', async ({ page }) => {
      // Navigate to Setup tab
      await page.locator('button[data-tab="setup"]').click();
      
      // Modify robot configuration
      await page.locator('#robotLength').fill('25');
      await page.locator('#robotWidth').fill('20');
      
      // Wait for auto-save
      await page.waitForTimeout(600);
      
      // Reload and verify
      await page.reload();
      await page.locator('button[data-tab="setup"]').click();
      
      await expect(page.locator('#robotLength')).toHaveValue('25');
      await expect(page.locator('#robotWidth')).toHaveValue('20');
    });

    test('should persist program blocks', async ({ page }) => {
      // Add a move block (Program tab is default)
      await page.locator('#addMoveBlock').click();
      
      // Wait for block to appear
      await expect(page.locator('.move-block')).toBeVisible();
      
      // Modify the degrees input (more reliable than direction)
      const degreesInput = page.locator('.move-block input[type="number"]').last();
      await degreesInput.fill('720');
      
      // Wait for auto-save
      await page.waitForTimeout(600);
      
      // Reload and verify
      await page.reload();
      
      // Check that move block exists with saved value
      const moveBlocks = page.locator('.move-block');
      await expect(moveBlocks).toHaveCount(1);
      
      const reloadedDegreesInput = page.locator('.move-block input[type="number"]').last();
      await expect(reloadedDegreesInput).toHaveValue('720');
    });
  });

  test.describe('Save robot configuration', () => {
    test('should save and load robot configuration', async ({ page }) => {
      // Navigate to Setup tab
      await page.locator('button[data-tab="setup"]').click();
      
      // Set custom robot values
      await page.locator('#robotLength').fill('18');
      await page.locator('#robotWidth').fill('16');
      
      // Handle the prompt dialog for naming
      page.on('dialog', async dialog => {
        await dialog.accept('Test Robot Config');
      });
      
      // Click save robot button
      await page.locator('#saveRobotBtn').click();
      
      // Wait for alert
      await page.waitForTimeout(100);
      
      // Clear the current values
      await page.locator('#robotLength').fill('10');
      await page.locator('#robotWidth').fill('10');
      
      // Load the saved robot
      await page.locator('#savedRobots').selectOption({ label: 'Test Robot Config' });
      
      // Verify values are restored
      await expect(page.locator('#robotLength')).toHaveValue('18');
      await expect(page.locator('#robotWidth')).toHaveValue('16');
    });

    test('should show saved robot in dropdown', async ({ page }) => {
      // Navigate to Setup tab
      await page.locator('button[data-tab="setup"]').click();
      
      // Handle the prompt dialog
      page.on('dialog', async dialog => {
        await dialog.accept('My Custom Robot');
      });
      
      // Save robot
      await page.locator('#saveRobotBtn').click();
      await page.waitForTimeout(100);
      
      // Check dropdown has the option by checking its value exists
      const dropdown = page.locator('#savedRobots');
      const optionCount = await dropdown.locator('option').count();
      expect(optionCount).toBeGreaterThan(1);
      
      // Verify the option text is in the HTML
      const html = await dropdown.innerHTML();
      expect(html).toContain('My Custom Robot');
    });
  });

  test.describe('Save program', () => {
    test('should save and load program', async ({ page }) => {
      // Modify team name
      await page.locator('button[data-tab="setup"]').click();
      await page.locator('#teamName').fill('Program Test Team');
      
      // Add a move block
      await page.locator('button[data-tab="program"]').click();
      await page.locator('#addMoveBlock').click();
      
      // Handle the prompt dialog
      page.on('dialog', async dialog => {
        await dialog.accept('Test Program');
      });
      
      // Save program
      await page.locator('#saveProgramBtn').click();
      await page.waitForTimeout(100);
      
      // Clear state
      await page.locator('button[data-tab="setup"]').click();
      await page.locator('#teamName').fill('Different Team');
      
      // Load the saved program
      await page.locator('#savedPrograms').selectOption({ label: 'Test Program' });
      
      // Verify state is restored
      await page.locator('button[data-tab="setup"]').click();
      await expect(page.locator('#teamName')).toHaveValue('Program Test Team');
    });

    test('should show saved program in dropdown', async ({ page }) => {
      // Handle the prompt dialog
      page.on('dialog', async dialog => {
        await dialog.accept('My Saved Program');
      });
      
      // Save program
      await page.locator('#saveProgramBtn').click();
      await page.waitForTimeout(100);
      
      // Check dropdown has the option by checking option count and HTML
      const dropdown = page.locator('#savedPrograms');
      const optionCount = await dropdown.locator('option').count();
      expect(optionCount).toBeGreaterThan(1);
      
      const html = await dropdown.innerHTML();
      expect(html).toContain('My Saved Program');
    });
  });

  test.describe('Storage management', () => {
    test('should display storage management section', async ({ page }) => {
      // Navigate to Setup tab
      await page.locator('button[data-tab="setup"]').click();
      
      // Find storage management section and expand it if collapsed
      const storageSection = page.locator('.storage-section');
      await expect(storageSection).toBeVisible();
      
      // Click header to expand if collapsed
      const header = storageSection.locator('.section-header');
      if (await storageSection.evaluate(el => el.classList.contains('collapsed'))) {
        await header.click();
      }
      
      // Verify usage elements exist (they may be in the DOM but just checking structure)
      await expect(page.locator('#storageUsageBar')).toBeAttached();
      await expect(page.locator('#storageUsageText')).toBeAttached();
    });

    test('should show saved robots in storage management', async ({ page }) => {
      // Navigate to Setup tab
      await page.locator('button[data-tab="setup"]').click();
      
      // Handle the prompt dialog
      page.on('dialog', async dialog => {
        await dialog.accept('Listed Robot');
      });
      
      // Save robot
      await page.locator('#saveRobotBtn').click();
      await page.waitForTimeout(100);
      
      // Check that robot appears in the list
      const robotsList = page.locator('#savedRobotsList');
      await expect(robotsList.locator('.saved-item-name').filter({ hasText: 'Listed Robot' })).toBeVisible();
    });

    test('should show saved programs in storage management', async ({ page }) => {
      // Navigate to Setup tab to see storage section
      await page.locator('button[data-tab="setup"]').click();
      
      // Handle the prompt dialog
      page.on('dialog', async dialog => {
        await dialog.accept('Listed Program');
      });
      
      // Save program
      await page.locator('#saveProgramBtn').click();
      await page.waitForTimeout(100);
      
      // Check that program appears in the list
      const programsList = page.locator('#savedProgramsList');
      await expect(programsList.locator('.saved-item-name').filter({ hasText: 'Listed Program' })).toBeVisible();
    });

    test('should delete saved robot from storage management', async ({ page }) => {
      // Navigate to Setup tab
      await page.locator('button[data-tab="setup"]').click();
      
      // Handle dialogs
      let dialogCount = 0;
      page.on('dialog', async dialog => {
        dialogCount++;
        if (dialogCount === 1) {
          // First dialog is prompt for name
          await dialog.accept('Robot To Delete');
        } else {
          // Second dialog is confirm for delete
          await dialog.accept();
        }
      });
      
      // Save robot
      await page.locator('#saveRobotBtn').click();
      await page.waitForTimeout(100);
      
      // Verify robot is in list
      const robotsList = page.locator('#savedRobotsList');
      const robotItem = robotsList.locator('.saved-item').filter({ hasText: 'Robot To Delete' });
      await expect(robotItem).toBeVisible();
      
      // Click delete button
      await robotItem.locator('.delete-robot-btn').click();
      await page.waitForTimeout(100);
      
      // Verify robot is removed
      await expect(robotItem).not.toBeVisible();
    });

    test('should clear all saved data', async ({ page }) => {
      // Navigate to Setup tab
      await page.locator('button[data-tab="setup"]').click();
      
      // Handle dialogs
      let dialogCount = 0;
      page.on('dialog', async dialog => {
        dialogCount++;
        if (dialog.type() === 'prompt') {
          await dialog.accept('Item to Clear');
        } else {
          await dialog.accept(); // confirm dialogs
        }
      });
      
      // Save a robot
      await page.locator('#saveRobotBtn').click();
      await page.waitForTimeout(100);
      
      // Verify robot exists
      const robotsList = page.locator('#savedRobotsList');
      await expect(robotsList.locator('.saved-item')).toHaveCount(1);
      
      // Click clear all button
      await page.locator('#clearStorageBtn').click();
      await page.waitForTimeout(100);
      
      // Verify list is empty
      await expect(robotsList.locator('.empty-list')).toBeVisible();
    });
  });

  test.describe('Cancel dialogs', () => {
    test('should not save robot when prompt is cancelled', async ({ page }) => {
      // Navigate to Setup tab
      await page.locator('button[data-tab="setup"]').click();
      
      // Handle the prompt dialog - cancel it
      page.on('dialog', async dialog => {
        await dialog.dismiss();
      });
      
      // Click save robot button
      await page.locator('#saveRobotBtn').click();
      await page.waitForTimeout(100);
      
      // Verify no robot was saved (dropdown still has only default option)
      const options = page.locator('#savedRobots option');
      await expect(options).toHaveCount(1);
    });

    test('should not save program when prompt is cancelled', async ({ page }) => {
      // Handle the prompt dialog - cancel it
      page.on('dialog', async dialog => {
        await dialog.dismiss();
      });
      
      // Click save program button
      await page.locator('#saveProgramBtn').click();
      await page.waitForTimeout(100);
      
      // Verify no program was saved
      const options = page.locator('#savedPrograms option');
      await expect(options).toHaveCount(1);
    });
  });
});
