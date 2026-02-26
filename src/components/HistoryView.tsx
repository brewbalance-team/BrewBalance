import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Info,
  Edit2,
  Trophy,
  Target,
  Ban,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  AlertOctagon,
  Percent,
  DollarSign,
  Wallet,
  Zap,
} from 'lucide-react';

import { Entry, Settings, Transaction, TransactionType } from '../types';
import {
  calculateChallengeTotalBudget,
  isChallengeFailed,
  calculateStats,
} from '../utils/financeHelpers';
import { getTodayISO } from '../utils/dateUtils';
import { testId } from '../utils/testUtils';

interface HistoryViewProps {
  entries: Entry[];
  settings: Settings;
  dailyBudgets: Record<string, { baseBudget: number; rollover: number }>;
  onEditEntry: (entry: Entry) => void;
  transactions: Transaction[];
}

const HistoryView: React.FC<HistoryViewProps> = ({
  entries,
  settings,
  dailyBudgets,
  onEditEntry,
  transactions,
}) => {
  const [viewMode, setViewMode] = useState<'expenses' | 'challenges'>('expenses');
  const currency =
    settings.currency === 'JPY' ? '¥' : settings.currency === '$' ? '$' : settings.currency;
  const todayISO = getTodayISO();

  // Convert transactions into displayable ledger items
  interface LedgerItem {
    id: string;
    timestamp: number;
    date: string;
    type: TransactionType;
    description: string;
    amount: number;
    isIncrease: boolean;
    isHumanInitiated: boolean;
    icon: React.ReactNode;
    transaction: Transaction;
  }

  const ledgerItems = useMemo(() => {
    const items: LedgerItem[] = [];

    for (const tx of transactions) {
      // Only include transactions from current date and older
      let txDate = '';
      let txDescription = '';
      let txAmount = 0;
      let isIncrease = false;
      let isHumanInitiated = false;

      switch (tx.type) {
        case TransactionType.ENTRY_ADDED: {
          const entryTx = tx as unknown as { entry: Entry };
          const entry = entryTx.entry;
          txDate = entry.date;
          txDescription = entry.note;
          txAmount = entry.amount;
          isIncrease = false; // Expense decreases budget
          isHumanInitiated = true;
          break;
        }

        case TransactionType.DAILY_BUDGET_CREATED: {
          const budgetTx = tx as unknown as { date: string; baseBudget: number };
          txDate = budgetTx.date;
          txDescription = `Daily budget created`;
          txAmount = budgetTx.baseBudget;
          isIncrease = true; // Daily budget increases available funds
          isHumanInitiated = false;
          break;
        }

        case TransactionType.CUSTOM_ROLLOVER_SET: {
          const rolloverTx = tx as unknown as {
            date: string;
            rollover: number;
            delta: number;
            reason?: string;
          };
          txDate = rolloverTx.date;
          txDescription = rolloverTx.reason || 'Rollover adjusted';
          txAmount = Math.abs(rolloverTx.delta || rolloverTx.rollover); // Use delta if available, fallback to rollover for old transactions
          isIncrease =
            (rolloverTx.delta !== undefined ? rolloverTx.delta : rolloverTx.rollover) > 0; // Rollovers can increase or decrease
          isHumanInitiated = true; // User set custom rollover
          break;
        }

        case TransactionType.SETTINGS_UPDATED: {
          // Skip settings updates - the actual budget impact is captured
          // in rollover adjustment transactions (CUSTOM_ROLLOVER_SET)
          continue;
        }

        case TransactionType.CHALLENGE_CREATED:
        case TransactionType.CHALLENGE_ARCHIVED: {
          // Skip challenges - they're displayed in their own view
          continue;
        }

        default:
          continue;
      }

      // Filter: only include transactions from current date and older
      if (txDate <= todayISO) {
        items.push({
          id: tx.id,
          timestamp: tx.timestamp,
          date: txDate,
          type: tx.type,
          description: txDescription,
          amount: txAmount,
          isIncrease,
          isHumanInitiated,
          icon: null, // Assign below
          transaction: tx,
        });
      }
    }

    // Sort by timestamp descending (newest first)
    items.sort((a, b) => b.timestamp - a.timestamp);

    // Assign icons
    return items.map((item) => {
      let icon: React.ReactNode;
      if (item.type === TransactionType.ENTRY_ADDED) {
        icon = <TrendingUp size={18} />;
      } else if (item.type === TransactionType.DAILY_BUDGET_CREATED) {
        icon = <Zap size={18} />;
      } else if (item.type === TransactionType.CUSTOM_ROLLOVER_SET) {
        icon = <TrendingUp size={18} />;
      } else {
        icon = <Info size={18} />;
      }
      return { ...item, icon };
    });
  }, [transactions, todayISO]);

  // Calculate needed stats to check failure for active challenge
  const activeChallengeStatus = useMemo(() => {
    if (!settings.activeChallenge) return null;

    const statsMap = calculateStats(settings, entries, todayISO, dailyBudgets);

    // Determine relevant date for stats
    const isPastEnd = todayISO > settings.activeChallenge.endDate;
    const referenceDate = isPastEnd ? settings.activeChallenge.endDate : todayISO;
    const refStats = statsMap[referenceDate];
    const savedSoFar = refStats?.challengeSavedSoFar || 0;

    const isFailed = isChallengeFailed(settings.activeChallenge, settings, savedSoFar, todayISO);

    return { isFailed, savedSoFar };
  }, [settings, entries, todayISO, dailyBudgets]);

  // Combine Active and Past Challenges
  const allChallenges = useMemo(() => {
    const list = settings.pastChallenges ? [...settings.pastChallenges] : [];
    if (settings.activeChallenge) {
      list.unshift(settings.activeChallenge);
    }
    return list;
  }, [settings.pastChallenges, settings.activeChallenge]);

  return (
    <div className="h-full flex flex-col pb-24">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">History</h2>

        <div
          className="bg-slate-900 p-1 rounded-xl flex gap-1 border border-slate-800"
          {...testId('history-tabs')}
        >
          <button
            onClick={() => setViewMode('expenses')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'expenses' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            {...testId('history-expenses-tab')}
          >
            Expenses
          </button>
          <button
            onClick={() => setViewMode('challenges')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'challenges' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            {...testId('history-challenges-tab')}
          >
            Challenges
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {viewMode === 'expenses' ? (
          <div className="space-y-3">
            {ledgerItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
                <div className="p-5 bg-slate-900 rounded-full border border-slate-800">
                  <Info size={32} />
                </div>
                <p className="text-base font-medium">No transactions recorded yet</p>
              </div>
            ) : (
              ledgerItems.map((item) => {
                // Determine colors based on transaction type and direction
                const bgColor = item.isHumanInitiated ? 'bg-slate-900' : 'bg-slate-800/50';
                const borderColor = item.isHumanInitiated
                  ? 'border-slate-700'
                  : 'border-slate-700/50';
                const amountColor = item.isIncrease ? 'text-emerald-400' : 'text-red-400';
                const iconBgColor = item.isIncrease
                  ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/30'
                  : 'bg-red-950/30 text-red-500 border-red-900/30';
                const typeLabel = item.isHumanInitiated ? 'User' : 'System';
                const typeLabelColor = item.isHumanInitiated ? 'text-blue-400' : 'text-amber-400';

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      // Only allow editing of human-initiated ENTRY_ADDED transactions
                      if (item.type === TransactionType.ENTRY_ADDED && item.isHumanInitiated) {
                        const entryTx = item.transaction as unknown as {
                          entry: Entry;
                        };
                        onEditEntry(entryTx.entry);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-4 ${bgColor} rounded-2xl border ${borderColor} shadow-sm hover:bg-slate-800/50 transition-colors group text-left`}
                    {...testId('ledger-item')}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className={`w-10 h-10 rounded-xl ${iconBgColor} flex items-center justify-center border group-hover:scale-110 transition-transform flex-shrink-0`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex flex-1 flex-col min-w-0">
                        <div
                          className="font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-full"
                          style={{ maxWidth: '100%' }}
                          title={item.description}
                        >
                          {item.description}
                        </div>
                        <div className="text-xs text-slate-500 font-medium space-x-2 flex items-center">
                          <span>
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${typeLabelColor}`}
                          >
                            {typeLabel}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 ${amountColor} flex-shrink-0 min-w-[90px] justify-end`}
                        style={{ maxWidth: 120 }}
                      >
                        <span
                          className="font-black text-lg truncate max-w-[80px] whitespace-nowrap overflow-hidden text-ellipsis"
                          title={`${item.isIncrease ? '+' : '-'}${currency}${item.amount}`}
                          data-testid="ledger-amount"
                        >
                          {`${item.isIncrease ? '+' : '-'}${currency}${item.amount}`}
                        </span>
                        {item.type === TransactionType.ENTRY_ADDED && item.isHumanInitiated && (
                          <Edit2
                            size={14}
                            className="text-slate-600 group-hover:text-slate-400 flex-shrink-0"
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {allChallenges.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
                <div className="p-5 bg-slate-900 rounded-full border border-slate-800">
                  <Trophy size={32} />
                </div>
                <p className="text-base font-medium">No challenges found</p>
              </div>
            ) : (
              allChallenges.map((challenge) => {
                let displayStatus = 'Cancelled';
                let statusColor;
                let bgClass = 'bg-slate-900 border-slate-800';
                let icon = <Ban size={18} />;

                // For active challenge, check if failed
                const isActive = challenge.status === 'active';
                const isActiveFailed = isActive && activeChallengeStatus?.isFailed;

                // Check historical status
                // Note: We use the status stored in history for completed challenges
                const status = challenge.status;

                if (isActive) {
                  if (isActiveFailed) {
                    displayStatus = 'Failed (Active)';
                    statusColor = 'text-red-400';
                    bgClass =
                      'bg-red-950/20 border-red-900/40 shadow-[0_0_15px_rgba(220,38,38,0.2)]';
                    icon = <AlertOctagon size={18} />;
                  } else {
                    displayStatus = 'In Progress';
                    statusColor = 'text-blue-400';
                    bgClass =
                      'bg-slate-900 border-blue-900/50 shadow-[0_0_15px_rgba(30,58,138,0.2)]';
                    icon = <PlayCircle size={18} />;
                  }
                } else {
                  if (status === 'completed') {
                    displayStatus = 'Successful';
                    statusColor = 'text-emerald-400';
                    bgClass = 'bg-emerald-950/20 border-emerald-900/40';
                    icon = <CheckCircle2 size={18} />;
                  } else if (status === 'failed') {
                    displayStatus = 'Failed';
                    statusColor = 'text-red-400';
                    bgClass = 'bg-red-950/20 border-red-900/40';
                    icon = <AlertCircle size={18} />;
                  } else {
                    displayStatus = 'Cancelled';
                    statusColor = 'text-slate-400';
                    bgClass = 'bg-slate-900 border-slate-800';
                    icon = <Ban size={18} />;
                  }
                }

                // Determine saved amount to show
                const savedAmount = isActive
                  ? activeChallengeStatus?.savedSoFar || 0
                  : challenge.finalSaved || 0;

                // Calculate Target Amount
                const targetPct = challenge.targetPercentage ?? 100;
                const totalBudget = isActive
                  ? calculateChallengeTotalBudget(challenge, settings)
                  : challenge.finalTotalBudget || 0;
                const targetAmount = totalBudget * (targetPct / 100);

                return (
                  <div
                    key={challenge.id}
                    className={`p-5 rounded-3xl border ${bgClass} shadow-sm relative overflow-hidden transition-all`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-black text-white">{challenge.name}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                          {challenge.startDate} — {challenge.endDate}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-black/40 border border-white/5 ${statusColor}`}
                      >
                        {icon}
                        <span>{displayStatus}</span>
                      </div>
                    </div>

                    {challenge.purpose && (
                      <div className="mb-4 flex items-center gap-2 text-slate-400 text-xs">
                        <Target size={14} className="text-amber-500" />
                        <span>
                          Goal:{' '}
                          <span className="text-slate-200 font-bold">{challenge.purpose}</span>
                        </span>
                      </div>
                    )}

                    {/* Detailed Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                      <div className="bg-slate-950/50 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          <Percent size={10} /> Criteria
                        </div>
                        <div className="text-sm font-black text-slate-300">{targetPct}%</div>
                      </div>

                      <div className="bg-slate-950/50 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          <Wallet size={10} /> Target
                        </div>
                        <div className="text-sm font-black text-slate-300">
                          {currency}
                          {Math.round(targetAmount)}
                        </div>
                      </div>

                      <div className="bg-slate-950/50 rounded-xl p-2 flex flex-col items-center justify-center border border-white/5">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          <DollarSign size={10} /> Actual
                        </div>
                        <div
                          className={`text-sm font-black ${savedAmount >= targetAmount ? 'text-emerald-400' : 'text-slate-200'}`}
                        >
                          {currency}
                          {Math.round(savedAmount)}
                        </div>
                      </div>
                    </div>

                    {isActive && !isActiveFailed && (
                      <div className="mt-2 flex justify-center items-center">
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest animate-pulse">
                          Active Now
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
