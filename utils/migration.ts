/**
 * @fileoverview Data model migration utilities for transitioning from direct
 * localStorage persistence to a transaction log with replay capability.
 *
 * This module handles the one-time migration of existing entries and settings
 * to the new transaction-based model, ensuring no historical data is lost and
 * past budgets are immutable.
 *
 * @module utils/migration
 */

import { Transaction, TransactionType, Entry, Settings } from '../types';
import { STORAGE_KEYS } from '../constants';

import { DataStore, getDefaultDataStore } from './datastore';
import { loadTransactions, saveTransactions } from './transactionStore';
import { replay, materializeUpTo } from './replayEngine';
import { getTodayISO, addDays } from './dateUtils';

/**
 * Report tracking migration progress and results.
 */
export interface MigrationReport {
  /** Whether migration was already done */
  alreadyMigrated: boolean;
  /** Number of entry transactions created */
  entriesCreated: number;
  /** Number of daily budget transactions created */
  budgetsCreated: number;
  /** Number of settings transactions created */
  settingsCreated: number;
  /** Total transactions after migration */
  totalTransactions: number;
  /** List of dates that were materialized */
  materializedDates: string[];
  /** Any warnings or errors during migration */
  warnings: string[];
}

/**
 * Checks if the app has already been migrated to the transaction log model.
 * Considers migration done if transactions exist in storage.
 *
 * @param {DataStore} [store] - Optional custom DataStore instance
 * @returns {boolean} True if already migrated
 */
export const isMigrated = (store?: DataStore): boolean => {
  const s = store || getDefaultDataStore();
  const txs = loadTransactions(s);
  return txs.length > 0;
};

/**
 * Migrates existing entries and settings from localStorage to transaction log.
 *
 * This is a one-time operation that:
 * 1. Reads existing entries and settings from localStorage
 * 2. Creates ENTRY_ADDED transactions for each entry (sorted by timestamp)
 * 3. Creates an initial SETTINGS_UPDATED transaction
 * 4. Materializes daily budgets for all past dates to lock history
 * 5. Persists all transactions
 *
 * Idempotent - calling multiple times returns the same result.
 *
 * @param {DataStore} [store] - Optional custom DataStore instance
 * @returns {MigrationReport} Report of actions taken during migration
 *
 * @example
 * const report = migrateFromLegacyModel();
 * console.log(`Created ${report.entriesCreated} entry transactions`);
 * console.log(`Materialized ${report.materializedDates.length} past dates`);
 */
export const migrateFromLegacyModel = (store?: DataStore): MigrationReport => {
  const s = store || getDefaultDataStore();
  const warnings: string[] = [];

  // Check if already migrated
  const existing = loadTransactions(s);
  if (existing.length > 0) {
    return {
      alreadyMigrated: true,
      entriesCreated: 0,
      budgetsCreated: 0,
      settingsCreated: 0,
      totalTransactions: existing.length,
      materializedDates: [],
      warnings: ['Migration already completed.'],
    };
  }

  const transactions: Transaction[] = [];
  let entriesCreated = 0;
  let settingsCreated = 0;

  try {
    // Load legacy data from localStorage
    const legacySettings = loadLegacySettings(s);
    const legacyEntries = loadLegacyEntries(s);

    // Create initial SETTINGS_UPDATED transaction (always, even if no changes from default)
    const settingsTx: Transaction = {
      id: `tx-settings-initial`,
      type: TransactionType.SETTINGS_UPDATED,
      timestamp: 0, // Earliest timestamp to ensure it's processed first
      settingsPatch: legacySettings || {},
    };
    transactions.push(settingsTx);
    settingsCreated = 1;

    // Create ENTRY_ADDED transactions, sorted by timestamp
    const sortedEntries = [...legacyEntries].sort((a, b) => a.timestamp - b.timestamp);
    for (const entry of sortedEntries) {
      const entryTx: Transaction = {
        id: `tx-entry-${entry.id}`,
        type: TransactionType.ENTRY_ADDED,
        timestamp: entry.timestamp,
        entry,
      };
      transactions.push(entryTx);
      entriesCreated += 1;
    }

    // Save all transactions
    saveTransactions(transactions, s);

    // Materialize daily budgets for all past dates
    const today = getTodayISO();
    const yesterday = addDays(today, -1);
    const materialized = materializeUpTo(yesterday);

    // Count budgets created from materialization
    const replayResult = replay(transactions, yesterday, s);
    const budgetsCreated = Object.keys(replayResult.dailyBudgets).length;

    return {
      alreadyMigrated: false,
      entriesCreated,
      budgetsCreated,
      settingsCreated,
      totalTransactions: transactions.length + budgetsCreated,
      materializedDates: materialized,
      warnings,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnings.push(`Migration error: ${msg}`);
    return {
      alreadyMigrated: false,
      entriesCreated,
      budgetsCreated: 0,
      settingsCreated,
      totalTransactions: transactions.length,
      materializedDates: [],
      warnings,
    };
  }
};

/**
 * Loads legacy settings from localStorage.
 *
 * @param {DataStore} [store] - Optional custom DataStore instance
 * @returns {Partial<Settings> | null} Loaded settings or null if not found
 */
const loadLegacySettings = (store?: DataStore): Partial<Settings> | null => {
  const s = store || getDefaultDataStore();
  try {
    const stored = s.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      return JSON.parse(stored) as Partial<Settings>;
    }
  } catch (e) {
    console.warn('Failed to parse legacy settings', e);
  }
  return null;
};

/**
 * Loads legacy entries from localStorage.
 *
 * @param {DataStore} [store] - Optional custom DataStore instance
 * @returns {Entry[]} Loaded entries array, empty if not found
 */
const loadLegacyEntries = (store?: DataStore): Entry[] => {
  const s = store || getDefaultDataStore();
  try {
    const stored = s.getItem(STORAGE_KEYS.ENTRIES);
    if (stored) {
      return JSON.parse(stored) as Entry[];
    }
  } catch (e) {
    console.warn('Failed to parse legacy entries', e);
  }
  return [];
};
