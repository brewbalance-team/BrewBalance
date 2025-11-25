import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { DailyStats } from '../types';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DailyStats | null;
  currency: string;
  onSaveBudget: (date: string, amount: number) => void;
  onResetBudget: (date: string) => void;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  stats, 
  currency, 
  onSaveBudget, 
  onResetBudget 
}) => {
  const [budget, setBudget] = useState('');

  useEffect(() => {
    if (stats) {
      setBudget(stats.baseBudget.toString());
    }
  }, [stats]);

  if (!isOpen || !stats) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(budget);
    if (!isNaN(val)) {
      onSaveBudget(stats.date, val);
      onClose();
    }
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setBudget(val);
    }
  };

  const handleReset = () => {
    onResetBudget(stats.date);
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
      <div className="bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-800 p-6 animate-in slide-in-from-bottom-10 duration-300 mb-24 sm:mb-0">
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

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 mb-2 text-[10px] font-bold uppercase tracking-wider">
                    <TrendingUp size={14} /> From Previous
                </div>
                <div className={`text-xl font-black ${stats.rollover >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stats.rollover >= 0 ? '+' : ''}{currency}{Math.round(stats.rollover)}
                </div>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 mb-2 text-[10px] font-bold uppercase tracking-wider">
                     <TrendingDown size={14} /> Total Spent
                </div>
                <div className="text-xl font-black text-white">
                    {currency}{stats.spent}
                </div>
            </div>
        </div>

        <div className="space-y-4">
             <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                 <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Current Balance</div>
                 <div className={`text-2xl font-black ${stats.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {currency}{Math.round(stats.remaining)}
                 </div>
             </div>

             <form onSubmit={handleSave} className="space-y-4 pt-2">
                <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>Base Budget {stats.isCustomBudget && <span className="text-amber-500">(Custom)</span>}</span>
                        {stats.isCustomBudget && (
                            <button 
                                type="button" 
                                onClick={handleReset}
                                className="text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors"
                            >
                                <RotateCcw size={12} /> Reset to Default
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
                    <Save size={18} /> Update Budget
                </button>
             </form>
        </div>
      </div>
    </div>
  );
};

export default DayDetailModal;