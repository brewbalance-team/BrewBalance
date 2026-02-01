import { Transaction } from '../types';
import { STORAGE_KEYS } from '../constants';

import { DataStore, getDefaultDataStore } from './datastore';

const parseJSON = <T>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch (e) {
    console.warn('Failed to parse JSON from storage key', e);
    return fallback;
  }
};

export const loadTransactions = (store?: DataStore): Transaction[] => {
  const s = store || getDefaultDataStore();
  const raw = s.getItem(STORAGE_KEYS.TRANSACTIONS);
  return parseJSON<Transaction[]>(raw, []);
};

export const saveTransactions = (txs: Transaction[], store?: DataStore): void => {
  try {
    const s = store || getDefaultDataStore();
    s.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  } catch (e) {
    console.error('Failed to save transactions', e);
  }
};

export const appendTransaction = (tx: Transaction, store?: DataStore): void => {
  const s = store || getDefaultDataStore();
  const txs = loadTransactions(s);
  // Prevent duplicate ids
  if (txs.some((t) => t.id === tx.id)) return;
  txs.push(tx);
  // Keep transactions sorted by timestamp
  txs.sort((a, b) => a.timestamp - b.timestamp);
  saveTransactions(txs, s);
};

export const clearTransactions = (store?: DataStore): void => {
  const s = store || getDefaultDataStore();
  s.removeItem(STORAGE_KEYS.TRANSACTIONS);
};
