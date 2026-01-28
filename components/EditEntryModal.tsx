import React, { useState } from 'react';
import { X, Check, Trash2, Beer, AlertCircle } from 'lucide-react';

import { Entry } from '../types';

interface EditEntryModalProps {
  entry: Entry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Entry) => void;
  onDelete: (id: string) => void;
  currency: string;
}

const EditEntryModal: React.FC<EditEntryModalProps> = ({ entry, isOpen, onClose, onSave, onDelete, currency }) => {
  const [amount, setAmount] = useState(entry?.amount.toString() || '');
  const [note, setNote] = useState(entry?.note || '');
  const [date, setDate] = useState(entry?.date || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !entry) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) {
      onSave({ ...entry, amount: val, note, date });
      onClose();
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(entry.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-800 p-6 animate-in slide-in-from-bottom-10 duration-300 mb-24 sm:mb-0">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            <div className="bg-slate-800 p-2.5 rounded-xl text-slate-200 border border-slate-700">
                <Beer size={20} />
            </div>
            Edit Expense
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
              className="w-full p-4 text-3xl font-black bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 focus:ring-0 outline-none text-center text-white placeholder-slate-800 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
                <label htmlFor="date" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                <input 
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none font-bold text-slate-300 scheme-dark"
                />
            </div>

            <div>
                <label htmlFor="note" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Note</label>
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
          </div>

          <div className="flex gap-3 pt-2 h-14">
             {!showDeleteConfirm ? (
               <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="flex-1 bg-red-500/10 text-red-500 border border-red-500/50 font-bold rounded-2xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
               >
                  <Trash2 size={20} /> Delete
               </button>
             ) : (
               <div className="flex-1 flex gap-2 animate-in fade-in duration-200">
                  <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="w-14 bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-700 flex items-center justify-center transition-colors"
                  >
                      <X size={20} />
                  </button>
                  <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="flex-1 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                  >
                      <AlertCircle size={20} /> Confirm?
                  </button>
               </div>
             )}
             
             <button
                type="submit"
                className="flex-[2] bg-amber-500 text-slate-900 font-bold rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95"
             >
                <Check size={20} /> Save Changes
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEntryModal;