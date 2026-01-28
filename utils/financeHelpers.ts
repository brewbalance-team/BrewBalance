
import { Settings, Entry, DailyStats, BudgetStatus, Challenge } from '../types';

import { isWeekend, addDays, formatDateISO } from './dateUtils';

export const calculateStats = (
  settings: Settings,
  entries: Entry[],
  targetDateStr?: string // If provided, ensures calculation goes up to at least this date
): Record<string, DailyStats> => {
  const statsMap: Record<string, DailyStats> = {};
  
  // Sort entries just in case
  const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  
  // Group entries by date
  const entriesByDate: Record<string, Entry[]> = {};
  sortedEntries.forEach(entry => {
    if (!entriesByDate[entry.date]) {
      entriesByDate[entry.date] = [];
    }
    entriesByDate[entry.date]!.push(entry);
  });

  let currentDateStr = settings.startDate;
  // Determine the end date for calculation: Max of (Today, TargetDate, Last Entry Date)
  const todayStr = formatDateISO(new Date());
  let endDateCalcStr = targetDateStr && targetDateStr > todayStr ? targetDateStr : todayStr;

  // If there are future entries beyond today/target, extend calculation
  const lastEntryDate = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1]!.date : settings.startDate;
  if (lastEntryDate > endDateCalcStr) {
    endDateCalcStr = lastEntryDate;
  }

  // Tracking variables
  let currentRollover = 0;
  // This variable holds the rollover from the last normal day before a challenge started.
  // It effectively "pauses" the balance during a challenge and restores it afterwards.
  let preservedNormalRollover: number | null = null;

  let challengeAccumulatedSavings = 0;
  let currentChallengeId: string | null = null;

  // Helper to find if a date falls within any challenge (active or past)
  const getChallengeForDate = (date: string): Challenge | null => {
      // Check active
      if (settings.activeChallenge) {
          if (date >= settings.activeChallenge.startDate && date <= settings.activeChallenge.endDate) {
              return settings.activeChallenge;
          }
      }
      // Check past
      if (settings.pastChallenges) {
          for (const ch of settings.pastChallenges) {
              if (date >= ch.startDate && date <= ch.endDate) {
                  return ch;
              }
          }
      }
      return null;
  };

  // Loop until we pass the end date
  while (currentDateStr <= endDateCalcStr) {
    const isWknd = isWeekend(currentDateStr);
    
    // Check if we are in a challenge
    const challenge = getChallengeForDate(currentDateStr);
    const isChallengeDay = !!challenge;

    // Handle Challenge Context Switching (for accumulation logic)
    if (isChallengeDay) {
        if (challenge?.id !== currentChallengeId) {
            // New challenge block
            challengeAccumulatedSavings = 0;
            currentChallengeId = challenge.id;
        }
    } else {
        currentChallengeId = null;
        challengeAccumulatedSavings = 0;
    }

    // Determine Base Budget
    let baseBudget = 0;
    let isCustomBudget = false;

    if (!settings.endDate || currentDateStr <= settings.endDate) {
        // Check for custom override first
        if (settings.customBudgets && settings.customBudgets[currentDateStr] !== undefined) {
            baseBudget = settings.customBudgets[currentDateStr]!;
            isCustomBudget = true;
        } else {
            baseBudget = isWknd ? settings.weekendBudget : settings.weekdayBudget;
        }
    }

    // Determine Spent
    const dayEntries = entriesByDate[currentDateStr] || [];
    const spent = dayEntries.reduce((sum, e) => sum + e.amount, 0);
    
    // --- Rollover & Available Calculation ---
    
    // Check for Custom Rollover (User Override)
    // If a custom rollover is set for this day, we use it as the starting point, 
    // ignoring calculations from previous days (or preserved values).
    let isCustomRollover = false;
    if (settings.customRollovers && settings.customRollovers[currentDateStr] !== undefined) {
        currentRollover = settings.customRollovers[currentDateStr]!;
        isCustomRollover = true;
        // If we override manually, we should also clear any preserved state to avoid weird restoration later
        if (preservedNormalRollover !== null) {
            preservedNormalRollover = null; 
        }
    }

    let totalAvailable = 0;
    let remaining = 0;
    let statsRollover = 0;

    if (isChallengeDay) {
        // PRESERVE ROLLOVER (Only if not already preserved and not a manual override day)
        if (preservedNormalRollover === null && !isCustomRollover) {
            preservedNormalRollover = currentRollover;
        }

        // CHALLENGE MODE LOGIC
        // 1. Available is strictly Base Budget (previous rollover is ignored/preserved).
        // NOTE: If user sets a custom rollover inside a challenge, we technically honor it 
        // if we assume "Custom Rollover" implies "Starting Balance Adjustment".
        // But the prompt implies this is for the "Balance Tab" (Calendar), usually associated with normal budgeting.
        // For simplicity and to avoid cheating in challenges: 
        // Standard Challenge: Rollover ignored.
        // If Custom Rollover Set: We add it to available.
        
        if (isCustomRollover) {
            totalAvailable = baseBudget + currentRollover;
        } else {
            totalAvailable = baseBudget;
        }
        
        remaining = totalAvailable - spent;
        
        // 2. Accumulate savings (based on remaining)
        challengeAccumulatedSavings += remaining;

        // 3. Stats rollover
        statsRollover = isCustomRollover ? currentRollover : 0;
        
        // 4. Update currentRollover for NEXT iteration to 0
        currentRollover = 0;

    } else {
        // NORMAL MODE LOGIC
        
        // RESTORE ROLLOVER: If we have a preserved rollover and we haven't manually overridden this day
        if (preservedNormalRollover !== null && !isCustomRollover) {
            currentRollover = preservedNormalRollover;
            preservedNormalRollover = null;
        }

        totalAvailable = baseBudget + currentRollover;
        remaining = totalAvailable - spent;
        statsRollover = currentRollover;
        
        // Logic for next day rollover
        if (currentDateStr >= todayStr) {
            // If calculating for today or future, we don't project rollover yet
            currentRollover = 0; 
        } else {
            currentRollover = remaining;
        }
    }

    // Determine status
    let status = BudgetStatus.UnderAlarm;
    const alarmLimit = totalAvailable > 0 ? totalAvailable * settings.alarmThreshold : 0;

    if (spent > totalAvailable) {
      status = BudgetStatus.OverBudget;
    } else if (totalAvailable > 0 && spent >= alarmLimit) {
      status = BudgetStatus.Warning;
    } else {
      status = BudgetStatus.UnderAlarm;
    }

    statsMap[currentDateStr] = {
      date: currentDateStr,
      baseBudget,
      rollover: statsRollover,
      totalAvailable,
      spent,
      remaining,
      status,
      entries: dayEntries,
      isCustomBudget,
      isCustomRollover,
      isChallengeDay,
      ...(isChallengeDay ? { challengeName: challenge?.name, challengeSavedSoFar: challengeAccumulatedSavings } : {})
    };
    
    currentDateStr = addDays(currentDateStr, 1);
  }

  return statsMap;
};

