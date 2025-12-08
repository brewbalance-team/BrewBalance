
export enum BudgetStatus {
  UnderAlarm = 'GREEN',
  Warning = 'YELLOW',
  OverBudget = 'RED',
}

export type ChallengeStatus = 'active' | 'completed' | 'cancelled' | 'failed';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly';

export interface Challenge {
  id: string;
  name: string;
  purpose: string; // "Using of saved money"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  targetPercentage?: number; // 0-100, success criteria
  recurrence?: RecurrenceType;
  status?: ChallengeStatus; // Status for history
  finalSaved?: number; // Snapshot of saved amount for history
  finalTotalBudget?: number; // Snapshot of total budget for history calculation
}

export interface Settings {
  weekdayBudget: number;
  weekendBudget: number;
  currency: string;
  alarmThreshold: number; // 0.0 to 1.0
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null
  logo: string | null; // Base64 encoded image string
  customBudgets?: Record<string, number>; // Date (YYYY-MM-DD) -> Amount
  userName: string;
  activeChallenge?: Challenge | null;
  pastChallenges?: Challenge[];
}

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  note: string;
  timestamp: number;
}

export interface DailyStats {
  date: string;
  baseBudget: number;
  rollover: number; // In challenge mode, this is effectively 0 for calculation
  totalAvailable: number;
  spent: number;
  remaining: number;
  status: BudgetStatus;
  entries: Entry[];
  isCustomBudget?: boolean;
  // Challenge specific props
  isChallengeDay?: boolean;
  challengeName?: string;
  challengeSavedSoFar?: number; // Cumulative savings since start of challenge
  challengeTotalSaved?: number; // Total accumulated for the whole challenge context
}

export type TabView = 'dashboard' | 'add' | 'calendar' | 'history' | 'settings';
