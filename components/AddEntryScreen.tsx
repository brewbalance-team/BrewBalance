import React, { useState } from 'react';
import { Beer, Check } from 'lucide-react';

interface AddEntryScreenProps {
  onSave: (amount: number, note: string, date: string) => void;
  currency: string;
}

const AddEntryScreen: React.FC<AddEntryScreenProps> = ({ onSave, currency }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      onSave(val, note || 'Beer', date);
      setAmount('');
      setNote('');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Replace comma with dot for international keyboards
    const val = e.target.value.replace(',', '.');
    // Allow digits and a single decimal point
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
    }
  };

  return (
    <div className="h-full flex flex-col pb-24">
      <div className="mb-4 shrink-0">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Add Expense</h2>
      </div>

      <div className="flex-1 flex flex-col justify-between min-h-0">
        <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">
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
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 focus:border-amber-500 outline-none font-bold text-slate-200 scheme-dark text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Note (Optional)</label>
                        <input
                        type="text"
                        enterKeyHint="done"
                        placeholder="e.g., Lager at Pub"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 focus:border-amber-500 outline-none font-bold text-white placeholder-slate-700 text-sm"
                        />
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-4 bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-black text-lg rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 active:scale-95 shrink-0"
            >
                <Check size={22} strokeWidth={3} /> Record Expense
            </button>
        </form>
      </div>
    </div>
  );
};

export default AddEntryScreen;