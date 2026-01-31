# BrewBalance — Specification (auto-generated)

This document summarizes the current features and observable runtime behavior of the BrewBalance project as implemented in the repository.

**Scope**: captures data model, calculation rules, UI screens/components, persistence, and important behaviors (challenges, recurrence, rollovers, exports, and image/AI helpers).

---

## Data Model

- **Settings**: stored shape defined in `types.ts`. Key fields:
  - **weekdayBudget**, **weekendBudget**: numbers used to compute daily budgets.
  - **currency**: string (e.g. `JPY`, `$`).
  - **alarmThreshold**: decimal (0.0–1.0) controlling Warning state.
  - **startDate**, **endDate**: ISO dates (endDate may be null).
  - **logo**: base64 data URL or null.
  - **customBudgets** and **customRollovers**: optional maps keyed by date (YYYY-MM-DD).
  - **activeChallenge** and **pastChallenges**: challenge objects or arrays.

- **Entry**: expense record with `id`, `date` (YYYY-MM-DD), `amount`, `note`, `timestamp`.

- **DailyStats**: computed per-date summary including baseBudget, rollover, totalAvailable, spent, remaining, status (BudgetStatus), entries, and challenge-specific fields.

Files: see `types.ts` for exact shapes.

---

## Persistence

- Uses browser `localStorage`.
  - Settings key: `brewbalance_settings` (see `constants.ts`).
  - Entries key: `brewbalance_entries`.

- Settings are merged with `DEFAULT_SETTINGS` on load; failures to parse are caught and logged.

---

## Budget / Stat Calculations

- Core calculation function: `calculateStats(settings, entries, targetDate?)` in `utils/financeHelpers.ts`.

- Date handling: ISO dates are produced by `formatDateISO` and timezone-aware helpers in `utils/dateUtils.ts` (uses local time conversion to avoid timezone shifts).

- Rollover / Challenge interaction:
  - Normal days: `totalAvailable = baseBudget + previousRollover`. If date < today, leftover becomes next-day rollover.
  - Challenge days: by default, previous rollovers are preserved (saved aside) and NOT added to challenge day available — available is the base budget only. If a custom rollover exists for that date it will be honored (added to available).
  - Preserved rollover is restored after a challenge ends (unless a custom override was used).

- Custom overrides:
  - `customBudgets[date]` replaces base budget for that date.
  - `customRollovers[date]` sets the starting rollover for that date and clears preserved state on use.

- Status determination (BudgetStatus):
  - `OverBudget` if spent > totalAvailable.
  - `Warning` if spent >= totalAvailable * alarmThreshold.
  - Otherwise `UnderAlarm`.

- Past vs Future behavior (immutable past):
  - Definition: any calendar date strictly before the user's local "today" (i.e. `date < today`) is considered "past". The date `today` and all future dates (`>= today`) are considered current/future for the purposes of settings changes.
  - Rule: computed stats and budgets for past dates are fixed snapshots and MUST NOT change when the user edits global settings (daily budgets, alarm thresholds, recurrence rules, etc.). Only `today` and future dates are recomputed using the current settings.
  - Example: if the user's per-day base budget was 300 yen for the last week and they change the per-day budget to 200 yen today, all daily budgets for dates before today remain 300 yen; `today` and future dates use 200 yen.
  - How this is represented: the system should persist, as part of the historical computation or audit trail, the effective base budget and rollover values that were used to derive each past date's `DailyStats`. This can be done by storing `appliedBaseBudget` and `appliedRollover` fields in past `DailyStats` snapshots or by keeping a time-indexed settings history.
  - Entries: expense entries themselves are never rewritten by settings changes; they continue to apply to the fixed past `DailyStats` that were computed for their dates.
  - Rollover handling: rollovers that were produced by past dates remain as historical values. Future rollovers (starting from `today`) are recomputed using the new settings when needed.

- Implementation note for `calculateStats`:
  - When computing stats for a target date < today, `calculateStats` must use the persisted/applied budget values for that date rather than deriving them solely from the current `settings` object.
  - For `date >= today`, `calculateStats` may derive budgets directly from the current `settings`, `customBudgets`, and `customRollovers`.
  - If the app does not persist per-date applied budgets yet, it should either persist a compact settings history (state snapshots with effective-from dates) or persist the per-day applied values at the time they are first materialized so that they remain immutable thereafter.


---

## Challenges (Goals)

- Challenge shape and fields defined in `types.ts` and used across `Dashboard`, `AddEntryScreen`, and `HistoryView`.

