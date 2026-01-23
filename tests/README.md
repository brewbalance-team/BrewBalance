# BrewBalance Test Suite

This directory contains end-to-end tests for the BrewBalance application using Playwright.

## Setup

The test suite requires Playwright to be installed. It has been configured with the following setup:

- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: http://localhost:3000 (development server)
- **Test Directory**: `./tests`

## Running Tests

### Prerequisites
1. Install dependencies: `npm install`
2. Install Playwright browsers: `npx playwright install`

### Commands
- Run all tests: `npm test`
- Run tests with UI: `npm run test:ui`
- Run specific test: `npx playwright test --grep "test name"`
- Run on specific browser: `npx playwright test --project=chromium`

### Development Server
The tests expect the development server to be running on port 3000. Start it with:
```bash
npm run dev
```

## Test Coverage

The test suite covers the following key features:

1. **App Loading**: Verifies the application loads correctly and displays the main navigation
2. **Navigation**: Tests switching between different tabs (Home, Balance, History, Settings, Add)
3. **Expense Entry**: Tests adding new expense entries through the Add screen
4. **Settings Configuration**: Tests updating budget settings
5. **Calendar View**: Verifies the calendar/balance view displays correctly
6. **History View**: Checks that the history view shows expenses and challenges

## Test Structure

- `tests/brewbalance.spec.ts`: Main test suite with all E2E tests
- `playwright.config.ts`: Playwright configuration with browser settings and web server setup

## Notes

- Tests use localStorage for data persistence, so they may interact with each other
- The application uses a beer-themed budgeting interface for tracking expenses
- Some tests may need adjustment based on exact UI element selectors
- The webServer configuration in playwright.config.ts can automatically start the dev server, but may need manual server management in some environments