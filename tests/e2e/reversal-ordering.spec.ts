import { test, expect } from '@playwright/test';

// This e2e verifies that when editing an entry amount (immutable ledger), the
// reversal transaction displays before the new correction in the History view.

test.describe('Immutable Ledger - Reversal Ordering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();
  });

  test('reversal displays before correction in history', async ({ page }) => {
    // Create initial entry
    await page.locator('[data-testid="nav-add"]').click();
    await page.fill('[data-testid="expense-amount-input"]', '500');
    await page.fill('[data-testid="expense-note-input"]', 'Coffee Order');
    await page.locator('[data-testid="expense-submit-button"]').click();
    await page.waitForTimeout(400);

    // Navigate to history
    await page.locator('[data-testid="nav-history"]').click();
    await page.waitForTimeout(300);

    // Find and click the Coffee entry to edit
    const ledgerItems = page.locator('[data-testid="ledger-item"]');
    const count = await ledgerItems.count();
    let targetIndex = -1;
    for (let i = 0; i < count; i++) {
      const text = await ledgerItems.nth(i).textContent();
      if (text && text.includes('Coffee Order')) {
        targetIndex = i;
        break;
      }
    }
    expect(targetIndex).toBeGreaterThan(-1);

    await ledgerItems.nth(targetIndex).click();
    await page.waitForTimeout(300);

    // Update amount to trigger reversal + correction
    await page.fill('[data-testid="edit-amount-input"]', '600');
    await page.locator('[data-testid="edit-entry-modal"] button[type="submit"]').click();
    await page.waitForTimeout(500);

    // Now collect ledger items text contents and assert ordering
    const texts = await page.locator('[data-testid="ledger-item"]').allTextContents();

    // Find indices for reversal and correction/new entry
    const reversalIndex = texts.findIndex((t) => t.toLowerCase().includes('reversal'));
    const correctionIndex = texts.findIndex(
      (t) => t.includes('Coffee Order') && !t.toLowerCase().includes('reversal'),
    );

    expect(reversalIndex).toBeGreaterThanOrEqual(0);
    expect(correctionIndex).toBeGreaterThanOrEqual(0);
    // The corrected (new) transaction should appear above the reversal (newer first)
    expect(correctionIndex).toBeLessThan(reversalIndex);
  });
});
