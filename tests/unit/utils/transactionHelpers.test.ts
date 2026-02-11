import { describe, it, expect, beforeEach } from 'vitest';

import { migrateExistingToTransactions } from '../../../src/utils/transactionHelpers';
import { loadTransactions, clearTransactions } from '../../../src/utils/transactionStore';
import { Transaction, TransactionType } from '../../../src/types';
import { STORAGE_KEYS } from '../../../src/constants';
import { setDefaultDataStore, InMemoryDataStore } from '../../../src/utils/datastore';

let store: InMemoryDataStore;
beforeEach(() => {
  store = new InMemoryDataStore();
  setDefaultDataStore(store);
  clearTransactions(store);
});

describe('transactionHelpers migration', () => {
  it('migrates settings and entries into transactions', () => {
    const settings = {
      weekdayBudget: 100,
      weekendBudget: 150,
      currency: 'USD',
      alarmThreshold: 0.8,
      startDate: '2026-01-01',
      endDate: null,
      logo: null,
      customBudgets: {},
      userName: '',
      activeChallenge: null,
      pastChallenges: [],
    };
    const entries = [
      { id: 'e1', date: '2026-01-02', amount: 50, note: 'coffee', timestamp: Date.now() - 10000 },
    ];

    store.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    store.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));

    migrateExistingToTransactions();

    const txs = loadTransactions();
    expect(txs.length).toBeGreaterThan(0);
    // Expect an ENTRY_ADDED tx exists
    expect(txs.some((t: Transaction) => t.type === TransactionType.ENTRY_ADDED)).toBe(true);
  });
});
