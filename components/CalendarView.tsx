
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { DailyStats, BudgetStatus, Settings } from '../types';
import { getMonthDates, formatDateISO } from '../utils/dateUtils';
import { testId } from '../utils/testUtils';

import DayDetailModal from './DayDetailModal';

interface CalendarViewProps {
  statsMap: Record<string, DailyStats>;
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ statsMap, settings, onUpdateSettings }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDayStats, setSelectedDayStats] = useState<DailyStats | null>(null);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const dates = useMemo(() => {
    return getMonthDates(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth]);

  const startDayOffset = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const emptyDays = Array(startDayOffset).fill(null);

  const getStatusColor = (status: BudgetStatus, isFuture: boolean) => {
    // Muted colors for future dates
    if (isFuture) {
      switch (status) {
        case BudgetStatus.UnderAlarm: return 'bg-emerald-900/10 border-emerald-900/30 text-emerald-600/70';
        case BudgetStatus.Warning: return 'bg-amber-900/10 border-amber-900/30 text-amber-600/70';
        case BudgetStatus.OverBudget: return 'bg-red-900/10 border-red-900/30 text-red-600/70';
        default: return 'bg-slate-900 border-slate-800 text-slate-600';
      }
    }
    switch (status) {
      case BudgetStatus.UnderAlarm: return 'bg-emerald-900/20 border-emerald-900/50 text-emerald-400';
      case BudgetStatus.Warning: return 'bg-amber-900/20 border-amber-900/50 text-amber-400';
      case BudgetStatus.OverBudget: return 'bg-red-900/20 border-red-900/50 text-red-400';
      default: return 'bg-slate-900 border-slate-800 text-slate-600';
    }
  };

  const todayISO = formatDateISO(new Date());

  const handleDayClick = (dateStr: string) => {
    const stats = statsMap[dateStr];
    if (stats) {
      setSelectedDayStats(stats);
    }
  };

  const handleSaveBudget = (date: string, amount: number) => {
    const updatedCustomBudgets = { ...(settings.customBudgets || {}) };
    updatedCustomBudgets[date] = amount;
    onUpdateSettings({ ...settings, customBudgets: updatedCustomBudgets });
  };

  const handleResetBudget = (date: string) => {
    const updatedCustomBudgets = { ...(settings.customBudgets || {}) };
    delete updatedCustomBudgets[date];
    onUpdateSettings({ ...settings, customBudgets: updatedCustomBudgets });
  };

  const handleSaveRollover = (date: string, amount: number) => {
    const updatedCustomRollovers = { ...(settings.customRollovers || {}) };
    updatedCustomRollovers[date] = amount;
    onUpdateSettings({ ...settings, customRollovers: updatedCustomRollovers });
  };

  const handleResetRollover = (date: string) => {
    const updatedCustomRollovers = { ...(settings.customRollovers || {}) };
    delete updatedCustomRollovers[date];
    onUpdateSettings({ ...settings, customRollovers: updatedCustomRollovers });
  };

  return (
    <div className="h-full flex flex-col pb-20">
      <div className="flex items-center justify-between mb-6 bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-800" {...testId('calendar-header')}>
        <button onClick={handlePrevMonth} className="p-3 hover:bg-slate-800 rounded-full text-slate-400 transition-colors" {...testId('calendar-prev-month')}>
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-black text-lg text-slate-200 tracking-tight" {...testId('calendar-month-year')}>
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={handleNextMonth} className="p-3 hover:bg-slate-800 rounded-full text-slate-400 transition-colors" {...testId('calendar-next-month')}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-800 flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-7 mb-4 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className={`text-xs font-bold ${i === 0 || i === 6 ? 'text-amber-500' : 'text-slate-500'}`}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {dates.map(dateStr => {
            const dayNum = parseInt(dateStr.split('-')[2] || '0', 10);
            const stats = statsMap[dateStr];
            const hasStats = !!stats;
            const isFuture = dateStr > todayISO;
            const isToday = dateStr === todayISO;

            const statusClass = hasStats ? getStatusColor(stats.status, isFuture) : 'bg-slate-950 border-slate-800 text-slate-700';
            const currencySymbol = settings.currency === 'JPY' ? '¥' : settings.currency === '$' ? '$' : settings.currency;
            const isCustom = stats?.isCustomBudget;
            const isCustomRollover = stats?.isCustomRollover;

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                disabled={!hasStats}
                className={`aspect-square rounded-2xl border flex flex-col items-center justify-center p-0.5 relative transition-all active:scale-95 ${statusClass} ${isToday ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900 z-10' : ''}`}
              >
                <div className="flex items-start gap-0.5">
                  <span className={`text-xs font-bold ${hasStats ? (isFuture ? 'opacity-70' : '') : 'opacity-50'}`}>{dayNum}</span>
                  {(isCustom || isCustomRollover) && <div className="w-1 h-1 rounded-full bg-amber-500 mt-1"></div>}
                </div>
                {hasStats && (
                  <span className={`text-[9px] mt-0.5 font-bold truncate w-full text-center ${isFuture ? 'opacity-60 italic' : 'opacity-90'}`}>
                    {currencySymbol}{Math.round(stats.remaining)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm"></div> Safe
          </div>
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="w-4 h-4 rounded-full bg-amber-500 shadow-sm"></div> Warning
          </div>
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm"></div> Over
          </div>
        </div>
      </div>

      <DayDetailModal
        isOpen={!!selectedDayStats}
        onClose={() => setSelectedDayStats(null)}
        stats={selectedDayStats}
        currency={settings.currency === 'JPY' ? '¥' : settings.currency === '$' ? '$' : settings.currency}
        onSaveBudget={handleSaveBudget}
        onResetBudget={handleResetBudget}
        onSaveRollover={handleSaveRollover}
        onResetRollover={handleResetRollover}
      />
    </div>
  );
};

export default CalendarView;
