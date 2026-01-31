import { Settings } from './types';
import { getTodayISO } from './utils/dateUtils';

export const APP_VERSION = '1.0.8';

export const DEFAULT_SETTINGS: Settings = {
  weekdayBudget: 0, // Default to 0 so it's not set by default
  weekendBudget: 0, // Default to 0 so it's not set by default
  currency: 'JPY',
  alarmThreshold: 0.8, // 80%
  startDate: getTodayISO(), // Use local time today
  endDate: null,
  logo: null,
  customBudgets: {},
  userName: '',
  activeChallenge: null,
  pastChallenges: [],
};

export const STORAGE_KEYS = {
  SETTINGS: 'brewbalance_settings',
  ENTRIES: 'brewbalance_entries',
  TRANSACTIONS: 'brewbalance_transactions',
  CHECKPOINTS: 'brewbalance_checkpoints',
};

export const APP_COLORS = {
  primary: '#fbbf24', // Amber 400
  secondary: '#1e293b', // Slate 800
  success: '#34d399', // Emerald 400
  warning: '#fbbf24', // Amber 400
  danger: '#f87171', // Red 400
  background: '#020617', // Slate 950
};
