
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Flame, TrendingUp, ArrowRight, History } from 'lucide-react';
import { DailyStats, BudgetStatus, Settings } from '../types';
import { getTodayISO } from '../utils/dateUtils';

interface DashboardProps {
  statsMap: Record<string, DailyStats>;
  settings: Settings;
  streak: number;
  onAddEntry?: (amount: number, note: string, date: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ statsMap, settings, streak }) => {
  const todayISO = getTodayISO();
  const todayStats = statsMap[todayISO] || {
    date: todayISO,
    baseBudget: 0,
    rollover: 0,
    totalAvailable: 0,
    spent: 0,
    remaining: 0,
    status: BudgetStatus.UnderAlarm,
    entries: []
  };

  const isBudgetSet = settings.weekdayBudget > 0 || settings.weekendBudget > 0;

  const getStatusDetails = (status: BudgetStatus) => {
    if (!isBudgetSet) {
         return { 
           color: '#475569', // slate-600
           text: 'text-slate-400', 
           bg: 'bg-slate-900', 
           border: 'border-slate-800',
           label: 'No budget settings yet'
         };
    }
    switch (status) {
      case BudgetStatus.UnderAlarm:
        return { 
            color: '#10b981', 
            text: 'text-emerald-400', 
            bg: 'bg-emerald-950/30', 
            border: 'border-emerald-900/50', 
            label: 'Smooth Sailing' 
        };
      case BudgetStatus.Warning:
        return { 
            color: '#fbbf24', 
            text: 'text-amber-400', 
            bg: 'bg-amber-950/30', 
            border: 'border-amber-900/50', 
            label: 'Watch Out!' 
        };
      case BudgetStatus.OverBudget:
        return { 
            color: '#f87171', 
            text: 'text-red-400', 
            bg: 'bg-red-950/30', 
            border: 'border-red-900/50', 
            label: 'Budget Blown!' 
        };
    }
  };

  const statusDetails = getStatusDetails(todayStats.status);

  const data = [
    { name: 'Spent', value: Math.max(0, todayStats.spent) },
    { name: 'Remaining', value: Math.max(0, todayStats.remaining) },
  ];

  const isOverBudget = todayStats.spent > todayStats.totalAvailable;
  // If over budget, show full red ring. If no budget set, show grey ring.
  const chartData = isOverBudget 
    ? [{ name: 'Over', value: 1 }] 
    : !isBudgetSet 
      ? [{ name: 'Unset', value: 1 }]
      : data;

  const currency = settings.currency === 'JPY' ? '¥' : settings.currency === '$' ? '$' : settings.currency;

  const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="h-full flex flex-col pb-24">
      {/* Date Display above Status Bar */}
      <div className="mb-4 px-1">
        <h2 className="text-slate-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
           <span className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] ${isBudgetSet ? '' : 'bg-slate-600'}`} style={{ backgroundColor: isBudgetSet ? statusDetails.color : undefined }}></span>
           {formattedDate}
        </h2>
      </div>

      {/* Main Status Card */}
      <div className={`relative p-6 rounded-[2.5rem] border ${statusDetails.border} ${statusDetails.bg} transition-all duration-500 shadow-lg mb-6`}>
        <div className="flex justify-between items-start mb-2">
           <div className="space-y-1">
              <h2 className={`text-lg font-black ${statusDetails.text} uppercase tracking-widest`}>{statusDetails.label}</h2>
              {isBudgetSet && (
                <div className="flex flex-col gap-0.5 mt-1">
                    <p className="text-slate-400/70 text-[10px] font-bold uppercase tracking-wider">
                        Daily Base Budget: {currency}{todayStats.baseBudget}
                    </p>
                    <p className="text-slate-200 text-xs font-bold uppercase tracking-wider">
                        Daily Cumulative Budget: {currency}{Math.round(todayStats.totalAvailable)}
                    </p>
                </div>
              )}
           </div>
           <div className="bg-slate-900/50 p-2 rounded-full border border-white/5 shadow-sm backdrop-blur-sm">
             <TrendingUp size={20} className={statusDetails.text} />
           </div>
        </div>
        
        <div className="flex items-center justify-between mt-6">
           <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wide">Spent Today</span>
              <span className="text-5xl font-black text-white tracking-tighter drop-shadow-sm">
                 {currency}{todayStats.spent}
              </span>
           </div>
           <div className="h-24 w-24 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={42}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                    paddingAngle={isOverBudget || !isBudgetSet ? 0 : 5}
                  >
                    {isOverBudget ? (
                        <Cell fill="#ef4444" />
                    ) : !isBudgetSet ? (
                        <Cell fill="#334155" />
                    ) : (
                        <>
                            {/* Use dynamic status color for the 'Spent' portion */}
                            <Cell fill={statusDetails.color} />
                            <Cell fill="#334155" />
                        </>
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                  {isBudgetSet ? `${Math.round((todayStats.spent / (todayStats.totalAvailable || 1)) * 100)}%` : '--%'}
              </div>
           </div>
        </div>
      </div>

      {/* Detailed Stats Grid */}
      <div className="space-y-4">
         {/* Streak Card */}
         <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg flex items-center justify-between">
             <div>
                <div className="flex items-center gap-2 text-amber-500 mb-1">
                    <Flame size={18} fill="currentColor" className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Streak</span>
                </div>
                <div className="text-3xl font-black text-white">{streak} <span className="text-sm text-slate-500 font-bold">Days</span></div>
             </div>
         </div>

         {/* Rollover Details */}
         <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                    <History size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">From Yesterday</span>
                </div>
                <div className={`text-2xl font-black ${todayStats.rollover >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {todayStats.rollover >= 0 ? '+' : ''}{currency}{Math.round(todayStats.rollover)}
                </div>
             </div>

             <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 shadow-lg flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                    <ArrowRight size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">To Tomorrow</span>
                </div>
                <div className={`text-2xl font-black ${todayStats.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {todayStats.remaining >= 0 ? '+' : ''}{currency}{Math.round(todayStats.remaining)}
                </div>
             </div>
         </div>
      </div>
      
      <div className="mt-auto pt-4 text-center">
        <p className="text-xs text-slate-600 font-medium">
            Your remaining budget rolls over to the next day.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
