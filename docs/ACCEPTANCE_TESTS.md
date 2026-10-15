# Thali.com — Acceptance Tests

## A. Member management

- Import at least 400 valid test members.
- Preserve existing unique member numbers.
- Reject or flag duplicate member numbers.
- Report invalid rows without silently discarding them.
- Reconcile created, updated, skipped, and failed counts.
- Ensure a member cannot read another member's private profile or history.
- Ensure deactivated members cannot use meal check-in.

## B. Subscription and validity

- Default plan shows ₹2,800, 54 meals, and 30-day validity.
- Subscription has explicit start and expiry timestamps.
- Subscription is not usable before activation.
- Subscription cannot be used after expiry without an approved extension.
- Early renewal is queued after the current expiry.
- Late renewal starts from the verified activation time.
- Queued subscriptions cannot be used early.
- Renewal does not accidentally create overlapping periods.
- Expiry behavior matches the owner-approved time boundary.

## C. Payment verification

- Pending cash payment does not activate the subscription.
- Authorized admin can verify cash payment.
- Direct UPI remains pending until verified.
- Payment verification records actor and timestamp.
- Failed gateway payment grants no meals.
- Gateway payment activates only after server-side verification.
- A client redirect alone cannot activate a subscription.
- Repeated webhook events do not grant credits twice.
- Refund status is recorded and follows the approved policy.

## D. QR and meal deduction

- Valid member QR deducts exactly one meal.
- Valid member-scanned venue QR deducts exactly one meal.
- Lunch and dinner use the same balance.
- Invalid QR deducts zero.
- Revoked QR deducts zero.
- Expired QR/session token deducts zero.
- Pending-payment member deducts zero.
- Expired subscription deducts zero.
- Zero-balance member deducts zero.
- Duplicate lunch check-in is rejected under the approved policy.
- Duplicate dinner check-in is rejected under the approved policy.
- Concurrent duplicate requests cannot deduct twice.
- Retry with the same idempotency key cannot create another deduction.
- Network timeout does not show unconfirmed success.
- Manual check-in requires permission and reason.
- Manual check-in follows the same eligibility rules.
- Corrections create linked reversals/adjustments rather than deleting history.

## E. Security and roles

- Receptionist can scan and search permitted member data.
- Receptionist cannot verify payments.
- Receptionist cannot change a member's balance.
- Receptionist cannot assign roles.
- Member cannot edit their role, member number, payment status, or balance.
- Member cannot access another member's transactions.
- Menu Manager can edit menus but cannot access financial records.
- Admin-only operations are blocked through direct API requests for unauthorized users.
- RLS policies are tested independently of the UI.
- No service-role or gateway secret is included in frontend bundles.

## F. Menus and reports

- Admin/Menu Manager can create lunch and dinner menus.
- Members can see published menus.
- Draft menus are hidden from members.
- Daily meal report matches accepted consumption transactions.
- Payment report distinguishes pending, verified, failed, and refunded.
- Expiry report uses the approved timezone and expiry rule.
- Low-balance report uses the configured threshold.
- CSV export respects role permissions and active filters.
- Audit log records sensitive actions.

## G. Operational readiness

- Camera scanning works on the actual devices and browsers used.
- Camera permission denial has a useful recovery message.
- HTTPS is enabled in production.
- Backups are configured.
- Restore procedure has been tested.
- Staff know what to do if the server is unavailable.
- Owner has approved duplicate, expiry, and unused-meal policies.
- Pilot results have been reconciled against the paper register.

## Release decision

Do not launch to all members until all critical tests pass, the import is reconciled, payment verification is proven, role restrictions work, and the owner has signed off on the operational policies.
