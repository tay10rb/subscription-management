# Subscription Management Tool - TODO

## Completed
- ✅ Basic subscription management UI (add, edit, delete)
- ✅ Dashboard with spending overview
- ✅ Category breakdown charts
- ✅ Upcoming renewals timeline
- ✅ Status filters (all, active, cancelled)
- ✅ Search functionality
- ✅ Category filtering with custom categories
- ✅ Custom payment methods
- ✅ Custom subscription plans

## In Progress

## Pending

## Migration: Supabase to SQLite

### Phase 1: Backend Setup (Node.js + SQLite)
- [x] **Task 1.1:** Set up backend directory structure (`/server`).
- [x] **Task 1.2:** Initialize `package.json` for the server and install dependencies (`express`, `better-sqlite3`, `cors`).
- [x] **Task 1.3:** Create the main server file (`server.js`) with a basic Express app structure.
- [x] **Task 1.4:** Create a database initialization script to set up SQLite tables for `subscriptions` and `settings`.
- [x] **Task 1.5:** Implement CRUD API endpoints for subscriptions (`/api/subscriptions`).
- [x] **Task 1.6:** Implement CRUD API endpoints for settings (`/api/settings`).
- [x] **Task 1.7:** Implement API key middleware to protect write operations (create, update, delete).

### Phase 2: Frontend Refactoring (Removing Supabase & Auth)
- [x] **Task 2.1:** Delete user authentication pages (`LoginPage`, `SignupPage`, `ForgotPasswordPage`, etc.).
- [x] **Task 2.2:** Delete authentication components (`AuthGuard`, user profile elements).
- [x] **Task 2.3:** Delete the `authStore` and all its references.
- [x] **Task 2.4:** Remove all Supabase-related files (`lib/supabase.ts`, diagnostic components) and dependencies.
- [x] **Task 2.5:** Update the main router (`App.tsx`) to remove all protected and authentication-related routes.

### Phase 3: Frontend-Backend Integration
- [x] **Task 3.1:** Refactor `subscriptionStore` to fetch data from the new backend API.
- [x] **Task 3.2:** Refactor `settingsStore` to use the new settings API.
- [x] **Task 3.3:** Add a new section in `SettingsPage.tsx` to manage the API key.
- [x] **Task 3.4:** Ensure all API requests correctly handle the API key for protected actions.

### Phase 4: Cleanup and Documentation
- [x] **Task 4.1:** Clean up any unused code, components, or dependencies.
- [x] **Task 4.2:** Update `README.md` to reflect the new local-first architecture.
- [x] **Task 4.3:** Verify all functionalities (add, edit, delete subscriptions/settings) work as expected.
