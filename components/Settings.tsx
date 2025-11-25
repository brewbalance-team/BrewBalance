import React, { useState, useEffect } from 'react';
import { Settings as SettingsType } from '../types';
import { Save, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { APP_VERSION } from '../constants';

interface SettingsProps {
  settings: SettingsType;
  onSave: (newSettings: SettingsType) => void;
  onReset: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave, onReset }) => {
  const [localSettings, setLocalSettings] = useState<SettingsType>(settings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync local state when props change (e.g. after reset)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field: keyof SettingsType, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
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

  return (
    <div className="pb-24 h-full flex flex-col">
      <h2 className="text-3xl font-extrabold text-white mb-6 tracking-tight">Settings</h2>
      
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        
        {/* Budget Section */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            Daily Targets
          </h3>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Weekday Budget</label>
              <div className="relative group">
                <input
                  type="number"
                  value={localSettings.weekdayBudget || ''}
                  placeholder="300"
                  onChange={e => handleChange('weekdayBudget', parseFloat(e.target.value))}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-bold text-lg text-white placeholder-slate-700"
                />
                <span className="absolute right-4 top-4 text-slate-600 font-medium pointer-events-none">{localSettings.currency}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Weekend Budget</label>
              <div className="relative group">
                <input
                  type="number"
                  value={localSettings.weekendBudget || ''}
                  placeholder="2000"
                  onChange={e => handleChange('weekendBudget', parseFloat(e.target.value))}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-bold text-lg text-white placeholder-slate-700"
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
              <label className="text-sm font-semibold text-slate-300">Currency Symbol</label>
              <input
                type="text"
                value={localSettings.currency}
                onChange={e => handleChange('currency', e.target.value)}
                className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-medium text-white"
                placeholder="e.g. JPY, $, €"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                 <label className="text-sm font-semibold text-slate-300">Alarm Threshold</label>
                 <span className="text-xs font-bold bg-amber-900/30 text-amber-400 px-2 py-1 rounded-lg">
                    {Math.round(localSettings.alarmThreshold * 100)}%
                 </span>
              </div>
              <div className="h-10 flex items-center">
                <input
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
                  <label className="text-sm font-semibold text-slate-300">Start Date</label>
                  <input
                    type="date"
                    value={localSettings.startDate}
                    onChange={e => handleChange('startDate', e.target.value)}
                    className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-300 scheme-dark"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">End Date <span className="font-normal text-slate-600">(Optional)</span></label>
                  <input
                    type="date"
                    value={localSettings.endDate || ''}
                    onChange={e => handleChange('endDate', e.target.value || null)}
                    className="w-full p-4 bg-slate-950 rounded-2xl border-2 border-slate-800 focus:border-amber-500 outline-none transition-all font-medium text-slate-300 scheme-dark"
                  />
                </div>
            </div>
             <p className="text-xs text-slate-500">
                 Budgets apply to all days between Start Date and End Date. If End Date is empty, it applies indefinitely.
             </p>
          </div>
        </div>

        <div className="pt-2">
            <button
                type="submit"
                className="w-full py-4 px-6 bg-amber-500 text-slate-900 font-bold rounded-2xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
                <Save size={18} /> Save Settings
            </button>
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