import { STORAGE_KEYS } from '../constants';
import { Transaction, TransactionType, Entry, Settings } from '../types';

import { saveTransactions, loadTransactions } from './transactionStore';
import { getDefaultDataStore } from './datastore';
import { calculateStats } from './financeHelpers';
import { formatDateISO } from './dateUtils';
import { now, getCurrentDate } from './clock';

export const makeEntryAddedTx = (entry: Entry): Transaction => ({
  id: `tx-${entry.id}`,
  type: TransactionType.ENTRY_ADDED,
  timestamp: entry.timestamp,
  entry,
});

export const makeSettingsUpdatedTx = (settings: Partial<Settings>): Transaction => ({
  id: `tx-settings-${crypto.randomUUID()}`,
  type: TransactionType.SETTINGS_UPDATED,
  timestamp: now(),
  settingsPatch: settings,
});

export const makeDailyBudgetCreatedTx = (
  date: string,
  baseBudget: number,
  rollover: number,
): Transaction => ({
  id: `tx-daily-${date}`,
  type: TransactionType.DAILY_BUDGET_CREATED,
  timestamp: now(),
  date,
  baseBudget,
  rollover,
});

/**
 * Creates a CUSTOM_ROLLOVER_SET transaction to adjust the rollover for a specific date.
 *
 * @param date - ISO date string (YYYY-MM-DD) for the transaction
 * @param rollover - The new rollover value after adjustment
 * @param delta - The actual change amount (positive = increase, negative = decrease). Defaults to 0.
 * @param reason - Optional reason for the adjustment (e.g., 'base budget change', 'manual rollover adjustment')
 * @returns A CustomRolloverSetTransaction object
 */
export const makeCustomRolloverTx = (
  date: string,
  rollover: number,
  delta: number = 0,
  reason?: string,
): Transaction => ({
  id: `tx-roll-${date}-${crypto.randomUUID()}`,
  type: TransactionType.CUSTOM_ROLLOVER_SET,
  timestamp: now(),
  date,
  rollover,
  delta,
  ...(reason !== undefined && { reason }),
});

/**
 * Migrate existing localStorage `SETTINGS` and `ENTRIES` into transactions.
 * - If transactions already exist, this is a no-op.
 * - Otherwise: seed a SETTINGS_UPDATED tx (full settings), ENTRY_ADDED txs for each entry,
 *   and DAILY_BUDGET_CREATED txs for past dates using the current `calculateStats` results.
 */
export const migrateExistingToTransactions = (store?: import('./datastore').DataStore): void => {
  const s = store || getDefaultDataStore();
  const existing = loadTransactions(s);
  if (existing.length > 0) return; // already migrated

  // Load current settings and entries from the provided store (or default store)
  let settings: Settings | null = null;
  try {
    const raw = s.getItem(STORAGE_KEYS.SETTINGS);
    settings = raw ? (JSON.parse(raw) as Settings) : null;
  } catch (e) {
    console.error('Failed to read SETTINGS for migration', e);
  }

  let entries: Entry[] = [];
  try {
    const raw = s.getItem(STORAGE_KEYS.ENTRIES);
    entries = raw ? (JSON.parse(raw) as Entry[]) : [];
  } catch (e) {
    console.error('Failed to read ENTRIES for migration', e);
  }

  const txs: Transaction[] = [];

  if (settings) {
    // Seed full settings as an initial SETTINGS_UPDATED
    txs.push({
      id: `tx-settings-initial-${formatDateISO(getCurrentDate())}`,
      type: TransactionType.SETTINGS_UPDATED,
      timestamp: now(),
      settingsPatch: settings,
    } as Transaction);
  }

  // Seed entries ordered by timestamp
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  for (const e of sorted) {
    txs.push(makeEntryAddedTx(e));
  }

  // If settings present, compute historical daily budgets up to yesterday and seed DAILY_BUDGET_CREATED txs
  if (settings) {
    const stats = calculateStats(settings, entries);
    const todayISO = formatDateISO(getCurrentDate());
    for (const date of Object.keys(stats)) {
      if (date < todayISO) {
        const s = stats[date]!;
        txs.push(makeDailyBudgetCreatedTx(date, s.baseBudget, s.rollover));
      }
    }
  }

  // Persist all transactions atomically
  try {
    saveTransactions(txs, s);
  } catch (e) {
    console.error('Failed to save migrated transactions', e);
  }

  // Optionally: keep existing SETTINGS/ENTRIES in place as read-only until App fully migrates.
};
