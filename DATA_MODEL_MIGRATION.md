# Data Model Migration Plan

**Status: Steps 1-6 Complete** ✅

## Phase 1 Completed (Feb 7, 2026)

All foundational infrastructure for transaction log has been implemented and tested:
- ✅ Transaction types and storage keys defined
- ✅ Transaction storage helpers implemented
- ✅ Replay engine with deterministic daily budget creation
- ✅ Migration utility to seed transactions from legacy localStorage
- ✅ App.tsx integrated with replay engine for immutable history
- ✅ Comprehensive unit tests (12 passing tests)

## Purpose

- Describe current data model and runtime behavior.
- Define desired state to enforce immutable past budgets.
- Provide concrete migration steps, data model changes, and implementation tasks.

Current State

- Settings (`Settings`) and entries (`Entry[]`) persisted in `localStorage` via keys in `constants.ts`.
- `calculateStats(settings, entries, targetDate?)` in `utils/financeHelpers.ts` derives daily `baseBudget` and rollovers directly from the live `settings` when run.
- `DailyStats` does not persist applied budget/rollover values; no transaction log or per-day snapshots exist.
- `App.tsx` recomputes `statsMap` for a long future horizon whenever `settings` or `entries` change, so changing `settings` today mutates computed past `DailyStats`.

Desired State

- Historical (past) dates — any date strictly before local `today` — are immutable: their applied base budget, rollover, and derived `DailyStats` must not change when `settings` are edited.
- `today` and future dates reflect current settings.
- Provide an auditable source-of-truth for the applied per-day budgets and rollovers used to compute historical balances.

High-level approach

Immutable Transaction Log (ledger) — recommended

- Maintain an append-only transaction log; every state change is a transaction (user settings edits, system-generated daily budget creation, entries, rollovers, challenge events).
- Derive state (settings and per-day budgets) by replaying transactions up to a given date; persist periodic checkpoints (snapshots) to avoid replay cost.
- Strong auditability and extensibility (undo/redo, server sync). Larger implementation scope and migration complexity compared to a simple snapshot approach, but provides a robust long-term foundation.

Data model changes

- Define a `Transaction` model in `types.ts` and a `TransactionType` enum. Example transactions: `ENTRY_ADDED`, `SETTINGS_UPDATED`, `DAILY_BUDGET_CREATED`, `CUSTOM_ROLLOVER_SET`, `CHALLENGE_CREATED`, `CHALLENGE_ARCHIVED`.
- Add storage keys in `constants.ts`: `STORAGE_KEYS.TRANSACTIONS` and `STORAGE_KEYS.CHECKPOINTS`.
- Consider adding lightweight persisted checkpoints that store derived `DailyStats` up to a checkpoint date to avoid full replay on startup.

## Completed Implementation Details (Feb 7, 2026)

### 1. Data Model (types.ts)
- `TransactionType` enum: `ENTRY_ADDED`, `SETTINGS_UPDATED`, `DAILY_BUDGET_CREATED`, `CUSTOM_ROLLOVER_SET`, `CHALLENGE_CREATED`, `CHALLENGE_ARCHIVED`
- `Transaction` union type with specific transaction interfaces
- All transactions have `id`, `type`, and `timestamp` fields

### 2. Storage Layer (utils/transactionStore.ts)
- `loadTransactions()` - retrieves all transactions from storage
- `saveTransactions(txs)` - persists transactions
- `appendTransaction(tx)` - adds transaction with deduplication by ID and timestamp sorting
- `clearTransactions()` - clears all transactions (for reset/testing)
- Private `parseJSON()` utility for safe JSON parsing with fallback

### 3. Replay Engine (utils/replayEngine.ts)
- `replay(transactions?, throughDate?, store?)` - derives app state by replaying transactions in chronological order
  - Returns derived `settings`, `entries`, `dailyBudgets` map, and original transactions
  - Optional date filter to replay only through a specific date
  - Deterministic processing of transaction types; side effects forbidden (pure function)
- `ensureDailyBudgetForDate(date, transactions?)` - creates a DAILY_BUDGET_CREATED transaction if missing
  - Uses `calculateStats` from financeHelpers to derive the applicable budget
  - Idempotent with deduplication by date
- `materializeUpTo(throughDate)` - ensures daily budgets exist for all past dates
  - Only materializes dates strictly before today to lock history
  - Returns list of newly materialized dates

### 4. Migration Utility (utils/migration.ts)
- `isMigrated(store?)` - checks if transaction log already exists (app has been migrated)
- `migrateFromLegacyModel(store?)` - one-time migration from legacy localStorage to transaction log
  - Loads existing `entries` and `settings` from localStorage
  - Creates `SETTINGS_UPDATED` transaction with timestamp 0 (ensures ordered processing)
  - Creates `ENTRY_ADDED` transactions for each entry (sorted by timestamp)
  - Materializes all past dates to lock historical budgets
  - Returns `MigrationReport` with summary of created transactions and materialized dates
  - Idempotent: ignores re-runs if already migrated
