
import React, { useState } from 'react';
import { X, Save, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';

import { DailyStats } from '../types';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DailyStats | null;
  currency: string;
  onSaveBudget: (date: string, amount: number) => void;
  onResetBudget: (date: string) => void;
  onSaveRollover: (date: string, amount: number) => void;
  onResetRollover: (date: string) => void;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  stats, 
  currency, 
  onSaveBudget, 
  onResetBudget,
  onSaveRollover,
  onResetRollover
}) => {
  const [budget, setBudget] = useState(stats?.baseBudget.toString() || '');
  const [rollover, setRollover] = useState(stats?.rollover.toString() || '');

  if (!isOpen || !stats) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    let changed = false;
    const valBudget = parseFloat(budget);
    if (!isNaN(valBudget)) {
      onSaveBudget(stats.date, valBudget);
      changed = true;
    }

    const valRollover = parseFloat(rollover);
    if (!isNaN(valRollover) && valRollover !== stats.rollover) {
        onSaveRollover(stats.date, valRollover);
        changed = true;
    }

    if (changed) onClose();
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setBudget(val);
    }
  };

  const handleRolloverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow negative rollovers
    const val = e.target.value.replace(',', '.');
    if (val === '' || val === '-' || /^-?\d*\.?\d*$/.test(val)) {
        setRollover(val);
    }
  };

  const handleReset = () => {
    onResetBudget(stats.date);
    // Don't close immediately, user might want to edit rollover
    setBudget((stats.isCustomBudget ? 0 : stats.baseBudget).toString()); // Visual reset logic is complex without refreshing, better to close
    onClose();
  };

  const handleRolloverReset = () => {
      onResetRollover(stats.date);
      onClose();
  };

  const formattedDate = new Date(stats.date).toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-800 p-6 animate-in slide-in-from-bottom-10 duration-300 mb-24 sm:mb-0 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white">Day Details</h3>
          <button onClick={onClose} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors border border-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
            <div className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-1">Date</div>
            <div className="text-2xl font-black text-white">{formattedDate}</div>
        </div>

        <div className="space-y-4 mb-6">
             <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                 <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                     <TrendingDown size={14} /> Total Spent
                 </div>
                 <div className="text-xl font-black text-white">
                    {currency}{stats.spent}
                 </div>
             </div>

             <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                 <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Current Balance</div>
                 <div className={`text-2xl font-black ${stats.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {currency}{Math.round(stats.remaining)}
                 </div>
             </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
             {/* ROLLOVER INPUT */}
             <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1"><TrendingUp size={12} /> From Previous Day {stats.isCustomRollover && <span className="text-amber-500">(Custom)</span>}</span>
                    {stats.isCustomRollover && (
                        <button 
                            type="button" 
                            onClick={handleRolloverReset}
                            className="text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                            <RotateCcw size={12} /> Reset
                        </button>
                    )}
                </label>
                <div className="relative">
                    <input
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="next"
                        pattern="-?[0-9]*"
                        value={rollover}
                        onChange={handleRolloverChange}
                        className={`w-full p-4 bg-slate-950 rounded-2xl border-2 focus:border-amber-500 outline-none transition-all font-bold text-lg ${parseFloat(rollover) < 0 ? 'text-red-400' : 'text-emerald-400'} placeholder-slate-700 ${stats.isCustomRollover ? 'border-amber-500/50' : 'border-slate-800'}`}
                        placeholder="0"
                    />
                     <span className="absolute right-4 top-4 text-slate-600 font-medium pointer-events-none">{currency}</span>
                </div>
                <p className="text-[9px] text-slate-600 mt-1 pl-1">Adjusting this overrides the carry-over from yesterday.</p>
            </div>

            {/* BASE BUDGET INPUT */}
            <div>
                <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <span>Base Budget {stats.isCustomBudget && <span className="text-amber-500">(Custom)</span>}</span>
                    {stats.isCustomBudget && (
                        <button 
                            type="button" 
                            onClick={handleReset}
                            className="text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors"
                        >
                            <RotateCcw size={12} /> Reset
                        </button>
                    )}
                </label>
                <div className="relative">
                    <input
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="done"
                        pattern="[0-9]*"
                        value={budget}
                        onChange={handleBudgetChange}
                        className={`w-full p-4 bg-slate-950 rounded-2xl border-2 focus:border-amber-500 outline-none transition-all font-bold text-lg text-white placeholder-slate-700 ${stats.isCustomBudget ? 'border-amber-500/50' : 'border-slate-800'}`}
                        placeholder="0"
                    />
                     <span className="absolute right-4 top-4 text-slate-600 font-medium pointer-events-none">{currency}</span>
                </div>
            </div>

            <button
                type="submit"
                className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95"
            >
                <Save size={18} /> Update Details
            </button>
        </form>
      </div>
    </div>
  );
};

export default DayDetailModal;
