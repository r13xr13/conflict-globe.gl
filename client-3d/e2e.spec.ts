import { test, expect } from '@playwright/test';

test.describe('Conflict Globe UI', () => {
  test('should load the main page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    
    // Wait for the globe to load
    await page.waitForTimeout(3000);
    
    // Check that the title or main element exists
    const title = await page.locator('text=CONFLICT GLOBE').first();
    await expect(title).toBeVisible();
    
    // Check for critical errors
    const criticalErrors = errors.filter(e => !e.includes('Warning') && !e.includes('React Router'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('should toggle between globe themes', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Click theme toggle button
    const themeButton = page.locator('button').filter({ hasText: /☀️|🌙/ }).first();
    await themeButton.click();
    
    // Just verify no crash
    await page.waitForTimeout(500);
  });

  test('should toggle left panel', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Press keyboard shortcut 1 to toggle left panel
    await page.keyboard.press('1');
    await page.waitForTimeout(500);
  });

  test('should toggle right panel', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Press keyboard shortcut 2 to toggle right panel
    await page.keyboard.press('2');
    await page.waitForTimeout(500);
  });

  test('should toggle bottom panel (timeline)', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Press keyboard shortcut 3 to toggle bottom panel
    await page.keyboard.press('3');
    await page.waitForTimeout(500);
  });
});
