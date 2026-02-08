import { test, expect } from '@playwright/test';

test('should allow setting a custom base budget for a day', async ({ page }) => {
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

  await page.reload();
  await page.locator('[data-testid="app-title"]').waitFor();

  // Set default budget in settings
  await page.locator('[data-testid="nav-settings"]').click();
  const defaultBudget = 300;
  await page.fill('[data-testid="settings-weekday-budget"]', defaultBudget.toString());
  await page.fill('[data-testid="settings-weekend-budget"]', '300');
  await page.locator('[data-testid="settings-save-button"]').click();

  // Navigate to dashboard
  await page.locator('[data-testid="nav-dashboard"]').click();
  await page.waitForTimeout(500);

  // Verify initial budget
  const budgetBefore = await page.locator('[data-testid="dashboard-total-budget"]').textContent();
  expect(budgetBefore).toContain('300');

  // Navigate to calendar
  await page.locator('[data-testid="nav-calendar"]').click();
  await page.waitForTimeout(300);

  // Click today
  await page.locator('[data-testid="calendar-day-2026-02-09"]').click();

  // Wait for modal
  await page.locator('[data-testid="day-detail-modal"]').waitFor();

  // Get input and set custom budget
  const budgetInput = page.locator('[data-testid="day-detail-base-budget-input"]');
  await budgetInput.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  const currentValue = await budgetInput.inputValue();
  const customBudget = (parseInt(currentValue, 10) || 0) + 100;

  await budgetInput.click();
  await budgetInput.fill(customBudget.toString());

  // Submit form by clicking the button
  const submitButton = page.locator('[data-testid="day-detail-save-button"]');
  await submitButton.click();

  // Wait for modal to close
  await page.waitForTimeout(1000);

  // Reload and navigate to dashboard
  await page.reload();
  await page.locator('[data-testid="app-title"]').waitFor();
  await page.locator('[data-testid="nav-dashboard"]').click();
  await page.waitForTimeout(500);

  // Verify budget updated
  const budgetAfter = await page.locator('[data-testid="dashboard-total-budget"]').textContent();
  expect(budgetAfter).toContain(customBudget.toString());
});
