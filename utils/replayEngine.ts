import { Transaction, TransactionType, Settings, Entry } from '../types';
import { loadTransactions } from './transactionStore';
import { DEFAULT_SETTINGS } from '../constants';

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
      case TransactionType.SETTINGS_UPDATED:
        // @ts-ignore - settingsPatch exists on this tx variant
        settings = { ...settings, ...(tx as any).settingsPatch };
        break;
      case TransactionType.ENTRY_ADDED:
        // @ts-ignore
        entries.push((tx as any).entry as Entry);
        break;
      case TransactionType.DAILY_BUDGET_CREATED:
        // @ts-ignore
        dailyBudgets[(tx as any).date] = {
          // @ts-ignore
          baseBudget: (tx as any).baseBudget,
          // @ts-ignore
          rollover: (tx as any).rollover,
        };
        break;
      case TransactionType.CUSTOM_ROLLOVER_SET:
        // We represent this as a generated daily budget override in the map
        // @ts-ignore
        dailyBudgets[(tx as any).date] = dailyBudgets[(tx as any).date] || { baseBudget: 0, rollover: 0 };
        // @ts-ignore
        dailyBudgets[(tx as any).date].rollover = (tx as any).rollover;
        break;
      case TransactionType.CHALLENGE_CREATED:
      case TransactionType.CHALLENGE_ARCHIVED:
        // Challenges are part of settings in our model; apply to settings if present
        // @ts-ignore
        if ((tx as any).challenge) {
          // Apply to active/past depending on archived flag
          // For now, leave challenge handling to a later pass
        }
        break;
      default:
        break;
    }
  }

  return {
    settings,
    entries,
    dailyBudgets,
    transactions: txs,
  };
};