export const calculateStreak = (statsMap: Record<string, DailyStats>): number => {
  const today = formatDateISO(new Date());
  let streak = 0;
  let checkDate = today;

  // Check today first
  const todayStats = statsMap[today];
  // If today is over budget, streak is broken immediately (or 0)
  if (todayStats && todayStats.status === BudgetStatus.OverBudget) {
      return 0;
  }
  
  // Start counting backwards from yesterday
  checkDate = addDays(today, -1);
  
  while (true) {
    const stats = statsMap[checkDate];
    if (!stats) break; // No record implies start of tracking or gap
    
    // Resume Logic: If it was a challenge day, we skip it (pause), 
    // effectively connecting the streak across the challenge gap.
    if (stats.isChallengeDay) {
        checkDate = addDays(checkDate, -1);
        continue;
    }
    
    // Normal Streak Logic
    if (stats.status !== BudgetStatus.OverBudget) {
      streak++;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
  }
  
  return streak;
};

/**
 * Calculates the total budget allocated for the entire duration of a challenge.
 */
export const calculateChallengeTotalBudget = (challenge: Challenge, settings: Settings): number => {
    let total = 0;
    let curr = challenge.startDate;
    while (curr <= challenge.endDate) {
        const isWknd = isWeekend(curr);
        let dailyBudget = 0;
        if (settings.customBudgets && settings.customBudgets[curr] !== undefined) {
            dailyBudget = settings.customBudgets[curr]!;
        } else {
            dailyBudget = isWknd ? settings.weekendBudget : settings.weekdayBudget;
        }
        total += dailyBudget;
        curr = addDays(curr, 1);
    }
    return total;
};

/**
 * Calculates the total budget allocated for the challenge up to a specific date (inclusive).
 */
export const calculateChallengeBudgetSoFar = (challenge: Challenge, settings: Settings, throughDateISO: string): number => {
    let total = 0;
    let curr = challenge.startDate;
    const end = throughDateISO < challenge.endDate ? throughDateISO : challenge.endDate;
    
    // If today is before start date, budget so far is 0
    if (throughDateISO < challenge.startDate) return 0;

    while (curr <= end) {
        const isWknd = isWeekend(curr);
        let dailyBudget = 0;
        if (settings.customBudgets && settings.customBudgets[curr] !== undefined) {
            dailyBudget = settings.customBudgets[curr]!;
        } else {
            dailyBudget = isWknd ? settings.weekendBudget : settings.weekdayBudget;
        }
        total += dailyBudget;
        curr = addDays(curr, 1);
    }
    return total;
};

/**
 * Checks if the challenge has failed mathematically based on current savings.
 * Failure condition: (TotalBudget - TotalSpent) / TotalBudget < Target%
 * Where TotalSpent = BudgetSoFar - SavedSoFar
 */
export const isChallengeFailed = (
    challenge: Challenge, 
    settings: Settings, 
    savedSoFar: number, 
    todayISO: string
): boolean => {
    const totalBudget = calculateChallengeTotalBudget(challenge, settings);
    const budgetSoFar = calculateChallengeBudgetSoFar(challenge, settings, todayISO);
    
    // Logic: SavedSoFar = BudgetSoFar - SpentSoFar
    // Therefore: SpentSoFar = BudgetSoFar - SavedSoFar
    const spentSoFar = budgetSoFar - savedSoFar;
    
    // Max possible savings at end of challenge (assuming 0 spend for all future days)
    const maxPossibleFinalSavings = totalBudget - spentSoFar;
    
    const targetPercentage = challenge.targetPercentage ?? 100;
    const targetAmount = totalBudget * (targetPercentage / 100);
    
    // Use a small epsilon for floating point comparison
    return maxPossibleFinalSavings < (targetAmount - 0.01);
};
