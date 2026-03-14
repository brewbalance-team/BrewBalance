import { describe, it, expect } from 'vitest';

import { replay } from '../../src/utils/replayEngine';
import {
  makeEntryAddedTx,
  makeEntryReversalTx,
  makeSettingsUpdatedTx,
} from '../../src/utils/transactionHelpers';
import { Entry } from '../../src/types';

describe('replayEngine with ENTRY_REVERSAL', () => {
  describe('replay with reversals', () => {
    it('should handle entry reversal transactions', () => {
      const originalEntry: Entry = {
        id: 'entry-1',
        date: '2026-03-14',
        amount: 500,
        note: 'Coffee',
        timestamp: 1000,
      };

      const reversalEntry: Entry = {
        id: 'entry-1-reversal',
        date: '2026-03-14',
        amount: -500,
        note: 'Reversal of Coffee',
        timestamp: 2000,
      };

      const transactions = [
        makeEntryAddedTx(originalEntry),
        makeEntryReversalTx('entry-1', reversalEntry),
      ];

      const { entries } = replay(transactions);

      // Original entry should be removed, only reversal should remain
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual(reversalEntry);
    });

    it('should maintain order when multiple reversals occur', () => {
      const entry1: Entry = {
        id: 'entry-1',
        date: '2026-03-14',
        amount: 300,
        note: 'Lunch',
        timestamp: 1000,
      };

      const entry2: Entry = {
        id: 'entry-2',
        date: '2026-03-14',
        amount: 200,
        note: 'Dinner',
        timestamp: 2000,
      };

      const reversal1: Entry = {
        id: 'entry-1-reversal',
        date: '2026-03-14',
        amount: -300,
        note: 'Reversal of Lunch',
        timestamp: 3000,
      };

      const correction1: Entry = {
        id: 'entry-1-correction',
        date: '2026-03-14',
        amount: 350,
        note: 'Lunch (corrected)',
        timestamp: 3500,
      };

      const transactions = [
        makeEntryAddedTx(entry1),
        makeEntryAddedTx(entry2),
        makeEntryReversalTx('entry-1', reversal1),
        makeEntryAddedTx(correction1),
      ];

      const { entries } = replay(transactions);

      expect(entries).toHaveLength(3);
      // Check that all expected entries are present
      const ids = new Set(entries.map((e) => e.id));
      expect(ids).toEqual(new Set(['entry-2', 'entry-1-reversal', 'entry-1-correction']));
      // entry-1 should not be in the final list
      expect(ids.has('entry-1')).toBe(false);
    });

    it('should preserve entry amounts correctly after reversal', () => {
      const originalAmount = 750;
      const originalEntry: Entry = {
        id: 'entry-expensive',
        date: '2026-03-14',
        amount: originalAmount,
        note: 'Expensive item',
        timestamp: 1000,
      };

      const reversalEntry: Entry = {
        id: 'entry-expensive-reversal',
        date: '2026-03-14',
        amount: -originalAmount,
        note: 'Reversal',
        timestamp: 2000,
      };

      const correctedEntry: Entry = {
        id: 'entry-expensive-correction',
        date: '2026-03-14',
        amount: 500,
        note: 'Expensive item (corrected)',
        timestamp: 2500,
      };

      const transactions = [
        makeEntryAddedTx(originalEntry),
        makeEntryReversalTx('entry-expensive', reversalEntry),
        makeEntryAddedTx(correctedEntry),
      ];

      const { entries } = replay(transactions);

      expect(entries).toHaveLength(2);
      // Find reversal and correction
      const reversal = entries.find((e) => e.id === 'entry-expensive-reversal')!;
      const correction = entries.find((e) => e.id === 'entry-expensive-correction')!;

      expect(reversal.amount).toBe(-originalAmount);
      expect(correction.amount).toBe(500);
    });

    it('should handle reversal followed by another reversal of different entry', () => {
      const entry1: Entry = {
        id: 'entry-1',
        date: '2026-03-14',
        amount: 100,
        note: 'Small expense',
        timestamp: 1000,
      };

      const entry2: Entry = {
        id: 'entry-2',
        date: '2026-03-14',
        amount: 200,
        note: 'Big expense',
        timestamp: 2000,
      };

      const reversal1: Entry = {
        id: 'entry-1-reversal',
        date: '2026-03-14',
        amount: -100,
        note: 'Reversal 1',
        timestamp: 3000,
      };

      const reversal2: Entry = {
        id: 'entry-2-reversal',
        date: '2026-03-14',
        amount: -200,
        note: 'Reversal 2',
        timestamp: 4000,
      };

      const transactions = [
        makeEntryAddedTx(entry1),
        makeEntryAddedTx(entry2),
        makeEntryReversalTx('entry-1', reversal1),
        makeEntryReversalTx('entry-2', reversal2),
      ];

      const { entries } = replay(transactions);

      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.id)).toEqual(['entry-1-reversal', 'entry-2-reversal']);
    });
  });

  describe('replay preserves settings', () => {
    it('should preserve settings through reversals', () => {
      const settingsPatch = { weekdayBudget: 300, currency: 'JPY' };
      const entry: Entry = {
        id: 'entry-1',
        date: '2026-03-14',
        amount: 100,
        note: 'Test',
        timestamp: 1000,
      };

      const reversal: Entry = {
        id: 'entry-1-reversal',
        date: '2026-03-14',
        amount: -100,
        note: 'Reversal',
        timestamp: 2000,
      };

      const transactions = [
        makeSettingsUpdatedTx(settingsPatch),
        makeEntryAddedTx(entry),
        makeEntryReversalTx('entry-1', reversal),
      ];

      const { settings } = replay(transactions);

      expect(settings.weekdayBudget).toBe(300);
      expect(settings.currency).toBe('JPY');
    });
  });
});
