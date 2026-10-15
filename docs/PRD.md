# Thali.com — Product Requirements Document

**Version:** 1.0

## 1. Product vision

Thali.com will be the central digital system for managing mess memberships, meal consumption, subscriptions, payments, and daily operations. It should reduce manual work, prevent incorrect meal counts, and provide a reliable record of every member's subscription and meal activity.

## 2. Problem statement

The current workflow depends on physical cards and a register. Staff must find a member's unique-number card and mark the meal manually. This can lead to slow check-ins, incorrect marks, duplicate entries, unclear balances, and difficult reporting.

The new system must make check-in fast while keeping payment and meal accounting accurate.

## 3. Product goals

1. Digitize existing member records while preserving their unique numbers.
2. Support new member registration.
3. Give each member a personal QR pass.
4. Support both staff-scanned and member-scanned QR flows.
5. Track a subscription's validity and remaining meals accurately.
6. Support ₹2,800 subscriptions containing 54 meals with 30-day validity.
7. Share the same meal balance across lunch and dinner.
8. Record cash, direct UPI, and online gateway payments.
9. Prevent meal use until payment is verified.
10. Support early renewal, queued subscriptions, and late renewal.
11. Publish daily lunch and dinner menus.
12. Provide reports, expiry indicators, low-balance alerts, and audit logs.
13. Restrict access based on user role.
14. Work on desktop, tablet, and mobile browsers.

## 4. User roles

### Owner/Admin

Can manage members, staff, subscriptions, payment verification, menus, reports, system settings, and approved exceptions.

### Receptionist/Meal Operator

Can scan QR codes, search members, perform permitted check-ins, and see the minimum information required for meal service. Cannot verify payments, edit balances, or manage staff.

### Member

Can view their own member number, QR pass, subscription dates, meal balance, menu, history, payment status, and renewal options.

### Menu Manager

Optional role that can create, update, and publish menus without access to financial records or meal-balance adjustments.

## 5. Functional requirements

### FR-01: Authentication

- Provide secure login and logout.
- Support new member registration.
- Associate imported members with verified accounts safely.
- Do not permit public users to assign themselves privileged roles.
- Provide appropriate unauthorized-access and authentication-error states.

### FR-02: Member management

- Create, search, view, update, deactivate, and import member records.
- Preserve existing member numbers.
- Detect duplicate member numbers.
- Support profile status and subscription visibility.
- Use deactivation rather than hard deletion when related transactions exist.

### FR-03: Subscription management

- Default price: ₹2,800.
- Default allowance: 54 meals.
- Default validity: 30 days from the subscription start.
- Lunch and dinner use the same balance.
- Support pending-payment, active, queued, expired, cancelled, and refunded states where applicable.
- Support renewal without accidental overlap.
- Allow admin-approved extensions and adjustments with an audit trail.

### FR-04: Payment management

- Support cash, direct UPI, and online gateway payments.
- Store amount, method, payment status, timestamps, and references.
- Cash and direct UPI require authorized verification.
- Online gateway payments require trusted server-side verification.
- Pending or failed payments must not grant usable meal credits.
- Handle duplicate gateway events idempotently.

### FR-05: QR check-in

- Staff can scan the member's QR.
- A member can scan the venue's QR while authenticated.
- Validate QR, member status, payment, subscription dates, meal balance, meal session, and duplicate rules.
- Deduct exactly one meal for an accepted check-in.
- Reject invalid, expired, duplicate, unpaid, or zero-balance attempts.
- Make duplicate prevention a database-level rule, not merely a frontend check.
- Display the confirmed result and remaining balance.

### FR-06: Manual check-in

- Provide an approved fallback for authorized staff.
- Require a reason.
- Apply the same eligibility, payment, balance, and duplicate checks as QR check-in.
- Record the staff actor and action in the audit log.

### FR-07: Menus

- Manage lunch and dinner menus by date.
- Add, edit, reorder, and publish menu items.
- Allow members to view published menus.
- Record who changed a menu and when.

### FR-08: Member dashboard

Display:

- Name and unique member number.
- QR pass.
- Current subscription status.
- Start and expiry dates.
- Meals remaining.
- Recent meal history.
- Today's and upcoming menus.
- Renewal and payment-verification status.

### FR-09: Admin dashboard and reports

Provide:

- Active, pending, queued, expiring, and expired subscriptions.
- Low-balance members.
- Daily lunch and dinner consumption.
- Unique members served.
- Payment totals by status and method.
- Rejected check-ins and manual entries.
- Admin adjustments and extensions.
- CSV export with role-based access.

### FR-10: Audit trail

Record sensitive actions, including payment verification, manual check-in, subscription activation, member imports, balance adjustments, extensions, role changes, and refunds.

Each record should include actor, action, target, timestamp, and reason where required.

## 6. Business rules

- Each successful check-in deducts one meal.
- Lunch and dinner share one subscription balance.
- Default duplicate rule: one lunch and one dinner per member per service date, subject to owner confirmation.
- A subscription cannot be used before payment verification.
- Unused meals expire by default.
- Extensions and carry-forward require explicit admin approval.
- Early renewal is queued after the current subscription ends.
- Late renewal starts a new 30-day period from activation.
- Failed requests do not deduct meals.
- Concurrent requests must not cause duplicate deductions.

## 7. Non-functional requirements

- Responsive mobile-first interface.
- HTTPS for production.
- Server-side authorization and validation.
- PostgreSQL constraints and transactions for critical operations.
- Clear loading, success, rejection, and network-error states.
- Asia/Kolkata timezone for operational display and reporting.
- No secrets in browser code.
- Backup and restore procedures.
- Maintainable code, version-controlled migrations, and automated tests.

## 8. MVP scope

### Must have

Authentication, roles, member import, member profiles, subscriptions, payment verification, both QR flows, secure meal deduction, duplicate prevention, menus, dashboards, reports, and audit logs.

### Later

SMS/WhatsApp notifications, offline check-in, native Android/iOS applications, inventory management, and multi-mess SaaS functionality.

## 9. Success criteria

- All valid existing members are imported with their original numbers.
- Valid check-ins work reliably under normal network conditions.
- Invalid and duplicate check-ins deduct zero meals.
- Pending payments never activate subscriptions.
- Reports reconcile with the stored transactions.
- Every sensitive correction is traceable.
- Reception staff can use the system with minimal training.

## 10. Release condition

The MVP is ready for pilot only after the acceptance tests pass, the owner confirms the duplicate and expiry policies, the import is reconciled, and payment verification and role security have been tested.
