# Thali.com — Product Goals and Scope

## Vision

Replace the physical meal-card register with a fast, reliable, auditable digital system for mess membership and meal consumption.

## The current process

1. Every member has a unique number.
2. The receptionist searches for the member's card in a book.
3. The receptionist marks the meal manually.
4. Meal counts, subscriptions, and payment status must be tracked separately or manually.

## The proposed process

1. Existing member numbers are imported.
2. Members receive access to their digital profile and QR pass.
3. The receptionist scans a member QR, or the member scans a venue QR.
4. The server validates eligibility.
5. Exactly one meal is deducted for a successful check-in.
6. Members and admins can see current balances and history.
7. Payments, renewals, menus, and reports are managed in one place.

## Core configuration

| Setting                 | Initial value                    |
| ----------------------- | -------------------------------- |
| Subscription price      | ₹2,800                           |
| Meals per subscription  | 54                               |
| Validity                | 30 days from start/activation    |
| Meal periods            | Lunch and dinner                 |
| Meal balance            | Shared across both periods       |
| Existing member numbers | Preserve                         |
| Initial member count    | 400+                             |
| Payment methods         | Cash, direct UPI, online gateway |
| Operational timezone    | Asia/Kolkata                     |

## In scope

- Authentication and roles.
- Existing member import and new registration.
- Member profile and unique-number management.
- Subscriptions and renewals.
- Payment recording and verification.
- Member QR and venue QR check-ins.
- Meal balance and history.
- Menus for lunch and dinner.
- Admin reports and CSV exports.
- Manual check-ins and auditable adjustments.
- Responsive web app and PWA support.

## Out of scope for the first release

- Native mobile apps.
- Inventory and supplier management.
- Payroll.
- Full accounting software.
- Kitchen forecasting.
- Automatic meal transfer between members.
- Offline deductions that bypass server validation.
- Multi-business SaaS billing.

## Important assumptions

- One lunch and one dinner check-in per member per service date is the initial duplicate policy. The owner must confirm it.
- Unused meals expire by default.
- Extensions and carry-forward are admin-approved exceptions.
- A verified payment is required before a subscription is usable.
- Existing balances and expiry dates will only be migrated if they can be reconciled against reliable records.
- The payment gateway has not been finalized.

## Success measures

- Correct member import.
- Accurate meal balance.
- No double deductions.
- No unpaid subscription access.
- Accurate reports.
- Secure staff permissions.
- Auditable administrative corrections.
