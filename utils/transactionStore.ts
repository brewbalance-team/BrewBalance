/**
 * @fileoverview Transaction storage utilities for managing persistence of transaction data.
 *
 * This module provides functions to load, save, append, and clear transactions from
 * persistent storage. It acts as an abstraction layer over the underlying DataStore,
 * providing a clean API for transaction CRUD operations while handling JSON serialization,
 * error handling, and data integrity.
 *
 * @module utils/transactionStore
 */

import { Transaction } from '../types';
import { STORAGE_KEYS } from '../constants';

import { DataStore, getDefaultDataStore } from './datastore';

/**
 * Safely parses a JSON string with fallback support.
 *
 * @template T - The expected type of the parsed value
 * @param {string | null} s - The JSON string to parse, or null
 * @param {T} fallback - The fallback value to return if parsing fails or input is null
 * @returns {T} The parsed JSON object or the fallback value if parsing fails
 *
 * @example
 * const transactions = parseJSON<Transaction[]>('[]', []);
 * const config = parseJSON<Config>(null, defaultConfig); // Returns defaultConfig
 */
const parseJSON = <T>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch (e) {
    console.warn('Failed to parse JSON from storage key', e);
    return fallback;
  }
};

/**
 * Loads all transactions from persistent storage.
 *
 * Retrieves the serialized transactions from the data store and deserializes them
 * into an array of Transaction objects. Returns an empty array if no transactions
 * are found or if deserialization fails.
 *
 * @param {DataStore} [store] - Optional custom DataStore instance. If not provided,
 *                               uses the default data store (e.g., localStorage)
 * @returns {Transaction[]} Array of transactions, or empty array if none exist or parsing fails
 *
 * @example
 * // Load transactions from default storage
 * const transactions = loadTransactions();
 *
 * // Load from custom store
 * const transactions = loadTransactions(customStore);
 */
export const loadTransactions = (store?: DataStore): Transaction[] => {
  const s = store || getDefaultDataStore();
  const raw = s.getItem(STORAGE_KEYS.TRANSACTIONS);
  return parseJSON<Transaction[]>(raw, []);
};

/**
 * Saves transactions to persistent storage.
 *
 * Serializes the provided array of transactions to JSON and persists them to
 * the data store. Handles errors gracefully by logging them to console without
 * throwing exceptions.
 *
 * @param {Transaction[]} txs - Array of transactions to save
 * @param {DataStore} [store] - Optional custom DataStore instance. If not provided,
 *                               uses the default data store (e.g., localStorage)
 * @returns {void}
 * @throws Does not throw; errors are logged to console
 *
 * @example
 * // Save transactions to default storage
 * saveTransactions(transactions);
 *
 * // Save to custom store
 * saveTransactions(transactions, customStore);
 */
export const saveTransactions = (txs: Transaction[], store?: DataStore): void => {
  try {
    const s = store || getDefaultDataStore();
    s.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  } catch (e) {
    console.error('Failed to save transactions', e);
  }
};

/**
 * Appends a new transaction to the transaction store.
 *
 * Adds a single transaction to the persistent storage. Before appending, performs
 * duplicate detection based on transaction ID. After appending, sorts all transactions
 * by timestamp to maintain chronological order.
 *
 * @param {Transaction} tx - The transaction object to append
 * @param {DataStore} [store] - Optional custom DataStore instance. If not provided,
 *                               uses the default data store (e.g., localStorage)
 * @returns {void}
 *
 * @remarks
 * - Duplicate transactions (same ID) are silently ignored
 * - Transactions are sorted by timestamp after insertion
 * - This function performs both a load and save operation
 *
 * @example
 * const newTransaction: Transaction = {
 *   id: 'tx-123',
 *   amount: 50,
 *   timestamp: Date.now(),
 *   // ... other fields
 * };
 * appendTransaction(newTransaction);
 */
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

/**
 * Clears all transactions from persistent storage.
 *
 * Removes the entire transaction dataset from the data store. This is a
 * destructive operation that cannot be undone.
 *
 * @param {DataStore} [store] - Optional custom DataStore instance. If not provided,
 *                               uses the default data store (e.g., localStorage)
 * @returns {void}
 *
 * @warning This operation is destructive and cannot be easily undone.
 *          Consider implementing a backup or confirmation before calling in production.
 *
 * @example
 * // Clear all transactions from default storage
 * clearTransactions();
 *
 * // Clear from custom store
 * clearTransactions(customStore);
 */
export const clearTransactions = (store?: DataStore): void => {
  const s = store || getDefaultDataStore();
  s.removeItem(STORAGE_KEYS.TRANSACTIONS);
};
