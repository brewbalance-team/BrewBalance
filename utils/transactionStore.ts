import { Transaction } from '../types';
import { STORAGE_KEYS } from '../constants';

const parseJSON = <T>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch (e) {
    console.warn('Failed to parse JSON from storage key', e);
    return fallback;
  }
};

export const loadTransactions = (): Transaction[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return parseJSON<Transaction[]>(raw, []);
};

export const saveTransactions = (txs: Transaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  } catch (e) {
    console.error('Failed to save transactions', e);
  }
};

export const appendTransaction = (tx: Transaction): void => {
  const txs = loadTransactions();
  // Prevent duplicate ids
  if (txs.some((t) => t.id === tx.id)) return;
  txs.push(tx);
  // Keep transactions sorted by timestamp
  txs.sort((a, b) => a.timestamp - b.timestamp);
  saveTransactions(txs);
};

export const clearTransactions = (): void => {
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
};