- Start / end / recurrence behavior (implemented in `App.tsx` and `Dashboard.tsx`):
  - `activeChallenge` is tracked in `settings`.
  - On each app render/effect, if `today > activeChallenge.endDate` the app archives the active challenge into `pastChallenges` with `status` set to `completed` or `failed` based on saved amount and the target percentage.
  - Recurrence types: `none`, `daily`, `weekly`, `bi-weekly`, `monthly`.
  - When archiving, recurrence logic computes a next start/end pair by adding days or months. If the computed `newStartDate` <= previous end date it shifts the new start to previous end + 1 day.
  - If `recurrenceEndDate` exists and the new start would be after it, recurrence stops.
  - Recurrence creation uses `crypto.randomUUID()` to create the new challenge id.

- Success and failure rules:
  - `targetPercentage` (1–100) defines required percent of the challenge total budget to be saved.
  - `calculateChallengeTotalBudget` sums daily budgets across challenge date range (respecting `customBudgets`).
  - To decide early failure, `isChallengeFailed` computes the maximum achievable final savings assuming zero future spend. If that maximum is < targetAmount the challenge is marked failed.

- Manual end/cancel:
  - Users can end/cancel a challenge in the UI; if ended before completion it is archived with `status: cancelled` and moved to `pastChallenges`.

---

## UI Screens / Components

- Top-level navigation (tab views) provided by `App.tsx` and `Navigation.tsx` with tabs: **dashboard**, **add**, **calendar**, **history**, **settings**.

- **Dashboard** (`components/Dashboard.tsx`):
  - Shows today's computed `DailyStats`, remaining balance, a pie chart of spent/remaining, a streak badge, and an active challenge card (when present).
  - Challenge card shows computed `status` categories: upcoming, active (on-track / behind / failed), finished (success / failed).
  - Users can edit or end active challenges from a modal; ending confirms and archives into history.

- **Add** (`components/AddEntryScreen.tsx`):
  - Two modes: Expense entry and Start Challenge.
  - Expense form validates numeric amount > 0 and records entries via handler passed down from `App.tsx`.
  - Starting a challenge will prompt (via `confirm`) if an active challenge exists; if confirmed the active one is cancelled and moved to history.

- **Calendar / Balance** (`components/CalendarView.tsx`):
  - Month grid with daily tiles; tiles show remaining amount and use color coding (safe / warning / over).
  - Click a day to open `DayDetailModal` to view entries, set custom base budget, or override rollover.

- **History** (`components/HistoryView.tsx`):
  - Two modes: `expenses` grouped by date, and `challenges` showing active+past challenges and their final/ongoing status.

- **Settings** (`components/Settings.tsx`):
  - Edit user profile (name, custom logo image upload), daily budgets, alarm threshold, currency, start/end dates.
  - Export CSV / share via Web Share API if available; otherwise triggers a file download.
  - Reset app data: clears localStorage settings and entries (with confirmation UI).

- Modals: `AddEntryModal`, `EditEntryModal`, `DayDetailModal` present forms for adding/editing/deleting entries.

---

## CSV Export

- `Settings` generates a CSV with headers: Date, Daily Base Budget, Rollover, Daily Spent, Note, Current Balance, Challenge Saved. It includes dates up to today plus any dates with entries.

---

## Image & AI Helpers

- `components/Settings.tsx` supports uploading an app icon: image is resized/cropped to 512px and stored as a data URL in `settings.logo`.

- `utils/aiHelpers.ts` contains `generateAppLogo()` which calls `@google/genai` to generate an image and returns a base64 data URL. It expects an API key via `process.env.API_KEY`.

---

## Key Files

- App root: `App.tsx` — wires state, persistence, tab routing, handlers for entries and challenges.
- Calculations: `utils/financeHelpers.ts`, `utils/dateUtils.ts`.
- Types & defaults: `types.ts`, `constants.ts`.
- UI: `components/*.tsx` (Dashboard, AddEntryScreen, CalendarView, HistoryView, Settings, modals).

---

## Runtime & Dependencies

- Project uses React + Vite. See `package.json` for dependencies including `recharts` (charts), `lucide-react` (icons), and optional `@google/genai`.

---

## Notable assumptions and edge cases

- Timezones: date helpers convert to local ISO dates to minimize timezone-related off-by-one errors. The code uses UTC methods for some date arithmetic to avoid shifts.
- Challenges treat previous rollovers as preserved (excluded from challenge available) unless a custom rollover is explicitly set on a challenge day.
- Recurrence scheduling attempts to avoid overlapping periods by shifting a computed start date to the day after the previous end if needed.
- Floating point comparisons use small epsilon tolerances in a few places (challenge success/failure checks).
