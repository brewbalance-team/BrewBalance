import React, { useState } from 'react';
import { X, Beer, Check } from 'lucide-react';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, note: string, date: Date) => void;
  currency: string;
}

const AddEntryModal: React.FC<AddEntryModalProps> = ({ isOpen, onClose, onSave, currency }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState(new Date());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      onSave(val, note || 'Beer', date);
      setAmount('');
      setNote('');
      onClose();
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
      <div className="bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-800 p-6 animate-in slide-in-from-bottom-10 fade-in-50 duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            <div className="bg-amber-950/40 p-2.5 rounded-xl text-amber-500 border border-amber-900/50">
                <Beer size={24} />
            </div>
            Add Expense
          </h3>
          <button onClick={onClose} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors border border-slate-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Amount ({currency})</label>
            <input
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              pattern="[0-9]*"
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              className="w-full p-5 text-4xl font-black bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 focus:ring-0 outline-none text-center text-white placeholder-slate-800 transition-all"
            />
          </div>

          <div>
             <label htmlFor="date" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
             <input 
                id="date"
                type="date"
                value={date.toISOString().split('T')[0]}
                onChange={(e) => setDate(new Date(e.target.value))}
                className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none font-bold text-slate-300 scheme-dark"
             />
          </div>

          <div>
            <label htmlFor="note" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Note (Optional)</label>
            <input
              id="note"
              type="text"
              enterKeyHint="done"
              placeholder="e.g., Lager at Pub"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none font-bold text-white placeholder-slate-700"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-2 active:scale-95"
          >
            <Check size={20} /> Record Expense
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal;