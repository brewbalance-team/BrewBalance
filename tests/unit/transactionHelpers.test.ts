import { describe, it, expect } from 'vitest';

import {
  makeEntryAddedTx,
  makeEntryUpdatedTx,
  makeEntryDeletedTx,
  makeEntryReversalTx,
} from '../../src/utils/transactionHelpers';
import {
  Entry,
  TransactionType,
  EntryReversalTransaction,
  EntryUpdatedTransaction,
  EntryAddedTransaction,
  EntryDeletedTransaction,
} from '../../src/types';

describe('transactionHelpers', () => {
  describe('makeEntryReversalTx', () => {
    it('should create a reversal transaction with negative amount', () => {
      const originalEntryId = 'entry-123';
      const reversalEntry: Entry = {
        id: 'entry-123-reversal',
        date: '2026-03-14',
        amount: -500,
        note: 'Reversal of Coffee purchase',
        timestamp: Date.now(),
      };

      const tx = makeEntryReversalTx(originalEntryId, reversalEntry);

      expect(tx.type).toBe(TransactionType.ENTRY_REVERSAL);
      const reversalTx = tx as EntryReversalTransaction;
      expect(reversalTx.originalEntryId).toBe(originalEntryId);
      expect(reversalTx.reversalEntry).toEqual(reversalEntry);
      expect(reversalTx.reversalEntry.amount).toBe(-500);
      expect(tx.id).toMatch(/^tx-reversal-entry-123-/);
    });

    it('should handle positive amounts by negating them', () => {
      const originalEntryId = 'entry-456';
      const reversalEntry: Entry = {
        id: 'entry-456-reversal',
        date: '2026-03-14',
        amount: -1200,
        note: 'Reversal of Lunch',
        timestamp: Date.now(),
      };

      const tx = makeEntryReversalTx(originalEntryId, reversalEntry);

      const reversalTx = tx as EntryReversalTransaction;
      expect(reversalTx.reversalEntry.amount).toBe(-1200);
    });

    it('should preserve reversal entry details', () => {
      const reversalEntry: Entry = {
        id: 'entry-789-reversal',
        date: '2026-03-15',
        amount: -300,
        note: 'Reversal of Original note',
        timestamp: 1710460800000,
      };

      const tx = makeEntryReversalTx('entry-789', reversalEntry);

      const reversalTx = tx as EntryReversalTransaction;
      expect(reversalTx.reversalEntry.date).toBe('2026-03-15');
      expect(reversalTx.reversalEntry.note).toBe('Reversal of Original note');
      expect(reversalTx.reversalEntry.timestamp).toBe(1710460800000);
    });
  });

  describe('makeEntryUpdatedTx', () => {
    it('should create an update transaction with partial updates', () => {
      const entryId = 'entry-123';
      const updates = { amount: 600, note: 'Updated note' };

      const tx = makeEntryUpdatedTx(entryId, updates);

      expect(tx.type).toBe(TransactionType.ENTRY_UPDATED);
      const updateTx = tx as EntryUpdatedTransaction;
      expect(updateTx.entryId).toBe(entryId);
      expect(updateTx.updates).toEqual(updates);
      expect(tx.id).toMatch(/^tx-update-entry-123-/);
    });

    it('should allow empty updates', () => {
      const tx = makeEntryUpdatedTx('entry-456', {});

      expect(tx.type).toBe(TransactionType.ENTRY_UPDATED);
      const updateTx = tx as EntryUpdatedTransaction;
      expect(updateTx.updates).toEqual({});
    });
  });

  describe('makeEntryAddedTx', () => {
    it('should create an entry added transaction', () => {
      const entry: Entry = {
        id: 'entry-new',
        date: '2026-03-14',
        amount: 500,
        note: 'Coffee',
        timestamp: 1710460800000,
      };

      const tx = makeEntryAddedTx(entry);

      expect(tx.type).toBe(TransactionType.ENTRY_ADDED);
      const addedTx = tx as EntryAddedTransaction;
      expect(addedTx.entry).toEqual(entry);
      expect(tx.id).toBe('tx-entry-new');
      expect(tx.timestamp).toBe(entry.timestamp);
    });
  });

  describe('makeEntryDeletedTx', () => {
    it('should create an entry deleted transaction', () => {
      const entryId = 'entry-to-delete';

      const tx = makeEntryDeletedTx(entryId);

      expect(tx.type).toBe(TransactionType.ENTRY_DELETED);
      const deletedTx = tx as EntryDeletedTransaction;
      expect(deletedTx.entryId).toBe(entryId);
      expect(tx.id).toMatch(/^tx-delete-entry-to-delete-/);
    });
  });
});
