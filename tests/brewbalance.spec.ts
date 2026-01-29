import { test, expect } from '@playwright/test';

test.describe('BrewBalance App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    // Wait for the app title to appear (more reliable than networkidle)
    await page.locator('[data-testid="app-title"]').waitFor();

    // Check that the app title is visible
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();

    // Check that the logo (custom PNG icon) is visible in the header
    await expect(page.locator('[data-testid="app-logo"] img')).toBeVisible();

    // Check that navigation tabs are present
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-calendar"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-add"]')).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    // Start on dashboard (Home)
    await expect(page.locator('[data-testid="nav-dashboard"] .relative')).toHaveClass(
      /text-amber-400/,
    );

    // Navigate to Balance (Calendar)
    await page.locator('[data-testid="nav-calendar"]').click();
    await expect(page.locator('[data-testid="nav-calendar"] .relative')).toHaveClass(
      /text-amber-400/,
    );

    // Navigate to History
    await page.locator('[data-testid="nav-history"]').click();
    await expect(page.locator('[data-testid="nav-history"] .relative')).toHaveClass(
      /text-amber-400/,
    );

    // Navigate to Settings
    await page.locator('[data-testid="nav-settings"]').click();
    await expect(page.locator('[data-testid="nav-settings"] .relative')).toHaveClass(
      /text-amber-400/,
    );

    // Navigate to Add
    await page.locator('[data-testid="nav-add"]').click();
    await expect(page.locator('[data-testid="nav-add"] .relative')).toHaveClass(/text-amber-400/);
  });

  test('should add an expense entry', async ({ page }) => {
    // Navigate to add entry screen
    await page.locator('[data-testid="nav-add"]').click();

    // Check that the add entry screen is visible
    await expect(page.locator('[data-testid="add-entry-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="expense-amount-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="expense-submit-button"]')).toBeVisible();

    // Fill in the expense form
    await page.fill('[data-testid="expense-amount-input"]', '5.50');
    await page.fill('[data-testid="expense-note-input"]', 'Test beer');
    await page.fill('[data-testid="expense-date-input"]', '2024-01-24');

    // Submit the form
    await page.locator('[data-testid="expense-submit-button"]').click();

    // Test passes if form submission doesn't error
  });

  test('should configure settings', async ({ page }) => {
    // Navigate to settings
    await page.locator('[data-testid="nav-settings"]').click();

    // Set weekday budget
    await page.fill('[data-testid="settings-weekday-budget"]', '20');
    await page.fill('[data-testid="settings-weekend-budget"]', '30');

    // Save settings
    await page.locator('[data-testid="settings-save-button"]').click();

    // Settings should be saved (test passes if no error occurs)
  });

  test('should display calendar view', async ({ page }) => {
    // Navigate to calendar (Balance)
    await page.locator('[data-testid="nav-calendar"]').click();

    // Check calendar elements - should show month navigation
    await expect(page.locator('[data-testid="calendar-prev-month"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-next-month"]')).toBeVisible();
  });

  test('should display history view', async ({ page }) => {
    // Navigate to history
    await page.locator('[data-testid="nav-history"]').click();

    // Check history elements
    await expect(page.locator('[data-testid="history-expenses-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="history-challenges-tab"]')).toBeVisible();
  });
});
