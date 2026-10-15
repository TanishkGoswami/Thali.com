# Thali.com — Implementation Roadmap

## Phase 0 — Confirm business decisions

Tasks:

- Confirm duplicate check-in policy.
- Define exact 30-day expiry behavior.
- Define lunch/dinner session windows.
- Decide the authentication method.
- Review existing member data.
- Select a payment gateway after evaluating fees and verification capabilities.
- Define unused-meal, carry-forward, extension, and refund policies.

**Exit criteria:** Owner approves the outstanding business rules.

## Phase 1 — Project foundation

Tasks:

- Inspect the existing repository and preserve working code.
- Configure React, Vite, and TypeScript.
- Set up routes and responsive layout.
- Configure Supabase Auth.
- Create version-controlled database migrations.
- Establish roles and initial RLS policies.
- Set up development and staging environments.

**Exit criteria:** Authentication works, protected routes behave correctly, and unauthorized database access is blocked.

## Phase 2 — Member management and import

Tasks:

- Member profile management.
- Member-number search.
- Create, update, and deactivate members.
- CSV preview and column mapping.
- Duplicate detection and validation.
- Dry-run import and error reports.
- Import batch audit.
- Safe linking of imported records to login accounts.

**Exit criteria:** A test import of 400+ records reconciles with the source and preserves every valid member number.

## Phase 3 — Subscriptions and payments

Tasks:

- Store the default ₹2,800 / 54-meal / 30-day plan.
- Create subscription records.
- Record cash, direct UPI, and gateway payment attempts.
- Add admin verification for cash/direct UPI.
- Implement pending and verified states.
- Implement early queued renewal and late renewal.
- Audit subscription/payment transitions.
- Add gateway integration after provider selection.

**Exit criteria:** No pending or failed payment can activate usable meal credits.

## Phase 4 — QR and meal transactions

Tasks:

- Create member QR token lifecycle.
- Create venue/meal-session QR tokens.
- Build staff scanner.
- Build member scanner.
- Create secure atomic check-in function.
- Enforce balance and duplicate rules.
- Implement idempotency and safe retries.
- Add manual check-in with reason.
- Display confirmed success/rejection states.

**Exit criteria:** Repeated and concurrent requests cannot produce an unauthorized second deduction.

## Phase 5 — Member dashboard and menus

Tasks:

- Member dashboard.
- Subscription details and balance.
- Meal history.
- QR pass.
- Menu editor and publishing.
- Member menu view.
- Renewal status.
- Responsive mobile experience.

**Exit criteria:** Members see their own data and published menus only.

## Phase 6 — Admin reports and operations

Tasks:

- Dashboard statistics.
- Daily lunch/dinner consumption reports.
- Subscription and expiry reports.
- Payment reports.
- Low-balance list.
- Audit-log filters.
- CSV export.
- Import and adjustment summaries.

**Exit criteria:** Report totals reconcile against stored transactions and payments.

## Phase 7 — Testing and pilot

Tasks:

- Unit tests for business rules.
- Integration tests for database functions.
- Role and RLS negative tests.
- Payment webhook tests.
- QR scanner tests on actual target devices.
- Concurrent check-in tests.
- Backup and restore test.
- Staff training.
- Pilot with a limited group.
- Compare digital counts with the existing paper process during the pilot.

**Exit criteria:** All P0 acceptance tests pass and the owner approves the pilot results.

## Phase 8 — Production launch

Tasks:

- Configure production domain and HTTPS.
- Create the owner account securely.
- Run the final member import.
- Verify production payment configuration.
- Confirm backup and restore procedures.
- Train reception staff.
- Monitor rejected scans, failed requests, and payment webhooks.
- Keep an incident and support procedure.

**Exit criteria:** Production checklist is complete and operational responsibility is assigned.

## Later improvements

Only after the MVP is stable, consider:

- SMS and WhatsApp notifications.
- Additional payment methods.
- Carefully designed offline workflows.
- Native Android/iOS apps.
- Multiple mess locations.
- Inventory and accounting integrations.

## Development discipline

- Implement in small, reviewable phases.
- Do not rewrite the whole codebase without a reason.
- Keep business logic out of presentation components.
- Version-control schema migrations.
- Test denied operations as well as successful operations.
- Do not implement offline meal deductions in the MVP.
- Do not skip database constraints because the UI already checks a rule.
