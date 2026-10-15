# Thali.com — Project Documentation

**Version:** 1.0\
**Status:** Product specification and implementation baseline\
**Platform:** Responsive web application + Progressive Web App (PWA)\
**Initial deployment:** One mess with 400+ members\
**Primary timezone:** Asia/Kolkata

## What is Thali.com?

Thali.com is a digital mess membership and meal-management system that replaces the existing paper-card process with digital member records, QR-based check-ins, subscription management, payment verification, meal balances, menus, and reports.

Currently, each member has a unique number. At meal time, the receptionist finds the member's card in a physical book and marks the meal manually. Thali.com will digitize this workflow while preserving existing member numbers.

## Core business configuration

- Subscription price: ₹2,800.
- Meals per subscription: 54.
- Validity: 30 days from the subscription start/activation date, not a calendar month.
- Lunch and dinner consume from the same 54-meal balance.
- Each successful check-in deducts exactly one meal.
- Existing member numbers must be preserved.
- New members must be able to register.
- Payment must be verified before a subscription becomes usable.
- Unused meals expire by default unless an authorized admin approves an exception.
- Early renewal is queued after the current subscription ends.
- Late renewal begins a new validity period after payment verification and activation.

## QR check-in methods

1. **Staff scans member QR:** The receptionist scans the member's personal QR pass.
2. **Member scans mess QR:** The member scans a QR displayed at the mess while authenticated.

Both methods must validate eligibility and deduct a meal securely on the server.

## Roles

- **Owner/Admin:** Full operational control.
- **Receptionist/Meal Operator:** Member lookup and meal check-ins, without payment verification or balance-edit permissions.
- **Member:** Own QR pass, subscription, remaining meals, menu, meal history, and renewal.
- **Menu Manager:** Optional role with menu-management permissions only.

## Recommended technology

- Frontend: React, Vite, TypeScript.
- Routing: React Router.
- Backend/database: Supabase Auth and PostgreSQL.
- Authorization: PostgreSQL Row Level Security (RLS).
- Critical operations: Secure database functions/RPC and trusted server-side functions.
- Payments: Cash, direct UPI, and an online payment gateway selected before integration.
- Deployment: HTTPS hosting and a production Supabase project.
- Mobile experience: Responsive design and PWA installation where supported.

## Documentation files

1. `README.md` — Project overview.
2. `PRD.md` — Detailed product requirements.
3. `APP_FLOW.md` — User journeys and application flows.
4. `TECH_STACK.md` — Technology choices and architecture.
5. `DATABASE_SCHEMA.md` — Database tables, constraints, and relationships.
6. `BUSINESS_RULES.md` — Subscription, payment, meal, QR, and renewal rules.
7. `SECURITY_RLS.md` — Roles, security, and data access.
8. `UI_SCREENS.md` — Screen inventory and UI behavior.
9. `IMPLEMENTATION_ROADMAP.md` — Phased development plan.
10. `ACCEPTANCE_TESTS.md` — Testing and release criteria.
11. `IMPORT_DATA_GUIDE.md` — Existing member migration process.
12. `ENVIRONMENT_SETUP.md` — Development and deployment setup.
13. `DECISIONS_AND_OPEN_QUESTIONS.md` — Decisions that must be confirmed.
14. `DESIGN.md` — Design system specifications, color palette, typography & tokens (Oura-inspired).

## Non-negotiable development rules

- Preserve the existing web project if implementation starts in an existing repository.
- Inspect the current codebase before making changes.
- Keep critical business logic out of client-only code.
- Never activate a subscription based solely on a frontend success screen.
- Never allow duplicate or concurrent scans to deduct multiple meals incorrectly.
- Never expose database service-role keys or payment secrets in frontend code.
- Never silently delete meal history or financial records.
- Test role permissions and failure cases, not only the happy path.

## Recommended delivery order

Build authentication and roles first, then member import, subscriptions and payments, secure QR check-in, member dashboards, menus, reports, and finally production hardening.

Do not start with a large collection of UI screens before the database rules and secure meal-deduction flow are established.
