import { describe, it, expect } from 'vitest';
import { sortTransactions } from '../../src/utils/transactionOrdering';

/**
 * Unit test for transaction ordering: when a reversal and a correction have the same timestamp,
 * the reversal should be displayed before the correction.
 */
describe('Transaction Ordering', () => {
  it('should display reversal before correction when timestamps tie', () => {
    const transactions = [
      {
        id: '2',
        type: 'correction',
        timestamp: 1700000000000,
        amount: 10,
      },
      {
        id: '1',
        type: 'reversal',
        timestamp: 1700000000000,
        amount: -10,
      },
    ];

    const sorted = sortTransactions(transactions);
    expect(sorted[0].type).toBe('reversal');
    expect(sorted[1].type).toBe('correction');
  });
});
