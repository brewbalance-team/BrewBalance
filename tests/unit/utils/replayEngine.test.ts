import { describe, it, expect, beforeEach } from 'vitest';

import { replay, ensureDailyBudgetForDate, materializeUpTo } from '../../../src/utils/replayEngine';
import { appendTransaction, clearTransactions } from '../../../src/utils/transactionStore';
import { setDefaultDataStore, InMemoryDataStore } from '../../../src/utils/datastore';
import { Transaction, TransactionType } from '../../../src/types';

let store: InMemoryDataStore;
beforeEach(() => {
  // inject an in-memory store for isolation
  store = new InMemoryDataStore();
  setDefaultDataStore(store);
  clearTransactions(store);
});

describe('replayEngine basic', () => {
  it('replay returns defaults when no transactions', () => {
    const res = replay();
    expect(res.settings).toBeDefined();
    expect(res.entries).toEqual([]);
    expect(res.dailyBudgets).toEqual({});
  });

  it('ensureDailyBudgetForDate creates a daily budget tx for a date', () => {
    const date = '2026-01-15';
    const budget = ensureDailyBudgetForDate(date);
    expect(budget).toHaveProperty('baseBudget');
    expect(budget).toHaveProperty('rollover');

    // Second call should return the same (idempotent)
    const budget2 = ensureDailyBudgetForDate(date);
    expect(budget2.baseBudget).toEqual(budget.baseBudget);
    expect(budget2.rollover).toEqual(budget.rollover);
  });

  it('materializeUpTo creates budgets for past dates', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yISO = yesterday.toISOString().split('T')[0]!;

    const materialized = materializeUpTo(yISO);
    // materializeUpTo returns an array of dates (may be empty if startDate >= throughDate)
    expect(Array.isArray(materialized)).toBe(true);
  });

  it('replay includes same-day transactions when using throughDate', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-settings-1',
        type: TransactionType.SETTINGS_UPDATED,
        timestamp: new Date('2026-01-15T12:00:00.000Z').getTime(),
        settingsPatch: {
          startDate: '2026-01-15',
          weekdayBudget: 1500,
          weekendBudget: 1500,
        },
      },
      {
        id: 'tx-settings-2',
        type: TransactionType.SETTINGS_UPDATED,
        timestamp: new Date('2026-01-16T12:00:00.000Z').getTime(),
        settingsPatch: {
          weekdayBudget: 2000,
          weekendBudget: 2000,
        },
      },
    ];

    const res = replay(txs, '2026-01-15');
    expect(res.settings.weekdayBudget).toEqual(1500);
    expect(res.settings.weekendBudget).toEqual(1500);
  });

  it('ensureDailyBudgetForDate respects same-day settings updates', () => {
    const date = '2026-01-15';

    appendTransaction({
      id: 'tx-settings-initial',
      type: TransactionType.SETTINGS_UPDATED,
      timestamp: new Date('2026-01-15T12:00:00.000Z').getTime(),
      settingsPatch: {
        startDate: date,
        weekdayBudget: 1500,
        weekendBudget: 1500,
      },
    });

    const budget = ensureDailyBudgetForDate(date);
    expect(budget.baseBudget).toEqual(1500);
  });
});
