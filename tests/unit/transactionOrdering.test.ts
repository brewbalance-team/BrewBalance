import { describe, it, expect } from 'vitest';

import { InMemoryDataStore } from '../../src/utils/datastore';
import {
  appendTransaction,
  loadTransactions,
  clearTransactions,
} from '../../src/utils/transactionStore';
import { TransactionType, Transaction, Entry } from '../../src/types';

describe('transaction ordering', () => {
  it('reversal displays before correction when timestamps tie (append reversal then correction)', () => {
    const store = new InMemoryDataStore();
    clearTransactions(store);

    const ts = 1710921600000; // fixed timestamp

    const reversalEntry: Entry = {
      id: 'entry-1-reversal',
      date: '2026-03-20',
      amount: -100,
      note: 'Reversal',
      timestamp: ts,
    };

    const reversalTx: Transaction = {
      id: 'tx-rev-1',
      type: TransactionType.ENTRY_REVERSAL,
      timestamp: ts,
      originalEntryId: 'entry-1',
      reversalEntry,
    } as Transaction;

    const correctionEntry: Entry = {
      id: 'entry-1-correction',
      date: '2026-03-20',
      amount: 50,
      note: 'Correction',
      timestamp: ts,
    };

    const correctionTx: Transaction = {
      id: 'tx-add-1',
      type: TransactionType.ENTRY_ADDED,
      timestamp: ts,
      entry: correctionEntry,
    } as Transaction;

    // Append in the order: reversal then correction
    appendTransaction(reversalTx, store);
    appendTransaction(correctionTx, store);

    const txs = loadTransactions(store);

    // Emulate HistoryView sorting (newest-first by timestamp)
    const sorted = [...txs].sort((a, b) => b.timestamp - a.timestamp);

    const idxRev = sorted.findIndex((t) => t.type === TransactionType.ENTRY_REVERSAL);
    const idxAdd = sorted.findIndex((t) => t.type === TransactionType.ENTRY_ADDED);

    expect(idxRev).toBeGreaterThanOrEqual(0);
    expect(idxAdd).toBeGreaterThanOrEqual(0);
    // Reversal should appear before the correction in the history (lower index)
    expect(idxRev).toBeLessThan(idxAdd);
  });

  it('reversal displays before correction when timestamps tie (append correction then reversal)', () => {
    const store = new InMemoryDataStore();
    clearTransactions(store);

    const ts = 1710921600000; // fixed timestamp

    const reversalEntry2: Entry = {
      id: 'entry-2-reversal',
      date: '2026-03-20',
      amount: -200,
      note: 'Reversal',
      timestamp: ts,
    };

    const reversalTx2: Transaction = {
      id: 'tx-rev-2',
      type: TransactionType.ENTRY_REVERSAL,
      timestamp: ts,
      originalEntryId: 'entry-2',
      reversalEntry: reversalEntry2,
    } as Transaction;

    const correctionEntry2: Entry = {
      id: 'entry-2-correction',
      date: '2026-03-20',
      amount: 150,
      note: 'Correction',
      timestamp: ts,
    };

    const correctionTx2: Transaction = {
      id: 'tx-add-2',
      type: TransactionType.ENTRY_ADDED,
      timestamp: ts,
      entry: correctionEntry2,
    } as Transaction;

    // Append in the order: correction then reversal
    appendTransaction(correctionTx2, store);
    appendTransaction(reversalTx2, store);

    const txs = loadTransactions(store);

    // Emulate HistoryView sorting (newest-first by timestamp)
    const sorted = [...txs].sort((a, b) => b.timestamp - a.timestamp);

    const idxRev = sorted.findIndex((t) => t.type === TransactionType.ENTRY_REVERSAL);
    const idxAdd = sorted.findIndex((t) => t.type === TransactionType.ENTRY_ADDED);

    expect(idxRev).toBeGreaterThanOrEqual(0);
    expect(idxAdd).toBeGreaterThanOrEqual(0);
    // Reversal should appear before the correction in the history (lower index)
    expect(idxRev).toBeLessThan(idxAdd);
  });
});