- Private helpers: `loadLegacySettings()`, `loadLegacyEntries()`

### 5. App Integration (App.tsx)
- Calls `migrateFromLegacyModel()` on app mount via `useRef` to prevent repeat migrations
- Loads initial state via `replay()` for both `settings` and `entries`
- New entries are appended to transaction log via `appendTransaction()` when added
- `handleReset()` now also clears the transaction log via `clearTransactions()`
- Maintains backward compatibility: if no transactions exist, falls back to defaults

### 6. Testing (test/unit/utils/migration.test.ts)
- 8 migration tests covering:
  - `isMigrated()` returns false before and true after migration
  - Migration is idempotent
  - Entries are preserved and replayed
  - Settings are preserved and replayed
  - Transactions are created in correct order (settings first, then entries)
  - Report includes materialized dates
  - Settings transaction has timestamp 0 for determinism
- All tests pass with isolated in-memory storage

---

## Original Plan (for reference)

Purpose

1. Define `Transaction` model and storage keys
   - Create `types.Transaction` union and `STORAGE_KEYS.TRANSACTIONS`, `STORAGE_KEYS.CHECKPOINTS`.
2. Implement storage helpers
   - `utils/transactionStore.ts` to append and read transactions, with deduplication helpers for system-generated items (e.g. `DAILY_BUDGET` per date).
3. Build replay engine
   - Implement `utils/replayEngine.ts` with:
     - `replay(transactions, fromCheckpoint?)` => produces derived `settings`, `entries`, and materialized per-date `DailyStats` up to a desired date.
     - Checkpointing support: persist snapshot state and last-applied transaction index to accelerate startup.
4. Deterministic daily-budget creation
   - When materializing a date, if no `DAILY_BUDGET` tx exists for that date, create and append one using the effective settings as of that date (derived by replaying `SETTINGS_UPDATED` transactions up to that date).
   - Ensure idempotency and deduplication (append only once).
5. Migration
   - Generate transactions representing existing `entries` and `settings` history: create `ENTRY_ADDED` transactions for existing entries (ordered by timestamp); create `DAILY_BUDGET` transactions for historical dates using current computed `statsMap` to preserve current historical values.
   - Create an initial checkpoint snapshot so the app can start from a compact state.
6. Update app code
   - Replace direct `settings` writes in UI code with appends of `SETTINGS_UPDATED` transactions and update local derived `settings` via replay result for UI convenience.
   - Update `calculateStats` to be a wrapper over the replay/materializer.
7. Tests and verification
   - Tests for replay determinism, idempotency, migration correctness, and preserving historical budgets after settings edits.
8. Rollout considerations
   - Because this is a larger change, ship with a migration path, backups, and an initial checkpoint creation step to minimize startup cost.

Operational details

- Checkpointing strategy (both options)
  - Periodically (e.g., daily or after N transactions), persist a checkpoint that stores snapshots up to a date and the last transaction index processed. This avoids full replay on each start.
- Storage format
  - Keep snapshots and transactions as JSON in `localStorage`. Use compact keys and consider compressing older checkpoints if size becomes a concern.
- Performance
  - Avoid replaying entire history on every UI render; replay once at startup or when transactions change, persist derived `settings` and `statsMap` into memory, and update incrementally as new transactions append.

Testing matrix

- Migration test: fresh install vs upgrade from previous version; verify historical values are preserved after migration.
- Regression tests: budgets unchanged for past dates after settings edits.
- Challenge tests: verify archived challenge `finalSaved`/`finalTotalBudget` are based on applied historical budgets.

Estimated effort

- Option A (per-day snapshots): 4–8 developer-hours (types, storage helpers, `calculateStats` edits, migration, tests).
- Option B (transaction log + checkpoints): 1–3 developer-days (design, types, replay engine, migration, UI integration, tests).

Risks & mitigation

- Risk: localStorage growth — mitigate via checkpointing and retention policy for old transactions/snapshots.
- Risk: migration runtime on first run — mitigate by performing migration incrementally with progress indicator or limiting to a reasonable history window.
- Risk: subtle differences between computed historical budgets and replayed/serialized ones — mitigate by validating before finalizing migration and preserving original computed values when seeding snapshots/transactions.

Recommended next steps

1. Proceed with the ledger approach: design `Transaction` types, implement `transactionStore` and `replayEngine`, and write a migration that seeds transactions and creates an initial checkpoint.
2. Implement the replay engine and transaction append helpers, then seed transactions for existing `entries` and historical `DAILY_BUDGET` items using the current computed `statsMap` to preserve history.
3. Add tests for replay determinism and migration correctness, then stage rollout with backups and a migration flag.

---

Generated by: code-review & migration planning assistant
Date: 2026-01-31
