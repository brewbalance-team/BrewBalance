import { describe, it, expect, beforeEach } from 'vitest';

import { migrateFromLegacyModel, isMigrated } from '../../../src/utils/migration';
import { replay } from '../../../src/utils/replayEngine';
import { clearTransactions, loadTransactions } from '../../../src/utils/transactionStore';
import { setDefaultDataStore, InMemoryDataStore } from '../../../src/utils/datastore';
import { STORAGE_KEYS } from '../../../src/constants';
import { Entry, Settings, TransactionType } from '../../../src/types';

let store: InMemoryDataStore;

beforeEach(() => {
  store = new InMemoryDataStore();
  setDefaultDataStore(store);
  clearTransactions(store);

  // Clear all storage
  store.removeItem(STORAGE_KEYS.SETTINGS);
  store.removeItem(STORAGE_KEYS.ENTRIES);
  store.removeItem(STORAGE_KEYS.TRANSACTIONS);
  store.removeItem(STORAGE_KEYS.CHECKPOINTS);
});

describe('Migration from legacy model', () => {
  it('isMigrated returns false when no transactions exist', () => {
    const migrated = isMigrated(store);
    expect(migrated).toBe(false);
  });

  it('isMigrated returns true after migration', () => {
    migrateFromLegacyModel(store);
    const migrated = isMigrated(store);
    expect(migrated).toBe(true);
  });

  it('migration is idempotent - calling twice returns same result', () => {
    const report1 = migrateFromLegacyModel(store);
    const report2 = migrateFromLegacyModel(store);

    expect(report2.alreadyMigrated).toBe(true);
    expect(report2.totalTransactions).toEqual(report1.totalTransactions);
  });

  it('migration preserves existing entries', () => {
    // Set up legacy entries in storage
    const legacyEntries: Entry[] = [
      {
        id: 'entry-1',
        date: '2026-01-15',
        amount: 100,
        note: 'Coffee',
        timestamp: 1000000,
      },
      {
        id: 'entry-2',
        date: '2026-01-16',
        amount: 200,
        note: 'Lunch',
        timestamp: 2000000,
      },
    ];
    store.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(legacyEntries));

    const report = migrateFromLegacyModel(store);

    expect(report.entriesCreated).toBe(2);
    expect(report.alreadyMigrated).toBe(false);

    // Verify entries are in transactions
    const { entries: replayedEntries } = replay(undefined, undefined, store);
    expect(replayedEntries).toHaveLength(2);
    expect(replayedEntries[0]?.id).toEqual('entry-1');
    expect(replayedEntries[1]?.id).toEqual('entry-2');
  });

  it('migration preserves existing settings', () => {
    const legacySettings: Partial<Settings> = {
      weekdayBudget: 5000,
      weekendBudget: 3000,
      currency: 'JPY',
      userName: 'TestUser',
    };
    store.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(legacySettings));

    const report = migrateFromLegacyModel(store);

    expect(report.settingsCreated).toBe(1);
    expect(report.alreadyMigrated).toBe(false);

    // Verify settings are in transactions
    const { settings: replayedSettings } = replay(undefined, undefined, store);
    expect(replayedSettings.weekdayBudget).toEqual(5000);
    expect(replayedSettings.weekendBudget).toEqual(3000);
    expect(replayedSettings.userName).toEqual('TestUser');
  });

  it('migration creates transactions in correct order', () => {
    const legacySettings: Partial<Settings> = {
      weekdayBudget: 5000,
    };
    const legacyEntries: Entry[] = [
      {
        id: 'entry-1',
        date: '2026-01-15',
        amount: 100,
        note: 'Item',
        timestamp: 1000000,
      },
    ];

    store.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(legacySettings));
    store.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(legacyEntries));

    migrateFromLegacyModel(store);

    const transactions = loadTransactions(store);
    // Settings should be first (timestamp 0), then entries
    expect(transactions[0]?.type).toEqual(TransactionType.SETTINGS_UPDATED);
    expect(transactions[1]?.type).toEqual(TransactionType.ENTRY_ADDED);
  });

  it('migration returns report with materialized dates', () => {
    const legacySettings: Partial<Settings> = {
      weekdayBudget: 5000,
      startDate: '2026-01-10',
    };
    store.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(legacySettings));

    const report = migrateFromLegacyModel(store);

    // Should have materialized some past dates
    expect(Array.isArray(report.materializedDates)).toBe(true);
  });

  it('migration creates settings transaction with timestamp 0 for determinism', () => {
    const legacySettings: Partial<Settings> = {
      weekdayBudget: 5000,
    };
    store.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(legacySettings));

    migrateFromLegacyModel(store);

    const transactions = loadTransactions(store);
    const settingsTx = transactions.find((tx) => tx.type === TransactionType.SETTINGS_UPDATED);
    expect(settingsTx?.timestamp).toEqual(0);
  });
});
