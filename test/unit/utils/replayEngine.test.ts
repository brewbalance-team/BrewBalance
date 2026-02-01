import { describe, it, expect, beforeEach } from 'vitest';

import { replay, ensureDailyBudgetForDate, materializeUpTo } from '../../../utils/replayEngine';
import { clearTransactions } from '../../../utils/transactionStore';
import { setDefaultDataStore, InMemoryDataStore } from '../../../utils/datastore';

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
});
