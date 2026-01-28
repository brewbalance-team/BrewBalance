
import React, { useState, useEffect, useRef } from 'react';
import { Save, Trash2, AlertTriangle, RefreshCw, User, Image as ImageIcon, Upload, FileText, Share2 } from 'lucide-react';

import { Settings as SettingsType, DailyStats } from '../types';
import { APP_VERSION } from '../constants';
import { testId } from '../utils/testUtils';

interface SettingsProps {
  settings: SettingsType;
  statsMap: Record<string, DailyStats>;
  onSave: (newSettings: SettingsType) => void;
  onReset: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, statsMap, onSave, onReset }) => {
  const [localSettings, setLocalSettings] = useState<SettingsType>(settings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field: keyof SettingsType, value: SettingsType[keyof SettingsType]) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleBudgetChange = (field: keyof SettingsType, value: string) => {
    const cleanVal = value.replace(',', '.');
    if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
      const numVal = parseFloat(cleanVal);
      handleChange(field, isNaN(numVal) ? 0 : numVal);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
  };

  const handleResetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowResetConfirm(true);
  };

  const handleConfirmReset = (e: React.MouseEvent) => {
    e.preventDefault();
    onReset();
    setShowResetConfirm(false);
  };

  const handleForceReload = () => {
    window.location.reload();
  };

  // --- Image Upload Logic ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_SIZE = 512;
        const width = img.width;
        const height = img.height;
        const size = Math.min(width, height);
        const startX = (width - size) / 2;
        const startY = (height - size) / 2;
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        if (ctx) {
          ctx.drawImage(img, startX, startY, size, size, 0, 0, MAX_SIZE, MAX_SIZE);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          handleChange('logo', dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- Export Logic ---
  const generateCSV = (): string => {
    const headers = [
      "Date",
      "Daily Base Budget",
      "Rollover from Previous Day",
      "Daily Actual Spent",
      "Note",
      "Daily Current Balance",
      "Challenge Saved"
    ];

    const allDates = Object.keys(statsMap).sort((a, b) => b.localeCompare(a));
    const today = new Date().toISOString().split('T')[0];

    const exportRows = allDates.filter(date => {
      const isPastOrToday = date <= today!;
      const hasEntries = statsMap[date] && statsMap[date].entries.length > 0;
      return isPastOrToday || hasEntries;
    }).map(date => {
      const stats = statsMap[date];
      if (!stats) return null;
      const notes = stats.entries
        .map(e => e.note)
        .filter(n => n && n.trim() !== '')
        .join('; ');
      const escapedNote = `"${notes.replace(/"/g, '""')}"`;

      return [
        stats.date,
        stats.baseBudget,
        stats.rollover.toFixed(2),
        stats.spent.toFixed(2),
        escapedNote,
        stats.remaining.toFixed(2),
        stats.isChallengeDay ? stats.challengeSavedSoFar?.toFixed(2) : ''
      ].join(',');
    }).filter((row): row is string => row !== null);

    return [headers.join(','), ...exportRows].join('\n');
  };

  const handleShareFile = async () => {
    const csvContent = generateCSV();
    const now = new Date();
    const timestamp = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') + '-' +
      String(now.getMinutes()).padStart(2, '0') + '-' +
      String(now.getSeconds()).padStart(2, '0');

    const filename = `brewbalance_history_${timestamp}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], filename, { type: 'text/csv' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'BrewBalance History',
          text: 'Here is my BrewBalance budget history.'
        });
      } catch (error) {
        console.log('Share cancelled or failed', error);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="pb-24 h-full flex flex-col">
      <h2 className="text-3xl font-extrabold text-white mb-6 tracking-tight">Settings</h2>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">

        {/* Profile Section */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User size={16} /> User Profile
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="userName" className="text-sm font-semibold text-slate-300">Your Name</label>
              <input
                id="userName"
                type="text"
                enterKeyHint="done"
                value={localSettings.userName || ''}
                onChange={e => handleChange('userName', e.target.value)}
                className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-bold text-lg text-white placeholder-slate-700"
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="logo" className="text-sm font-semibold text-slate-300">Custom App Icon</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-800 bg-slate-950 shrink-0">
                  {localSettings.logo ? (
                    <img src={localSettings.logo} alt="Custom Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input id="logo" type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Upload size={14} /> Upload Photo
                    </button>
                    {localSettings.logo && (
                      <button
                        type="button"
                        onClick={() => handleChange('logo', null)}
                        className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-xs font-bold rounded-xl transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Section */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            Daily Targets
          </h3>
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="weekdayBudget" className="text-sm font-semibold text-slate-300">Weekday Budget</label>
              <div className="relative group">
                <input
                  id="weekdayBudget"
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="done"
                  pattern="[0-9]*"
                  value={localSettings.weekdayBudget || ''}
                  placeholder="300"
                  onChange={e => handleBudgetChange('weekdayBudget', e.target.value)}
                  className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-bold text-lg text-white placeholder-slate-700"
                  {...testId('settings-weekday-budget')}
                />
                <span className="absolute right-4 top-4 text-slate-600 font-medium pointer-events-none">{localSettings.currency}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="weekendBudget" className="text-sm font-semibold text-slate-300">Weekend Budget</label>
              <div className="relative group">
                <input
                  id="weekendBudget"
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="done"
                  pattern="[0-9]*"
                  value={localSettings.weekendBudget || ''}
                  placeholder="2000"
                  onChange={e => handleBudgetChange('weekendBudget', e.target.value)}
                  className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-bold text-lg text-white placeholder-slate-700"
                  {...testId('settings-weekend-budget')}
                />
                <span className="absolute right-4 top-4 text-slate-600 font-medium pointer-events-none">{localSettings.currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            Configuration
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="currency" className="text-sm font-semibold text-slate-300">Currency Symbol</label>
              <input
                id="currency"
                type="text"
                enterKeyHint="done"
                value={localSettings.currency}
                onChange={e => handleChange('currency', e.target.value)}
                className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-medium text-white"
                placeholder="e.g. JPY, $, €"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label htmlFor="alarmThreshold" className="text-sm font-semibold text-slate-300">Alarm Threshold</label>
                <span className="text-xs font-bold bg-amber-900/30 text-amber-400 px-2 py-1 rounded-lg">
                  {Math.round(localSettings.alarmThreshold * 100)}%
                </span>
              </div>
              <div className="h-10 flex items-center">
                <input
                  id="alarmThreshold"
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={localSettings.alarmThreshold}
                  onChange={e => handleChange('alarmThreshold', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                The dashboard turns <span className="text-amber-400 font-bold">yellow</span> when you spend {Math.round(localSettings.alarmThreshold * 100)}% of your daily budget.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="startDate" className="text-sm font-semibold text-slate-300">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  value={localSettings.startDate}
                  onChange={e => handleChange('startDate', e.target.value)}
                  className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-300 scheme-dark"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="endDate" className="text-sm font-semibold text-slate-300">End Date <span className="font-normal text-slate-600">(Optional)</span></label>
                <input
                  id="endDate"
                  type="date"
                  value={localSettings.endDate || ''}
                  onChange={e => handleChange('endDate', e.target.value || null)}
                  className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-300 scheme-dark"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SAVE BUTTON MOVED HERE */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-4 px-6 bg-amber-500 text-slate-900 font-bold rounded-2xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            {...testId('settings-save-button')}
          >
            <Save size={18} /> Save Settings
          </button>
        </div>

        {/* Data Management Section */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText size={16} /> Data Export
          </h3>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { handleShareFile().catch(console.error); }}
              className="w-full py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700 shadow-md"
            >
              <Share2 size={18} className="text-emerald-500" />
              <span>Share / Save CSV</span>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-10 pt-6 border-t border-slate-800">
          <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            Danger Zone
          </h3>
          {!showResetConfirm ? (
            <button
              type="button"
              onClick={handleResetClick}
              className="w-full py-4 px-6 bg-slate-900 text-red-500 font-bold rounded-2xl hover:bg-red-950/30 transition-all flex items-center justify-center gap-2 active:scale-95 border border-red-900/30"
            >
              <Trash2 size={18} /> Reset App Data
            </button>
          ) : (
            <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-red-500 shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-red-400 text-sm">Are you sure?</h4>
                  <p className="text-xs text-red-300/80 mt-1">
                    This will permanently delete all expenses and reset your settings. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 bg-slate-900 border border-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20 text-sm"
                >
                  Yes, Delete All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* App Version & Reload */}
        <div className="pt-8 pb-4 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-2">
            BrewBalance v{APP_VERSION}
          </p>
          <button
            type="button"
            onClick={handleForceReload}
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-500/80 hover:text-amber-400 transition-colors px-3 py-2 rounded-lg hover:bg-slate-900"
          >
            <RefreshCw size={12} /> Force Reload / Update
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
