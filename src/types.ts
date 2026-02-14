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
  recurrenceEndDate?: string; // YYYY-MM-DD, optional end date for recurrence
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
  customRollovers?: Record<string, number>; // Date (YYYY-MM-DD) -> Amount (Opening balance adjustment)
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
  isCustomRollover?: boolean;
  // Challenge specific props
  isChallengeDay?: boolean;
  challengeName?: string;
  challengeSavedSoFar?: number; // Cumulative savings since start of challenge
  challengeTotalSaved?: number; // Total accumulated for the whole challenge context
}

export type TabView = 'dashboard' | 'add' | 'calendar' | 'history' | 'settings';

export enum TransactionType {
  ENTRY_ADDED = 'ENTRY_ADDED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  DAILY_BUDGET_CREATED = 'DAILY_BUDGET_CREATED',
  CUSTOM_ROLLOVER_SET = 'CUSTOM_ROLLOVER_SET',
  CHALLENGE_CREATED = 'CHALLENGE_CREATED',
  CHALLENGE_ARCHIVED = 'CHALLENGE_ARCHIVED',
}

export interface BaseTransaction {
  id: string; // uuid
  type: TransactionType;
  timestamp: number; // epoch ms
}

export interface EntryAddedTransaction extends BaseTransaction {
  type: TransactionType.ENTRY_ADDED;
  entry: Entry;
}

export interface SettingsUpdatedTransaction extends BaseTransaction {
  type: TransactionType.SETTINGS_UPDATED;
  settingsPatch: Partial<Settings>;
}

export interface DailyBudgetCreatedTransaction extends BaseTransaction {
  type: TransactionType.DAILY_BUDGET_CREATED;
  date: string; // YYYY-MM-DD
  baseBudget: number;
  rollover: number;
}

export interface CustomRolloverSetTransaction extends BaseTransaction {
  type: TransactionType.CUSTOM_ROLLOVER_SET;
  date: string; // YYYY-MM-DD
  rollover: number; // The new rollover value after adjustment
  delta: number; // The actual change amount (positive = increase, negative = decrease)
  reason?: string; // Why was this adjustment made (e.g., "base budget change", "manual rollover adjustment")
}

export interface ChallengeTransaction extends BaseTransaction {
  type: TransactionType.CHALLENGE_CREATED | TransactionType.CHALLENGE_ARCHIVED;
  challenge: Challenge;
}

export type Transaction =
  | EntryAddedTransaction
  | SettingsUpdatedTransaction
  | DailyBudgetCreatedTransaction
  | CustomRolloverSetTransaction
  | ChallengeTransaction;
