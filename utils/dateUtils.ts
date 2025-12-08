
export const formatDateISO = (date: Date): string => {
  // Use local time for date string generation to respect user timezone
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

export const isWeekend = (dateStr: string): boolean => {
  // dateStr is YYYY-MM-DD. New Date(dateStr) creates a UTC date.
  // We should check the UTC day to avoid timezone shifts.
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday (0) or Saturday (6)
};

export const getMonthDates = (year: number, month: number): string[] => {
  const date = new Date(year, month, 1);
  const dates: string[] = [];
  while (date.getMonth() === month) {
    dates.push(formatDateISO(date));
    date.setDate(date.getDate() + 1);
  }
  return dates;
};

export const getTodayISO = (): string => formatDateISO(new Date());

export const addDays = (dateStr: string, days: number): string => {
  // Treat dateStr as UTC midnight to avoid timezone shifting issues
  const date = new Date(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
};

export const addMonths = (dateStr: string, months: number): string => {
  const date = new Date(dateStr);
  // Using UTC methods to avoid timezone shift issues on day boundaries
  const currentDay = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  
  // Handle end-of-month edge cases (e.g. Jan 31 + 1 month -> Feb 28/29)
  // If the day changed, it means the month doesn't have that day (e.g. 31st), so it rolled over.
  // Set to last day of previous month (which is the target month).
  if (date.getUTCDate() !== currentDay) {
      date.setUTCDate(0);
  }
  
  return date.toISOString().split('T')[0];
};
