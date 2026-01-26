
import React, { useState } from 'react';
import { Target, Trophy, Percent, Repeat, CalendarOff, AlertCircle } from 'lucide-react';

import { Challenge, RecurrenceType } from '../types';
import { getTodayISO } from '../utils/dateUtils';

interface ChallengeFormProps {
  initialData?: Partial<Challenge>;
  onSubmit: (data: Omit<Challenge, 'id' | 'status'>) => void;
  submitLabel: string;
  isEditing?: boolean;
}

const ChallengeForm: React.FC<ChallengeFormProps> = ({ initialData, onSubmit, submitLabel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [purpose, setPurpose] = useState(initialData?.purpose || '');
  const [startDate, setStartDate] = useState(initialData?.startDate || getTodayISO());
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [targetPercentage, setTargetPercentage] = useState(initialData?.targetPercentage ?? 100);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(initialData?.recurrence || 'none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialData?.recurrenceEndDate || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const today = getTodayISO();

    // Strict validation
    if (!name || name.trim() === '') {
        setError("Please enter a challenge name.");
        return;
    }
    if (!startDate) {
        setError("Please select a start date.");
        return;
    }
    
    // Prevent past start dates
    if (startDate < today) {
        // If creating a new challenge, start date cannot be in the past
        if (!initialData?.id) {
             setError("Challenge start date cannot be in the past.");
             return;
        }
        // If editing an existing challenge, user cannot CHANGE the start date to a past date.
        // They can keep it if it was already in the past (i.e. unchanged).
        if (initialData.startDate && startDate !== initialData.startDate) {
             setError("Cannot change start date to a past date.");
             return;
        }
    }

    if (!endDate) {
        setError("Please select an end date for the challenge.");
        return;
    }
    if (endDate < startDate) {
      setError("End date must be after start date.");
      return;
    }
    if (recurrence !== 'none' && recurrenceEndDate && recurrenceEndDate <= endDate) {
        setError("Recurrence end date must be after the challenge end date.");
        return;
    }

    onSubmit({
      name: name.trim(),
      purpose: purpose.trim(),
      startDate,
      endDate,
      targetPercentage,
      recurrence,
      ...(recurrence !== 'none' ? { recurrenceEndDate: recurrenceEndDate } : {})
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-950/20 border border-red-900/50 p-3 rounded-xl flex items-start gap-2 text-red-400 text-xs font-bold animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="text-[10px] font-bold text-slate-500 uppercase">Challenge Name <span className="text-red-500">*</span></label>
        <input 
          id="name"
          type="text" 
          placeholder="e.g. Dry November"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 text-white text-sm font-bold mt-1 outline-none focus:border-amber-500"
        />
      </div>
      <div>
        <label htmlFor="purpose" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
          Goal <Target size={10} />
        </label>
        <input 
          id="purpose"
          type="text" 
          placeholder="e.g. Kid's education fund"
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 text-white text-sm font-bold mt-1 outline-none focus:border-amber-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="startDate" className="text-[10px] font-bold text-slate-500 uppercase">Start <span className="text-red-500">*</span></label>
          <input 
            id="startDate"
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
            className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 text-sm font-bold mt-1 outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="text-[10px] font-bold text-slate-500 uppercase">End <span className="text-red-500">*</span></label>
          <input 
            id="endDate"
            type="date" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            required
            className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 text-sm font-bold mt-1 outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Percent size={10} /> Success Target
          </span>
          <span className={`text-xs font-black px-2 py-0.5 rounded-md ${targetPercentage === 100 ? 'bg-amber-950 text-amber-500' : 'bg-slate-800 text-slate-300'}`}>
            {targetPercentage}%
          </span>
        </div>
        <input 
          id="targetPercentage"
          aria-label="Success Target"
          type="range" 
          min="1" 
          max="100" 
          step="1"
          value={targetPercentage}
          onChange={e => setTargetPercentage(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
        />
        <p className="text-[10px] text-slate-500 mt-2 leading-tight">
          {targetPercentage === 100 
            ? "Hard Mode: You must save 100% of your budget. Spending anything means failure."
            : `You need to save at least ${targetPercentage}% of your total budget to pass.`}
        </p>
      </div>

      <fieldset className="bg-slate-950 p-3 rounded-xl border border-slate-800">
         <legend className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
            <Repeat size={10} /> Recurrence
         </legend>
         <div className="grid grid-cols-3 gap-2">
             {(['none', 'daily', 'weekly', 'bi-weekly', 'monthly'] as RecurrenceType[]).map((type) => (
                 <button
                    key={type}
                    type="button"
                    onClick={() => setRecurrence(type)}
                    className={`px-2 py-2 rounded-lg text-xs font-bold capitalize transition-all ${recurrence === type ? 'bg-amber-500 text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600'}`}
                 >
                    {type === 'none' ? 'No Repeat' : type}
                 </button>
             ))}
         </div>
         {recurrence !== 'none' && (
             <div className="mt-3 pt-3 border-t border-slate-800 animate-in fade-in slide-in-from-top-1">
                 <label htmlFor="recurrenceEndDate" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                     <CalendarOff size={10} /> Repeat Until (Optional)
                 </label>
                 <input 
                    id="recurrenceEndDate"
                    type="date" 
                    value={recurrenceEndDate}
                    onChange={e => setRecurrenceEndDate(e.target.value)}
                    min={endDate}
                    className="w-full p-2 bg-slate-900 rounded-lg border border-slate-800 text-slate-300 text-xs font-bold outline-none focus:border-amber-500"
                 />
                 <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                    If set, the challenge will stop repeating after this date. Leave blank for indefinite repetition.
                 </p>
             </div>
         )}
      </fieldset>

      <button 
        type="submit"
        className="w-full py-4 bg-amber-500 text-slate-900 font-bold rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95"
      >
        <Trophy size={18} />
        {submitLabel}
      </button>
    </form>
  );
};

export default ChallengeForm;
