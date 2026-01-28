
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Flame, ArrowRight, Trophy, Target, Edit2, X, Ban, AlertOctagon, CheckCircle2, Clock, AlertTriangle, PiggyBank } from 'lucide-react';

import { DailyStats, BudgetStatus, Settings, Challenge, ChallengeStatus } from '../types';
import { getTodayISO } from '../utils/dateUtils';
import { calculateChallengeTotalBudget, isChallengeFailed } from '../utils/financeHelpers';

import ChallengeForm from './ChallengeForm';

interface DashboardProps {
  statsMap: Record<string, DailyStats>;
  settings: Settings;
  streak: number;
  onAddEntry?: (amount: number, note: string, date: string) => void;
  onUpdateSettings: (newSettings: Settings) => void;
}

type ExtendedChallengeStatus = 
  | 'UPCOMING'
  | 'ACTIVE_ON_TRACK'
  | 'ACTIVE_BEHIND'
  | 'ACTIVE_FAILED'
  | 'FINISHED_SUCCESS'
  | 'FINISHED_FAILED';

const SavingsProgressBar = ({ label, saved, total, currency }: { label: string, saved: number, total: number, currency: string }) => {
  const rawPct = total > 0 ? (saved / total) * 100 : 0;
  // Clamp between 0 and 100 for car position
  const percentage = Math.max(0, Math.min(100, rawPct));
  const isNegative = saved < 0;
  
  return (
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg relative">
          <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">{label}</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded flex items-center gap-1 ${isNegative ? 'bg-red-950/50 text-red-400' : 'bg-emerald-950/50 text-emerald-400'}`}>
                  {isNegative ? 'ENGINE FAILURE' : <span>{Math.round(percentage)}% ACHIEVED</span>}
              </span>
          </div>
          
          <div className="flex justify-between items-end mb-2 px-1">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Saved</span>
                  <span className={`text-2xl font-black leading-none ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>{currency}{Math.round(saved)}</span>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Goal</span>
                  <span className="text-lg font-bold text-slate-400 leading-none">{currency}{Math.round(total)}</span>
               </div>
          </div>
          
          {/* F1 Track Bar */}
          <div className="relative h-12 w-full bg-slate-800 rounded-lg mt-3 border-y-2 border-slate-700 flex items-center shadow-inner">
              {/* Track Markings (Dashed Line) */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] w-full border-t border-dashed border-slate-600/50"></div>
              
              {/* Start Line */}
              <div className="absolute left-0 h-full w-2 bg-white/10 border-r border-white/20"></div>

              {/* Finish Flag - Bigger */}
              <div className="absolute right-2 text-3xl z-0 opacity-80">🏁</div>

              {/* Progress Bar (Colored tail) */}
              <div 
                  className={`absolute h-2 top-1/2 -translate-y-1/2 left-0 rounded-r-full transition-all duration-700 shadow-[0_0_8px_currentColor] ${isNegative ? 'bg-red-500 text-red-500' : 'bg-emerald-500 text-emerald-500'}`} 
                  style={{ width: `${percentage}%` }}
              ></div>

              {/* The Car - Bigger */}
              <div 
                  className="absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-700 ease-out flex items-center justify-center"
                  style={{ left: `calc(${percentage}% - 22px)` }}
              >
                   <span className="text-4xl transform -scale-x-100 drop-shadow-xl filter pb-1">🏎️</span>
              </div>
          </div>
      </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ statsMap, settings, streak, onUpdateSettings }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  
  const todayISO = getTodayISO();
  const todayStats = useMemo(() => statsMap[todayISO] || {
    date: todayISO,
    baseBudget: 0,
    rollover: 0,
    totalAvailable: 0,
    spent: 0,
    remaining: 0,
    status: BudgetStatus.UnderAlarm,
    entries: []
  }, [statsMap, todayISO]);

  const isBudgetSet = settings.weekdayBudget > 0 || settings.weekendBudget > 0;

  // --- Normal Mode Logic ---
  const getStatusDetails = (status: BudgetStatus, isChallengeMode: boolean) => {
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
            label: isChallengeMode ? 'On Track' : 'Smooth Sailing' 
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

  const isChallengeDay = todayStats.isChallengeDay ?? false;
  const statusDetails = getStatusDetails(todayStats.status, isChallengeDay);

  // Pie Chart Data
  const data = [
    { name: 'Spent', value: Math.max(0, todayStats.spent) },
    { name: 'Remaining', value: Math.max(0, todayStats.remaining) },
  ];

  const isOverBudget = todayStats.spent > todayStats.totalAvailable;
  const chartData = isOverBudget 
    ? [{ name: 'Over', value: 1 }] 
    : !isBudgetSet 
      ? [{ name: 'Unset', value: 1 }]
      : data;

  const currency = settings.currency === 'JPY' ? '¥' : settings.currency === '$' ? '$' : settings.currency;
  const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // --- Challenge Logic Calculation ---
  const challengeStats = useMemo(() => {
    if (!settings.activeChallenge) return null;

    const active = settings.activeChallenge;
    const totalBudget = calculateChallengeTotalBudget(active, settings);

    // Determine relevant stats
    const isPastEnd = todayISO > active.endDate;
    const isUpcoming = todayISO < active.startDate;
    const referenceDate = isPastEnd ? active.endDate : todayISO;
    const refStats = statsMap[referenceDate] || todayStats;
    const totalSavedSoFar = refStats.challengeSavedSoFar || 0;

    // Check Failure mathematically
    const isFailedMath = isChallengeFailed(active, settings, totalSavedSoFar, todayISO);

    // Status Determination
    let status: ExtendedChallengeStatus = 'ACTIVE_ON_TRACK';
    const targetPct = active.targetPercentage ?? 100;
    const targetAmount = totalBudget * (targetPct / 100);

    if (isUpcoming) {
        status = 'UPCOMING';
    } else if (isPastEnd) {
        // Finished
        if (totalSavedSoFar >= targetAmount) {
            status = 'FINISHED_SUCCESS';
        } else {
            status = 'FINISHED_FAILED';
        }
    } else {
        // Active
        if (isFailedMath) {
            status = 'ACTIVE_FAILED';
        } else {
            // Check pacing for "Behind" vs "On Track"
            const start = new Date(active.startDate).getTime();
            const end = new Date(active.endDate).getTime();
            const now = new Date(todayISO).getTime();
            
            const totalDuration = end - start;
            const elapsed = now - start;
            // Avoid division by zero
            const progressRatio = totalDuration > 0 ? Math.max(0, Math.min(1, elapsed / totalDuration)) : 1;
            
            const expectedSavings = targetAmount * progressRatio;
            
            // Give a little buffer (e.g. 5%) or strict? Let's be strict but fair.
            if (totalSavedSoFar >= expectedSavings) {
                status = 'ACTIVE_ON_TRACK';
            } else {
                status = 'ACTIVE_BEHIND';
            }
        }
    }

    // Days left calculation
    const todayTime = new Date(todayISO).getTime();
    const endTime = new Date(active.endDate).getTime();
    const daysLeft = Math.max(0, Math.ceil((endTime - todayTime) / (1000 * 60 * 60 * 24)));

    const start = new Date(active.startDate);
    const end = new Date(active.endDate);
    const todayDate = new Date(todayISO);
    
    const oneDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.round((end.getTime() - start.getTime()) / oneDay) + 1;
    const rawDiff = Math.round((todayDate.getTime() - start.getTime()) / oneDay);
    const dayNumber = Math.max(0, Math.min(totalDays, rawDiff + 1));

    return {
        totalBudget,
        totalSavedSoFar,
        daysLeft,
        dayNumber,
        totalDays,
        status
    };
  }, [statsMap, todayISO, settings, todayStats]);

  // --- Handlers ---

  const handleUpdateChallenge = (data: Omit<Challenge, 'id' | 'status'>) => {
    if (!settings.activeChallenge) return;
    const updated = { ...settings.activeChallenge, ...data };
    onUpdateSettings({ ...settings, activeChallenge: updated });
    setShowEditModal(false);
  };

  const handleEndChallenge = () => {
    if (!settings.activeChallenge) return;
    // Note: We use in-modal confirmation now, so no window.confirm here.

    const activeChallenge = settings.activeChallenge;
    const isCompleted = todayISO > activeChallenge.endDate;
    
    const checkDate = isCompleted ? activeChallenge.endDate : todayISO;
    const stats = statsMap[checkDate] || { challengeSavedSoFar: 0 };
    const finalSaved = stats.challengeSavedSoFar || 0;

    const totalChallengeBudget = calculateChallengeTotalBudget(activeChallenge, settings);

    let status: ChallengeStatus = 'cancelled';
    const targetPct = activeChallenge.targetPercentage ?? 100;

    if (isCompleted) {
        // Automatically determine success if time is up
        const targetAmount = totalChallengeBudget * (targetPct / 100);
        status = finalSaved >= targetAmount ? 'completed' : 'failed';
    } else {
        status = 'cancelled';
    }

    const endedChallenge: Challenge = {
        ...activeChallenge,
        status,
        finalSaved,
        finalTotalBudget: totalChallengeBudget
    };

    const newSettings = {
        ...settings,
        activeChallenge: null, // Explicitly nullify
        pastChallenges: [endedChallenge, ...(settings.pastChallenges || [])]
    };

    onUpdateSettings(newSettings);
    setShowEditModal(false);
    setShowEndConfirm(false); // Reset confirmation state
  };

  // Helper for status UI
  const getStatusUI = (status: ExtendedChallengeStatus) => {
      switch (status) {
          case 'UPCOMING': return {
              label: 'Upcoming Challenge',
              color: 'text-blue-400',
              bgGradient: 'from-blue-950/40 to-slate-900',
              borderColor: 'border-blue-900/30',
              badgeBg: 'bg-blue-500',
              icon: <Clock size={80} />,
              miniIcon: <Clock size={10} />,
              message: 'Get ready! Your challenge starts soon.',
              messageColor: 'text-blue-300'
          };
          case 'ACTIVE_ON_TRACK': return {
              label: 'On Track',
              color: 'text-emerald-400',
              bgGradient: 'from-emerald-950/40 to-slate-900',
              borderColor: 'border-emerald-900/30',
              badgeBg: 'bg-emerald-500',
              icon: <Trophy size={80} />,
              miniIcon: <CheckCircle2 size={10} />,
              message: 'Great job! You are meeting your savings goals.',
              messageColor: 'text-emerald-300'
          };
          case 'ACTIVE_BEHIND': return {
              label: 'Behind Schedule',
              color: 'text-amber-400',
              bgGradient: 'from-amber-950/40 to-slate-900',
              borderColor: 'border-amber-900/30',
              badgeBg: 'bg-amber-500',
              icon: <AlertTriangle size={80} />,
              miniIcon: <AlertTriangle size={10} />,
              message: 'Careful! You are slightly behind pace.',
              messageColor: 'text-amber-300'
          };
          case 'ACTIVE_FAILED': return {
              label: 'Failed (In Progress)',
              color: 'text-red-400',
              bgGradient: 'from-red-950/50 to-slate-900',
              borderColor: 'border-red-900/50',
              badgeBg: 'bg-red-500',
              icon: <AlertOctagon size={80} />,
              miniIcon: <AlertOctagon size={10} />,
              message: 'Goal unreachable based on current spending.',
              messageColor: 'text-red-300'
          };
          case 'FINISHED_SUCCESS': return {
              label: 'Challenge Completed!',
              color: 'text-emerald-400',
              bgGradient: 'from-emerald-900/60 to-slate-900',
              borderColor: 'border-emerald-500/50',
              badgeBg: 'bg-emerald-500',
              icon: <Trophy size={80} />,
              miniIcon: <CheckCircle2 size={10} />,
              message: 'Congratulations! You met your goal.',
              messageColor: 'text-emerald-200'
          };
          case 'FINISHED_FAILED': return {
              label: 'Challenge Failed',
              color: 'text-red-400',
              bgGradient: 'from-red-900/60 to-slate-900',
              borderColor: 'border-red-500/50',
              badgeBg: 'bg-red-500',
              icon: <Ban size={80} />,
              miniIcon: <Ban size={10} />,
              message: 'Time is up. Goal was not met.',
              messageColor: 'text-red-200'
          };
      }
  };

  const isUpcoming = challengeStats?.status === 'UPCOMING';

  const renderChallengeCard = () => {
    if (!settings.activeChallenge || !challengeStats) return null;
    const ui = getStatusUI(challengeStats.status);
    const isCardUpcoming = challengeStats.status === 'UPCOMING';

    return (
     <div className={`mb-4 bg-gradient-to-br ${ui.bgGradient} border ${ui.borderColor} p-4 rounded-3xl relative overflow-hidden shadow-lg shrink-0 group transition-all`}>
         <div className={`absolute top-0 right-0 p-6 opacity-5 pointer-events-none ${ui.color}`}>
             {ui.icon}
         </div>
         <div className="relative z-10">
             <div className="flex items-center justify-between mb-2">
                  <span className={`${ui.badgeBg} text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-sm flex items-center gap-1`}>
                     {ui.miniIcon} {ui.label}
                  </span>
                 <div className="flex items-center gap-2">
                     <button 
                         onClick={() => setShowEditModal(true)}
                         className={`p-2 rounded-full backdrop-blur-sm transition-colors border bg-slate-900/30 hover:bg-slate-900/60 ${ui.color} border-white/10`}
                     >
                         <Edit2 size={14} />
                     </button>
                     {!isCardUpcoming && (
                        <span className={`${ui.color} text-[10px] font-bold uppercase tracking-wider opacity-80`}>
                            {formattedDate}
                        </span>
                     )}
                 </div>
             </div>
             
             <div className="flex flex-col mb-2">
                 <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                     <h1 className="text-2xl font-black text-white leading-tight tracking-tight break-words">
                         {settings.activeChallenge.name}
                     </h1>
                     
                     {/* CONDITIONAL STATS DISPLAY */}
                     {isCardUpcoming ? (
                         <div className="flex items-center gap-2 ml-auto shrink-0 mt-1">
                            <span className={`text-xs font-bold ${ui.color} bg-slate-900/40 px-2 py-1 rounded-lg border border-white/5`}>
                               Goal: {settings.activeChallenge.targetPercentage}%
                            </span>
                         </div>
                     ) : (
                         <div className="flex items-center gap-2 ml-auto shrink-0">
                             <span className={`text-base font-bold ${ui.color} uppercase tracking-wider`}>
                                 Day <span className="text-white">{challengeStats.dayNumber}</span>/{challengeStats.totalDays}
                             </span>
                             <span className="text-slate-600 font-bold hidden sm:inline">•</span>
                             <span className={`text-base font-bold ${ui.color} uppercase tracking-wider`}>
                                 <span className="text-white">{challengeStats.daysLeft}</span> Days Left
                             </span>
                         </div>
                     )}
                 </div>

                 {settings.activeChallenge.purpose && (
                     <div className="flex items-start gap-2 mt-1">
                         <Target className={`shrink-0 mt-1 ${ui.color}`} size={16} />
                         <span className="text-lg font-bold text-slate-200 leading-tight">
                             {settings.activeChallenge.purpose}
                         </span>
                     </div>
                 )}

                 {/* UPCOMING SPECIFIC DATES */}
                 {isCardUpcoming && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-4 text-xs font-bold text-slate-300">
                         <div className="flex flex-col">
                            <span className={`text-[9px] uppercase tracking-wider ${ui.color} opacity-70`}>Starts</span>
                            <span>{new Date(settings.activeChallenge.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                         </div>
                         <ArrowRight size={14} className="text-slate-600" />
                         <div className="flex flex-col text-right">
                            <span className={`text-[9px] uppercase tracking-wider ${ui.color} opacity-70`}>Ends</span>
                            <span>{new Date(settings.activeChallenge.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                         </div>
                    </div>
                 )}
             </div>
         </div>
    </div>
    );
  };

  return (
    <div className="h-full flex flex-col pb-24 overflow-hidden">
      {/* --- ACTIVE CHALLENGE HEADER (Only if NOT upcoming) --- */}
      {!isUpcoming && settings.activeChallenge && challengeStats && renderChallengeCard()}

      {/* --- CONDITIONAL HEADER (Date Header) --- */}
      {/* Show if no challenge OR if challenge is upcoming (so the top slot is empty of challenge card) */}
      {(!settings.activeChallenge || isUpcoming) && (
           <div className="mb-2 px-1 shrink-0">
                <h2 className="text-slate-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] ${isBudgetSet ? '' : 'bg-slate-600'}`} style={{ backgroundColor: isBudgetSet ? statusDetails.color : undefined }}></span>
                {formattedDate}
                </h2>
           </div>
      )}

      {/* Main Content Area - Scrollable but optimized to fit */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        {isChallengeDay && challengeStats ? (
            // --- ACTIVE CHALLENGE DAY VIEW ---
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SavingsProgressBar label="Daily Savings Progress" saved={todayStats.remaining} total={todayStats.baseBudget} currency={settings.currency} />
                <SavingsProgressBar label="Total Challenge Progress" saved={challengeStats.totalSavedSoFar} total={challengeStats.totalBudget} currency={settings.currency} />
            </div>
        ) : (
            // --- NORMAL VIEW (Also used for Upcoming days) ---
            <div className={`relative p-5 rounded-[2.5rem] border ${statusDetails.border} ${statusDetails.bg} transition-all duration-500 shadow-lg flex flex-col grow shrink-0 mb-4`}>
                
                {/* Card Header: Label + Streak */}
                <div className="flex justify-between items-start mb-4 shrink-0">
                    <h2 className={`text-base font-black ${statusDetails.text} uppercase tracking-widest mt-2`}>{statusDetails.label}</h2>
                    
                    {/* Bigger Streak Badge */}
                    <div className="flex items-center gap-2 bg-slate-900/40 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm shadow-inner">
                        <Flame size={22} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" fill="currentColor" />
                        <span className="text-xl font-black text-white leading-none">{streak} <span className="text-[10px] font-bold text-slate-400 uppercase">Days</span></span>
                    </div>
                </div>

                {isBudgetSet && (
                    <div className="flex-1 flex flex-col justify-start gap-4 overflow-hidden">
                        {/* Formula Display - Kept High */}
                        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm shrink-0">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
                                Total Available Calculation
                            </p>
                            <div className="flex items-center justify-between px-1">
                                    <div className="flex flex-col items-center gap-1">
                                    <span className="text-slate-300 font-black text-xl">{currency}{todayStats.baseBudget}</span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Base</span>
                                    </div>
                                    <span className="text-slate-500 font-black text-2xl">+</span>
                                    <div className="flex flex-col items-center gap-1">
                                    <span className={`font-black text-xl ${todayStats.rollover < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {todayStats.rollover < 0 ? '-' : ''}{currency}{Math.abs(Math.round(todayStats.rollover))}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Rollover</span>
                                    </div>
                                    <span className="text-slate-500 font-black text-2xl">=</span>
                                    <div className="flex flex-col items-center gap-1">
                                    <span className="text-white font-black text-2xl border-b-2 border-dashed border-slate-600">{currency}{Math.round(todayStats.totalAvailable)}</span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Total</span>
                                    </div>
                            </div>
                        </div>

                        {/* Current Balance - Made Smaller */}
                        <div className="text-center shrink-0 flex-1 flex flex-col justify-center">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                                Current Balance
                            </p>
                            <p className={`text-6xl sm:text-7xl font-black tracking-tighter drop-shadow-sm leading-none ${statusDetails.text}`}>
                                {currency}{Math.round(todayStats.remaining)}
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Footer: Pie + Spent - Bigger Pie */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5 shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Spent Today</span>
                        <span className="text-3xl font-black text-slate-300 leading-none">
                            {currency}{todayStats.spent}
                        </span>
                    </div>
                    {/* Bigger Chart */}
                    <div className="h-32 w-32 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={55}
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
                                        <Cell fill={statusDetails.color} />
                                        <Cell fill="#334155" />
                                    </>
                                )}
                            </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-400 uppercase">
                            {isBudgetSet ? `${Math.round((todayStats.spent / (todayStats.totalAvailable || 1)) * 100)}%` : '--'}
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="mt-auto mb-4 text-center shrink-0 px-2">
            {settings.activeChallenge && !isUpcoming ? (
                <div className="mx-2 mb-2 py-4 px-4 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-3 shadow-sm text-center">
                    <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400 hidden sm:block">
                        <PiggyBank size={18} />
                    </div>
                    <p className="text-emerald-100 font-bold text-sm">
                        Push your limits! Save extra today for your <span className="text-white">{settings.activeChallenge.purpose || 'goal'}</span>.
                    </p>
                </div>
            ) : (
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl py-2 px-4 inline-block backdrop-blur-sm shadow-sm">
                    <p className="text-slate-400 font-bold text-sm">
                        💰 Remaining budget rolls over to tomorrow
                    </p>
                </div>
            )}
        </div>

        {/* --- UPCOMING CHALLENGE CARD (Bottom placement) --- */}
        {isUpcoming && settings.activeChallenge && challengeStats && renderChallengeCard()}
      </div>

      {/* Edit Challenge Modal */}
      {showEditModal && settings.activeChallenge && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-800 p-6 animate-in slide-in-from-bottom-10 duration-300 mb-24 sm:mb-0 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                        <Trophy size={20} className="text-amber-500" />
                        Manage Challenge
                    </h3>
                    <button onClick={() => { setShowEditModal(false); setShowEndConfirm(false); }} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors border border-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <ChallengeForm 
                        initialData={settings.activeChallenge}
                        onSubmit={handleUpdateChallenge}
                        submitLabel="Save Changes"
                        isEditing={true}
                    />

                    <div className="pt-4 border-t border-slate-800">
                        {!showEndConfirm ? (
                            <button
                                type="button"
                                onClick={() => setShowEndConfirm(true)}
                                className="w-full py-4 bg-slate-950 border border-slate-800 text-red-500 font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Ban size={18} /> End / Cancel Challenge
                            </button>
                        ) : (
                            <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-center text-red-400 text-xs font-bold">Are you sure you want to end this challenge early?</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowEndConfirm(false)}
                                        className="flex-1 py-3 bg-slate-800 text-slate-400 font-bold rounded-xl text-xs hover:bg-slate-700 transition-colors"
                                    >
                                        No, Keep it
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleEndChallenge}
                                        className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
                                    >
                                        Yes, End it
                                    </button>
                                </div>
                            </div>
                        )}
                        <p className="text-[10px] text-slate-600 text-center mt-2">
                            Ending the challenge will move it to history.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
