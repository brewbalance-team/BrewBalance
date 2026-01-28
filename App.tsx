
import React, { useState, useEffect, useMemo } from 'react';

import { Settings, Entry, TabView, ChallengeStatus, Challenge } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';
import { calculateStats, calculateStreak, calculateChallengeTotalBudget } from './utils/financeHelpers';
import { getTodayISO, addDays, addMonths } from './utils/dateUtils';
import { testId } from './utils/testUtils';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import SettingsView from './components/Settings';
import Navigation from './components/Navigation';
import HistoryView from './components/HistoryView';
import AddEntryScreen from './components/AddEntryScreen';
import EditEntryModal from './components/EditEntryModal';
import CreativeLogo from './components/CreativeLogo';

const App: React.FC = () => {
  // Load settings from local storage, merging with defaults to ensure robustness
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        // Ensure defaults are merged
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        return merged as Settings;
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    // If no settings found, use local today as start date
    const defaultSettings: Settings = { ...DEFAULT_SETTINGS, startDate: getTodayISO() };
    return defaultSettings;
  });

  // Load entries from local storage
  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      return stored ? (JSON.parse(stored) as Entry[]) : [];
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

  // Auto-archive expired challenges and handle Recurrence
  useEffect(() => {
    const today = getTodayISO();
    if (settings.activeChallenge && today > settings.activeChallenge.endDate) {
      console.log("Archiving expired challenge...");
      const active = settings.activeChallenge;
      // Retrieve stats for the last day of the challenge to lock in the final result
      const finalStats = statsMap[active.endDate];

      // Fallback if stats missing (shouldn't happen if logic is correct)
      const finalSaved = finalStats?.challengeSavedSoFar ?? 0;

      const totalBudget = calculateChallengeTotalBudget(active, settings);
      const targetPct = active.targetPercentage ?? 100;
      const targetAmount = totalBudget * (targetPct / 100);

      // Strict check: if target is 100, we need exactly >= 100% of budget.
      // Floating point tolerance is small.
      // If I spent anything, finalSaved < totalBudget, so it should fail if target is 100%.
      const isSuccess = finalSaved >= (targetAmount - 0.001);

      const status: ChallengeStatus = isSuccess ? 'completed' : 'failed';

      const archivedChallenge = {
        ...active,
        status,
        finalSaved,
        finalTotalBudget: totalBudget
      };

      // --- RECURRENCE LOGIC ---
      let nextChallenge: Challenge | null = null;
      if (active.recurrence && active.recurrence !== 'none') {
        const startDateObj = new Date(active.startDate);
        const endDateObj = new Date(active.endDate);
        const durationDays = Math.round((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));

        let newStartDate = '';
        let newEndDate = '';

        if (active.recurrence === 'daily') {
          newStartDate = addDays(active.startDate, 1);
          newEndDate = addDays(active.endDate, 1);
        } else if (active.recurrence === 'weekly') {
          newStartDate = addDays(active.startDate, 7);
          newEndDate = addDays(active.endDate, 7);
        } else if (active.recurrence === 'bi-weekly') {
          newStartDate = addDays(active.startDate, 14);
          newEndDate = addDays(active.endDate, 14);
        } else if (active.recurrence === 'monthly') {
          newStartDate = addMonths(active.startDate, 1);
          newEndDate = addMonths(active.endDate, 1);
        }

        // Check for overlap: If the calculated start date is BEFORE or ON the old end date (impossible for standard interval, but possible for multi-day daily),
        // we enforce the new challenge to start immediately after the old one.
        // Strategy: If newStartDate <= active.endDate, shift it to active.endDate + 1.
        if (newStartDate <= active.endDate) {
          newStartDate = addDays(active.endDate, 1);
          newEndDate = addDays(newStartDate, durationDays);
        }

        // CHECK RECURRENCE END DATE
        // If a recurrenceEndDate is set, ensure the new challenge starts on or before it.
        // If the new start date is AFTER the recurrenceEndDate, we stop.
        let shouldCreate = true;
        if (active.recurrenceEndDate && newStartDate > active.recurrenceEndDate) {
          shouldCreate = false;
          console.log("Recurrence end date reached. Stopping recurrence.");
        }

        if (shouldCreate) {
          nextChallenge = {
            ...active,
            id: crypto.randomUUID(),
            startDate: newStartDate,
            endDate: newEndDate,
            status: 'active'
          };
          console.log("Created recurring challenge:", nextChallenge);
        }
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(prev => ({
        ...prev,
        activeChallenge: nextChallenge, // Set the next one if recurring, else null
        pastChallenges: [archivedChallenge, ...(prev.pastChallenges || [])]
      }));
    }
  }, [settings.activeChallenge, statsMap, settings]);

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

    // Create a fresh copy of defaults and ensure local date
    const freshSettings = {
      ...DEFAULT_SETTINGS,
      startDate: getTodayISO(),
      customBudgets: {}
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
        <header className="px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-4 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 flex justify-between items-center border-b border-slate-800 transition-all" {...testId('app-header')}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg border border-slate-800 shrink-0" {...testId('app-logo')}>
              {settings.logo ? (
                <img src={settings.logo} alt="App Logo" className="w-full h-full object-cover" />
              ) : (
                <CreativeLogo />
              )}
            </div>
            <h1 className="text-xl font-black tracking-tight text-white" {...testId('app-title')}>
              BrewBalance
            </h1>
          </div>
          {settings.userName && (
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-0.5">Hello,</div>
              <div className="text-sm font-bold text-white leading-none">{settings.userName}</div>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-hidden flex flex-col relative z-0">
          {currentTab === 'dashboard' && (
            <Dashboard
              statsMap={statsMap}
              settings={settings}
              onAddEntry={handleAddEntry}
              streak={streak}
              onUpdateSettings={setSettings}
            />
          )}
          {currentTab === 'add' && (
            <AddEntryScreen
              onSave={(amount, note, date) => {
                handleAddEntry(amount, note, date);
                setCurrentTab('dashboard');
              }}
              onNavigate={(tab) => setCurrentTab(tab)}
              currency={settings.currency}
              settings={settings}
              onUpdateSettings={setSettings}
              statsMap={statsMap}
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
            <CalendarView
              statsMap={statsMap}
              settings={settings}
              onUpdateSettings={setSettings}
            />
          )}
          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              statsMap={statsMap}
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
