import {
  Transaction,
  TransactionType,
  Settings,
  Entry,
} from '../types';
import { DEFAULT_SETTINGS } from '../constants';

import { loadTransactions } from './transactionStore';

/**
 * Replay transactions to derive a minimal app state.
 * This is a lightweight replay implementation to start with; it
 * collects settings updates, entries, and explicit daily budget txs.
 *
 * Returns an object with the derived `settings`, `entries`, and a map of
 * `dailyBudgets` seeded by `DAILY_BUDGET_CREATED` transactions.
 */
export const replay = (transactions?: Transaction[], throughDate?: string) => {
  const txs = transactions && transactions.length ? transactions : loadTransactions();
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
