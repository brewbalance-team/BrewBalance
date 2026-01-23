/**
 * Development-only utilities for testing and debugging
 */

/**
 * Conditionally adds data-testid attribute only in development builds
 * This helps keep production bundles clean while enabling reliable test automation
 *
 * @param testId - The test ID to use for element identification
 * @returns Object with data-testid property if in dev mode, empty object otherwise
 */
export const testId = (testId: string) => {
    return import.meta.env.DEV ? { 'data-testid': testId } : {};
};