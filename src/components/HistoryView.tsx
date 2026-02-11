import React, { useMemo } from 'react';
import {
  TrendingUp,
  Info,
  Edit2,
  Ban,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Settings as SettingsIcon,
  Calendar,
  RotateCcw,
} from 'lucide-react';

import { Entry, Settings, Transaction, TransactionType } from '../types';
import { testId } from '../utils/testUtils';

/**
 * HistoryView displays a chronological record of all transactions including:
 * - User expense entries (with edit capability)
 * - Challenge creation and completion events
 * - Budget configuration changes
 * - System setting updates
 *
 * Each transaction type has a distinct visual appearance for easy identification.
 *
 * @component
 */
interface HistoryViewProps {
  transactions: Transaction[];
  entries: Entry[];
  settings: Settings;
  dailyBudgets: Record<string, { baseBudget: number; rollover: number }>;
  onEditEntry: (entry: Entry) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({
  transactions,
  entries: _entries,
  settings: _settings,
  dailyBudgets: _dailyBudgets,
  onEditEntry,
}) => {
  const currency =
    _settings.currency === 'JPY' ? '¥' : _settings.currency === '$' ? '$' : _settings.currency;

  /**
   * Maps transaction objects to display properties (icon, colors, formatting).
   * Handles all transaction types with type-safe property extraction.
   *
   * @param tx - The transaction to display
   * @returns Display configuration with styling and content
   */
  const getTransactionDisplay = (
    tx: Transaction,
  ): {
    type: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    bgColor: string;
    borderColor: string;
    textColor: string;
    description: string;
    isEditable: boolean;
    entry?: Entry;
  } => {
    switch (tx.type) {
      case TransactionType.ENTRY_ADDED: {
        const entryTx = tx as unknown as {
          entry: Entry;
        };
        const entry = entryTx.entry;
        return {
          type: 'ENTRY_ADDED',
          title: entry.note || 'Expense',
          subtitle: new Date(entry.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          icon: <TrendingUp size={18} />,
          bgColor: 'bg-amber-950/30',
          borderColor: 'border-amber-900/30',
          textColor: 'text-amber-500',
          description: `${currency}${entry.amount}`,
          isEditable: true,
          entry,
        };
      }
      case TransactionType.CHALLENGE_CREATED: {
        const chTx = tx as unknown as {
          challenge: { name: string; startDate: string; endDate: string; purpose?: string };
        };
        const challenge = chTx.challenge;
        return {
          type: 'CHALLENGE_CREATED',
          title: `Challenge Started: ${challenge.name}`,
          subtitle: `${challenge.startDate} to ${challenge.endDate}`,
          icon: <PlayCircle size={18} />,
          bgColor: 'bg-blue-950/30',
          borderColor: 'border-blue-900/30',
          textColor: 'text-blue-500',
          description: challenge.purpose || 'No description',
          isEditable: false,
        };
      }
      case TransactionType.CHALLENGE_ARCHIVED: {
        const chTx = tx as unknown as {
          challenge: {
            name: string;
            startDate: string;
            endDate: string;
            status?: string;
            finalSaved?: number;
          };
        };
        const challenge = chTx.challenge;
        const status = challenge.status || 'archived';
        const statusColors: Record<string, { text: string; bg: string }> = {
          completed: { text: 'text-emerald-500', bg: 'bg-emerald-950/30' },
          failed: { text: 'text-red-500', bg: 'bg-red-950/30' },
          cancelled: { text: 'text-slate-500', bg: 'bg-slate-900' },
        };
        const colors = statusColors[status] || statusColors['cancelled'];
        return {
          type: 'CHALLENGE_ARCHIVED',
          title: `Challenge ${status === 'completed' ? 'Completed' : status === 'failed' ? 'Failed' : 'Archived'}: ${challenge.name}`,
          subtitle: `${challenge.startDate} to ${challenge.endDate}`,
          icon:
            status === 'completed' ? (
              <CheckCircle2 size={18} />
            ) : status === 'failed' ? (
              <AlertCircle size={18} />
            ) : (
              <Ban size={18} />
            ),
          bgColor: colors?.bg || 'bg-slate-900',
          borderColor: 'border-slate-800',
          textColor: colors?.text || 'text-slate-400',
          description:
            status === 'completed'
              ? `Saved: ${currency}${Math.round(challenge.finalSaved || 0)}`
              : 'Challenge ended',
          isEditable: false,
        };
      }
      case TransactionType.DAILY_BUDGET_CREATED: {
        const budgetTx = tx as unknown as {
          date: string;
          baseBudget: number;
          rollover: number;
        };
        return {
          type: 'DAILY_BUDGET_CREATED',
          title: 'Custom Budget Set',
          subtitle: budgetTx.date,
          icon: <Calendar size={18} />,
          bgColor: 'bg-indigo-950/30',
          borderColor: 'border-indigo-900/30',
          textColor: 'text-indigo-500',
          description: `Budget: ${currency}${budgetTx.baseBudget}, Rollover: ${currency}${budgetTx.rollover}`,
          isEditable: false,
        };
      }
      case TransactionType.CUSTOM_ROLLOVER_SET: {
        const rolloverTx = tx as unknown as {
          date: string;
          rollover: number;
        };
        return {
          type: 'CUSTOM_ROLLOVER_SET',
          title: 'Rollover Adjusted',
          subtitle: rolloverTx.date,
          icon: <RotateCcw size={18} />,
          bgColor: 'bg-purple-950/30',
          borderColor: 'border-purple-900/30',
          textColor: 'text-purple-500',
          description: `Rollover: ${currency}${rolloverTx.rollover}`,
          isEditable: false,
        };
      }
      case TransactionType.SETTINGS_UPDATED: {
        return {
          type: 'SETTINGS_UPDATED',
          title: 'Settings Updated',
          subtitle: 'System configuration changed',
          icon: <SettingsIcon size={18} />,
          bgColor: 'bg-slate-900',
          borderColor: 'border-slate-800',
          textColor: 'text-slate-400',
          description: 'Your preferences were saved',
          isEditable: false,
        };
      }
      default: {
        return {
          type: 'UNKNOWN',
          title: 'Unknown Transaction',
          subtitle: new Date(0).toLocaleDateString(),
          icon: <Info size={18} />,
          bgColor: 'bg-slate-900',
          borderColor: 'border-slate-800',
          textColor: 'text-slate-400',
          description: 'Unable to display details',
          isEditable: false,
        };
      }
    }
  };

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach((tx) => {
      const date = new Date(tx.timestamp).toISOString().split('T')[0] || 'unknown';
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tx);
    });
    return groups;
  }, [transactions]);

  const dates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <div className="h-full flex flex-col pb-24">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">History</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {dates.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
            <div className="p-5 bg-slate-900 rounded-full border border-slate-800">
              <Info size={32} />
            </div>
            <p className="text-base font-medium">No transaction history yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dates.map((date) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                    {new Date(date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="h-px bg-slate-800 flex-1"></div>
                </div>

                <div className="space-y-3">
                  {groupedTransactions[date]!.map((tx) => {
                    const display = getTransactionDisplay(tx);

                    if (display.isEditable && display.entry) {
                      return (
                        <button
                          key={tx.id}
                          onClick={() => display.entry && onEditEntry(display.entry)}
                          className="w-full flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm hover:bg-slate-800/50 transition-colors group text-left"
                          {...testId('history-entry-item')}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl ${display.bgColor} flex items-center justify-center ${display.textColor} border ${display.borderColor} group-hover:scale-110 transition-transform`}
                            >
                              {display.icon}
                            </div>
                            <div>
                              <div className="font-bold text-slate-200 group-hover:text-white transition-colors">
                                {display.title}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {display.subtitle}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="font-black text-white text-lg">
                              {display.description}
                            </div>
                            <Edit2
                              size={14}
                              className="text-slate-600 group-hover:text-slate-400"
                            />
                          </div>
                        </button>
                      );
                    } else {
                      return (
                        <div
                          key={tx.id}
                          className="w-full flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm group text-left"
                          {...testId('history-transaction-item')}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl ${display.bgColor} flex items-center justify-center ${display.textColor} border ${display.borderColor}`}
                            >
                              {display.icon}
                            </div>
                            <div>
                              <div className="font-bold text-slate-200">{display.title}</div>
                              <div className="text-xs text-slate-500 font-medium">
                                {display.subtitle}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-slate-400 text-right">
                            {display.description}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
