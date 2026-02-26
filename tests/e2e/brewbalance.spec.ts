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

  test('should allow setting a custom base budget for a day', async ({ page }) => {
    // NOTE: This test captures a known bug where the custom base budget does not persist.
    const testDate = new Date('2026-02-09T00:00:00');

    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();

    // Set mock time via window.__brewBalanceClock
    const success = await page.evaluate((time: number) => {
      const w = window as unknown as Record<string, unknown>;
      const clock = w['__brewBalanceClock'] as Record<string, unknown> | undefined;
      if (clock && typeof clock['setMockTime'] === 'function') {
        (clock['setMockTime'] as (t: number) => void)(time);
        return true;
      }
      return false;
    }, testDate.getTime());

    if (!success) {
      throw new Error('Failed to set mock time');
    }

    // Reload to ensure mocked time is applied on initial render
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    // Navigate to settings to set default weekday budget
    await page.locator('[data-testid="nav-settings"]').click();

    // Set a default weekday budget
    const defaultBudget = 300;
    await page.fill('[data-testid="settings-weekday-budget"]', defaultBudget.toString());
    await page.fill('[data-testid="settings-weekend-budget"]', '300');
    await page.locator('[data-testid="settings-save-button"]').click();

    // Return to dashboard
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForTimeout(500);

    // Record the current daily budget from the dashboard
    const dashboardBudgetBefore = await page
      .locator('[data-testid="dashboard-total-budget"]')
      .textContent();
    // Extract numbers from the text (e.g., "¥300" -> 300)
    const budgetBefore = parseInt((dashboardBudgetBefore || '0').replace(/[^\d]/g, ''), 10);
    expect(budgetBefore).toBe(defaultBudget);

    // Navigate to calendar view
    await page.locator('[data-testid="nav-calendar"]').click();
    await page.waitForTimeout(300);

    // Click on today's cell (2026-02-09)
    const todayDateStr = '2026-02-09';
    const todayButton = page.locator(`[data-testid="calendar-day-${todayDateStr}"]`);
    await expect(todayButton).toBeVisible();
    await todayButton.click();

    // Wait for the day detail modal to open
    await page.locator('[data-testid="day-detail-modal"]').waitFor();

    // Get the current base budget value from the input
    const budgetInput = page.locator('[data-testid="day-detail-base-budget-input"]');

    // Scroll input into view
    await budgetInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Wait for the input to have a value (it should be initialized with stats.baseBudget)
    const currentBudgetValue = await budgetInput.inputValue();
    if (!currentBudgetValue) {
      throw new Error('Base budget input has no value');
    }
    const currentBudget = parseInt(currentBudgetValue, 10) || 0;

    // Input custom base budget = original + 100
    const customBudget = currentBudget + 100;

    // Focus input and fill with new value
    await budgetInput.focus();
    await budgetInput.fill(customBudget.toString());
    await budgetInput.blur(); // Trigger onChange handlers
    await page.waitForTimeout(200);

    // Submit the form by calling requestSubmit on the form element
    // This avoids navigation bar interception issues
    await page.evaluate(() => {
      const form = document.querySelector('[data-testid="day-detail-modal"] form');
      if (form && form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    });

    // Wait for the modal to close
    await page.waitForTimeout(1000);

    // Reload the page to ensure persistence
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    // Navigate to dashboard
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForTimeout(500);

    // Assert that today's budget now reflects the change
    const dashboardBudgetAfter = await page
      .locator('[data-testid="dashboard-total-budget"]')
      .textContent();
    const budgetAfter = parseInt((dashboardBudgetAfter || '0').replace(/[^\d]/g, ''), 10);
    expect(budgetAfter).toBe(customBudget);
  });

  test('should use overridden base budget for future day when calculating next day budget', async ({
    page,
  }) => {
    // Set initial clock to Monday, February 9, 2026, 00:00:00 local time
    const monday = new Date('2026-02-09T00:00:00');
    const tuesday = new Date('2026-02-10T00:00:00');
    const baseBudgetFromSettings = 300;
    const customBudgetForTuesday = baseBudgetFromSettings + 100; // 400

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
        throw new Error('Clock API not available');
      }
    }, monday.getTime());

    // Reload to ensure mocked time is applied on initial render
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    // Step 1: Configure base budget in settings
    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', baseBudgetFromSettings.toString());
    await page.fill('[data-testid="settings-weekend-budget"]', baseBudgetFromSettings.toString());
    await page.locator('[data-testid="settings-save-button"]').click();

    // Step 2: Return to dashboard and verify Monday's budget
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForTimeout(500);
    const mondayBudgetText = await page
      .locator('[data-testid="dashboard-total-budget"]')
      .textContent();
    const mondayBudget = parseInt((mondayBudgetText || '0').replace(/[^\d]/g, ''), 10);
    expect(mondayBudget).toBe(baseBudgetFromSettings);

    // Step 3: Navigate to calendar view
    await page.locator('[data-testid="nav-calendar"]').click();
    await page.waitForTimeout(300);

    // Step 4: Select Tuesday (Feb 10) - 1 day in the future
    const tuesdayDateStr = '2026-02-10';
    const tuesdayButton = page.locator(`[data-testid="calendar-day-${tuesdayDateStr}"]`);
    await expect(tuesdayButton).toBeVisible();
    await tuesdayButton.click();

    // Step 5: Wait for day detail modal and set custom base budget
    await page.locator('[data-testid="day-detail-modal"]').waitFor();
    const budgetInput = page.locator('[data-testid="day-detail-base-budget-input"]');
    await budgetInput.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    // Fill with custom budget (base + 100)
    await budgetInput.focus();
    await budgetInput.fill(customBudgetForTuesday.toString());
    await budgetInput.blur();
    await page.waitForTimeout(200);

    // Step 6: Submit the form
    await page.evaluate(() => {
      const form = document.querySelector('[data-testid="day-detail-modal"] form');
      if (form && form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    });

    // Wait for the modal to close
    await page.waitForTimeout(1000);

    // Step 7: Advance clock by 1 day to Tuesday
    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, tuesday.getTime());

    // Reload to apply the new clock time
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();
    await page.waitForTimeout(500);

    // Step 8: Navigate to dashboard to verify the budget calculation
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForTimeout(500);

    // Step 9: Verify that Tuesday's budget uses the overridden base budget
    // Expected: Monday's budget (300) + Tuesday's custom base budget (400) = 700
    // NOT: Monday's budget (300) + default weekday budget from settings (300) = 600
    const tuesdayBudgetText = await page
      .locator('[data-testid="dashboard-total-budget"]')
      .textContent();
    const tuesdayBudget = parseInt((tuesdayBudgetText || '0').replace(/[^\d]/g, ''), 10);
    const expectedBudget = baseBudgetFromSettings + customBudgetForTuesday;
    expect(tuesdayBudget).toBe(expectedBudget);
  });

  test('should display expenses in temporal order (newest first) with timestamps', async ({
    page,
  }) => {
    // Set initial clock to Monday, February 9, 2026
    const monday = new Date('2026-02-09T10:00:00');

    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();

    // Set mock time to Monday
    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, monday.getTime());

    // Reload with mocked time
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    // Set up settings
    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '300');
    await page.fill('[data-testid="settings-weekend-budget"]', '300');
    await page.locator('[data-testid="settings-save-button"]').click();

    // Add multiple expenses on the same day
    await page.locator('[data-testid="nav-add"]').click();
    await page.waitForTimeout(300);

    // Add first expense at 10:00
    await page.fill('[data-testid="expense-amount-input"]', '50');
    await page.fill('[data-testid="expense-note-input"]', 'First coffee');
    await page.locator('[data-testid="expense-submit-button"]').click();
    await page.waitForTimeout(300);

    // Navigate back to add screen
    await page.locator('[data-testid="nav-add"]').click();
    await page.waitForTimeout(300);

    // Add second expense at later time (advance mock time by 1 hour to 11:00)
    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, new Date('2026-02-09T11:00:00').getTime());

    await page.fill('[data-testid="expense-amount-input"]', '75');
    await page.fill('[data-testid="expense-note-input"]', 'Lunch');
    await page.locator('[data-testid="expense-submit-button"]').click();
    await page.waitForTimeout(300);

    // Navigate back to add screen
    await page.locator('[data-testid="nav-add"]').click();
    await page.waitForTimeout(300);

    // Add third expense at 12:00
    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, new Date('2026-02-09T12:00:00').getTime());

    await page.fill('[data-testid="expense-amount-input"]', '100');
    await page.fill('[data-testid="expense-note-input"]', 'Dinner');
    await page.locator('[data-testid="expense-submit-button"]').click();
    await page.waitForTimeout(300);

    // Navigate to history view
    await page.locator('[data-testid="nav-history"]').click();
    await page.waitForTimeout(300);

    // Verify expenses tab is selected
    await expect(page.locator('[data-testid="history-expenses-tab"]')).toBeVisible();

    // Get all expense entries
    const entries = await page.evaluate(() => {
      const buttons = document.querySelectorAll('[data-testid="ledger-item"]');
      return Array.from(buttons).map((item) => {
        const element = item as HTMLElement;
        const noteElement = element.querySelector('div[class*="font-bold"]');
        const timeElement = element.querySelector('div[class*="text-xs"]');
        const amountElement = element.querySelector('div[class*="text-lg"]');
        return {
          note: noteElement?.textContent || '',
          time: timeElement?.textContent || '',
          amount: amountElement?.textContent || '',
        };
      });
    });

    // Filter to only human-initiated expenses (those with note text containing actual expense names, not system messages)
    const expenseEntries = entries.filter(
      (e) =>
        e.note &&
        !e.note.includes('created') &&
        !e.note.includes('adjusted') &&
        ['Dinner', 'Lunch', 'First coffee'].includes(e.note),
    );

    // Verify entries are in reverse chronological order (newest first: Dinner, Lunch, First coffee)
    expect(expenseEntries.length).toBe(3);
    expect(expenseEntries[0]?.note).toBe('Dinner'); // 12:00
    expect(expenseEntries[1]?.note).toBe('Lunch'); // 11:00
    expect(expenseEntries[2]?.note).toBe('First coffee'); // 10:00

    // Verify timestamps are present
    expect(expenseEntries[0]?.time).toMatch(/\d{2}:\d{2}/); // Format HH:MM
    expect(expenseEntries[1]?.time).toMatch(/\d{2}:\d{2}/);
    expect(expenseEntries[2]?.time).toMatch(/\d{2}:\d{2}/);
  });

  test('should exclude future-dated transactions from the ledger', async ({ page }) => {
    // Set initial clock to Monday, February 9, 2026
    const monday = new Date('2026-02-09T10:00:00');
    const tuesday = new Date('2026-02-10T10:00:00');

    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();

    // Set mock time to Monday
    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, monday.getTime());

    // Reload with mocked time
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    // Set up settings
    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '300');
    await page.fill('[data-testid="settings-weekend-budget"]', '300');
    await page.locator('[data-testid="settings-save-button"]').click();

    // Add expenses directly via localStorage to avoid UI form issues with multiple entries
    await page.evaluate(() => {
      // Clear transactions to allow migration to run with new entries
      localStorage.removeItem('brewbalance_transactions');
      const entries = [
        {
          id: 'entry-1',
          date: '2026-02-09',
          amount: 50,
          note: 'Monday expense',
          timestamp: new Date('2026-02-09T10:00:00').getTime(),
        },
        {
          id: 'entry-2',
          date: '2026-02-10',
          amount: 75,
          note: 'Tuesday expense',
          timestamp: new Date('2026-02-10T10:00:00').getTime(),
        },
      ];
      localStorage.setItem('brewbalance_entries', JSON.stringify(entries));
    });

    // Reload to apply the entries
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();
    await page.waitForTimeout(300);

    // Navigate to history view (still on Monday)
    await page.locator('[data-testid="nav-history"]').click();
    await page.waitForTimeout(300);

    // Get all visible expense entries
    const entries = await page.evaluate(() => {
      const buttons = document.querySelectorAll('[data-testid="ledger-item"]');
      return Array.from(buttons).map((item) => {
        const element = item as HTMLElement;
        const noteElement = element.querySelector('div[class*="font-bold"]');
        return {
          note: noteElement?.textContent || '',
        };
      });
    });

    // Verify only Monday's expense is shown, not Tuesday's
    const noteTexts = entries.map((e) => e.note).filter((note) => note.includes('expense'));
    expect(noteTexts).toContain('Monday expense');
    expect(noteTexts).not.toContain('Tuesday expense');

    // Now advance the clock to Tuesday (making Tuesday the "today")
    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, tuesday.getTime());

    // Reload to apply the new date
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();
    await page.waitForTimeout(300);

    // Navigate to history view
    await page.locator('[data-testid="nav-history"]').click();
    await page.waitForTimeout(300);

    // Get all visible expense entries after advancing the date
    const entriesAfter = await page.evaluate(() => {
      const buttons = document.querySelectorAll('[data-testid="ledger-item"]');
      return Array.from(buttons).map((item) => {
        const element = item as HTMLElement;
        const noteElement = element.querySelector('div[class*="font-bold"]');
        return {
          note: noteElement?.textContent || '',
        };
      });
    });

    // Now both Monday and Tuesday expenses should be showing (both are current/past)
    const noteTextsAfter = entriesAfter
      .map((e) => e.note)
      .filter((note) => note.includes('expense'));
    expect(noteTextsAfter).toContain('Monday expense');
    expect(noteTextsAfter).toContain('Tuesday expense');
  });

  test('should display all relevant transactions as a ledger of budget impacts', async ({
    page,
  }) => {
    // This test verifies that the expenses view displays a ledger showing all events
    // that impact the user's budget, presented as a clear list

    const monday = new Date('2026-02-09T10:00:00');

    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();

    // Set mock time to Monday
    await page.evaluate((time: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const clock = (window as any).__brewBalanceClock;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (clock?.setMockTime) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        clock.setMockTime(time);
      }
    }, monday.getTime());

    // Reload with mocked time
    await page.reload();
    await page.locator('[data-testid="app-title"]').waitFor();

    // Set up initial settings
    await page.locator('[data-testid="nav-settings"]').click();
    await page.fill('[data-testid="settings-weekday-budget"]', '300');
    await page.fill('[data-testid="settings-weekend-budget"]', '300');
    await page.locator('[data-testid="settings-save-button"]').click();

    // Add some expenses to establish a ledger
    await page.locator('[data-testid="nav-add"]').click();
    await page.waitForTimeout(300);

    // Add multiple expenses
    await page.fill('[data-testid="expense-amount-input"]', '50');
    await page.fill('[data-testid="expense-note-input"]', 'Coffee');
    await page.locator('[data-testid="expense-submit-button"]').click();
    await page.waitForTimeout(300);

    // Navigate back to add screen
    await page.locator('[data-testid="nav-add"]').click();
    await page.waitForTimeout(300);

    await page.fill('[data-testid="expense-amount-input"]', '100');
    await page.fill('[data-testid="expense-note-input"]', 'Lunch');
    await page.locator('[data-testid="expense-submit-button"]').click();
    await page.waitForTimeout(300);

    // Navigate to history and verify entries exist
    await page.locator('[data-testid="nav-history"]').click();
    await page.waitForTimeout(300);

    // Verify history view displays the expense ledger
    const expenseTab = page.locator('[data-testid="history-expenses-tab"]');
    await expect(expenseTab).toBeVisible();

    const entries = await page.evaluate(() => {
      const buttons = document.querySelectorAll('[data-testid="ledger-item"]');
      return Array.from(buttons).map((item) => {
        const element = item as HTMLElement;
        const noteElement = element.querySelector('div[class*="font-bold"]');
        const amountElement = element.querySelector('[data-testid="ledger-amount"]');
        return {
          note: noteElement?.textContent || '',
          amount: amountElement?.textContent || '',
        };
      });
    });

    // Verify the ledger contains the expected transactions
    expect(entries.length).toBeGreaterThanOrEqual(2);
    const notes = entries
      .map((e) => e.note)
      .filter((note) => note === 'Coffee' || note === 'Lunch');
    expect(notes).toContain('Coffee');
    expect(notes).toContain('Lunch');

    // Verify amounts are displayed (indicating decrease in budget)
    const coffeeEntry = entries.find((e) => e.note === 'Coffee');
    const lunchEntry = entries.find((e) => e.note === 'Lunch');
    expect(coffeeEntry?.amount).toMatch(/\d+/); // Should contain a number
    expect(lunchEntry?.amount).toMatch(/\d+/);
  });
});
