/**
 * @fileoverview Clock abstraction for testability.
 *
 * Provides utilities for getting the current time that can be mocked in tests
 * but are production-safe. Mock functionality is only available in development
 * and test builds.
 *
 * @module utils/clock
 */

const MOCK_TIME_STORAGE_KEY = 'brewBalanceMockTime';

const readStoredMockTime = (): number | null => {
  if (import.meta.env.MODE === 'production' || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MOCK_TIME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Mock time state (only accessible in non-production environments)
 */
let mockTime: number | null = readStoredMockTime();

/**
 * Sets a mock time for testing purposes.
 * Only works in development and test builds. Throws error in production.
 *
 * @param {number | Date} time - The time to mock (epoch ms or Date object)
 * @throws {Error} In production builds
 *
 * @example
 * // Set clock to a specific Monday
 * setMockTime(new Date('2026-02-09T00:00:00'));
 *
 * // Advance by 24 hours
 * setMockTime(now() + 24 * 60 * 60 * 1000);
 */
export const setMockTime = (time: number | Date): void => {
  if (import.meta.env.MODE === 'production') {
    throw new Error('Cannot set mock time in production build');
  }
  mockTime = typeof time === 'number' ? time : time.getTime();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MOCK_TIME_STORAGE_KEY, String(mockTime));
    } catch {
      // Ignore localStorage failures in constrained environments.
    }
  }
};

/**
 * Clears any mock time and returns to using real system time.
 * Only works in development and test builds.
 *
 * @example
 * clearMockTime(); // Resume normal time
 */
export const clearMockTime = (): void => {
  if (import.meta.env.MODE === 'production') return;
  mockTime = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(MOCK_TIME_STORAGE_KEY);
    } catch {
      // Ignore localStorage failures in constrained environments.
    }
  }
};

/**
 * Gets the current time in milliseconds since epoch.
 * Returns mock time if set (in dev/test), otherwise returns real time.
 *
 * @returns {number} Current time in milliseconds since Unix epoch
 *
 * @example
 * const timestamp = now();
 * const date = new Date(now());
 */
export const now = (): number => {
  return mockTime !== null ? mockTime : Date.now();
};

/**
 * Gets the current date object.
 * Returns a Date based on mock time if set (in dev/test), otherwise returns real date.
 *
 * @returns {Date} Current date object
 *
 * @example
 * const today = getCurrentDate();
 * console.log(today.toISOString());
 */
export const getCurrentDate = (): Date => {
  return new Date(now());
};

/**
 * Checks if mock time is currently active.
 * Always returns false in production builds.
 *
 * @returns {boolean} True if mock time is set
 */
export const isMockTimeActive = (): boolean => {
  if (import.meta.env.MODE === 'production') return false;
  return mockTime !== null;
};

// Expose clock functions on window in dev/test for E2E testing
if (import.meta.env.MODE !== 'production' && typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (window as any).__brewBalanceClock = {
    setMockTime,
    clearMockTime,
    now,
    getCurrentDate,
    isMockTimeActive,
  };
}
