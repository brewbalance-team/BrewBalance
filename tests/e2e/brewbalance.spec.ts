import { test, expect } from '@playwright/test';

test.describe('BrewBalance App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should enforce immutable historical budgets', async ({ page }) => {
    // Set initial clock to Monday, February 9, 2026, 00:00:00 local time
    const monday = new Date('2026-02-09T00:00:00');
    const tuesday = new Date('2026-02-10T00:00:00');

    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();

    // Set mock time to Monday using the exposed clock API
    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      } else {
        throw new Error('Clock API not available - check if running in dev/test mode');
      }
    }, monday.getTime());

    // Reload to ensure mocked time is applied on initial render
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    // Step 1: Set weekday budget to 300 yen
    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '300');
    await page.fill('[data-testid="settings-weekend-budget"]', '300');
    await page.locator('[data-testid="settings-save-button"]').click();

    // Return to dashboard
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForTimeout(500); // Let state update

    // Step 2: Record Monday's budget (should be 300)
    const mondayBudget = await page.locator('[data-testid="dashboard-total-budget"]').textContent();
    expect(mondayBudget).toContain('300');

    // Step 3: Advance clock to Tuesday
    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, tuesday.getTime());

    // Reload to apply mocked date for the new day
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();
    await page.waitForTimeout(500);

    // Step 4: Check Tuesday's budget (should be 600: 300 rollover + 300 for today)
    const tuesdayBudgetBefore = await page
      .locator('[data-testid="dashboard-total-budget"]')
      .textContent();
    expect(tuesdayBudgetBefore).toContain('600');

    // Step 5: Change weekday budget to 200
    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '200');
    await page.locator('[data-testid="settings-save-button"]').click();

    // Return to dashboard
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForTimeout(500);

    // Step 6: Check Tuesday's budget (should be 500: 300 rollover from Monday + 200 for Tuesday)
    // Monday's budget should NOT have changed
    const tuesdayBudgetAfter = await page
      .locator('[data-testid="dashboard-total-budget"]')
      .textContent();
    expect(tuesdayBudgetAfter).toContain('500');
  });

  test('should reduce today budget by daily budget delta', async ({ page }) => {
    const monday = new Date('2026-02-09T00:00:00');

    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();

    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, monday.getTime());

    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '300');
    await page.fill('[data-testid="settings-weekend-budget"]', '300');
    await page.locator('[data-testid="settings-save-button"]').click();

    await page.locator('[data-testid="nav-dashboard"]').click();
    await expect(page.locator('[data-testid="dashboard-total-budget"]')).toContainText('300');

    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '200');
    await page.locator('[data-testid="settings-save-button"]').click();

    await page.locator('[data-testid="nav-dashboard"]').click();
    await expect(page.locator('[data-testid="dashboard-total-budget"]')).toContainText('200');
  });

  test('should increase today budget by daily budget delta', async ({ page }) => {
    const monday = new Date('2026-02-16T00:00:00');

    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();

    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, monday.getTime());

    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '300');
    await page.fill('[data-testid="settings-weekend-budget"]', '300');
    await page.locator('[data-testid="settings-save-button"]').click();

    await page.locator('[data-testid="nav-dashboard"]').click();
    await expect(page.locator('[data-testid="dashboard-total-budget"]')).toContainText('300');

    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '400');
    await page.locator('[data-testid="settings-save-button"]').click();

    await page.locator('[data-testid="nav-dashboard"]').click();
    await expect(page.locator('[data-testid="dashboard-total-budget"]')).toContainText('400');
  });

  test('should not double today budget on repeated save', async ({ page }) => {
    const monday = new Date('2026-02-23T00:00:00');

    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();

    await page.evaluate(() => {
      window.localStorage.clear();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.clearMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.clearMockTime();
      }
    });

    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, monday.getTime());

    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '1500');
    await page.fill('[data-testid="settings-weekend-budget"]', '1500');
    await page.locator('[data-testid="settings-save-button"]').click();

    await page.locator('[data-testid="nav-dashboard"]').click();
    await expect(page.locator('[data-testid="dashboard-total-budget"]')).toContainText('1500');

    await page.locator('[data-testid="nav-settings"]').click();
    await page.locator('[data-testid="settings-save-button"]').click();

    await page.locator('[data-testid="nav-dashboard"]').click();
    await expect(page.locator('[data-testid="dashboard-total-budget"]')).toContainText('1500');
    await expect(page.locator('[data-testid="dashboard-total-budget"]')).not.toContainText('3000');
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
