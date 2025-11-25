import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Entry, TabView } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';
import { calculateStats, calculateStreak } from './utils/financeHelpers';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import SettingsView from './components/Settings';
import Navigation from './components/Navigation';
import HistoryView from './components/HistoryView';
import AddEntryScreen from './components/AddEntryScreen';
import EditEntryModal from './components/EditEntryModal';
import { Beer } from 'lucide-react';

const App: React.FC = () => {
  // Load settings from local storage, merging with defaults to ensure robustness
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Load entries from local storage
  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load entries:", e);
      return [];
    }
  });

  const [currentTab, setCurrentTab] = useState<TabView>('dashboard');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Persist settings changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings to localStorage (Quota exceeded?):", e);
    }
  }, [settings]);

  // Persist entries changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    } catch (e) {
      console.error("Failed to save entries to localStorage (Quota exceeded?):", e);
    }
  }, [entries]);

  const statsMap = useMemo(() => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setFullYear(today.getFullYear() + 5);
    const offset = futureDate.getTimezoneOffset();
    const localEnd = new Date(futureDate.getTime() - offset * 60 * 1000).toISOString().split('T')[0];

    return calculateStats(settings, entries, localEnd);
  }, [settings, entries]);

  const streak = useMemo(() => calculateStreak(statsMap), [statsMap]);

  const handleAddEntry = (amount: number, note: string, date: string) => {
    const newEntry: Entry = {
      id: crypto.randomUUID(),
      date,
      amount,
      note,
      timestamp: Date.now(),
    };
    setEntries(prev => [...prev, newEntry]);
  };

  const handleUpdateEntry = (updatedEntry: Entry) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleReset = () => {
    // Clear local storage explicitly
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.ENTRIES);
    
    // Create a fresh copy of defaults to ensure no reference issues
    // and reset the start date to TODAY, not when the app first loaded
    const freshSettings = { 
      ...DEFAULT_SETTINGS,
      startDate: new Date().toISOString().split('T')[0]
    };
    
    // Reset React State
    setSettings(freshSettings);
    setEntries([]);
    
    // Switch to dashboard to show clean slate
    setCurrentTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex justify-center">
      <div className="w-full max-w-md h-[100dvh] bg-slate-950 shadow-2xl relative flex flex-col overflow-hidden sm:border-x sm:border-slate-800">
        
        {/* Header - Added padding-top safe area for iOS PWA */}
        <header className="px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-4 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 flex justify-between items-center border-b border-slate-800 transition-all">
          <div className="flex items-center gap-3">
             {settings.logo ? (
                 <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md border border-slate-800">
                     <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                 </div>
             ) : (
                 <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                    <Beer size={20} fill="currentColor" className="text-white/90" />
                 </div>
             )}
             <h1 className="text-xl font-black tracking-tight text-white">
                BrewBalance
             </h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-hidden flex flex-col relative z-0">
          {currentTab === 'dashboard' && (
            <Dashboard 
              statsMap={statsMap} 
              settings={settings} 
              onAddEntry={handleAddEntry} 
              streak={streak} 
            />
          )}
          {currentTab === 'add' && (
            <AddEntryScreen 
              onSave={(amount, note, date) => {
                handleAddEntry(amount, note, date);
                setCurrentTab('dashboard');
              }}
              currency={settings.currency}
            />
          )}
          {currentTab === 'history' && (
            <HistoryView 
              entries={entries} 
              settings={settings} 
              onEditEntry={(entry) => setEditingEntry(entry)}
            />
          )}
          {currentTab === 'calendar' && (
            <CalendarView statsMap={statsMap} settings={settings} />
          )}
          {currentTab === 'settings' && (
            <SettingsView 
              settings={settings} 
              onSave={(newSettings) => {
                setSettings(newSettings);
                setCurrentTab('dashboard');
              }}
              onReset={handleReset} 
            />
          )}
        </main>

        {/* Nav */}
        <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />
        
        {/* Root Level Modal to ensure Z-Index is higher than Navigation */}
        <EditEntryModal 
            entry={editingEntry}
            isOpen={!!editingEntry}
            onClose={() => setEditingEntry(null)}
            onSave={(updated) => {
                handleUpdateEntry(updated);
                setEditingEntry(null);
            }}
            onDelete={(id) => {
                handleDeleteEntry(id);
                setEditingEntry(null);
            }}
            currency={settings.currency}
        />

      </div>
    </div>
  );
};

export default App;