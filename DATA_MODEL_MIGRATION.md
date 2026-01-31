# Data Model Migration Plan

Purpose
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

High-level approaches

Option A — Per-day snapshots (recommended for quick delivery)
- Persist per-date applied values at the time a date is first materialized: `appliedBaseBudget` and `appliedRollover` (and optionally `appliedAlarmThreshold`).
- For dates < `today`, `calculateStats` should read the persisted snapshot and use the applied values; if a snapshot is missing, compute then persist it.
- Minimal invasive changes, easy migration (materialize historical dates on upgrade), small storage overhead.

Option B — Immutable Transaction Log (ledger) (recommended long-term)
- Maintain an append-only transaction log; every state change is a transaction (user settings edits, system-generated daily budget creation, entries, rollovers, challenge events).
- Derive state (settings and per-day budgets) by replaying transactions up to a given date; persist periodic checkpoints (snapshots) to avoid replay cost.
- Strong auditability and extensibility (undo/redo, server sync), but larger implementation scope and migration complexity.

Data model changes (both options)
- `types.ts` additions (Option A):
  - Add to `DailyStats`: `appliedBaseBudget?: number`, `appliedRollover?: number`, `appliedAlarmThreshold?: number`.
  - Add storage key in `constants.ts` for daily snapshots, e.g. `STORAGE_KEYS.DAILY_SNAPSHOTS`.
- `types.ts` additions (Option B):
  - New `Transaction` union type and `TransactionType` enum; example transactions: `ENTRY_ADDED`, `SETTINGS_UPDATED`, `DAILY_BUDGET_CREATED`, `CUSTOM_ROLLOVER_SET`, `CHALLENGE_CREATED`, `CHALLENGE_ARCHIVED`.
  - Add `STORAGE_KEYS.TRANSACTIONS` and `STORAGE_KEYS.CHECKPOINTS`.

Migration steps — Option A (per-day snapshots)
1. Add new fields and storage key
   - Update `types.ts` for `DailyStats` to include `appliedBaseBudget`/`appliedRollover`.
   - Add `STORAGE_KEYS.DAILY_SNAPSHOTS` in `constants.ts`.
2. Snapshot storage helpers
   - Add `utils/storageHelpers.ts` with functions: `loadDailySnapshots(): Record<string, Snapshot>`, `saveDailySnapshot(date, snapshot)`, and `saveDailySnapshots(map)`.
3. Modify `calculateStats`
   - Accept an optional `snapshots` map parameter (or load inside the function).
   - When computing each date:
     - If `date < today`: try to read snapshot; if found, use `appliedBaseBudget`/`appliedRollover` to compute totals (still include `entries`), and set `DailyStats.applied*` fields.
     - If snapshot missing: compute using current logic, then persist a snapshot for that date immediately.
     - If `date >= today`: compute using live `settings` as before; optionally do not persist snapshots until day completes.
4. App startup migration/backfill
   - On app load in `App.tsx`, detect whether snapshots storage exists.
   - If missing or partial, compute `statsMap` for historical dates (up to `today - 1`) and persist snapshots for each past date to lock history. Limit to a reasonable window if necessary (e.g., from `settings.startDate` to `today - 1`).
   - Save a migration flag in `localStorage` to avoid repeating heavy work.
5. Update codepaths using budgets
   - Update `calculateChallengeTotalBudget`, CSV export, and any other code that computes totals across dates to consult snapshots for past dates (or use `calculateStats` which now uses snapshots).
6. Tests and verification
   - Add unit tests reproducing the example: set `weekdayBudget=300`, materialize past week, change to `200`, assert past dates still show `300` while today/future show `200`.
7. Rollout
   - Ship behind a feature flag if desired; otherwise perform silent migration on first run.

Migration steps — Option B (transaction log)
1. Define `Transaction` model and storage keys
   - Create `types.Transaction` union and `STORAGE_KEYS.TRANSACTIONS`, `STORAGE_KEYS.CHECKPOINTS`.
2. Implement storage helpers
   - `utils/transactionStore.ts` to append and read transactions, with deduplication helpers for system-generated items (e.g. `DAILY_BUDGET` per date).
3. Build replay engine
   - Implement `utils/replayEngine.ts` with:
     - `replay(transactions, fromCheckpoint?)` => produces derived `settings`, `entries`, and materialized per-date `DailyStats` up to desired date.
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
   - Tests for replay determinism, idempotency, and migration correctness.
8. Rollout considerations
   - Because this is a larger change, ship behind a migration path and ensure robust backups/exports in settings.

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
1. Decide approach: quick fix (Option A) vs ledger (Option B).  
2. If Option A: implement `applied*` fields, storage helpers, modify `calculateStats`, run migration to materialize past dates.  
3. If Option B: design `Transaction` types, implement `transactionStore` and `replayEngine`, write migration that seeds transactions and creates initial checkpoint.


---
Generated by: code-review & migration planning assistant
Date: 2026-01-31
