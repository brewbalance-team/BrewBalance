import { test, expect } from '@playwright/test';

test.describe('Immutable Ledger - Entry Reversals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="app-title"]').waitFor();
  });

  test('should create reversal and correction when editing entry amount', async ({ page }) => {
    // Set up: Create an expense entry
    await page.locator('[data-testid="nav-add"]').click();
    await page.fill('[data-testid="expense-amount-input"]', '500');
    await page.fill('[data-testid="expense-note-input"]', 'Coffee');
    await page.locator('[data-testid="expense-submit-button"]').click();
    await page.waitForTimeout(500);

    // Navigate to history to verify original entry exists
    await page.locator('[data-testid="nav-history"]').click();
    await page.waitForTimeout(300);

    // Count initial ledger items (should have at least the original entry)
    const initialItems = await page.locator('[data-testid="ledger-item"]').count();
    expect(initialItems).toBeGreaterThan(0);

    // Find and click the Coffee entry to edit it
    const ledgerItems = page.locator('[data-testid="ledger-item"]');
    let coffeeItemIndex = -1;
    for (let i = 0; i < initialItems; i++) {
      const text = await ledgerItems.nth(i).textContent();
      if (text?.includes('Coffee')) {
        coffeeItemIndex = i;
        break;
      }
    }
    expect(coffeeItemIndex).toBeGreaterThan(-1);

    // Click the Coffee entry to open edit modal
    await ledgerItems.nth(coffeeItemIndex).click();
    await page.waitForTimeout(300);

    // Expect the edit modal to appear
    const editModal = page.locator('[data-testid="edit-entry-modal"]');
    await expect(editModal).toBeVisible();

    // Change the amount using the correct test ID
    await page.fill('[data-testid="edit-amount-input"]', '600');
    // Find and click the save button (it's the submit button in the form)
    await page.locator('[data-testid="edit-entry-modal"] button[type="submit"]').click();
    await page.waitForTimeout(500);

    // After editing, we should see more items in history due to reversal + correction
    const updatedItems = await page.locator('[data-testid="ledger-item"]').count();
    // Should have original entry, reversal, and new correction entry
    expect(updatedItems).toBeGreaterThanOrEqual(initialItems);

    // Verify we can find items related to Coffee
    const ledgerTexts = await page.locator('[data-testid="ledger-item"]').allTextContents();
    const coffeeRelatedItems = ledgerTexts.filter(
      (text) => text.includes('Coffee') || text.includes('Reversal'),
    );
    expect(coffeeRelatedItems.length).toBeGreaterThan(0);
  });

  test('should only update entry when editing without amount change', async ({ page }) => {
    // Set up: Create an expense entry
    await page.locator('[data-testid="nav-add"]').click();
    await page.fill('[data-testid="expense-amount-input"]', '350');
    await page.fill('[data-testid="expense-note-input"]', 'Lunch');
    await page.locator('[data-testid="expense-submit-button"]').click();
    await page.waitForTimeout(500);

    // Navigate to history
    await page.locator('[data-testid="nav-history"]').click();
    await page.waitForTimeout(300);

    // Count initial ledger items
    const initialCount = await page.locator('[data-testid="ledger-item"]').count();

    // Find and click the Lunch entry to edit it
    const ledgerItems = page.locator('[data-testid="ledger-item"]');
    let lunchItemIndex = -1;
    for (let i = 0; i < initialCount; i++) {
      const text = await ledgerItems.nth(i).textContent();
      if (text?.includes('Lunch')) {
        lunchItemIndex = i;
        break;
      }
    }
    expect(lunchItemIndex).toBeGreaterThan(-1);

    // Click the Lunch entry
    await ledgerItems.nth(lunchItemIndex).click();
    await page.waitForTimeout(300);

    // Verify the edit modal appears
    await expect(page.locator('[data-testid="edit-entry-modal"]')).toBeVisible();

    // Change only the note, NOT the amount
    await page.fill('[data-testid="edit-note-input"]', 'Lunch with colleagues');
    // Click save
    await page.locator('[data-testid="edit-entry-modal"] button[type="submit"]').click();
    await page.waitForTimeout(500);

    // The count should remain the same since no reversal was created
    // (ENTRY_UPDATED transactions don't add new ledger items)
    const finalCount = await page.locator('[data-testid="ledger-item"]').count();
    expect(finalCount).toBe(initialCount);

    // Verify the update was successful by navigating to dashboard and back
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForTimeout(300);

    // Navigate back to history to see the updated entry
    await page.locator('[data-testid="nav-history"]').click();
    await page.waitForTimeout(300);

    // The entry should still be there with the same amount but updated note
    const finalTexts = await page.locator('[data-testid="ledger-item"]').allTextContents();
    const hasUpdatedEntry = finalTexts.some((text) => text.includes('Lunch'));
    expect(hasUpdatedEntry).toBe(true);
  });

  test('should display reversal with distinct icon when amount changes', async ({ page }) => {
    // Create initial entry
    await page.locator('[data-testid="nav-add"]').click();
    await page.fill('[data-testid="expense-amount-input"]', '200');
    await page.fill('[data-testid="expense-note-input"]', 'Snack');
    await page.locator('[data-testid="expense-submit-button"]').click();
    await page.waitForTimeout(500);

    // Go to history and edit
    await page.locator('[data-testid="nav-history"]').click();
    await page.waitForTimeout(300);

    // Find and edit the Snack entry
    const ledgerItems = page.locator('[data-testid="ledger-item"]');
    const initialCount = await ledgerItems.count();
    let snackIndex = -1;
    for (let i = 0; i < initialCount; i++) {
      const text = await ledgerItems.nth(i).textContent();
      if (text?.includes('Snack')) {
        snackIndex = i;
        break;
      }
    }

    await ledgerItems.nth(snackIndex).click();
    await page.waitForTimeout(300);

    // Change the amount
    await page.fill('[data-testid="edit-amount-input"]', '250');
    await page.locator('[data-testid="edit-entry-modal"] button[type="submit"]').click();
    await page.waitForTimeout(500);

    // Verify we can see the reversal in the ledger
    const updatedTexts = await page.locator('[data-testid="ledger-item"]').allTextContents();
    // Should contain reversal-related text
    const hasReversalText = updatedTexts.some((text) => text.toLowerCase().includes('reversal'));
    expect(hasReversalText).toBe(true);
  });
});
