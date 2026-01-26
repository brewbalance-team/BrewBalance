import React from 'react';
import { LayoutDashboard, Calendar, Settings as SettingsIcon, PlusCircle, History } from 'lucide-react';

import { TabView } from '../types';
import { testId } from '../utils/testUtils';

interface NavigationProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentTab, onTabChange }) => {
  const navItems: { id: TabView; icon: React.ElementType; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
    { id: 'add', icon: PlusCircle, label: 'Add' },
    { id: 'calendar', icon: Calendar, label: 'Balance' },
    { id: 'history', icon: History, label: 'History' },
  ];

  return (
    <div className="fixed bottom-6 left-4 right-4 z-40 flex justify-center" {...testId('navigation')}>
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl px-2 py-2 shadow-2xl shadow-black/50 flex items-center justify-between w-full max-w-sm ring-1 ring-white/5">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center p-2 transition-all duration-300 group flex-1`}
              {...testId(`nav-${item.id}`)}
            >
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800 rounded-xl scale-0 transition-transform duration-300 ${isActive ? 'scale-100' : 'group-hover:scale-50'}`}></div>
              <div className={`relative flex flex-col items-center z-10 ${isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300 mb-1" />
                <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navigation;