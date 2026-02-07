import { Transaction, TransactionType, Settings, Entry } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

import { loadTransactions, appendTransaction } from './transactionStore';
import { DataStore } from './datastore';
import { calculateStats } from './financeHelpers';
import { formatDateISO, addDays } from './dateUtils';

/**
 * Replay transactions to derive a minimal app state.
 * This is a lightweight replay implementation to start with; it
 * collects settings updates, entries, and explicit daily budget txs.
 *
 * Returns an object with the derived `settings`, `entries`, and a map of
 * `dailyBudgets` seeded by `DAILY_BUDGET_CREATED` transactions.
 *
 * @param {Transaction[]} [transactions] - Optional pre-loaded transactions. If not provided, loads from store.
 * @param {string} [throughDate] - Optional ISO date string to replay through (inclusive).
 * @param {DataStore} [store] - Optional custom DataStore instance. Only used if transactions are not provided.
 * @returns Replay result containing settings, entries, daily budgets, and transactions.
 */
export const replay = (transactions?: Transaction[], throughDate?: string, store?: DataStore) => {
  const txs = transactions && transactions.length ? transactions : loadTransactions(store);
  // Already sorted by transactionStore but ensure order
  txs.sort((a, b) => a.timestamp - b.timestamp);

  let settings: Settings = { ...DEFAULT_SETTINGS } as Settings;
  const entries: Entry[] = [];
  const dailyBudgets: Record<string, { baseBudget: number; rollover: number }> = {};

  for (const tx of txs) {
    if (throughDate && tx.timestamp > new Date(throughDate).getTime()) break;

    switch (tx.type) {
      case TransactionType.SETTINGS_UPDATED: {
        const settingsTx = tx;
        settings = { ...settings, ...settingsTx.settingsPatch };
        break;
      }
      case TransactionType.ENTRY_ADDED: {
        const entryTx = tx;
        entries.push(entryTx.entry);
        break;
      }
      case TransactionType.DAILY_BUDGET_CREATED: {
        const budgetTx = tx;
        dailyBudgets[budgetTx.date] = {
          baseBudget: budgetTx.baseBudget,
          rollover: budgetTx.rollover,
        };
        break;
      }
      case TransactionType.CUSTOM_ROLLOVER_SET: {
        const rolloverTx = tx;
        // We represent this as a generated daily budget override in the map
        const existing = dailyBudgets[rolloverTx.date] || {
          baseBudget: 0,
          rollover: 0,
        };
        dailyBudgets[rolloverTx.date] = { ...existing, rollover: rolloverTx.rollover };
        break;
      }
      case TransactionType.CHALLENGE_CREATED:
      case TransactionType.CHALLENGE_ARCHIVED: {
        // Challenges are part of settings in our model; apply to settings if present
        // For now, leave challenge handling to a later pass
        const challengeTx = tx;
        if (challengeTx.challenge) {
          // Apply to active/past depending on archived flag
        }
        break;
      }
      default: {
        const _: never = tx;
        return _;
      }
    }
  }

  return {
    settings,
    entries,
    dailyBudgets,
    transactions: txs,
  };
};

/**
 * Ensure a DAILY_BUDGET_CREATED transaction exists for `date`.
 * If missing, this will compute effective settings and entries up to `date`,
 * derive the day's baseBudget and starting rollover from `calculateStats`,
 * append a `DAILY_BUDGET_CREATED` transaction, and return the budget object.
 */
export const ensureDailyBudgetForDate = (date: string, transactions?: Transaction[]) => {
  const txs = transactions && transactions.length ? transactions : loadTransactions();
  const { settings, entries, dailyBudgets } = replay(txs, date);

  if (dailyBudgets[date]) {
    return dailyBudgets[date];
  }

  // Compute stats up to this date to derive the applied budget/rollover
  const statsMap = calculateStats(settings, entries, date);
  const dayStats = statsMap[date];
  if (!dayStats) {
    // If stats couldn't be derived, fall back to zeroed budget
    const fallback = { baseBudget: 0, rollover: 0 };
    const tx = {
      id: `tx-daily-${date}`,
      type: TransactionType.DAILY_BUDGET_CREATED,
      timestamp: Date.now(),
      date,
      baseBudget: fallback.baseBudget,
      rollover: fallback.rollover,
    } as Transaction;
    appendTransaction(tx);
    return fallback;
  }

  const budget = { baseBudget: dayStats.baseBudget, rollover: dayStats.rollover };
  const tx = {
    id: `tx-daily-${date}`,
    type: TransactionType.DAILY_BUDGET_CREATED,
    timestamp: Date.now(),
    date,
    baseBudget: budget.baseBudget,
    rollover: budget.rollover,
  } as Transaction;
  appendTransaction(tx);
  return budget;
};

/**
 * Materialize DAILY_BUDGET_CREATED transactions for all past dates from
 * `settings.startDate` up to `throughDate` (inclusive). Returns the list of
 * dates that were materialized.
 */
export const materializeUpTo = (throughDate: string) => {
  const txs = loadTransactions();
  const { settings } = replay(txs);
  const start = settings.startDate || formatDateISO(new Date());

  const materialized: string[] = [];
  let cur = start;
  while (cur <= throughDate) {
    // Only materialize strictly before today to lock history
    const today = formatDateISO(new Date());
    if (cur < today) {
      const existing = replay(txs, cur).dailyBudgets[cur];
      if (!existing) {
        ensureDailyBudgetForDate(cur, txs);
        materialized.push(cur);
      }
    }
    cur = addDays(cur, 1);
  }

  return materialized;
};
