
import React, { useState } from 'react';
import { Beer, Check, Trophy } from 'lucide-react';

import { Settings, Challenge, DailyStats, TabView } from '../types';
import { getTodayISO } from '../utils/dateUtils';
import { testId } from '../utils/testUtils';

import ChallengeForm from './ChallengeForm';

interface AddEntryScreenProps {
    onSave: (amount: number, note: string, date: string) => void;
    currency: string;
    settings: Settings;
    onUpdateSettings: (newSettings: Settings) => void;
    statsMap: Record<string, DailyStats>;
    onNavigate: (tab: TabView) => void;
}

type Mode = 'expense' | 'challenge';

const AddEntryScreen: React.FC<AddEntryScreenProps> = ({
    onSave,
    currency,
    settings,
    onUpdateSettings,
    statsMap,
    onNavigate
}) => {
    const [mode, setMode] = useState<Mode>('expense');

    // Expense Form State
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(getTodayISO());

    // --- EXPENSE LOGIC ---
    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!isNaN(val) && val > 0) {
            onSave(val, note || 'Beer', date);
            setAmount('');
            setNote('');
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(',', '.');
        if (val === '' || /^\d*\.?\d*$/.test(val)) {
            setAmount(val);
        }
    };

    // --- CHALLENGE LOGIC ---
    const handleStartChallenge = (data: Omit<Challenge, 'id' | 'status'>) => {
        // If there is an active challenge, we must cancel/end it before starting a new one.
        let updatedPastChallenges = [...(settings.pastChallenges || [])];

        if (settings.activeChallenge) {
            if (!confirm("You already have an active challenge. Starting a new one will cancel the current one. Continue?")) {
                return;
            }

            const active = settings.activeChallenge;
            // Calculate stats for the interrupted challenge to save to history
            const todayISO = getTodayISO();
            // Use today's stats for saving snapshot
            const stats = statsMap[todayISO];
            const finalSaved = stats?.challengeSavedSoFar || 0;

            const cancelledChallenge: Challenge = {
                ...active,
                status: 'cancelled',
                finalSaved: finalSaved,
                // Simple estimation of budget since we are cancelling mid-way or whenever
                // For rigorous history, we might want to recalculate exact budget up to today, 
                // but for 'cancelled', exact % isn't as critical.
                finalTotalBudget: 0
            };
            updatedPastChallenges = [cancelledChallenge, ...updatedPastChallenges];
        }

        const newChallenge: Challenge = {
            id: crypto.randomUUID(),
            ...data,
            status: 'active'
        };

        const updatedSettings = {
            ...settings,
            activeChallenge: newChallenge,
            pastChallenges: updatedPastChallenges
        };

        onUpdateSettings(updatedSettings);
        // Navigate back to Home
        onNavigate('dashboard');
    };

    return (
        <div className="h-full flex flex-col pb-24" {...testId('add-entry-screen')}>
            {/* Header with Tabs */}
            <div className="mb-4 shrink-0 flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Add</h2>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800" {...testId('add-mode-tabs')}>
                    <button
                        onClick={() => setMode('expense')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'expense' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        {...testId('add-expense-tab')}
                    >
                        <Beer size={14} strokeWidth={2.5} /> Expense
                    </button>
                    <button
                        onClick={() => setMode('challenge')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'challenge' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        {...testId('add-challenge-tab')}
                    >
                        <Trophy size={14} strokeWidth={2.5} /> Challenge
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto custom-scrollbar pr-1">
                {mode === 'expense' ? (
                    <form onSubmit={handleExpenseSubmit} className="flex flex-col h-full gap-4">
                        <div className="bg-slate-900 p-5 rounded-[2rem] shadow-lg border border-slate-800 flex-1 flex flex-col justify-center gap-5">
                            <div className="flex justify-center">
                                <div className="bg-amber-950/30 p-3 rounded-full border border-amber-900/50 text-amber-500 shadow-inner">
                                    <Beer size={32} strokeWidth={1.5} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Amount ({currency})</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        enterKeyHint="done"
                                        pattern="[0-9]*"
                                        placeholder="0"
                                        value={amount}
                                        onChange={handleAmountChange}
                                        className="w-full py-3 px-4 text-5xl font-black bg-transparent border-b-2 border-slate-800 focus:border-amber-500 outline-none text-center text-white placeholder-slate-800 transition-colors"
                                        {...testId('expense-amount-input')}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="date" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                                    <input
                                        id="date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 focus:border-amber-500 outline-none font-bold text-slate-200 scheme-dark text-sm"
                                        {...testId('expense-date-input')}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="note" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Note (Optional)</label>
                                    <input
                                        id="note"
                                        type="text"
                                        enterKeyHint="done"
                                        placeholder="e.g., Lager at Pub"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 focus:border-amber-500 outline-none font-bold text-white placeholder-slate-700 text-sm"
                                        {...testId('expense-note-input')}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!amount || parseFloat(amount) <= 0}
                            className="w-full py-4 bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-black text-lg rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 active:scale-95 shrink-0"
                            {...testId('expense-submit-button')}
                        >
                            <Check size={22} strokeWidth={3} /> Record Expense
                        </button>
                    </form>
                ) : (
                    // --- CHALLENGE FORM (Create New Only) ---
                    <div className="flex flex-col h-full gap-4">
                        <div className="bg-slate-900 p-5 rounded-[2rem] shadow-lg border border-slate-800 flex-1">
                            <div className="flex items-center gap-2 mb-4 text-amber-500">
                                <Trophy size={18} />
                                <span className="font-bold text-sm uppercase tracking-wider">
                                    Start New Challenge
                                </span>
                            </div>

                            <ChallengeForm
                                onSubmit={handleStartChallenge}
                                submitLabel="Start Challenge"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddEntryScreen;
